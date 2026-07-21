import re
import unicodedata
from decimal import Decimal, InvalidOperation, ROUND_DOWN
from typing import Any, Dict


LOAS_SPECIES = {87, 88}
CARD_MARGIN_PERCENT = Decimal("0.05")
DEFAULT_LOAN_MARGIN_PERCENT = Decimal("0.40")
LOAS_LOAN_MARGIN_PERCENT = Decimal("0.35")
MAX_CARD_SLOTS = 2

INACTIVE_STATUS_MARKERS = (
    "INATIV",
    "ENCERR",
    "CANCEL",
    "EXCLUID",
    "SUSPENS",
    "CESSAD",
)


def money(value: Any) -> float:
    """Converte e trunca valores financeiros em duas casas decimais."""
    try:
        if value is None or value == "":
            return 0.0

        if isinstance(value, str):
            normalized = (
                value.strip()
                .replace("R$", "")
                .replace(" ", "")
            )

            if "," in normalized and "." in normalized:
                normalized = (
                    normalized
                    .replace(".", "")
                    .replace(",", ".")
                )
            elif "," in normalized:
                normalized = normalized.replace(",", ".")
        else:
            normalized = str(value)

        number = Decimal(normalized)

        if not number.is_finite():
            return 0.0

        return float(
            number.quantize(
                Decimal("0.01"),
                rounding=ROUND_DOWN,
            )
        )
    except (InvalidOperation, TypeError, ValueError):
        return 0.0


def normalize_text(value: Any) -> str:
    text = str(value or "").strip().upper()
    return "".join(
        character
        for character in unicodedata.normalize("NFD", text)
        if unicodedata.category(character) != "Mn"
    )


def extract_species_code(value: Any) -> int:
    match = re.search(r"\d+", str(value or ""))
    return int(match.group()) if match else 0


def is_active_record(record: Dict[str, Any]) -> bool:
    """
    Considera ativo todo registro que não esteja explicitamente marcado
    como inativo, encerrado, cancelado, excluído, suspenso ou cessado.

    Status vazio é mantido como ativo para preservar compatibilidade com
    provedores que não retornam o campo Situação.
    """
    status = normalize_text(
        record.get("situacao")
        or record.get("status")
        or record.get("Situacao")
        or record.get("Status")
    )

    if not status:
        return True

    return not any(marker in status for marker in INACTIVE_STATUS_MARKERS)


def recalculate_benefit_margins(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aplica a regra oficial:

    - Espécies 87 e 88: 35% para empréstimos.
    - Demais espécies: 40% para empréstimos.
    - Cada cartão ativo compromete 5% da renda.
    - Total comprometido = empréstimos ativos + cartões ativos.
    """
    if not isinstance(data, dict):
        return data

    cliente = data.get("cliente") or {}
    margens = data.get("margens") or {}
    emprestimos = data.get("emprestimos") or []
    cartoes = data.get("cartoes") or []

    salario = money(
        margens.get("salario")
        or cliente.get("salario")
        or data.get("salario")
    )

    especie = (
        cliente.get("especie")
        or data.get("especie")
        or data.get("beneficio", {}).get("especie")
    )

    codigo_especie = extract_species_code(especie)
    percentual_emprestimo = (
        LOAS_LOAN_MARGIN_PERCENT
        if codigo_especie in LOAS_SPECIES
        else DEFAULT_LOAN_MARGIN_PERCENT
    )

    salario_decimal = Decimal(str(salario))

    margem_emprestimo = money(
        salario_decimal * percentual_emprestimo
    )

    margem_cartao_unitaria = money(
        salario_decimal * CARD_MARGIN_PERCENT
    )

    emprestimos_ativos = [
        contrato
        for contrato in emprestimos
        if isinstance(contrato, dict) and is_active_record(contrato)
    ]

    total_emprestimos_ativos = money(
        sum(
            money(
                contrato.get("parcela")
                or contrato.get("valor_parcela")
                or contrato.get("Vl_Parcela")
            )
            for contrato in emprestimos_ativos
        )
    )

    cartoes_ativos = [
        cartao
        for cartao in cartoes
        if isinstance(cartao, dict) and is_active_record(cartao)
    ]

    for cartao in cartoes:
        if not isinstance(cartao, dict):
            continue

        cartao_ativo = is_active_record(cartao)

        # Valor usado no cálculo da margem, não o limite financeiro da API.
        cartao["limite_cartao"] = margem_cartao_unitaria
        cartao["utilizado"] = margem_cartao_unitaria if cartao_ativo else 0.0
        cartao["disponivel"] = 0.0 if cartao_ativo else margem_cartao_unitaria

    quantidade_cartoes_ativos = len(cartoes_ativos)
    total_cartoes_ativos = money(
        Decimal(str(margem_cartao_unitaria))
        * Decimal(str(quantidade_cartoes_ativos))
    )

    total_comprometido = money(
        Decimal(str(total_emprestimos_ativos))
        + Decimal(str(total_cartoes_ativos))
    )

    margem_livre = money(
        Decimal(str(margem_emprestimo))
        - Decimal(str(total_comprometido))
    )

    total_limite_cartoes = money(
        Decimal(str(margem_cartao_unitaria))
        * Decimal(str(MAX_CARD_SLOTS))
    )

    cartao_disponivel = money(
        max(0.0, total_limite_cartoes - total_cartoes_ativos)
    )

    margens.update({
        "salario": salario,
        "margem_emprestimo": margem_emprestimo,
        "total_comprometido": total_comprometido,
        "margem_livre": margem_livre,
        "margem_cartao": margem_cartao_unitaria,
        "possui_cartao": quantidade_cartoes_ativos > 0,
        "cartao_utilizado": total_cartoes_ativos,
        "cartao_disponivel": cartao_disponivel,
    })

    cliente.update({
        "salario": salario,
        "margem_livre": margem_livre,
    })

    resumo = data.get("resumo")
    if isinstance(resumo, dict):
        resumo["total_parcelas_emprestimos"] = total_emprestimos_ativos
        resumo["total_emprestimos"] = len(emprestimos_ativos)
        resumo["total_cartoes"] = quantidade_cartoes_ativos

    data["cliente"] = cliente
    data["margens"] = margens
    data["emprestimos"] = emprestimos
    data["cartoes"] = cartoes

    return data


def recalculate_consulta_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Recalcula respostas novas e respostas antigas recuperadas do cache."""
    if not isinstance(payload, dict):
        return payload

    beneficios = payload.get("beneficios")
    if isinstance(beneficios, list):
        for beneficio in beneficios:
            if isinstance(beneficio, dict):
                recalculate_benefit_margins(beneficio)

    beneficio_principal = payload.get("beneficio_principal")
    if isinstance(beneficio_principal, dict):
        recalculate_benefit_margins(beneficio_principal)

    if (
        isinstance(payload.get("cliente"), dict)
        and isinstance(payload.get("margens"), dict)
    ):
        recalculate_benefit_margins(payload)

    return payload
