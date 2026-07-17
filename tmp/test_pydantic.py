from pydantic import BaseModel, Field
from typing import Optional

class SimulacaoInput(BaseModel):
    valor_parcela: float = Field(..., alias="parcela")
    convenio: str = Field(..., description="Convênio")

    model_config = {
        "populate_by_name": True
    }

try:
    data = {"parcela": 500.0, "convenio": "INSS"}
    obj = SimulacaoInput(**data)
    print(f"Attribute valor_parcela: {obj.valor_parcela}")
    print(f"Attempting to access alias 'parcela' as attribute...")
    try:
        print(f"Attribute parcela: {obj.parcela}")
    except AttributeError as e:
        print(f"Caught expected AttributeError: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
