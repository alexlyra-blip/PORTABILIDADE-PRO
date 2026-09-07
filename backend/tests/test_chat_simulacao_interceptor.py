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


def build_single_contract_session():
    session = build_session()

    contracts = (
        session["ultima_simulacao"]
        ["beneficios"][0]
        ["contratos"]
    )

    session["ultima_simulacao"]["beneficios"][0][
        "contratos"
    ] = [contracts[0]]

    return session


def test_tabelas_usam_ultimo_banco_selecionado():
    session = build_single_contract_session()

    reply_facta = interceptor.processar_comando_simulacao(
        session,
        "facta",
        "FACTA",
    )

    assert "FACTA" in reply_facta

    assert (
        session["simulacao_selecao_atual"]["banco"]
        == "FACTA"
    )

    tabelas_facta = interceptor.processar_comando_simulacao(
        session,
        "tabelas",
        "Tabelas",
    )

    assert "Outras Tabelas para FACTA" in tabelas_facta
    assert "Outras Tabelas para BRB" not in tabelas_facta

    reply_c6 = interceptor.processar_comando_simulacao(
        session,
        "c6 consig",
        "C6 CONSIG",
    )

    assert "C6" in reply_c6

    assert (
        session["simulacao_selecao_atual"]["banco"]
        == "C6 CONSIG"
    )

    tabelas_c6 = interceptor.processar_comando_simulacao(
        session,
        "tabelas",
        "Tabelas",
    )

    assert "Outras Tabelas para C6 CONSIG" in tabelas_c6
    assert "Outras Tabelas para BRB" not in tabelas_c6


def test_tabelas_sem_troca_de_banco_usam_recomendado():
    session = build_single_contract_session()

    reply = interceptor.processar_comando_simulacao(
        session,
        "tabelas",
        "Tabelas",
    )

    assert "Outras Tabelas para BRB" in reply


def test_taxa_e_formatada_com_duas_casas():
    session = build_single_contract_session()

    c6_offers = (
        session["ultima_simulacao"]
        ["beneficios"][0]
        ["contratos"][0]
        ["ofertas_por_banco"]
        ["C6 CONSIG"]
    )

    c6_offers[1]["taxa_juros"] = 1.8299999999999998

    reply = interceptor.processar_comando_simulacao(
        session,
        "c6 consig",
        "C6 CONSIG",
    )

    assert "1,83% a.m." in reply
    assert "1.8299999999999998" not in reply


def test_multicontrato_mantem_banco_para_tabelas():
    session = build_session()

    interceptor.processar_comando_simulacao(
        session,
        "c6 consig",
        "C6 CONSIG",
    )

    assert (
        session["simulacao_selecao_atual"]["banco"]
        == "C6 CONSIG"
    )

    reply = interceptor.processar_comando_simulacao(
        session,
        "tabelas",
        "Tabelas",
    )

    assert "C6 CONSIG" in reply
    assert "BRB" not in reply


def test_format_taxa_remove_ruido_de_float():
    assert (
        interceptor.format_taxa(
            1.8299999999999998
        )
        == "1,83"
    )


def test_format_brl_padrao_brasileiro():
    assert interceptor.format_brl(494) == "494,00"
    assert interceptor.format_brl(7605.19) == "7.605,19"
    assert interceptor.format_brl(14650.42) == "14.650,42"
    assert interceptor.format_brl(21194.44) == "21.194,44"


def test_resposta_usa_moeda_brasileira():
    session = build_session()

    contracts = (
        session["ultima_simulacao"]
        ["beneficios"][0]
        ["contratos"]
    )

    session["ultima_simulacao"]["beneficios"][0][
        "contratos"
    ] = [contracts[0]]

    reply = interceptor.processar_comando_simulacao(
        session,
        "c6 consig",
        "C6 CONSIG",
    )

    assert "R$ 200,00" in reply
    assert "R$ 9.000,00" in reply
    assert "R$ 2.000,00" in reply

    assert "R$ 200.00" not in reply
    assert "R$ 9000.00" not in reply
    assert "R$ 2000.00" not in reply


# CLARA_POST_SIMULACAO_CONTRATOS_TESTS

def _cached_offer(
    bank,
    table,
    term,
    change,
):
    return {
        "banco": bank,
        "tabela": table,
        "prazo": term,
        "valor_parcela": 200.00,
        "valor_total_contrato": 9000.00,
        "saldo_devedor": 6000.00,
        "taxa_juros": 1.80,
        "valor_liberado": change,
    }


def _cached_session():
    return {
        "simulations": [
            {
                "b_idx": 1,
                "c_idx": 1,
                "input_data": {
                    "banco": "BRADESCO",
                    "parcela": 41.57,
                },
                "ofertas": [
                    _cached_offer(
                        "C6 CONSIG",
                        "C1 PRINCIPAL 108",
                        108,
                        700.00,
                    ),
                    _cached_offer(
                        "C6 CONSIG",
                        "C1 ALTERNATIVA 96",
                        96,
                        650.00,
                    ),
                    _cached_offer(
                        "C6 CONSIG",
                        "C1 SEGUNDA 108",
                        108,
                        9999.00,
                    ),
                    _cached_offer(
                        "BANCO DAYCOVAL",
                        "DAY C1",
                        108,
                        600.00,
                    ),
                ],
            },
            {
                "b_idx": 1,
                "c_idx": 2,
                "input_data": {
                    "banco": "PAN",
                    "parcela": 82.10,
                },
                "ofertas": [
                    _cached_offer(
                        "C6 CONSIG",
                        "C2 PRINCIPAL 108",
                        108,
                        2000.00,
                    ),
                    _cached_offer(
                        "C6 CONSIG",
                        "C2 ALTERNATIVA 96",
                        96,
                        1800.00,
                    ),
                    _cached_offer(
                        "BANCO DAYCOVAL",
                        "DAY C2",
                        108,
                        1900.00,
                    ),
                ],
            },
        ]
    }


