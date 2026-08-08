import hashlib
import os
import uuid

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

import httpx

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sqlalchemy_models import Payment
from app.schemas.payment_schema import CreatePaymentLinkRequest


MERCADO_PAGO_API_URL = "https://api.mercadopago.com"


class MercadoPagoOrdersService:
    @staticmethod
    def get_access_token() -> str:
        token = os.getenv(
            "MERCADO_PAGO_ACCESS_TOKEN",
            "",
        ).strip()

        if not token:
            raise HTTPException(
                status_code=500,
                detail=(
                    "MERCADO_PAGO_ACCESS_TOKEN "
                    "não configurado no backend."
                ),
            )

        return token

    @staticmethod
    def get_frontend_url() -> str:
        return os.getenv(
            "FRONTEND_URL",
            "https://portabilidadepro.com.br",
        ).rstrip("/")

    @staticmethod
    def create_reference() -> str:
        return (
            "PP-ORD-"
            + uuid.uuid4().hex.upper()
        )

    @staticmethod
    def money_string(
        value: Decimal,
    ) -> str:
        return str(
            Decimal(value).quantize(
                Decimal("0.01")
            )
        )

    @staticmethod
    def sanitize_payload(
        value: Any,
    ) -> Any:
        sensitive = {
            "token",
            "card_token",
            "security_code",
            "cvv",
            "card_number",
        }

        if isinstance(value, dict):
            clean = {}

            for key, item in value.items():
                if str(key).lower() in sensitive:
                    continue

                clean[key] = (
                    MercadoPagoOrdersService
                    .sanitize_payload(item)
                )

            return clean

        if isinstance(value, list):
            return [
                MercadoPagoOrdersService
                .sanitize_payload(item)
                for item in value
            ]

        return value

    @classmethod
    async def create_local_payment(
        cls,
        db: AsyncSession,
        data: CreatePaymentLinkRequest,
        created_by_user_id: int,
    ) -> Payment:
        reference = cls.create_reference()

        expires_at = (
            datetime.now(timezone.utc)
            + timedelta(
                days=data.expiration_days
            )
        )

        checkout_url = (
            f"{cls.get_frontend_url()}"
            f"/pagamento/{reference}"
        )

        payment = Payment(
            created_by_user_id=(
                created_by_user_id
            ),
            external_reference=reference,
            preference_id=None,
            mercado_pago_payment_id=None,
            customer_name=data.customer_name,
            customer_email=(
                str(data.customer_email)
                if data.customer_email
                else None
            ),
            customer_document=(
                data.customer_document
            ),
            customer_phone=(
                data.customer_phone
            ),
            description=data.description,
            package_name=data.package_name,
            consultation_quantity=(
                data.consultation_quantity
            ),
            amount=data.amount,
            status="created",
            status_detail=(
                "Aguardando pagamento"
            ),
            checkout_url=checkout_url,
            internal_note=data.internal_note,
            expires_at=expires_at,
            mercado_pago_payload={
                "checkout_type": "orders",
                "max_installments": (
                    data.max_installments
                ),
                "default_installments": (
                    data.default_installments
                ),
                "installment_mode": (
                    data.installment_mode
                ),
            },
        )

        db.add(payment)
        await db.commit()
        await db.refresh(payment)

        return payment

    @staticmethod
    def create_idempotency_key(
        reference: str,
        card_token: str,
    ) -> str:
        raw = (
            f"{reference}:{card_token}"
        ).encode("utf-8")

        return hashlib.sha256(
            raw
        ).hexdigest()

    @classmethod
    async def create_card_order(
        cls,
        payment: Payment,
        card_token: str,
        payment_method_id: str,
        installments: int,
        payer_email: str,
        identification_type: Optional[str],
        identification_number: Optional[str],
    ) -> Dict[str, Any]:
        access_token = (
            cls.get_access_token()
        )

        amount = cls.money_string(
            Decimal(payment.amount)
        )

        payer: Dict[str, Any] = {
            "email": payer_email,
        }

        if (
            identification_type
            and identification_number
        ):
            payer["identification"] = {
                "type": (
                    identification_type
                ),
                "number": (
                    identification_number
                ),
            }

        payload = {
            "type": "online",
            "processing_mode": "automatic",
            "total_amount": amount,
            "external_reference": (
                payment.external_reference
            ),
            "payer": payer,
            "transactions": {
                "payments": [
                    {
                        "amount": amount,
                        "payment_method": {
                            "id": (
                                payment_method_id
                            ),
                            "type": (
                                "credit_card"
                            ),
                            "token": card_token,
                            "installments": (
                                installments
                            ),
                        },
                    }
                ]
            },
        }

        headers = {
            "Authorization": (
                f"Bearer {access_token}"
            ),
            "Content-Type": (
                "application/json"
            ),
            "X-Idempotency-Key": (
                cls.create_idempotency_key(
                    payment.external_reference,
                    card_token,
                )
            ),
        }

        try:
            async with httpx.AsyncClient(
                timeout=40.0
            ) as client:
                response = await client.post(
                    (
                        f"{MERCADO_PAGO_API_URL}"
                        "/v1/orders"
                    ),
                    json=payload,
                    headers=headers,
                )

        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=504,
                detail=(
                    "O Mercado Pago demorou "
                    "para responder."
                ),
            ) from exc

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Não foi possível conectar "
                    "ao Mercado Pago."
                ),
            ) from exc

        try:
            result = response.json()
        except ValueError:
            result = {
                "message": response.text
            }

        if response.status_code not in (
            200,
            201,
            202,
        ):
            status_code = (
                response.status_code
                if 400
                <= response.status_code
                < 500
                else 502
            )

            raise HTTPException(
                status_code=status_code,
                detail={
                    "message": (
                        "O Mercado Pago não "
                        "aprovou a transação."
                    ),
                    "mercado_pago_status": (
                        response.status_code
                    ),
                    "mercado_pago_response": (
                        cls.sanitize_payload(
                            result
                        )
                    ),
                },
            )

        return result

    @classmethod
    async def get_order(
        cls,
        order_id: str,
    ) -> Dict[str, Any]:
        access_token = (
            cls.get_access_token()
        )

        try:
            async with httpx.AsyncClient(
                timeout=30.0
            ) as client:
                response = await client.get(
                    (
                        f"{MERCADO_PAGO_API_URL}"
                        f"/v1/orders/{order_id}"
                    ),
                    headers={
                        "Authorization": (
                            "Bearer "
                            f"{access_token}"
                        ),
                    },
                )

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Não foi possível consultar "
                    "a Order no Mercado Pago."
                ),
            ) from exc

        try:
            result = response.json()
        except ValueError:
            result = {
                "message": response.text
            }

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Erro ao consultar "
                    "a Order."
                ),
            )

        return result

    @classmethod
    async def apply_order_to_payment(
        cls,
        db: AsyncSession,
        payment: Payment,
        order: Dict[str, Any],
    ) -> Payment:
        transactions = (
            order.get("transactions")
            or {}
        )

        mp_payments = (
            transactions.get("payments")
            or []
        )

        mp_payment = (
            mp_payments[0]
            if mp_payments
            else {}
        )

        payment_status = str(
            mp_payment.get("status")
            or ""
        ).lower()

        order_status = str(
            order.get("status")
            or ""
        ).lower()

        effective_status = (
            payment_status
            or order_status
        )

        if effective_status in (
            "approved",
            "processed",
            "accredited",
        ):
            local_status = "approved"

        elif effective_status in (
            "rejected",
            "failed",
        ):
            local_status = "rejected"

        elif effective_status in (
            "cancelled",
            "canceled",
        ):
            local_status = "cancelled"

        else:
            local_status = "pending"

        payment.status = local_status

        payment.status_detail = str(
            mp_payment.get(
                "status_detail"
            )
            or order.get(
                "status_detail"
            )
            or effective_status
            or local_status
        )[:120]

        payment_method = (
            mp_payment.get(
                "payment_method"
            )
            or {}
        )

        if isinstance(
            payment_method,
            dict,
        ):
            payment.payment_method_id = (
                payment_method.get("id")
            )

            payment.payment_type_id = (
                payment_method.get("type")
            )

        if mp_payment.get("id"):
            payment.mercado_pago_payment_id = (
                str(mp_payment["id"])
            )

        previous_payload = (
            payment.mercado_pago_payload
            if isinstance(
                payment.mercado_pago_payload,
                dict,
            )
            else {}
        )

        payment.mercado_pago_payload = {
            **previous_payload,
            "checkout_type": "orders",
            "order_id": order.get("id"),
            "order": cls.sanitize_payload(
                order
            ),
        }

        if (
            local_status == "approved"
            and payment.paid_at is None
        ):
            payment.paid_at = (
                datetime.now(
                    timezone.utc
                )
            )

        payment.updated_at = (
            datetime.now(
                timezone.utc
            )
        )

        await db.commit()
        await db.refresh(payment)

        return payment
