import asyncio
from sqlalchemy import text
from app.database import engine

async def verify():
    async with engine.connect() as conn:
        # Check BankTable
        result = await conn.execute(text("PRAGMA table_info(bank_tables)"))
        columns = [row[1] for row in result.fetchall()]
        print(f"BankTable columns: {columns}")
        
        # Check Simulation
        result = await conn.execute(text("PRAGMA table_info(simulations)"))
        columns = [row[1] for row in result.fetchall()]
        print(f"Simulation columns: {columns}")

if __name__ == "__main__":
    asyncio.run(verify())
