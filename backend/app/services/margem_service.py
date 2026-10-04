from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import Bank, DailyMarginCoefficient


VALID_MARGIN_CONVENIOS = {"INSS", "SIAPE"}
DEFAULT_INSS_COEFFICIENT = 0.02270

# Regra fixa de margem livre INSS com prazo reduzido.
# Até 71 anos o sistema continua usando o coeficiente diário.
REDUCED_TERM_MARGIN_START_AGE = 72
REDUCED_TERM_MARGIN_MAX_AGE = 77
REDUCED_TERM_MIN_CONTRACT_AMOUNT = 1000.00

REDUCED_TERM_MARGIN_RULES = {
    72: {"term": 96, "coefficient": 0.02340},
    73: {"term": 84, "coefficient": 0.02463},
    74: {"term": 72, "coefficient": 0.02638},
    75: {"term": 60, "coefficient": 0.02894},
    76: {"term": 48, "coefficient": 0.03293},
    77: {"term": 36, "coefficient": 0.03980},
}


def normalize_margin_convenio(convenio: str = "INSS") -> str:
    normalized = str(convenio or "INSS").strip().upper()

    if normalized not in VALID_MARGIN_CONVENIOS:
        raise ValueError(
            f"Convênio inválido para coeficiente diário: {normalized}."
        )

    return normalized


def resolve_margin_convenio(convenio: str = "INSS") -> str:
    """
    SIAPE utiliza cadastro próprio.

    Os demais convênios mantêm o comportamento histórico,
    utilizando a base de coeficientes INSS.
    """
    normalized = str(convenio or "INSS").strip().upper()

    if normalized in VALID_MARGIN_CONVENIOS:
        return normalized

    return "INSS"


def get_default_margin_coefficient(convenio: str = "INSS") -> float:
    """
    Mantém o comportamento histórico do INSS.

    Para SIAPE, a ausência de cadastro retorna zero, evitando usar
    silenciosamente o coeficiente padrão do INSS.
    """
    normalized = normalize_margin_convenio(convenio)

    if normalized == "INSS":
        return DEFAULT_INSS_COEFFICIENT

    return 0.0


def obter_regra_margem_por_idade(
    idade: int | None,
    convenio: str = "INSS",
) -> dict | None:
    """
    Retorna a regra fixa de prazo reduzido da margem livre INSS.

    72 anos -> 96x / 0.02340
    73 anos -> 84x / 0.02463
    74 anos -> 72x / 0.02638
    75 anos -> 60x / 0.02894
    76 anos -> 48x / 0.03293
    77 anos -> 36x / 0.03980
    """
    normalized = normalize_margin_convenio(convenio)

    if normalized != "INSS":
        return None

    age_value = int(idade or 0)

    return REDUCED_TERM_MARGIN_RULES.get(
        age_value
    )


def obter_prazo_margem(
    idade: int | None,
    convenio: str = "INSS",
) -> int | None:
    regra = obter_regra_margem_por_idade(
        idade,
        convenio,
    )

    if not regra:
        return None

    return int(regra["term"])


async def _fetch_daily_coefficient(
    session: AsyncSession,
    convenio: str,
) -> float | None:
    from datetime import datetime, timezone
    import logging

    _logger = logging.getLogger("margem_service")

    try:
        hoje = datetime.now(timezone.utc)

        result = await session.execute(
            select(DailyMarginCoefficient)
            .join(
                Bank,
                DailyMarginCoefficient.bank_id
                == Bank.id,
            )
            .filter(Bank.is_margin_base == True)
            .filter(Bank.active == True)
            .filter(
                DailyMarginCoefficient.convenio
                == convenio
            )
            .filter(
                DailyMarginCoefficient.date <= hoje
            )
            .order_by(
                DailyMarginCoefficient.date.desc(),
                Bank.margin_base_priority.asc(),
                Bank.id.asc(),
            )
            .limit(1)
        )

        coefficient = result.scalars().first()

        if (
            coefficient
            and coefficient.coefficient > 0
        ):
            return float(
                coefficient.coefficient
            )

        return None

    except Exception as err:
        _logger.warning(
            "Não foi possível obter coeficiente "
            "diário do banco (%s). Usando padrão.",
            err,
        )
        return None


async def obter_coeficiente_fator(
    db: AsyncSession = None,
    convenio: str = "INSS",
    idade: int | None = None,
) -> float:
    """
    Resolve o coeficiente usado na simulação de margem livre.

    INSS:
    - até 71 anos: coeficiente diário configurado no sistema;
    - 72 a 77 anos: coeficiente fixo da faixa etária;
    - acima de 77 anos: não simula margem livre.

    SIAPE mantém seu cadastro próprio.
    """
    normalized = normalize_margin_convenio(
        convenio
    )
    fallback = get_default_margin_coefficient(
        normalized
    )
    age_value = int(idade or 0)

    if (
        normalized == "INSS"
        and age_value >= REDUCED_TERM_MARGIN_START_AGE
    ):
        regra = obter_regra_margem_por_idade(
            age_value,
            normalized,
        )

        if regra:
            return float(
                regra["coefficient"]
            )

        # O coeficiente diário só pode ser usado
        # para clientes INSS de até 71 anos.
        return 0.0

    if db is not None:
        coefficient = await _fetch_daily_coefficient(
            db,
            normalized,
        )
        return (
            coefficient
            if coefficient is not None
            else fallback
        )

    async with AsyncSessionLocal() as session:
        coefficient = await _fetch_daily_coefficient(
            session,
            normalized,
        )
        return (
            coefficient
            if coefficient is not None
            else fallback
        )


async def calcular_valor_liberado_margem(
    margem_livre: float,
    db: AsyncSession = None,
    convenio: str = "INSS",
    idade: int | None = None,
    coeficiente_fator: float | None = None,
) -> float:
    """
    Calcula o valor aproximado liberado pela margem livre.

    Para INSS de 72 a 77 anos, o valor do contrato calculado
    precisa ser de pelo menos R$ 1.000,00.

    Para INSS acima de 77 anos não há simulação de margem livre.
    """
    if not margem_livre or margem_livre <= 0:
        return 0.0

    normalized = normalize_margin_convenio(
        convenio
    )
    age_value = int(idade or 0)

    if (
        normalized == "INSS"
        and age_value > REDUCED_TERM_MARGIN_MAX_AGE
    ):
        return 0.0

    if coeficiente_fator is None:
        coeficiente_fator = (
            await obter_coeficiente_fator(
                db,
                normalized,
                idade=age_value,
            )
        )

    if coeficiente_fator <= 0:
        return 0.0

    valor_contrato = round(
        (
            float(margem_livre)
            / float(coeficiente_fator)
        ),
        2,
    )

    if (
        normalized == "INSS"
        and age_value
        >= REDUCED_TERM_MARGIN_START_AGE
        and age_value
        <= REDUCED_TERM_MARGIN_MAX_AGE
        and valor_contrato
        < REDUCED_TERM_MIN_CONTRACT_AMOUNT
    ):
        return 0.0

    return valor_contrato
