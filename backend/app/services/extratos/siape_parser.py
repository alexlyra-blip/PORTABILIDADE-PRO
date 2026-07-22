from __future__ import annotations

import re
import unicodedata
from typing import Any

DEFAULT_SIAPE_RATE = 1.60

_MONEY_RE = re.compile(r"R\$\s*([\d.]+,\d{2})", re.IGNORECASE)
_ROW_RE = re.compile(
    r"(?m)^\s*(?P<contrato>[A-Z0-9-]+)\s+"
    r"(?P<rubrica>\d{5})\s*-\s*(?P<descricao>.*?)\s+"
    r"(?P<sequencia>\d+)\s+(?P<prioridade>\d+)\s+"
    r"(?P<data>\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2})\s+"
    r"(?P<atual>\d{1,3})/(?P<total>\d{1,3})\s+"
    r"R\$\s*(?P<valor>[\d.]+,\d{2})\s+"
    r"(?P<inicio>\d{2}/\d{4})\s+(?P<fim>\d{2}/\d{4})\s*$"
)


def _plain(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    return "".join(
        char for char in normalized
        if not unicodedata.combining(char)
    ).upper()


def _money(value: str | float | int | None) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, (int, float)):
        return round(float(value), 2)

    cleaned = re.sub(r"[^\d,.-]", "", str(value))
    if "," in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    return round(float(cleaned or 0), 2)


def _section(text: str, start: str, end: str) -> str:
    match = re.search(
        start + r"(.*?)" + end,
        text,
        re.IGNORECASE | re.DOTALL,
    )
    return match.group(1) if match else ""


def detectar_extrato_siape(texto: str) -> bool:
    plain = _plain(texto)
    markers = (
        "EXTRATO DE CONSIGNACOES VIGENTES",
        "DEMONSTRATIVO DE USO DA MARGEM",
        "UTILIZADA FACULTATIVA",
        "MATRICULA",
    )
    return sum(marker in plain for marker in markers) >= 3


def calcular_saldo_devedor(
    parcela: float,
    prazo_restante: int,
    taxa_mensal: float = DEFAULT_SIAPE_RATE,
) -> float | None:
    if parcela <= 0 or prazo_restante <= 0:
        return None

    rate = taxa_mensal / 100
    if rate <= 0:
        return round(parcela * prazo_restante, 2)

    balance = parcela * (
        1 - (1 + rate) ** (-prazo_restante)
    ) / rate
    return round(balance, 2)


def _extract_header(texto: str) -> dict[str, str]:
    collapsed = " ".join(texto.split())
    match = re.search(
        r"(?P<codigo>\d{4,6})\s*-\s*(?P<orgao>.*?)\s+"
        r"(?P<cpf>\d{3}\.\d{3}\.\d{3}-\d{2})\s+"
        r"(?P<matricula>[A-Z0-9./-]+)\s+"
        r"(?P<nome>.*?)\s+Bruta\s+Compuls",
        collapsed,
        re.IGNORECASE,
    )
    if not match:
        return {
            "nome": "",
            "cpf": "",
            "matricula": "",
            "orgao_codigo": "",
            "orgao_nome": "",
        }

    data = match.groupdict()
    return {
        "nome": data["nome"].strip(),
        "cpf": data["cpf"],
        "matricula": data["matricula"],
        "orgao_codigo": data["codigo"],
        "orgao_nome": data["orgao"].strip(),
    }


def _extract_margins(texto: str) -> dict[str, float]:
    global_section = _section(
        texto,
        r"Bruta\s+Compuls[oó]ria",
        r"Extrato\s+de\s+Consigna[cç][oõ]es\s+Vigentes",
    )
    values = [_money(item) for item in _MONEY_RE.findall(global_section)]
    if len(values) < 8:
        raise ValueError(
            "Não foi possível identificar as margens globais do extrato SIAPE."
        )

    card_section = _section(
        texto,
        r"Bruta\s+Cart[aã]o\s+Benef[ií]cio",
        r"\(\*\)",
    )
    card_values = [
        _money(item) for item in _MONEY_RE.findall(card_section)
    ]
    if len(card_values) < 3:
        raise ValueError(
            "Não foi possível identificar as margens do cartão benefício."
        )

    return {
        "bruta_facultativa_global": values[2],
        "utilizada_facultativa": values[6],
        "liquida_facultativa_global": values[3],
        "bruta_cartao": values[4],
        "liquida_cartao": values[5],
        "utilizada_cartao": values[7],
        "bruta_cartao_beneficio": card_values[0],
        "liquida_cartao_beneficio": card_values[1],
        "utilizada_cartao_beneficio": card_values[2],
    }


