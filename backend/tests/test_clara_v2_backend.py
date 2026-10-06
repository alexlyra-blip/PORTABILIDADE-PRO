from pathlib import Path
import ast

import pytest


ROOT = Path(__file__).resolve().parents[1]
CHAT_PATH = ROOT / "app" / "routers" / "chat.py"


def _source():
    return CHAT_PATH.read_text(encoding="utf-8")


def _tree():
    return ast.parse(_source())


def _top_function(name):
    for node in _tree().body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    raise AssertionError(f"Funcao {name} nao encontrada.")


def _load_cpf_helper():
    source = _source()
    tree = ast.parse(source)

    helper = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name == "extrair_cpf_da_mensagem"
        ),
        None,
    )

    assert helper is not None

    module = ast.Module(body=[helper], type_ignores=[])
    ast.fix_missing_locations(module)

    import re

    namespace = {"re": re}

    exec(
        compile(
            module,
            filename=str(CHAT_PATH),
            mode="exec",
        ),
        namespace,
    )

    return namespace["extrair_cpf_da_mensagem"]


def _load_signature_helper():
    source = _source()
    tree = ast.parse(source)

    helper = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name == "detectar_cliente_nao_assinante"
        ),
        None,
    )

    assert helper is not None

    module = ast.Module(body=[helper], type_ignores=[])
    ast.fix_missing_locations(module)

    namespace = {}

    exec(
        compile(
            module,
            filename=str(CHAT_PATH),
            mode="exec",
        ),
        namespace,
    )

    return namespace["detectar_cliente_nao_assinante"]


@pytest.mark.parametrize(
    "message",
    [
        "cliente analfabeto",
        "cliente analfabeta",
        "cliente iletrado",
        "cliente iletrada",
        "cliente n\u00e3o assina",
        "cliente nao assinante",
        "cliente n\u00e3o sabe assinar",
        "cliente n\u00e3o consegue assinar",
        "cliente n\u00e3o pode assinar",
        "cliente sem assinatura",
        "cliente sem condi\u00e7\u00f5es de assinar",
        "impossibilitado de assinar",
        "incapaz de assinar",
    ],
)
def test_detecta_cliente_nao_assinante(message):
    detectar = _load_signature_helper()
    assert detectar(message) is True


@pytest.mark.parametrize(
    "message",
    [
        "cliente alfabetizado",
        "cliente alfabetizada",
        "cliente assina",
        "cliente assina normalmente",
        "cliente sabe assinar",
        "cliente consegue assinar",
        "n\u00e3o \u00e9 analfabeto",
        "nao e analfabeto",
        "n\u00e3o \u00e9 iletrado",
    ],
)
def test_detecta_cliente_assinante(message):
    detectar = _load_signature_helper()
    assert detectar(message) is False


def test_cpf_direto_define_inss_e_nao_usa_estado_antigo():
    source = _source()

    start = source.index(
        "clean_cpf = extrair_cpf_da_mensagem("
    )
    end = source.index("# Priority 4:", start)
    segment = source[start:end]

    assert "detectar_cliente_nao_assinante(" in segment
    assert 'session["convenio"] = "INSS"' in segment
    assert 'session.get("analfabeto") == "sim"' not in segment


def test_inss_oferece_cpf_ou_banco_manual():
    source = _source()

    start = source.index("# Case A: aguardando_convenio")
    end = source.index("# Case B: waiting_rules_bank", start)
    segment = source[start:end]

    assert 'if conv == "INSS":' in segment
    assert "waiting_inss_cpf_or_bank" in segment
    assert "CPF do cliente" in segment
    assert "Banco de Origem" in segment


def test_fluxo_manual_tem_chamada_real_do_gemini():
    source = _source()

    assert source.count("get_gemini_response(") == 2
    assert "ai_reply = get_gemini_response(" in source
    assert (
        'session.get("state") == "waiting_data_collection"'
        in source
    )


def test_metadata_presente_em_todos_os_success():
    source = _source()
    chat = _top_function("chat_interaction")

    success = []

    for node in ast.walk(chat):
        if not isinstance(node, ast.Return):
            continue

        segment = ast.get_source_segment(source, node) or ""

        if '"status": "success"' in segment:
            success.append(segment)

    assert len(success) == 18

    assert all(
        "chat_response_meta()" in segment
        for segment in success
    )


