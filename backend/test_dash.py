
import asyncio
import sys
import time
sys.path.append('.')
from app.database import AsyncSessionLocal
from app.services.admin_service import AdminService
from app.models.sqlalchemy_models import User
import inspect

async def check():
    async with AsyncSessionLocal() as db:
        user = User(id=1, role='admin')
        
        # We will monkey patch db.execute
        original_execute = db.execute
        
        async def logged_execute(query, *args, **kwargs):
            start = time.time()
            res = await original_execute(query, *args, **kwargs)
            duration = time.time() - start
            if duration > 0.1:
                q_str = str(query).replace('\n', ' ')[:100]
                print(f'Query took {duration:.3f}s: {q_str}')
            return res
            
        db.execute = logged_execute
        
        print('Starting dashboard profiling...')
        start_time = time.time()
        res = await AdminService.get_dashboard_stats(db, user, days=30)
        print(f'Total time: {time.time() - start_time:.2f}s')

asyncio.run(check())

