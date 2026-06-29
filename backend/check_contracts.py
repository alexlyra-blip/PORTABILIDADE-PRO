import asyncio
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

async def check_table():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contracts');"))
        exists = res.scalar()
        print(f"Tabela contracts existe: {exists}")
    
    if exists:
        # Check if there are any errors inserting a dummy contract
        async with engine.begin() as conn:
            try:
                await conn.execute(text("INSERT INTO contracts (id, cliente) VALUES ('test-1', 'Teste')"))
                print("Insert dummy OK!")
                await conn.execute(text("DELETE FROM contracts WHERE id = 'test-1'"))
            except Exception as e:
                print(f"Erro no insert: {e}")

if __name__ == "__main__":
    asyncio.run(check_table())
