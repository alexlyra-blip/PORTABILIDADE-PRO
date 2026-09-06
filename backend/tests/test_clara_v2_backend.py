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
        "provider_type = await get_active_provider(db)"
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

def test_cpf_sem_contratos_retorna_margem_e_valor_liberado():
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

    assert "Margem Livre" in part

    assert (
        "Valor aproximado liberado"
        in part
    )

    assert (
        "fmt_brl(margin_value_no_loans)"
        in part
    )

    assert (
        "fmt_brl(released_no_loans)"
        in part
    )

    assert (
        "reply += ("
        in part
    )

    assert (
        '+ (no_loans_reply or "")'
        in part
    )

    # O cabe?alho normal do benef?cio tamb?m cont?m
    # margem. No cen?rio sem contratos ele N?O pode
    # ser usado, evitando duplicidade.
    guard = part[
        part.rindex("if not loans:"):
    ]

    assert (
        "benefit_header"
        not in guard
    )

    assert (
        "continue"
        in guard
    )
