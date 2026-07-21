from importlib.util import (
    module_from_spec,
    spec_from_file_location,
)
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "services"
    / "consultas"
    / "siape_normalizer.py"
)

spec = spec_from_file_location(
    "siape_normalizer_under_test",
    MODULE_PATH,
)

if spec is None or spec.loader is None:
    raise RuntimeError(
        f"Não foi possível carregar: {MODULE_PATH}"
    )

siape = module_from_spec(spec)
spec.loader.exec_module(siape)


def build_response():
    return {
        "Cadastro": {
            "Nome": "CLIENTE TESTE",
            "CPF": "71360123334",
            "Matricula": "5504414",
            "RegimeJuridico": "NES",
            "Orgao": "40806",
            "Instituto": "849251",
            "DataNascimento": "1976-09-18",
            "NomeMae": "MAE DO CLIENTE",
            "DadosBancarios": {
                "Banco": "104",
                "Agencia": "04647-7",
                "NumConta": "000100020885-7",
            },
            "Endereco": {
                "Logradouro": "RUA TESTE 100",
                "Bairro": "CENTRO",
                "Municipio": "FORTALEZA",
                "UF": "CE",
            },
            "ResumoFinanceiro": {
                "Bruto": "25683.80",
                "ValorLiquido": "19700.60",
                "Desconto": "5983.20",
                "Margem": "856.12",
            },
            "Telefone": [
                "85987834733",
                "85999849332",
            ],
        },
        "RMC": {
            "Margem": "856.12",
        },
        "RCC": {
            "Margem": "756.12",
        },
        "Emprestimos": [
            {
                "IdBanco": 104,
                "Rubrica": "CAIXA ECONOMICA FEDERAL",
                "Contrato": "000000000013735098",
                "Parcela": "381.04",
                "PrazoRestantes": 75,
                "SaldoDevedor": 0,
            },
            {
                "IdBanco": 623,
                "Rubrica": "BANCO PAN",
                "Contrato": "05464711000062350",
                "Parcela": "250.15",
                "PrazoRestantes": 17,
                "SaldoDevedor": "3500.50",
            },
        ],
    }


def test_normaliza_dados_siape():
    result = siape.normalize_siape_response(
        build_response()
    )

    assert result["convenio"] == "SIAPE"

    assert result["cliente"]["nome"] == "CLIENTE TESTE"
    assert result["cliente"]["beneficio"] == "5504414"
    assert result["cliente"]["filiacao"] == "MAE DO CLIENTE"

    assert result["beneficio"]["matricula"] == "5504414"
    assert result["beneficio"]["regime_juridico"] == "NES"
    assert result["beneficio"]["orgao"] == "40806"
    assert result["beneficio"]["instituto"] == "849251"

    assert result["margens"]["salario_bruto"] == 25683.80
    assert result["margens"]["valor_liquido"] == 19700.60
    assert result["margens"]["descontos"] == 5983.20
    assert result["margens"]["margem_disponivel"] == 856.12
    assert result["margens"]["margem_livre"] == 856.12

    assert result["margens_cartao"] == {
        "rmc_disponivel": 856.12,
        "rcc_disponivel": 756.12,
    }

    assert result["cartoes"] == []
    assert len(result["emprestimos"]) == 2


def test_calcula_saldo_siape_com_taxa_fixa():
    result = siape.normalize_siape_response(
        build_response()
    )

    calculated_loan = result["emprestimos"][0]
    informed_loan = result["emprestimos"][1]

    assert calculated_loan["saldo_devedor"] > 0
    assert calculated_loan["quitacao"] > 0
    assert calculated_loan["taxa"] == 1.50
    assert calculated_loan["taxa_saldo_devedor"] == 1.50

    # Quando a API informa saldo maior que zero,
    # o valor retornado é preservado.
    assert informed_loan["saldo_devedor"] == 3500.50
    assert informed_loan["quitacao"] == 3500.50


def test_ignora_emprestimos_inativos():
    raw = build_response()

    raw["Emprestimos"].extend(
        [
            {
                "IdBanco": 1,
                "Rubrica": "SEM PARCELA",
                "Contrato": "INATIVO-1",
                "Parcela": 0,
                "PrazoRestantes": 50,
                "SaldoDevedor": 1000,
            },
            {
                "IdBanco": 2,
                "Rubrica": "SEM PRAZO",
                "Contrato": "INATIVO-2",
                "Parcela": 100,
                "PrazoRestantes": 0,
                "SaldoDevedor": 1000,
            },
        ]
    )

    result = siape.normalize_siape_response(raw)

    contratos = {
        item["contrato"]
        for item in result["emprestimos"]
    }

    assert "INATIVO-1" not in contratos
    assert "INATIVO-2" not in contratos
    assert len(result["emprestimos"]) == 2


def test_separa_telefones_siape():
    raw = build_response()

    raw["Cadastro"]["Telefone"] = (
        "85987834733/85999849332;8533334444"
    )

    result = siape.normalize_siape_response(raw)

    assert result["telefones"] == [
        "85987834733",
        "85999849332",
        "8533334444",
    ]
