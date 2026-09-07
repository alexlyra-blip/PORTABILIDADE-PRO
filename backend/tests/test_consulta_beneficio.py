import os
import sys
from unittest.mock import AsyncMock, patch, MagicMock
import pytest

# Ensure mock database url is set for import
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://mock:mock@localhost:5432/mock")
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.consultas.promosys_provider import PromosysProvider
from app.services.consultas.multicorban_provider import MultiCorbanProvider
from app.routers.consultas import _execute_beneficio_query_flow, BeneficioRequest
from app.schemas.consultas import ConsultaCpfMultiResponse


@pytest.fixture
def mock_env():
    with patch.dict(os.environ, {
        "PROMOSYS_BASE_URL": "https://api.promosys.test",
        "PROMOSYS_TOKEN": "test_promosys_token",
        "MULTICORBAN_BASE_URL": "https://api.multicorban.test",
        "MULTICORBAN_API_TOKEN": "test_multicorban_token",
    }):
        yield


@pytest.mark.anyio
async def test_promosys_consultar_por_beneficio(mock_env):
    provider = PromosysProvider()
    
    mock_payload = {
        "Code": "000",
        "Consulta": [
            {
                "NOME": "MARIA DA SILVA",
                "FULL_CPF": "12345678901",
                "NB": "1234567890",
                "IDADE": 65,
                "ESP": "41",
                "VALOR_BENEFICIO": "1500.00",
                "DADOS_BANCARIOS": {
                    "NOME_BANCO_PAGTO": "BANCO DO BRASIL",
                    "AGENCIA": "1234",
                    "CONTA": "5678"
                },
                "CONTRATO": [
                    {
                        "Tipo_Emprestimo": 98,
                        "Banco_Nome": "ITAU",
                        "Banco": "341",
                        "Contrato": "98765",
                        "Vl_Parcela": "150.00",
                        "Quitacao": "2000.00",
                        "Vl_Emprestimo": "5000.00",
                        "Prazo": 84,
                        "ParcPagas": 24,
                        "Situacao": "ATIVO"
                    }
                ]
            }
        ]
    }

    with patch.object(provider, "_get_token", new_callable=AsyncMock) as mock_token, \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_token.return_value = "token_ok"
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json = MagicMock(return_value=mock_payload)
        mock_post.return_value = mock_resp

        result = await provider.consultar_por_beneficio("1234567890")

        assert result["origem"] == "PROMOSYS"
        assert result["cliente"]["nome"] == "MARIA DA SILVA"
        assert result["cliente"]["cpf"] == "12345678901"
        assert result["cliente"]["beneficio"] == "1234567890"
        assert len(result["emprestimos"]) == 1
        assert result["emprestimos"][0]["banco"] == "ITAU"


@pytest.mark.anyio
async def test_multicorban_consultar_por_beneficio(mock_env):
    provider = MultiCorbanProvider()

    mock_multicorban_offline = [
        {
            "Beneficiario": {
                "Nome": "JOAO SANTOS",
                "CPF": "98765432100",
                "Beneficio": "9876543210",
                "Especie": "41",
                "DataNascimento": "1960-05-10"
            },
            "ResumoFinanceiro": {
                "ValorBeneficio": "2000.00",
                "MargemConsignavel": "700.00",
                "MargemLivre": "350.00"
            },
            "DadosBancarios": {
                "Banco": "CAIXA",
                "Agencia": "4321",
                "ContaCorrente": "8765"
            },
            "Emprestimos": [
                {
                    "NomeBanco": "SANTANDER",
                    "Contrato": "112233",
                    "ValorParcela": "350.00",
                    "Quitacao": "4500.00",
                    "Prazo": 96,
                    "ParcelasRestantes": 72
                }
            ]
        }
    ]

    with patch.object(provider.service, "consultar_offline", new_callable=AsyncMock) as mock_offline:
        mock_offline.return_value = mock_multicorban_offline

        result = await provider.consultar_por_beneficio("9876543210", convenio="INSS")

        assert result["origem"] == "MULTICORBAN"
        assert result["cliente"]["nome"] == "JOAO SANTOS"
        assert result["cliente"]["cpf"] == "98765432100"
        assert result["cliente"]["beneficio"] == "9876543210"
        assert result["banco_pagador"]["agencia"] == "4321"
        assert len(result["emprestimos"]) == 1
        assert result["emprestimos"][0]["banco"] == "SANTANDER"


class MockDBSession:
    async def close(self):
        pass


