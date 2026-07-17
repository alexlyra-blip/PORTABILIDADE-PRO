import pytest
from app.routers.chat import SalvarContextoInput

def test_pydantic_schema():
    data = {
        "sender": "558191283133@s.whatsapp.net",
        "protocolo": "AL-1234",
        "contexto_simulacao": {"ofertas": [{"banco": "Daycoval"}]}
    }
    obj = SalvarContextoInput(**data)
    assert obj.sender == "558191283133@s.whatsapp.net"
    assert obj.protocolo == "AL-1234"
    assert obj.contexto_simulacao["ofertas"][0]["banco"] == "Daycoval"

def test_pydantic_schema_no_protocol():
    data = {
        "sender": "558191283133@s.whatsapp.net",
        "contexto_simulacao": {"ofertas": [{"banco": "Facta"}]}
    }
    obj = SalvarContextoInput(**data)
    assert obj.sender == "558191283133@s.whatsapp.net"
    assert obj.protocolo is None
    assert obj.contexto_simulacao["ofertas"][0]["banco"] == "Facta"
