from datetime import (
    datetime,
    timezone,
)
from typing import (
    Any,
    Dict,
    Optional,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)

from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.database import get_db

from app.services import auth_service

from app.models.sqlalchemy_models import (
    Payment,
    User,
)

from app.routers.deps import (
    get_admin_user,
)

from app.schemas.payment_schema import (
    CreatePaymentLinkRequest,
)

from app.services.mercado_pago_orders_service import (
    MercadoPagoOrdersService,
)


router = APIRouter()


class RefundOrderRequest(BaseModel):
    password: str = Field(
        min_length=1,
        max_length=200,
    )

    reason: Optional[str] = Field(
        default=None,
        max_length=500,
    )


class CardOrderRequest(BaseModel):
    card_token: str = Field(
        min_length=10,
        max_length=500,
    )

    payment_method_id: str = Field(
        min_length=1,
        max_length=50,
    )

    installments: int = Field(
        ge=1,
        le=12,
    )

    payer_email: EmailStr

    identification_type: Optional[str] = (
        Field(
            default=None,
            max_length=20,
        )
    )

    identification_number: Optional[str] = (
        Field(
            default=None,
            max_length=30,
        )
    )


@router.post("/admin/create-link")
async def create_order_payment_link(
    data: CreatePaymentLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
) -> Dict[str, Any]:
    payment = (
        await MercadoPagoOrdersService
        .create_local_payment(
            db=db,
            data=data,
            created_by_user_id=(
                current_user.id
            ),
        )
    )

    return {
        "success": True,
        "payment_id": payment.id,
        "reference": (
            payment.external_reference
        ),
        "payment_url": (
            payment.checkout_url
        ),
        "checkout_url": (
            payment.checkout_url
        ),
        "amount": float(
            payment.amount
        ),
        "status": payment.status,
        "checkout_type": "orders",
    }


@router.get("/public/{reference}")
async def get_public_order_payment(
    reference: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(
        select(Payment).where(
            Payment.external_reference
            == reference
        )
    )

    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail=(
                "Cobrança não encontrada."
            ),
        )

    if (
        payment.expires_at
        and payment.expires_at
        < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=410,
            detail=(
                "Esta cobrança expirou."
            ),
        )

    mp_payload = (
        payment.mercado_pago_payload
        if isinstance(
            payment.mercado_pago_payload,
            dict,
        )
        else {}
    )

    if (
        mp_payload.get(
            "checkout_type"
        )
        != "orders"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Esta cobrança pertence "
                "ao checkout anterior."
            ),
        )

    return {
        "success": True,
        "reference": (
            payment.external_reference
        ),
        "description": (
            payment.description
        ),
        "customer_name": (
            payment.customer_name
        ),
        "amount": float(
            payment.amount
        ),
        "status": payment.status,
        "status_detail": (
            payment.status_detail
        ),
        "statement_descriptor": (
            str(
                mp_payload.get(
                    "statement_descriptor"
                )
                or MercadoPagoOrdersService
                .get_statement_descriptor()
            )
        ),
        "max_installments": int(
            mp_payload.get(
                "max_installments",
                12,
            )
            or 12
        ),
        "expires_at": (
            payment.expires_at.isoformat()
            if payment.expires_at
            else None
        ),
    }