@pytest.mark.anyio
async def test_execute_beneficio_query_flow_promosys(mock_env):
    mock_db = MockDBSession()

    sample_res = {
        "origem": "PROMOSYS",
        "convenio": "INSS",
        "cliente": {
            "nome": "ANA PEREIRA",
            "cpf": "11122233344",
            "beneficio": "5566778899",
            "idade": 60,
            "salario": 1412.0,
            "margem_livre": 100.0,
            "banco_pagador": "BRADESCO"
        },
        "margens": {
            "salario": 1412.0,
            "margem_livre": 100.0,
            "margem_total_consignavel": 494.20
        },
        "beneficio": {
            "situacao": "ATIVO"
        },
        "banco_pagador": {
            "codigo": "237",
            "nome": "BRADESCO",
            "agencia": "0001",
            "conta": "1234"
        },
        "emprestimos": [],
        "cartoes": [],
        "telefones": ["11999998888"],
        "resumo": {
            "total_emprestimos": 0
        }
    }

    with patch("app.routers.consultas.get_provider_by_type") as mock_get_provider, \
         patch("app.routers.consultas.calcular_valor_liberado_margem", new_callable=AsyncMock) as mock_liberado, \
         patch("app.routers.consultas.obter_coeficiente_fator", new_callable=AsyncMock) as mock_coef, \
         patch("app.routers.consultas.AsyncSessionLocal") as mock_session_local:

        mock_coef.return_value = 0.02270
        mock_liberado.return_value = 4405.28

        mock_temp_session = AsyncMock()
        mock_session_local.return_value.__aenter__.return_value = mock_temp_session

        fake_provider = MagicMock()
        fake_provider.consultar_por_beneficio = AsyncMock(return_value=sample_res)
        mock_get_provider.return_value = fake_provider

        response = await _execute_beneficio_query_flow(
            beneficio="5566778899",
            db=mock_db,
            convenio="INSS",
            provider_type="promosys"
        )

        assert isinstance(response, ConsultaCpfMultiResponse)
        assert response.success is True
        assert response.total_beneficios == 1
        assert response.cpf == "11122233344"
        assert response.beneficios[0].numero == "5566778899"
        assert response.beneficios[0].cliente.nome == "ANA PEREIRA"
        assert response.beneficio_principal is not None
        assert response.beneficio_principal.cliente.nome == "ANA PEREIRA"
        assert response.margens.valor_liberado_margem == 4405.28


@pytest.mark.anyio
async def test_execute_beneficio_query_flow_multicorban(mock_env):
    mock_db = MockDBSession()

    sample_res = {
        "origem": "MULTICORBAN",
        "convenio": "INSS",
        "cliente": {
            "nome": "CARLOS EDUARDO",
            "cpf": "55566677788",
            "beneficio": "7788990011",
            "idade": 62,
            "salario": 2500.0,
            "margem_livre": 250.0,
            "banco_pagador": "ITAU"
        },
        "margens": {
            "salario": 2500.0,
            "margem_livre": 250.0,
            "margem_total_consignavel": 875.0
        },
        "beneficio": {
            "situacao": "ATIVO"
        },
        "banco_pagador": {
            "codigo": "341",
            "nome": "ITAU",
            "agencia": "0500",
            "conta": "99887"
        },
        "emprestimos": [],
        "cartoes": [],
        "telefones": ["21988887777"],
        "resumo": {
            "total_emprestimos": 0
        }
    }

    with patch("app.routers.consultas.get_provider_by_type") as mock_get_provider, \
         patch("app.routers.consultas.calcular_valor_liberado_margem", new_callable=AsyncMock) as mock_liberado, \
         patch("app.routers.consultas.obter_coeficiente_fator", new_callable=AsyncMock) as mock_coef, \
         patch("app.routers.consultas.AsyncSessionLocal") as mock_session_local:

        mock_coef.return_value = 0.02270
        mock_liberado.return_value = 11013.21

        mock_temp_session = AsyncMock()
        mock_session_local.return_value.__aenter__.return_value = mock_temp_session

        fake_provider = MagicMock()
        fake_provider.consultar_por_beneficio = AsyncMock(return_value=sample_res)
        mock_get_provider.return_value = fake_provider

        response = await _execute_beneficio_query_flow(
            beneficio="7788990011",
            db=mock_db,
            convenio="INSS",
            provider_type="multicorban"
        )

        assert isinstance(response, ConsultaCpfMultiResponse)
        assert response.success is True
        assert response.total_beneficios == 1
        assert response.cpf == "55566677788"
        assert response.beneficios[0].numero == "7788990011"
        assert response.beneficios[0].cliente.nome == "CARLOS EDUARDO"
        assert response.beneficio_principal is not None
        assert response.margens.valor_liberado_margem == 11013.21
