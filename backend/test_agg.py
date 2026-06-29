import asyncio
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import Simulation, SimulationResult, Bank, User

async def test_agg():
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    async with AsyncSessionLocal() as db:
        print("Testando agregação de simulações...")
        res_query = select(SimulationResult).join(Simulation).where(Simulation.created_at >= thirty_days_ago)
        
        subq = res_query.subquery()
        bank_stats_q = select(
            subq.c.bank_id,
            func.count(subq.c.id),
            func.sum(subq.c.release_amount)
        ).select_from(subq).group_by(subq.c.bank_id)
        
        try:
            b_stats = await db.execute(bank_stats_q)
            for bid, count, vol in b_stats:
                print(f"Bank ID {bid}: Count {count}, Vol {vol}")
            print("Sucesso!")
        except Exception as e:
            print(f"Erro: {e}")

if __name__ == "__main__":
    asyncio.run(test_agg())
