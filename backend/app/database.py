from sqlalchemy.engine import make_url # Optional, if needed later
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

if not DATABASE_URL:
    # Se estivermos rodando no Easypanel (geralmente define PORT ou NODE_ENV)
    if os.getenv("PORT") or os.getenv("NODE_ENV") == "production":
        print("❌ ERRO FATAL: DATABASE_URL não configurada no Easypanel!")
        print("❌ O sistema não pode iniciar sem um banco de dados persistente.")
        # Forçamos um erro de conexão claro para o Log
        DATABASE_URL = "postgresql+asyncpg://ERRO_CONFIGURACAO@localhost/VERIFIQUE_DATABASE_URL"
    else:
        DATABASE_URL = "sqlite+aiosqlite:///./local_db.sqlite"
else:
    # Garante que URLs (Supabase ou Postgres interno) usem o driver asyncpg
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Remove qualquer sslmode (disable, require, prefer) pois asyncpg não aceita via SQLAlchemy
    import re
    DATABASE_URL = re.sub(r'[\?&]sslmode=[^&]+', '', DATABASE_URL)
    
    # Se depois da remoção a URL terminar com '?', remove o '?'
    if DATABASE_URL.endswith('?'):
        DATABASE_URL = DATABASE_URL[:-1]
        
    # SUPABASE POOLER FIX: asyncpg + PgBouncer (Transaction Mode) requer prepared_statement_cache_size=0
    if "pooler.supabase.com" in DATABASE_URL or ("supabase" in DATABASE_URL and "6543" in DATABASE_URL):
        if "prepared_statement_cache_size=0" not in DATABASE_URL:
            separator = "&" if "?" in DATABASE_URL else "?"
            DATABASE_URL += f"{separator}prepared_statement_cache_size=0"
    
    print(f"🚀 Conectando ao Banco de Dados: {DATABASE_URL.split('@')[-1]}")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
