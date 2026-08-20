"""Adiciona regras de usuário demonstrativo e vencimento de acesso.

Execute uma vez no backend com DATABASE_URL configurada:
    python migrate_user_access_expiration.py
"""
import os
import sqlite3

import psycopg2


COLUMNS = (
    ("is_demo_user", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("allow_concurrent_sessions", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("subscription_expires_at", "TIMESTAMP WITH TIME ZONE"),
    ("subscription_auto_renew", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("subscription_last_renewed_at", "TIMESTAMP WITH TIME ZONE"),
    ("subscription_last_renewed_by_user_id", "INTEGER"),
    ("created_by_user_id", "INTEGER"),
)


def postgres_url():
    value = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")
    if not value:
        raise RuntimeError("Configure DATABASE_URL antes de executar a migração.")
    return value.replace("postgresql+asyncpg://", "postgresql://", 1)


def migrate_postgres():
    connection = psycopg2.connect(postgres_url(), connect_timeout=20)
    connection.autocommit = True
    try:
        with connection.cursor() as cursor:
            for name, definition in COLUMNS:
                cursor.execute(f'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "{name}" {definition}')
        print("[OK] Colunas de acesso adicionadas ao PostgreSQL.")
    finally:
        connection.close()


def migrate_sqlite(path="local_db.sqlite"):
    if not os.path.exists(path):
        return
    connection = sqlite3.connect(path)
    try:
        existing = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
        sqlite_types = {
            "BOOLEAN NOT NULL DEFAULT FALSE": "BOOLEAN NOT NULL DEFAULT 0",
            "TIMESTAMP WITH TIME ZONE": "TIMESTAMP",
            "INTEGER": "INTEGER",
        }
        for name, definition in COLUMNS:
            if name not in existing:
                connection.execute(f'ALTER TABLE users ADD COLUMN "{name}" {sqlite_types[definition]}')
        connection.commit()
        print("[OK] Colunas de acesso adicionadas ao SQLite local.")
    finally:
        connection.close()


if __name__ == "__main__":
    migrate_sqlite()
    migrate_postgres()
