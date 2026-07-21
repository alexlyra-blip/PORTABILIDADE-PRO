from datetime import datetime
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, Iterable, List


SIAPE_DEBT_RATE_PERCENT = Decimal("1.50")
SIAPE_DEBT_RATE = Decimal("0.015")
MONEY_QUANTIZER = Decimal("0.01")


def decimal_value(value: Any) -> Decimal:
    if value is None or value == "":
        return Decimal("0")

    if isinstance(value, Decimal):
        return value

    if isinstance(value, (int, float)):
        return Decimal(str(value))

    text = str(value).strip().replace("R$", "").replace(" ", "")

    if "." in text and "," in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")

    try:
        return Decimal(text)
    except (InvalidOperation, ValueError):
        return Decimal("0")


def money(value: Any) -> float:
    return float(
        decimal_value(value).quantize(
            MONEY_QUANTIZER,
            rounding=ROUND_HALF_UP,
        )
    )


def safe_int(value: Any) -> int:
    try:
        if value is None or value == "":
            return 0
        return int(float(str(value).replace(",", ".")))
    except (TypeError, ValueError):
        return 0


def safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def calculate_age(date_value: Any) -> int:
    date_text = safe_str(date_value)

    if not date_text:
        return 0

    for date_format in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            birth_date = datetime.strptime(date_text, date_format)
            today = datetime.today()

            return (
                today.year
                - birth_date.year
                - (
                    (today.month, today.day)
                    < (birth_date.month, birth_date.day)
                )
            )
        except ValueError:
            continue

    return 0


def calculate_outstanding_balance(
    installment: Any,
    remaining_term: Any,
    informed_balance: Any = 0,
) -> float:
    informed = decimal_value(informed_balance)

    if informed > 0:
        return money(informed)

    payment = decimal_value(installment)
    term = safe_int(remaining_term)

    if payment <= 0 or term <= 0:
        return 0.0

    discount_factor = (
        Decimal("1") + SIAPE_DEBT_RATE
    ) ** (-term)

    balance = (
        payment
        * (Decimal("1") - discount_factor)
        / SIAPE_DEBT_RATE
    )

    return money(balance)


def normalize_phone_list(value: Any) -> List[str]:
    if not value:
        return []

    if isinstance(value, str):
        values: Iterable[Any] = re.split(
            r"[/;,|]+",
            value,
        )
    elif isinstance(value, (list, tuple, set)):
        expanded_values = []

        for item in value:
            if isinstance(item, str):
                expanded_values.extend(
                    re.split(r"[/;,|]+", item)
                )
            else:
                expanded_values.append(item)

        values = expanded_values
    else:
        values = [value]

    phones: List[str] = []

    for phone in values:
        clean_phone = safe_str(phone)

        if clean_phone and clean_phone not in phones:
            phones.append(clean_phone)

    return phones


def build_address(address_data: Any) -> str:
    if not isinstance(address_data, dict):
        return safe_str(address_data)

    parts = []

    street = safe_str(
        address_data.get("Logradouro")
        or address_data.get("Endereco")
    )
    neighborhood = safe_str(address_data.get("Bairro"))
    city = safe_str(
        address_data.get("Municipio")
        or address_data.get("Cidade")
    )
    state = safe_str(address_data.get("UF"))
    zip_code = safe_str(address_data.get("CEP"))

    if street:
        parts.append(street)

    if neighborhood:
        parts.append(neighborhood)

    city_state = " / ".join(
        part for part in (city, state) if part
    )

    if city_state:
        parts.append(city_state)

    if zip_code:
        parts.append(f"CEP: {zip_code}")

    return ", ".join(parts)


def is_siape_response(raw: Any) -> bool:
    if not isinstance(raw, dict):
        return False

    cadastro = raw.get("Cadastro") or {}

    if not isinstance(cadastro, dict):
        return False

    return bool(
        cadastro.get("Matricula")
        and (
            cadastro.get("RegimeJuridico")
            or cadastro.get("Orgao")
            or cadastro.get("Instituto")
        )
    )


