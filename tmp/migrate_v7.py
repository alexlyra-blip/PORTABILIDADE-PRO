import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        # BankTable columns for Phase 7
        existing_bt = await conn.execute(text("PRAGMA table_info(bank_tables)"))
        bt_cols = [row[1] for row in existing_bt.fetchall()]
        
        new_bt_cols = [
            ("agreement", "VARCHAR(50)"),
            ("taxa_convenio", "FLOAT DEFAULT 0.0"),
            ("portability_adjustment", "FLOAT DEFAULT 0.0"),
            ("refin_adjustment", "FLOAT DEFAULT 0.0")
        ]
        
        for col_name, col_type in new_bt_cols:
            if col_name not in bt_cols:
                await conn.execute(text(f"ALTER TABLE bank_tables ADD COLUMN {col_name} {col_type}"))
                print(f"Added column {col_name} to bank_tables")
                
        print("Migration Phase 7 completed.")

if __name__ == "__main__":
    asyncio.run(migrate())