def test_metadata_tem_campos_da_clara_v2():
    source = _source()
    chat = _top_function("chat_interaction")

    meta = next(
        (
            node
            for node in ast.walk(chat)
            if isinstance(node, ast.FunctionDef)
            and node.name == "chat_response_meta"
        ),
        None,
    )

    assert meta is not None

    segment = ast.get_source_segment(source, meta) or ""

    assert '"sender": sender' in segment
    assert '"protocol": session.get("protocol")' in segment
    assert '"novo_atendimento": bool(' in segment
    assert '"usuario": {' in segment
    assert '"id": matched_user.id' in segment
    assert '"primeiro_nome": first_name' in segment


def test_novo_atendimento_true_somente_para_nova_sessao():
    chat = _top_function("chat_interaction")

    assignments = []

    for node in ast.walk(chat):
        if not isinstance(node, ast.Assign):
            continue

        if len(node.targets) != 1:
            continue

        target = node.targets[0]

        if not (
            isinstance(target, ast.Name)
            and target.id == "novo_atendimento"
        ):
            continue

        if not isinstance(node.value, ast.Constant):
            continue

        assignments.append(
            (
                node.lineno,
                node.value.value,
            )
        )

    false_lines = [
        line
        for line, value in assignments
        if value is False
    ]

    true_lines = [
        line
        for line, value in assignments
        if value is True
    ]

    assert len(false_lines) == 1
    assert len(true_lines) == 1
    assert false_lines[0] < true_lines[0]


def test_marcadores_v2_presentes():
    source = _source()

    assert "CLARA_V2_MANUAL_FLOW" in source
    assert "CLARA_V2_RESPONSE_META" in source
    assert "waiting_inss_cpf_or_bank" in source

def test_cpf_automatico_usa_mesmo_provider_da_consulta_web():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "from app.routers.consultas import "
        "_execute_cpf_query_flow"
        in segment
    )

    assert (
        "from app.utils.config_helper import "
        "get_active_provider"
        in segment
    )

    assert (
        "provider_type = await get_active_provider(db)"
        in segment
    )

    assert (
        "consulta_result = await _execute_cpf_query_flow("
        in segment
    )

    assert (
        "async with AsyncSessionLocal() as consulta_db:"
        in segment
    )

    assert (
        "clean_cpf,"
        in segment
        and "consulta_db,"
        in segment
        and "provider_type,"
        in segment
    )

    assert (
        '"INSS",'
        in segment
    )

    assert (
        'get_provider_by_type("promosys")'
        not in segment
    )

    assert (
        "provider = get_provider()"
        not in segment
    )

    consultas_source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(
        encoding="utf-8"
    )

    assert (
        "async def _safe_active_provider("
        in consultas_source
    )

    assert (
        "await get_active_provider("
        in consultas_source
    )

    assert (
        "provider_type = await _safe_active_provider(db)"
        in consultas_source
    )

    assert (
        "async def _execute_cpf_query_flow("
        in consultas_source
    )

def test_cpf_automatico_preserva_refin_c6():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "CLARA_C6_AUTO_REFIN_BEGIN"
        in segment
    )

    assert (
        "BankCredentialsService"
        in segment
    )

    assert (
        "resolve_decrypted_credentials_for_user"
        in segment
    )

    assert (
        "C6BankService"
        in segment
    )

    assert (
        "C6BankError"
        in segment
    )

    assert (
        "c6_service = None"
        in segment
    )

    assert (
        "provider_type = await get_active_provider(db)"
        in segment
    )

    assert (
        "async with AsyncSessionLocal() as consulta_db:"
        in segment
    )

def test_cpf_automatico_oculta_contratos_sem_oferta():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "CLARA_V2_HIDE_REJECTED_AUTO"
        in segment
    )

    assert (
        "not selected_offer"
        in segment
    )

    assert (
        "port_value <= 0"
        in segment
    )

    # Erros/reprovacoes automaticos nao devem
    # ser enviados ao WhatsApp.
    assert (
        '"Erro ao calcular portabilidade."'
        not in segment
    )

    # A mensagem generica continua existindo
    # para simulacoes manuais solicitadas pelo
    # usuario.
    assert (
        "Nenhuma oferta aprovada para este contrato"
        in source
    )


def test_cpf_automatico_prioriza_refin_c6_antes_da_portabilidade():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    c6_position = segment.index(
        ".simular_refin_inss("
    )

    port_position = segment.index(
        "selected_offer ="
    )

    assert c6_position < port_position

    assert (
        "c6_value > 0"
        in segment
    )

    assert (
        "CLARA_V2_HIDE_REJECTED_AUTO"
        in segment
    )

