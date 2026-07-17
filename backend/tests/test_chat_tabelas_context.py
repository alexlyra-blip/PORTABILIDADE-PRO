import pytest
from app.services.chat_simulacao_interceptor import processar_comando_simulacao

@pytest.fixture
def mock_session():
    return {
        "simulations": [
            {
                "b_idx": 1,
                "c_idx": 1,
                "ofertas": [
                    {
                        "banco": "Facta",
                        "tabela": "Normal 120",
                        "prazo": 120,
                        "valor_parcela": 100.0,
                        "valor_liberado": 3000.0,
                        "taxa_juros": 1.6,
                        "valor_total_contrato": 12000.0
                    },
                    {
                        "banco": "Facta",
                        "tabela": "Promo 108",
                        "prazo": 108,
                        "valor_parcela": 100.0,
                        "valor_liberado": 2800.0,
                        "taxa_juros": 1.7,
                        "valor_total_contrato": 10800.0
                    },
                    {
                        "banco": "Facta",
                        "tabela": "Curto 84",
                        "prazo": 84,
                        "valor_parcela": 100.0,
                        "valor_liberado": 2000.0,
                        "taxa_juros": 1.8,
                        "valor_total_contrato": 8400.0
                    },
                    {
                        "banco": "Daycoval",
                        "tabela": "Daycoval Flex",
                        "prazo": 120,
                        "valor_parcela": 100.0,
                        "valor_liberado": 3100.0,
                        "taxa_juros": 1.5,
                        "valor_total_contrato": 12000.0
                    }
                ]
            },
            {
                "b_idx": 1,
                "c_idx": 2,
                "ofertas": [
                    {
                        "banco": "Pan",
                        "tabela": "Pan Normal",
                        "prazo": 84,
                        "valor_parcela": 50.0,
                        "valor_liberado": 1000.0,
                        "taxa_juros": 1.6,
                        "valor_total_contrato": 4200.0
                    }
                ]
            }
        ]
    }

def test_tabelas_108_facta(mock_session):
    reply = processar_comando_simulacao(mock_session, "tabelas 108 facta b1 c1", "Tabelas 108 Facta B1 C1")
    assert reply is not None
    assert "Promo 108" in reply
    assert "Normal 120" not in reply

def test_tabelas_banco_nao_encontrado(mock_session):
    reply = processar_comando_simulacao(mock_session, "tabelas itau", "Tabelas Itaú")
    # Para múltiplos contratos sem dizer qual, e não achou banco
    assert "Para qual benefício e contrato" in reply or reply is None

def test_banco_especifico(mock_session):
    reply = processar_comando_simulacao(mock_session, "daycoval b1 c1", "Daycoval b1 c1")
    assert reply is not None
    assert "OFERTA SELECIONADA: Daycoval" in reply

def test_tabela_geral_multiplos_contratos(mock_session):
    reply = processar_comando_simulacao(mock_session, "tabelas facta", "Tabelas Facta")
    assert "Para qual benefício e contrato deseja consultar" in reply

def test_tabela_geral_um_contrato():
    session = {
        "simulations": [
            {
                "b_idx": 1,
                "c_idx": 1,
                "ofertas": [
                    {
                        "banco": "Facta",
                        "tabela": "Normal 120",
                        "prazo": 120,
                        "valor_parcela": 100.0,
                        "valor_liberado": 3000.0,
                        "taxa_juros": 1.6,
                        "valor_total_contrato": 12000.0
                    },
                    {
                        "banco": "Facta",
                        "tabela": "Promo 108",
                        "prazo": 108,
                        "valor_parcela": 100.0,
                        "valor_liberado": 2800.0,
                        "taxa_juros": 1.7,
                        "valor_total_contrato": 10800.0
                    }
                ]
            }
        ]
    }
    reply = processar_comando_simulacao(session, "tabelas", "Tabelas")
    assert reply is not None
    assert "Outras Tabelas para Facta" in reply
    # Should exclude the first one which is considered the recommended one
    assert "Promo 108" in reply
    assert "Normal 120" not in reply

def test_regras_bypass(mock_session):
    reply = processar_comando_simulacao(mock_session, "regras facta", "Regras Facta")
    # Should return None because "regra" is in msg_lower
    assert reply is None
