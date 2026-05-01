import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        # BankTable columns
        existing_bt = await conn.execute(text("PRAGMA table_info(bank_tables)"))
        bt_cols = [row[1] for row in existing_bt.fetchall()]
        
        if "min_paid_installments" not in bt_cols:
            await conn.execute(text("ALTER TABLE bank_tables ADD COLUMN min_paid_installments INTEGER DEFAULT 0"))
        if "min_ticket" not in bt_cols:
            await conn.execute(text("ALTER TABLE bank_tables ADD COLUMN min_ticket NUMERIC(15, 2) DEFAULT 0"))
        if "min_rate" not in bt_cols:
            await conn.execute(text("ALTER TABLE bank_tables ADD COLUMN min_rate FLOAT"))

        # Simulation columns
        existing_sim = await conn.execute(text("PRAGMA table_info(simulations)"))
        sim_cols = [row[1] for row in existing_sim.fetchall()]
        
        new_sim_cols = [
            ("is_60_plus", "BOOLEAN DEFAULT 0"),
            ("agreement_rate", "FLOAT"),
            ("portability_rate_calculated", "FLOAT"),
            ("portability_adjustment", "FLOAT DEFAULT 0.0"),
            ("new_portability_rate", "FLOAT"),
            ("weighted_refin_rate", "FLOAT"),
            ("refin_adjustment", "FLOAT DEFAULT 0.0"),
            ("final_refin_rate", "FLOAT")
        ]
        
        for col_name, col_type in new_sim_cols:
            if col_name not in sim_cols:
                await conn.execute(text(f"ALTER TABLE simulations ADD COLUMN {col_name} {col_type}"))
                
        print("Migration completed successfully.")

if __name__ == "__main__":
    asyncio.run(migrate())
