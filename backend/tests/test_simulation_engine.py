import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../engine')))

from simulation_engine import simular_operacao, executar_simulacao_completa
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../app')))
from models.models import SimulacaoInput

def test_executar_simulacao_completa():
    # Create a typical input
    in_data = SimulacaoInput(
        idade=65,
        tipo_beneficio="INSS",
        banco_atual="Banco Fictício Antigo",
        parcela=450.00,
        saldo_devedor=15000.00,
        taxa_atual=1.80
    )
    
    # Assuming banks_db provides at least 1 valid alternative for 1.80% -> e.g 1.65%
    resultados = executar_simulacao_completa(in_data)
    
    # We expect a list of BancoAprovado models (or dicts relying on Pydantic serialization)
    assert isinstance(resultados, list)
    
    # If there are results, verify their structure
    if len(resultados) > 0:
        melhor_opcao = resultados[0]
        # In Pydantic v2 it might be a model, check attributes
        is_dict = isinstance(melhor_opcao, dict)
        taxa = melhor_opcao['taxa_juros'] if is_dict else melhor_opcao.taxa_juros
        valor_liberado = melhor_opcao['valor_liberado'] if is_dict else melhor_opcao.valor_liberado
        
        # The new rate must be strictly less than the current rate to make sense for portabilidade
        assert taxa < 1.80
        # Troco released must be positive if eligible
        assert valor_liberado > 0
