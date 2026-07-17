import pytest
from app.services.chat_simulacao_interceptor import processar_comando_simulacao

@pytest.fixture
def base_session():
    return {
        "ultima_simulacao": {
            "possui_ofertas": True,
            "beneficios": [
                {
                    "indice_beneficio": 1,
                    "contratos": [
                        {
                            "indice_contrato": 1,
                            "banco_recomendado": "Facta",
                            "tabela_apresentada": "INSS CIP REFIN NORMAL",
                            "melhor_oferta": {
                                "banco": "Facta",
                                "tabela": "INSS CIP REFIN NORMAL",
                                "prazo": 84,
                                "valor_liberado": 1000.0,
                                "valor_parcela": 150.0,
                                "taxa_juros": 1.6
                            },
                            "tabelas_alternativas": [
                                {
                                    "banco": "Facta",
                                    "tabela": "INSS CIP REFIN NORMAL",
                                    "prazo": 84, # Mesma da melhor oferta
                                    "valor_liberado": 1000.0,
                                    "valor_parcela": 150.0,
                                    "taxa_juros": 1.6
                                },
                                {
                                    "banco": "Facta",
                                    "tabela": "INSS OUTRA",
                                    "prazo": 96,
                                    "valor_liberado": 1200.0,
                                    "valor_parcela": 150.0,
                                    "taxa_juros": 1.7
                                },
                                {
                                    "banco": "Facta",
                                    "tabela": "INSS TOP",
                                    "prazo": 108,
                                    "valor_liberado": 800.0,
                                    "valor_parcela": 100.0,
                                    "taxa_juros": 1.5
                                }
                            ],
                            "ofertas_por_banco": {
                                "DAYCOVAL": [
                                    {
                                        "banco": "DAYCOVAL",
                                        "tabela": "DAYCOVAL REFIN",
                                        "prazo": 84,
                                        "valor_liberado": 900.0,
                                        "valor_parcela": 150.0,
                                        "taxa_juros": 1.66,
                                        "valor_total_contrato": 2000.0
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
    }

def test_tabelas_facta(base_session):
    reply = processar_comando_simulacao(base_session, "tabelas facta", "")
    assert "Outras Tabelas para Facta" in reply
    # 84X presented should be removed
    assert "96x" in reply
    assert "108x" in reply
    assert "84x" not in reply

def test_tabelas_84x_facta_apresentada(base_session):
    # As the 84X is the presented one, and there are no other 84X tables, it should say no other tables
    reply = processar_comando_simulacao(base_session, "tabelas 84x facta", "")
    assert "Não encontrei outras tabelas de 84 meses da Facta" in reply
    assert "Prazos disponíveis: 96X e 108X" in reply

def test_tabelas_96x_facta(base_session):
    reply = processar_comando_simulacao(base_session, "tabelas 96x facta", "")
    assert "Outras Tabelas para Facta" in reply
    assert "96x" in reply
    assert "108x" not in reply

def test_tabelas_108x_facta(base_session):
    reply = processar_comando_simulacao(base_session, "tabelas 108 facta", "")
    assert "Outras Tabelas para Facta" in reply
    assert "108x" in reply

def test_tabelas_prazo_indisponivel(base_session):
    # Change the alternative tables to only have 84 and 96
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabelas_alternativas"].pop() # removes 108
    reply = processar_comando_simulacao(base_session, "tabelas 108x facta", "")
    assert "Não encontrei outras tabelas de 108 meses da Facta" in reply
    assert "Prazos disponíveis: 96X" in reply

def test_daycoval(base_session):
    reply = processar_comando_simulacao(base_session, "daycoval", "")
    assert "OFERTA SELECIONADA: DAYCOVAL" in reply
    assert "DAYCOVAL REFIN" in reply

def test_tabelas_daycoval(base_session):
    reply = processar_comando_simulacao(base_session, "tabelas daycoval", "")
    assert "Outras Tabelas para DAYCOVAL" in reply
    assert "84x" in reply

def test_regras_facta(base_session):
    reply = processar_comando_simulacao(base_session, "regras facta", "")
    assert reply is None # Should be handled by rules interceptor

def test_multiple_contracts(base_session):
    # Add another contract
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"].append({
        "indice_contrato": 2,
        "banco_recomendado": "Facta",
        "tabelas_alternativas": [{"banco": "Facta", "prazo": 84, "tabela": "TESTE"}]
    })
    
    reply = processar_comando_simulacao(base_session, "tabelas facta", "")
    assert "🏦 *Encontrei ofertas do FACTA para mais de um contrato.*" in reply
    assert "📋 *Qual opção deseja consultar?*" in reply
    assert "*1 - Benefício 1 / Contrato 1*" in reply
    assert "*2 - Benefício 1 / Contrato 2*" in reply
    assert "Responda apenas com o número da opção desejada. 👩🏻💻" in reply

def test_multiple_contracts_with_b1_c1(base_session):
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"].append({
        "indice_contrato": 2,
        "banco_recomendado": "Facta",
        "tabelas_alternativas": [{"banco": "Facta", "prazo": 84, "tabela": "TESTE"}]
    })
    
    reply = processar_comando_simulacao(base_session, "tabelas facta b1 c2", "")
    assert "Outras Tabelas para Facta" in reply
    assert "TESTE" in reply

def test_possui_ofertas_false():
    session = {"ultima_simulacao": {"possui_ofertas": False}}
    reply = processar_comando_simulacao(session, "tabelas facta", "")
    assert reply == "Nenhuma oferta disponível nesta simulação."

def test_aliased_values(base_session):
    # Modifica a melhor oferta para usar a chave "parcela" e "troco" em string
    icred_offer = {
        "banco": "ICRED",
        "tabela": "TABELA FLEX 4",
        "parcela": "R$ 340,10",
        "prazo": 108,
        "novo_contrato": "15.470,34",
        "saldo_devedor": "15349.99",
        "taxa": "1,71",
        "troco": "R$ 120,35"
    }
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["melhor_oferta"] = icred_offer
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabelas_alternativas"] = [icred_offer]
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabela_apresentada"] = "NOVA"
    # Para o comando funcionar, precisamos que o banco recomendado seja ICRED
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["banco_recomendado"] = "ICRED"
    
    reply = processar_comando_simulacao(base_session, "icred", "")
    
    assert "*Nova Parcela:* R$ 340.10" in reply or "*Valor da Parcela:* R$ 340.10" in reply
    assert "*Novo Contrato:* R$ 15470.34" in reply
    assert "*Taxa:* 1.71%" in reply or "*Taxa do Refin:* 1.71%" in reply
    assert "*Troco:* R$ 120.35" in reply or "VALOR DO TROCO ESTIMADO LIBERADO: R$ 120.35" in reply


def test_happy_retorna_oferta_e_nao_tabelas(base_session):
    # D: HAPPY retornar melhor oferta e não tabelas
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["ofertas_por_banco"] = {
        "HAPPY": [
            {
                "banco": "HAPPY",
                "tabela": "HAPPY REFIN",
                "prazo": 84,
                "valor_liberado": 900.0,
                "valor_parcela": 150.0,
                "taxa_juros": 1.66
            }
        ]
    }
    reply = processar_comando_simulacao(base_session, "happy", "")
    assert "OFERTA SELECIONADA: HAPPY" in reply
    assert "Deseja ver *outras tabelas*" in reply

def test_tabelas_108x_somente_prazo_108(base_session):
    # E: TABELAS 108X retornar somente prazo 108
    # Adicionar tabelas com múltiplos prazos e verificar que apenas o de 108 é listado
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabelas_alternativas"] = [
        {"banco": "Facta", "tabela": "T1", "prazo": 84, "valor_liberado": 100.0, "valor_parcela": 10.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T2", "prazo": 96, "valor_liberado": 200.0, "valor_parcela": 20.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T3", "prazo": 108, "valor_liberado": 300.0, "valor_parcela": 30.0, "taxa_juros": 1.5},
    ]
    # Forçar tabela_apresentada diferente para não remover T3
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabela_apresentada"] = "OUTRA"
    
    reply = processar_comando_simulacao(base_session, "tabelas 108x facta", "")
    assert "T3" in reply
    assert "T1" not in reply
    assert "T2" not in reply

def test_tabelas_96x_somente_prazo_96(base_session):
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabelas_alternativas"] = [
        {"banco": "Facta", "tabela": "T1", "prazo": 84, "valor_liberado": 100.0, "valor_parcela": 10.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T2", "prazo": 96, "valor_liberado": 200.0, "valor_parcela": 20.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T3", "prazo": 108, "valor_liberado": 300.0, "valor_parcela": 30.0, "taxa_juros": 1.5},
    ]
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabela_apresentada"] = "OUTRA"
    
    reply = processar_comando_simulacao(base_session, "tabelas 96x facta", "")
    assert "T2" in reply
    assert "T1" not in reply
    assert "T3" not in reply

def test_tabelas_84x_somente_prazo_84(base_session):
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabelas_alternativas"] = [
        {"banco": "Facta", "tabela": "T1", "prazo": 84, "valor_liberado": 100.0, "valor_parcela": 10.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T2", "prazo": 96, "valor_liberado": 200.0, "valor_parcela": 20.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T3", "prazo": 108, "valor_liberado": 300.0, "valor_parcela": 30.0, "taxa_juros": 1.5},
    ]
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabela_apresentada"] = "OUTRA"
    
    reply = processar_comando_simulacao(base_session, "tabelas 84x facta", "")
    assert "T1" in reply
    assert "T2" not in reply
    assert "T3" not in reply

def test_multiplos_contratos_lista_numerada(base_session):
    # D & G: múltiplos contratos retornam lista numerada
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"].append({
        "indice_contrato": 2,
        "banco_recomendado": "Facta",
        "tabelas_alternativas": [{"banco": "Facta", "prazo": 84, "tabela": "TESTE"}]
    })
    reply = processar_comando_simulacao(base_session, "facta", "")
    assert "🏦 *Encontrei ofertas do FACTA para mais de um contrato.*" in reply
    assert "📋 *Qual opção deseja consultar?*" in reply
    assert "*1 - Benefício 1 / Contrato 1*" in reply
    assert "*2 - Benefício 1 / Contrato 2*" in reply
    assert "Responda apenas com o número da opção desejada. 👩🏻💻" in reply

