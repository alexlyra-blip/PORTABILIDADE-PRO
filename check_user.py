import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from backend.db_env import get_database_url
DB_URL = get_database_url(async_driver=True)

async def check_user():
    engine = create_async_engine(DB_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT email, password_hash FROM users WHERE email = 'admin@teste.com';"))
        rows = result.fetchall()
        print("Users found:", rows)

if __name__ == "__main__":
    asyncio.run(check_user())
