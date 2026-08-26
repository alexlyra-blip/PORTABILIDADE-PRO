from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models.sqlalchemy_models import User
from app.routers.deps import get_current_user
from app.services.portabilidade_multipla_service import (
    PortabilidadeMultiplaFactaService,
)


router = APIRouter()


class ContratoMultiplaInput(BaseModel):
    banco: str
    parcela: float
    saldo_devedor: float = 0.0
    contrato: Optional[str] = None
    beneficio: str


class PortabilidadeMultiplaInput(BaseModel):
    banco_destino: str = "FACTA"
    convenio: str = "INSS"
    margem_disponivel: float = 0.0
    contratos: List[ContratoMultiplaInput]
    valor_operacao_refin: Optional[float] = None


@router.get("/config")
async def configuracao_portabilidade_multipla(
    current_user: User = Depends(get_current_user),
):
    return {
        "banco": "FACTA",
        "convenio": "INSS",
        "max_contratos": (
            PortabilidadeMultiplaFactaService
            .MAX_CONTRATOS
        ),
        "grupo_a": sorted(
            PortabilidadeMultiplaFactaService
            .GRUPO_A
        ),
        "grupo_b": sorted(
            PortabilidadeMultiplaFactaService
            .GRUPO_B
        ),
        "grupo_c": sorted(
            PortabilidadeMultiplaFactaService
            .GRUPO_C
        ),
        "parcela_minima_refin": 50.0,
        "valor_minimo_operacao": 3000.0,
        "adicional_viabilidade": 20.0,
    }


@router.post("/validar")
async def validar_portabilidade_multipla(
    payload: PortabilidadeMultiplaInput,
    current_user: User = Depends(get_current_user),
):
    contratos = []

    for contrato in payload.contratos:
        if hasattr(contrato, "model_dump"):
            contratos.append(
                contrato.model_dump()
            )
        else:
            contratos.append(
                contrato.dict()
            )

    return (
        PortabilidadeMultiplaFactaService
        .validar(
            banco_destino=(
                payload.banco_destino
            ),
            convenio=payload.convenio,
            margem_disponivel=(
                payload.margem_disponivel
            ),
            contratos=contratos,
            valor_operacao_refin=(
                payload.valor_operacao_refin
            ),
        )
    )



# MOTOR_PORTABILIDADE_MULTIPLA_FACTA

import json as _json
import re as _re
import unicodedata as _unicodedata

from typing import (
    List as _List,
    Optional as _Optional,
)

from fastapi import (
    Depends as _Depends,
)

from pydantic import (
    BaseModel as _BaseModel,
    Field as _Field,
)

from sqlalchemy import (
    select as _select,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession as _AsyncSession,
)

from app.database import (
    get_db as _get_db,
)

from app.models.models import (
    SimulacaoInput as _SimulacaoInput,
)

from app.models.sqlalchemy_models import (
    Bank as _Bank,
    BankRule as _BankRule,
    BankTable as _BankTable,
)

from app.routers.deps import (
    get_current_user as _get_current_user,
)

from app.services.simulador_service import (
    SimuladorService as _SimuladorService,
)

from app.services.portabilidade_multipla_service import (
    interseccionar_ofertas_facta as
    _interseccionar_ofertas_facta,
    oferta_e_facta as
    _oferta_e_facta,
)


def _motor_norm(value):
    text = str(
        value or ""
    ).strip().upper()

    text = "".join(
        char
        for char
        in _unicodedata.normalize(
            "NFD",
            text,
        )
        if _unicodedata.category(
            char
        ) != "Mn"
    )

    return " ".join(
        text.split()
    )


def _motor_float(
    value,
    default=0.0,
):
    try:
        return float(
            value
            if value is not None
            else default
        )
    except (
        TypeError,
        ValueError,
    ):
        return float(default)


def _motor_int(
    value,
    default=0,
):
    try:
        return int(
            float(
                value
                if value is not None
                else default
            )
        )
    except (
        TypeError,
        ValueError,
    ):
        return int(default)


def _parse_string_list(raw):
    if not raw:
        return []

    if isinstance(raw, list):
        return [
            str(item).strip()
            for item in raw
            if str(item).strip()
        ]

    text = str(raw).strip()

    try:
        parsed = _json.loads(
            text
        )

        if isinstance(
            parsed,
            list,
        ):
            return [
                str(item).strip()
                for item in parsed
                if str(item).strip()
            ]

        if isinstance(
            parsed,
            dict,
        ):
            return [
                str(key).strip()
                for key in parsed.keys()
                if str(key).strip()
            ]
    except Exception:
        pass

    return [
        item.strip()
        for item in _re.split(
            r"[,;\n]+",
            text,
        )
        if item.strip()
    ]


