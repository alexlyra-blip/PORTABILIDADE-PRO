import sys
import os
import asyncio
import json
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import httpx

# Adjust PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import get_db, DATABASE_URL
from app.models.sqlalchemy_models import User, WhatsappChatLog
from app.main import app
from app.routers.chat import CHAT_SESSIONS

TEST_SENDER = "5599999999999@s.whatsapp.net"
TEST_CONCURRENT_SENDER = "5599988888888@s.whatsapp.net"
API_KEY_HEADER = {"x-api-key": "portabilidade_pro_secret_key_2024"}

async def run_tests():
    print("⏳ Iniciando execução dos testes de protocolo...")
    
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
    if TEST_SENDER in CHAT_SESSIONS:
        del CHAT_SESSIONS[TEST_SENDER]
    if TEST_CONCURRENT_SENDER in CHAT_SESSIONS:
        del CHAT_SESSIONS[TEST_CONCURRENT_SENDER]

    # Clean previous chat logs for test senders
    async with async_session() as db:
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone.in_([TEST_SENDER, TEST_CONCURRENT_SENDER])))
        await db.commit()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        
        # SCENARIO 1: Sender sem atendimento ativo
        print("1. Testando criar novo atendimento sem sessão ativa...")
        payload = {"sender": TEST_SENDER, "pushName": "Alexandre"}
        response = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        
        assert response.status_code == 200, f"Erro: status {response.status_code}"
        data = response.json()
        assert data["success"] is True
        assert data["novo_atendimento"] is True
        assert "protocolo" in data
        assert data["sender"] == TEST_SENDER
        protocol_1 = data["protocolo"]
        print(f"   [OK] Novo protocolo gerado: {protocol_1}")
        
        # SCENARIO 2: Sender com atendimento ativo
        print("2. Testando garantir-protocolo com sessão já ativa...")
        response_active = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert response_active.status_code == 200
        data_active = response_active.json()
        assert data_active["success"] is True
        assert data_active["novo_atendimento"] is False
        assert data_active["protocolo"] == protocol_1
        print("   [OK] Protocolo existente reutilizado com sucesso.")
        
        # SCENARIO 3: Duas chamadas simultâneas para o mesmo sender
        print("3. Testando chamadas simultâneas concorrentes...")
        concurrent_payload = {"sender": TEST_CONCURRENT_SENDER, "pushName": "Concorrente"}
        
        tasks = [
            client.post("/api/atendimento/garantir-protocolo", json=concurrent_payload, headers=API_KEY_HEADER)
            for _ in range(3)
        ]
        results = await asyncio.gather(*tasks)
        
        assert all(r.status_code == 200 for r in results)
        con_data_list = [r.json() for r in results]
        
        new_atendimentos = [c for c in con_data_list if c["novo_atendimento"] is True]
        reused_atendimentos = [c for c in con_data_list if c["novo_atendimento"] is False]
        
        assert len(new_atendimentos) == 1, "Erro: Mais de uma chamada criou o atendimento concorrentemente!"
        assert len(reused_atendimentos) == 2
        
        shared_protocol = con_data_list[0]["protocolo"]
        assert all(c["protocolo"] == shared_protocol for c in con_data_list)
        print(f"   [OK] Apenas 1 protocolo criado e reutilizado nas chamadas concorrentes: {shared_protocol}")

        # SCENARIO 4: Protocolo reutilizado no encerramento
        print("4. Testando envio de mensagem de encerramento...")
        chat_payload = {"sender": TEST_SENDER, "message": "encerrar"}
        chat_res = await client.post("/api/external/chat", json=chat_payload, headers=API_KEY_HEADER)
        
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        assert "Atendimento encerrado com sucesso" in chat_data["reply"]
        assert protocol_1 in chat_data["reply"]
        print("   [OK] Protocolo impresso corretamente na mensagem final.")
        
        # Verificar status final no banco
        async with async_session() as db:
            stmt = select(WhatsappChatLog).where(
                WhatsappChatLog.sender_phone == TEST_SENDER,
                WhatsappChatLog.protocol == protocol_1
            )
            res = await db.execute(stmt)
            log = res.scalars().first()
            assert log is not None
            assert log.status == "finished"
            print("   [OK] Status do log alterado para 'finished' no banco de dados.")
            
        # Nova chamada deve criar novo protocolo
        print("5. Testando gerar novo protocolo após encerramento da sessão...")
        response_new_after_finish = await client.post("/api/atendimento/garantir-protocolo", json=payload, headers=API_KEY_HEADER)
        assert response_new_after_finish.status_code == 200
        data_new = response_new_after_finish.json()
        assert data_new["success"] is True
        assert data_new["novo_atendimento"] is True
        assert data_new["protocolo"] != protocol_1
        print(f"   [OK] Novo protocolo gerado após encerramento: {data_new['protocolo']}")

    # Cleanup Database
    print("🧹 Realizando limpeza do banco de dados pós-teste...")
    async with async_session() as db:
        await db.execute(WhatsappChatLog.__table__.delete().where(WhatsappChatLog.sender_phone.in_([TEST_SENDER, TEST_CONCURRENT_SENDER])))
        await db.execute(User.__table__.delete().where(User.phone.in_(["5599999999999", "5599988888888"])))
        await db.commit()
        
    print("\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO! 🎉")

if __name__ == "__main__":
    asyncio.run(run_tests())
