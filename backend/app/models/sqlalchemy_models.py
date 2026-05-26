from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text, Numeric
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
    avatar_url = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)
    dark_mode = Column(Boolean, default=False)
    phone = Column(String(15), nullable=True)

    
    company = relationship("Company", back_populates="users")
    simulations = relationship("Simulation", back_populates="user")
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
    rule_value = Column(String(255), nullable=False)
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

    rules = relationship("BankRule", back_populates="bank", cascade="all, delete-orphan")
    tables = relationship("BankTable", back_populates="bank", cascade="all, delete-orphan")
    coefficients = relationship("Coefficient", back_populates="bank", cascade="all, delete-orphan")

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
    disability_min_benefit_years = Column(Integer, nullable=True)
    disability_min_benefit_months = Column(Integer, nullable=True)

    # Validation Toggles
    disable_weighted_rate_validation = Column(Boolean, default=False)
    abater_margem_hp12c = Column(Boolean, default=False)

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
    min_installment = Column(Numeric(15, 2), nullable=True)
    max_installment = Column(Numeric(15, 2), nullable=True)
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=True)
    term = Column(Integer, nullable=True)
    min_rate = Column(Float, nullable=True) # Taxa Mínima Refin
    min_port_rate = Column(Float, nullable=True) # Taxa Mínima Portabilidade

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
    user_id = Column(Integer, ForeignKey("users.id"))
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
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="simulations")
    results = relationship("SimulationResult", back_populates="simulation", cascade="all, delete-orphan")

class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"))
    bank_id = Column(Integer, ForeignKey("banks.id"))
    table_name = Column(String(100), nullable=True)
    offered_rate = Column(Float)
    release_amount = Column(Numeric(15, 2))
    is_approved = Column(Boolean, default=False)
    rejection_reason = Column(Text)

    simulation = relationship("Simulation", back_populates="results")

class SubAgreementLogo(Base):
    __tablename__ = "sub_agreement_logos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    logo_url = Column(Text, nullable=True)
