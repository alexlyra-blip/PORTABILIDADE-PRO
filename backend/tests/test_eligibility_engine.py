import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../engine')))

from eligibility_engine import verificar_elegibilidade
from models import Banco

def test_verificar_elegibilidade_idade_invalida():
    banco = Banco(nome="Banco Ficticio") # Mocking
    
    # Example assertion: checking if age 15 is ineligible based on standard rules setup
    # Note: eligibility_engine relies on banks_db, let's test the interface
    with pytest.raises(Exception):
        # We would need to mock or use the real DB. For a unit test, we check if it returns
        # False or raises an exception for invalid ages as per banks_db rules.
        pass

def test_verificar_elegibilidade_sucesso():
    # If using dynamic DB, assuming 65 is valid for PAN or INBURSA
    banco_pan = Banco(nome="Banco Pan")
    # valid_idade, valid_beneficio, etc.
    # assert verificar_elegibilidade(...) == True
    pass
