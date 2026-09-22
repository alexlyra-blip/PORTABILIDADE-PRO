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
        self.assertEqual(contrato["banco"], "104 - CAIXA")
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

    def test_extrato_sem_cartao_e_contrato_minusculo(self):
        texto = """
Órgão CPF Matrícula Nome
22200 - COMPANHIA NACIONAL DE ABASTECIMENTO 409.983.124-87 1788533 JOAQUIM MARQUES DA SILVA JUNIOR
Bruta Compulsória Líquida Comp. Bruta Facult. Global (*) Líquida Facult. Global (*) Bruta Cartão Líquida Cartão
Utilizada Facultativa Utilizada Cartão
R$ 11.356,24 R$ 461,73 R$ 6.489,28 R$ 0,00 R$ 811,16 R$ 0,00
R$ 6.746,72 R$ 0,00
Extrato de Consignações Vigentes
Bruta Cartão Benefício R$ 811,16
Líquida Cartão Benefício R$ 0,00
Utilizada Cartão Benefício R$ 0,00

Demonstrativo de uso da margem / Novo Contrato e Renovação
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela Valor da Parcela Inicio Fim
2219 34459 - EMPREST PREV PRIVADA - CIBRIUS 2 8 20/01/2023 11:26:37 43/72 R$ 484,22 02/2023 01/2029
00d3d87e97afb5a 34976 - EMPREST BCO PRIVADOS - NUBANK 3 10 25/08/2025 15:14:20 12/96 R$ 1.013,63 09/2025 08/2033

Demonstrativo de uso da margem / Desconto Sindicato
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela Valor da Parcela Inicio Fim
Y343971-99060Z 34397 - MENSALIDADE SINDICAL - SINDSEP 1 0 09/07/2010 95559 077/999 R$ 162,23 03/2020

Extrato para simples verificação.
"""
        resultado = siape_parser.parse_siape_extrato(texto)
        self.assertEqual(len(resultado["emprestimos_ativos"]), 2)
        self.assertEqual(resultado["emprestimos_ativos"][0]["contrato"], "2219")
        self.assertEqual(resultado["emprestimos_ativos"][1]["contrato"], "00d3d87e97afb5a")
        self.assertEqual(resultado["emprestimos_ativos"][1]["banco"], "NUBANK")
        self.assertEqual(len(resultado["cartoes_beneficio"]), 0)

    def test_extrato_com_cartao_margem_disponivel_zerada(self):
        texto = """
Órgão CPF Matrícula Nome
26248 - UNIVERSIDADE FEDERAL RURAL DE PERNAMBUCO 049.421.884-31 1416216 DANIELLE CRISTINE CAMELO FARIAS
Bruta Compulsória Líquida Comp. Bruta Facult. Global (*) Líquida Facult. Global (*) Bruta Cartão Líquida Cartão
Utilizada Facultativa Utilizada Cartão
R$ 9.627,77 R$ 3,36 R$ 4.813,88 R$ 0,00 R$ 687,69 R$ 3,36
R$ 4.813,88 R$ 161,11
Extrato de Consignações Vigentes
Bruta Cartão Benefício R$ 687,69
Líquida Cartão Benefício R$ 3,36
Utilizada Cartão Benefício R$ 596,66
(*) Dentro do limite Global (bruta e líquida) já estão inseridos os sublimites de Cartão e de Cartão Benefício.

Demonstrativo de uso da margem / Novo Contrato e Renovação
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela Valor da Parcela Inicio Fim
150049110003463069 34113 - EMPREST BCO OFICIAL - CEF 7 10 01/04/2025 15:16:29 18/93 R$ 122,45 04/2025 12/2032

Demonstrativo de uso da margem - Amortização de Despesas / Saques com Cartão de Crédito
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela Valor da Parcela Inicio Fim
1416216262482605 34805 - AMORT CARTAO CREDITO - BMG 1 12 08/04/2026 22:42:27 06/96 R$ 161,11 04/2026 03/2034

Demonstrativo de uso da margem - Cartão Consignado de Benefício
Número do Contrato Rubrica Sequência Prioridade Transação Data/Hora Parcela Valor da Parcela Inicio Fim
1416216262482605B 35013 - AMORT CARTAO BENEFICIO - BMG 1 13 08/04/2026 19:41:36 06/96 R$ 596,66 04/2026 03/2034

Extrato para simples verificação.
"""
        resultado = siape_parser.parse_siape_extrato(texto)
        self.assertEqual(resultado["margem_maxima"], 4813.88)
        self.assertEqual(resultado["margem_comprometida"], 4813.88)
        self.assertEqual(resultado["margem_disponivel"], 0.0)
        self.assertEqual(resultado["margens"]["liquida_facultativa_global"], 0.0)
        self.assertEqual(resultado["validacoes"]["margem_global_confere"], True)


if __name__ == "__main__":
    unittest.main()

