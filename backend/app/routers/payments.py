from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request

from app.models.sqlalchemy_models import User
from app.routers.deps import get_admin_user
from app.schemas.payment_schema import (
    CreatePaymentLinkRequest,
)
from app.services.mercado_pago_service import (
    MercadoPagoService,
)


router = APIRouter()


@router.post("/admin/create-link")
async def create_payment_link(
    data: CreatePaymentLinkRequest,
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    """
    Cria uma preferência do Checkout Pro.

    Apenas usuários com role=admin podem utilizar esta rota.
    """
    return await MercadoPagoService.create_payment_link(
        data=data,
        created_by_user_id=current_user.id,
    )


@router.post("/webhook")
async def mercado_pago_webhook(
    request: Request,
) -> Dict[str, Any]:
    """
    Recebe notificações do Mercado Pago.

    Nesta primeira etapa consulta o pagamento e registra o
    resultado no log. Na próxima etapa salvaremos no banco.
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
        payment_id = str(query_params["data.id"])

    topic = (
        payload.get("type")
        or payload.get("topic")
        or query_params.get("type")
        or query_params.get("topic")
    )

    if not payment_id:
        print(
            "[MERCADO_PAGO_WEBHOOK] Notificação recebida "
            "sem payment_id:",
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

    payment = await MercadoPagoService.get_payment(payment_id)

    print(
        "[MERCADO_PAGO_WEBHOOK] Pagamento consultado:",
        {
            "payment_id": payment.get("id"),
            "status": payment.get("status"),
            "status_detail": payment.get("status_detail"),
            "external_reference": payment.get(
                "external_reference"
            ),
            "transaction_amount": payment.get(
                "transaction_amount"
            ),
            "payment_method_id": payment.get(
                "payment_method_id"
            ),
        },
    )

    return {
        "received": True,
        "processed": True,
        "payment_id": str(payment.get("id")),
        "status": payment.get("status"),
        "status_detail": payment.get("status_detail"),
        "external_reference": payment.get(
            "external_reference"
        ),
    }
