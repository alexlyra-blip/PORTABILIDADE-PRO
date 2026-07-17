import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres?prepared_statement_cache_size=0"

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT pid, state, query, wait_event_type, wait_event FROM pg_stat_activity WHERE state != 'idle'"))
        rows = res.all()
        print(f"Active connections: {len(rows)}")
        for r in rows:
            print(r)
            
        print("Terminating idle in transaction...")
        await conn.execute(text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction'"))
        await conn.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
