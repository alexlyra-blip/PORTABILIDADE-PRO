import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.services.simulador_service import SimuladorService
from app.models.models import SimulacaoInput

async def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/portabilidade")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    input_data = SimulacaoInput(
        banco="SANTANDER",
        convenio="INSS",
        idade=56,
        parcela=133.00,
        saldo_devedor=5000.00,
        total_term=84,
        remaining_term=60,
        analfabeto=False,
        especie_beneficio="42",
        nome_cliente="Cliente WhatsApp"
    )
    
    async with async_session() as db:
        try:
            res = await SimuladorService.executar(input_data, db, user_id=1)
            print("SIMULATION SUCCESS")
            print("ofertas:", len(res.get("ofertas", [])))
            for o in res.get("ofertas", [])[:2]:
                print(o["banco"], o["valor_liberado"])
        except Exception as e:
            print("SIMULATION EXCEPTION")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
