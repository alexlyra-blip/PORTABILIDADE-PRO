
import asyncio
import sys
import time
sys.path.append('.')
from app.database import AsyncSessionLocal
from app.services.admin_service import AdminService
from app.models.sqlalchemy_models import User

async def check():
    async with AsyncSessionLocal() as db:
        user = User(id=1, role='admin')
        print('First call...')
        start_time = time.time()
        await AdminService.get_dashboard_stats(db, user, days=30)
        print(f'Total time 1: {time.time() - start_time:.2f}s')

        print('Second call (should hit cache)...')
        start_time = time.time()
        await AdminService.get_dashboard_stats(db, user, days=30)
        print(f'Total time 2: {time.time() - start_time:.4f}s')

asyncio.run(check())

