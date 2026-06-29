import asyncio
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import User
from sqlalchemy.future import select
from app.routers.deps import get_current_user

async def mock_user():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == 'alexlyra@gmail.com'))).scalar_one_or_none()
        return user

app.dependency_overrides[get_current_user] = mock_user

async def test_post():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "id": "CTR-123",
            "user_name": "Test",
            "user_role": "admin",
            "broker_id": None,
            "data_aceite": "10/10/2023",
            "data_hora": "10:10",
            "cliente": "Joao",
            "cpf": "123",
            "banco": "Banco",
            "convenio": "INSS",
            "parcela": 100.5,
            "tabela": "Padrão",
            "taxa": 1.5,
            "valor_contrato": 1000,
            "valor_troco": 200,
            "instituicao_origem": "Origem",
            "saldo_devedor": 800,
            "prazo_restante": 50,
            "orig_parcela": 100
        }
        res = await ac.post("/api/contracts/", json=payload)
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(test_post())