def test_cpf_margem_abaixo_de_15_nao_gera_simulacao():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "# CLARA_V2_MIN_MARGIN_SIMULATION"
        in segment
    )

    assert (
        "min_margin_simulation = 15.0"
        in segment
    )

    assert (
        "margin_value >= min_margin_simulation"
        in segment
    )

    assert (
        "if margin_is_eligible:"
        in segment
    )

    assert (
        "liberado_aprox = 0.0"
        in segment
    )


def test_cpf_sem_portabilidade_informa_cliente_abaixo_da_margem():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "# CLARA_V2_NO_PORTABILITY_MESSAGE"
        in segment
    )

    assert (
        "if loans and benefit_port_count <= 0:"
        in segment
    )

    assert (
        "Nenhuma proposta de portabilidade "
        in segment
    )

    assert (
        "dispon\\u00edvel para o cliente neste benef\\u00edcio"
        in segment
    )


def test_resumo_nao_exibe_libera_aprox_para_margem_inelegivel():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "if margin_is_eligible:"
        in segment
    )

    assert (
        '"\\U0001F4B5 *Margem dispon\\u00edvel:* "'
        in segment
    )

    assert (
        '"| *Libera aprox.:* "'
        in segment
    )


def test_cpf_sem_contratos_usa_cabecalho_completo_e_resumo():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    no_loans = segment.index(
        "CLARA_V2_NO_ACTIVE_LOANS"
    )

    summary = segment.index(
        "RESUMO POR BENEFICIO",
        no_loans,
    )

    part = segment[
        no_loans:summary
    ]

    assert "no_loans_reply" in part

    assert (
        "Nenhum contrato ativo "
        in part
    )

    assert (
        "encontrado para portabilidade"
        in part
    )

    # O fluxo sem contratos nao cria mais um cabecalho antigo
    # sem especie; ele preserva benefit_header e segue ao resumo.
    assert (
        "BENEF\\u00cdCIO "
        not in part
    )

    assert (
        "benefit_header += ("
        in part
    )

    assert (
        "if not loans and no_loans_reply:"
        in segment
    )

    assert (
        "benefit_header += (\n"
        "                no_loans_reply"
        in segment
    )

    assert (
        "if not loans:\n"
        "            reply += ("
        not in segment
    )

    assert (
        "RESUMO POR BENEFICIO"
        in segment
    )

    assert (
        "margin_released > 0"
        in segment
    )


def test_cpf_automatico_usa_resumo_separado_por_beneficio():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "CLARA_V2_GLOBAL_SUMMARY_BEGIN"
        in segment
    )

    assert (
        "CLARA_V2_GLOBAL_OPERATION_TOTALS"
        in segment
    )

    assert (
        "CLARA_V2_BENEFIT_VISUAL_SUMMARY"
        in segment
    )

    assert (
        "CLARA_V2_BENEFIT_SUMMARY_RENDER"
        in segment
    )

    assert (
        "RESUMO GERAL DO CLIENTE"
        not in segment
    )

    assert (
        'f"📋 *{benefit_identification}*"'
        in segment
    )

    assert (
        "benefit_refin_total"
        in segment
    )

    assert (
        "benefit_port_total"
        in segment
    )

    assert (
        "total_general"
        in segment
    )

    assert (
        "CLARA_V2_GLOBAL_SUMMARY_SESSION_ONLY"
        in segment
    )

    assert (
        "resumo_ofertas_geral"
        in segment
    )


def test_ofertas_clara_usam_formatacao_brasileira():
    source = _source()

    start = source.index(
        "async def run_simulation_and_respond("
    )

    end = source.index(
        "async def simulate_for_cpf(",
        start,
    )

    segment = source[start:end]

    assert (
        "_clara_fmt_brl("
        "best_offer['valor_parcela']"
        ")"
        in segment
    )

    assert (
        "_clara_fmt_brl("
        "best_offer['valor_total_contrato']"
        ")"
        in segment
    )

    assert (
        "_clara_fmt_brl("
        "session['saldo_devedor']"
        ")"
        in segment
    )

    assert (
        "_clara_fmt_brl("
        "best_offer['valor_liberado']"
        ")"
        in segment
    )

    assert (
        "_clara_fmt_percent("
        "best_offer['taxa_juros']"
        ")"
        in segment
    )

    assert (
        "R$ {best_offer['valor_parcela']:.2f}"
        not in segment
    )

    assert (
        "R$ {best_offer['valor_liberado']:.2f}"
        not in segment
    )


