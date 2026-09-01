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
    / "margin_rules.py"
)

spec = spec_from_file_location(
    "margin_rules_under_test",
    MODULE_PATH,
)

if spec is None or spec.loader is None:
    raise RuntimeError(
        f"Nao foi possivel carregar: {MODULE_PATH}"
    )

margin_rules = module_from_spec(spec)
spec.loader.exec_module(margin_rules)

recalculate_benefit_margins = (
    margin_rules.recalculate_benefit_margins
)


def build_payload(
    especie="41",
    salario=1621.00,
):
    return {
        "cliente": {
            "especie": especie,
            "salario": salario,
        },
        "margens": {
            "salario": salario,
        },
        "emprestimos": [
            {
                "parcela": 300.00,
                "situacao": "ATIVO",
            },
            {
                "parcela": 216.15,
                "situacao": "Ativo",
            },
            {
                "parcela": 90.00,
                "situacao": "ENCERRADO",
            },
        ],
        "cartoes": [
            {
                "tipo":
                    "Cartao Consignado (RMC)",
                "situacao": "ATIVO",
            },
            {
                "tipo":
                    "Cartao Beneficio (RCC)",
                "situacao": "ATIVO",
            },
            {
                "tipo": "Cartao antigo",
                "situacao": "INATIVO",
            },
        ],
        "resumo": {},
    }


def test_margem_total_e_45_porcento():
    result = recalculate_benefit_margins(
        build_payload("41")
    )

    margens = result["margens"]

    assert (
        margens["margem_total_consignavel"]
        == 729.45
    )

    assert (
        margens["margem_emprestimo"]
        == 567.35
    )

    assert margens["margem_rmc"] == 81.05
    assert margens["margem_rcc"] == 81.05


def test_cartoes_nao_reduzem_35_porcento():
    result = recalculate_benefit_margins(
        build_payload("41")
    )

    margens = result["margens"]

    # 35% de 1.621,00 = 567,35.
    # Parcelas ativas = 516,15.
    # Margem livre de emprestimo = 51,20.
    assert margens["margem_livre"] == 51.20

    # RMC/RCC continuam em reservas separadas.
    assert margens["rmc_utilizado"] == 81.05
    assert margens["rcc_utilizado"] == 81.05

    assert margens["rmc_disponivel"] == 0.00
    assert margens["rcc_disponivel"] == 0.00

    assert (
        margens["cartao_utilizado"]
        == 162.10
    )

    # Total comprometido pode somar todas
    # as modalidades para fins de resumo.
    assert (
        margens["total_comprometido"]
        == 678.25
    )


def test_sem_cartoes_preserva_10_porcento():
    payload = {
        "cliente": {
            "especie": "41",
            "salario": 2000.00,
        },
        "margens": {
            "salario": 2000.00,
        },
        "emprestimos": [],
        "cartoes": [],
        "resumo": {},
    }

    result = recalculate_benefit_margins(
        payload
    )

    margens = result["margens"]

    assert (
        margens["margem_total_consignavel"]
        == 900.00
    )

    assert (
        margens["margem_emprestimo"]
        == 700.00
    )

    assert margens["margem_livre"] == 700.00

    assert margens["margem_rmc"] == 100.00
    assert margens["margem_rcc"] == 100.00

    assert margens["rmc_disponivel"] == 100.00
    assert margens["rcc_disponivel"] == 100.00

    assert (
        margens["cartao_disponivel"]
        == 200.00
    )


def test_apenas_rmc_ocupa_apenas_rmc():
    payload = {
        "cliente": {
            "especie": "41",
            "salario": 2000.00,
        },
        "margens": {
            "salario": 2000.00,
        },
        "emprestimos": [],
        "cartoes": [
            {
                "tipo":
                    "Cartao Consignado (RMC)",
                "situacao": "ATIVO",
            },
        ],
        "resumo": {},
    }

    result = recalculate_benefit_margins(
        payload
    )

    margens = result["margens"]

    assert margens["margem_livre"] == 700.00

    assert margens["rmc_utilizado"] == 100.00
    assert margens["rmc_disponivel"] == 0.00

    assert margens["rcc_utilizado"] == 0.00
    assert margens["rcc_disponivel"] == 100.00

    assert (
        margens["cartao_disponivel"]
        == 100.00
    )


