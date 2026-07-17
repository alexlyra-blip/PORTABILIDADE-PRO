import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.routers.admin import get_whatsapp_logs

async def main():
    engine = create_async_engine('sqlite+aiosqlite:///./test.db')
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            logs = await get_whatsapp_logs(db=db)
            print("SUCCESS")
            print(f"Total logs: {len(logs)}")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(main())