def test_multiple_contracts_three_options(base_session):
    # Add second contract
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"].append({
        "indice_contrato": 2,
        "banco_recomendado": "Facta",
        "tabelas_alternativas": [{"banco": "Facta", "prazo": 84, "tabela": "TESTE"}]
    })
    # Add third contract
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"].append({
        "indice_contrato": 3,
        "banco_recomendado": "Facta",
        "tabelas_alternativas": [{"banco": "Facta", "prazo": 84, "tabela": "TESTE"}]
    })
    
    reply = processar_comando_simulacao(base_session, "facta", "")
    assert "🏦 *Encontrei ofertas do FACTA para mais de um contrato.*" in reply
    assert "*1 - Benefício 1 / Contrato 1*" in reply
    assert "*2 - Benefício 1 / Contrato 2*" in reply
    assert "*3 - Benefício 1 / Contrato 3*" in reply
    assert "Responda apenas com o número da opção desejada. 👩🏻💻" in reply

def test_selecao_posterior_1_ou_2(base_session):
    # D & G: seleção posterior por 1 ou 2 após intenção pendente
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"].append({
        "indice_contrato": 2,
        "banco_recomendado": "Facta",
        "tabelas_alternativas": [{"banco": "Facta", "prazo": 84, "tabela": "TESTE"}]
    })
    # Primeiro chama e armazena pendência
    reply_init = processar_comando_simulacao(base_session, "facta", "")
    assert "pending_intent" in base_session
    
    # Simula resposta "2"
    reply_choice = processar_comando_simulacao(base_session, "2", "")
    assert "OFERTA SELECIONADA" in reply_choice or "Outras Tabelas" in reply_choice

