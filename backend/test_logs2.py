import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.models.sqlalchemy_models import WhatsappChatLog, User

from db_env import get_database_url
async def main():
    DATABASE_URL = get_database_url(async_driver=True)
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            query = select(WhatsappChatLog).order_by(WhatsappChatLog.created_at.desc()).limit(1)
            result = await db.execute(query)
            log = result.scalars().first()
            
            print(f"\\n\\nRAW MESSAGES:\\n{log.messages}\\n")
                    
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(main())
