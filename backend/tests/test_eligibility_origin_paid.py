import os
import sys
from pathlib import Path
from types import SimpleNamespace

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://mock:mock@localhost:5432/mock",
)

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"

for path in (str(ROOT), str(BACKEND)):
    if path not in sys.path:
        sys.path.insert(0, path)

from app.models.models import SimulacaoInput
from engine.eligibility_engine import (
    resolver_parcelas_pagas,
    verificar_elegibilidade,
)


def _rule(min_paid_facta):
    return SimpleNamespace(
        active=True,
        min_age=None,
        max_age=None,
        allowed_benefit_types="INSS",
        excluded_origin_banks=None,
        min_paid_installments=0,
        origin_banks_min_paid=(
            '{"FACTA": '
            + str(min_paid_facta)
            + "}"
        ),
        accepts_60_plus=True,
        literacy_required=False,
        min_debt_balance=None,
        min_installment_value=None,
        excluded_benefit_types=None,
        accepts_disability=True,
        accepts_loas=True,
        disability_max_age=None,
        disability_grace_age=None,
        disability_min_age=None,
        disability_min_benefit_years=None,
        disability_min_benefit_months=None,
    )


def _client(parcelas_pagas):
    return SimulacaoInput(
        banco="935",
        convenio="INSS",
        idade=65,
        parcela=250.00,
        saldo_devedor=8000.00,
        total_term=84,
        remaining_term=54,
        parcelas_pagas=parcelas_pagas,
        benefit_species="41",
    )


def test_parcelas_pagas_explicitas_prevalecem_sobre_prazo():
    client = _client(11)

    # 84 - 54 = 30. Antes da correção o motor usava 30
    # e ignorava as 11 parcelas realmente pagas.
    assert resolver_parcelas_pagas(client) == 11


def test_facta_com_11_pagas_bloqueia_c6_quando_regra_exige_12():
    elegivel, motivo = verificar_elegibilidade(
        _client(11),
        _rule(12),
    )

    assert elegivel is False
    assert "11/12" in motivo


def test_facta_com_12_pagas_libera_c6_quando_regra_exige_12():
    elegivel, motivo = verificar_elegibilidade(
        _client(12),
        _rule(12),
    )

    assert elegivel is True
    assert motivo == "Elegível"


def test_facta_com_23_pagas_bloqueia_daycoval_quando_regra_exige_24():
    elegivel, motivo = verificar_elegibilidade(
        _client(23),
        _rule(24),
    )

    assert elegivel is False
    assert "23/24" in motivo


def test_facta_com_24_pagas_libera_daycoval_quando_regra_exige_24():
    elegivel, motivo = verificar_elegibilidade(
        _client(24),
        _rule(24),
    )

    assert elegivel is True
    assert motivo == "Elegível"


def test_sem_parcelas_pagas_explicitas_mantem_fallback_legado():
    client = _client(None)

    assert resolver_parcelas_pagas(client) == 30



def test_frontend_importa_parcelas_pagas_e_nao_valor_da_parcela():
    source = (
        ROOT
        / "frontend"
        / "src"
        / "app"
        / "(crm)"
        / "simulador"
        / "page.js"
    ).read_text(encoding="utf-8")

    assert (
        "selectedLoan.parcelas_pagas ??"
        in source
    )

    assert (
        "selectedLoan.parcela_atual ??"
        not in source
    )

    assert (
        "parcelas_pagas:" in source
    )

    assert (
        'emp.parcelas_pagas !== undefined'
        in source
    )



def test_match_codigo_935_facta_com_regra_facta():
    from engine.eligibility_engine import (
        _banco_corresponde,
    )

    assert (
        _banco_corresponde(
            "935",
            "FACTA",
        )
        is True
    )


def test_mapa_simulacao_normaliza_935_como_facta():
    source = (
        ROOT
        / "engine"
        / "simulation_engine.py"
    ).read_text(encoding="utf-8")

    assert (
        '"935": "FACTA FINANCEIRA"'
        in source
    )