def test_clara_v2_dados_cliente_sao_compactos():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    # CLARA_WHATSAPP_CPF_LITERAL_TEST
    assert (
        "# CLARA_WHATSAPP_CPF_LITERAL"
        in segment
    )

    assert (
        'f"\\u2022 *CPF:* '
        '```{masked_cpf}```\\n"'
        in segment
    )

    assert (
        "_clara_mask_cpf(clean_cpf)"
        not in segment
    )

    assert (
        'f"{clean_cpf[:3]}.***.***-'
        '{clean_cpf[-2:]}"'
        in segment
    )

    assert (
        "client_address"
        not in segment
    )

    assert (
        "bloqueio.upper()"
        not in segment
    )

    assert (
        "def _clara_mask_cpf("
        in source
    )


def test_clara_v2_renumera_apenas_contratos_exibidos():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "displayed_contract_count = 0"
        in segment
    )

    assert (
        segment.count(
            "displayed_contract_count += 1"
        )
        == 2
    )

    assert (
        segment.count(
            "*CONTRATO "
            "{displayed_contract_count}*"
        )
        == 2
    )

    assert (
        "*CONTRATO {idx_l + 1}*"
        not in segment
    )

    assert (
        segment.count(
            "_clara_format_contract_display("
            "c.get('contrato'))"
        )
        == 2
    )


def test_clara_v2_portabilidade_prioriza_108_96_84():
    source = _source()

    start = source.index(
        "async def run_simulation_and_respond("
    )

    end = source.index(
        "async def simulate_for_cpf(",
        start,
    )

    segment = source[start:end]

    assert (
        "CLARA_V2_TERM_PRIORITY"
        in segment
    )

    assert (
        "preferred_terms = ("
        in segment
    )

    assert "108," in segment
    assert "96," in segment
    assert "84," in segment

    assert (
        'session["selected_offer"] = best_offer'
        in segment
    )

    compact_start = segment.index(
        "if compact:"
    )

    compact_end = segment.index(
        "else:",
        compact_start,
    )

    compact = segment[
        compact_start:compact_end
    ]

    assert (
        "session['saldo_devedor']"
        not in compact
    )


def test_clara_v2_refin_c6_tenta_108_96_84():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    refin = segment.index(
        "PRIORIDADE: REFIN C6 "
        "108X -> 96X -> 84X"
    )

    fallback = segment.index(
        "run_simulation_and_respond(",
        refin,
    )

    block = segment[
        refin:fallback
    ]

    assert (
        "for c6_requested_term in ("
        in block
    )

    assert "108," in block
    assert "96," in block
    assert "84," in block

    assert (
        "prazo=(\n"
        "                                        "
        "c6_requested_term"
        in block
    )

    assert (
        "c6_selected_term"
        in block
    )


def test_clara_v2_mensagens_convenio_sem_caracteres_quebrados():
    source = _source()

    assert (
        r"\u2705 *Conv\u00eanio INSS selecionado."
        in source
    )

    assert (
        "Conv?nio INSS selecionado"
        not in source
    )

    assert (
        "simula??o manual"
        not in source
    )


def test_clara_v2_nao_possui_textos_corrompidos():
    source = _source()

    broken_tokens = (
        "autom?tica",
        "indispon?vel",
        "v?lido",
        "est? selecionado",
        "Integra??o",
        "n?o conseguimos",
        "BENEF?CIO",
        "Op??o",
        "inv?lida",
        "qual ? o seu",
        "1?? INSS",
        "2?? SIAPE",
        "3?? GOVERNO",
        "4?? FOR?AS",
        "5?? CLT",
        '"n?o"',
        '"n?o sei"',
    )

    for token in broken_tokens:
        assert token not in source

    assert (
        r"consulta autom\u00e1tica"
        in source
    )

    assert (
        r"Consulta CPF indispon\u00edvel"
        in source
    )

    assert (
        r"Erro de Integra\u00e7\u00e3o"
        in source
    )

    assert (
        'f"📋 *{benefit_identification}*\\n"'
        in source
    )

    assert (
        r"Op\u00e7\u00e3o inv\u00e1lida"
        in source
    )

    assert (
        r"FOR\u00c7AS ARMADAS"
        in source
    )


# CLARA_PRODUCTION_FOLLOW_UP_TESTS

