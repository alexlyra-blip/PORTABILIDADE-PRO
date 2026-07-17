import asyncio
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from sqlalchemy.future import select
from app.models.sqlalchemy_models import Contract

async def test_contracts():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Contract))
        contracts = result.scalars().all()
        print(f"Total de contratos no banco: {len(contracts)}")
        if contracts:
            print(f"Exemplo: {contracts[0].id} | User: {contracts[0].user_id} | Cliente: {contracts[0].cliente}")

if __name__ == "__main__":
    asyncio.run(test_contracts())
