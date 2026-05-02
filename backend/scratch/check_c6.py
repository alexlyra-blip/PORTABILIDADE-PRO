
import asyncio
import sys
import os
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Adicionar o diretório do backend ao path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.database import SessionLocal
from app.models.sqlalchemy_models import Bank, BankRule, BankTable

async def check_c6():
    async with SessionLocal() as db:
        print("Buscando regras do C6...")
        # C6 is ID 626 or named 'C6'
        res = await db.execute(
            select(Bank)
            .where(Bank.name.ilike('%C6%'))
            .options(selectinload(Bank.rules), selectinload(Bank.tables))
        )
        banks = res.scalars().all()
        
        for b in banks:
            print(f"\nBANCO: {b.name} (ID: {b.id})")
            print("--- REGRAS ---")
            for r in b.rules:
                print(f"Agreement: {r.agreement}, Threshold: {r.portability_rate_threshold}, Min Paid: {r.min_paid_installments}")
                print(f"Allowed: {r.allowed_benefit_types}, Excluded: {r.excluded_benefit_types}")
            
            print("--- TABELAS ---")
            for t in b.tables:
                if t.active:
                    print(f"Table: {t.name} (ID: {t.id}) - Adj Port: {t.portability_adjustment}, Min Port Rate: {t.min_port_rate}, Taxa Conv: {t.taxa_convenio}")

if __name__ == "__main__":
    asyncio.run(check_c6())
