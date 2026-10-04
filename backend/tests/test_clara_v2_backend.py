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

    start = source.index("cpf_matches = re.findall")
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
        'idade_cliente = int('
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
        "# CONSULTA_CPF_CACHE_AGE_MARGIN"
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
