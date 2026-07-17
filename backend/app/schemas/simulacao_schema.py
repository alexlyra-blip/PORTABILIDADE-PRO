from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal

# Announcement Schemas
class AnnouncementBase(BaseModel):
    title: Optional[str] = None
    message: str
    active: bool = True
    image_url: Optional[str] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementResponse(AnnouncementBase):
    id: int
    created_at: Any
    class Config:
        from_attributes = True

# Company Schemas
class CompanyBase(BaseModel):
    name: str
    cnpj: Optional[str] = None
    active: bool = True

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "corretor"
    broker_id: Optional[int] = None
    seller_limit: Optional[int] = 0
    brand_color: Optional[str] = "#2563eb"
    sidebar_color: Optional[str] = "#1e293b" # Default dark slate 800ish or whatever the current sidebar uses
    sidebar_color_secondary: Optional[str] = None
    highlight_color: Optional[str] = None
    logo_url: Optional[str] = None
    avatar_url: Optional[str] = None
    dark_mode: Optional[bool] = False
    is_temporary_password: Optional[bool] = True
    active: Optional[bool] = True
    phone: Optional[str] = None
    can_consult_cpf: Optional[bool] = False
    monthly_goal: Optional[float] = 110000.0
    daily_goal: Optional[float] = 5000.0
    monthly_goal_type: Optional[str] = "mensal"

class UserCreate(UserBase):
    password: str

# Auth Schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    simulations_count: Optional[int] = 0
    last_access: Optional[datetime] = None
    broker_name: Optional[str] = None
    class Config:
        from_attributes = True

# UserBankVisibility Schemas
class UserBankVisibilityBase(BaseModel):
    user_id: int
    bank_name: str
    is_visible: bool = True

class UserBankVisibilityCreate(UserBankVisibilityBase):
    pass

class UserBankVisibilityResponse(UserBankVisibilityBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# PromotoraRule Schemas
class PromotoraRuleBase(BaseModel):
    promotora_id: int
    rule_key: str
    rule_value: str

class PromotoraRuleCreate(PromotoraRuleBase):
    pass

class PromotoraRuleResponse(PromotoraRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class RuleCreate(BaseModel):
    rule_key: str
    rule_value: str

class BankVisibilityCreate(BaseModel):
    bank_name: str
    is_visible: bool

# Bank Schemas
class BankBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    active: bool = True
    priority: Optional[int] = 99
    is_margin_base: Optional[bool] = False
    margin_base_priority: Optional[int] = 0

class BankCreate(BankBase):
    pass

class BankResponse(BankBase):
    id: int
    class Config:
        from_attributes = True

class BankWithRulesResponse(BankResponse):
    rules: List["BankRuleResponse"] = []

# Bank Rule Schemas
class BankRuleBase(BaseModel):
    bank_id: int
    agreement: Optional[str] = "INSS"
    sub_agreement: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    max_term: Optional[int] = 84
    min_release_amount: Optional[Decimal] = None
    allowed_benefit_types: Optional[str] = None
    literacy_required: bool = False
    accepts_illiterate: bool = True
    accepts_60_plus: bool = True
    portability_rate_threshold: Optional[float] = None
    refin_portability_rate_threshold: Optional[float] = None
    min_installment_value: Optional[Decimal] = None
    min_debt_balance: Optional[Decimal] = None
    use_balance_plus_released: bool = False
    min_paid_installments: Optional[int] = 0
    accepts_disability: bool = True
    accepts_loas: bool = True
    disability_min_age: Optional[int] = None
    disability_max_age: Optional[int] = None
    disability_grace_age: Optional[int] = None
    disability_min_benefit_years: Optional[int] = None
    disability_min_benefit_months: Optional[int] = None
    excluded_origin_banks: Optional[str] = None
    origin_banks_min_paid: Optional[str] = None
    excluded_benefit_types: Optional[str] = None
    disable_weighted_rate_validation: bool = False
    active: bool = True

class BankRuleCreate(BankRuleBase):
    pass

class BankRuleResponse(BankRuleBase):
    id: int
    class Config:
        from_attributes = True

# Bank Table Schemas
class BankTableBase(BaseModel):
    bank_id: int
    name: str
    active: bool = True
    min_paid_installments: int = 0
    min_ticket: Decimal = 0
    max_ticket: Optional[Decimal] = None
    min_installment: Optional[Decimal] = None
    max_installment: Optional[Decimal] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    term: Optional[int] = None
    min_rate: Optional[float] = None
    min_port_rate: Optional[float] = None
    agreement: Optional[str] = None
    sub_agreement: Optional[str] = None
    taxa_convenio: float = 0.0
    portability_adjustment: float = 0.0
    refin_adjustment: float = 0.0
    abater_margem_hp12c: bool = False

class BankTableCreate(BankTableBase):
    pass

class BankTableResponse(BankTableBase):
    id: int
    class Config:
        from_attributes = True

# Coefficient Schemas
class CoefficientBase(BaseModel):
    bank_id: int
    table_id: int
    term: int
    interest_rate: float
    interest_rate_refin: Optional[float] = None
    coefficient: Decimal

class CoefficientCreate(CoefficientBase):
    pass

class CoefficientResponse(CoefficientBase):
    id: int
    class Config:
        from_attributes = True

# Simulation Schemas
class SimulationBase(BaseModel):
    client_name: str
    client_cpf: Optional[str] = None
    client_age: int
    agreement: str
    benefit_species: Optional[str] = None
    benefit_start_date: Optional[str] = None # DIB (Data de Início do Benefício)
    current_bank: str
    debt_balance: Decimal
    installment_value: Decimal
    current_rate: float
    total_term: int
    remaining_term: int
    is_60_plus: bool = False
    is_illiterate: bool = False # Se o cliente é analfabeto

class SimulationCreate(SimulationBase):
    user_id: Optional[int] = None

class SimulationResultResponse(BaseModel):
    id: int
    bank_id: Optional[int] = None
    table_name: Optional[str] = None
    offered_rate: Optional[float] = None
    release_amount: Optional[Decimal] = None
    is_approved: bool = False
    rejection_reason: Optional[str] = None
    term: Optional[int] = None
    installment: Optional[float] = None
    class Config:
        from_attributes = True

class SimulationResponse(SimulationBase):
    id: int
    user_id: int
    created_at: datetime
    user: Optional[UserResponse] = None
    results: Optional[List[SimulationResultResponse]] = None
    class Config:
        from_attributes = True

# SubAgreementLogo Schemas
class SubAgreementLogoBase(BaseModel):
    name: str
    logo_url: Optional[str] = None

class SubAgreementLogoCreate(SubAgreementLogoBase):
    pass

class SubAgreementLogoResponse(SubAgreementLogoBase):
    id: int
    class Config:
        from_attributes = True
