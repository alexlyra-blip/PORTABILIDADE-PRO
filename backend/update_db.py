import asyncio
import os
import time
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def fix_db():
    print("Starting robust database column fix...")
    
    # Retry logic
    engine = None
    for i in range(5):
        try:
            engine = create_async_engine(DATABASE_URL)
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            print("Connected to database successfully.")
            break
        except Exception as e:
            print(f"Connection attempt {i+1} failed: {e}")
            if i < 4:
                time.sleep(5)
            else:
                print("Could not connect to database after 5 attempts.")
                return

    async with engine.connect() as conn:
        tables_columns = [
            ("users", "avatar_url"),
            ("users", "logo_url"),
            ("banks", "logo_url")
        ]
        
        for table, column in tables_columns:
            try:
                # Force update column type to TEXT
                await conn.execute(text(f'ALTER TABLE "{table}" ALTER COLUMN "{column}" TYPE TEXT'))
                await conn.commit()
                print(f"DATABASE FIX SUCCESS: {table}.{column} is now TEXT.")
            except Exception as e:
                print(f"DATABASE FIX INFO ({table}.{column}): {e} (Might already be TEXT)")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_db())
