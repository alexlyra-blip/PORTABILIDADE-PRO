import asyncio
from sqlalchemy.future import select
from app.db.database import SessionLocal
from app.models.sqlalchemy_models import PromotoraRule, User

async def check_rules():
    async with SessionLocal() as db:
        # Find J2 Promotora
        res = await db.execute(select(User).where(User.name.ilike('%J2 Promotora%')))
        user = res.scalar_one_or_none()
        if not user:
            print("User J2 Promotora not found")
            return
        
        print(f"User ID: {user.id}, Role: {user.role}")
        
        res = await db.execute(select(PromotoraRule).where(PromotoraRule.promotora_id == user.id))
        rules = res.scalars().all()
        for r in rules:
            print(f"Rule Key: {r.rule_key}, Value: {r.rule_value}")

if __name__ == "__main__":
    asyncio.run(check_rules())
