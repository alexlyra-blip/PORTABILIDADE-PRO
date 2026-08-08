from decimal import (
    Decimal,
    ROUND_HALF_UP,
)
from typing import Any, Dict


class SellerFeeSimulatorService:
    SALE_FEE = Decimal("0.0299")

    COMMISSION_TABLES = {
        1: Decimal("0.05"),
        2: Decimal("0.04"),
        3: Decimal("0.03"),
    }

    INSTALLMENT_FEES = {
        1: Decimal("0.0000"),
        2: Decimal("0.0227"),
        3: Decimal("0.0285"),
        4: Decimal("0.0347"),
        5: Decimal("0.0406"),
        6: Decimal("0.0464"),
        7: Decimal("0.0478"),
        8: Decimal("0.0540"),
        9: Decimal("0.0602"),
        10: Decimal("0.0647"),
        11: Decimal("0.0709"),
        12: Decimal("0.0772"),
    }

    @staticmethod
    def money(
        value: Decimal,
    ) -> Decimal:
        return value.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    @classmethod
    def simulate(
        cls,
        amount: Decimal,
        commission_table: int,
        installments: int,
    ) -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError(
                "O valor deve ser maior que zero."
            )

        if commission_table not in (
            cls.COMMISSION_TABLES
        ):
            raise ValueError(
                "Tabela de comissão inválida."
            )

        if installments not in (
            cls.INSTALLMENT_FEES
        ):
            raise ValueError(
                "Parcelamento inválido."
            )

        amount = cls.money(amount)

        commission_rate = (
            cls.COMMISSION_TABLES[
                commission_table
            ]
        )

        installment_fee = (
            cls.INSTALLMENT_FEES[
                installments
            ]
        )

        total_mp_rate = (
            cls.SALE_FEE
            + installment_fee
        )

        commercial_target = (
            amount
            * (
                Decimal("1")
                + commission_rate
            )
        )

        divisor = (
            Decimal("1")
            - total_mp_rate
        )

        if divisor <= 0:
            raise ValueError(
                "Configuração de taxas inválida."
            )

        customer_total = cls.money(
            commercial_target / divisor
        )

        installment_value = cls.money(
            customer_total
            / Decimal(installments)
        )

        sale_fee_amount = cls.money(
            customer_total
            * cls.SALE_FEE
        )

        installment_fee_amount = cls.money(
            customer_total
            * installment_fee
        )

        mp_total_fee_amount = cls.money(
            sale_fee_amount
            + installment_fee_amount
        )

        return {
            "success": True,

            # Somente nome público da tabela.
            # A taxa de comissão NÃO é retornada.
            "commission_table": (
                commission_table
            ),
            "commission_table_label": (
                f"Tabela de Comissão "
                f"{commission_table}"
            ),

            "reference_amount": float(
                amount
            ),

            "installments": installments,

            "sale_fee_percent": float(
                cls.SALE_FEE * 100
            ),

            "installment_fee_percent": float(
                installment_fee * 100
            ),

            "mp_total_fee_percent": float(
                total_mp_rate * 100
            ),

            "sale_fee_amount": float(
                sale_fee_amount
            ),

            "installment_fee_amount": float(
                installment_fee_amount
            ),

            "mp_total_fee_amount": float(
                mp_total_fee_amount
            ),

            "customer_total": float(
                customer_total
            ),

            "installment_value": float(
                installment_value
            ),
        }
