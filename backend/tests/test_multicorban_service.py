import pytest
import asyncio
import sys
import os
from unittest.mock import AsyncMock, patch, MagicMock

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://mock:mock@localhost:5432/mock")

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


def test_resolve_bank_info():
    from app.utils.bank_catalog import resolve_bank_info

    # 1. Bank code 079 / 79 with numeric/empty name -> PICPAY
    code, name = resolve_bank_info("79", "79")
    assert code == "079"
    assert name == "PICPAY"

    code, name = resolve_bank_info("079", "")
    assert code == "079"
    assert name == "PICPAY"

    # 2. Bank code 643 -> BANCO PINE
    code, name = resolve_bank_info("643", "643")
    assert code == "643"
    assert name == "BANCO PINE"

    # 3. Bank code with repeated prefix in raw_name e.g. "121 - 121 - AGIBANK" or "121 - AGIBANK"
    code, name = resolve_bank_info("121", "121 - AGIBANK")
    assert code == "121"
    assert name == "AGIBANK"

    # 4. Canonical overrides for Facta
    code, name = resolve_bank_info("935", "935")
    assert code == "935"
    assert name == "FACTA FINANCEIRA"


@pytest.mark.anyio
async def test_multicorban_provider_bank_normalization(mock_env):
    provider = MultiCorbanProvider()

    raw_payload = {
        "Beneficiario": {
            "Nome": "MARIA TESTE",
            "CPF": "12345678901",
            "Beneficio": "9876543210",
        },
        "Emprestimos": [
            {
                "NomeBanco": "79",
                "Banco": "79",
                "Contrato": "PIC123",
                "ValorParcela": "150.00",
            },
            {
                "NomeBanco": "643 - BANCO PINE",
                "Banco": "643",
                "Contrato": "PINE456",
                "ValorParcela": "200.00",
            },
        ],
        "Rmc": {
            "NomeBanco": "079",
            "Banco": "079",
            "Contrato": "RMC-PIC",
            "Valor": "100.00",
            "ValorParcela": "50.00",
        },
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        resp = MagicMock()
        resp.status_code = 200
        resp.json = MagicMock(return_value=[raw_payload])
        mock_post.return_value = resp

        normalized = await provider.consultar_por_cpf("12345678901", convenio="INSS")

        emp1 = normalized["emprestimos"][0]
        assert emp1["codigo"] == "079"
        assert emp1["banco"] == "PICPAY"

        emp2 = normalized["emprestimos"][1]
        assert emp2["codigo"] == "643"
        assert emp2["banco"] == "BANCO PINE"

        cartao = normalized["cartoes"][0]
        assert cartao["codigo"] == "079"
        assert cartao["banco"] == "PICPAY"
