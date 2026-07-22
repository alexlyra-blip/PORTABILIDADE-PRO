from sqlalchemy import UniqueConstraint
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=True)
    message = Column(Text, nullable=False)
    active = Column(Boolean, default=True)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    cnpj = Column(String(18), unique=True, index=True)
    active = Column(Boolean, default=True)

    users = relationship("User", back_populates="company")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    role = Column(String(20), default="corretor") # admin | corretor | vendedor
    broker_id = Column(Integer, ForeignKey("users.id"), nullable=True) # for vendedores, points to their corretor
    
    # Advanced features
    is_temporary_password = Column(Boolean, default=True)
    active = Column(Boolean, default=True)
    seller_limit = Column(Integer, default=0) # 0 = unlimited
    brand_color = Column(String(7), nullable=True) # HEX code
    sidebar_color = Column(String(7), nullable=True) # HEX code
    sidebar_color_secondary = Column(String(50), nullable=True)
    highlight_color = Column(String(7), nullable=True) # HEX code
    avatar_url = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)
    dark_mode = Column(Boolean, default=False)
    phone = Column(String(15), nullable=True)
    last_access = Column(DateTime(timezone=True), nullable=True)
    current_token = Column(Text, nullable=True)
    can_consult_cpf = Column(Boolean, default=False)
    monthly_goal = Column(Float, default=110000.0)
    daily_goal = Column(Float, default=5000.0)
    monthly_goal_type = Column(String(20), default="mensal")

    
    company = relationship("Company", back_populates="users")
    simulations = relationship("Simulation", back_populates="user")
    contracts = relationship("Contract", back_populates="user", cascade="all, delete-orphan")
    sellers = relationship("User", foreign_keys="User.broker_id", back_populates="broker")
    broker = relationship("User", foreign_keys="User.broker_id", remote_side="User.id", back_populates="sellers")
    
    bank_visibilities = relationship("UserBankVisibility", back_populates="user", cascade="all, delete-orphan")
    promotora_rules = relationship("PromotoraRule", back_populates="promotora", cascade="all, delete-orphan")

class UserBankVisibility(Base):
    __tablename__ = "user_bank_visibility"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    bank_name = Column(String(100), nullable=False)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="bank_visibilities")

class PromotoraRule(Base):
    __tablename__ = "promotora_rules"

    id = Column(Integer, primary_key=True, index=True)
    promotora_id = Column(Integer, ForeignKey("users.id"))
    rule_key = Column(String(50), nullable=False)
    rule_value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    promotora = relationship("User", back_populates="promotora_rules")

class Bank(Base):
    __tablename__ = "banks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    logo_url = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    priority = Column(Integer, default=99)
    is_margin_base = Column(Boolean, default=False)
    margin_base_priority = Column(Integer, default=0)

    rules = relationship("BankRule", back_populates="bank", cascade="all, delete-orphan")
    tables = relationship("BankTable", back_populates="bank", cascade="all, delete-orphan")
    coefficients = relationship("Coefficient", back_populates="bank", cascade="all, delete-orphan")
    daily_margin_coefficients = relationship("DailyMarginCoefficient", back_populates="bank", cascade="all, delete-orphan")

