import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres?prepared_statement_cache_size=0"

async def check_data():
    engine = create_async_engine(DB_URL)
    async with engine.begin() as conn:
        users = await conn.execute(text("SELECT COUNT(*) FROM users;"))
        banks = await conn.execute(text("SELECT COUNT(*) FROM banks;"))
        simulations = await conn.execute(text("SELECT COUNT(*) FROM simulation_results;"))
        print(f"Users: {users.scalar()}, Banks: {banks.scalar()}, Simulations: {simulations.scalar()}")
        
        users_list = await conn.execute(text("SELECT email FROM users LIMIT 10;"))
        print(f"Emails: {[row[0] for row in users_list.fetchall()]}")

if __name__ == "__main__":
    asyncio.run(check_data())
