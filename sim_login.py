import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, select
from jose import jwt

DB_URL = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres?prepared_statement_cache_size=0"

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String)
    password_hash = Column(String)
    active = Column(Boolean)
    last_access = Column(DateTime(timezone=True))
    current_token = Column(Text)
    name = Column(String)
    role = Column(String)
    company_id = Column(Integer)
    brand_color = Column(String)
    sidebar_color = Column(String)
    sidebar_color_secondary = Column(String)
    highlight_color = Column(String)
    logo_url = Column(Text)
    avatar_url = Column(Text)
    seller_limit = Column(Integer)
    is_temporary_password = Column(Boolean)

async def run_login_simulation():
    engine = create_async_engine(DB_URL)
    AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with AsyncSessionLocal() as session:
            print("Executando SELECT...")
            result = await session.execute(select(User).where(User.email == 'alexlyra@gmail.com'))
            user = result.scalar_one_or_none()
            if not user:
                print("Usuário não encontrado")
                return
            
            print(f"Usuário encontrado: {user.name}, active: {user.active}")
            
            # Simulando auth_service.create_access_token
            token = "fake_token_123"
            
            print("Atualizando last_access...")
            user.last_access = datetime.now(timezone.utc)
            user.current_token = token
            
            print("Executando commit()...")
            await session.commit()
            print("Login simulado com sucesso!")
            
    except Exception as e:
        print(f"Erro simulado: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_login_simulation())