def _institution(description: str, card: bool = False) -> str:
    if card:
        return re.sub(
            r"^AMORT\s+CARTAO\s+BENEFICIO\s+",
            "",
            _plain(description),
        ).strip()

    if " - " in description:
        return description.rsplit(" - ", 1)[-1].strip()
    return description.strip()


def _extract_rows(
    section: str,
    *,
    card: bool = False,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for match in _ROW_RE.finditer(section):
        data = match.groupdict()
        current = int(data["atual"])
        total = int(data["total"])
        remaining = max(total - current, 0)
        installment = _money(data["valor"])

        row: dict[str, Any] = {
            "numero_contrato": data["contrato"],
            "contrato": data["contrato"],
            "data_transacao": data["data"],
            "parcela_atual": current,
            "prazo_total": total,
            "prazo_restante": remaining,
            "valor_parcela": installment,
            "parcela": installment,
            "inicio": data["inicio"],
            "fim": data["fim"],
        }

        if card:
            row["instituicao"] = _institution(
                data["descricao"],
                card=True,
            )
        else:
            row.update({
                "banco": _institution(data["descricao"]),
                "taxa": DEFAULT_SIAPE_RATE,
                "taxa_mensal": DEFAULT_SIAPE_RATE,
                "taxa_origem": "PADRAO_SIAPE",
                "valor_contrato": None,
                "saldo_devedor": calcular_saldo_devedor(
                    installment,
                    remaining,
                ),
                "saldo_devedor_estimado": True,
            })

        rows.append(row)

    return rows


def parse_siape_extrato(texto: str) -> dict[str, Any]:
    if not detectar_extrato_siape(texto):
        raise ValueError(
            "O documento não foi identificado como extrato SIAPE."
        )

    cliente = _extract_header(texto)
    margens = _extract_margins(texto)

    loan_section = _section(
        texto,
        r"Demonstrativo\s+de\s+uso\s+da\s+margem\s*/\s*"
        r"Novo\s+Contrato\s+e\s+Renova[cç][aã]o",
        r"Demonstrativo\s+de\s+uso\s+da\s+margem\s*-\s*"
        r"Cart[aã]o\s+Consignado\s+de\s+Benef[ií]cio",
    )
    card_section = _section(
        texto,
        r"Demonstrativo\s+de\s+uso\s+da\s+margem\s*-\s*"
        r"Cart[aã]o\s+Consignado\s+de\s+Benef[ií]cio",
        r"Extrato\s+para\s+simples\s+verifica[cç][aã]o",
    )

    loans = _extract_rows(loan_section)
    cards = _extract_rows(card_section, card=True)

    total_loans = round(sum(item["parcela"] for item in loans), 2)
    total_cards = round(sum(item["parcela"] for item in cards), 2)
    available = round(
        margens["bruta_facultativa_global"]
        - margens["utilizada_facultativa"]
        - margens["utilizada_cartao"]
        - margens["utilizada_cartao_beneficio"],
        2,
    )

    validacoes = {
        "soma_parcelas_emprestimos": total_loans,
        "emprestimos_conferem_com_margem": abs(
            total_loans - margens["utilizada_facultativa"]
        ) <= 0.02,
        "soma_parcelas_cartao_beneficio": total_cards,
        "cartoes_conferem_com_margem": abs(
            total_cards - margens["utilizada_cartao_beneficio"]
        ) <= 0.02,
        "margem_global_calculada": available,
        "margem_global_confere": abs(
            available - margens["liquida_facultativa_global"]
        ) <= 0.02,
    }

    return {
        "convenio": "SIAPE",
        "tipo_documento": "EXTRATO_CONSIGNACOES_SIAPE",
        "cliente": cliente["nome"],
        "cpf": cliente["cpf"],
        "matricula": cliente["matricula"],
        "orgao": {
            "codigo": cliente["orgao_codigo"],
            "nome": cliente["orgao_nome"],
        },
        "beneficio": cliente["matricula"],
        "especie": "SIAPE",
        "margem_maxima": margens["bruta_facultativa_global"],
        "margem_comprometida": margens["utilizada_facultativa"],
        "margem_disponivel": margens["liquida_facultativa_global"],
        "margens": margens,
        "emprestimos_ativos": loans,
        "cartoes_beneficio": cards,
        "validacoes": validacoes,
    }