def test_cpf_automatico_cache_usa_aliases_e_numero_exibido():
    source = _source()

    assert (
        "# CLARA_SIMULATION_CACHE_ALIASES"
        in source
    )

    assert (
        "input_data.dict(\n"
        "                by_alias=True"
        in source
    )

    assert (
        "# CLARA_DISPLAY_CONTRACT_COUNTER"
        in source
    )

    assert (
        "# CLARA_CACHE_DISPLAY_CONTRACT_NUMBER"
        in source
    )

    assert (
        "c_idx=displayed_contract_count + 1"
        in source
    )


def test_cpf_automatico_menu_e_resposta_sao_separados():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "# CLARA_POST_MENU_SEPARATE_REPLY"
        in segment
    )

    assert (
        "+ post_menu"
        not in segment
    )

    assert (
        '"post_simulation_menu"'
        in segment
    )

    assert (
        "# CLARA_FOLLOW_UP_REPLY"
        in source
    )

    assert (
        '"follow_up_reply"'
        in source
    )

def test_resumo_geral_exibe_identificacao_completa_beneficio():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "from inss_species import ESPECIES_INSS_MAP"
        in source
    )

    assert (
        "# CLARA_V2_BENEFIT_IDENTIFICATION"
        in segment
    )

    assert (
        'f"📋 *{benefit_identification}*\\n"'
        in segment
    )

    assert (
        '"📊 *RESUMO GERAL*"'
        in segment
    )

    assert (
        'f"📋 *{benefit_identification}*"'
        in segment
    )

    assert (
        'f"📊 *RESUMO GERAL — "'
        not in segment
    )

    assert (
        '"identificacao_beneficio":'
        in segment
    )


def test_resumo_multiplos_beneficios_nao_consolida_valores_visuais():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "RESUMO GERAL DO CLIENTE"
        not in segment
    )

    assert (
        "benefit_identifications = []"
        not in segment
    )

    assert (
        "if benefit_count > 1:"
        not in segment
    )

    assert (
        "benefit_summary_lines"
        in segment
    )

    assert (
        "benefit_refin_count"
        in segment
    )

    assert (
        "benefit_port_count"
        in segment
    )



def test_clara_reutiliza_coeficiente_e_valor_da_consulta_cpf_para_73_mais():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "# CLARA_V2_SHARED_MARGIN_COEFFICIENT"
        in segment
    )

    assert (
        '"valor_liberado_margem"'
        in segment
    )

    assert (
        "backend_margin_released > 0"
        in segment
    )

    assert (
        "resolve_margin_convenio("
        in segment
    )

    assert (
        "convenio=margin_convenio"
        in segment
    )


def test_clara_separador_antes_de_todo_beneficio_e_quebra_entre_beneficios():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        'f"➖➖➖➖➖➖➖➖➖➖\\n\\n"'
        in segment
    )

    assert (
        'reply += "\\n\\n"'
        in segment
    )

    assert (
        'f"📋 *{benefit_identification}*\\n"'
        in segment
    )



def test_margem_72_a_77_usa_regra_fixa_de_prazo_reduzido():
    source = (
        ROOT
        / "app"
        / "services"
        / "margem_service.py"
    ).read_text(encoding="utf-8")

    assert (
        "REDUCED_TERM_MARGIN_START_AGE = 72"
        in source
    )

    assert (
        "REDUCED_TERM_MARGIN_MAX_AGE = 77"
        in source
    )

    assert (
        "REDUCED_TERM_MIN_CONTRACT_AMOUNT = 1000.00"
        in source
    )

    for idade, prazo, coeficiente in [
        (72, 96, "0.02340"),
        (73, 84, "0.02463"),
        (74, 72, "0.02638"),
        (75, 60, "0.02894"),
        (76, 48, "0.03293"),
        (77, 36, "0.03980"),
    ]:
        assert (
            f'{idade}: {{"term": {prazo}, "coefficient": {coeficiente}}}'
            in source
        )

    assert (
        "valor_contrato"
        in source
    )

    assert (
        "< REDUCED_TERM_MIN_CONTRACT_AMOUNT"
        in source
    )


def test_consulta_cpf_repassa_idade_ao_calculo_de_margem():
    source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(encoding="utf-8")

    assert (
        "# CONSULTA_CPF_AGE_MARGIN_COEFFICIENT"
        in source
    )

    assert (
        "_coerce_consulta_age("
        in source
    )

    assert (
        "idade_cliente = _coerce_consulta_age("
        in source
    )

    assert (
        "idade=idade_cliente"
        in source
    )

    assert (
        "coeficiente_fator=coef_fator"
        in source
    )