def _parse_origin_min_paid(raw):
    if not raw:
        return []

    parsed = raw

    if isinstance(raw, str):
        try:
            parsed = _json.loads(
                raw
            )
        except Exception:
            return []

    result = []

    if isinstance(
        parsed,
        dict,
    ):

        for bank, value in (
            parsed.items()
        ):

            if isinstance(
                value,
                dict,
            ):
                minimum = (
                    value.get("min_paid")
                    or value.get(
                        "min_parcelas"
                    )
                    or value.get(
                        "parcelas_pagas"
                    )
                    or 0
                )
            else:
                minimum = value

            result.append({
                "origin_bank":
                    str(bank),
                "min_paid":
                    _motor_int(
                        minimum
                    ),
            })

    elif isinstance(
        parsed,
        list,
    ):

        for item in parsed:

            if not isinstance(
                item,
                dict,
            ):
                continue

            bank = (
                item.get(
                    "origin_bank"
                )
                or item.get("banco")
                or item.get("bank")
                or ""
            )

            minimum = (
                item.get("min_paid")
                or item.get(
                    "min_parcelas"
                )
                or item.get(
                    "parcelas_pagas"
                )
                or 0
            )

            if bank:
                result.append({
                    "origin_bank":
                        str(bank),
                    "min_paid":
                        _motor_int(
                            minimum
                        ),
                })

    return result


class _ContratoMotorMultipla(
    _BaseModel
):
    banco: str
    codigo: _Optional[str] = None
    contrato: _Optional[str] = None
    beneficio: str

    parcela: float
    saldo_devedor: float

    taxa: float = 0.0
    prazo: int
    prazo_restante: int
    parcelas_pagas: int = 0

    valor_contrato: float = 0.0
    data_averbacao: _Optional[str] = None


class _ClienteMotorMultipla(
    _BaseModel
):
    nome: str = ""
    cpf: str = ""
    idade: int = 0
    especie: str = ""

    data_concessao: _Optional[str] = None

    analfabeto: bool = False
    is_60_plus: _Optional[bool] = None
    is_invalidez_60_plus: _Optional[bool] = None
    possui_dois_cartoes: bool = False


class _SimularMotorMultipla(
    _BaseModel
):
    banco_destino: str = "FACTA"
    convenio: str = "INSS"

    margem_disponivel: float = 0.0

    cliente: _ClienteMotorMultipla

    contratos: _List[
        _ContratoMotorMultipla
    ] = _Field(
        default_factory=list
    )


@router.get(
    "/motor-config"
)
async def motor_config_multipla(
    db: _AsyncSession = _Depends(
        _get_db
    ),
    current_user = _Depends(
        _get_current_user
    ),
):
    """
    Exposicao somente-leitura das regras
    atuais da FACTA usadas para o pre-check
    visual da Portabilidade Multipla.

    O Motor continua sendo a autoridade
    final de elegibilidade.
    """

    banks_result = await db.execute(
        _select(_Bank).where(
            _Bank.active == True
        )
    )

    banks = (
        banks_result
        .scalars()
        .all()
    )

    facta = next(
        (
            bank
            for bank in banks
            if "FACTA"
            in _motor_norm(
                getattr(
                    bank,
                    "name",
                    "",
                )
            )
        ),
        None,
    )

    if not facta:
        return {
            "facta_encontrado":
                False,
            "excluded_origin_banks":
                [],
            "origin_min_paid":
                [],
            "min_paid_installments":
                0,
            "min_table_paid_any":
                0,
        }

    rules_result = await db.execute(
        _select(
            _BankRule
        ).where(
            _BankRule.bank_id
            == facta.id,
            _BankRule.active
            == True,
        )
    )

    rules = (
        rules_result
        .scalars()
        .all()
    )

    rule = next(
        (
            item
            for item in rules
            if _motor_norm(
                getattr(
                    item,
                    "agreement",
                    "",
                )
            )
            == "INSS"
        ),
        None,
    )

    if rule is None:
        rule = next(
            (
                item
                for item in rules
                if not getattr(
                    item,
                    "agreement",
                    None,
                )
            ),
            rules[0]
            if rules
            else None,
        )

    tables_result = await db.execute(
        _select(
            _BankTable
        ).where(
            _BankTable.bank_id
            == facta.id,
            _BankTable.active
            == True,
        )
    )

    all_tables = (
        tables_result
        .scalars()
        .all()
    )

    inss_tables = [
        table
        for table in all_tables
        if _motor_norm(
            getattr(
                table,
                "agreement",
                "",
            )
        )
        in ("", "INSS")
    ]

    table_minimums = [
        _motor_int(
            getattr(
                table,
                "min_paid_installments",
                0,
            )
        )
        for table in inss_tables
    ]

    min_table_paid_any = (
        min(table_minimums)
        if table_minimums
        else 0
    )

    return {
        "facta_encontrado":
            True,

        "bank_id":
            facta.id,

        "bank_name":
            getattr(
                facta,
                "name",
                "FACTA",
            ),

        "excluded_origin_banks":
            _parse_string_list(
                getattr(
                    rule,
                    "excluded_origin_banks",
                    None,
                )
                if rule
                else None
            ),

        "origin_min_paid":
            _parse_origin_min_paid(
                getattr(
                    rule,
                    "origin_banks_min_paid",
                    None,
                )
                if rule
                else None
            ),

        "min_paid_installments":
            _motor_int(
                getattr(
                    rule,
                    "min_paid_installments",
                    0,
                )
                if rule
                else 0
            ),

        "min_table_paid_any":
            min_table_paid_any,

        "active_inss_tables":
            len(
                inss_tables
            ),
    }


