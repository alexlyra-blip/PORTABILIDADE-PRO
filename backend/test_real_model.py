import sys
import os
from db_env import get_database_url
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.sqlalchemy_models import User

DB_URL = get_database_url(async_driver=True)

async def run_query():
    engine = create_async_engine(DB_URL)
    AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with AsyncSessionLocal() as session:
            print("Executando SELECT com o User model real...")
            result = await session.execute(select(User).where(User.email == 'alexlyra@gmail.com'))
            user = result.scalar_one_or_none()
            if not user:
                print("Usuário não encontrado")
                return
            
            print(f"Usuário encontrado: {user.name}, active: {user.active}")
            print(f"Company ID: {user.company_id}, Role: {user.role}")
            print(f"Simulations relation: {user.simulations}") # Accessing a relationship might trigger a lazy load error if async
            print("Query finalizada com sucesso!")
            
    except Exception as e:
        print(f"Erro simulado: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_query())
