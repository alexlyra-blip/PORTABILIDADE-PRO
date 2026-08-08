from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from typing import (
    Any,
    Dict,
)


class SellerFeeSimulatorService:
    COMMISSION_TABLES = {
        1: Decimal("0.05"),
        2: Decimal("0.04"),
        3: Decimal("0.03"),
    }

    VALID_CHANNELS = {
        "checkout",
        "payment_link",
        "point",
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
        channel: str,
        fee_config: Dict[str, Any],
    ) -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError(
                "O valor deve ser maior que zero."
            )

        if (
            commission_table
            not in cls.COMMISSION_TABLES
        ):
            raise ValueError(
                "Tabela de comissão inválida."
            )

        channel = (
            str(channel)
            .strip()
            .lower()
        )

        if channel not in cls.VALID_CHANNELS:
            raise ValueError(
                "Forma de pagamento inválida."
            )

        channel_config = (
            fee_config.get(channel)
            or {}
        )

        max_installments = int(
            channel_config.get(
                "maxInstallments",
                12,
            )
        )

        if (
            installments < 1
            or installments
            > max_installments
        ):
            raise ValueError(
                "Parcelamento inválido para "
                "a forma de pagamento selecionada."
            )

        installment_fees = (
            channel_config.get(
                "installments"
            )
            or {}
        )

        sale_fee_percent = Decimal(
            str(
                channel_config.get(
                    "saleFee",
                    0,
                )
            )
        )

        installment_fee_percent = Decimal(
            str(
                installment_fees.get(
                    str(installments),
                    installment_fees.get(
                        installments,
                        0,
                    ),
                )
            )
        )

        sale_fee = (
            sale_fee_percent
            / Decimal("100")
        )

        installment_fee = (
            installment_fee_percent
            / Decimal("100")
        )

        amount = cls.money(amount)

        commission_rate = (
            cls.COMMISSION_TABLES[
                commission_table
            ]
        )

        total_mp_rate = (
            sale_fee
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
            commercial_target
            / divisor
        )

        installment_value = cls.money(
            customer_total
            / Decimal(installments)
        )

        sale_fee_amount = cls.money(
            customer_total
            * sale_fee
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

            "channel": channel,

            "channel_label": (
                channel_config.get("label")
                or channel
            ),

            "max_installments": (
                max_installments
            ),

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
                sale_fee_percent
            ),

            "installment_fee_percent": float(
                installment_fee_percent
            ),

            "mp_total_fee_percent": float(
                sale_fee_percent
                + installment_fee_percent
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