def test_clara_fallback_de_margem_repassa_idade_do_beneficio():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "benefit_age = int("
        in segment
    )

    assert (
        "idade=benefit_age"
        in segment
    )



def test_frontend_nao_recalcula_margem_localmente_para_72_mais():
    cpf_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "consultas"
        / "cpf"
        / "page.js"
    ).read_text(encoding="utf-8")

    simulador_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "simulador"
        / "page.js"
    ).read_text(encoding="utf-8")

    assert (
        "usaRegraPrazoReduzido"
        in cpf_source
    )

    assert (
        "usaRegraPrazoReduzido"
        in simulador_source
    )

    assert (
        "idadeCliente >= 72"
        in cpf_source
    )

    assert (
        "idadeClienteMargem >= 72"
        in simulador_source
    )



def test_cache_consulta_cpf_recalcula_margem_com_idade():
    source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(encoding="utf-8")

    assert (
        'context="cache_beneficio"'
        in source
    )

    assert (
        "_coerce_consulta_age("
        in source
    )

    assert (
        "idade=idade_cliente"
        in source
    )

    assert (
        "coeficiente_fator=coef_fator"
        in source
    )

    assert (
        '"prazo_margem"'
        in source
    )


def test_clara_72_77_ignora_valor_antigo_e_recalcula():
    source = _source()

    start = source.index(
        "async def simulate_for_cpf("
    )

    end = source.index(
        '@router.post("/external/chat")',
        start,
    )

    segment = source[start:end]

    assert (
        "# CLARA_V2_FORCE_REDUCED_TERM_RECALC"
        in segment
    )

    assert (
        "if benefit_margin_term:"
        in segment
    )

    recalc_index = segment.index(
        "if benefit_margin_term:"
    )

    backend_index = segment.index(
        "elif backend_margin_released > 0:",
        recalc_index,
    )

    assert recalc_index < backend_index



def test_frontend_exibe_selo_prazo_da_margem():
    cpf_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "consultas"
        / "cpf"
        / "page.js"
    ).read_text(encoding="utf-8")

    simulador_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "simulador"
        / "page.js"
    ).read_text(encoding="utf-8")

    assert (
        "Prazo {Number(marginInfo.prazoMargem)}x"
        in cpf_source
    )

    assert (
        "prazo_margem:"
        in simulador_source
    )

    assert (
        "Prazo {Number(formData.prazo_margem)}x"
        in simulador_source
    )



@pytest.mark.parametrize(
    "message,expected",
    [
        ("12345678909", "12345678909"),
        ("123.456.789-09", "12345678909"),
        ("123 456 789 09", "12345678909"),
        ("12345 6789 09", "12345678909"),
        ("CPF: 123 45 6789-09", "12345678909"),
    ],
)
def test_clara_extrai_cpf_com_espacos_e_pontuacao(
    message,
    expected,
):
    extrair = _load_cpf_helper()
    assert extrair(message) == expected


@pytest.mark.parametrize(
    "message",
    [
        "12345 456 22",
        "1234567890",
        "123456789012",
    ],
)
def test_clara_nao_aceita_cpf_com_quantidade_incorreta_de_digitos(
    message,
):
    extrair = _load_cpf_helper()
    assert extrair(message) is None


def test_salvar_configuracao_do_banco_preserva_logo():
    frontend_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "admin"
        / "banks"
        / "page.tsx"
    ).read_text(encoding="utf-8")

    admin_source = (
        ROOT
        / "app"
        / "routers"
        / "admin.py"
    ).read_text(encoding="utf-8")

    submit_start = frontend_source.index(
        "const handleSubmit = async"
    )
    submit_end = frontend_source.index(
        "const handleAgreementChange",
        submit_start,
    )
    submit_segment = frontend_source[
        submit_start:submit_end
    ]

    assert (
        "logo_url: formData.logo_url"
        not in submit_segment
    )

    assert (
        'safe_bank_data.pop("logo_url", None)'
        in admin_source
    )

    assert (
        '"/banks/{bank_id}/upload-logo"'
        in admin_source
    )



