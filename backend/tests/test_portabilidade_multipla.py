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
    assert result["parcela_refin"] == 320


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
                "parcela": 40,
                "saldo_devedor": 2500,
            }
        ],
        valor_operacao_refin=2999,
    )

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
