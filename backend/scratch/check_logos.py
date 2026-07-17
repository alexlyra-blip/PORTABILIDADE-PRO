
import asyncio
from sqlalchemy.future import select
from app.database import SessionLocal
from app.models.sqlalchemy_models import SubAgreementLogo

async def check_logos():
    async with SessionLocal() as db:
        result = await db.execute(select(SubAgreementLogo))
        logos = result.scalars().all()
        print("\n--- LOGOS CADASTRADOS ---")
        for l in logos:
            print(f"ID: {l.id} | Nome: {l.name} | URL: {l.logo_url[:50]}...")
        print("-------------------------\n")

if __name__ == "__main__":
    asyncio.run(check_logos())