def test_resumo_visual_bancos_prioriza_taxa_refin_das_tabelas():
    bancos_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "bancos"
        / "page.jsx"
    ).read_text(encoding="utf-8")

    # A correção é exclusiva do resumo visual da página
    # Bancos e Regras. Não altera motor, backend ou PDF.
    assert (
        bancos_source.count(
            "RESUMO_REGRAS_REFIN_TABLE_PRIORITY"
        )
        == 1
    )

    assert (
        bancos_source.count(
            "const refinRateValue = fallbackRefinRate !== null"
        )
        == 1
    )

    assert (
        bancos_source.count(
            ".filter(rate => Number.isFinite(rate) && rate > 0)"
        )
        >= 1
    )

    # O bloco do PDF permanece com a lógica anterior.
    assert (
        "const refinRateValue = hasRefinThreshold ? "
        "rule.refin_portability_rate_threshold : fallbackRefinRate;"
        in bancos_source
    )



def test_resumo_visual_bancos_usa_taxa_convenio_e_ignora_generica_quando_ha_explicita():
    bancos_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "bancos"
        / "page.jsx"
    ).read_text(encoding="utf-8")

    assert (
        "const explicitAgreementTables = tablesForAgreement.filter("
        in bancos_source
    )

    assert (
        "const refinRateTables = explicitAgreementTables.length > 0"
        in bancos_source
    )

    assert (
        ".map(t => Number(t.taxa_convenio))"
        in bancos_source
    )

    assert (
        ".map(t => Number(t.min_rate))"
        in bancos_source
    )

    assert (
        "Number(refinRateValue).toFixed(2).replace('.', ',')"
        in bancos_source
    )



def _load_can_delete_managed_user():
    source = (
        ROOT
        / "app"
        / "services"
        / "admin_service.py"
    ).read_text(encoding="utf-8")

    tree = ast.parse(source)

    helper = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name
            == "can_delete_managed_user"
        ),
        None,
    )

    assert helper is not None

    module = ast.Module(
        body=[helper],
        type_ignores=[],
    )
    ast.fix_missing_locations(module)

    namespace = {}

    exec(
        compile(
            module,
            filename="admin_service.py",
            mode="exec",
        ),
        namespace,
    )

    return namespace[
        "can_delete_managed_user"
    ]


def test_admin_pode_excluir_usuario():
    from types import SimpleNamespace

    can_delete = _load_can_delete_managed_user()

    admin = SimpleNamespace(
        id=1,
        role="admin",
    )
    target = SimpleNamespace(
        id=99,
        role="promotora",
        created_by_user_id=None,
        broker_id=None,
    )

    assert can_delete(admin, target) is True


@pytest.mark.parametrize(
    "role",
    ["vendedor", "corretor"],
)
def test_promotora_pode_excluir_usuario_criado_por_ela(
    role,
):
    from types import SimpleNamespace

    can_delete = _load_can_delete_managed_user()

    promotora = SimpleNamespace(
        id=10,
        role="promotora",
    )
    target = SimpleNamespace(
        id=20,
        role=role,
        created_by_user_id=10,
        broker_id=10,
    )

    assert can_delete(
        promotora,
        target,
    ) is True


def test_promotora_nao_exclui_usuario_criado_por_outro():
    from types import SimpleNamespace

    can_delete = _load_can_delete_managed_user()

    promotora = SimpleNamespace(
        id=10,
        role="promotora",
    )
    target = SimpleNamespace(
        id=20,
        role="corretor",
        created_by_user_id=1,
        broker_id=10,
    )

    assert can_delete(
        promotora,
        target,
    ) is False


@pytest.mark.parametrize(
    "role",
    ["admin", "promotora"],
)
def test_promotora_nao_exclui_admin_ou_outra_promotora(
    role,
):
    from types import SimpleNamespace

    can_delete = _load_can_delete_managed_user()

    promotora = SimpleNamespace(
        id=10,
        role="promotora",
    )
    target = SimpleNamespace(
        id=20,
        role=role,
        created_by_user_id=10,
        broker_id=10,
    )

    assert can_delete(
        promotora,
        target,
    ) is False


def test_promotora_pode_excluir_usuario_legado_da_propria_equipe():
    from types import SimpleNamespace

    can_delete = _load_can_delete_managed_user()

    promotora = SimpleNamespace(
        id=10,
        role="promotora",
    )
    legacy_target = SimpleNamespace(
        id=20,
        role="vendedor",
        created_by_user_id=None,
        broker_id=10,
    )

    assert can_delete(
        promotora,
        legacy_target,
    ) is True


