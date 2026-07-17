import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import asyncio
import pytest
from app.services.margem_service import calcular_valor_liberado_margem
from app.services.consultas.promosys_provider import PromosysProvider

from unittest.mock import AsyncMock, MagicMock, patch

@pytest.mark.asyncio
async def test_margem_calculo():
    # Test 1: Helper direto (Mocking database call to avoid Supabase connection)
    margem_livre = 55.99
    esperado = 2466.52
    
    mock_session = AsyncMock()
    mock_session.__aenter__.return_value = mock_session
    mock_result = MagicMock()
    # Mock the execute calls to return None (no base bank found, so it falls back to 0.02270)
    mock_result.scalars.return_value.first.return_value = None
    mock_session.execute.return_value = mock_result
    
    with patch('app.services.margem_service.AsyncSessionLocal', return_value=mock_session):
        calculado = await calcular_valor_liberado_margem(margem_livre)
        
    assert abs(calculado - esperado) < 0.1, f"Erro: {calculado} != {esperado}"
    print(f"Helper calculou corretamente: {calculado}")

    # Test 2: Promosys Provider mock
    provider = PromosysProvider()
    raw_mock = {
        "BENEFICIO": {
            "TotalComprometido": "100.00"
        },
        "MR": "1000.00" # Salario 1000 => margem_emp = 400 => margem_livre = 300
    }
    
    with patch('app.services.consultas.promosys_provider.calcular_valor_liberado_margem', new_callable=AsyncMock) as mock_calc:
        # Mock calculation to return value based on default coefficient
        mock_calc.side_effect = lambda margem: round(margem / 0.02270, 2)
        res = await provider._normalize_response(raw_mock, "12345678909")
    
    margem_calculada = res["margens"]["margem_livre"]
    assert margem_calculada == 300.0, f"Erro margem: {margem_calculada}"
    
    valor_liberado = res["cliente"]["valor_liberado_margem"]
    valor_liberado_margens = res["margens"]["valor_liberado_margem"]
    
    esperado_liberado = round(300.0 / 0.02270, 2)
    assert valor_liberado == esperado_liberado, f"Erro liberado cliente: {valor_liberado}"
    assert valor_liberado_margens == esperado_liberado, f"Erro liberado margens: {valor_liberado_margens}"
    print(f"Promosys Provider normalizou corretamente: {valor_liberado}")

    print("Todos os testes locais passaram com sucesso!")

if __name__ == "__main__":
    asyncio.run(test_margem_calculo())
