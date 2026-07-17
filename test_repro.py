
import asyncio
import json
import sqlite3
import sys
import os

# Fix paths
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Import actual engine code
from engine.eligibility_engine import verificar_elegibilidade
from app.models.sqlalchemy_models import Bank, BankRule, BankTable
from app.models.models import SimulacaoInput

async def test_reproduction():
    database_url = 'sqlite+aiosqlite:///backend/local_db.sqlite'
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Load C6
        result = await db.execute(select(Bank).where(Bank.name.like('%C6%')).options(selectinload(Bank.rules)))
        c6 = result.scalars().first()
        
        if not c6:
           print("C6 not found")
           return

        # Case 1: Agibank exclusion in C6
        print(f"\n--- Testing C6 exclusion of Agibank ---")
        cliente_agibank = SimulacaoInput(
            banco="121 - AGIBANK",
            convenio="INSS",
            idade=65,
            parcela=500.0,
            saldo_devedor=15000.0,
            total_term=84,
            remaining_term=72
        )
        
        for r in c6.rules:
            if r.agreement == "INSS":
                # Ensure the exclude field is set correctly for testing if not already
                # actually we should use WHAT IS IN DB
                print(f"Checking Rule for {r.agreement}. Excluded: '{r.excluded_origin_banks}'")
                elegivel, motivo = verificar_elegibilidade(cliente_agibank, r)
                print(f"Result: {elegivel}, Motivo: {motivo}")

        # Case 2: Daycoval min installments (15)
        print(f"\n--- Testing C6 specific rule for Daycoval (15 installments) ---")
        cliente_daycoval = SimulacaoInput(
            banco="707 - DAYCOVAL",
            convenio="INSS",
            idade=65,
            parcela=500.0,
            saldo_devedor=15000.0,
            total_term=84,
            remaining_term=80 # 4 installments paid
        )
        
        for r in c6.rules:
            if r.agreement == "INSS":
                # Inject rule if missing for testing purposes
                if not r.origin_banks_min_paid:
                    r.origin_banks_min_paid = '{"DAYCOVAL": 15}'
                
                print(f"Rule Origin Banks: {r.origin_banks_min_paid}")
                elegivel, motivo = verificar_elegibilidade(cliente_daycoval, r)
                print(f"Result: {elegivel}, Motivo: {motivo}")

if __name__ == "__main__":
    asyncio.run(test_reproduction())
