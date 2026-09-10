import importlib.util
from pathlib import Path


SERVICE_PATH = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "services"
    / "portabilidade_multipla_service.py"
)

spec = importlib.util.spec_from_file_location(
    "portabilidade_multipla_service_test",
    SERVICE_PATH,
)

module = importlib.util.module_from_spec(spec)

if spec is None or spec.loader is None:
    raise RuntimeError(
        "Nao foi possivel carregar "
        "portabilidade_multipla_service.py"
    )

spec.loader.exec_module(module)

Service = module.PortabilidadeMultiplaFactaService
DaycovalService = module.PortabilidadeMultiplaDaycovalService


def test_exemplo_margem_negativa():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=-80,
        contratos=[
            {
                "banco": "BMG",
                "parcela": 120,
                "saldo_devedor": 4000,
            },
            {
                "banco": "C6",
                "parcela": 95,
                "saldo_devedor": 3000,
            },
            {
                "banco": "PAN",
                "parcela": 85,
                "saldo_devedor": 2500,
            },
            {
                "banco": "SAFRA",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
        ],
    )

    assert result["elegivel_previo"] is True
    assert result["grupo_operacao"] == "A"
    assert result["soma_parcelas"] == 400
    assert result["margem_negativa"] == 80
    assert (
        result["parcela_viabilidade_minima"]
        == 100
    )
    assert result["maior_parcela"] == 120
    assert result["parcela_refin"] == 340


def test_grupo_c_nao_pode_ser_unificado():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "BRB",
                "parcela": 150,
                "saldo_devedor": 5000,
            }
        ],
    )

    assert result["elegivel_previo"] is False
    assert any(
        "Grupo C" in item
        for item in result["bloqueios"]
    )


def test_grupo_a_e_b_nao_podem_misturar():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "BMG",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
            {
                "banco": "Mercantil",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
        ],
    )

    assert result["elegivel_previo"] is False

    assert any(
        "Grupos A e B" in item
        for item in result["bloqueios"]
    )


def test_maximo_seis_contratos():
    contratos = [
        {
            "banco": "BMG",
            "parcela": 100,
            "saldo_devedor": 2000,
        }
        for _ in range(7)
    ]

    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=contratos,
    )

    assert result["elegivel_previo"] is False

    assert any(
        "maximo 6" in item
        for item in result["bloqueios"]
    )


def test_regra_refin_usa_ou():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "parcela": 40,
                "saldo_devedor": 2500,
            }
        ],
        valor_operacao_refin=3500,
    )

    assert (
        result[
            "regra_minimo_refin_atendida"
        ]
        is True
    )

    assert result["elegivel_previo"] is True


def test_refin_reprova_se_nao_atender_nenhum():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "parcela": 20,
                "saldo_devedor": 2500,
            }
        ],
        valor_operacao_refin=2999,
    )

    assert result["parcela_refin"] == 20

    assert (
        result[
            "regra_minimo_refin_atendida"
        ]
        is False
    )

    assert result["elegivel_previo"] is False



def test_permite_contratos_do_mesmo_beneficio():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "1234567890",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
            {
                "banco": "PAN",
                "beneficio": "1234567890",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
        ],
    )

    assert result["elegivel_previo"] is True

    assert (
        result["beneficio_operacao"]
        == "1234567890"
    )


def test_nao_permite_beneficios_diferentes():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "1234567890",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
            {
                "banco": "PAN",
                "beneficio": "9876543210",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
        ],
    )

    assert result["elegivel_previo"] is False

    assert any(
        "beneficios diferentes"
        in bloqueio.lower()
        for bloqueio
        in result["bloqueios"]
    )



def test_intersecao_facta_todos_contratos():
    results = [
        {
            "ofertas": [
                {
                    "banco": "FACTA",
                    "tabela": "FACTA 84",
                    "prazo": 84,
                    "valor_liberado": 1500,
                },
                {
                    "banco": "OUTRO",
                    "tabela": "OUTRA",
                    "prazo": 84,
                    "valor_liberado": 9999,
                },
            ]
        },
        {
            "ofertas": [
                {
                    "banco": "FACTA FINANCEIRA",
                    "tabela": "FACTA 84",
                    "prazo": 84,
                    "valor_liberado": 1400,
                }
            ]
        },
    ]

    offers = (
        module
        .interseccionar_ofertas_facta(
            results
        )
    )

    assert len(offers) == 1

    assert (
        offers[0]["tabela"]
        == "FACTA 84"
    )


