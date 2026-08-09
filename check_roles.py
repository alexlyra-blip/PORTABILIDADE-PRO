import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from backend.db_env import get_database_url
DB_URL = get_database_url(async_driver=True)

async def check_roles():
    engine = create_async_engine(DB_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT email, role, company_id FROM users WHERE email IN ('admin@teste.com', 'alexlyra@gmail.com');"))
        rows = result.fetchall()
        for row in rows:
            print(f"User: {row[0]}, Role: {row[1]}, Company: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_roles())
