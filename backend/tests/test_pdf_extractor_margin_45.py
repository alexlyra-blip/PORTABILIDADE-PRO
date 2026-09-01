from app.routers.pdf_extractor import (
    normalizar_margens_inss_extrato,
)


def test_extrato_inss_regra_35_5_5():
    result = normalizar_margens_inss_extrato({
        "margem_maxima": 700.00,
        "margem_comprometida": 500.00,
        "emprestimos_ativos": [
            {"parcela": 500.00},
        ],
        "cartoes": [
            {
                "tipo": "Cartao Consignado (RMC)",
                "situacao": "ATIVO",
            },
            {
                "tipo": "Cartao Beneficio (RCC)",
                "situacao": "ATIVO",
            },
        ],
    })

    assert result[
        "margem_emprestimo"
    ] == 700.00

    assert result[
        "margem_total_consignavel"
    ] == 900.00

    assert result[
        "margem_livre"
    ] == 200.00

    assert result[
        "rmc_utilizado"
    ] == 100.00

    assert result[
        "rcc_utilizado"
    ] == 100.00

    assert result[
        "rmc_disponivel"
    ] == 0.00

    assert result[
        "rcc_disponivel"
    ] == 0.00

    assert result[
        "total_comprometido"
    ] == 700.00


def test_extrato_inss_sem_cartoes():
    result = normalizar_margens_inss_extrato({
        "margem_maxima": 700.00,
        "margem_comprometida": 500.00,
        "emprestimos_ativos": [
            {"parcela": 500.00},
        ],
        "cartoes": [],
    })

    assert result[
        "margem_livre"
    ] == 200.00

    assert result[
        "rmc_disponivel"
    ] == 100.00

    assert result[
        "rcc_disponivel"
    ] == 100.00


def test_extrato_inss_margem_negativa():
    result = normalizar_margens_inss_extrato({
        "margem_maxima": 700.00,
        "margem_comprometida": 800.00,
        "emprestimos_ativos": [
            {"parcela": 800.00},
        ],
        "cartoes": [
            {
                "tipo": "RMC",
                "situacao": "ATIVO",
            },
        ],
    })

    assert result[
        "margem_livre"
    ] == -100.00

    assert result[
        "rmc_utilizado"
    ] == 100.00

    assert result[
        "rcc_utilizado"
    ] == 0.00