def test_intersecao_remove_tabela_nao_comum():
    results = [
        {
            "ofertas": [
                {
                    "banco": "FACTA",
                    "tabela": "FACTA 84",
                    "prazo": 84,
                    "valor_liberado": 1500,
                },
                {
                    "banco": "FACTA",
                    "tabela": "FACTA 96",
                    "prazo": 96,
                    "valor_liberado": 2000,
                },
            ]
        },
        {
            "ofertas": [
                {
                    "banco": "FACTA",
                    "tabela": "FACTA 84",
                    "prazo": 84,
                    "valor_liberado": 1400,
                }
            ]
        },
    ]

    offers = (
        module
        .interseccionar_ofertas_facta(
            results
        )
    )

    assert len(offers) == 1
    assert offers[0]["prazo"] == 84


def test_intersecao_sem_facta_em_um_contrato():
    results = [
        {
            "ofertas": [
                {
                    "banco": "FACTA",
                    "tabela": "FACTA 84",
                    "prazo": 84,
                }
            ]
        },
        {
            "ofertas": [
                {
                    "banco": "OUTRO",
                    "tabela": "OUTRA",
                    "prazo": 84,
                }
            ]
        },
    ]

    offers = (
        module
        .interseccionar_ofertas_facta(
            results
        )
    )

    assert offers == []

def test_grupo_a_com_grupo_a_pode_unificar():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "BMG",
                "beneficio": "1234567890",
                "parcela": 150,
                "saldo_devedor": 5000,
            },
            {
                "banco": "C6",
                "beneficio": "1234567890",
                "parcela": 150,
                "saldo_devedor": 5000,
            },
        ],
    )

    assert result["elegivel_previo"] is True
    assert result["grupo_operacao"] == "A"


def test_grupo_b_com_grupo_b_pode_unificar():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "Mercantil",
                "beneficio": "1234567890",
                "parcela": 150,
                "saldo_devedor": 5000,
            },
            {
                "banco": "PicPay",
                "beneficio": "1234567890",
                "parcela": 150,
                "saldo_devedor": 5000,
            },
        ],
    )

    assert result["elegivel_previo"] is True
    assert result["grupo_operacao"] == "B"


def test_grupo_c_nao_agrupa_nem_com_mesmo_banco():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "BRB",
                "beneficio": "1234567890",
                "parcela": 150,
                "saldo_devedor": 5000,
            },
            {
                "banco": "BRB",
                "beneficio": "1234567890",
                "parcela": 150,
                "saldo_devedor": 5000,
            },
        ],
    )

    assert result["elegivel_previo"] is False

    assert any(
        "Grupo C" in item
        for item in result["bloqueios"]
    )

def test_parcela_refin_final_inclui_vinte():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=-80,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "1234567890",
                "parcela": 200,
                "saldo_devedor": 3000,
            },
            {
                "banco": "PAN",
                "beneficio": "1234567890",
                "parcela": 200,
                "saldo_devedor": 3000,
            },
        ],
    )

    assert result["soma_parcelas"] == 400
    assert result["margem_negativa"] == 80
    assert result["parcela_refin"] == 340

def test_parcela_refin_sem_adicional_quando_margem_zero():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "1234567890",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
            {
                "banco": "PAN",
                "beneficio": "1234567890",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
        ],
    )

    assert result["soma_parcelas"] == 200
    assert result["margem_negativa"] == 0
    assert result["parcela_refin"] == 200


def test_parcela_refin_sem_adicional_quando_margem_positiva():
    result = Service.validar(
        banco_destino="FACTA",
        convenio="INSS",
        margem_disponivel=25,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "1234567890",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
            {
                "banco": "PAN",
                "beneficio": "1234567890",
                "parcela": 100,
                "saldo_devedor": 3000,
            },
        ],
    )

    assert result["soma_parcelas"] == 200
    assert result["margem_negativa"] == 0
    assert result["parcela_refin"] == 200


def test_regra_promotora_bloqueia_banco_origem():
    bloqueios = Service.validar_regras_promotora_origem(
        contratos=[
            {
                "banco": "C6",
                "parcelas_pagas": 30,
            }
        ],
        origin_config=[],
        origin_blocklist=[
            {
                "origin_bank": "C6",
            }
        ],
    )

    assert len(bloqueios) == 1
    assert "Regra da promotora" in bloqueios[0]
    assert "nao porta" in bloqueios[0]


