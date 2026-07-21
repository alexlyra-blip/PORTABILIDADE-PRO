from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import (
    Bank,
    BankRule,
    DailyMarginCoefficient,
)


DEFAULT_MARGIN_COEFFICIENT = 0.02270


def _coefficient_query(
    convenio: Optional[str] = None,
):
    today = datetime.now(timezone.utc)

    query = (
        select(DailyMarginCoefficient)
        .join(
            Bank,
            DailyMarginCoefficient.bank_id == Bank.id,
        )
        .filter(Bank.is_margin_base == True)
        .filter(Bank.active == True)
        .filter(DailyMarginCoefficient.date <= today)
    )

    normalized_agreement = str(
        convenio or "INSS"
    ).strip().upper()

    # O fluxo INSS mantém exatamente a busca genérica
    # utilizada anteriormente.
    if normalized_agreement != "INSS":
        query = query.filter(
            exists().where(
                BankRule.bank_id == Bank.id,
                func.upper(
                    func.coalesce(
                        BankRule.agreement,
                        "",
                    )
                )
                == normalized_agreement,
            )
        )

    return (
        query
        .order_by(
            DailyMarginCoefficient.date.desc(),
            Bank.margin_base_priority.asc(),
            Bank.id.asc(),
        )
        .limit(1)
    )


async def _fetch_coefficient(
    session: AsyncSession,
    convenio: Optional[str] = None,
) -> Optional[float]:
    result = await session.execute(
        _coefficient_query(convenio)
    )

    coefficient = result.scalars().first()

    if (
        coefficient
        and coefficient.coefficient
        and coefficient.coefficient > 0
    ):
        return float(coefficient.coefficient)

    return None


async def obter_coeficiente_fator(
    db: AsyncSession = None,
    convenio: str = "INSS",
) -> float:
    """
    Busca o coeficiente diário do banco-base.

    Para SIAPE, prioriza banco-base com BankRule.agreement
    configurado como SIAPE.

    Para convênios diferentes de INSS, não utiliza
    coeficiente de outro convênio como fallback.
    """
    async def resolve(
        session: AsyncSession,
    ) -> float:
        coefficient = await _fetch_coefficient(
            session,
            convenio,
        )

        normalized_agreement = str(
            convenio or "INSS"
        ).strip().upper()

        if coefficient is not None:
            return float(coefficient)

        # O INSS mantém o fallback histórico.
        if normalized_agreement == "INSS":
            return DEFAULT_MARGIN_COEFFICIENT

        # SIAPE e demais convênios não podem utilizar
        # silenciosamente o coeficiente do INSS.
        return 0.0

    if db is not None:
        return await resolve(db)

    async with AsyncSessionLocal() as session:
        return await resolve(session)


async def calcular_valor_liberado_margem(
    margem_livre: float,
    db: AsyncSession = None,
    convenio: str = "INSS",
) -> float:
    if not margem_livre or margem_livre <= 0:
        return 0.0

    coefficient = await obter_coeficiente_fator(
        db,
        convenio=convenio,
    )

    if coefficient <= 0:
        return 0.0

    return round(
        float(margem_livre) / coefficient,
        2,
    )
