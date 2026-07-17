import pytest
import asyncio
import json
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import httpx
from httpx import ASGITransport

from app.database import get_db, DATABASE_URL
from app.models.sqlalchemy_models import User, WhatsappChatLog
from app.main import app
from app.routers.chat import CHAT_SESSIONS, normalize_sender

TEST_PHONE = "558191283133"
API_KEY_HEADER = {"x-api-key": "portabilidade_pro_secret_key_2024"}

@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"

async def clear_session_and_db(async_session, sender_norm):
    if sender_norm in CHAT_SESSIONS:
        del CHAT_SESSIONS[sender_norm]
    async with async_session() as db:
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone == sender_norm))
        await db.commit()

@pytest.mark.anyio
async def test_convenio_all_scenarios():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    sender_norm = normalize_sender(TEST_PHONE)

    # Ensure user exists
    async with async_session() as db:
        stmt = select(User).where(User.phone == TEST_PHONE)
        res = await db.execute(stmt)
        user = res.scalars().first()
        if not user:
            user = User(
                name="Alexandre Lyra",
                email="alexandre_test@portabilidade.pro",
                phone=TEST_PHONE,
                role="user",
                active=True,
                password_hash="testpass"
            )
            db.add(user)
            await db.commit()

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        
        # Scenario 1: usuário envia 1 e recebe pergunta do convênio uma única vez
        await clear_session_and_db(async_session, sender_norm)
        payload = {"sender": TEST_PHONE, "message": "1"}
        response = await client.post("/api/external/chat", json=payload, headers=API_KEY_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert "Iniciando Simulação de Portabilidade" in data["reply"]
        assert "Convênio" in data["reply"]
        # Certifica que o estado virou aguardando_convenio
        assert CHAT_SESSIONS[sender_norm]["state"] == "aguardando_convenio"

        # Scenario 2: usuário responde INSS (letras maiúsculas) e avança de etapa (pede banco de origem)
        payload = {"sender": TEST_PHONE, "message": "INSS"}
        response = await client.post("/api/external/chat", json=payload, headers=API_KEY_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert "Convênio INSS selecionado" in data["reply"]
        assert "Banco de Origem" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "INSS"
        assert CHAT_SESSIONS[sender_norm]["state"] == "waiting_data_collection"

        # Scenario 3: pergunta de convênio não é repetida
        assert "Iniciando Simulação de Portabilidade" not in data["reply"]

        # Scenario 4: "inss" em letras minúsculas funciona
        await clear_session_and_db(async_session, sender_norm)
        # Inicia
        await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        # Responde "inss"
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "inss"}, headers=API_KEY_HEADER)
        data = response.json()
        assert "Convênio INSS selecionado" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "INSS"

        # Scenario 5: "convênio inss" funciona
        await clear_session_and_db(async_session, sender_norm)
        await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "convênio inss"}, headers=API_KEY_HEADER)
        data = response.json()
        assert "Convênio INSS selecionado" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "INSS"

        # Scenario 6: resposta por número funciona
        await clear_session_and_db(async_session, sender_norm)
        await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        data = response.json()
        assert "Convênio INSS selecionado" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "INSS"

        # Scenario 7: SIAPE avança corretamente
        await clear_session_and_db(async_session, sender_norm)
        await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "SIAPE"}, headers=API_KEY_HEADER)
        data = response.json()
        assert "Convênio SIAPE selecionado" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "SIAPE"

        # Scenario 8: GOVERNO avança corretamente
        await clear_session_and_db(async_session, sender_norm)
        await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "GOVERNO"}, headers=API_KEY_HEADER)
        data = response.json()
        assert "Convênio GOVERNO selecionado" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "GOVERNO"

        # Scenario 9: FORÇAS ARMADAS avança corretamente
        await clear_session_and_db(async_session, sender_norm)
        await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "FORÇAS ARMADAS"}, headers=API_KEY_HEADER)
        data = response.json()
        assert "Convênio FORÇAS ARMADAS selecionado" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "FORÇAS ARMADAS"

        # Scenario 10: CLT PRIVADO avança corretamente
        await clear_session_and_db(async_session, sender_norm)
        await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "1"}, headers=API_KEY_HEADER)
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "CLT PRIVADO"}, headers=API_KEY_HEADER)
        data = response.json()
        assert "Convênio CLT PRIVADO selecionado" in data["reply"]
        assert CHAT_SESSIONS[sender_norm]["convenio"] == "CLT PRIVADO"

        # Scenario 11: um único texto de resposta por mensagem (verificado pelos asserts anteriores onde o status_code é 200 e recebemos um único reply JSON)
        assert isinstance(data["reply"], str)

        # Scenario 12: estado atualizado para a próxima etapa (waiting_data_collection)
        assert CHAT_SESSIONS[sender_norm]["state"] == "waiting_data_collection"

        # Scenario 13: fluxo direto por CPF continua funcionando
        await clear_session_and_db(async_session, sender_norm)
        # Envia CPF válido diretamente (ex: 11 dígitos)
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "00793747198"}, headers=API_KEY_HEADER)
        assert response.status_code == 200
        # Deverá processar simulação direto por CPF (ex: retornar que não há ofertas ou ofertas encontradas)
        assert "Consultando CPF" in response.json()["reply"] or "Não localizei" in response.json()["reply"] or "CPF" in response.json()["reply"]

        # Scenario 14: simulação ativa e comandos de tabelas/bancos continuam funcionando
        # Define estado simulado com banco ativo
        await clear_session_and_db(async_session, sender_norm)
        CHAT_SESSIONS[sender_norm] = {
            "state": "waiting_additional_questions",
            "protocol": "PROT123",
            "convenio": "INSS",
            "ultima_simulacao": {
                "banco_origem": "C6",
                "parcela": 150.00,
                "saldo_devedor": 5000.00
            },
            "messages": [],
            "user_id": user.id,
            "client_name": "Alexandre"
        }
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "tabelas"}, headers=API_KEY_HEADER)
        assert response.status_code == 200
        # Deve retornar tabelas interceptadas
        assert "C6" in response.json()["reply"] or "Tabela" in response.json()["reply"] or "ofertas" in response.json()["reply"]

        # Scenario 15: encerramento continua tendo prioridade
        response = await client.post("/api/external/chat", json={"sender": TEST_PHONE, "message": "encerrar"}, headers=API_KEY_HEADER)
        assert response.status_code == 200
        assert "Atendimento encerrado com sucesso" in response.json()["reply"]
        assert sender_norm not in CHAT_SESSIONS
