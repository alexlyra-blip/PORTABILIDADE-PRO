import pytest
import asyncio
import json
import sys
import os
from datetime import datetime, timezone

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

@pytest.mark.asyncio
async def test_sender_normalization():
    # 1. sender sem sufixo
    assert normalize_sender("558191283133") == "558191283133"
    # 2. sender com @s.whatsapp.net
    assert normalize_sender("558191283133@s.whatsapp.net") == "558191283133"
    # 3. sender com :11@s.whatsapp.net
    assert normalize_sender("558191283133:11@s.whatsapp.net") == "558191283133"
    # 4. sender com @lid
    assert normalize_sender("558191283133@lid") == "558191283133"


@pytest.mark.asyncio
async def test_consistency_flows():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Seed user broker
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

    # Clear memory and DB logs for TEST_PHONE
    sender_norm = normalize_sender(TEST_PHONE)
    if sender_norm in CHAT_SESSIONS:
        del CHAT_SESSIONS[sender_norm]
        
    async with async_session() as db:
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone == sender_norm))
        await db.commit()

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 5. Garantir-protocolo seguido imediatamente de salvar-contexto
        payload = {"sender": f"{TEST_PHONE}:12@s.whatsapp.net", "pushName": "Alexandre"}
        response = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        protocolo = data["protocolo"]
        
        # Salvar contexto
        context_payload = {
            "sender": f"{TEST_PHONE}@s.whatsapp.net",
            "protocolo": protocolo,
            "contexto_simulacao": {"banco": "C6", "valor": 1000}
        }
        response_context = await client.post("/api/atendimento/salvar-contexto-simulacao", json=context_payload, headers=API_KEY_HEADER)
        assert response_context.status_code == 200
        assert response_context.json()["success"] is True
        
        # 14. verificar contexto persistido no banco
        async with async_session() as db:
            stmt = select(WhatsappChatLog).where(
                WhatsappChatLog.sender_phone == sender_norm,
                WhatsappChatLog.status == "active"
            )
            res = await db.execute(stmt)
            log = res.scalars().first()
            assert log is not None
            assert log.context_data == {"banco": "C6", "valor": 1000}

        # 6. Sessão existente apenas no banco (limpa memória, salvar-contexto restaura)
        del CHAT_SESSIONS[sender_norm]
        response_context_restore = await client.post("/api/atendimento/salvar-contexto-simulacao", json=context_payload, headers=API_KEY_HEADER)
        assert response_context_restore.status_code == 200
        assert CHAT_SESSIONS[sender_norm]["protocol"] == protocolo

        # 8. Memória com protocolo antigo/diferente (banco deve forçar a sincronização e sobrescrever)
        CHAT_SESSIONS[sender_norm]["protocol"] = "PROT_ANTIGO_123"
        response_context_override = await client.post("/api/atendimento/salvar-contexto-simulacao", json=context_payload, headers=API_KEY_HEADER)
        assert response_context_override.status_code == 200
        assert CHAT_SESSIONS[sender_norm]["protocol"] == protocolo

        # 9. Dois atendimentos active para o mesmo sender (Simula inconsistência manual)
        async with async_session() as db:
            # Insere outro atendimento active falso
            dup_log = WhatsappChatLog(
                protocol="PROT_DUP_999",
                sender_phone=sender_norm,
                client_name="Alexandre",
                user_id=user.id,
                status="active"
            )
            db.add(dup_log)
            await db.commit()

        # Garantir protocolo deve limpar o duplicado, fechar o antigo e manter apenas o mais recente
        response_dup = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert response_dup.status_code == 200
        
        async with async_session() as db:
            # Verifica que o duplicado foi fechado com duplicate_active_session
            stmt_closed = select(WhatsappChatLog).where(
                WhatsappChatLog.sender_phone == sender_norm,
                WhatsappChatLog.status == "closed",
                WhatsappChatLog.close_reason == "duplicate_active_session"
            )
            res_closed = await db.execute(stmt_closed)
            closed_list = res_closed.scalars().all()
            assert len(closed_list) >= 1

        # 10. Concorrência entre duas chamadas de garantir-protocolo
        if sender_norm in CHAT_SESSIONS:
            del CHAT_SESSIONS[sender_norm]
        async with async_session() as db:
            await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone == sender_norm))
            await db.commit()
            
        tasks = [
            client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
            for _ in range(2)
        ]
        results = await asyncio.gather(*tasks)
        assert results[0].status_code == 200
        assert results[1].status_code == 200
        assert results[0].json()["protocolo"] == results[1].json()["protocolo"]
        
        # 11. Concorrência entre garantir-protocolo e salvar-contexto
        shared_proto = results[0].json()["protocolo"]
        c_payload = {
            "sender": TEST_PHONE,
            "protocolo": shared_proto,
            "contexto_simulacao": {"banco": "C6", "valor": 999}
        }
        tasks_mix = [
            client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER),
            client.post("/api/atendimento/salvar-contexto-simulacao", json=c_payload, headers=API_KEY_HEADER)
        ]
        results_mix = await asyncio.gather(*tasks_mix)
        assert results_mix[0].status_code == 200
        assert results_mix[1].status_code == 200

        # 12. Atendimento encerrado não ser reutilizado
        # 15. Protocolo final continuado a ser usado no encerramento manual
        chat_payload = {"sender": f"{TEST_PHONE}@s.whatsapp.net", "message": "encerrar"}
        chat_res = await client.post("/api/external/chat", json=chat_payload, headers=API_KEY_HEADER)
        assert chat_res.status_code == 200
        assert shared_proto in chat_res.json()["reply"]
        
        # 13. Nova mensagem após encerramento criar novo protocolo
        response_new = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert response_new.status_code == 200
        assert response_new.json()["novo_atendimento"] is True
        assert response_new.json()["protocolo"] != shared_proto

    # Final Database Cleanup
    async with async_session() as db:
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone == sender_norm))
        await db.execute(User.__table__.delete().where(User.phone == TEST_PHONE))
        await db.commit()
