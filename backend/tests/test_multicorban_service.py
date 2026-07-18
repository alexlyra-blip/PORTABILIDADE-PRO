import pytest
import asyncio
import sys
import os
from unittest.mock import AsyncMock, patch, MagicMock

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.multicorban_service import MultiCorbanService
from app.services.consultas.multicorban_provider import MultiCorbanProvider
import httpx

@pytest.fixture
def mock_env():
    with patch.dict(os.environ, {
        "MULTICORBAN_BASE_URL": "https://api.bancodatahub.com",
        "MULTICORBAN_API_TOKEN": "test_token_12345",
        "MULTICORBAN_TIMEOUT": "5.0"
    }):
        yield

@pytest.mark.anyio
async def test_multicorban_service_success(mock_env):
    service = MultiCorbanService()
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={"success": True, "data": "test"})
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        
        # Test CPF
        res = await service.consultar_cpf("00000000000")
        assert res["success"] is True
        mock_post.assert_called_with(
            "https://api.bancodatahub.com/cpf",
            headers={"Authorization": "test_token_12345", "Content-Type": "application/json"},
            json={"cpf": "00000000000"}
        )

        # Test SIAPE
        await service.consultar_siape("00000000000")
        mock_post.assert_called_with(
            "https://api.bancodatahub.com/siape",
            headers={"Authorization": "test_token_12345", "Content-Type": "application/json"},
            json={"cpf": "00000000000"}
        )

        # Test Geral
        await service.consultar_geral("00000000000")
        mock_post.assert_called_with(
            "https://api.bancodatahub.com/geral",
            headers={"Authorization": "test_token_12345", "Content-Type": "application/json"},
            json={"cpf_cnpj": "00000000000"}
        )

        # Test Offline
        await service.consultar_offline("123456")
        mock_post.assert_called_with(
            "https://api.bancodatahub.com/offline",
            headers={"Authorization": "test_token_12345", "Content-Type": "application/json"},
            json={"beneficio": "123456"}
        )

        # Test Saldo
        await service.consultar_saldo()
        mock_post.assert_called_with(
            "https://api.bancodatahub.com/saldoApi",
            headers={"Authorization": "test_token_12345", "Content-Type": "application/json"},
            json=None
        )

@pytest.mark.anyio
async def test_multicorban_service_errors(mock_env):
    service = MultiCorbanService()
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        # 1. Test 401
        res_401 = MagicMock()
        res_401.status_code = 401
        mock_post.return_value = res_401
        with pytest.raises(ValueError, match="Autenticação MultiCorban inválida."):
            await service.consultar_cpf("000")
            
        # 2. Test 429
        res_429 = MagicMock()
        res_429.status_code = 429
        mock_post.return_value = res_429
        with pytest.raises(ValueError, match="Limite de requisições da MultiCorban atingido."):
            await service.consultar_cpf("000")
            
        # 3. Test 400
        res_400 = MagicMock()
        res_400.status_code = 400
        res_400.text = "Bad input"
        mock_post.return_value = res_400
        with pytest.raises(ValueError, match="Dados rejeitados pela MultiCorban."):
            await service.consultar_cpf("000")

        # 4. Test Timeout
        mock_post.side_effect = httpx.TimeoutException("Timeout")
        with pytest.raises(ValueError, match="A MultiCorban demorou para responder."):
            await service.consultar_cpf("000")

        # 5. Test connection error
        mock_post.side_effect = httpx.RequestError("Connection refused")
        with pytest.raises(ValueError, match="Serviço MultiCorban temporariamente indisponível."):
            await service.consultar_cpf("000")

@pytest.mark.anyio
async def test_multicorban_provider_normalize(mock_env):
    provider = MultiCorbanProvider()
    
    raw_payload = {
        "Beneficiario": {
            "Nome": "JOSE TESTE",
            "CPF": "60072718382",
            "Beneficio": "1667879119",
            "Especie": "21",
            "Situacao": "ATIVO",
            "DataNascimento": "1951-12-07"
        },
        "ResumoFinanceiro": {
            "ValorBeneficio": "1412.0"
        },
        "DadosBancarios": {
            "Banco": "BRADESCO",
            "Agencia": "1234",
            "ContaPagto": "5678"
        },
        "Emprestimos": [
            {
                "NomeBanco": "BRADESCO",
                "Banco": "237",
                "Contrato": "012345",
                "ValorParcela": "300.00",
                "Quitacao": "1000.00",
                "Prazo": 96,
                "ParcelasRestantes": 87,
                "Taxa": 1.63
            }
        ]
    }
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        resp = MagicMock()
        resp.status_code = 200
        resp.json = MagicMock(return_value=[raw_payload])
        mock_post.return_value = resp
        
        normalized = await provider.consultar_por_cpf("60072718382", convenio="INSS")
        
        assert normalized["origem"] == "MULTICORBAN"
        assert normalized["cliente"]["nome"] == "JOSE TESTE"
        assert normalized["cliente"]["cpf"] == "60072718382"
        assert normalized["cliente"]["data_nascimento"] == "1951-12-07"
        assert normalized["cliente"]["idade"] > 0
        assert normalized["banco_pagador"]["agencia"] == "1234"
        assert len(normalized["emprestimos"]) == 1
        assert normalized["emprestimos"][0]["valor_contrato"] == 1000.00 # fallback to Quitacao if ValorOriginal not set