def test_regra_promotora_exige_minimo_parcelas_pagas():
    bloqueios = Service.validar_regras_promotora_origem(
        contratos=[
            {
                "banco": "626 - C6 CONSIGNADO",
                "prazo": 84,
                "prazo_restante": 69,
            }
        ],
        origin_config=[
            {
                "origin_bank": "C6",
                "min_paid": 18,
            }
        ],
        origin_blocklist=[],
    )

    assert len(bloqueios) == 1
    assert "18 parcelas" in bloqueios[0]
    assert "possui 15" in bloqueios[0]


def test_regra_promotora_libera_quando_minimo_atendido():
    bloqueios = Service.validar_regras_promotora_origem(
        contratos=[
            {
                "banco": "626 - C6 CONSIGNADO",
                "parcelas_pagas": 18,
            }
        ],
        origin_config=[
            {
                "origin_bank": "C6",
                "min_paid": 18,
            }
        ],
        origin_blocklist=[],
    )

    assert bloqueios == []

def test_daycoval_multipla_minimo_dois():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            }
        ],
    )

    assert result["elegivel_previo"] is False

    assert any(
        "minimo 2 contratos" in item
        for item in result["bloqueios"]
    )


def test_daycoval_multipla_maximo_tres():
    contratos = []

    for index in range(4):
        contratos.append(
            {
                "banco": f"BANCO {index}",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            }
        )

    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=contratos,
    )

    assert result["elegivel_previo"] is False

    assert any(
        "maximo 3 contratos" in item
        for item in result["bloqueios"]
    )


def test_daycoval_multipla_parcela_minima_vinte():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "123",
                "parcela": 19.99,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
            {
                "banco": "PAN",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
        ],
    )

    assert result["elegivel_previo"] is False

    assert any(
        "R$ 20,00" in item
        for item in result["bloqueios"]
    )


def test_daycoval_multipla_minimo_seis_pagas():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 79,
                "parcelas_pagas": 5,
            },
            {
                "banco": "PAN",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
        ],
    )

    assert result["elegivel_previo"] is False

    assert any(
        "6 parcelas" in item
        for item in result["bloqueios"]
    )


def test_daycoval_multipla_sem_grupos():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "BMG",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
            {
                "banco": "MERCANTIL",
                "beneficio": "123",
                "parcela": 120,
                "saldo_devedor": 3500,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
            {
                "banco": "BRB",
                "beneficio": "123",
                "parcela": 130,
                "saldo_devedor": 4000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
        ],
    )

    assert result["elegivel_previo"] is True
    assert result["usa_grupos"] is False
    assert result["grupo_operacao"] is None


def test_daycoval_multipla_mesmo_nb():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "111",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
            {
                "banco": "PAN",
                "beneficio": "222",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
        ],
    )

    assert result["elegivel_previo"] is False

    assert any(
        "beneficios/NB diferentes" in item
        for item in result["bloqueios"]
    )


def test_daycoval_multipla_nao_usa_adicional_facta():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=-50,
        contratos=[
            {
                "banco": "C6",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
            {
                "banco": "PAN",
                "beneficio": "123",
                "parcela": 200,
                "saldo_devedor": 4000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
        ],
    )

    assert result["soma_parcelas"] == 300
    assert result["margem_negativa"] == 50
    assert result["parcela_refin"] == 250


def test_daycoval_bloqueia_c6_por_nome():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "626 - C6 CONSIGNADO",
                "codigo": "626",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
            {
                "banco": "PAN",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
        ],
    )

    assert result["elegivel_previo"] is False
    assert any(
        "nao porta contratos originados no Banco C6"
        in item
        for item in result["bloqueios"]
    )


