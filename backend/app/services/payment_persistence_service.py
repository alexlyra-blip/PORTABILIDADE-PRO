from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sqlalchemy_models import Payment
from app.schemas.payment_schema import CreatePaymentLinkRequest


class PaymentPersistenceService:
    @staticmethod
    def parse_datetime(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None

        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None

    @classmethod
    async def save_created_payment(
        cls,
        db: AsyncSession,
        data: CreatePaymentLinkRequest,
        created_by_user_id: int,
        mercado_pago_result: Dict[str, Any],
    ) -> Payment:
        reference = mercado_pago_result["reference"]

        existing_result = await db.execute(
            select(Payment).where(
                Payment.external_reference == reference
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            return existing

        mp_response = mercado_pago_result.get(
            "mercado_pago_response",
            {},
        )

        expires_at = cls.parse_datetime(
            mp_response.get("expiration_date_to")
        )

        payment = Payment(
            created_by_user_id=created_by_user_id,
            external_reference=reference,
            preference_id=mercado_pago_result.get(
                "preference_id"
            ),
            customer_name=data.customer_name,
            customer_email=(
                str(data.customer_email)
                if data.customer_email
                else None
            ),
            customer_document=data.customer_document,
            customer_phone=data.customer_phone,
            description=data.description,
            package_name=data.package_name,
            consultation_quantity=data.consultation_quantity,
            amount=Decimal(str(data.amount)),
            status="created",
            checkout_url=mercado_pago_result.get(
                "payment_url"
            ),
            internal_note=data.internal_note,
            expires_at=expires_at,
            mercado_pago_payload=mp_response,
        )

        db.add(payment)
        await db.commit()
        await db.refresh(payment)

        return payment

    @classmethod
    async def update_from_mercado_pago(
        cls,
        db: AsyncSession,
        mercado_pago_payment: Dict[str, Any],
    ) -> Optional[Payment]:
        external_reference = mercado_pago_payment.get(
            "external_reference"
        )

        if not external_reference:
            print(
                "[PAYMENTS] Pagamento Mercado Pago sem "
                "external_reference."
            )
            return None

        result = await db.execute(
            select(Payment).where(
                Payment.external_reference
                == external_reference
            )
        )
        payment = result.scalar_one_or_none()

        if not payment:
            print(
                "[PAYMENTS] Cobrança não encontrada:",
                external_reference,
            )
            return None

        payment_id = mercado_pago_payment.get("id")

        if payment_id is not None:
            payment.mercado_pago_payment_id = str(
                payment_id
            )

        payment.status = (
            mercado_pago_payment.get("status")
            or payment.status
        )

        payment.status_detail = (
            mercado_pago_payment.get("status_detail")
        )

        payment.payment_method_id = (
            mercado_pago_payment.get("payment_method_id")
        )

        payment.payment_type_id = (
            mercado_pago_payment.get("payment_type_id")
        )

        payment.mercado_pago_payload = (
            mercado_pago_payment
        )

        date_approved = cls.parse_datetime(
            mercado_pago_payment.get("date_approved")
        )

        if payment.status == "approved":
            payment.paid_at = (
                date_approved
                or datetime.now(timezone.utc)
            )

        payment.updated_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(payment)

        return payment
