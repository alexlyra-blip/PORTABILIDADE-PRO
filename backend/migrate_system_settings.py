import asyncio

from app.database import engine
from app.models.sqlalchemy_models import SystemSetting


async def migrate() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(
            SystemSetting.__table__.create,
            checkfirst=True,
        )

    await engine.dispose()

    print(
        "[MIGRATION] Tabela system_settings "
        "criada ou já existente."
    )


if __name__ == "__main__":
    asyncio.run(migrate())
