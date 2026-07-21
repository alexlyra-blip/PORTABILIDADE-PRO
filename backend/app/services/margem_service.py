from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import Bank, DailyMarginCoefficient


VALID_MARGIN_CONVENIOS = {"INSS", "SIAPE"}
DEFAULT_INSS_COEFFICIENT = 0.02270


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


async def _fetch_daily_coefficient(
    session: AsyncSession,
    convenio: str,
) -> float | None:
    from datetime import datetime, timezone

    hoje = datetime.now(timezone.utc)

    result = await session.execute(
        select(DailyMarginCoefficient)
        .join(Bank, DailyMarginCoefficient.bank_id == Bank.id)
        .filter(Bank.is_margin_base == True)
        .filter(Bank.active == True)
        .filter(DailyMarginCoefficient.convenio == convenio)
        .filter(DailyMarginCoefficient.date <= hoje)
        .order_by(
            DailyMarginCoefficient.date.desc(),
            Bank.margin_base_priority.asc(),
            Bank.id.asc(),
        )
        .limit(1)
    )

    coefficient = result.scalars().first()

    if coefficient and coefficient.coefficient > 0:
        return float(coefficient.coefficient)

    return None


async def obter_coeficiente_fator(
    db: AsyncSession = None,
    convenio: str = "INSS",
) -> float:
    """
    Busca o último coeficiente diário válido para o convênio informado.

    INSS mantém o fallback histórico de 0.02270.
    SIAPE retorna 0 quando ainda não possui coeficiente cadastrado.
    """
    normalized = normalize_margin_convenio(convenio)
    fallback = get_default_margin_coefficient(normalized)

    if db is not None:
        coefficient = await _fetch_daily_coefficient(db, normalized)
        return coefficient if coefficient is not None else fallback

    async with AsyncSessionLocal() as session:
        coefficient = await _fetch_daily_coefficient(session, normalized)
        return coefficient if coefficient is not None else fallback


async def calcular_valor_liberado_margem(
    margem_livre: float,
    db: AsyncSession = None,
    convenio: str = "INSS",
) -> float:
    """
    Calcula o valor aproximado liberado usando o coeficiente do convênio.
    """
    if not margem_livre or margem_livre <= 0:
        return 0.0

    coeficiente_fator = await obter_coeficiente_fator(db, convenio)

    if coeficiente_fator <= 0:
        return 0.0

    return round(margem_livre / coeficiente_fator, 2)
