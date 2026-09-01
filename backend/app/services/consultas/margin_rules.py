import re
import unicodedata
from decimal import Decimal, InvalidOperation, ROUND_DOWN
from typing import Any, Dict


LOAS_SPECIES = {87, 88}
CARD_MARGIN_PERCENT = Decimal("0.05")
DEFAULT_LOAN_MARGIN_PERCENT = Decimal("0.35")
LOAS_LOAN_MARGIN_PERCENT = Decimal("0.35")
TOTAL_MARGIN_PERCENT = Decimal("0.45")
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


def _card_margin_kind(
    record: Dict[str, Any],
) -> str:
    """
    Identifica qual reserva consignavel o cartao utiliza.

    RMC = 5% Cartao Consignado.
    RCC = 5% Cartao Beneficio.
    """
    tipo = normalize_text(
        record.get("tipo")
        or record.get("tipo_cartao")
        or record.get("descricao")
    )

    if (
        "RMC" in tipo
        or "CONSIGNADO" in tipo
    ):
        return "RMC"

    if (
        "RCC" in tipo
        or "BENEFICIO" in tipo
    ):
        return "RCC"

    tipo_codigo = extract_species_code(
        record.get("tipo_codigo")
    )

    # Promosys:
    # tipo 76 = Cartao Consignado / RMC.
    if tipo_codigo == 76:
        return "RMC"

    # No retorno Promosys os demais tipos de cartao
    # sao normalizados como Cartao Beneficio.
    if tipo_codigo > 0:
        return "RCC"

    return ""


