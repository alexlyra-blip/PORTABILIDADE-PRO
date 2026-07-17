import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import SubAgreementLogo

async def main():
    async with AsyncSessionLocal() as session:
        for i in [29, 31, 36, 38]:
            result = await session.execute(select(SubAgreementLogo).where(SubAgreementLogo.id == i))
            logo = result.scalar()
            if logo:
                print(f"ID {i}: {logo.name} - Chars: {[ord(c) for c in logo.name]}")

if __name__ == "__main__":
    asyncio.run(main())