def test_pagina_usuarios_respeita_can_delete():
    users_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "admin"
        / "users"
        / "page.tsx"
    ).read_text(encoding="utf-8")

    assert (
        "can_delete?: boolean;"
        in users_source
    )

    assert (
        "loggedUser?.role === 'admin' || user.can_delete"
        in users_source
    )

    service_source = (
        ROOT
        / "app"
        / "services"
        / "admin_service.py"
    ).read_text(encoding="utf-8")

    assert (
        '"can_delete": can_delete_managed_user('
        in service_source
    )

    assert (
        "# PROMOTORA_DELETE_OWN_USERS"
        in service_source
    )



def _load_consulta_age_helper():
    source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(encoding="utf-8")

    tree = ast.parse(source)

    helper = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name == "_coerce_consulta_age"
        ),
        None,
    )

    assert helper is not None

    module = ast.Module(
        body=[helper],
        type_ignores=[],
    )
    ast.fix_missing_locations(module)

    from datetime import datetime

    namespace = {
        "datetime": datetime,
    }

    exec(
        compile(
            module,
            filename="consultas.py",
            mode="exec",
        ),
        namespace,
    )

    return namespace[
        "_coerce_consulta_age"
    ]


@pytest.mark.parametrize(
    "value,expected",
    [
        (76, 76),
        (76.0, 76),
        ("76", 76),
        ("76.0", 76),
        ("76 anos", 76),
        (" 72 ", 72),
    ],
)
def test_consulta_cpf_normaliza_idade_de_cache_antigo(
    value,
    expected,
):
    normalize_age = _load_consulta_age_helper()

    assert (
        normalize_age(
            {"idade": value}
        )
        == expected
    )


def test_consulta_cpf_regra_margem_nao_invalida_provider():
    source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(encoding="utf-8")

    assert (
        "async def _apply_consulta_margin_rules("
        in source
    )

    assert (
        "Falha ao aplicar regra de margem "
        in source
    )

    assert (
        "sem invalidar os dados da consulta. "
        in source
    )

    assert (
        "await _apply_consulta_margin_rules("
        in source
    )

    assert (
        "# O cálculo de margem é pós-processamento."
        in source
    )


def test_consulta_cpf_cache_nao_usa_int_direto_na_idade():
    source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(encoding="utf-8")

    flow_start = source.index(
        "async def _execute_cpf_query_flow("
    )

    flow_end = source.index(
        "async def _execute_beneficio_query_flow(",
        flow_start,
    )

    flow = source[
        flow_start:flow_end
    ]

    assert (
        'idade_cliente = int(\n'
        '                            cliente.get("idade")'
        not in flow
    )

    assert (
        'context="cache_beneficio"'
        in flow
    )



def _load_consulta_number_helper():
    source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(encoding="utf-8")

    tree = ast.parse(source)

    helper = next(
        (
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef)
            and node.name
            == "_coerce_consulta_number"
        ),
        None,
    )

    assert helper is not None

    module = ast.Module(
        body=[helper],
        type_ignores=[],
    )
    ast.fix_missing_locations(module)

    namespace = {}

    exec(
        compile(
            module,
            filename="consultas.py",
            mode="exec",
        ),
        namespace,
    )

    return namespace[
        "_coerce_consulta_number"
    ]


@pytest.mark.parametrize(
    "value,expected",
    [
        (398.25, 398.25),
        ("398.25", 398.25),
        ("398,25", 398.25),
        ("R$ 398,25", 398.25),
        ("1.234,56", 1234.56),
    ],
)
def test_consulta_cpf_normaliza_margem_de_cache_antigo(
    value,
    expected,
):
    normalize_number = (
        _load_consulta_number_helper()
    )

    assert (
        normalize_number(value)
        == expected
    )



def test_admin_consulta_cpf_tem_botao_iniciar_contador_multicorban():
    page_source = (
        ROOT.parent
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "consultas"
        / "cpf"
        / "page.js"
    ).read_text(encoding="utf-8")

    router_source = (
        ROOT
        / "app"
        / "routers"
        / "consultas.py"
    ).read_text(encoding="utf-8")

    assert (
        "Iniciar Contador"
        in page_source
    )

    assert (
        "handleStartCounter"
        in page_source
    )

    assert (
        '"/consultas/multicorban/iniciar-contador"'
        in page_source
    )

    assert (
        '@router.post("/multicorban/iniciar-contador")'
        in router_source
    )

    assert (
        "set_multicorban_counter_start("
        in router_source
    )