def recalculate_benefit_margins(
    data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Aplica a regra consignavel de 45%:

    - 35% para emprestimos consignados;
    - 5% reservado para Cartao Consignado RMC;
    - 5% reservado para Cartao Beneficio RCC.

    As reservas RMC/RCC sao independentes da margem
    de 35% dos emprestimos.

    Margem livre de emprestimo =
        35% da renda - parcelas de emprestimos ativos.
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

    salario_decimal = Decimal(
        str(salario)
    )

    # ========================================================
    # LIMITES CONSIGNAVEIS
    # ========================================================

    margem_total_consignavel = money(
        salario_decimal
        * TOTAL_MARGIN_PERCENT
    )

    margem_emprestimo = money(
        salario_decimal
        * DEFAULT_LOAN_MARGIN_PERCENT
    )

    margem_rmc = money(
        salario_decimal
        * CARD_MARGIN_PERCENT
    )

    margem_rcc = money(
        salario_decimal
        * CARD_MARGIN_PERCENT
    )

    # Compatibilidade com telas/campos antigos.
    margem_cartao_unitaria = margem_rmc

    # ========================================================
    # EMPRESTIMOS ATIVOS
    # ========================================================

    emprestimos_ativos = [
        contrato
        for contrato in emprestimos
        if (
            isinstance(contrato, dict)
            and is_active_record(contrato)
        )
    ]

    total_emprestimos_ativos = money(
        sum(
            (
                Decimal(
                    str(
                        money(
                            contrato.get("parcela")
                            or contrato.get(
                                "valor_parcela"
                            )
                            or contrato.get(
                                "Vl_Parcela"
                            )
                        )
                    )
                )
                for contrato
                in emprestimos_ativos
            ),
            Decimal("0"),
        )
    )

    # IMPORTANTE:
    # RMC/RCC nao reduzem os 35% de emprestimo.
    margem_livre = money(
        Decimal(str(margem_emprestimo))
        - Decimal(
            str(total_emprestimos_ativos)
        )
    )

    # ========================================================
    # RMC / RCC
    # ========================================================

    # Promosys/MultiCorban tambem informam RMC/RCC
    # diretamente nas margens. Se o provedor sinalizou
    # valor positivo, o respectivo slot de 5% ja esta
    # comprometido mesmo que nao exista item em cartoes.
    possui_rmc = (
        money(
            margens.get("rmc_promosys")
        ) > 0
    )

    possui_rcc = (
        money(
            margens.get("rcc_promosys")
        ) > 0
    )

    for cartao in cartoes:
        if not isinstance(cartao, dict):
            continue

        kind = _card_margin_kind(
            cartao
        )

        if not kind:
            continue

        cartao_ativo = is_active_record(
            cartao
        )

        limite = (
            margem_rmc
            if kind == "RMC"
            else margem_rcc
        )

        cartao["limite_cartao"] = limite
        cartao["utilizado"] = (
            limite
            if cartao_ativo
            else 0.0
        )
        cartao["disponivel"] = (
            0.0
            if cartao_ativo
            else limite
        )

        if not cartao_ativo:
            continue

        if kind == "RMC":
            possui_rmc = True

        elif kind == "RCC":
            possui_rcc = True

    # Cada modalidade ocupa no maximo o seu
    # proprio slot de 5%, independentemente da
    # quantidade de registros retornados.
    rmc_utilizado = (
        margem_rmc
        if possui_rmc
        else 0.0
    )

    rcc_utilizado = (
        margem_rcc
        if possui_rcc
        else 0.0
    )

    rmc_disponivel = (
        0.0
        if possui_rmc
        else margem_rmc
    )

    rcc_disponivel = (
        0.0
        if possui_rcc
        else margem_rcc
    )

    quantidade_cartoes_ativos = (
        int(possui_rmc)
        + int(possui_rcc)
    )

    total_cartoes_ativos = money(
        Decimal(str(rmc_utilizado))
        + Decimal(str(rcc_utilizado))
    )

    cartao_disponivel = money(
        Decimal(str(rmc_disponivel))
        + Decimal(str(rcc_disponivel))
    )

    # A Consulta CPF utiliza um objeto separado
    # chamado margens_cartao para exibir RMC/RCC.
    # Mantemos esse objeto sincronizado com a
    # mesma regra central de 5% + 5%.
    margens_cartao = data.get(
        "margens_cartao"
    )

    if not isinstance(
        margens_cartao,
        dict,
    ):
        margens_cartao = {}

    margens_cartao.update({
        "rmc_disponivel":
            rmc_disponivel,
        "rcc_disponivel":
            rcc_disponivel,
    })

    # Mantemos este campo para resumo financeiro.
    # Ele representa o comprometimento TOTAL:
    # emprestimos + RMC + RCC.
    total_comprometido = money(
        Decimal(
            str(total_emprestimos_ativos)
        )
        + Decimal(str(rmc_utilizado))
        + Decimal(str(rcc_utilizado))
    )

    # ========================================================
    # RETORNO PADRONIZADO
    # ========================================================

    margens.update({
        "salario": salario,

        # 45% total
        "margem_total_consignavel":
            margem_total_consignavel,

        # 35% emprestimos
        "margem_emprestimo":
            margem_emprestimo,

        "margem_livre":
            margem_livre,

        # 5% RMC
        "margem_rmc":
            margem_rmc,

        "rmc_utilizado":
            rmc_utilizado,

        "rmc_disponivel":
            rmc_disponivel,

        "possui_rmc":
            possui_rmc,

        # 5% RCC
        "margem_rcc":
            margem_rcc,

        "rcc_utilizado":
            rcc_utilizado,

        "rcc_disponivel":
            rcc_disponivel,

        "possui_rcc":
            possui_rcc,

        # Compatibilidade existente
        "margem_cartao":
            margem_cartao_unitaria,

        "possui_cartao":
            possui_rmc or possui_rcc,

        "cartao_utilizado":
            total_cartoes_ativos,

        "cartao_disponivel":
            cartao_disponivel,

        "total_comprometido":
            total_comprometido,
    })

    cliente.update({
        "salario": salario,
        "margem_livre": margem_livre,
    })

    resumo = data.get("resumo")

    if isinstance(resumo, dict):
        resumo[
            "total_parcelas_emprestimos"
        ] = total_emprestimos_ativos

        resumo[
            "total_emprestimos"
        ] = len(emprestimos_ativos)

        resumo[
            "total_cartoes"
        ] = quantidade_cartoes_ativos

    data["cliente"] = cliente
    data["margens"] = margens
    data["margens_cartao"] = (
        margens_cartao
    )
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
