from pydantic import BaseModel
from typing import Optional

class ContractBase(BaseModel):
    id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    broker_id: Optional[int] = None
    data_aceite: Optional[str] = None
    data_hora: Optional[str] = None
    cliente: Optional[str] = None
    cpf: Optional[str] = None
    banco: Optional[str] = None
    convenio: Optional[str] = None
    parcela: Optional[float] = None
    tabela: Optional[str] = None
    taxa: Optional[float] = None
    valor_contrato: Optional[float] = None
    valor_troco: Optional[float] = None
    instituicao_origem: Optional[str] = None
    saldo_devedor: Optional[float] = None
    prazo_restante: Optional[int] = None
    orig_parcela: Optional[float] = None
    status: Optional[str] = "PENDENTE"
    data_cip: Optional[str] = None
    numero_proposta: Optional[str] = None
    status_updated_at: Optional[str] = None
    refin_status: Optional[str] = None
    port_status: Optional[str] = None
    data_pago: Optional[str] = None
    data_reprovado: Optional[str] = None

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    cliente: Optional[str] = None
    cpf: Optional[str] = None
    numero_proposta: Optional[str] = None
    status: Optional[str] = None
    data_cip: Optional[str] = None
    status_updated_at: Optional[str] = None
    refin_status: Optional[str] = None
    port_status: Optional[str] = None
    data_pago: Optional[str] = None
    data_reprovado: Optional[str] = None

class ContractResponse(ContractBase):
    user_id: Optional[int] = None

    class Config:
        from_attributes = True
