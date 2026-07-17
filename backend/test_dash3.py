
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
        
        # Populate global logos cache first
        print('Populating global cache...')
        start_time = time.time()
        await AdminService.get_dashboard_stats(db, user, days=30)
        print(f'Populate time: {time.time() - start_time:.2f}s')

        # Clear dashboard cache but KEEP global logos cache
        AdminService._dashboard_cache = {}
        AdminService._dashboard_locks = {}
        
        print('Dashboard cache cleared. First real call...')
        start_time = time.time()
        await AdminService.get_dashboard_stats(db, user, days=30)
        print(f'Query without logos time: {time.time() - start_time:.2f}s')

asyncio.run(check())

