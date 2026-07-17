import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from app.database import get_db
from app.schemas.consultas import ConsultaCpfMultiResponse

# Define a mock database dependency to bypass DB
async def mock_get_db():
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_result
    yield mock_session

# Override dependency
app.dependency_overrides[get_db] = mock_get_db

client = TestClient(app)

# Helper headers
VALID_HEADERS = {"x-api-key": "portabilidade_pro_secret_key_2024"}
INVALID_HEADERS = {"x-api-key": "wrong_key_123"}

# Mock responses for PromosysProvider
MOCK_BENEFICIOS_ONE = {"beneficios": ["1234567890"]}
MOCK_BENEFICIOS_MULTI = {"beneficios": ["1234567890", "0987654321"]}
MOCK_BENEFICIOS_NONE = {"beneficios": []}

MOCK_DETALHE_BENEFICIO = {
    "origem": "PROMOSYS",
    "cliente": {
        "nome": "JOAO DA SILVA",
        "cpf": "12345678909",
        "beneficio": "1234567890",
        "idade": 60,
        "especie": "41 - APOSENTADORIA",
        "salario": 1412.0,
        "margem_livre": 100.0,
        "valor_liberado_margem": 4405.29,
        "banco_pagador": "BANCO DO BRASIL",
        "endereco": "RUA TESTE"
    },
    "margens": {
        "salario": 1412.0,
        "margem_emprestimo": 494.20,
        "total_comprometido": 394.20,
        "margem_livre": 100.0,
        "valor_liberado_margem": 4405.29,
        "margem_cartao": 70.6,
        "possui_cartao": True,
        "cartao_utilizado": 0.0,
        "cartao_disponivel": 70.6,
        "rmc_promosys": 0.0,
        "rcc_promosys": 0.0
    },
    "beneficio": {
        "situacao": "ATIVO",
        "bloqueado": False,
        "bloqueio_emprestimo": "Não",
        "possui_representante_legal": "Não",
        "especie_consignavel": "Sim",
        "contratos_atualizados_ate": "2026-07-14",
        "uf": "SP",
        "ddb": "2010-01-01"
    },
    "banco_pagador": {
        "codigo": "001",
        "nome": "BANCO DO BRASIL S.A.",
        "agencia": "1234",
        "conta": "56789-0",
        "tipo_pagamento": "Crédito em Conta"
    },
    "telefones": ["11999999999"],
    "emprestimos": [],
    "cartoes": [],
    "resumo": {
        "total_emprestimos": 0,
        "total_cartoes": 0,
        "total_parcelas_emprestimos": 0.0,
        "maior_troco": 0.0,
        "maior_parcela": 0.0
    }
}

# 1. API Key válida
def test_internal_query_valid_api_key():
    with patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_beneficios", new_callable=AsyncMock) as mock_list, \
         patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_por_beneficio", new_callable=AsyncMock) as mock_detail:
        
        mock_list.return_value = MOCK_BENEFICIOS_ONE
        mock_detail.return_value = MOCK_DETALHE_BENEFICIO
        
        response = client.post(
            "/api/internal/consultas/promosys/cpf",
            json={"cpf": "123.456.789-09"},
            headers=VALID_HEADERS
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

# 2. API Key inválida
def test_internal_query_invalid_api_key():
    response = client.post(
        "/api/internal/consultas/promosys/cpf",
        json={"cpf": "123.456.789-09"},
        headers=INVALID_HEADERS
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "API Key inválida"

# 3. API Key ausente
def test_internal_query_missing_api_key():
    response = client.post(
        "/api/internal/consultas/promosys/cpf",
        json={"cpf": "123.456.789-09"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "API Key inválida"

# 4. CPF válido com um benefício
def test_internal_query_one_benefit():
    with patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_beneficios", new_callable=AsyncMock) as mock_list, \
         patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_por_beneficio", new_callable=AsyncMock) as mock_detail:
        
        mock_list.return_value = MOCK_BENEFICIOS_ONE
        mock_detail.return_value = MOCK_DETALHE_BENEFICIO
        
        response = client.post(
            "/api/internal/consultas/promosys/cpf",
            json={"cpf": "12345678909"},
            headers=VALID_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_beneficios"] == 1
        assert len(data["beneficios"]) == 1
        assert data["beneficios"][0]["numero"] == "1234567890"

# 5. CPF válido com múltiplos benefícios
def test_internal_query_multi_benefits():
    with patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_beneficios", new_callable=AsyncMock) as mock_list, \
         patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_por_beneficio", new_callable=AsyncMock) as mock_detail:
        
        mock_list.return_value = MOCK_BENEFICIOS_MULTI
        
        # Mock different responses per benefit (one and two)
        det_1 = dict(MOCK_DETALHE_BENEFICIO)
        det_1["cliente"] = dict(MOCK_DETALHE_BENEFICIO["cliente"])
        det_1["cliente"]["beneficio"] = "1234567890"
        
        det_2 = dict(MOCK_DETALHE_BENEFICIO)
        det_2["cliente"] = dict(MOCK_DETALHE_BENEFICIO["cliente"])
        det_2["cliente"]["beneficio"] = "0987654321"
        
        mock_detail.side_effect = lambda nb: det_1 if nb == "1234567890" else det_2
        
        response = client.post(
            "/api/internal/consultas/promosys/cpf",
            json={"cpf": "12345678909"},
            headers=VALID_HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_beneficios"] == 2
        assert len(data["beneficios"]) == 2
        assert {b["numero"] for b in data["beneficios"]} == {"1234567890", "0987654321"}

# 6. CPF sem benefício
def test_internal_query_no_benefits():
    with patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_beneficios", new_callable=AsyncMock) as mock_list:
        # Returning empty benefits list raises 404
        mock_list.return_value = MOCK_BENEFICIOS_NONE
        
        response = client.post(
            "/api/internal/consultas/promosys/cpf",
            json={"cpf": "12345678909"},
            headers=VALID_HEADERS
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Nenhum benefício encontrado para este CPF."

# 7. CPF inválido
def test_internal_query_invalid_cpf():
    response = client.post(
        "/api/internal/consultas/promosys/cpf",
        json={"cpf": "abc"},
        headers=VALID_HEADERS
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "CPF é obrigatório."

# 8. Retorno idêntico à rota pública
def test_internal_query_identical_response_format():
    # We will query using public endpoint (after mocking get_current_user)
    # and then check that the schema matches exactly.
    from app.routers.deps import get_current_user
    
    mock_user = MagicMock()
    mock_user.role = "admin"
    mock_user.can_consult_cpf = True
    
    async def mock_get_current_user():
        return mock_user
        
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    with patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_beneficios", new_callable=AsyncMock) as mock_list, \
         patch("app.services.consultas.promosys_provider.PromosysProvider.consultar_por_beneficio", new_callable=AsyncMock) as mock_detail:
        
        mock_list.return_value = MOCK_BENEFICIOS_ONE
        mock_detail.return_value = MOCK_DETALHE_BENEFICIO
        
        # 1. Call Public Endpoint
        pub_response = client.post(
            "/api/consultas/promosys/cpf",
            json={"cpf": "12345678909"}
        )
        
        # 2. Call Internal Endpoint
        int_response = client.post(
            "/api/internal/consultas/promosys/cpf",
            json={"cpf": "12345678909"},
            headers=VALID_HEADERS
        )
        
        assert pub_response.status_code == 200
        assert int_response.status_code == 200
        assert pub_response.json() == int_response.json()

    # Reset overrides to clean up
    app.dependency_overrides.pop(get_current_user, None)
