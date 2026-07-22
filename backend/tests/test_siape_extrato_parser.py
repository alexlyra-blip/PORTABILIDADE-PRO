import pytest

import importlib.util
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "services"
    / "extratos"
    / "siape_parser.py"
)

spec = importlib.util.spec_from_file_location(
    "siape_parser",
    MODULE_PATH,
)

if spec is None or spec.loader is None:
    raise RuntimeError(
        "Não foi possível carregar o parser SIAPE."
    )

siape_parser = importlib.util.module_from_spec(
    spec
)

spec.loader.exec_module(
    siape_parser
)

calcular_saldo_devedor = (
    siape_parser.calcular_saldo_devedor
)

detectar_extrato_siape = (
    siape_parser.detectar_extrato_siape
)

parse_siape_extrato = (
    siape_parser.parse_siape_extrato
)


LOANS = [
    ("C001", "02", "472,00"),
    ("C002", "01", "1.250,00"),
    ("C003", "01", "2.483,00"),
    ("C004", "01", "1.047,30"),
    ("C005", "01", "713,29"),
    ("C006", "01", "2.078,60"),
    ("C007", "01", "299,95"),
    ("C008", "01", "557,41"),
    ("C009", "01", "4.132,50"),
    ("C010", "01", "345,00"),
    ("C011", "01", "160,00"),
    ("C012", "01", "152,00"),
    ("C013", "01", "113,44"),
    ("C014", "01", "478,16"),
    ("C015", "01", "412,00"),
    ("C016", "01", "69,50"),
    ("C017", "01", "330,00"),
    ("C018", "01", "53,70"),
]

CARDS = [
    ("K001", "672,91"),
    ("K002", "476,35"),
    ("K003", "241,24"),
    ("K004", "245,00"),
    ("K005", "480,00"),
    ("K006", "48,00"),
]


def statement() -> str:
    loans = "\n".join(
        f"{contract} 34113 - EMPREST BCO OFICIAL - CEF "
        f"{index} 10 19/03/2026 12:10:55 {current}/96 "
        f"R$ {value} 04/2026 03/2034"
        for index, (contract, current, value) in enumerate(LOANS, 1)
    )
    cards = "\n".join(
        f"{contract} 35007 - AMORT CARTAO BENEFICIO CLICKBANK "
        f"{index} 13 28/03/2025 17:03:11 01/96 "
        f"R$ {value} 04/2025 03/2033"
        for index, (contract, value) in enumerate(CARDS, 1)
    )
    return f"""
Órgão CPF Matrícula Nome
40806 - ORGAO DE TESTE 000.000.000-00 000000/0000000 CLIENTE TESTE
Bruta Compulsória Líquida Compulsória Bruta Facult. Global (*)
Líquida Facult. Global (*) Bruta Cartão Líquida Cartão
Utilizada Facultativa Utilizada Cartão
R$ 30.295,99 R$ 3.912,75 R$ 17.311,99 R$ 0,64
R$ 2.163,99 R$ 0,64 R$ 15.147,85 R$ 0,00
Extrato de Consignações Vigentes
Bruta Cartão Benefício R$ 2.163,99
Líquida Cartão Benefício R$ 0,49
Utilizada Cartão Benefício R$ 2.163,50
(*) Dentro do limite Global.
Demonstrativo de uso da margem / Novo Contrato e Renovação
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela
Valor da Parcela Inicio Fim
{loans}
Demonstrativo de uso da margem - Cartão Consignado de Benefício
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela
Valor da Parcela Inicio Fim
{cards}
Extrato para simples verificação.
"""


def test_detecta_e_extrai_siape():
    result = parse_siape_extrato(statement())
    assert detectar_extrato_siape(statement()) is True
    assert result["convenio"] == "SIAPE"
    assert result["cliente"] == "CLIENTE TESTE"
    assert result["cpf"] == "000.000.000-00"
    assert len(result["emprestimos_ativos"]) == 18
    assert len(result["cartoes_beneficio"]) == 6


def test_margens_e_validacoes():
    result = parse_siape_extrato(statement())
    margins = result["margens"]
    validations = result["validacoes"]
    assert margins["bruta_facultativa_global"] == 17311.99
    assert margins["utilizada_facultativa"] == 15147.85
    assert margins["liquida_facultativa_global"] == 0.64
    assert margins["utilizada_cartao_beneficio"] == 2163.50
    assert validations["soma_parcelas_emprestimos"] == 15147.85
    assert validations["emprestimos_conferem_com_margem"] is True
    assert validations["soma_parcelas_cartao_beneficio"] == 2163.50
    assert validations["cartoes_conferem_com_margem"] is True
    assert validations["margem_global_calculada"] == 0.64
    assert validations["margem_global_confere"] is True


def test_contrato_e_saldo_estimado():
    loan = parse_siape_extrato(statement())["emprestimos_ativos"][0]
    assert loan["contrato"] == "C001"
    assert loan["banco"] == "CEF"
    assert loan["parcela"] == 472.00
    assert loan["parcela_atual"] == 2
    assert loan["prazo_total"] == 96
    assert loan["prazo_restante"] == 94
    assert loan["taxa_mensal"] == 1.60
    assert loan["valor_contrato"] is None
    assert loan["saldo_devedor"] == 22865.42
    assert loan["saldo_devedor_estimado"] is True


def test_formula_e_documento_invalido():
    assert calcular_saldo_devedor(472.00, 94, 1.60) == 22865.42
    with pytest.raises(ValueError, match="não foi identificado"):
        parse_siape_extrato("Documento sem conteúdo SIAPE")
