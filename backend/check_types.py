import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres?prepared_statement_cache_size=0"

async def check_types():
    engine = create_async_engine(DB_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'users';
        """))
        for row in result.fetchall():
            print(f"{row[0]}: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_types())
