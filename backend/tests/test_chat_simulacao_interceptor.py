from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "services"
    / "chat_simulacao_interceptor.py"
)

spec = spec_from_file_location(
    "chat_simulacao_interceptor_under_test",
    MODULE_PATH,
)

if spec is None or spec.loader is None:
    raise RuntimeError(
        f"Não foi possível carregar o módulo: {MODULE_PATH}"
    )

interceptor = module_from_spec(spec)
spec.loader.exec_module(interceptor)


def offer(
    bank,
    table,
    term,
    change,
    rate=1.80,
):
    return {
        "banco": bank,
        "tabela": table,
        "prazo": term,
        "valor_parcela": 200.00,
        "valor_total_contrato": 9000.00,
        "saldo_devedor": 6000.00,
        "taxa_juros": rate,
        "valor_liberado": change,
    }


def build_session():
    return {
        "ultima_simulacao": {
            "possui_ofertas": True,
            "beneficios": [
                {
                    "indice_beneficio": 1,
                    "contratos": [
                        {
                            "indice_contrato": 1,
                            "banco_recomendado": "BRB",
                            "tabelas_banco_recomendado": [
                                offer(
                                    "BRB",
                                    "BRB 108 PRINCIPAL",
                                    108,
                                    4200.00,
                                ),
                            ],
                            "ofertas_por_banco": {
                                "C6 CONSIG": [
                                    offer(
                                        "C6 CONSIG",
                                        "C6 96 PRIMEIRA",
                                        96,
                                        4500.00,
                                    ),
                                    offer(
                                        "C6 CONSIG",
                                        "C6 108 PRIORITARIA",
                                        108,
                                        2000.00,
                                        rate=1.95,
                                    ),
                                    offer(
                                        "C6 CONSIG",
                                        "C6 108 MAIOR TROCO",
                                        108,
                                        5000.00,
                                        rate=1.50,
                                    ),
                                ],
                                "FACTA": [
                                    offer(
                                        "FACTA",
                                        "FACTA 108",
                                        108,
                                        3500.00,
                                    ),
                                ],
                            },
                        },
                        {
                            "indice_contrato": 2,
                            "banco_recomendado": "QUALIBANKING",
                            "tabelas_banco_recomendado": [
                                offer(
                                    "QUALIBANKING",
                                    "QUALI 108",
                                    108,
                                    3000.00,
                                ),
                            ],
                            "ofertas_por_banco": {
                                "C6 CONSIG": [
                                    offer(
                                        "C6 CONSIG",
                                        "C6 CONTRATO 2 - 96X",
                                        96,
                                        1800.00,
                                    ),
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    }


def test_banco_escolhido_analisa_todos_os_contratos():
    session = build_session()

    reply = interceptor.processar_comando_simulacao(
        session,
        "c6 consig",
        "C6 CONSIG",
    )

    assert "Qual opção deseja consultar?" not in reply

    assert "BENEFÍCIO 1 / CONTRATO 1" in reply
    assert "BENEFÍCIO 1 / CONTRATO 2" in reply

    # Prioriza a primeira tabela 108X, sem procurar maior troco.
    assert "C6 108 PRIORITARIA" in reply
    assert "C6 108 MAIOR TROCO" not in reply
    assert "C6 96 PRIMEIRA" not in reply

    # Sem 108X, utiliza a primeira tabela disponível.
    assert "C6 CONTRATO 2 - 96X" in reply

    other_banks_section = reply.split(
        "OUTROS BANCOS ELEGÍVEIS:"
    )[1]

    assert "BRB" in other_banks_section
    assert "FACTA" in other_banks_section
    assert "QUALIBANKING" in other_banks_section
    assert "C6 CONSIG" not in other_banks_section

    assert "pending_intent" not in session


def test_consulta_de_tabelas_mantem_fluxo_atual():
    session = build_session()

    reply = interceptor.processar_comando_simulacao(
        session,
        "tabelas 108x c6 consig",
        "TABELAS 108X C6 CONSIG",
    )

    assert "Qual opção deseja consultar?" in reply
    assert session.get("pending_intent")
