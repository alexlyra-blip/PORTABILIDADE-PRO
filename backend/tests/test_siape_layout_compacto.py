import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "services"
    / "extratos"
    / "siape_parser.py"
)

SPEC = importlib.util.spec_from_file_location(
    "siape_parser_layout_compacto",
    MODULE_PATH,
)

if SPEC is None or SPEC.loader is None:
    raise RuntimeError(
        "Não foi possível carregar o parser SIAPE."
    )

siape_parser = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(siape_parser)


EXTRATO_COMPACTO = """
Extrato de Consignações Vigentes
Órgão CPF Matrícula Nome
40806 - ORGAO TESTE 000.000.000-00 100002/0000000 CLIENTE TESTE
Bruta Compulsória Líquida Comp. Bruta Facult. Global (*)
Líquida Facult. Global (*) Bruta Cartão Líquida Cartão
Bruta Cartão Benefício Líquida Cartão Benefício
R$ 30.295,99 R$ 3.912,75 R$ 17.311,99 R$ 0,64
R$ 2.163,99 R$ 0,64 R$ 2.163,99 R$ 0,49
Utilizada Facultativa Utilizada Cartão Utilizada Cartão Benefício
(*) Dentro do limite Global.
Cartão Benefício. R$ 15.147,85 R$ 0,00 R$ 2.163,50

Demonstrativo de uso da margem / Novo Contrato e Renovação
Número do Contrato Rubrica Sequência Prioridade Transação
Data/Hora Parcela Valor da Parcela Inicio Fim
C001 34113 - EMPREST BCO OFICIAL - CEF 1 10
19/03/2026 12:10:55 02/96 R$ 472,00 04/2026 03/2034

Demonstrativo de uso da margem - Cartão Consignado de Benefício
Número do Contrato Rubrica Sequência Prioridade Transação
Data/Hora Parcela Valor da Parcela Inicio Fim
K001 35007 - AMORT CARTAO BENEFICIO CLICKBANK 1 13
28/03/2025 17:03:11 14/96 R$ 672,91 04/2025 03/2033

Extrato para simples verificação.
"""


class TestSiapeLayoutCompacto(unittest.TestCase):
    def test_extrai_margens_do_layout_compacto(self):
        resultado = siape_parser.parse_siape_extrato(
            EXTRATO_COMPACTO
        )

        margens = resultado["margens"]

        self.assertEqual(
            margens["bruta_facultativa_global"],
            17311.99,
        )
        self.assertEqual(
            margens["liquida_facultativa_global"],
            0.64,
        )
        self.assertEqual(
            margens["utilizada_facultativa"],
            15147.85,
        )
        self.assertEqual(
            margens["bruta_cartao"],
            2163.99,
        )
        self.assertEqual(
            margens["liquida_cartao"],
            0.64,
        )
        self.assertEqual(
            margens["utilizada_cartao"],
            0.00,
        )
        self.assertEqual(
            margens["bruta_cartao_beneficio"],
            2163.99,
        )
        self.assertEqual(
            margens["liquida_cartao_beneficio"],
            0.49,
        )
        self.assertEqual(
            margens["utilizada_cartao_beneficio"],
            2163.50,
        )


if __name__ == "__main__":
    unittest.main()