@router.post(
    "/public/{reference}/card"
)
async def process_order_card(
    reference: str,
    data: CardOrderRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(
        select(Payment).where(
            Payment.external_reference
            == reference
        )
    )

    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail=(
                "Cobrança não encontrada."
            ),
        )

    if payment.status == "approved":
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta cobrança já foi paga."
            ),
        )

    if payment.status == "pending":
        raise HTTPException(
            status_code=409,
            detail=(
                "Este pagamento está "
                "em processamento."
            ),
        )

    if (
        payment.expires_at
        and payment.expires_at
        < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=410,
            detail=(
                "Esta cobrança expirou."
            ),
        )

    mp_payload = (
        payment.mercado_pago_payload
        if isinstance(
            payment.mercado_pago_payload,
            dict,
        )
        else {}
    )

    if (
        mp_payload.get(
            "checkout_type"
        )
        != "orders"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Cobrança incompatível "
                "com Checkout Transparente."
            ),
        )

    max_installments = int(
        mp_payload.get(
            "max_installments",
            12,
        )
        or 12
    )

    if (
        data.installments
        > max_installments
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Número de parcelas acima "
                "do permitido."
            ),
        )

    # Preserva os dados escolhidos pelo cliente
    # para o histórico e comprovante.
    #
    # Não armazena número do cartão,
    # CVV ou token.
    payment.mercado_pago_payload = {
        **mp_payload,
        "selected_installments": (
            data.installments
        ),
        "selected_card_brand": (
            data.payment_method_id
        ),
    }

    order = (
        await MercadoPagoOrdersService
        .create_card_order(
            payment=payment,
            card_token=data.card_token,
            payment_method_id=(
                data.payment_method_id
            ),
            installments=(
                data.installments
            ),
            payer_email=(
                str(data.payer_email)
            ),
            identification_type=(
                data.identification_type
            ),
            identification_number=(
                data.identification_number
            ),
        )
    )

    payment = (
        await MercadoPagoOrdersService
        .apply_order_to_payment(
            db=db,
            payment=payment,
            order=order,
        )
    )

    return {
        "success": True,
        "payment_id": payment.id,
        "reference": (
            payment.external_reference
        ),
        "order_id": order.get("id"),
        "status": payment.status,
        "status_detail": (
            payment.status_detail
        ),
    }


@router.post("/admin/{payment_id}/refund")
async def refund_admin_order_payment(
    payment_id: int,
    data: RefundOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
) -> Dict[str, Any]:
    """
    Estorno total de uma Order aprovada.

    Exige:
    - sessão válida;
    - usuário ADMIN;
    - confirmação da senha atual do admin.

    A senha nunca é persistida.
    """

    # Reautenticação obrigatória
    if not auth_service.verify_password(
        data.password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Senha do administrador "
                "incorreta."
            ),
        )

    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id
        )
    )

    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Pagamento não encontrado.",
        )

    mp_payload = (
        payment.mercado_pago_payload
        if isinstance(
            payment.mercado_pago_payload,
            dict,
        )
        else {}
    )

    if (
        mp_payload.get("checkout_type")
        != "orders"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Estorno disponível somente "
                "para pagamentos Orders."
            ),
        )

    if payment.status != "approved":
        raise HTTPException(
            status_code=409,
            detail=(
                "Somente pagamentos aprovados "
                "podem ser estornados."
            ),
        )

    order_id = str(
        mp_payload.get("order_id") or ""
    ).strip()

    if not order_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "Order ID não encontrado "
                "neste pagamento."
            ),
        )

    refund = (
        await MercadoPagoOrdersService
        .refund_order(order_id)
    )

    refund_transactions = (
        (
            refund.get("transactions")
            or {}
        ).get("refunds")
        or []
    )

    first_refund = (
        refund_transactions[0]
        if refund_transactions
        else {}
    )

    now = datetime.now(timezone.utc)

    refund_record = {
        "refund_id": (
            first_refund.get("id")
        ),
        "transaction_id": (
            first_refund.get(
                "transaction_id"
            )
        ),
        "amount": (
            first_refund.get("amount")
            or float(payment.amount or 0)
        ),
        "status": (
            first_refund.get("status")
            or refund.get("status_detail")
            or refund.get("status")
        ),
        "reason": data.reason,
        "refunded_by_user_id": (
            current_user.id
        ),
        "refunded_by_name": (
            current_user.name
        ),
        "refunded_at": (
            now.isoformat()
        ),
    }

    previous_history = (
        mp_payload.get("refund_history")
        if isinstance(
            mp_payload.get("refund_history"),
            list,
        )
        else []
    )

    payment.mercado_pago_payload = {
        **mp_payload,
        "refund_history": [
            *previous_history,
            refund_record,
        ],
        "last_refund": refund_record,
    }

    payment.status = "refunded"
    payment.status_detail = "refunded"
    payment.updated_at = now

    if data.reason:
        payment.internal_note = (
            f"{payment.internal_note or ''}\n"
            f"Estorno: {data.reason}"
        ).strip()

    await db.commit()
    await db.refresh(payment)

    return {
        "success": True,
        "payment_id": payment.id,
        "order_id": order_id,
        "status": payment.status,
        "status_detail": (
            payment.status_detail
        ),
        "refund": refund_record,
    }
