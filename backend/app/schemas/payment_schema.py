from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class CreatePaymentLinkRequest(BaseModel):
    customer_name: str = Field(min_length=2, max_length=150)
    customer_email: Optional[EmailStr] = None
    customer_document: Optional[str] = None
    customer_phone: Optional[str] = None

    description: str = Field(min_length=2, max_length=250)
    amount: Decimal = Field(gt=0, decimal_places=2)

    package_name: Optional[str] = Field(default=None, max_length=120)
    consultation_quantity: Optional[int] = Field(default=None, ge=0)
    expiration_days: int = Field(default=7, ge=1, le=30)
    internal_note: Optional[str] = Field(default=None, max_length=500)

    max_installments: int = Field(default=12, ge=1, le=12)
    default_installments: Optional[int] = Field(default=None, ge=1, le=12)
    installment_mode: str = Field(default="customer")

    @field_validator("installment_mode")
    @classmethod
    def validate_installment_mode(cls, value: str) -> str:
        normalized = value.strip().lower()

        if normalized not in ("customer", "seller"):
            raise ValueError(
                "installment_mode deve ser customer ou seller."
            )

        return normalized

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: Decimal) -> Decimal:
        normalized = value.quantize(Decimal("0.01"))

        if normalized < Decimal("1.00"):
            raise ValueError("O valor mínimo da cobrança é R$ 1,00.")

        if normalized > Decimal("1000000.00"):
            raise ValueError("O valor máximo permitido é R$ 1.000.000,00.")

        return normalized

    @field_validator("customer_document")
    @classmethod
    def normalize_document(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None

        digits = "".join(character for character in value if character.isdigit())

        if len(digits) not in (11, 14):
            raise ValueError("Informe um CPF ou CNPJ válido.")

        return digits

    @field_validator("customer_phone")
    @classmethod
    def normalize_phone(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None

        return "".join(character for character in value if character.isdigit())


class CreatePaymentLinkResponse(BaseModel):
    success: bool
    reference: str
    preference_id: str
    payment_url: str
    sandbox_url: Optional[str] = None
    amount: Decimal
    status: str


class UpdatePaymentLinkRequest(BaseModel):
    customer_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    customer_email: Optional[EmailStr] = None
    customer_document: Optional[str] = None
    customer_phone: Optional[str] = None

    description: Optional[str] = Field(default=None, min_length=2, max_length=250)
    amount: Optional[Decimal] = Field(default=None, gt=0, decimal_places=2)

    package_name: Optional[str] = Field(default=None, max_length=120)
    consultation_quantity: Optional[int] = Field(default=None, ge=0)
    expiration_days: Optional[int] = Field(default=None, ge=1, le=30)
    internal_note: Optional[str] = Field(default=None, max_length=500)

    max_installments: Optional[int] = Field(default=None, ge=1, le=12)
    default_installments: Optional[int] = Field(default=None, ge=1, le=12)
    installment_mode: Optional[str] = None

    @field_validator("installment_mode")
    @classmethod
    def validate_installment_mode(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        normalized = value.strip().lower()

        if normalized not in ("customer", "seller"):
            raise ValueError(
                "installment_mode deve ser customer ou seller."
            )

        return normalized


class CancelPaymentRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=250)


class CreateFreePaymentLinkRequest(BaseModel):
    title: str = Field(
        default="Pagamento Portabilidade PRO",
        min_length=2,
        max_length=150,
    )

    description: Optional[str] = Field(
        default=None,
        max_length=250,
    )

    package_name: Optional[str] = Field(
        default=None,
        max_length=120,
    )

    consultation_quantity: Optional[int] = Field(
        default=None,
        ge=0,
    )

    expiration_days: Optional[int] = Field(
        default=30,
        ge=1,
        le=365,
    )

    max_installments: int = Field(
        default=12,
        ge=1,
        le=12,
    )

    default_installments: Optional[int] = Field(
        default=None,
        ge=1,
        le=12,
    )

    installment_mode: str = Field(
        default="customer",
    )

    @field_validator("installment_mode")
    @classmethod
    def validate_free_link_installment_mode(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip().lower()

        if normalized not in ("customer", "seller"):
            raise ValueError(
                "installment_mode deve ser customer ou seller."
            )

        return normalized


class CreatePaymentFromFreeLinkRequest(BaseModel):
    amount: Decimal = Field(
        gt=0,
        decimal_places=2,
    )

    customer_name: str = Field(
        min_length=2,
        max_length=150,
    )

    customer_email: Optional[EmailStr] = None
    customer_document: Optional[str] = None
    customer_phone: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_free_amount(
        cls,
        value: Decimal,
    ) -> Decimal:
        normalized = value.quantize(
            Decimal("0.01")
        )

        if normalized < Decimal("1.00"):
            raise ValueError(
                "O valor mínimo é R$ 1,00."
            )

        if normalized > Decimal("1000000.00"):
            raise ValueError(
                "O valor máximo é R$ 1.000.000,00."
            )

        return normalized
