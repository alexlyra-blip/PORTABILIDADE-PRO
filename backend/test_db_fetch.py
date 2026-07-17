import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.sqlalchemy_models import BankTable
from sqlalchemy.future import select

DATABASE_URL = "sqlite+aiosqlite:///local_db.sqlite"
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def test():
    async with async_session() as session:
        res = await session.execute(select(BankTable))
        tables = res.scalars().all()
        print(f"Loaded {len(tables)} tables")
        if tables:
            print(tables[0].name, tables[0].max_ticket)

asyncio.run(test())