def _facta_rejection_reasons(
    result,
):
    rejeitados = (
        result.get(
            "rejeitados",
            []
        )
        if isinstance(
            result,
            dict,
        )
        else []
    ) or []

    facta_reasons = []

    general_reasons = []

    for item in rejeitados:

        if not isinstance(
            item,
            dict,
        ):
            continue

        motivo = str(
            item.get(
                "motivo",
                item.get(
                    "reason",
                    "",
                ),
            )
            or ""
        )

        if not motivo:
            continue

        banco = str(
            item.get(
                "banco",
                item.get(
                    "bank",
                    "",
                ),
            )
            or ""
        )

        general_reasons.append(
            motivo
        )

        if "FACTA" in _motor_norm(
            banco
        ):
            facta_reasons.append(
                motivo
            )

    return (
        facta_reasons
        or general_reasons
    )


@router.post(
    "/simular"
)
async def simular_portabilidade_multipla_facta(
    payload:
        _SimularMotorMultipla,

    db: _AsyncSession = _Depends(
        _get_db
    ),

    current_user = _Depends(
        _get_current_user
    ),
):
    """
    Orquestra o Motor existente SEM altera-lo.

    Cada banco originador selecionado e
    submetido ao SimuladorService usando
    os valores consolidados da Multipla.

    Assim:
    - regras do banco originador continuam
      sendo aplicadas;
    - regras FACTA continuam no Motor;
    - regras da promotora continuam no Motor;
    - regras das tabelas e coeficientes
      continuam no Motor;
    - somente tabelas FACTA comuns a TODOS
      os contratos sao retornadas.
    """

    contratos_dict = [
        item.dict()
        for item
        in payload.contratos
    ]

    validacao = (
        PortabilidadeMultiplaFactaService
        .validar(
            banco_destino=
                payload.banco_destino,

            convenio=
                payload.convenio,

            margem_disponivel=
                payload.margem_disponivel,

            contratos=
                contratos_dict,
        )
    )

    if not validacao.get(
        "elegivel_previo"
    ):
        return {
            "success": False,
            "ofertas": [],
            "rejeitados": [],
            "bloqueios":
                validacao.get(
                    "bloqueios",
                    [],
                ),
            "avisos":
                validacao.get(
                    "avisos",
                    [],
                ),
            "validacao":
                validacao,
        }

    soma_parcelas = round(
        sum(
            _motor_float(
                item.parcela
            )
            for item
            in payload.contratos
        ),
        2,
    )

    soma_saldos = round(
        sum(
            _motor_float(
                item.saldo_devedor
            )
            for item
            in payload.contratos
        ),
        2,
    )

    margem_negativa = round(
        abs(
            min(
                0.0,
                _motor_float(
                    payload
                    .margem_disponivel
                ),
            )
        ),
        2,
    )

    parcela_refin = round(
        max(
            0.0,
            soma_parcelas
            - margem_negativa,
        ),
        2,
    )

    idade = max(
        18,
        _motor_int(
            payload.cliente.idade,
            18,
        ),
    )

    especie = str(
        payload.cliente.especie
        or ""
    ).strip()

    especie_codigo_match = (
        _re.search(
            r"\d{1,3}",
            especie,
        )
    )

    especie_codigo = (
        especie_codigo_match
        .group(0)
        .zfill(2)
        if especie_codigo_match
        else especie
    )

    invalidez_codes = {
        "04",
        "05",
        "06",
        "32",
        "87",
        "92",
    }

    is_60_plus = (
        payload.cliente
        .is_60_plus
        if payload.cliente
        .is_60_plus
        is not None
        else idade >= 60
    )

    is_invalidez_60_plus = (
        payload.cliente
        .is_invalidez_60_plus
        if payload.cliente
        .is_invalidez_60_plus
        is not None
        else (
            idade >= 60
            and especie_codigo
            in invalidez_codes
        )
    )

    resultados_motor = []

    bloqueios_contratos = []

    for contrato in (
        payload.contratos
    ):

        prazo_total = max(
            1,
            _motor_int(
                contrato.prazo,
                1,
            ),
        )

        prazo_restante = max(
            1,
            _motor_int(
                contrato
                .prazo_restante,
                1,
            ),
        )

        banco_origem = (
            str(
                contrato.codigo
                or ""
            ).strip()
            or str(
                contrato.banco
                or ""
            ).strip()
        )

        sim_input = (
            _SimulacaoInput(
                nome_cliente=
                    payload
                    .cliente
                    .nome,

                cpf=
                    payload
                    .cliente
                    .cpf,

                idade=
                    idade,

                convenio=
                    "INSS",

                sub_convenio=
                    "",

                benefit_species=
                    especie_codigo,

                banco=
                    banco_origem,

                # IMPORTANTE:
                # O Motor recebe a soma original
                # das parcelas e a margem negativa
                # separadamente, evitando desconto
                # em duplicidade.
                parcela=
                    soma_parcelas,

                saldo_devedor=
                    soma_saldos,

                taxa_atual=
                    _motor_float(
                        contrato.taxa
                    ),

                total_term=
                    prazo_total,

                remaining_term=
                    prazo_restante,

                data_concessao=
                    payload
                    .cliente
                    .data_concessao,

                is_60_plus=
                    bool(
                        is_60_plus
                    ),

                is_invalidez_60_plus=
                    bool(
                        is_invalidez_60_plus
                    ),

                analfabeto=
                    bool(
                        payload
                        .cliente
                        .analfabeto
                    ),

                possui_dois_cartoes=
                    bool(
                        payload
                        .cliente
                        .possui_dois_cartoes
                    ),

                valor_margem_negativa=
                    margem_negativa,
            )
        )

        try:
            result = await (
                _SimuladorService
                .executar(
                    sim_input,
                    db,
                    current_user.id,
                )
            )

        except Exception as error:
            bloqueios_contratos.append({
                "contrato":
                    contrato.contrato,
                "banco":
                    contrato.banco,
                "motivos": [
                    str(error)
                ],
            })

            resultados_motor.append({
                "ofertas": [],
                "rejeitados": [],
            })

            continue

        resultados_motor.append(
            result
        )

        ofertas_facta = [
            oferta
            for oferta
            in (
                result.get(
                    "ofertas",
                    []
                )
                or []
            )
            if _oferta_e_facta(
                oferta
            )
        ]

        if not ofertas_facta:
            motivos = (
                _facta_rejection_reasons(
                    result
                )
            )

            if not motivos:
                motivos = [
                    (
                        "Nenhuma tabela FACTA "
                        "elegivel para este "
                        "contrato nas regras "
                        "atuais do Motor."
                    )
                ]

            bloqueios_contratos.append({
                "contrato":
                    contrato.contrato,
                "banco":
                    contrato.banco,
                "motivos":
                    motivos,
            })

    if bloqueios_contratos:
        return {
            "success": False,

            "ofertas": [],

            "bloqueios_contratos":
                bloqueios_contratos,

            "validacao":
                validacao,

            "resumo": {
                "soma_parcelas":
                    soma_parcelas,
                "margem_negativa":
                    margem_negativa,
                "parcela_refin":
                    parcela_refin,
                "saldo_total":
                    soma_saldos,
            },
        }

    ofertas_comuns = (
        _interseccionar_ofertas_facta(
            resultados_motor
        )
    )

    if not ofertas_comuns:
        return {
            "success": False,

            "ofertas": [],

            "bloqueios": [
                (
                    "Os contratos possuem "
                    "ofertas FACTA individuais, "
                    "mas nao existe uma mesma "
                    "tabela/prazo FACTA elegivel "
                    "para todos eles."
                )
            ],

            "validacao":
                validacao,

            "resumo": {
                "soma_parcelas":
                    soma_parcelas,
                "margem_negativa":
                    margem_negativa,
                "parcela_refin":
                    parcela_refin,
                "saldo_total":
                    soma_saldos,
            },
        }

    ofertas_normalizadas = []

    rejeitados_multipla = []

    for oferta in ofertas_comuns:

        tabela = (
            oferta.get("tabela")
            or oferta.get(
                "table_name"
            )
            or oferta.get(
                "nome_tabela"
            )
            or "FACTA"
        )

        prazo = _motor_int(
            oferta.get(
                "prazo",
                oferta.get(
                    "term",
                    0,
                ),
            )
        )

        parcela_motor = (
            _motor_float(
                oferta.get(
                    "valor_parcela",
                    oferta.get(
                        "parcela",
                        parcela_refin,
                    ),
                )
            )
        )

        if parcela_motor <= 0:
            parcela_motor = (
                parcela_refin
            )

        novo_contrato = (
            _motor_float(
                oferta.get(
                    "valor_total_contrato",
                    oferta.get(
                        "novo_contrato",
                        oferta.get(
                            "valor_financiado",
                            0,
                        ),
                    ),
                )
            )
        )

        troco_raw = oferta.get(
            "troco"
        )

        if troco_raw is None:
            troco_raw = oferta.get(
                "valor_liberado"
            )

        troco = _motor_float(
            troco_raw
        )

        if (
            troco_raw is None
            and novo_contrato > 0
        ):
            troco = (
                novo_contrato
                - soma_saldos
            )

        troco = round(
            troco,
            2,
        )

        coeficiente = (
            _motor_float(
                oferta.get(
                    "coeficiente",
                    oferta.get(
                        "coefficient",
                        0,
                    ),
                )
            )
        )

        if (
            coeficiente <= 0
            and novo_contrato > 0
            and parcela_motor > 0
        ):
            coeficiente = (
                parcela_motor
                / novo_contrato
            )

        taxa = _motor_float(
            oferta.get(
                "taxa_juros",
                oferta.get(
                    "taxa",
                    oferta.get(
                        "interest_rate",
                        0,
                    ),
                ),
            )
        )

        taxa_refin = (
            _motor_float(
                oferta.get(
                    "taxa_refin",
                    oferta.get(
                        "interest_rate_refin",
                        taxa,
                    ),
                )
            )
        )

        # REGRA ESPECIFICA DA MULTIPLA:
        # parcela >= 50 OU
        # valor da operacao >= 3000.
        regra_minima_ok = (
            parcela_motor >= 50.0
            or novo_contrato
            >= 3000.0
        )

        if not regra_minima_ok:
            rejeitados_multipla.append({
                "tabela":
                    str(tabela),

                "prazo":
                    prazo,

                "motivo":
                    (
                        "Portabilidade Multipla: "
                        "parcela do Refin inferior "
                        "a R$ 50,00 e valor da "
                        "operacao inferior a "
                        "R$ 3.000,00."
                    ),
            })

            continue

        ofertas_normalizadas.append({
            **oferta,

            "banco":
                oferta.get(
                    "banco"
                )
                or "FACTA",

            "tabela":
                str(tabela),

            "prazo":
                prazo,

            "taxa_juros":
                taxa,

            "taxa_refin":
                taxa_refin,

            "coeficiente":
                round(
                    coeficiente,
                    8,
                ),

            "parcela_refin":
                round(
                    parcela_motor,
                    2,
                ),

            "novo_contrato":
                round(
                    novo_contrato,
                    2,
                ),

            "saldo_total":
                soma_saldos,

            "troco":
                troco,

            "quantidade_contratos":
                len(
                    payload.contratos
                ),
        })

    ofertas_normalizadas.sort(
        key=lambda item:
            _motor_float(
                item.get("troco")
            ),
        reverse=True,
    )

    return {
        "success":
            bool(
                ofertas_normalizadas
            ),

        "banco":
            "FACTA",

        "convenio":
            "INSS",

        "beneficio":
            validacao.get(
                "beneficio_operacao"
            ),

        "grupo":
            validacao.get(
                "grupo_operacao"
            ),

        "ofertas":
            ofertas_normalizadas,

        "rejeitados":
            rejeitados_multipla,

        "bloqueios_contratos":
            [],

        "validacao":
            validacao,

        "resumo": {
            "quantidade_contratos":
                len(
                    payload.contratos
                ),

            "soma_parcelas":
                soma_parcelas,

            "margem_negativa":
                margem_negativa,

            "parcela_refin":
                parcela_refin,

            "saldo_total":
                soma_saldos,
        },
    }
