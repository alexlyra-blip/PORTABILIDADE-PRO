from importlib.util import module_from_spec, spec_from_file_location
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
        f"Não foi possível carregar o módulo: {MODULE_PATH}"
    )

margin_rules = module_from_spec(spec)
spec.loader.exec_module(margin_rules)

recalculate_benefit_margins = (
    margin_rules.recalculate_benefit_margins
)


def build_payload(especie="41", salario=1621.00):
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
                "tipo": "Cartão Consignado",
                "situacao": "ATIVO",
                "utilizado": 1781.40,
            },
            {
                "tipo": "Cartão Benefício",
                "situacao": "ATIVO",
                "utilizado": 2227.20,
            },
            {
                "tipo": "Cartão antigo",
                "situacao": "INATIVO",
                "utilizado": 9999.00,
            },
        ],
        "resumo": {},
    }


def test_beneficio_normal_usa_40_porcento():
    result = recalculate_benefit_margins(
        build_payload("41")
    )

    assert result["margens"]["margem_emprestimo"] == 648.40
    assert result["margens"]["margem_cartao"] == 81.05
    assert result["margens"]["cartao_utilizado"] == 162.10
    assert result["margens"]["total_comprometido"] == 678.25
    assert result["margens"]["margem_livre"] == -29.85

    assert result["cartoes"][0]["utilizado"] == 81.05
    assert result["cartoes"][1]["utilizado"] == 81.05
    assert result["cartoes"][2]["utilizado"] == 0.00


def test_loas_87_usa_35_porcento():
    result = recalculate_benefit_margins(
        build_payload("87 - BPC LOAS")
    )

    assert result["margens"]["margem_emprestimo"] == 567.35
    assert result["margens"]["cartao_utilizado"] == 162.10
    assert result["margens"]["total_comprometido"] == 678.25
    assert result["margens"]["margem_livre"] == -110.90


def test_loas_88_usa_35_porcento():
    result = recalculate_benefit_margins(
        build_payload("88")
    )

    assert result["margens"]["margem_emprestimo"] == 567.35


def test_valores_financeiros_sao_truncados():
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

    assert result["margens"]["margem_emprestimo"] == 665.19
    assert result["margens"]["margem_cartao"] == 83.14


def test_recalcula_payload_antigo_do_cache():
    payload = {
        "beneficios": [
            build_payload("41"),
            build_payload("87"),
        ],
        "beneficio_principal": build_payload("41"),
    }

    result = margin_rules.recalculate_consulta_payload(payload)

    beneficio_normal = result["beneficios"][0]
    beneficio_loas = result["beneficios"][1]
    principal = result["beneficio_principal"]

    assert beneficio_normal["margens"]["margem_emprestimo"] == 648.40
    assert beneficio_normal["margens"]["cartao_utilizado"] == 162.10
    assert beneficio_normal["margens"]["total_comprometido"] == 678.25

    assert beneficio_loas["margens"]["margem_emprestimo"] == 567.35
    assert beneficio_loas["margens"]["margem_livre"] == -110.90

    assert principal["margens"]["margem_emprestimo"] == 648.40
