import asyncio
from decimal import Decimal
from app.database import AsyncSessionLocal
from app.services.auth_service import get_password_hash
from app.models.sqlalchemy_models import User, Bank, BankRule, BankTable, Coefficient

async def seed():
    async with AsyncSessionLocal() as session:
        # Create a default Admin user with hashed password
        admin = User(
            name="Admin Teste",
            email="admin@teste.com",
            password_hash=get_password_hash("admin123"),
            role="admin"
        )
        session.add(admin)

        # Banks
        c6 = Bank(name="C6 Bank", active=True)
        bmg = Bank(name="BMG", active=True)
        facta = Bank(name="Facta", active=True)
        
        session.add_all([c6, bmg, facta])
        await session.flush() # Get IDs

        # Rules
        rules = [
            BankRule(
                bank_id=c6.id, 
                min_age=18, 
                max_age=75, 
                max_term=84, 
                allowed_benefit_types="INSS,SIAPE",
                min_release_amount=Decimal("500.00")
            ),
            BankRule(
                bank_id=bmg.id, 
                min_age=18, 
                max_age=80, 
                max_term=84, 
                allowed_benefit_types="INSS",
                min_release_amount=Decimal("300.00")
            ),
            BankRule(
                bank_id=facta.id, 
                min_age=18, 
                max_age=70, 
                max_term=84, 
                allowed_benefit_types="INSS,SIAPE,Governo",
                min_release_amount=Decimal("1000.00")
            ),
        ]
        session.add_all(rules)

        # Tables
        t_c6_normal = BankTable(bank_id=c6.id, name="Normal", active=True)
        t_c6_flex1 = BankTable(bank_id=c6.id, name="Flex1", active=True)
        t_bmg_normal = BankTable(bank_id=bmg.id, name="Normal", active=True)
        t_bmg_flex2 = BankTable(bank_id=bmg.id, name="Flex2", active=True)
        t_facta_normal = BankTable(bank_id=facta.id, name="Normal", active=True)

        session.add_all([t_c6_normal, t_c6_flex1, t_bmg_normal, t_bmg_flex2, t_facta_normal])
        await session.flush()

        # Coefficients
        coeffs = [
            # C6
            Coefficient(bank_id=c6.id, table_id=t_c6_normal.id, term=84, interest_rate=1.60, coefficient=Decimal("0.02324")),
            Coefficient(bank_id=c6.id, table_id=t_c6_flex1.id, term=84, interest_rate=1.55, coefficient=Decimal("0.02280")),
            # BMG
            Coefficient(bank_id=bmg.id, table_id=t_bmg_normal.id, term=84, interest_rate=1.65, coefficient=Decimal("0.02450")),
            Coefficient(bank_id=bmg.id, table_id=t_bmg_flex2.id, term=84, interest_rate=1.58, coefficient=Decimal("0.02350")),
            # Facta
            Coefficient(bank_id=facta.id, table_id=t_facta_normal.id, term=84, interest_rate=1.70, coefficient=Decimal("0.02500")),
        ]
        session.add_all(coeffs)

        await session.commit()
        print("Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