class BankRule(Base):
    __tablename__ = "bank_rules"

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("banks.id"))
    min_age = Column(Integer)
    max_age = Column(Integer)
    max_term = Column(Integer, default=84)
    min_release_amount = Column(Numeric(15, 2))
    allowed_benefit_types = Column(String(255)) # Comma-separated list like "INSS,SIAPE"
    literacy_required = Column(Boolean, default=False)
    accepts_illiterate = Column(Boolean, default=True)
    accepts_60_plus = Column(Boolean, default=True)
    portability_rate_threshold = Column(Float, nullable=True)
    refin_portability_rate_threshold = Column(Float, nullable=True)
    min_installment_value = Column(Numeric(10, 2), nullable=True)
    min_debt_balance = Column(Numeric(15, 2), nullable=True)
    use_balance_plus_released = Column(Boolean, default=False)
    agreement = Column(String(50), nullable=True) # INSS, SIAPE, etc.
    sub_agreement = Column(String(50), nullable=True) # EXERCITO, SP, etc.
    min_paid_installments = Column(Integer, server_default="0") # New: min installments paid for portability
    excluded_origin_banks = Column(Text, nullable=True) # Comma-separated list of banks C6 doesn't port from
    origin_banks_min_paid = Column(Text, nullable=True) # JSON string for specific rules per bank
    
    # Benefit Types (Positive Filters)
    accepts_disability = Column(Boolean, default=True)
    accepts_loas = Column(Boolean, default=True)
    
    excluded_benefit_types = Column(Text, nullable=True) # Comma-separated species like "04,32,92"
    
    disability_min_age = Column(Integer, nullable=True)
    disability_max_age = Column(Integer, nullable=True)
    disability_grace_age = Column(Integer, nullable=True)
    disability_min_benefit_years = Column(Integer, nullable=True)
    disability_min_benefit_months = Column(Integer, nullable=True)

    # Validation Toggles
    disable_weighted_rate_validation = Column(Boolean, default=False)
    active = Column(Boolean, default=True)

    bank = relationship("Bank", back_populates="rules")

class BankTable(Base):
    __tablename__ = "bank_tables"

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("banks.id"))
    name = Column(String(100), nullable=False)
    active = Column(Boolean, default=True)
    
    # Phase 7: Rules moved to table level
    agreement = Column(String(50), nullable=True)
    sub_agreement = Column(String(50), nullable=True)
    taxa_convenio = Column(Float, default=0.0)
    portability_adjustment = Column(Float, default=0.0)
    refin_adjustment = Column(Float, default=0.0)
    
    min_paid_installments = Column(Integer, default=0)
    min_ticket = Column(Numeric(15, 2), default=0)
    max_ticket = Column(Numeric(15, 2), nullable=True)
    min_installment = Column(Numeric(15, 2), nullable=True)
    max_installment = Column(Numeric(15, 2), nullable=True)
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=True)
    term = Column(Integer, nullable=True)
    min_rate = Column(Float, nullable=True) # Taxa Mínima Refin
    min_port_rate = Column(Float, nullable=True) # Taxa Mínima Portabilidade
    abater_margem_hp12c = Column(Boolean, default=False)

    bank = relationship("Bank", back_populates="tables")
    coefficients = relationship("Coefficient", back_populates="table", cascade="all, delete-orphan")

class Coefficient(Base):
    __tablename__ = "coefficients"

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("banks.id"))
    table_id = Column(Integer, ForeignKey("bank_tables.id"))
    term = Column(Integer, nullable=False)
    interest_rate = Column(Float, nullable=False)
    interest_rate_refin = Column(Float, nullable=True)
    coefficient = Column(Numeric(10, 6), nullable=False)

    bank = relationship("Bank", back_populates="coefficients")
    table = relationship("BankTable", back_populates="coefficients")

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    client_name = Column(String(100))
    client_cpf = Column(String(14))
    client_age = Column(Integer)
    benefit_species = Column(String(100), nullable=True)
    agreement = Column(String(100)) # INSS, SIAPE, etc.
    current_bank = Column(String(100))
    debt_balance = Column(Numeric(15, 2))
    installment_value = Column(Numeric(10, 2))
    current_rate = Column(Float)
    total_term = Column(Integer)
    remaining_term = Column(Integer)
    
    is_60_plus = Column(Boolean, default=False)
    agreement_rate = Column(Float, nullable=True)
    portability_rate_calculated = Column(Float, nullable=True)
    portability_adjustment = Column(Float, default=0.0)
    new_portability_rate = Column(Float, nullable=True)
    weighted_refin_rate = Column(Float, nullable=True)
    refin_adjustment = Column(Float, default=0.0)
    final_refin_rate = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="simulations")
    results = relationship("SimulationResult", back_populates="simulation", cascade="all, delete-orphan")

