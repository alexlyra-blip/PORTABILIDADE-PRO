import asyncio

from app.database import engine
from app.models.sqlalchemy_models import UserBankCredential


async def migrate():
    async with engine.begin() as connection:
        await connection.run_sync(
            UserBankCredential.__table__.create,
            checkfirst=True,
        )

    await engine.dispose()

    print("Tabela user_bank_credentials criada/verificada com sucesso.")


if __name__ == "__main__":
    asyncio.run(migrate())