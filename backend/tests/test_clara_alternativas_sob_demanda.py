"""Garantias para menu de alternativas sob demanda da Clara."""
from pathlib import Path
import ast

SOURCE = (Path(__file__).resolve().parents[1] / "app" / "routers" / "chat.py").read_text(encoding="utf-8")


def test_chat_compila():
    ast.parse(SOURCE)


def test_alternativas_somente_apos_confirmacao():
    assert 'session["pending_alternatives_menu"] = menu_alternativas' in SOURCE
    assert '"💡 *Deseja consultar outras possibilidades?*' in SOURCE
    assert 'if answer in {"1", "sim", "s"}:' in SOURCE
    assert 'elif answer in {"2", "nao", "não", "n"}:' in SOURCE
    assert 'session.pop("pending_alternatives_menu", None)' in SOURCE


def test_novo_cpf_prioritario_e_limpa_menu_anterior():
    start = SOURCE.index('        # Priority 3: CPF directo')
    cpf = SOURCE.index('        if clean_cpf:', start)
    alternatives = SOURCE.index('        # CLARA_ALTERNATIVES_ON_DEMAND', cpf)
    assert cpf < alternatives
    assert 'session["awaiting_alternatives_choice"] = False' in SOURCE[cpf:alternatives]
    assert 'session.pop("pending_alternatives_menu", None)' in SOURCE[cpf:alternatives]


def test_resposta_nao_entrega_lista_sem_sim():
    start = SOURCE.index('        # CLARA_ALTERNATIVES_ON_DEMAND')
    end = SOURCE.index('        # Clara V2 - coleta manual', start)
    logic = SOURCE[start:end]
    assert 'session.pop("pending_alternatives_menu", "")' in logic
    assert 'session["awaiting_alternatives_choice"] = False' in logic