def normalize_siape_response(raw: Dict[str, Any]) -> Dict[str, Any]:
    cadastro = raw.get("Cadastro") or {}

    resumo_financeiro = (
        raw.get("ResumoFinanceiro")
        or cadastro.get("ResumoFinanceiro")
        or {}
    )

    dados_bancarios = (
        cadastro.get("DadosBancarios")
        or raw.get("DadosBancarios")
        or {}
    )

    endereco_data = (
        cadastro.get("Endereco")
        or raw.get("Endereco")
        or {}
    )

    telefone_data = (
        cadastro.get("Telefone")
        or raw.get("Telefone")
        or []
    )

    emprestimos_raw = (
        raw.get("Emprestimos")
        or cadastro.get("Emprestimos")
        or []
    )

    rmc_raw = (
        raw.get("RMC")
        or raw.get("Rmc")
        or {}
    )

    rcc_raw = (
        raw.get("RCC")
        or raw.get("Rcc")
        or {}
    )

    matricula = safe_str(cadastro.get("Matricula"))
    bruto = money(resumo_financeiro.get("Bruto"))
    valor_liquido = money(
        resumo_financeiro.get("ValorLiquido")
    )
    descontos = money(
        resumo_financeiro.get("Desconto")
    )
    margem_disponivel = money(
        resumo_financeiro.get("Margem")
    )

    rmc_disponivel = money(
        rmc_raw.get("Margem")
        if isinstance(rmc_raw, dict)
        else 0
    )

    rcc_disponivel = money(
        rcc_raw.get("Margem")
        if isinstance(rcc_raw, dict)
        else 0
    )

    emprestimos = []

    for item in emprestimos_raw:
        if not isinstance(item, dict):
            continue

        parcela = money(
            item.get("Parcela")
            or item.get("ValorParcela")
        )

        prazo_restante = safe_int(
            item.get("PrazoRestantes")
            or item.get("ParcelasRestantes")
        )

        # Somente contratos realmente ativos.
        if parcela <= 0 or prazo_restante <= 0:
            continue

        saldo_devedor = calculate_outstanding_balance(
            installment=parcela,
            remaining_term=prazo_restante,
            informed_balance=(
                item.get("SaldoDevedor")
                or item.get("Quitacao")
            ),
        )

        emprestimos.append(
            {
                "banco": safe_str(
                    item.get("Rubrica")
                    or item.get("NomeBanco")
                    or item.get("Banco")
                ),
                "codigo": safe_str(
                    item.get("IdBanco")
                    or item.get("Banco")
                ),
                "contrato": safe_str(
                    item.get("Contrato")
                ),
                "parcela": parcela,
                "quitacao": saldo_devedor,
                "saldo_devedor": saldo_devedor,
                "valor_liberado": 0.0,

                # A API SIAPE informa somente o prazo restante.
                # Mantemos o mesmo valor no prazo total para
                # compatibilidade com o formulário de simulação.
                "prazo": prazo_restante,
                "parcelas_pagas": 0,
                "prazo_restante": prazo_restante,

                "taxa": float(
                    SIAPE_DEBT_RATE_PERCENT
                ),
                "taxa_saldo_devedor": float(
                    SIAPE_DEBT_RATE_PERCENT
                ),
                "situacao": "ATIVO",
                "valor_contrato": 0.0,
            }
        )

    total_parcelas = money(
        sum(
            decimal_value(item["parcela"])
            for item in emprestimos
        )
    )

    maior_parcela = max(
        (
            item["parcela"]
            for item in emprestimos
        ),
        default=0.0,
    )

    banco_codigo = safe_str(
        dados_bancarios.get("Banco")
    )

    banco_nome = safe_str(
        dados_bancarios.get("NomeBanco")
        or dados_bancarios.get("Banco")
    )

    telefones = normalize_phone_list(
        telefone_data
    )

    response = {
        "origem": "MULTICORBAN",
        "convenio": "SIAPE",

        "cliente": {
            "nome": safe_str(cadastro.get("Nome")),
            "cpf": safe_str(cadastro.get("CPF")),
            "beneficio": matricula,
            "idade": calculate_age(
                cadastro.get("DataNascimento")
            ),
            "especie": "",
            "salario": bruto,
            "margem_livre": margem_disponivel,
            "valor_liberado_margem": 0.0,
            "banco_pagador": banco_nome,
            "endereco": build_address(
                endereco_data
            ),
            "data_nascimento": safe_str(
                cadastro.get("DataNascimento")
            ),
            "filiacao": safe_str(
                cadastro.get("NomeMae")
            ),
            "coeficiente_utilizado": 0.0,
        },

        "margens": {
            "salario": bruto,
            "salario_bruto": bruto,
            "valor_liquido": valor_liquido,
            "descontos": descontos,

            # A margem SIAPE já vem pronta na API.
            "margem_emprestimo": margem_disponivel,
            "margem_disponivel": margem_disponivel,
            "margem_livre": margem_disponivel,

            "total_comprometido": total_parcelas,
            "valor_liberado_margem": 0.0,
            "coeficiente_utilizado": 0.0,

            "margem_cartao": 0.0,
            "possui_cartao": False,
            "cartao_utilizado": 0.0,
            "cartao_disponivel": 0.0,
            "rmc_promosys": 0.0,
            "rcc_promosys": 0.0,
        },

        "beneficio": {
            "situacao": "",
            "bloqueado": False,
            "bloqueio_emprestimo": "",
            "possui_representante_legal": "",
            "especie_consignavel": "Sim",
            "contratos_atualizados_ate": (
                datetime.now().strftime("%Y-%m-%d")
            ),
            "uf": safe_str(
                endereco_data.get("UF")
                if isinstance(endereco_data, dict)
                else ""
            ),
            "ddb": "",

            "matricula": matricula,
            "regime_juridico": safe_str(
                cadastro.get("RegimeJuridico")
            ),
            "orgao": safe_str(
                cadastro.get("Orgao")
            ),
            "instituto": safe_str(
                cadastro.get("Instituto")
                or cadastro.get("Instituito")
            ),
            "dados_bancarios": (
                dados_bancarios
                if isinstance(dados_bancarios, dict)
                else {}
            ),
        },

        "banco_pagador": {
            "codigo": banco_codigo,
            "nome": banco_nome,
            "agencia": safe_str(
                dados_bancarios.get("Agencia")
            ),
            "conta": safe_str(
                dados_bancarios.get("NumConta")
                or dados_bancarios.get("Conta")
            ),
            "tipo_pagamento": "Conta Corrente",
        },

        "telefones": telefones,
        "emprestimos": emprestimos,

        # RMC e RCC do SIAPE são margens disponíveis,
        # não cartões ativos.
        "cartoes": [],

        "margens_cartao": {
            "rmc_disponivel": rmc_disponivel,
            "rcc_disponivel": rcc_disponivel,
        },

        "resumo": {
            "total_emprestimos": len(emprestimos),
            "total_cartoes": 0,
            "total_parcelas_emprestimos": total_parcelas,
            "maior_troco": 0.0,
            "maior_parcela": maior_parcela,
        },
    }

    return response
