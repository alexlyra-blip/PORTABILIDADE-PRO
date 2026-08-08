import json
from copy import deepcopy
from typing import Any, Dict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class PaymentFeeConfigService:
    DEFAULT_FEES: Dict[str, Any] = {
        "checkout": {
            "label": "Checkout",
            "saleFee": 2.99,
            "maxInstallments": 12,
            "installments": {
                "1": 0,
                "2": 2.27,
                "3": 2.85,
                "4": 3.47,
                "5": 4.06,
                "6": 4.64,
                "7": 4.78,
                "8": 5.40,
                "9": 6.02,
                "10": 6.47,
                "11": 7.09,
                "12": 7.72,
            },
        },

        "payment_link": {
            "label": "Link de Pagamento",
            "saleFee": 2.99,
            "maxInstallments": 12,
            "installments": {
                "1": 0,
                "2": 2.12,
                "3": 3.02,
                "4": 3.76,
                "5": 4.55,
                "6": 5.23,
                "7": 6.21,
                "8": 6.90,
                "9": 7.52,
                "10": 8.18,
                "11": 8.82,
                "12": 9.49,
            },
        },

        "point": {
            "label": "Maquininha",
            "saleFee": 2.99,
            "maxInstallments": 18,
            "installments": {
                "1": 0,
                "2": 5.39,
                "3": 6.49,
                "4": 7.26,
                "5": 8.04,
                "6": 8.79,
                "7": 9.73,
                "8": 10.53,
                "9": 10.98,
                "10": 11.19,
                "11": 11.94,
                "12": 12.59,
                "13": 13.45,
                "14": 14.39,
                "15": 15.40,
                "16": 16.51,
                "17": 17.70,
                "18": 19.00,
            },
        },
    }

    VALID_CHANNELS = {
        "checkout",
        "payment_link",
        "point",
    }

    @classmethod
    async def ensure_table(
        cls,
        db: AsyncSession,
    ) -> None:
        await db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS
                mercado_pago_fee_configs (
                    id INTEGER PRIMARY KEY,
                    fees JSONB NOT NULL,
                    updated_by_user_id INTEGER NULL,
                    updated_at TIMESTAMPTZ
                        NOT NULL DEFAULT NOW()
                )
                """
            )
        )

        default_json = json.dumps(
            cls.DEFAULT_FEES
        )

        await db.execute(
            text(
                """
                INSERT INTO mercado_pago_fee_configs
                    (id, fees)
                VALUES
                    (1, CAST(:fees AS JSONB))
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "fees": default_json,
            },
        )

        await db.commit()

    @classmethod
    async def get_config(
        cls,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        await cls.ensure_table(db)

        result = await db.execute(
            text(
                """
                SELECT
                    fees,
                    updated_at
                FROM mercado_pago_fee_configs
                WHERE id = 1
                """
            )
        )

        row = result.mappings().first()

        if not row:
            return {
                "fees": deepcopy(
                    cls.DEFAULT_FEES
                ),
                "updated_at": None,
            }

        fees = row["fees"]

        if isinstance(fees, str):
            fees = json.loads(fees)

        return {
            "fees": fees,
            "updated_at": (
                row["updated_at"].isoformat()
                if row["updated_at"]
                else None
            ),
        }

    @classmethod
    def validate_config(
        cls,
        fees: Dict[str, Any],
    ) -> Dict[str, Any]:
        if set(fees.keys()) != cls.VALID_CHANNELS:
            raise ValueError(
                "A configuração deve conter "
                "checkout, payment_link e point."
            )

        normalized: Dict[str, Any] = {}

        for channel in cls.VALID_CHANNELS:
            data = fees.get(channel)

            if not isinstance(data, dict):
                raise ValueError(
                    f"Configuração inválida: {channel}."
                )

            sale_fee = float(
                data.get("saleFee", 0)
            )

            max_installments = int(
                data.get(
                    "maxInstallments",
                    12,
                )
            )

            if sale_fee < 0 or sale_fee >= 100:
                raise ValueError(
                    f"Taxa de venda inválida "
                    f"para {channel}."
                )

            if (
                max_installments < 1
                or max_installments > 24
            ):
                raise ValueError(
                    f"Quantidade de parcelas "
                    f"inválida para {channel}."
                )

            raw_installments = (
                data.get("installments")
                or {}
            )

            installments: Dict[str, float] = {}

            for number in range(
                1,
                max_installments + 1,
            ):
                value = float(
                    raw_installments.get(
                        str(number),
                        raw_installments.get(
                            number,
                            0,
                        ),
                    )
                )

                if value < 0 or value >= 100:
                    raise ValueError(
                        f"Taxa inválida em "
                        f"{channel} {number}x."
                    )

                installments[
                    str(number)
                ] = value

            normalized[channel] = {
                "label": str(
                    data.get("label")
                    or cls.DEFAULT_FEES[
                        channel
                    ]["label"]
                ),
                "saleFee": sale_fee,
                "maxInstallments": (
                    max_installments
                ),
                "installments": (
                    installments
                ),
            }

        return normalized

    @classmethod
    async def save_config(
        cls,
        db: AsyncSession,
        fees: Dict[str, Any],
        user_id: int,
    ) -> Dict[str, Any]:
        await cls.ensure_table(db)

        normalized = (
            cls.validate_config(fees)
        )

        await db.execute(
            text(
                """
                UPDATE mercado_pago_fee_configs
                SET
                    fees = CAST(:fees AS JSONB),
                    updated_by_user_id = :user_id,
                    updated_at = NOW()
                WHERE id = 1
                """
            ),
            {
                "fees": json.dumps(
                    normalized
                ),
                "user_id": user_id,
            },
        )

        await db.commit()

        return await cls.get_config(db)
