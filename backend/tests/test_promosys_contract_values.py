from app.schemas.consultas import ConsultaEmprestimo
from app.services.consultas.promosys_provider import (
    normalize_promosys_contract_values,
    safe_float,
)


def test_safe_float_aceita_valor_brasileiro():
    assert safe_float("23.877,58") == 23877.58
    assert safe_float("R$ 7.453,94") == 7453.94


def test_normaliza_valores_padrao_promosys():
    result = normalize_promosys_contract_values({
        "QUITACAOATUAL": "7.453,94",
        "ValorLiberado": "10.000,00",
        "Vl_Emprestimo": "12.500,00",
    })

    assert result["quitacao"] == 7453.94
    assert result["saldo_devedor"] == 7453.94
    assert result["valor_liberado"] == 10000.00
    assert result["valor_contrato"] == 12500.00


def test_normaliza_nomes_alternativos():
    result = normalize_promosys_contract_values({
        "SaldoDevedor": "1,989.67",
        "ValorOriginal": "5,000.00",
    })

    assert result["quitacao"] == 1989.67
    assert result["saldo_devedor"] == 1989.67
    assert result["valor_contrato"] == 5000.00


def test_valor_contrato_nao_faz_fallback_para_valor_liberado():
    result = normalize_promosys_contract_values({
        "ValorLiberado": "8.500,00",
        "QUITACAOATUAL": "6.200,00",
    })

    assert result["valor_contrato"] == 0.0
    assert result["valor_liberado"] == 8500.00
    assert result["saldo_devedor"] == 6200.00
    assert result["quitacao"] == 6200.00


def test_schema_preserva_saldo_devedor():
    loan = ConsultaEmprestimo(
        quitacao=7453.94,
        saldo_devedor=7453.94,
        valor_contrato=12500.00,
    )

    assert loan.saldo_devedor == 7453.94
    assert loan.valor_contrato == 12500.00
