from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class SimulacaoInput(BaseModel):
    # Campos base solicitados
    banco: str = Field(..., description="Banco originador")
    convenio: str = Field(..., description="Convênio (INSS, SIAPE, etc)")
    sub_convenio: Optional[str] = Field(None, description="Sub-convênio (Exército, Marinha, SP, RJ, etc)")
    idade: int = Field(..., gt=17, le=100, description="Idade do cliente")
    
    # Campos financeiros
    valor_parcela: float = Field(..., gt=0, alias="parcela", description="Valor da parcela mensal")
    saldo_devedor: float = Field(..., gt=0, description="Saldo devedor total")
    prazo_total: int = Field(..., gt=0, alias="total_term", description="Prazo total do contrato")
    prazo_restante: int = Field(..., gt=0, alias="remaining_term", description="Prazo restante do contrato")
    
    # Campos opcionais
    taxa_juros: Optional[float] = Field(None, alias="taxa_atual", description="Taxa de juros atual (%)")
    especie_beneficio: Optional[str] = Field(None, alias="benefit_species", description="Espécie do benefício (específico para INSS)")
    cpf_cliente: Optional[str] = Field(None, alias="cpf", description="CPF do cliente for registro")
    nome_cliente: Optional[str] = Field(None, description="Nome do cliente")
    benefit_time_years: Optional[int] = Field(0, description="Tempo de benefício (anos)")
    benefit_time_months: Optional[int] = Field(0, description="Tempo de benefício (meses)")
    data_concessao: Optional[str] = Field(None, description="Data de concessão do benefício (YYYY-MM-DD)")
    analfabeto: bool = Field(False, description="Cliente analfabeto?")
    
    # New Phase 5 Fields
    is_60_plus: bool = Field(False, description="Cliente 60+")
    is_invalidez_60_plus: bool = Field(False, description="Invalidez acima de 60 anos")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "banco": "ITAU",
                "convenio": "INSS",
                "idade": 65,
                "parcela": 500.0,
                "saldo_devedor": 15000.0,
                "total_term": 84,
                "remaining_term": 72,
                "taxa_atual": 1.85,
                "benefit_species": "41"
            }
        }

class BancoAprovado(BaseModel):
    banco: str
    bank_id: int
    logo_url: Optional[str] = None
    convenio: str
    tabela: str = "Tabela Padrão"
    taxa_juros: float
    taxa_refin: Optional[float] = None
    valor_liberado: float
    valor_total_contrato: float
    valor_parcela: float = 0.0
    taxa_portabilidade_atual: float = 0.0
    taxa_refin_ponderada: float = 0.0
    prazo: Optional[int] = None
    priority: Optional[int] = 99
    elegivel: bool = True
