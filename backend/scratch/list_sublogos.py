import asyncio
from sqlalchemy.future import select
from app.db.database import SessionLocal
from app.models.sqlalchemy_models import SubAgreementLogo

async def list_sublogos():
    async with SessionLocal() as db:
        res = await db.execute(select(SubAgreementLogo))
        logos = res.scalars().all()
        for l in logos:
            print(f"SubLogo: {l.name}")

if __name__ == "__main__":
    asyncio.run(list_sublogos())
