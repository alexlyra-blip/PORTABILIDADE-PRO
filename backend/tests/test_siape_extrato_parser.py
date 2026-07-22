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
    "siape_parser",
    MODULE_PATH,
)

if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Não foi possível carregar o parser SIAPE.")

siape_parser = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(siape_parser)


def montar_extrato() -> str:
    return """
Órgão CPF Matrícula Nome
40806 - ORGAO TESTE 000.000.000-00 000000/0000000 CLIENTE TESTE

Bruta Compulsória Líquida Compulsória Bruta Facult. Global (*)
Líquida Facult. Global (*) Bruta Cartão Líquida Cartão
Utilizada Facultativa Utilizada Cartão
R$ 1.000,00 R$ 100,00 R$ 700,00 R$ 50,00
R$ 100,00 R$ 0,00 R$ 550,00 R$ 0,00

Extrato de Consignações Vigentes
Bruta Cartão Benefício R$ 100,00
Líquida Cartão Benefício R$ 50,00
Utilizada Cartão Benefício R$ 100,00
(*) Dentro do limite Global.

Demonstrativo de uso da margem / Novo Contrato e Renovação
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela
Valor da Parcela Inicio Fim
C001 34113 - EMPREST BCO OFICIAL - CEF 1 10 19/03/2026 12:10:55 02/96 R$ 550,00 04/2026 03/2034

Demonstrativo de uso da margem - Cartão Consignado de Benefício
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela
Valor da Parcela Inicio Fim
K001 35007 - AMORT CARTAO BENEFICIO CLICKBANK 1 13 28/03/2025 17:03:11 01/96 R$ 100,00 04/2025 03/2033

Extrato para simples verificação.
"""


class TestSiapeExtratoParser(unittest.TestCase):
    def test_detecta_e_extrai_documento(self):
        texto = montar_extrato()

        self.assertTrue(
            siape_parser.detectar_extrato_siape(texto)
        )

        resultado = siape_parser.parse_siape_extrato(texto)

        self.assertEqual(resultado["convenio"], "SIAPE")
        self.assertEqual(resultado["cliente"], "CLIENTE TESTE")
        self.assertEqual(resultado["cpf"], "000.000.000-00")
        self.assertEqual(
            resultado["matricula"],
            "000000/0000000",
        )
        self.assertEqual(
            len(resultado["emprestimos_ativos"]),
            1,
        )
        self.assertEqual(
            len(resultado["cartoes_beneficio"]),
            1,
        )

    def test_margens_e_contrato(self):
        resultado = siape_parser.parse_siape_extrato(
            montar_extrato()
        )

        margens = resultado["margens"]
        contrato = resultado["emprestimos_ativos"][0]

        self.assertEqual(
            margens["bruta_facultativa_global"],
            700.00,
        )
        self.assertEqual(
            margens["utilizada_facultativa"],
            550.00,
        )
        self.assertEqual(
            margens["liquida_facultativa_global"],
            50.00,
        )
        self.assertEqual(contrato["contrato"], "C001")
        self.assertEqual(contrato["banco"], "CEF")
        self.assertEqual(contrato["parcela"], 550.00)
        self.assertEqual(contrato["parcela_atual"], 2)
        self.assertEqual(contrato["prazo_total"], 96)
        self.assertEqual(contrato["prazo_restante"], 94)
        self.assertEqual(contrato["taxa_mensal"], 1.60)
        self.assertIsNone(contrato["valor_contrato"])
        self.assertTrue(
            contrato["saldo_devedor_estimado"]
        )

    def test_formula_e_documento_invalido(self):
        saldo = siape_parser.calcular_saldo_devedor(
            550.00,
            94,
            1.60,
        )

        self.assertEqual(saldo, 26644.03)

        with self.assertRaisesRegex(
            ValueError,
            "não foi identificado",
        ):
            siape_parser.parse_siape_extrato(
                "Documento sem conteúdo SIAPE"
            )


if __name__ == "__main__":
    unittest.main()
