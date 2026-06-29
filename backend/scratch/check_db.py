import asyncio
from sqlalchemy.future import select
from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import SubAgreementLogo

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SubAgreementLogo))
        logos = result.scalars().all()
        print(f"Total sub logos: {len(logos)}")
        for l in logos:
            url_len = len(l.logo_url) if l.logo_url else 0
            print(f"ID: {l.id}, Name: {l.name}, Logo URL Len: {url_len}, StartsWith: {l.logo_url[:30] if l.logo_url else None}")

if __name__ == "__main__":
    asyncio.run(main())
