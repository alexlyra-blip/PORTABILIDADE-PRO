import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DB_URL = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

async def fix_remote_db():
    print("Conectando ao banco...")
    try:
        engine = create_async_engine(DB_URL, echo=True)
        async with engine.begin() as conn:
            # Get existing columns
            result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';"))
            columns = [row[0] for row in result]
            print(f"Colunas atuais em users: {columns}")
            
            alter_queries = [
                'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_access" TIMESTAMP WITH TIME ZONE;',
                'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_token" TEXT;',
                'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sidebar_color_secondary" VARCHAR(50);',
                'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "highlight_color" VARCHAR(7);',
                'ALTER TABLE "simulation_results" ADD COLUMN IF NOT EXISTS "term" INTEGER;',
                'ALTER TABLE "simulation_results" ADD COLUMN IF NOT EXISTS "installment" FLOAT;',
                'ALTER TABLE "bank_tables" ADD COLUMN IF NOT EXISTS "max_ticket" NUMERIC(15, 2);',
                'ALTER TABLE "bank_rules" ADD COLUMN IF NOT EXISTS "disability_max_age" INTEGER;',
                'ALTER TABLE "bank_rules" ADD COLUMN IF NOT EXISTS "disability_grace_age" INTEGER;',
                'ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "image_url" TEXT;'
            ]
            
            for q in alter_queries:
                try:
                    await conn.execute(text(q))
                    print(f"Sucesso: {q}")
                except Exception as e:
                    print(f"Erro em {q}: {e}")
                    
            print("Finalizado!")
    except Exception as e:
        print(f"Erro ao conectar: {e}")

if __name__ == "__main__":
    asyncio.run(fix_remote_db())
