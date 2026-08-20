import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.sqlalchemy_models import User, Payment, PaymentFreeLink
from app.routers.deps import get_admin_user
from app.schemas.payment_schema import (
    CreatePaymentLinkRequest,
    UpdatePaymentLinkRequest,
    CancelPaymentRequest,
    CreateFreePaymentLinkRequest,
    UpdateFreePaymentLinkRequest,
    CreatePaymentFromFreeLinkRequest,
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


from app.services.mercado_pago_orders_service import (
    MercadoPagoOrdersService,
)
from app.services.payment_fee_config_service import (
    PaymentFeeConfigService,
)
from app.services.seller_fee_simulator_service import (
    SellerFeeSimulatorService,
)


router = APIRouter()


def _payment_payload(
    payment: Payment,
) -> Dict[str, Any]:
    payload = payment.mercado_pago_payload

    return (
        payload
        if isinstance(payload, dict)
        else {}
    )


def _payment_pricing_snapshot(
    payment: Payment,
    fee_config: Dict[str, Any],
) -> Dict[str, Any]:
    """Calcula os dados financeiros exibidos no comprovante.

    Vendas do fluxo seguro já guardam seu próprio snapshot. Pagamentos
    avulsos, porém, armazenam somente o valor cobrado. Para esses casos,
    aplicamos a mesma regra oficial da Calculadora do Vendedor no modo
    ``charge`` e devolvemos o resultado sem alterar o registro histórico.
    """

    payload = _payment_payload(payment)
    existing_snapshot = payload.get(
        "pricing_snapshot"
    )

    if isinstance(existing_snapshot, dict) and existing_snapshot:
        return existing_snapshot

    if not fee_config or not payment.amount:
        return {}

    payment_type = str(
        payment.payment_type_id or ""
    ).lower()

    if payment_type and "card" not in payment_type:
        return {}

    try:
        installments = int(
            payload.get("installments")
            or payload.get(
                "selected_installments"
            )
            or 1
        )

        channel = str(
            payload.get("payment_channel")
            or "checkout"
        ).strip().lower()

        commission_table = int(
            payload.get("commission_table")
            or 1
        )

        snapshot = (
            SellerFeeSimulatorService.simulate(
                amount=Decimal(
                    str(payment.amount)
                ),
                commission_table=(
                    commission_table
                ),
                installments=installments,
                channel=channel,
                fee_config=fee_config,
                simulation_type="charge",
            )
        )

        return {
            **snapshot,
            "source": (
                "seller_fee_simulator"
            ),
        }
    except (TypeError, ValueError):
        return {}


def _serialize_admin_payment(
    payment: Payment,
    fee_config: Dict[str, Any],
) -> Dict[str, Any]:
    payload = _payment_payload(payment)

    return {
        "id": payment.id,
        "external_reference": (
            payment.external_reference
        ),
        "preference_id": payment.preference_id,
        "payment_id": (
            payment.mercado_pago_payment_id
        ),
        "customer_name": payment.customer_name,
        "customer_email": payment.customer_email,
        "customer_document": (
            payment.customer_document
        ),
        "customer_phone": payment.customer_phone,
        "description": payment.description,
        "package_name": payment.package_name,
        "consultation_quantity": (
            payment.consultation_quantity
        ),
        "amount": float(payment.amount or 0),
        "status": payment.status,
        "status_detail": payment.status_detail,
        "payment_method_id": (
            payment.payment_method_id
        ),
        "payment_type_id": payment.payment_type_id,
        "order_id": payload.get("order_id"),
        "transaction_id": payload.get(
            "transaction_id"
        ),
        "card_brand": payload.get("card_brand"),
        "installments": payload.get(
            "installments"
        ),
        "statement_descriptor": payload.get(
            "statement_descriptor"
        ),
        "last_refund": payload.get("last_refund"),
        "payment_channel": payload.get(
            "payment_channel"
        ) or "checkout",
        "installment_mode": payload.get(
            "installment_mode"
        ),
        "commission_table": payload.get(
            "commission_table"
        ) or 1,
        "pricing_snapshot": (
            _payment_pricing_snapshot(
                payment,
                fee_config,
            )
        ),
        "checkout_url": payment.checkout_url,
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
    }


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

    fee_config: Dict[str, Any] = {}

    try:
        config_result = await (
            PaymentFeeConfigService.get_config(db)
        )
        fee_config = config_result.get(
            "fees",
            {},
        )
    except Exception as exc:
        # A listagem financeira continua disponível mesmo se a
        # configuração das taxas estiver temporariamente indisponível.
        print(
            "[PAYMENTS_ADMIN] "
            "Não foi possível calcular as taxas:",
            exc,
        )

    return {
        "success": True,
        "payments": [
            _serialize_admin_payment(
                payment,
                fee_config,
            )
            for payment in payments
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

    rejected_result = await db.execute(
        select(
            func.count(Payment.id),
            func.coalesce(
                func.sum(Payment.amount),
                0,
            ),
        ).where(
            Payment.status == "rejected"
        )
    )
    rejected_count, rejected_amount = (
        rejected_result.one()
    )

    refunded_result = await db.execute(
        select(
            func.count(Payment.id),
            func.coalesce(
                func.sum(Payment.amount),
                0,
            ),
        ).where(
            Payment.status == "refunded"
        )
    )
    refunded_count, refunded_amount = (
        refunded_result.one()
    )

    cancelled_result = await db.execute(
        select(
            func.count(Payment.id)
        ).where(
            Payment.status == "cancelled"
        )
    )
    cancelled_count = (
        cancelled_result.scalar() or 0
    )

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
        "pagamentos_rejeitados": rejected_count,
        "valor_rejeitado": float(rejected_amount),
        "pagamentos_estornados": refunded_count,
        "valor_estornado": float(refunded_amount),
        "pagamentos_cancelados": cancelled_count,
        "ticket_medio": round(ticket_medio, 2),
    }


@router.post("/admin/free-links")
async def create_free_payment_link(
    data: CreateFreePaymentLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    token = secrets.token_urlsafe(24)

    expires_at = None

    if data.expiration_days:
        expires_at = (
            datetime.now(timezone.utc)
            + timedelta(days=data.expiration_days)
        )

    free_link = PaymentFreeLink(
        token=token,
        created_by_user_id=current_user.id,
        title=data.title,
        description=data.description,
        package_name=data.package_name,
        consultation_quantity=data.consultation_quantity,
        max_installments=data.max_installments,
        default_installments=data.default_installments,
        installment_mode=data.installment_mode,
        active=True,
        expires_at=expires_at,
    )

    db.add(free_link)
    await db.commit()
    await db.refresh(free_link)

    frontend_url = MercadoPagoService.get_frontend_url()

    return {
        "success": True,
        "id": free_link.id,
        "token": free_link.token,
        "url": (
            f"{frontend_url}/pagar/"
            f"{free_link.token}"
        ),
        "title": free_link.title,
        "active": free_link.active,
        "max_installments": free_link.max_installments,
        "default_installments": (
            free_link.default_installments
        ),
        "installment_mode": free_link.installment_mode,
        "expires_at": (
            free_link.expires_at.isoformat()
            if free_link.expires_at
            else None
        ),
    }


@router.get("/admin/free-links")
async def list_free_payment_links(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    result = await db.execute(
        select(PaymentFreeLink)
        .order_by(desc(PaymentFreeLink.created_at))
    )

    links = result.scalars().all()
    frontend_url = MercadoPagoService.get_frontend_url()

    return {
        "success": True,
        "links": [
            {
                "id": link.id,
                "token": link.token,
                "url": (
                    f"{frontend_url}/pagar/{link.token}"
                ),
                "title": link.title,
                "description": link.description,
                "package_name": link.package_name,
                "consultation_quantity": (
                    link.consultation_quantity
                ),
                "max_installments": link.max_installments,
                "default_installments": (
                    link.default_installments
                ),
                "installment_mode": (
                    link.installment_mode
                ),
                "active": link.active,
                "expires_at": (
                    link.expires_at.isoformat()
                    if link.expires_at
                    else None
                ),
                "created_at": (
                    link.created_at.isoformat()
                    if link.created_at
                    else None
                ),
            }
            for link in links
        ],
    }


@router.patch("/admin/free-links/{link_id}")
async def update_free_payment_link(
    link_id: int,
    data: UpdateFreePaymentLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    result = await db.execute(
        select(PaymentFreeLink).where(
            PaymentFreeLink.id == link_id
        )
    )

    link = result.scalar_one_or_none()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Link livre não encontrado.",
        )

    if data.title is not None:
        link.title = data.title

    if data.description is not None:
        link.description = data.description

    if data.package_name is not None:
        link.package_name = data.package_name

    if data.consultation_quantity is not None:
        link.consultation_quantity = (
            data.consultation_quantity
        )

    if data.max_installments is not None:
        link.max_installments = data.max_installments

    if data.default_installments is not None:
        link.default_installments = (
            data.default_installments
        )

    if data.installment_mode is not None:
        link.installment_mode = data.installment_mode

    if data.active is not None:
        link.active = data.active

    if data.expiration_days is not None:
        link.expires_at = (
            datetime.now(timezone.utc)
            + timedelta(days=data.expiration_days)
        )

    link.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(link)

    return {
        "success": True,
        "id": link.id,
        "active": link.active,
        "expires_at": (
            link.expires_at.isoformat()
            if link.expires_at
            else None
        ),
    }


@router.delete("/admin/free-links/{link_id}")
async def delete_free_payment_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    result = await db.execute(
        select(PaymentFreeLink).where(
            PaymentFreeLink.id == link_id
        )
    )

    link = result.scalar_one_or_none()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Link livre não encontrado.",
        )

    await db.delete(link)
    await db.commit()

    return {
        "success": True,
        "deleted": True,
        "id": link_id,
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


@router.patch("/admin/{payment_id}")
async def update_admin_payment(
    payment_id: int,
    data: UpdatePaymentLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Cobrança não encontrada.",
        )

    if payment.status == "approved":
        raise HTTPException(
            status_code=409,
            detail="Cobrança aprovada não pode ser editada.",
        )

    update_payload: Dict[str, Any] = {}

    description = data.description or payment.description
    amount = data.amount if data.amount is not None else payment.amount

    if data.amount is not None or data.description is not None:
        update_payload["items"] = [
            {
                "id": payment.external_reference,
                "title": description,
                "description": description,
                "category_id": "services",
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": float(amount),
            }
        ]

    payment_methods: Dict[str, Any] = {}

    if data.max_installments is not None:
        payment_methods["installments"] = data.max_installments

    if data.default_installments is not None:
        payment_methods["default_installments"] = (
            data.default_installments
        )

    if payment_methods:
        update_payload["payment_methods"] = payment_methods

    if data.expiration_days is not None:
        expiration_date = (
            datetime.now(timezone.utc)
            + timedelta(days=data.expiration_days)
        )

        update_payload["expires"] = True
        update_payload["expiration_date_to"] = (
            expiration_date.isoformat()
        )

    if update_payload and payment.preference_id:
        await MercadoPagoService.update_preference(
            preference_id=payment.preference_id,
            payload=update_payload,
        )

    if data.customer_name is not None:
        payment.customer_name = data.customer_name

    if data.customer_email is not None:
        payment.customer_email = str(data.customer_email)

    if data.customer_document is not None:
        payment.customer_document = data.customer_document

    if data.customer_phone is not None:
        payment.customer_phone = data.customer_phone

    if data.description is not None:
        payment.description = data.description

    if data.amount is not None:
        payment.amount = data.amount

    if data.package_name is not None:
        payment.package_name = data.package_name

    if data.consultation_quantity is not None:
        payment.consultation_quantity = data.consultation_quantity

    if data.internal_note is not None:
        payment.internal_note = data.internal_note

    payment.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(payment)

    return {
        "success": True,
        "id": payment.id,
        "reference": payment.external_reference,
        "amount": float(payment.amount),
        "status": payment.status,
    }


@router.post("/admin/{payment_id}/cancel")
async def cancel_admin_payment(
    payment_id: int,
    data: CancelPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Cobrança não encontrada.",
        )

    if payment.status == "approved":
        raise HTTPException(
            status_code=409,
            detail="Pagamento aprovado não pode ser cancelado por esta rotina.",
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
        == "orders"
    ):
        order_id = str(
            mp_payload.get("order_id") or ""
        ).strip()

        if not order_id:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Order ID não encontrado "
                    "nesta cobrança."
                ),
            )

        order = (
            await MercadoPagoOrdersService
            .get_order(order_id)
        )

        mercado_pago_status = str(
            order.get("status") or ""
        ).lower()

        if mercado_pago_status not in (
            "created",
            "action_required",
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Esta Order não pode mais "
                    "ser cancelada. Status atual "
                    f"no Mercado Pago: "
                    f"{mercado_pago_status or '-'}."
                ),
            )

        cancelled_order = (
            await MercadoPagoOrdersService
            .cancel_order(order_id)
        )

        now = datetime.now(timezone.utc)

        cancel_record = {
            "order_id": order_id,
            "reason": data.reason,
            "cancelled_by_user_id": (
                current_user.id
            ),
            "cancelled_by_name": (
                current_user.name
            ),
            "cancelled_at": (
                now.isoformat()
            ),
        }

        payment.mercado_pago_payload = {
            **mp_payload,
            "last_cancel": cancel_record,
            "cancel_order_response": (
                MercadoPagoOrdersService
                .sanitize_payload(
                    cancelled_order
                )
            ),
        }

    elif payment.preference_id:
        await MercadoPagoService.cancel_preference(
            payment.preference_id
        )

    payment.status = "cancelled"

    if data.reason:
        payment.internal_note = (
            f"{payment.internal_note or ''}\n"
            f"Cancelamento: {data.reason}"
        ).strip()

    payment.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "success": True,
        "id": payment.id,
        "status": payment.status,
    }


