import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.models.sqlalchemy_models import WhatsappChatLog
import os

DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def main():
    async with async_session() as db:
        query = select(WhatsappChatLog).options(joinedload(WhatsappChatLog.user)).order_by(WhatsappChatLog.created_at.desc())
        result = await db.execute(query)
        logs = result.scalars().all()
        for log in logs:
            print(log.user.name if log.user else "Desconhecido")

asyncio.run(main())
