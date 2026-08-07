from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sqlalchemy_models import User
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
