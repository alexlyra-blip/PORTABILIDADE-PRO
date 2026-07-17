
import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def migrate():
    print("Iniciando migração do banco de dados...")
    async with SessionLocal() as db:
        try:
            # Adicionar a coluna disable_weighted_rate_validation se não existir
            await db.execute(text("ALTER TABLE bank_rules ADD COLUMN IF NOT EXISTS disable_weighted_rate_validation BOOLEAN DEFAULT FALSE"))
            await db.commit()
            print("Coluna 'disable_weighted_rate_validation' adicionada com sucesso!")
        except Exception as e:
            print(f"Erro ao adicionar coluna: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(migrate())
