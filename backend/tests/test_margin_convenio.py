import pytest

from app.services.margem_service import (
    get_default_margin_coefficient,
    normalize_margin_convenio,
    resolve_margin_convenio,
)


def test_normaliza_convenios_suportados():
    assert normalize_margin_convenio("inss") == "INSS"
    assert normalize_margin_convenio(" SIAPE ") == "SIAPE"


def test_rejeita_convenio_nao_suportado():
    with pytest.raises(ValueError):
        normalize_margin_convenio("GOVERNO")


def test_inss_mantem_coeficiente_padrao():
    assert get_default_margin_coefficient("INSS") == 0.02270


def test_siape_nao_herda_coeficiente_do_inss():
    assert get_default_margin_coefficient("SIAPE") == 0.0



def test_consultas_de_outros_convenios_mantem_base_inss():
    assert resolve_margin_convenio("GOVERNO") == "INSS"
    assert resolve_margin_convenio("CLT") == "INSS"
    assert resolve_margin_convenio("SIAPE") == "SIAPE"
