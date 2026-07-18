import os
import re

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base


# ============================================================
# CONFIGURAÇÃO DA URL DO BANCO
# ============================================================

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("DATABASE_URI")
)

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL não está configurada. "
        "Cadastre a variável no backend do EasyPanel."
    )

# Impede que o backend utilize acidentalmente o banco local antigo.
if "simulador_banco-simulador" in DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL está apontando para o banco local antigo."
    )

# Garante o uso do driver assíncrono asyncpg.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+asyncpg://",
        1,
    )
elif (
    DATABASE_URL.startswith("postgresql://")
    and "+asyncpg" not in DATABASE_URL
):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+asyncpg://",
        1,
    )

# O parâmetro sslmode não é aceito diretamente pelo asyncpg.
DATABASE_URL = re.sub(
    r"([?&])sslmode=[^&]*&?",
    lambda match: "?" if match.group(1) == "?" else "",
    DATABASE_URL,
)

DATABASE_URL = DATABASE_URL.rstrip("?&")

parsed_url = make_url(DATABASE_URL)

host = parsed_url.host or ""
port = parsed_url.port

is_supabase_pooler = (
    "pooler.supabase.com" in host
)

is_transaction_mode = (
    is_supabase_pooler
    and port == 6543
)


# ============================================================
# TRANSACTION MODE — PORTA 6543
# ============================================================

if is_transaction_mode:
    query = dict(parsed_url.query)

    query["prepared_statement_cache_size"] = "0"

    parsed_url = parsed_url.set(
        query=query
    )

    DATABASE_URL = parsed_url.render_as_string(
        hide_password=False
    )


# ============================================================
# ENGINE SQLALCHEMY
# ============================================================

engine_options = {
    "echo": False,

    # Pool pequeno e controlado para o container permanente do EasyPanel.
    # Máximo possível: 5 conexões fixas + 2 temporárias = 7.
    "pool_size": 5,
    "max_overflow": 2,
    "pool_timeout": 30,

    # Recicla conexões antigas sem reabrir uma conexão a cada consulta.
    "pool_recycle": 1800,
    "pool_pre_ping": True,
    "pool_use_lifo": True,

    "connect_args": {
        # Necessário para o Transaction Pooler do Supabase.
        "statement_cache_size": 0,
    },
}

if is_transaction_mode:
    print(
        "[DATABASE] Supabase Transaction Mode detectado "
        "(porta 6543 / pool local 5 + 2)."
    )
else:
    print(
        "[DATABASE] Session Mode detectado "
        "(pool local 5 + 2)."
    )

engine = create_async_engine(
    DATABASE_URL,
    **engine_options,
)


# ============================================================
# SESSÕES
# ============================================================

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