def test_daycoval_bloqueia_c6_por_codigo_336():
    result = DaycovalService.validar(
        banco_destino="DAYCOVAL",
        convenio="INSS",
        margem_disponivel=0,
        contratos=[
            {
                "banco": "ORIGEM",
                "codigo": "336",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
            {
                "banco": "PAN",
                "beneficio": "123",
                "parcela": 100,
                "saldo_devedor": 3000,
                "prazo": 84,
                "prazo_restante": 70,
                "parcelas_pagas": 14,
            },
        ],
    )

    assert result["elegivel_previo"] is False


def test_daycoval_aplica_minimo_especifico_por_origem():
    bloqueios = DaycovalService.validar_regras_origem(
        contratos=[
            {
                "banco": "BANCO TESTE",
                "parcelas_pagas": 9,
            }
        ],
        origin_config=[
            {
                "origin_bank": "BANCO TESTE",
                "min_paid": 12,
            }
        ],
        origin_blocklist=[],
        min_paid_installments=6,
    )

    assert len(bloqueios) == 1
    assert "12 parcelas pagas" in bloqueios[0]
    assert "possui 9" in bloqueios[0]


def test_daycoval_aplica_blocklist_dinamico():
    bloqueios = DaycovalService.validar_regras_origem(
        contratos=[
            {
                "banco": "BANCO BLOQUEADO",
                "parcelas_pagas": 30,
            }
        ],
        origin_config=[],
        origin_blocklist=[
            "BANCO BLOQUEADO",
        ],
        min_paid_installments=6,
    )

    assert len(bloqueios) == 1
    assert "DAYCOVAL nao porta" in bloqueios[0]


def test_daycoval_intersecao_mesma_tabela_prazo():
    resultados = [
        {
            "ofertas": [
                {
                    "banco": "DAYCOVAL",
                    "tabela": "DAY 1",
                    "prazo": 84,
                    "valor_liberado": 500,
                },
                {
                    "banco": "DAYCOVAL",
                    "tabela": "DAY 2",
                    "prazo": 96,
                    "valor_liberado": 700,
                },
            ]
        },
        {
            "ofertas": [
                {
                    "banco": "BANCO DAYCOVAL",
                    "tabela": "DAY 1",
                    "prazo": 84,
                    "valor_liberado": 450,
                }
            ]
        },
    ]

    result = (
        module
        .interseccionar_ofertas_daycoval(
            resultados
        )
    )

    assert len(result) == 1
    assert result[0]["tabela"] == "DAY 1"
    assert result[0]["prazo"] == 84

    # Resultado conservador.
    assert result[0]["valor_liberado"] == 450


def test_rota_daycoval_decorator_aponta_para_endpoint_json():
    router_path = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "routers"
        / "portabilidade_multipla.py"
    )

    text = router_path.read_text(encoding="utf-8")

    helper_pos = text.index(
        "def _daycoval_benefit_time("
    )
    decorator_pos = text.index(
        '@router.post(\n    "/simular-daycoval"\n)',
        helper_pos,
    )
    endpoint_pos = text.index(
        "async def simular_portabilidade_multipla_daycoval(",
        decorator_pos,
    )

    assert helper_pos < decorator_pos < endpoint_pos
    assert (
        "def _daycoval_benefit_time"
        not in text[decorator_pos:endpoint_pos]
    )


def test_rota_daycoval_envia_financeiro_consolidado_ao_motor():
    router_path = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "routers"
        / "portabilidade_multipla.py"
    )

    text = router_path.read_text(encoding="utf-8")
    start = text.index(
        "async def simular_portabilidade_multipla_daycoval("
    )
    endpoint = text[start:]

    # O financial_engine do Motor calcula:
    # (parcela / coeficiente) - saldo_devedor.
    # Aqui garantimos que a Multipla envia os valores consolidados.
    assert "parcela=(\n                        soma_parcelas\n                    )" in endpoint
    assert "saldo_devedor=(\n                        soma_saldos\n                    )" in endpoint

def test_frontend_facta_nao_soma_vinte_com_margem_zero():
    page_path = (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "portabilidade-multipla"
        / "page.js"
    )

    text = page_path.read_text(encoding="utf-8")

    assert "MULTIPLA_FACTA_REFIN_MARGIN_V3" in text
    assert "margemNegativa > 0" in text
    assert "? money(" in text
    assert ": 0" in text


def test_daycoval_normaliza_financeiro_para_tela():
    router_path = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "routers"
        / "portabilidade_multipla.py"
    )

    text = router_path.read_text(encoding="utf-8")

    start = text.index(
        "# MULTIPLA_DAYCOVAL_FINANCEIRO_V4"
    )
    endpoint_tail = text[start:]

    assert '"valor_total_contrato"' in endpoint_tail
    assert '"valor_liberado"' in endpoint_tail
    assert '"parcela_refin"' in endpoint_tail
    assert '"novo_contrato"' in endpoint_tail
    assert '"troco"' in endpoint_tail
    assert "parcela_refin_daycoval" in endpoint_tail
    assert "/ coeficiente" in endpoint_tail
    assert "- soma_saldos" in endpoint_tail


def test_daycoval_formula_reconstroi_troco_consolidado():
    soma_parcelas = 141.15
    soma_saldos = 6445.15
    coeficiente = 0.017

    novo_contrato = round(
        soma_parcelas / coeficiente,
        2,
    )
    troco = round(
        novo_contrato - soma_saldos,
        2,
    )

    assert novo_contrato == 8302.94
    assert troco == 1857.79
