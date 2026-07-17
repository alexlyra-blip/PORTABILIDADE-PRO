import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.routers.simulacao import PromosysInput, ClienteInput

def test_analfabeto_aliases():
    # Test 1: analfabeto=True no payload principal
    payload1 = PromosysInput(
        cliente=ClienteInput(cpf="123", beneficio="456"),
        analfabeto=True
    )
    is_analfabeto1 = (
        payload1.analfabeto is True or
        payload1.nao_assina is True or
        payload1.cliente_assina is False or
        payload1.cliente.analfabeto is True or
        payload1.cliente.nao_assina is True or
        payload1.cliente.cliente_assina is False
    )
    assert is_analfabeto1 == True, "Erro no payload1"

    # Test 2: cliente_assina=False no cliente
    payload2 = PromosysInput(
        cliente=ClienteInput(cpf="123", beneficio="456", cliente_assina=False)
    )
    is_analfabeto2 = (
        payload2.analfabeto is True or
        payload2.nao_assina is True or
        payload2.cliente_assina is False or
        payload2.cliente.analfabeto is True or
        payload2.cliente.nao_assina is True or
        payload2.cliente.cliente_assina is False
    )
    assert is_analfabeto2 == True, "Erro no payload2"

    # Test 3: Normal payload (assina)
    payload3 = PromosysInput(
        cliente=ClienteInput(cpf="123", beneficio="456", cliente_assina=True)
    )
    is_analfabeto3 = (
        payload3.analfabeto is True or
        payload3.nao_assina is True or
        payload3.cliente_assina is False or
        payload3.cliente.analfabeto is True or
        payload3.cliente.nao_assina is True or
        payload3.cliente.cliente_assina is False
    )
    assert is_analfabeto3 == False, "Erro no payload3"

    print("Testes de aliases de analfabeto passaram!")

if __name__ == "__main__":
    test_analfabeto_aliases()
