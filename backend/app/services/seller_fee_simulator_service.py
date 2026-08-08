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

    # Comissão do vendedor.
    # Cálculo separado da tabela comercial.
    SELLER_COMMISSION_TABLES = {
        1: Decimal("0.03"),
        2: Decimal("0.02"),
        3: Decimal("0.01"),
    }

    VALID_CHANNELS = {
        "checkout",
        "payment_link",
        "point",
    }

    VALID_SIMULATION_TYPES = {
        "receive",
        "charge",
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
        simulation_type: str = "receive",
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

        simulation_type = (
            str(simulation_type)
            .strip()
            .lower()
        )

        if (
            simulation_type
            not in cls.VALID_SIMULATION_TYPES
        ):
            raise ValueError(
                "Tipo de simulação inválido."
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

        commission_rate = (
            cls.COMMISSION_TABLES[
                commission_table
            ]
        )

        total_mp_rate = (
            sale_fee
            + installment_fee
        )

        divisor = (
            Decimal("1")
            - total_mp_rate
        )

        if divisor <= 0:
            raise ValueError(
                "Configuração de taxas inválida."
            )

        input_amount = cls.money(amount)

        # ==========================================
        # PRA RECEBER
        #
        # O valor informado é o valor base que
        # queremos preservar.
        #
        # Calculamos quanto precisa ser cobrado
        # para absorver comissão + taxas MP.
        # ==========================================

        if simulation_type == "receive":
            reference_amount = input_amount

            commercial_target = (
                reference_amount
                * (
                    Decimal("1")
                    + commission_rate
                )
            )

            customer_total = cls.money(
                commercial_target
                / divisor
            )

        # ==========================================
        # PRA COBRAR
        #
        # O usuário informa o valor final que
        # será cobrado do cliente.
        #
        # Fazemos o cálculo inverso para descobrir
        # quanto corresponde ao valor base.
        # ==========================================

        else:
            customer_total = input_amount

            commercial_target = (
                customer_total
                * divisor
            )

            reference_amount = cls.money(
                commercial_target
                / (
                    Decimal("1")
                    + commission_rate
                )
            )

        installment_value = cls.money(
            customer_total
            / Decimal(installments)
        )

        # Comissão do vendedor calculada sobre
        # o valor "Pra receber".
        seller_commission_rate = (
            cls.SELLER_COMMISSION_TABLES[
                commission_table
            ]
        )

        seller_commission_amount = cls.money(
            reference_amount
            * seller_commission_rate
        )

        seller_commission_percent = (
            seller_commission_rate
            * Decimal("100")
        )

        # Taxa final efetiva da operação.
        #
        # Inclui a composição total da operação,
        # inclusive a tabela comercial, sem
        # expor sua taxa interna separadamente.
        #
        # Taxa a.m. =
        # ((Pra cobrar / Pra receber - 1) * 100)
        # / quantidade de parcelas
        if (
            reference_amount > 0
            and installments > 0
        ):
            final_rate_percent = (
                (
                    customer_total
                    / reference_amount
                )
                - Decimal("1")
            ) * Decimal("100")

            monthly_rate_percent = (
                final_rate_percent
                / Decimal(installments)
            )
        else:
            final_rate_percent = Decimal("0")
            monthly_rate_percent = Decimal("0")

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

            "simulation_type": (
                simulation_type
            ),

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

            "seller_commission_percent": float(
                seller_commission_percent
            ),

            "seller_commission_amount": float(
                seller_commission_amount
            ),

            "input_amount": float(
                input_amount
            ),

            "reference_amount": float(
                reference_amount
            ),

            "amount_to_receive": float(
                reference_amount
            ),

            "amount_to_charge": float(
                customer_total
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

            "monthly_rate_percent": float(
                monthly_rate_percent.quantize(
                    Decimal("0.0001"),
                    rounding=ROUND_HALF_UP,
                )
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
