import pytest
import asyncio
import json
import os
import sys
from datetime import datetime, timezone, timedelta

# Adjust PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import httpx
from httpx import ASGITransport
from unittest.mock import patch, AsyncMock

from app.database import get_db, DATABASE_URL, AsyncSessionLocal
from app.models.sqlalchemy_models import User, WhatsappChatLog
from app.main import app
from app.routers.chat import CHAT_SESSIONS, close_inactive_sessions

TEST_SENDER = "5599977777777@s.whatsapp.net"
API_KEY_HEADER = {"x-api-key": "portabilidade_pro_secret_key_2024"}

@pytest.mark.asyncio
async def test_chat_inactivity_flow():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    # Create test user
    async with AsyncSessionLocal() as db:
        # Check if already exists
        stmt = select(User).where(User.phone == "5599977777777")
        res = await db.execute(stmt)
        user = res.scalars().first()
        if not user:
            user = User(
                name="Broker Inativo",
                email="broker_inativo@portabilidade.pro",
                phone="5599977777777",
                role="user",
                active=True,
                password_hash="test"
            )
            db.add(user)
        
        # Clean previous logs for test sender
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone == TEST_SENDER))
        await db.commit()

    if "5599977777777" in CHAT_SESSIONS:
        del CHAT_SESSIONS["5599977777777"]

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Start a session by calling garantir-protocolo (active)
        payload = {"sender": TEST_SENDER, "pushName": "Inativo"}
        res = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        protocol = data["protocolo"]

        # Ensure the session exists in memory
        assert "5599977777777" in CHAT_SESSIONS
        assert CHAT_SESSIONS["5599977777777"]["protocol"] == protocol

        # Add some mock messages and context_data
        async with AsyncSessionLocal() as db:
            stmt = select(WhatsappChatLog).where(WhatsappChatLog.protocol == protocol)
            db_res = await db.execute(stmt)
            log = db_res.scalars().first()
            assert log is not None
            log.messages = json.dumps([{"role": "user", "text": "Olá", "timestamp": datetime.now().isoformat()}])
            log.context_data = {"some_context": "test_data"}
            await db.commit()

        # 2. Modify last_activity_at in the database to be 10 minutes ago
        async with AsyncSessionLocal() as db:
            stmt = select(WhatsappChatLog).where(WhatsappChatLog.protocol == protocol)
            db_res = await db.execute(stmt)
            log = db_res.scalars().first()
            # Set to 10 minutes ago
            log.last_activity_at = datetime.now(timezone.utc) - timedelta(minutes=10)
            await db.commit()

        # Run close_inactive_sessions under mock/patches
        with patch("app.routers.chat.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            await close_inactive_sessions()
            # It should NOT have sent a message and session should remain active (não encerrar antes de 15 minutos)
            test_sender_calls = [c for c in mock_send.call_args_list if c[0][0] in [TEST_SENDER, "5599977777777"]]
            assert len(test_sender_calls) == 0
            assert "5599977777777" in CHAT_SESSIONS

            # Check DB status is still active
            async with AsyncSessionLocal() as db:
                db_res = await db.execute(select(WhatsappChatLog).where(WhatsappChatLog.protocol == protocol))
                log = db_res.scalars().first()
                assert log.status == "active"

        # 3. Modify last_activity_at in the database to be 20 minutes ago (inactive)
        async with AsyncSessionLocal() as db:
            stmt = select(WhatsappChatLog).where(WhatsappChatLog.protocol == protocol)
            db_res = await db.execute(stmt)
            log = db_res.scalars().first()
            log.last_activity_at = datetime.now(timezone.utc) - timedelta(minutes=20)
            await db.commit()

        # Run close_inactive_sessions (encerrar após 15 minutos)
        with patch("app.routers.chat.send_whatsapp_message", new_callable=AsyncMock) as mock_send:
            await close_inactive_sessions()
            # It SHOULD have sent the message and closed the session
            test_sender_calls = [c for c in mock_send.call_args_list if c[0][0] in [TEST_SENDER, "5599977777777"]]
            assert len(test_sender_calls) == 1
            
            # Check session is removed from memory
            assert "5599977777777" not in CHAT_SESSIONS

            # Check DB status is closed, closed_at is filled, close_reason is inactivity
            async with AsyncSessionLocal() as db:
                db_res = await db.execute(select(WhatsappChatLog).where(WhatsappChatLog.protocol == protocol))
                log = db_res.scalars().first()
                assert log.status == "closed"
                assert log.closed_at is not None
                assert log.close_reason == "inactivity"
                # Check preserving protocol
                assert log.protocol == protocol
                # Check preserving context / context_data / messages history
                assert log.context_data == {"some_context": "test_data"}
                messages = log.messages
                def parse_res(val):
                    if isinstance(val, list):
                        return val
                    if isinstance(val, str):
                        try:
                            p = json.loads(val)
                            if isinstance(p, list):
                                return p
                            if isinstance(p, str):
                                p2 = json.loads(p)
                                if isinstance(p2, list):
                                    return p2
                        except:
                            pass
                    return []
                messages = parse_res(messages)
                assert len(messages) == 2
                assert messages[0]["text"] == "Olá"
                assert "Atendimento encerrado por inatividade" in messages[1]["text"]

        # 4. Evitar encerramento duplicado
        # If we run close_inactive_sessions again, it should not do anything and not send any whatsapp message again
        with patch("app.routers.chat.send_whatsapp_message", new_callable=AsyncMock) as mock_send_dup:
            await close_inactive_sessions()
            test_sender_calls_dup = [c for c in mock_send_dup.call_args_list if c[0][0] in [TEST_SENDER, "5599977777777"]]
            assert len(test_sender_calls_dup) == 0

        # 5. Nova mensagem criar novo atendimento
        # If we send a message now, it should generate a brand new protocol
        res_new = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert res_new.status_code == 200
        data_new = res_new.json()
        assert data_new["success"] is True
        assert data_new["novo_atendimento"] is True
        assert data_new["protocolo"] != protocol