def test_selecao_b1_c1(base_session):
    # G: seleção por B1 C1
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"].append({
        "indice_contrato": 2,
        "banco_recomendado": "Facta",
        "tabelas_alternativas": [{"banco": "Facta", "prazo": 84, "tabela": "TESTE"}]
    })
    # Primeiro chama e armazena pendência
    reply_init = processar_comando_simulacao(base_session, "facta", "")
    assert "pending_intent" in base_session
    
    # Simula resposta "b1 c1"
    reply_choice = processar_comando_simulacao(base_session, "b1 c1", "")
    assert "OFERTA SELECIONADA" in reply_choice or "Outras Tabelas" in reply_choice

def test_regras_facta_continua_funcionando(base_session):
    # B: regras facta deve retornar None para ser processado pelas regras comerciais gerais
    reply = processar_comando_simulacao(base_session, "regras facta", "")
    assert reply is None

def test_valores_financeiros_nao_retornam_zero(base_session):
    # F: valores financeiros não devem retornar zero e devem aceitar aliases antigos/novos
    icred_offer = {
        "banco_normalizado": "ICRED",
        "tabela_normalizada": "TABELA FLEX 4",
        "valor_parcela": "R$ 340,10",
        "prazo_normalizado": 108,
        "valor_novo_contrato": "15.470,34",
        "saldo": "15349.99",
        "taxa_refin": "1,71",
        "valor_troco": "R$ 120,35"
    }
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["melhor_oferta"] = icred_offer
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabelas_alternativas"] = [icred_offer]
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabela_apresentada"] = "NOVA"
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["banco_recomendado"] = "ICRED"
    
    reply = processar_comando_simulacao(base_session, "icred", "")
    
    assert "R$ 340.10" in reply
    assert "R$ 15470.34" in reply
    assert "1.71%" in reply
    assert "R$ 120.35" in reply

