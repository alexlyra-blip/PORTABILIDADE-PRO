import pytest
import asyncio
import json
import sys
import os
from datetime import datetime, timezone

# Ajustar PYTHONPATH
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

# Test constants
TEST_SENDER = "5599999999999@s.whatsapp.net"
TEST_CONCURRENT_SENDER = "5599988888888@s.whatsapp.net"
API_KEY_HEADER = {"x-api-key": "portabilidade_pro_secret_key_2024"}

@pytest.mark.asyncio
async def test_atendimento_protocol_flow():
    # 1. Setup - Create test database engine and session
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # 2. Seed a test User (broker) with the sender's phone
    async with async_session() as db:
        # Check if already exists
        stmt = select(User).where(User.phone == "5599999999999")
        res = await db.execute(stmt)
        user = res.scalars().first()
        if not user:
            user = User(
                name="Broker Teste",
                email="broker_teste@portabilidade.pro",
                phone="5599999999999",
                role="user",
                active=True,
                password_hash="test"
            )
            db.add(user)
        
        # Seed test user for concurrency tests too
        stmt2 = select(User).where(User.phone == "5599988888888")
        res2 = await db.execute(stmt2)
        user2 = res2.scalars().first()
        if not user2:
            user2 = User(
                name="Broker Teste Concorrente",
                email="broker_teste_conc@portabilidade.pro",
                phone="5599988888888",
                role="user",
                active=True,
                password_hash="test"
            )
            db.add(user2)
            
        await db.commit()

    # Clear memory sessions to start clean
    normalized_sender = normalize_sender(TEST_SENDER)
    normalized_concurrent_sender = normalize_sender(TEST_CONCURRENT_SENDER)
    if normalized_sender in CHAT_SESSIONS:
        del CHAT_SESSIONS[normalized_sender]
    if normalized_concurrent_sender in CHAT_SESSIONS:
        del CHAT_SESSIONS[normalized_concurrent_sender]

    # Clean previous chat logs for test senders
    async with async_session() as db:
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone.in_([normalized_sender, normalized_concurrent_sender])))
        await db.commit()

    # Use httpx AsyncClient to hit endpoints
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        
        # SCENARIO 1: Sender without active session (New Protocol)
        payload = {"sender": TEST_SENDER, "pushName": "Alexandre"}
        response = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["novo_atendimento"] is True
        assert "protocolo" in data
        assert data["sender"] == normalize_sender(TEST_SENDER)
        protocol_1 = data["protocolo"]
        
        # SCENARIO 2: Sender with active session (Reuse existing Protocol)
        response_active = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert response_active.status_code == 200
        data_active = response_active.json()
        assert data_active["success"] is True
        assert data_active["novo_atendimento"] is False
        assert data_active["protocolo"] == protocol_1
        
        # SCENARIO 3: Concurrent calls for the same sender
        # We will make 3 concurrent calls for TEST_CONCURRENT_SENDER
        concurrent_payload = {"sender": TEST_CONCURRENT_SENDER, "pushName": "Concorrente"}
        
        tasks = [
            client.post("/api/atendimento/garantir-protocolo", json=concurrent_payload, headers=API_KEY_HEADER)
            for _ in range(3)
        ]
        results = await asyncio.gather(*tasks)
        
        # Verify status codes and check that they all returned successfully
        assert all(r.status_code == 200 for r in results)
        
        # Map the results
        con_data_list = [r.json() for r in results]
        
        # Exactly one call should create the protocol (novo_atendimento: True)
        # while the others should reuse it (novo_atendimento: False)
        new_atendimentos = [c for c in con_data_list if c["novo_atendimento"] is True]
        reused_atendimentos = [c for c in con_data_list if c["novo_atendimento"] is False]
        
        assert len(new_atendimentos) == 1
        assert len(reused_atendimentos) == 2
        
        # All returned protocols must be exactly identical
        shared_protocol = con_data_list[0]["protocolo"]
        assert all(c["protocolo"] == shared_protocol for c in con_data_list)

        # SCENARIO 4: Protocol reused in the encerramento/checkout
        # Interact with the first sender (TEST_SENDER) and then finish it
        chat_payload = {"sender": TEST_SENDER, "message": "encerrar"}
        chat_res = await client.post("/api/external/chat", json=chat_payload, headers=API_KEY_HEADER)
        
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert "Atendimento encerrado com sucesso" in chat_data["reply"]
        assert protocol_1 in chat_data["reply"]
        
        # Verify status of log in database is finished
        async with async_session() as db:
            stmt = select(WhatsappChatLog).where(
                WhatsappChatLog.sender_phone == normalize_sender(TEST_SENDER),
                WhatsappChatLog.protocol == protocol_1
            )
            res = await db.execute(stmt)
            log = res.scalars().first()
            assert log is not None
            assert log.status == "finished"
            
        # If we query garantir-protocolo again for TEST_SENDER, it must create a NEW protocol
        response_new_after_finish = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert response_new_after_finish.status_code == 200
        data_new = response_new_after_finish.json()
        assert data_new["success"] is True
        assert data_new["novo_atendimento"] is True
        assert data_new["protocolo"] != protocol_1

    # Cleanup Database
    async with async_session() as db:
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone.in_([normalize_sender(TEST_SENDER), normalize_sender(TEST_CONCURRENT_SENDER)])))
        await db.execute(User.__table__.delete().where(User.phone.in_(["5599999999999", "5599988888888"])))
        await db.commit()
    
    print("\n✅ Todos os testes de protocolo e concorrência passaram com sucesso!")
