"""Regressao: Clara nao simula beneficios inativos, cessados ou excluidos."""
from pathlib import Path
import ast


CHAT_PATH = Path(__file__).resolve().parents[1] / "app" / "routers" / "chat.py"


def _load_filter():
    source = CHAT_PATH.read_text(encoding="utf-8")
    module = ast.parse(source)
    helper = next(
        node for node in module.body
        if isinstance(node, ast.FunctionDef) and node.name == "_clara_beneficio_ativo"
    )
    namespace = {}
    exec(compile(ast.Module(body=[helper], type_ignores=[]), str(CHAT_PATH), "exec"), namespace)
    return namespace["_clara_beneficio_ativo"]


def test_filtra_somente_beneficio_ativo():
    ativo = _load_filter()
    assert ativo({"beneficio": {"situacao": "Ativo"}})
    assert ativo({"beneficio": {"situacao": " ATIVO "}})
    assert not ativo({"beneficio": {"situacao": "Inativo"}})
    assert not ativo({"beneficio": {"situacao": "Cessado"}})
    assert not ativo({"beneficio": {"situacao": "Excluido"}})
    assert not ativo({"beneficio": {"situacao": "Suspenso"}})
    assert not ativo({"beneficio": {"situacao": None}})
    assert not ativo({"beneficio": {}})
    assert not ativo({})


def test_filtro_antecede_qualquer_simulacao_ou_resumo():
    source = CHAT_PATH.read_text(encoding="utf-8")
    start = source.index("async def simulate_for_cpf(")
    end = source.index('@router.post("/external/chat")', start)
    segment = source[start:end]
    assert segment.index("beneficios = [b for b in beneficios if _clara_beneficio_ativo(b)]") < segment.index("for idx_b, b in enumerate(beneficios):")
    assert "Nenhum benefício ativo encontrado" in segment
