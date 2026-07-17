import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.models.sqlalchemy_models import WhatsappChatLog, User

async def main():
    DATABASE_URL = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres?prepared_statement_cache_size=0"
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            query = select(WhatsappChatLog, User).outerjoin(User, WhatsappChatLog.user_id == User.id).order_by(WhatsappChatLog.created_at.desc())
            result = await db.execute(query)
            rows = result.all()
            print(f"Total logs: {len(rows)}")
            
            def safe_loads(msg_str):
                if not msg_str: return []
                try:
                    return json.loads(msg_str)
                except Exception as e:
                    return []
                    
            output = [
                {
                    "id": log.id,
                    "protocol": log.protocol,
                    "sender_phone": log.sender_phone,
                    "client_name": log.client_name,
                    "status": log.status,
                    "created_at": log.created_at,
                    "updated_at": log.updated_at,
                    "user_id": log.user_id,
                    "user_name": user.name if user else "Desconhecido",
                    "messages": safe_loads(log.messages)
                }
                for log, user in rows
            ]
            print("Successfully processed rows")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(main())