def test_apenas_rcc_ocupa_apenas_rcc():
    payload = {
        "cliente": {
            "especie": "41",
            "salario": 2000.00,
        },
        "margens": {
            "salario": 2000.00,
        },
        "emprestimos": [],
        "cartoes": [
            {
                "tipo":
                    "Cartao Beneficio (RCC)",
                "situacao": "ATIVO",
            },
        ],
        "resumo": {},
    }

    result = recalculate_benefit_margins(
        payload
    )

    margens = result["margens"]

    assert margens["rmc_disponivel"] == 100.00
    assert margens["rcc_disponivel"] == 0.00


def test_duas_rmc_nao_ocupam_10_porcento():
    payload = {
        "cliente": {
            "especie": "41",
            "salario": 2000.00,
        },
        "margens": {
            "salario": 2000.00,
        },
        "emprestimos": [],
        "cartoes": [
            {
                "tipo": "RMC",
                "situacao": "ATIVO",
            },
            {
                "tipo":
                    "Cartao Consignado",
                "situacao": "ATIVO",
            },
        ],
        "resumo": {},
    }

    result = recalculate_benefit_margins(
        payload
    )

    margens = result["margens"]

    # A modalidade RMC possui apenas um
    # slot consignavel de 5%.
    assert margens["rmc_utilizado"] == 100.00
    assert margens["rcc_utilizado"] == 0.00
    assert margens["cartao_utilizado"] == 100.00



def test_rmc_rcc_promosys_ocupam_slots_sem_cartao_listado():
    """
    O provedor pode informar ValorRMC/ValorRCC
    mesmo sem devolver o contrato do cartao
    dentro da lista normalizada.
    """
    payload = {
        "cliente": {
            "especie": "41",
            "salario": 2000.00,
        },
        "margens": {
            "salario": 2000.00,

            # Indicam que as duas modalidades
            # ja estao ocupadas.
            "rmc_promosys": 10.00,
            "rcc_promosys": 20.00,
        },
        "emprestimos": [],
        "cartoes": [],
        "resumo": {},
    }

    result = recalculate_benefit_margins(
        payload
    )

    margens = result["margens"]

    # 35% continua totalmente livre.
    assert (
        margens["margem_emprestimo"]
        == 700.00
    )

    assert (
        margens["margem_livre"]
        == 700.00
    )

    # RMC ocupa somente os seus 5%.
    assert (
        margens["rmc_utilizado"]
        == 100.00
    )

    assert (
        margens["rmc_disponivel"]
        == 0.00
    )

    # RCC ocupa somente os seus 5%.
    assert (
        margens["rcc_utilizado"]
        == 100.00
    )

    assert (
        margens["rcc_disponivel"]
        == 0.00
    )

    assert (
        margens["cartao_utilizado"]
        == 200.00
    )

    assert (
        margens["cartao_disponivel"]
        == 0.00
    )

    assert (
        margens["total_comprometido"]
        == 200.00
    )


def test_loas_tambem_mantem_35_5_5():
    result = recalculate_benefit_margins(
        build_payload(
            "87 - BPC LOAS"
        )
    )

    margens = result["margens"]

    assert (
        margens["margem_emprestimo"]
        == 567.35
    )

    assert margens["margem_rmc"] == 81.05
    assert margens["margem_rcc"] == 81.05
    assert margens["margem_livre"] == 51.20


def test_valores_financeiros_truncados():
    result = recalculate_benefit_margins({
        "cliente": {
            "especie": "41",
            "salario": 1662.99,
        },
        "margens": {
            "salario": 1662.99,
        },
        "emprestimos": [],
        "cartoes": [],
    })

    margens = result["margens"]

    assert (
        margens["margem_total_consignavel"]
        == 748.34
    )

    assert (
        margens["margem_emprestimo"]
        == 582.04
    )

    assert margens["margem_rmc"] == 83.14
    assert margens["margem_rcc"] == 83.14


def test_recalcula_payload_antigo_cache():
    payload = {
        "beneficios": [
            build_payload("41"),
            build_payload("87"),
        ],
        "beneficio_principal":
            build_payload("41"),
    }

    result = (
        margin_rules
        .recalculate_consulta_payload(
            payload
        )
    )

    normal = result["beneficios"][0]
    loas = result["beneficios"][1]
    principal = result["beneficio_principal"]

    assert (
        normal["margens"]["margem_emprestimo"]
        == 567.35
    )

    assert (
        normal["margens"]["margem_livre"]
        == 51.20
    )

    assert (
        loas["margens"]["margem_emprestimo"]
        == 567.35
    )

    assert (
        principal["margens"][
            "margem_total_consignavel"
        ]
        == 729.45
    )