@router.delete("/admin/{payment_id}")
async def delete_admin_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> Dict[str, Any]:
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Cobrança não encontrada.",
        )

    if (
        payment.status == "approved"
        or payment.paid_at is not None
    ):
        raise HTTPException(
            status_code=409,
            detail="Cobrança com pagamento registrado não pode ser excluída.",
        )

    mercado_pago_cleanup = "not_required"

    if payment.preference_id:
        try:
            await MercadoPagoService.cancel_preference(
                payment.preference_id
            )
            mercado_pago_cleanup = "cancelled"

        except HTTPException as exc:
            detail = exc.detail

            mercado_pago_status = None

            if isinstance(detail, dict):
                mercado_pago_status = detail.get(
                    "mercado_pago_status"
                )

            if mercado_pago_status in (401, 403, 404):
                mercado_pago_cleanup = (
                    "preference_not_accessible"
                )

                print(
                    "[PAYMENTS] Preferencia antiga nao "
                    "acessivel com a credencial atual. "
                    f"payment_id={payment.id} "
                    f"preference_id={payment.preference_id} "
                    f"mercado_pago_status={mercado_pago_status}. "
                    "Prosseguindo com exclusao local."
                )

            else:
                raise

    await db.delete(payment)
    await db.commit()

    return {
        "success": True,
        "deleted": True,
        "id": payment_id,
        "mercado_pago_cleanup": mercado_pago_cleanup,
    }


