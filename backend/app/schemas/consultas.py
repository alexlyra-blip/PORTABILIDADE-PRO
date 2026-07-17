from pydantic import BaseModel, Field
from typing import List, Optional

class ConsultaCliente(BaseModel):
    nome: str = ""
    cpf: str = ""
    beneficio: str = ""
    idade: int = 0
    especie: str = ""
    salario: float = 0.0
    margem_livre: float = 0.0
    valor_liberado_margem: float = 0.0
    banco_pagador: str = ""
    endereco: Optional[str] = ""
    data_nascimento: Optional[str] = ""

class ConsultaMargem(BaseModel):
    salario: float = 0.0
    margem_emprestimo: float = 0.0
    total_comprometido: float = 0.0
    margem_livre: float = 0.0
    valor_liberado_margem: float = 0.0
    margem_cartao: float = 0.0
    possui_cartao: bool = False
    cartao_utilizado: float = 0.0
    cartao_disponivel: float = 0.0
    rmc_promosys: float = 0.0
    rcc_promosys: float = 0.0

class ConsultaBeneficio(BaseModel):
    situacao: str = ""
    bloqueado: bool = False
    bloqueio_emprestimo: str = ""
    possui_representante_legal: str = ""
    especie_consignavel: str = ""
    contratos_atualizados_ate: str = ""
    uf: Optional[str] = ""
    ddb: Optional[str] = ""

class ConsultaBancoPagador(BaseModel):
    codigo: str = ""
    nome: str = ""
    agencia: str = ""
    conta: str = ""
    tipo_pagamento: str = ""

class ConsultaEmprestimo(BaseModel):
    banco: str = ""
    codigo: str = ""
    contrato: str = ""
    parcela: float = 0.0
    quitacao: float = 0.0
    valor_liberado: float = 0.0
    prazo: int = 0
    parcelas_pagas: int = 0
    prazo_restante: int = 0
    taxa: float = 0.0
    situacao: str = ""

class ConsultaCartao(BaseModel):
    banco: str = ""
    codigo: str = ""
    contrato: str = ""
    tipo: str = ""
    parcela_promosys: float = 0.0
    limite_cartao: float = 0.0
    utilizado: float = 0.0
    disponivel: float = 0.0
    situacao: str = ""

class ConsultaResumo(BaseModel):
    total_emprestimos: int = 0
    total_cartoes: int = 0
    total_parcelas_emprestimos: float = 0.0
    maior_troco: float = 0.0
    maior_parcela: float = 0.0

class ConsultaResponse(BaseModel):
    origem: str
    cliente: ConsultaCliente
    margens: ConsultaMargem
    beneficio: ConsultaBeneficio
    banco_pagador: ConsultaBancoPagador
    telefones: List[Optional[str]] = []
    emprestimos: List[ConsultaEmprestimo] = []
    cartoes: List[ConsultaCartao] = []
    resumo: ConsultaResumo

class BeneficioDetalhado(BaseModel):
    numero: str
    cliente: ConsultaCliente
    margens: ConsultaMargem
    beneficio: ConsultaBeneficio
    banco_pagador: Optional[ConsultaBancoPagador] = None
    emprestimos: List[ConsultaEmprestimo] = []
    cartoes: List[ConsultaCartao] = []
    telefones: List[Optional[str]] = []
    resumo: Optional[ConsultaResumo] = None

class ConsultaCpfMultiResponse(ConsultaResponse):
    success: bool
    cpf: str
    total_beneficios: int
    beneficios: List[BeneficioDetalhado]
    beneficio_principal: Optional[ConsultaResponse] = None

class BeneficiosRequest(BaseModel):
    cpf: str

class BeneficiosResponse(BaseModel):
    success: bool
    cpf: str
    total_beneficios: int
    beneficios: List[str]

class BeneficioRequest(BaseModel):
    beneficio: str

class CreditosResponse(BaseModel):
    success: bool
    creditos: int
    creditos_offline: int
    creditos_geracao_leads: int
