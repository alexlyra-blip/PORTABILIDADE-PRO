import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import AsyncSessionLocal, engine
from app.models.sqlalchemy_models import User, Base
from app.services.auth_service import get_password_hash

async def reset_admin():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        # Check existing users
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Found {len(users)} users:")
        for u in users:
            print(f"  ID={u.id}, email={u.email}, role={u.role}")
        
        # Check if admin exists
        result = await db.execute(select(User).where(User.email == "admin@admin.com"))
        admin = result.scalar_one_or_none()
        
        if admin:
            # Reset password
            admin.password_hash = get_password_hash("admin123")
            print("\n✅ Admin password reset to 'admin123'")
        else:
            # Create admin user
            new_admin = User(
                name="Administrador",
                email="admin@admin.com",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            db.add(new_admin)
            print("\n✅ Admin user created: admin@admin.com / admin123")
        
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(reset_admin())
