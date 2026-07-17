import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres?prepared_statement_cache_size=0"

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.connect() as conn:
        print("Terminating ALL other queries...")
        await conn.execute(text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid()"))
        await conn.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
