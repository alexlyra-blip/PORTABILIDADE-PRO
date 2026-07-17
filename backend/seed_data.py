import asyncio
from decimal import Decimal
from app.database import AsyncSessionLocal
from app.services.auth_service import get_password_hash
from app.models.sqlalchemy_models import User, Bank, BankRule, BankTable, Coefficient

async def seed():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        
        # 1. Admin User
        res = await session.execute(select(User).where(User.email == "alexlyra@gmail.com"))
        if not res.scalar():
            admin = User(
                name="Alexandre Lyra",
                email="alexlyra@gmail.com",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin)
            print("Alexandre admin user created.")

        res = await session.execute(select(User).where(User.email == "admin@teste.com"))
        if not res.scalar():
            admin2 = User(
                name="Admin Teste",
                email="admin@teste.com",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin2)
            print("Admin user created.")

        # 2. Banks
        bank_names = []
        for b_name in bank_names:
            res = await session.execute(select(Bank).where(Bank.name == b_name))
            if not res.scalar():
                session.add(Bank(name=b_name, active=True))
                print(f"Bank {b_name} created.")
        
        await session.commit()
        
        # Re-fetch banks to get IDs
        res = await session.execute(select(Bank))
        banks_db = {b.name: b for b in res.scalars().all()}

        # 3. Rules & Tables (Example for one bank to keep it clean)
        for b_name in bank_names:
            bank = banks_db.get(b_name)
            if not bank: continue

            # Check if rule exists
            res = await session.execute(select(BankRule).where(BankRule.bank_id == bank.id))
            if not res.scalar():
                rule = BankRule(
                    bank_id=bank.id, 
                    min_age=18, 
                    max_age=80, 
                    max_term=84, 
                    allowed_benefit_types="INSS",
                    min_release_amount=Decimal("300.00")
                )
                session.add(rule)
                print(f"Default rule created for {b_name}.")

            # Check if tables exist
            res = await session.execute(select(BankTable).where(BankTable.bank_id == bank.id, BankTable.name == "Normal"))
            if not res.scalar():
                table = BankTable(bank_id=bank.id, name="Normal", active=True)
                session.add(table)
                print(f"Default table 'Normal' created for {b_name}.")

        await session.commit()
        print("Database verification/seeding completed safely.")

if __name__ == "__main__":
    asyncio.run(seed())
