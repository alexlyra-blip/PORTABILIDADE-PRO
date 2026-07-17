import sys
import os

# Mocking the models for verification
from pydantic import BaseModel, Field
from typing import Optional

class SimulacaoInput(BaseModel):
    banco_atual: str = Field(..., alias="banco")
    agreement: str = Field(..., alias="convenio")
    idade: int = Field(..., gt=17, le=100)
    parcela: float = Field(..., gt=0)
    saldo_devedor: float = Field(..., gt=0)
    total_term: int = Field(..., gt=0)
    remaining_term: int = Field(..., gt=0)
    taxa_atual: Optional[float] = Field(None)
    benefit_species: Optional[str] = Field(None)
    cpf: Optional[str] = Field(None)
    nome_cliente: Optional[str] = Field(None)

    class Config:
        populate_by_name = True

# Simulate Frontend Payload
payload = {
    "nome_cliente": "Maria teste",
    "cpf": "123.456.789-00",
    "idade": 65,
    "convenio": "INSS",
    "benefit_species": "41",
    "banco": "029 - ITAU",
    "parcela": 500.0,
    "saldo_devedor": 15000.0,
    "taxa_atual": 1.85,
    "total_term": 84,
    "remaining_term": 72
}

try:
    obj = SimulacaoInput(**payload)
    print("SUCCESS: Pydantic model parsed payload correctly.")
    
    # Verify attribute access (what the engine does)
    print(f"Accessing attributes:")
    print(f" - agreement: {obj.agreement}")
    print(f" - banco_atual: {obj.banco_atual}")
    print(f" - parcela: {obj.parcela}")
    print(f" - total_term: {obj.total_term}")
    print(f" - remaining_term: {obj.remaining_term}")
    print(f" - taxa_atual: {obj.taxa_atual}")
    
    assert obj.agreement == "INSS"
    assert obj.banco_atual == "029 - ITAU"
    assert obj.parcela == 500.0
    assert obj.total_term == 84
    assert obj.remaining_term == 72
    
    print("ALL VERIFICATIONS PASSED!")
except AttributeError as e:
    print(f"FAILED: AttributeError: {e}")
except Exception as e:
    print(f"FAILED: Unexpected error: {e}")