def test_ordenacao_menor_troco(base_session):
    # E: ordenação pelo menor troco
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabelas_alternativas"] = [
        {"banco": "Facta", "tabela": "T3", "prazo": 108, "valor_liberado": 500.0, "valor_parcela": 50.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T1", "prazo": 108, "valor_liberado": 100.0, "valor_parcela": 10.0, "taxa_juros": 1.5},
        {"banco": "Facta", "tabela": "T2", "prazo": 108, "valor_liberado": 300.0, "valor_parcela": 30.0, "taxa_juros": 1.5},
    ]
    base_session["ultima_simulacao"]["beneficios"][0]["contratos"][0]["tabela_apresentada"] = "OUTRA"
    
    reply = processar_comando_simulacao(base_session, "tabelas 108x facta", "")
    
    # A primeira listada deve ser T1 (troco 100), depois T2 (troco 300), depois T3 (troco 500)
    pos_t1 = reply.index("T1")
    pos_t2 = reply.index("T2")
    pos_t3 = reply.index("T3")
    assert pos_t1 < pos_t2 < pos_t3

def test_contagem_tabelas_no_prazo_oferta_principal(base_session):
    # A: contagem de tabelas somente no prazo da oferta principal (na compatibilidade antiga)
    old_session = {
        "simulations": [
            {
                "b_idx": 1,
                "c_idx": 1,
                "ofertas": [
                    {"banco": "Facta", "tabela": "T1", "prazo": 84, "valor_liberado": 100.0, "valor_parcela": 10.0, "taxa_juros": 1.5, "valor_total_contrato": 1000},
                    {"banco": "Facta", "tabela": "T2", "prazo": 96, "valor_liberado": 200.0, "valor_parcela": 20.0, "taxa_juros": 1.5, "valor_total_contrato": 2000},
                ]
            }
        ]
    }
    reply = processar_comando_simulacao(old_session, "facta", "")
    # Deve contar apenas a tabela do prazo da oferta principal (T2, prazo 96) -> 1 tabela
    assert "1 tabela(s) de 96 meses da Facta disponível(is)" in reply
