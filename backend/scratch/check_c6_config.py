
import asyncio
from sqlalchemy.future import select
from app.database import SessionLocal
from app.models.sqlalchemy_models import Bank, BankTable

async def check_c6():
    async with SessionLocal() as db:
        result = await db.execute(select(Bank).where(Bank.name.like('%C6%')))
        bank = result.scalar_one_or_none()
        if bank:
            print(f"Banco: {bank.name} (ID: {bank.id})")
            tables_res = await db.execute(select(BankTable).where(BankTable.bank_id == bank.id))
            tables = tables_res.scalars().all()
            for t in tables:
                print(f"Tabela: {t.name} | Rate: {t.taxa_convenio}% | Port Adj: {t.portability_adjustment} | Refin Adj: {t.refin_adjustment}")

if __name__ == "__main__":
    asyncio.run(check_c6())
