import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import DailyMarginCoefficient, Bank

from sqlalchemy.ext.asyncio import AsyncSession

async def obter_coeficiente_fator(db: AsyncSession = None) -> float:
    """
    Busca o coeficiente diário de margem ativo baseado nas regras dos bancos prioritários.
    Retorna 0.02270 como fallback padrão.
    """
    coeficiente_fator = 0.02270  # default fallback

    from datetime import datetime, timezone
    if db is not None:
        hoje = datetime.now(timezone.utc)
        coef_query = await db.execute(
            select(DailyMarginCoefficient)
            .join(Bank, DailyMarginCoefficient.bank_id == Bank.id)
            .filter(Bank.is_margin_base == True)
            .filter(Bank.active == True)
            .filter(DailyMarginCoefficient.date <= hoje)
            .order_by(DailyMarginCoefficient.date.desc(), Bank.margin_base_priority.asc(), Bank.id.asc())
            .limit(1)
        )
        coef = coef_query.scalars().first()
        if coef and coef.coefficient > 0:
            coeficiente_fator = coef.coefficient
    else:
        async with AsyncSessionLocal() as session:
            hoje = datetime.now(timezone.utc)
            coef_query = await session.execute(
                select(DailyMarginCoefficient)
                .join(Bank, DailyMarginCoefficient.bank_id == Bank.id)
                .filter(Bank.is_margin_base == True)
                .filter(Bank.active == True)
                .filter(DailyMarginCoefficient.date <= hoje)
                .order_by(DailyMarginCoefficient.date.desc(), Bank.margin_base_priority.asc(), Bank.id.asc())
                .limit(1)
            )
            coef = coef_query.scalars().first()
            if coef and coef.coefficient > 0:
                coeficiente_fator = coef.coefficient

    return float(coeficiente_fator)

async def calcular_valor_liberado_margem(margem_livre: float, db: AsyncSession = None) -> float:
    """
    Calcula o valor aproximado liberado pela margem livre baseado no coeficiente
    dos bancos configurados como prioridade (is_margin_base = True) para o dia atual.
    """
    if not margem_livre or margem_livre <= 0:
        return 0.0

    coeficiente_fator = await obter_coeficiente_fator(db)
    return round(margem_livre / coeficiente_fator, 2)
