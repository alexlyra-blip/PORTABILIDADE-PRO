import pytest
from app.routers.pdf_extractor import parse_currency, parse_rate, calcular_taxa

def test_parse_rate():
    assert parse_rate("1.85") == 1.85
    assert parse_rate("1,85") == 1.85
    assert parse_rate("1.85%") == 1.85
    assert parse_rate(" 1.85 % ") == 1.85
    assert parse_rate("185") == 1.85
    assert parse_rate("185.00") == 1.85
    assert parse_rate("185.00%") == 1.85
    assert parse_rate("0.0185") == 1.85
    assert parse_rate("2.02") == 2.02
    assert parse_rate("2,02") == 2.02
    assert parse_rate("1.97") == 1.97
    assert parse_rate("") == 0.0
    assert parse_rate(None) == 0.0

def test_parse_currency():
    assert parse_currency("R$244,01") == 244.01
    assert parse_currency("R$ 244,01") == 244.01
    assert parse_currency("244.01") == 244.01
    assert parse_currency("R$11.031,16") == 11031.16
    assert parse_currency("11031.16") == 11031.16
    assert parse_currency("R$10.659,85") == 10659.85
    assert parse_currency("10659.85") == 10659.85
    assert parse_currency("R$371,31") == 371.31
    assert parse_currency("R$0,00") == 0.0
    assert parse_currency("0.00") == 0.0
    assert parse_currency("") == 0.0
    assert parse_currency(None) == 0.0

def test_calcular_taxa():
    # Com valor liberado 10659.85, 108 meses, parcela 244.01
    taxa_lib = calcular_taxa(10659.85, 244.01, 108)
    assert round(taxa_lib, 2) == 2.03

    # Com valor emprestado 11031.16, 108 meses, parcela 244.01
    taxa_emp = calcular_taxa(11031.16, 244.01, 108)
    assert round(taxa_emp, 2) == 1.93


def test_loan_row_qi_sociedade_calculation():
    import math, re
    from datetime import datetime

    row = ['0370335502ZDL', '329 QI SOCIEDADE DE CREDITO DIRETO S A', 'Ativo', '', '05/06/2026', '07/2026', '06/2035', '108', 'R$244,01', 'R$11.031,16', 'R$10.659,85', 'R$371,31', '1.97', '26.33', '1.85', '24.6']
    
    inicio_desconto = row[5]
    prazo_total = int(re.sub(r'\D', '', row[7]))
    parcela = parse_currency(row[8])
    taxa_mensal = parse_rate(row[14])
    valor_emprestado = parse_currency(row[9])
    valor_liberado = parse_currency(row[10])

    assert taxa_mensal == 1.85
    assert parcela == 244.01
    assert valor_emprestado == 11031.16
    assert valor_liberado == 10659.85

    # Data do extrato: 21/09/2026
    ref_date = datetime.strptime("21/09/2026", "%d/%m/%Y")
    mes, ano = map(int, re.match(r'(\d{2})/(\d{4})', inicio_desconto).groups())
    meses_pagos = (ref_date.year - ano) * 12 + (ref_date.month - mes)
    prazo_restante = max(0, prazo_total - meses_pagos)

    assert prazo_restante == 106

    taxa_dec = taxa_mensal / 100.0
    saldo_devedor = parcela * ((1 - math.pow(1 + taxa_dec, -prazo_restante)) / taxa_dec)
    assert round(saldo_devedor, 2) == 11300.15

