import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.admin_service import AdminService
from app.schemas.simulacao_schema import BankTableResponse

DATABASE_URL = "sqlite+aiosqlite:///local_db.sqlite"
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def test():
    async with async_session() as session:
        try:
            tables = await AdminService.get_tables_by_bank(session, 1)
            print(f"Loaded {len(tables)} tables via AdminService")
            for t in tables:
                print(t.id, t.name, getattr(t, 'max_ticket', None))
                # Validate with Pydantic
                response = BankTableResponse.from_orm(t)
                print(f"Pydantic Validation OK: {response.name}")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(test())