def test_margem_negativa_preserva_centavo():
    payload = {
        "cliente": {
            "especie": "41",
            "salario": 1621.00,
        },
        "margens": {
            "salario": 1621.00,
        },
        "emprestimos": [
            {
                "parcela": 648.40,
                "situacao": "ATIVO",
            },
        ],
        "cartoes": [
            {
                "tipo": "RMC",
                "situacao": "ATIVO",
            },
        ],
        "resumo": {},
    }

    result = recalculate_benefit_margins(
        payload
    )

    margens = result["margens"]

    # 35% = 567,35.
    # 567,35 - 648,40 = -81,05.
    assert (
        margens["margem_emprestimo"]
        == 567.35
    )

    assert (
        margens["margem_livre"]
        == -81.05
    )

    # O RMC nao altera a margem livre
    # dos emprestimos.
    assert (
        margens["rmc_utilizado"]
        == 81.05
    )

    assert (
        result["cliente"]["margem_livre"]
        == -81.05
    )


def test_margens_cartao_sincronizadas_com_regra_45():
    # Sem cartoes:
    # RMC e RCC devem mostrar 5% disponiveis.
    livre = recalculate_benefit_margins({
        "cliente": {
            "especie": "41",
            "salario": 2000.00,
        },
        "margens": {
            "salario": 2000.00,
        },
        "margens_cartao": {
            # Valores antigos devem ser
            # sobrescritos pela regra central.
            "rmc_disponivel": 999.00,
            "rcc_disponivel": 999.00,
        },
        "emprestimos": [],
        "cartoes": [],
        "resumo": {},
    })

    assert (
        livre["margens_cartao"][
            "rmc_disponivel"
        ]
        == 100.00
    )

    assert (
        livre["margens_cartao"][
            "rcc_disponivel"
        ]
        == 100.00
    )

    # Com RMC e RCC ocupados:
    # os dois devem aparecer zerados
    # na Consulta CPF.
    ocupado = recalculate_benefit_margins({
        "cliente": {
            "especie": "41",
            "salario": 2000.00,
        },
        "margens": {
            "salario": 2000.00,
            "rmc_promosys": 1.00,
            "rcc_promosys": 1.00,
        },
        "margens_cartao": {
            "rmc_disponivel": 100.00,
            "rcc_disponivel": 100.00,
        },
        "emprestimos": [],
        "cartoes": [],
        "resumo": {},
    })

    assert (
        ocupado["margens_cartao"][
            "rmc_disponivel"
        ]
        == 0.00
    )

    assert (
        ocupado["margens_cartao"][
            "rcc_disponivel"
        ]
        == 0.00
    )



def test_schema_consulta_margem_preserva_campos_45():
    """
    Garante que o Pydantic nao remova os novos
    campos antes de enviar a Consulta CPF ao frontend.
    """
    from app.schemas.consultas import (
        ConsultaMargem,
    )

    model = ConsultaMargem(
        salario=2000.00,

        margem_total_consignavel=
            900.00,

        margem_emprestimo=
            700.00,

        margem_livre=
            200.00,

        margem_rmc=
            100.00,

        margem_rcc=
            100.00,

        rmc_utilizado=
            100.00,

        rcc_utilizado=
            100.00,

        rmc_disponivel=
            0.00,

        rcc_disponivel=
            0.00,

        possui_rmc=True,
        possui_rcc=True,
    )

    payload = model.model_dump()

    assert (
        payload[
            "margem_total_consignavel"
        ]
        == 900.00
    )

    assert (
        payload[
            "margem_emprestimo"
        ]
        == 700.00
    )

    assert (
        payload[
            "margem_livre"
        ]
        == 200.00
    )

    assert (
        payload[
            "margem_rmc"
        ]
        == 100.00
    )

    assert (
        payload[
            "margem_rcc"
        ]
        == 100.00
    )

    assert (
        payload[
            "rmc_utilizado"
        ]
        == 100.00
    )

    assert (
        payload[
            "rcc_utilizado"
        ]
        == 100.00
    )

    assert (
        payload[
            "rmc_disponivel"
        ]
        == 0.00
    )

    assert (
        payload[
            "rcc_disponivel"
        ]
        == 0.00
    )

    assert (
        payload[
            "possui_rmc"
        ]
        is True
    )

    assert (
        payload[
            "possui_rcc"
        ]
        is True
    )
