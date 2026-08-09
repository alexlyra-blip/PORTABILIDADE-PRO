import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from db_env import get_database_url
DB_URL = get_database_url(async_driver=True)

async def check_columns():
    engine = create_async_engine(DB_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'users';
        """))
        columns = [row[0] for row in result.fetchall()]
        print("Columns in 'users' table:")
        print(columns)

if __name__ == "__main__":
    asyncio.run(check_columns())
