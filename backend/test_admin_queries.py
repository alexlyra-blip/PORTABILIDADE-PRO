import asyncio
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.services.admin_service import AdminService
from pydantic import BaseModel

class MockUser(BaseModel):
    id: int = 1
    role: str = "admin"
    company_id: int = None
    broker_id: int = None

async def test_admin():
    async with AsyncSessionLocal() as db:
        print("Testando get_dashboard_stats()...")
        try:
            stats = await AdminService.get_dashboard_stats(db, MockUser())
            print(f"Stats Keys: {stats.keys()}")
            print(f"Stats totals: {stats.get('totals')}")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_admin())