class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"), index=True)
    bank_id = Column(Integer, ForeignKey("banks.id"), index=True)
    table_name = Column(String(100), nullable=True)
    offered_rate = Column(Float)
    release_amount = Column(Numeric(15, 2))
    is_approved = Column(Boolean, default=False)
    rejection_reason = Column(Text)
    term = Column(Integer, nullable=True)
    installment = Column(Float, nullable=True)

    simulation = relationship("Simulation", back_populates="results")

class SubAgreementLogo(Base):
    __tablename__ = "sub_agreement_logos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    logo_url = Column(Text, nullable=True)

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String(50), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_name = Column(String(100), nullable=True)
    user_role = Column(String(50), nullable=True)
    broker_id = Column(Integer, nullable=True, index=True)
    data_aceite = Column(String(50), nullable=True, index=True)
    data_hora = Column(String(50), nullable=True, index=True)
    cliente = Column(String(150), nullable=True)
    cpf = Column(String(20), nullable=True)
    banco = Column(String(100), nullable=True)
    convenio = Column(String(100), nullable=True)
    parcela = Column(Float, nullable=True)
    tabela = Column(String(100), nullable=True)
    taxa = Column(Float, nullable=True)
    valor_contrato = Column(Float, nullable=True)
    valor_troco = Column(Float, nullable=True)
    instituicao_origem = Column(String(100), nullable=True)
    saldo_devedor = Column(Float, nullable=True)
    prazo_restante = Column(Integer, nullable=True)
    orig_parcela = Column(Float, nullable=True)
    status = Column(String(50), default="PENDENTE", index=True)
    data_cip = Column(String(50), nullable=True)
    numero_proposta = Column(String(100), nullable=True)
    produto = Column(String(100), nullable=True, default="PORTABILIDADE")
    
    # Extra fields used by frontend
    status_updated_at = Column(String(50), nullable=True)
    refin_status = Column(String(50), nullable=True)
    port_status = Column(String(50), nullable=True)
    data_pago = Column(String(50), nullable=True)
    data_reprovado = Column(String(50), nullable=True)

    user = relationship("User", back_populates="contracts")

class WhatsappChatLog(Base):
    __tablename__ = "whatsapp_chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    protocol = Column(String(50), unique=True, index=True, nullable=False)
    sender_phone = Column(String(50), index=True, nullable=False)
    client_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    context_data = Column(JSONB, nullable=False, server_default='{}')
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    status = Column(String(20), default="active") # active, finished
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Linked to the API key owner
    
    # JSON array of message objects: {"role": "bot" | "user", "text": "...", "timestamp": "..."}
    messages = Column(JSONB, nullable=True) 

    last_activity_at = Column(DateTime(timezone=True), nullable=True, server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    close_reason = Column(String(50), nullable=True)

    user = relationship("User")

class ConsultaCpfCache(Base):
    __tablename__ = "consulta_cpf_cache"

    id = Column(Integer, primary_key=True, index=True)
    cpf = Column(String(14), unique=True, index=True, nullable=False)
    dados_json = Column(Text, nullable=False) # Armazena a resposta completa da Promosys em formato JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    setting_value = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class DailyMarginCoefficient(Base):
    __tablename__ = "daily_margin_coefficients"
    __table_args__ = (
        UniqueConstraint(
            "bank_id",
            "date",
            "convenio",
            name="uq_daily_margin_bank_date_convenio",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(Integer, ForeignKey("banks.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    convenio = Column(
        String(20),
        nullable=False,
        default="INSS",
        server_default="INSS",
        index=True,
    )
    coefficient = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    bank = relationship("Bank", back_populates="daily_margin_coefficients")
