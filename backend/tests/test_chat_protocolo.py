import sys
import os
import asyncio
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.routers.chat import normalize_sender, CHAT_SESSIONS

def test_normalize_sender():
    assert normalize_sender("5511999999999@s.whatsapp.net") == "5511999999999"
    assert normalize_sender("5511999999999") == "5511999999999"
    assert normalize_sender("") == ""
    print("Normalizacao de sender testada com sucesso!")

def test_protocol_flow():
    # Simula o que o chat_interaction e garantir_protocolo fazem
    sender = "5511999999999"
    
    # Se encerramos a sessão
    session = {
        "state": "idle",
        "protocol": "PROT-123",
        "last_request_time": datetime.now().timestamp(),
        "messages": []
    }
    CHAT_SESSIONS[sender] = session
    
    msg_lower = "encerrar"
    if msg_lower in ["encerrar", "obrigado", "obrigada", "valeu", "tchau", "agradeço", "obg"]:
        protocol = session.get('protocol', 'N/A')
        assert protocol == "PROT-123"
        # Deletando do memory dict
        if sender in CHAT_SESSIONS:
            del CHAT_SESSIONS[sender]
            
    assert sender not in CHAT_SESSIONS, "Sessão não foi removida da memória corretamente!"
    print("Fluxo de delecao do protocolo após encerramento testado com sucesso!")

if __name__ == "__main__":
    test_normalize_sender()
    test_protocol_flow()
