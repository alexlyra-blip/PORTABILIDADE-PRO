import pytest
import sys
import os

# Append the engine path to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../engine')))

from eligibility_engine import _banco_corresponde

def test_banco_corresponde_do_prepositions_collision():
    # 1. Test that prepositions like DO, DE, DA do not cause false matches
    assert not _banco_corresponde("BANCO DO ESTADO DO SERGIPE", "BANCO DO BRASIL")
    assert not _banco_corresponde("047 - BANCO DO ESTADO DE SERGIPE", "BANCO DO BRASIL")
    assert not _banco_corresponde("BANCO DE BRASILIA", "BANCO DO ESTADO DO SERGIPE")
    
    # 2. Test that actual identical or minor spelling variant banks match correctly
    assert _banco_corresponde("047 - BANCO DO ESTADO DE SERGIPE", "BANCO DO ESTADO DO SERGIPE")
    assert _banco_corresponde("001 - BANCO DO BRASIL S.A.", "BANCO DO BRASIL")
    assert _banco_corresponde("335 - DIGIO", "DIGIO")
    assert _banco_corresponde("623 - PAN", "PAN")
    assert _banco_corresponde("029 - ITAU", "ITAU CONSIGNADO")
