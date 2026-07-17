
import asyncio
import sys
sys.path.append('.')
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text('SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN (''simulations'', ''simulation_results'')'))
        for row in res.fetchall():
            print(row)

asyncio.run(check())

