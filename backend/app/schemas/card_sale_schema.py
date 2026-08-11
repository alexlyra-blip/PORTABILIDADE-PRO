from decimal import Decimal
from typing import Optional

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
)


def _cpf_is_valid(value: str) -> bool:
    if len(value) != 11:
        return False

    if value == value[0] * 11:
        return False

    for digit_index in (9, 10):
        total = sum(
            int(value[index])
            * (
                (digit_index + 1) - index
            )
            for index in range(digit_index)
        )

        check = (total * 10) % 11

        if check == 10:
            check = 0

        if check != int(value[digit_index]):
            return False

    return True


class CreateCardSaleRequest(BaseModel):
    customer_name: str = Field(
        min_length=2,
        max_length=150,
    )

    customer_cpf: str

    customer_phone: str

    customer_email: Optional[EmailStr] = None

    description: str = Field(
        min_length=2,
        max_length=250,
    )

    amount: Decimal = Field(
        gt=0,
        decimal_places=2,
    )

    installments: int = Field(
        default=1,
        ge=1,
        le=12,
    )

    simulation_type: str = Field(
        default="receive",
        pattern="^(receive|charge)$",
    )

    commission_table: int = Field(
        default=1,
        ge=1,
        le=3,
    )

    @field_validator(
        "customer_name",
        "description",
    )
    @classmethod
    def normalize_text(
        cls,
        value: str,
    ) -> str:
        value = " ".join(
            value.strip().split()
        )

        if len(value) < 2:
            raise ValueError(
                "Campo obrigatório."
            )

        return value

    @field_validator("customer_cpf")
    @classmethod
    def validate_cpf(
        cls,
        value: str,
    ) -> str:
        digits = "".join(
            character
            for character in value
            if character.isdigit()
        )

        if not _cpf_is_valid(digits):
            raise ValueError(
                "Informe um CPF válido."
            )

        return digits

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(
        cls,
        value: str,
    ) -> str:
        digits = "".join(
            character
            for character in value
            if character.isdigit()
        )

        if len(digits) < 10 or len(digits) > 13:
            raise ValueError(
                "Informe um telefone válido."
            )

        return digits

    @field_validator("amount")
    @classmethod
    def normalize_amount(
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

        if normalized > Decimal(
            "1000000.00"
        ):
            raise ValueError(
                "O valor máximo permitido é "
                "R$ 1.000.000,00."
            )

        return normalized




class CompleteCardSaleAuthorizationRequest(BaseModel):
    accepted: bool

    signer_name: str = Field(
        min_length=2,
        max_length=150,
    )

    signature_data_url: str = Field(
        min_length=50,
        max_length=2_000_000,
    )

    @field_validator("signer_name")
    @classmethod
    def normalize_signer_name(
        cls,
        value: str,
    ) -> str:
        value = " ".join(
            value.strip().split()
        )

        if len(value) < 2:
            raise ValueError(
                "Informe o nome do titular."
            )

        return value
