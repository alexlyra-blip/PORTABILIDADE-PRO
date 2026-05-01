import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../engine')))

from financial_engine import calcular_parcela_price, calcular_saldo_devedor_aproximado, calcular_valor_financiado

def test_calcular_parcela_price():
    # Testting basic PMT calculation
    valor_financiado = 10000.0
    taxa_juros = 1.5 / 100
    prazo = 84
    
    parcela = calcular_parcela_price(valor_financiado, taxa_juros, prazo)
    
    # Based on PRICE formula: PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
    # The value should be roughly 211.23
    assert round(parcela, 2) == 211.23

def test_calcular_valor_financiado():
    # Reverse of PMT calculation
    parcela = 211.23
    taxa_juros = 1.5 / 100
    prazo = 84
    
    pv = calcular_valor_financiado(parcela, taxa_juros, prazo)
    assert round(pv, 2) == 10000.17 # Float precision approximation

def test_calcular_saldo_devedor_aproximado():
    # Testing approximate debt balance
    parcela = 211.23
    taxa_contrato = 1.5 / 100
    prazo_restante = 42
    
    saldo = calcular_saldo_devedor_aproximado(parcela, taxa_contrato, prazo_restante)
    # PMT for 42 months at 1.5%
    assert saldo > 0
    assert saldo < 10000.17 # It should be less than the original PV if half paid
