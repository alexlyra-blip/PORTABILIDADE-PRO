import asyncio
from app.database import engine, Base
from app.models.sqlalchemy_models import User, Bank, BankRule, BankTable, Coefficient, Simulation, SimulationResult

async def init_models():
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all) # Optional: drop if exists
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    asyncio.run(init_models())
    print("Database tables created successfully!")
