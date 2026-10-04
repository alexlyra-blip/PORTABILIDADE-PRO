from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import (
    Bank,
    BankTable,
    Coefficient,
    DailyMarginCoefficient,
)


VALID_MARGIN_CONVENIOS = {"INSS", "SIAPE"}
DEFAULT_INSS_COEFFICIENT = 0.02270
AGE_SPECIFIC_MARGIN_START = 74


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
    import logging
    _logger = logging.getLogger("margem_service")

    try:
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
    except Exception as err:
        _logger.warning(f"Não foi possível obter coeficiente diário do banco ({err}). Usando padrão.")
        return None


async def _fetch_age_coefficient(
    session: AsyncSession,
    convenio: str,
    idade: int,
) -> float | None:
    """
    Para INSS 74+, tenta usar o coeficiente da tabela/faixa
    etaria cadastrada no banco marcado como base de margem.

    A tabela precisa ter min_age e/ou max_age configurado.
    Tabelas genericas sem faixa etaria nao substituem o
    coeficiente diario.
    """
    import logging

    _logger = logging.getLogger("margem_service")

    if convenio != "INSS" or idade < AGE_SPECIFIC_MARGIN_START:
        return None

    try:
        result = await session.execute(
            select(
                Coefficient,
                BankTable,
                Bank,
            )
            .join(
                BankTable,
                Coefficient.table_id == BankTable.id,
            )
            .join(
                Bank,
                BankTable.bank_id == Bank.id,
            )
            .where(Bank.is_margin_base == True)
            .where(Bank.active == True)
            .where(BankTable.active == True)
            .where(
                or_(
                    BankTable.agreement.is_(None),
                    BankTable.agreement == "",
                    func.upper(BankTable.agreement)
                    == convenio,
                )
            )
            .where(
                or_(
                    BankTable.min_age.is_(None),
                    BankTable.min_age <= idade,
                )
            )
            .where(
                or_(
                    BankTable.max_age.is_(None),
                    BankTable.max_age == 0,
                    BankTable.max_age >= idade,
                )
            )
        )

        candidates = []

        for coefficient, table, bank in result.all():
            coefficient_value = float(
                coefficient.coefficient or 0
            )

            if coefficient_value <= 0:
                continue

            min_age = int(table.min_age or 0)
            max_age = int(table.max_age or 0)

            # Somente uma tabela realmente etaria pode
            # substituir o coeficiente diario.
            if min_age <= 0 and max_age <= 0:
                continue

            effective_max = (
                max_age
                if max_age > 0
                else 999
            )

            if idade < min_age or idade > effective_max:
                continue

            table_term = int(table.term or 0)
            coefficient_term = int(
                coefficient.term or 0
            )

            exact_table_term = (
                0
                if (
                    table_term > 0
                    and coefficient_term == table_term
                )
                else 1
            )

            age_width = (
                effective_max - min_age
            )

            candidates.append(
                (
                    (
                        int(
                            bank.margin_base_priority
                            or 0
                        ),
                        age_width,
                        -min_age,
                        exact_table_term,
                        -coefficient_term,
                        int(coefficient.id or 0),
                    ),
                    coefficient_value,
                )
            )

        if not candidates:
            return None

        candidates.sort(
            key=lambda item: item[0]
        )

        return candidates[0][1]

    except Exception as err:
        _logger.warning(
            "Nao foi possivel obter coeficiente "
            "por faixa etaria (%s anos): %s. "
            "Usando coeficiente diario.",
            idade,
            err,
        )
        return None


async def obter_coeficiente_fator(
    db: AsyncSession = None,
    convenio: str = "INSS",
    idade: int | None = None,
) -> float:
    """
    Resolve o coeficiente de margem do convênio.

    Para INSS com idade a partir de 74 anos, prioriza a
    tabela/faixa etária cadastrada no banco-base de margem.
    Na ausência de faixa compatível, usa o coeficiente diário.

    INSS mantém o fallback histórico de 0.02270.
    SIAPE retorna 0 quando ainda não possui coeficiente cadastrado.
    """
    normalized = normalize_margin_convenio(convenio)
    fallback = get_default_margin_coefficient(normalized)

    age_value = int(idade or 0)

    async def resolve_with_session(
        session: AsyncSession,
    ) -> float:
        if (
            normalized == "INSS"
            and age_value >= AGE_SPECIFIC_MARGIN_START
        ):
            age_coefficient = (
                await _fetch_age_coefficient(
                    session,
                    normalized,
                    age_value,
                )
            )

            if age_coefficient is not None:
                return age_coefficient

        coefficient = await _fetch_daily_coefficient(
            session,
            normalized,
        )

        return (
            coefficient
            if coefficient is not None
            else fallback
        )

    if db is not None:
        return await resolve_with_session(db)

    async with AsyncSessionLocal() as session:
        return await resolve_with_session(session)


async def calcular_valor_liberado_margem(
    margem_livre: float,
    db: AsyncSession = None,
    convenio: str = "INSS",
    idade: int | None = None,
    coeficiente_fator: float | None = None,
) -> float:
    """
    Calcula o valor aproximado liberado usando o coeficiente do convênio.
    """
    if not margem_livre or margem_livre <= 0:
        return 0.0

    if coeficiente_fator is None:
        coeficiente_fator = await obter_coeficiente_fator(
            db,
            convenio,
            idade=idade,
        )

    if coeficiente_fator <= 0:
        return 0.0

    return round(margem_livre / coeficiente_fator, 2)
