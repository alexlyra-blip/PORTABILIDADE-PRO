from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.sqlalchemy_models import User, Payment
from app.routers.deps import get_admin_user
from app.schemas.payment_schema import (
    CreatePaymentLinkRequest,
)
from app.services.mercado_pago_service import (
    MercadoPagoService,
)
from app.services.payment_persistence_service import (
    PaymentPersistenceService,
)
from app.services.mercado_pago_webhook_service import (
    MercadoPagoWebhookService,
)


router = APIRouter()


@router.post("/admin/create-link")
async def create_payment_link(
    data: CreatePaymentLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    """
    Cria uma preferência Checkout Pro e registra
    a cobrança no banco.
    """

    result = await MercadoPagoService.create_payment_link(
        data=data,
        created_by_user_id=current_user.id,
    )

    payment = await PaymentPersistenceService.save_created_payment(
        db=db,
        data=data,
        created_by_user_id=current_user.id,
        mercado_pago_result=result,
    )

    return {
        "success": True,
        "id": payment.id,
        "reference": result["reference"],
        "preference_id": result["preference_id"],
        "payment_url": result["payment_url"],
        "amount": str(payment.amount),
        "status": payment.status,
    }


@router.post("/webhook")
async def mercado_pago_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Recebe a notificação e confirma os dados
    consultando diretamente a API do Mercado Pago.
    """

    try:
        payload = await request.json()
    except Exception:
        payload = {}

    query_params = dict(request.query_params)

    payment_id: Optional[str] = None

    data = payload.get("data")

    if isinstance(data, dict) and data.get("id"):
        payment_id = str(data["id"])

    if not payment_id and query_params.get("data.id"):
        payment_id = str(
            query_params["data.id"]
        )

    topic = (
        payload.get("type")
        or payload.get("topic")
        or query_params.get("type")
        or query_params.get("topic")
    )

    if not payment_id:
        print(
            "[MERCADO_PAGO_WEBHOOK] "
            "Notificação sem payment_id:",
            {
                "topic": topic,
                "payload": payload,
                "query_params": query_params,
            },
        )

        return {
            "received": True,
            "processed": False,
            "reason": "payment_id_not_found",
        }

    x_signature = request.headers.get("x-signature")
    x_request_id = request.headers.get("x-request-id")

    MercadoPagoWebhookService.validate(
        x_signature=x_signature,
        x_request_id=x_request_id,
        data_id=payment_id,
    )

    mercado_pago_payment = (
        await MercadoPagoService.get_payment(
            payment_id
        )
    )

    payment = (
        await PaymentPersistenceService
        .update_from_mercado_pago(
            db=db,
            mercado_pago_payment=mercado_pago_payment,
        )
    )

    return {
        "received": True,
        "processed": payment is not None,
        "payment_id": str(
            mercado_pago_payment.get("id")
        ),
        "external_reference": (
            mercado_pago_payment.get(
                "external_reference"
            )
        ),
        "status": mercado_pago_payment.get(
            "status"
        ),
        "status_detail": (
            mercado_pago_payment.get(
                "status_detail"
            )
        ),
        "database_payment_id": (
            payment.id
            if payment
            else None
        ),
    }


@router.get("/admin")
async def list_admin_payments(
    status: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    limit = max(1, min(limit, 500))

    query = select(Payment)

    if status:
        query = query.where(Payment.status == status)

    query = query.order_by(desc(Payment.created_at)).limit(limit)

    result = await db.execute(query)
    payments = result.scalars().all()

    return {
        "success": True,
        "payments": [
            {
                "id": p.id,
                "external_reference": p.external_reference,
                "preference_id": p.preference_id,
                "payment_id": p.mercado_pago_payment_id,
                "customer_name": p.customer_name,
                "customer_email": p.customer_email,
                "customer_document": p.customer_document,
                "customer_phone": p.customer_phone,
                "description": p.description,
                "package_name": p.package_name,
                "consultation_quantity": p.consultation_quantity,
                "amount": float(p.amount or 0),
                "status": p.status,
                "status_detail": p.status_detail,
                "payment_method_id": p.payment_method_id,
                "payment_type_id": p.payment_type_id,
                "checkout_url": p.checkout_url,
                "expires_at": (
                    p.expires_at.isoformat()
                    if p.expires_at
                    else None
                ),
                "paid_at": (
                    p.paid_at.isoformat()
                    if p.paid_at
                    else None
                ),
                "created_at": (
                    p.created_at.isoformat()
                    if p.created_at
                    else None
                ),
            }
            for p in payments
        ],
    }


@router.get("/admin/stats")
async def payment_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:

    approved_result = await db.execute(
        select(
            func.count(Payment.id),
            func.coalesce(func.sum(Payment.amount), 0),
        ).where(Payment.status == "approved")
    )
    approved_count, approved_amount = approved_result.one()

    pending_result = await db.execute(
        select(
            func.count(Payment.id),
            func.coalesce(func.sum(Payment.amount), 0),
        ).where(
            Payment.status.in_(["created", "pending"])
        )
    )
    pending_count, pending_amount = pending_result.one()

    total_result = await db.execute(
        select(func.count(Payment.id))
    )
    total_count = total_result.scalar() or 0

    ticket_medio = (
        float(approved_amount) / approved_count
        if approved_count
        else 0
    )

    return {
        "success": True,
        "total_cobrancas": total_count,
        "pagamentos_aprovados": approved_count,
        "valor_recebido": float(approved_amount),
        "cobrancas_pendentes": pending_count,
        "valor_pendente": float(pending_amount),
        "ticket_medio": round(ticket_medio, 2),
    }


@router.get("/admin/{payment_id}")
async def get_admin_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    from fastapi import HTTPException

    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id
        )
    )

    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Cobranca nao encontrada.",
        )

    return {
        "success": True,
        "payment": {
            "id": payment.id,
            "external_reference": payment.external_reference,
            "preference_id": payment.preference_id,
            "payment_id": payment.mercado_pago_payment_id,
            "customer_name": payment.customer_name,
            "customer_email": payment.customer_email,
            "customer_document": payment.customer_document,
            "customer_phone": payment.customer_phone,
            "description": payment.description,
            "package_name": payment.package_name,
            "consultation_quantity": payment.consultation_quantity,
            "amount": float(payment.amount or 0),
            "status": payment.status,
            "status_detail": payment.status_detail,
            "payment_method_id": payment.payment_method_id,
            "payment_type_id": payment.payment_type_id,
            "checkout_url": payment.checkout_url,
            "internal_note": payment.internal_note,
            "expires_at": (
                payment.expires_at.isoformat()
                if payment.expires_at
                else None
            ),
            "paid_at": (
                payment.paid_at.isoformat()
                if payment.paid_at
                else None
            ),
            "created_at": (
                payment.created_at.isoformat()
                if payment.created_at
                else None
            ),
        },
    }
