import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL)

async def fix_db():
    print("Starting database column fix...")
    async with engine.connect() as conn:
        tables_columns = [
            ("users", "avatar_url"),
            ("users", "logo_url"),
            ("banks", "logo_url")
        ]
        
        for table, column in tables_columns:
            try:
                await conn.execute(text(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE TEXT"))
                await conn.commit()
                print(f"DATABASE FIX: Column {column} in table {table} updated to TEXT.")
            except Exception as e:
                print(f"DATABASE FIX ERROR ({table}.{column}): {e}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_db())