def test_post_menu_lists_contracts():
    session = _cached_session()

    menu = (
        interceptor
        .build_post_simulation_menu(
            session["simulations"]
        )
    )

    assert "CONTRATO 1" in menu
    assert "CONTRATO 2" in menu

    assert "\u2501" * 18 in menu

    # O separador deve ficar em uma unica linha.
    assert "\n\u2501\n" not in menu

    assert (
        "CONTRATO 1 TABELAS 96X C6 CONSIG"
        in menu
    )

    assert (
        "CONTRATO 1 TABELAS 108X C6 CONSIG"
        in menu
    )

    assert (
        "CONTRATO 1 BANCO DAYCOVAL"
        in menu
    )


def test_contract_2_tables_96_uses_cache():
    session = _cached_session()

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            "contrato 2 tabelas 96x c6 consig",
            "CONTRATO 2 TABELAS 96X C6 CONSIG",
        )
    )

    assert "C2 ALTERNATIVA 96" in reply

    assert (
        "C1 ALTERNATIVA 96"
        not in reply
    )


def test_contract_2_daycoval_uses_cache():
    session = _cached_session()

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            "contrato 2 banco daycoval",
            "CONTRATO 2 BANCO DAYCOVAL",
        )
    )

    assert "DAY C2" in reply
    assert "DAY C1" not in reply


def test_b1_c1_still_works():
    session = _cached_session()

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            "b1 c1 tabelas 96x c6 consig",
            "B1 C1 TABELAS 96X C6 CONSIG",
        )
    )

    assert "C1 ALTERNATIVA 96" in reply


def test_priority_does_not_choose_biggest_change():
    session = _cached_session()

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            "contrato 1 banco c6 consig",
            "CONTRATO 1 BANCO C6 CONSIG",
        )
    )

    assert "C1 PRINCIPAL 108" in reply

    assert (
        "C1 SEGUNDA 108"
        not in reply
    )


def test_ambiguous_contract_requires_benefit():
    session = _cached_session()

    session["simulations"].append(
        {
            "b_idx": 2,
            "c_idx": 1,
            "input_data": {
                "banco": "ITAU",
                "parcela": 100.00,
            },
            "ofertas": [
                _cached_offer(
                    "C6 CONSIG",
                    "B2 C1",
                    108,
                    500.00,
                )
            ],
        }
    )

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            "contrato 1 tabelas 108x c6 consig",
            "CONTRATO 1 TABELAS 108X C6 CONSIG",
        )
    )

    assert "mais de um" in reply
    assert "B1 C1" in reply


def test_interceptor_does_not_call_simulator():
    source = MODULE_PATH.read_text(
        encoding="utf-8"
    )

    assert "SimuladorService" not in source


# CLARA_CPF_DISPLAY_MASK_TEST
def test_clara_cpf_usa_mascara_brasileira_segura():
    from pathlib import Path

    chat_path = Path(
        "backend/app/routers/chat.py"
    )

    source = chat_path.read_text(
        encoding="utf-8"
    )

    expected = (
        'f"{clean_cpf[:3]}.***.***-'
        '{clean_cpf[-2:]}"'
    )

    assert (
        "# CLARA_CPF_DISPLAY_MASK"
        in source
    )

    assert expected in source

    assert (
        'f"{clean_cpf[:3]}.*.*-'
        '{clean_cpf[-2:]}"'
        not in source
    )


# CLARA_V2_NATURAL_CONTRACT_REFERENCE_TESTS

def test_v2_normalizado_contrato_2_tabelas():
    session = build_session()

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            (
                "contrato 2 tabelas "
                "96x c6 consig"
            ),
            (
                "CONTRATO 2 TABELAS "
                "96X C6 CONSIG"
            ),
        )
    )

    assert reply is not None

    # Garante que o comando natural
    # selecionou especificamente o contrato 2.
    selecao = session.get(
        "simulacao_selecao_atual",
        {},
    )

    assert (
        selecao.get("contrato")
        == 2
    )


def test_v2_normalizado_b1_c2_continua_funcionando():
    session = build_session()

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            (
                "b1 c2 tabelas "
                "96x c6 consig"
            ),
            (
                "B1 C2 TABELAS "
                "96X C6 CONSIG"
            ),
        )
    )

    assert reply is not None


def test_v2_normalizado_beneficio_1_contrato_2():
    session = build_session()

    reply = (
        interceptor
        .processar_comando_simulacao(
            session,
            (
                "beneficio 1 contrato 2 "
                "tabelas 96x c6 consig"
            ),
            (
                "BENEFICIO 1 CONTRATO 2 "
                "TABELAS 96X C6 CONSIG"
            ),
        )
    )

    assert reply is not None

    selecao = session.get(
        "simulacao_selecao_atual",
        {},
    )

    assert (
        selecao.get("beneficio")
        == 1
    )

    assert (
        selecao.get("contrato")
        == 2
    )