@router.get("/free/{token}")
async def get_public_free_payment_link(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(
        select(PaymentFreeLink).where(
            PaymentFreeLink.token == token
        )
    )

    link = result.scalar_one_or_none()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Link de pagamento não encontrado.",
        )

    if not link.active:
        raise HTTPException(
            status_code=410,
            detail="Este link de pagamento está desativado.",
        )

    now = datetime.now(timezone.utc)

    if link.expires_at and link.expires_at < now:
        raise HTTPException(
            status_code=410,
            detail="Este link de pagamento expirou.",
        )

    return {
        "success": True,
        "title": link.title,
        "description": link.description,
        "package_name": link.package_name,
        "consultation_quantity": (
            link.consultation_quantity
        ),
        "max_installments": link.max_installments,
        "default_installments": (
            link.default_installments
        ),
        "installment_mode": link.installment_mode,
        "expires_at": (
            link.expires_at.isoformat()
            if link.expires_at
            else None
        ),
    }


@router.post("/free/{token}/checkout")
async def create_checkout_from_free_link(
    token: str,
    data: CreatePaymentFromFreeLinkRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    result = await db.execute(
        select(PaymentFreeLink).where(
            PaymentFreeLink.token == token
        )
    )

    link = result.scalar_one_or_none()

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Link de pagamento não encontrado.",
        )

    if not link.active:
        raise HTTPException(
            status_code=410,
            detail="Este link de pagamento está desativado.",
        )

    now = datetime.now(timezone.utc)

    if link.expires_at and link.expires_at < now:
        raise HTTPException(
            status_code=410,
            detail="Este link de pagamento expirou.",
        )

    payment_request = CreatePaymentLinkRequest(
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        customer_document=data.customer_document,
        customer_phone=data.customer_phone,
        description=(
            link.description
            or link.title
            or "Pagamento Portabilidade PRO"
        ),
        amount=data.amount,
        package_name=link.package_name,
        consultation_quantity=(
            link.consultation_quantity
        ),
        expiration_days=7,
        internal_note=(
            f"Pagamento originado do link livre "
            f"#{link.id}"
        ),
        max_installments=link.max_installments,
        default_installments=(
            link.default_installments
        ),
        installment_mode=link.installment_mode,
    )

    mercado_pago_result = (
        await MercadoPagoService.create_payment_link(
            data=payment_request,
            created_by_user_id=(
                link.created_by_user_id
            ),
        )
    )

    payment = (
        await PaymentPersistenceService.save_created_payment(
            db=db,
            data=payment_request,
            created_by_user_id=(
                link.created_by_user_id
            ),
            mercado_pago_result=(
                mercado_pago_result
            ),
        )
    )

    return {
        "success": True,
        "payment_id": payment.id,
        "reference": (
            mercado_pago_result["reference"]
        ),
        "payment_url": (
            mercado_pago_result["payment_url"]
        ),
        "amount": str(payment.amount),
        "status": payment.status,
    }
