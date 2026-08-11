import hashlib
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
)
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import auth_service
from app.models.sqlalchemy_models import (
    CardSale,
    CardSaleAudit,
    CardSaleDocument,
    CardSaleAuthorization,
    Payment,
    User,
)
from app.routers.deps import (
    get_admin_user,
    get_credit_card_user,
)
from app.schemas.card_sale_schema import (
    CreateCardSaleRequest,
)
from app.services.card_sale_storage_service import (
    CardSaleStorageService,
)
from app.services.mercado_pago_service import (
    MercadoPagoService,
)
from app.services.payment_fee_config_service import (
    PaymentFeeConfigService,
)
from app.services.seller_fee_simulator_service import (
    SellerFeeSimulatorService,
)


router = APIRouter()


MAX_FILE_SIZE = 5 * 1024 * 1024

DOCUMENT_TYPES = {
    "document_front",
    "document_back",
    "selfie",
}



class CardSaleCancelRequest(
    BaseModel
):
    reason: Optional[str] = Field(
        default=None,
        max_length=500,
    )


class CardSaleRefundRequest(
    BaseModel
):
    password: str = Field(
        min_length=1,
        max_length=200,
    )

    reason: Optional[str] = Field(
        default=None,
        max_length=500,
    )


def _detect_image_type(
    content: bytes,
) -> tuple[str, str]:
    if content.startswith(
        b"\xff\xd8\xff"
    ):
        return "image/jpeg", "jpg"

    if content.startswith(
        b"\x89PNG\r\n\x1a\n"
    ):
        return "image/png", "png"

    if (
        len(content) >= 12
        and content[0:4] == b"RIFF"
        and content[8:12] == b"WEBP"
    ):
        return "image/webp", "webp"

    raise HTTPException(
        status_code=400,
        detail=(
            "Arquivo inválido. "
            "Envie JPG, PNG ou WEBP."
        ),
    )


async def _get_sale(
    *,
    sale_id: int,
    db: AsyncSession,
    current_user: User,
) -> CardSale:
    result = await db.execute(
        select(CardSale).where(
            CardSale.id == sale_id
        )
    )

    sale = result.scalar_one_or_none()

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Venda não encontrada.",
        )

    if (
        current_user.role != "admin"
        and sale.created_by_user_id
        != current_user.id
    ):
        # 404 evita revelar a existência
        # de vendas pertencentes a terceiros.
        raise HTTPException(
            status_code=404,
            detail="Venda não encontrada.",
        )

    return sale


async def _document_progress(
    *,
    sale_ids: list[int],
    db: AsyncSession,
) -> Dict[int, set[str]]:
    if not sale_ids:
        return {}

    result = await db.execute(
        select(
            CardSaleDocument.sale_id,
            CardSaleDocument.document_type,
        ).where(
            CardSaleDocument.sale_id.in_(
                sale_ids
            ),
            CardSaleDocument.deleted_at.is_(
                None
            ),
        )
    )

    progress: Dict[int, set[str]] = {}

    for sale_id, document_type in result.all():
        progress.setdefault(
            sale_id,
            set(),
        ).add(
            document_type
        )

    return progress


def _serialize_sale(
    sale: CardSale,
    document_types: Optional[
        set[str]
    ] = None,
) -> Dict[str, Any]:
    received = document_types or set()

    return {
        "id": sale.id,
        "created_by_user_id": (
            sale.created_by_user_id
        ),
        "customer_name": sale.customer_name,
        "customer_cpf": sale.customer_cpf,
        "customer_phone": (
            sale.customer_phone
        ),
        "customer_email": (
            sale.customer_email
        ),
        "description": sale.description,
        "amount": float(
            sale.amount or 0
        ),
        "installments": (
            sale.installments
        ),
        "payment_channel": (
            sale.payment_channel
        ),
        "simulation_type": (
            sale.simulation_type
        ),
        "installment_mode": (
            sale.installment_mode
        ),
        "commission_table": (
            sale.commission_table
        ),
        "reference_amount": (
            float(sale.reference_amount)
            if sale.reference_amount is not None
            else None
        ),
        "customer_total": (
            float(sale.customer_total)
            if sale.customer_total is not None
            else None
        ),
        "installment_value": (
            float(sale.installment_value)
            if sale.installment_value is not None
            else None
        ),
        "pricing_snapshot": (
            sale.pricing_snapshot or {}
        ),
        "status": sale.status,
        "payment_id": sale.payment_id,
        "documents_received": len(
            received
        ),
        "documents_total": 3,
        "document_front": (
            "document_front" in received
        ),
        "document_back": (
            "document_back" in received
        ),
        "selfie": (
            "selfie" in received
        ),
        "documentation_completed_at": (
            sale.documentation_completed_at
            .isoformat()
            if sale.documentation_completed_at
            else None
        ),
        "created_at": (
            sale.created_at.isoformat()
            if sale.created_at
            else None
        ),
        "updated_at": (
            sale.updated_at.isoformat()
            if sale.updated_at
            else None
        ),
    }


@router.get("/access")
async def credit_card_access(
    current_user: User = Depends(
        get_credit_card_user
    ),
):
    return {
        "success": True,
        "authorized": True,
        "user_id": current_user.id,
        "role": current_user.role,
    }


@router.get("/storage-check")
async def storage_check(
    current_user: User = Depends(
        get_credit_card_user
    ),
):
    try:
        bucket = (
            await CardSaleStorageService
            .check_bucket()
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Storage privado indisponível. "
                "Verifique a configuração "
                "do backend."
            ),
        )

    return {
        "success": True,
        "storage": "ready",
        "bucket": bucket,
    }


@router.post("")
async def create_card_sale(
    data: CreateCardSaleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    payment_channel = "checkout"
    installment_mode = "seller"

    config_result = await (
        PaymentFeeConfigService.get_config(db)
    )

    try:
        simulation = (
            SellerFeeSimulatorService.simulate(
                amount=data.amount,
                commission_table=(
                    data.commission_table
                ),
                installments=data.installments,
                channel=payment_channel,
                fee_config=(
                    config_result["fees"]
                ),
                simulation_type=(
                    data.simulation_type
                ),
            )
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    customer_total = Decimal(
        str(simulation["customer_total"])
    ).quantize(
        Decimal("0.01")
    )

    installment_value = Decimal(
        str(simulation["installment_value"])
    ).quantize(
        Decimal("0.01")
    )

    pricing_snapshot = dict(simulation)

    pricing_snapshot.update({
        "payment_channel": payment_channel,
        "installment_mode": installment_mode,
        "simulation_type": (
            data.simulation_type
        ),
        "commission_table": (
            data.commission_table
        ),
        "reference_amount": float(
            data.amount
        ),
        "customer_total": float(
            customer_total
        ),
        "installment_value": float(
            installment_value
        ),
    })

    sale = CardSale(
        created_by_user_id=current_user.id,
        customer_name=data.customer_name,
        customer_cpf=data.customer_cpf,
        customer_phone=data.customer_phone,
        customer_email=(
            str(data.customer_email)
            if data.customer_email
            else None
        ),
        description=data.description,

        # amount continua sendo o valor usado
        # pelo restante do fluxo de pagamento.
        # Agora ele representa o valor final
        # efetivamente cobrado do cliente.
        amount=customer_total,

        installments=data.installments,

        payment_channel=payment_channel,
        simulation_type=data.simulation_type,
        installment_mode=installment_mode,
        commission_table=(
            data.commission_table
        ),

        reference_amount=data.amount,
        customer_total=customer_total,
        installment_value=installment_value,
        pricing_snapshot=pricing_snapshot,

        status="documentation_pending",
    )

    db.add(sale)

    await db.flush()

    db.add(
        CardSaleAudit(
            sale_id=sale.id,
            actor_user_id=current_user.id,
            event="sale_created",
            old_status=None,
            new_status=sale.status,
            metadata_json={
                "payment_channel": (
                    payment_channel
                ),
                "installment_mode": (
                    installment_mode
                ),
                "simulation_type": (
                    data.simulation_type
                ),
                "commission_table": (
                    data.commission_table
                ),
                "reference_amount": str(
                    data.amount
                ),
                "customer_total": str(
                    customer_total
                ),
                "installments": (
                    data.installments
                ),
                "installment_value": str(
                    installment_value
                ),
            },
        )
    )

    await db.commit()
    await db.refresh(sale)

    return {
        "success": True,
        "sale": _serialize_sale(
            sale,
            set(),
        ),
    }


@router.get("")
async def list_card_sales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    query = select(CardSale)

    if current_user.role != "admin":
        query = query.where(
            CardSale.created_by_user_id
            == current_user.id
        )

    query = query.order_by(
        desc(CardSale.created_at)
    )

    result = await db.execute(query)
    sales = result.scalars().all()

    progress = await _document_progress(
        sale_ids=[
            sale.id
            for sale in sales
        ],
        db=db,
    )

    return {
        "success": True,
        "sales": [
            _serialize_sale(
                sale,
                progress.get(
                    sale.id,
                    set(),
                ),
            )
            for sale in sales
        ],
    }



# ============================================================
# CARD_SALE_FINANCE_ADMIN_V1
# Financeiro unificado das vendas no cartão
# ============================================================

def _finance_status(
    sale: CardSale,
    authorization,
    payment,
) -> str:

    if payment:

        if payment.status == "approved":
            return "approved"

        if payment.status == "refunded":
            return "refunded"

        if payment.status == "cancelled":
            return "cancelled"

        return "awaiting_payment"

    if (
        authorization
        and authorization.status == "authorized"
    ):
        return "authorized"

    if (
        authorization
        and authorization.status == "pending"
    ):
        return "authorization_pending"

    return sale.status


def _masked_cpf(
    value: Optional[str],
) -> Optional[str]:

    digits = "".join(
        char
        for char in str(value or "")
        if char.isdigit()
    )

    if len(digits) != 11:
        return None

    return (
        "***.***.***-"
        f"{digits[-2:]}"
    )


@router.get("/admin/finance")
async def list_card_sale_finance(
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
) -> Dict[str, Any]:

    limit = max(
        1,
        min(
            limit,
            500,
        ),
    )

    sales_result = await db.execute(
        select(CardSale)
        .order_by(
            CardSale.created_at.desc()
        )
        .limit(limit)
    )

    sales = (
        sales_result
        .scalars()
        .all()
    )

    sale_ids = [
        sale.id
        for sale in sales
    ]

    authorization_by_sale = {}

    if sale_ids:

        authorization_result = (
            await db.execute(
                select(
                    CardSaleAuthorization
                ).where(
                    CardSaleAuthorization
                    .sale_id
                    .in_(sale_ids)
                )
            )
        )

        authorizations = (
            authorization_result
            .scalars()
            .all()
        )

        authorization_by_sale = {
            authorization.sale_id:
                authorization
            for authorization
            in authorizations
        }

    payment_ids = [
        sale.payment_id
        for sale in sales
        if sale.payment_id
    ]

    payment_by_id = {}

    if payment_ids:

        payment_result = (
            await db.execute(
                select(Payment).where(
                    Payment.id.in_(
                        payment_ids
                    )
                )
            )
        )

        payments = (
            payment_result
            .scalars()
            .all()
        )

        payment_by_id = {
            payment.id: payment
            for payment in payments
        }

    progress = await _document_progress(
        sale_ids=sale_ids,
        db=db,
    )

    items = []

    for sale in sales:

        authorization = (
            authorization_by_sale.get(
                sale.id
            )
        )

        payment = (
            payment_by_id.get(
                sale.payment_id
            )
            if sale.payment_id
            else None
        )

        received = progress.get(
            sale.id,
            set(),
        )

        mp_payload = (
            payment.mercado_pago_payload
            if (
                payment
                and isinstance(
                    payment.mercado_pago_payload,
                    dict,
                )
            )
            else {}
        )

        finance_status = _finance_status(
            sale,
            authorization,
            payment,
        )

        # CARD_SALE_RECEIPT_AFTER_REFUND_V1
        # O estorno não apaga o comprovante
        # da transação original aprovada.
        receipt_available = bool(
            payment
            and payment.status in (
                "approved",
                "refunded",
            )
        )

        receipt = None

        if receipt_available:

            receipt = {
                "receipt_number": (
                    f"PP-{sale.id}-"
                    f"{payment.id}"
                ),
                "sale_id": sale.id,
                "payment_id": payment.id,
                "mercado_pago_payment_id": (
                    payment
                    .mercado_pago_payment_id
                ),
                "transaction_id": (
                    mp_payload.get(
                        "transaction_id"
                    )
                ),
                "order_id": (
                    mp_payload.get(
                        "order_id"
                    )
                ),
                "external_reference": (
                    payment.external_reference
                ),
                "customer_name": (
                    sale.customer_name
                ),
                "customer_cpf_masked": (
                    _masked_cpf(
                        sale.customer_cpf
                    )
                ),
                "amount": float(
                    payment.amount or 0
                ),
                "installments": (
                    mp_payload.get(
                        "installments"
                    )
                    or sale.installments
                ),
                "installment_value": (
                    float(
                        sale.installment_value
                    )
                    if (
                        sale.installment_value
                        is not None
                    )
                    else None
                ),
                "payment_method_id": (
                    payment.payment_method_id
                ),
                "payment_type_id": (
                    payment.payment_type_id
                ),
                "card_brand": (
                    mp_payload.get(
                        "card_brand"
                    )
                ),
                "statement_descriptor": (
                    mp_payload.get(
                        "statement_descriptor"
                    )
                ),
                "paid_at": (
                    payment.paid_at.isoformat()
                    if payment.paid_at
                    else None
                ),
                "status": payment.status,
            }

        items.append(
            {
                "sale_id": sale.id,
                "created_by_user_id": (
                    sale.created_by_user_id
                ),

                "customer": {
                    "name": (
                        sale.customer_name
                    ),
                    "cpf_masked": (
                        _masked_cpf(
                            sale.customer_cpf
                        )
                    ),
                    "phone": (
                        sale.customer_phone
                    ),
                    "email": (
                        sale.customer_email
                    ),
                },

                "description": (
                    sale.description
                ),

                "pricing": {
                    "reference_amount": (
                        float(
                            sale.reference_amount
                        )
                        if (
                            sale.reference_amount
                            is not None
                        )
                        else None
                    ),
                    "customer_total": (
                        float(
                            sale.customer_total
                        )
                        if (
                            sale.customer_total
                            is not None
                        )
                        else float(
                            sale.amount or 0
                        )
                    ),
                    "installments": (
                        sale.installments
                    ),
                    "installment_value": (
                        float(
                            sale.installment_value
                        )
                        if (
                            sale.installment_value
                            is not None
                        )
                        else None
                    ),
                    "simulation_type": (
                        sale.simulation_type
                    ),
                    "commission_table": (
                        sale.commission_table
                    ),
                    "payment_channel": (
                        sale.payment_channel
                    ),
                    "installment_mode": (
                        sale.installment_mode
                    ),

                    # CARD_SALE_FINANCE_SNAPSHOT_V2
                    "snapshot": (
                        sale.pricing_snapshot
                        if isinstance(
                            sale.pricing_snapshot,
                            dict,
                        )
                        else {}
                    ),
                },

                "sale_status": (
                    sale.status
                ),

                "finance_status": (
                    finance_status
                ),

                "documents": {
                    "received": len(
                        received
                    ),
                    "total": 3,
                    "document_front": (
                        "document_front"
                        in received
                    ),
                    "document_back": (
                        "document_back"
                        in received
                    ),
                    "selfie": (
                        "selfie"
                        in received
                    ),
                    "completed_at": (
                        sale
                        .documentation_completed_at
                        .isoformat()
                        if (
                            sale
                            .documentation_completed_at
                        )
                        else None
                    ),
                },

                "authorization": (
                    {
                        "id": (
                            authorization.id
                        ),
                        "status": (
                            authorization.status
                        ),
                        "url": (
                            f"{MercadoPagoService.get_frontend_url()}"
                            f"/autorizar-venda/{authorization.token}"
                        ),
                        "expires_at": (
                            authorization
                            .expires_at
                            .isoformat()
                            if (
                                authorization
                                .expires_at
                            )
                            else None
                        ),
                        "authorized_at": (
                            authorization
                            .authorized_at
                            .isoformat()
                            if (
                                authorization
                                .authorized_at
                            )
                            else None
                        ),
                        "signer_name": (
                            authorization
                            .signer_name
                        ),
                        "term_sha256": (
                            authorization
                            .term_sha256
                        ),
                        "signature_sha256": (
                            authorization
                            .signature_sha256
                        ),
                        "has_signature": bool(
                            authorization
                            .signature_storage_key
                        ),
                    }
                    if authorization
                    else None
                ),

                "payment": (
                    {
                        "id": payment.id,
                        "status": (
                            payment.status
                        ),
                        "status_detail": (
                            payment.status_detail
                        ),
                        "mercado_pago_payment_id": (
                            payment
                            .mercado_pago_payment_id
                        ),
                        "external_reference": (
                            payment
                            .external_reference
                        ),
                        "checkout_url": (
                            payment.checkout_url
                        ),
                        "amount": float(
                            payment.amount or 0
                        ),
                        "payment_method_id": (
                            payment
                            .payment_method_id
                        ),
                        "payment_type_id": (
                            payment
                            .payment_type_id
                        ),
                        "transaction_id": (
                            mp_payload.get(
                                "transaction_id"
                            )
                        ),
                        "order_id": (
                            mp_payload.get(
                                "order_id"
                            )
                        ),
                        "card_brand": (
                            mp_payload.get(
                                "card_brand"
                            )
                        ),
                        "installments": (
                            mp_payload.get(
                                "installments"
                            )
                        ),
                        "paid_at": (
                            payment
                            .paid_at
                            .isoformat()
                            if payment.paid_at
                            else None
                        ),
                        "last_refund": (
                            mp_payload.get(
                                "last_refund"
                            )
                        ),
                    }
                    if payment
                    else None
                ),

                "receipt_available": (
                    receipt_available
                ),

                "receipt": receipt,

                "created_at": (
                    sale.created_at.isoformat()
                    if sale.created_at
                    else None
                ),

                "updated_at": (
                    sale.updated_at.isoformat()
                    if sale.updated_at
                    else None
                ),
            }
        )

    stats = {
        "total": len(items),
        "documentation_pending": sum(
            1
            for item in items
            if (
                item["finance_status"]
                == "documentation_pending"
            )
        ),
        "authorization_pending": sum(
            1
            for item in items
            if (
                item["finance_status"]
                == "authorization_pending"
            )
        ),
        "awaiting_payment": sum(
            1
            for item in items
            if (
                item["finance_status"]
                == "awaiting_payment"
            )
        ),
        "approved": sum(
            1
            for item in items
            if (
                item["finance_status"]
                == "approved"
            )
        ),
        "cancelled": sum(
            1
            for item in items
            if (
                item["finance_status"]
                == "cancelled"
            )
        ),
        "refunded": sum(
            1
            for item in items
            if (
                item["finance_status"]
                == "refunded"
            )
        ),
    }

    return {
        "success": True,
        "stats": stats,
        "sales": items,
    }



# ============================================================
# CARD_SALE_ADMIN_DOCUMENT_ACCESS_V1
# Acesso privado à documentação pelo Financeiro
# ============================================================

async def _get_admin_card_sale(
    *,
    sale_id: int,
    db: AsyncSession,
) -> CardSale:

    result = await db.execute(
        select(CardSale).where(
            CardSale.id == sale_id
        )
    )

    sale = (
        result.scalar_one_or_none()
    )

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Venda não encontrada.",
        )

    return sale


def _document_download_name(
    *,
    document_type: str,
    mime_type: str,
) -> str:

    extension_by_mime = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }

    extension = (
        extension_by_mime.get(
            mime_type,
            "bin",
        )
    )

    safe_name = {
        "document_front":
            "documento-frente",
        "document_back":
            "documento-verso",
        "selfie":
            "selfie",
    }.get(
        document_type,
        "documento",
    )

    return (
        f"{safe_name}.{extension}"
    )


@router.get(
    "/admin/{sale_id}/"
    "documents/{document_type}"
)
async def admin_open_card_sale_document(
    sale_id: int,
    document_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
):

    await _get_admin_card_sale(
        sale_id=sale_id,
        db=db,
    )

    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Tipo de documento inválido."
            ),
        )

    result = await db.execute(
        select(
            CardSaleDocument
        ).where(
            CardSaleDocument.sale_id
            == sale_id,
            CardSaleDocument
            .document_type
            == document_type,
            CardSaleDocument
            .deleted_at
            .is_(None),
        )
    )

    document = (
        result.scalar_one_or_none()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail=(
                "Documento não encontrado."
            ),
        )

    try:
        content = (
            await CardSaleStorageService
            .download(
                document.storage_key
            )
        )

    except Exception as exc:

        print(
            "[CARD_SALE_DOCUMENT] "
            "Falha no download privado:",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Não foi possível acessar "
                "o documento no Storage."
            ),
        ) from exc

    filename = (
        _document_download_name(
            document_type=document_type,
            mime_type=document.mime_type,
        )
    )

    return Response(
        content=content,
        media_type=document.mime_type,
        headers={
            "Content-Disposition": (
                "inline; "
                f'filename="{filename}"'
            ),
            "Cache-Control": (
                "private, no-store, "
                "max-age=0"
            ),
        },
    )


@router.get(
    "/admin/{sale_id}/"
    "authorization/signature"
)
async def admin_open_card_sale_signature(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
):

    await _get_admin_card_sale(
        sale_id=sale_id,
        db=db,
    )

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.sale_id
            == sale_id
        )
    )

    authorization = (
        result.scalar_one_or_none()
    )

    if (
        not authorization
        or not authorization
        .signature_storage_key
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Assinatura não encontrada."
            ),
        )

    try:
        content = (
            await CardSaleStorageService
            .download(
                authorization
                .signature_storage_key
            )
        )

    except Exception as exc:

        print(
            "[CARD_SALE_SIGNATURE] "
            "Falha no download privado:",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Não foi possível acessar "
                "a assinatura no Storage."
            ),
        ) from exc

    return Response(
        content=content,
        media_type="image/png",
        headers={
            "Content-Disposition": (
                'inline; filename='
                '"assinatura.png"'
            ),
            "Cache-Control": (
                "private, no-store, "
                "max-age=0"
            ),
        },
    )


@router.get(
    "/admin/{sale_id}/"
    "authorization/term"
)
async def admin_open_card_sale_term(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
):

    await _get_admin_card_sale(
        sale_id=sale_id,
        db=db,
    )

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.sale_id
            == sale_id
        )
    )

    authorization = (
        result.scalar_one_or_none()
    )

    if (
        not authorization
        or not authorization.term_text
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Termo de autorização "
                "não encontrado."
            ),
        )

    return Response(
        content=(
            authorization.term_text
        ),
        media_type=(
            "text/plain; charset=utf-8"
        ),
        headers={
            "Content-Disposition": (
                'inline; filename='
                '"termo-autorizacao.txt"'
            ),
            "Cache-Control": (
                "private, no-store, "
                "max-age=0"
            ),
        },
    )



# ============================================================
# CARD_SALE_CANCEL_REFUND_V1
# Cancelamento e estorno administrativo
# ============================================================

async def _get_card_sale_payment_admin(
    *,
    sale: CardSale,
    db: AsyncSession,
) -> Optional[Payment]:

    if not sale.payment_id:
        return None

    result = await db.execute(
        select(Payment).where(
            Payment.id
            == sale.payment_id
        )
    )

    payment = (
        result.scalar_one_or_none()
    )

    if not payment:
        raise HTTPException(
            status_code=409,
            detail=(
                "A venda possui payment_id, "
                "mas a cobrança vinculada "
                "não foi encontrada."
            ),
        )

    return payment


async def _get_card_sale_authorization_admin(
    *,
    sale_id: int,
    db: AsyncSession,
) -> Optional[
    CardSaleAuthorization
]:

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.sale_id
            == sale_id
        )
    )

    return (
        result.scalar_one_or_none()
    )


@router.post(
    "/admin/{sale_id}/cancel"
)
async def admin_cancel_card_sale(
    sale_id: int,
    data: CardSaleCancelRequest,
    db: AsyncSession = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_admin_user
    ),
) -> Dict[str, Any]:

    sale = await _get_admin_card_sale(
        sale_id=sale_id,
        db=db,
    )

    payment = (
        await _get_card_sale_payment_admin(
            sale=sale,
            db=db,
        )
    )

    if (
        payment
        and payment.status
        == "approved"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Pagamento aprovado não pode "
                "ser cancelado. Utilize "
                "o estorno."
            ),
        )

    if (
        payment
        and payment.status
        == "refunded"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta venda já foi "
                "estornada."
            ),
        )

    old_status = sale.status

    now = datetime.now(
        timezone.utc
    )

    remote_cancelled = False

    if (
        payment
        and payment.status
        != "cancelled"
    ):

        if not payment.preference_id:
            raise HTTPException(
                status_code=409,
                detail=(
                    "A cobrança não possui "
                    "Preference ID. "
                    "Cancelamento remoto "
                    "não executado."
                ),
            )

        await (
            MercadoPagoService
            .cancel_preference(
                payment.preference_id
            )
        )

        remote_cancelled = True

        payment.status = "cancelled"
        payment.status_detail = (
            "cancelled"
        )
        payment.updated_at = now

        if data.reason:
            payment.internal_note = (
                f"{payment.internal_note or ''}\n"
                f"Cancelamento CardSale: "
                f"{data.reason}"
            ).strip()

    authorization = (
        await
        _get_card_sale_authorization_admin(
            sale_id=sale.id,
            db=db,
        )
    )

    authorization_revoked = False

    if (
        authorization
        and authorization.status
        == "pending"
    ):
        authorization.status = (
            "revoked"
        )

        authorization_revoked = True

    sale.status = "cancelled"
    sale.updated_at = now

    db.add(
        CardSaleAudit(
            sale_id=sale.id,
            actor_user_id=(
                current_user.id
            ),
            event="sale_cancelled",
            old_status=old_status,
            new_status=sale.status,
            metadata_json={
                "reason": data.reason,
                "payment_id": (
                    payment.id
                    if payment
                    else None
                ),
                "preference_id": (
                    payment.preference_id
                    if payment
                    else None
                ),
                "remote_cancelled":
                    remote_cancelled,
                "authorization_revoked":
                    authorization_revoked,
            },
        )
    )

    await db.commit()
    await db.refresh(sale)

    if payment:
        await db.refresh(payment)

    return {
        "success": True,
        "sale_id": sale.id,
        "sale_status": sale.status,
        "payment": (
            {
                "id": payment.id,
                "status": (
                    payment.status
                ),
            }
            if payment
            else None
        ),
        "authorization_revoked":
            authorization_revoked,
    }


@router.post(
    "/admin/{sale_id}/refund"
)
async def admin_refund_card_sale(
    sale_id: int,
    data: CardSaleRefundRequest,
    db: AsyncSession = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_admin_user
    ),
) -> Dict[str, Any]:

    if not (
        auth_service.verify_password(
            data.password,
            current_user.password_hash,
        )
    ):
        # CARD_SALE_REFUND_PASSWORD_STATUS_V1
        # A sessão está válida. Apenas a
        # confirmação da senha falhou.
        #
        # Não usar 401 aqui porque o frontend
        # interpreta 401 como sessão expirada
        # e remove o token do administrador.
        raise HTTPException(
            status_code=400,
            detail=(
                "Senha do administrador "
                "incorreta."
            ),
        )

    sale = await _get_admin_card_sale(
        sale_id=sale_id,
        db=db,
    )

    payment = (
        await _get_card_sale_payment_admin(
            sale=sale,
            db=db,
        )
    )

    if not payment:
        raise HTTPException(
            status_code=409,
            detail=(
                "A venda ainda não possui "
                "pagamento para estornar."
            ),
        )

    if payment.status == "refunded":

        if sale.status != "refunded":
            old_status = sale.status

            sale.status = "refunded"
            sale.updated_at = (
                datetime.now(
                    timezone.utc
                )
            )

            db.add(
                CardSaleAudit(
                    sale_id=sale.id,
                    actor_user_id=(
                        current_user.id
                    ),
                    event=(
                        "sale_refund_synced"
                    ),
                    old_status=old_status,
                    new_status=(
                        sale.status
                    ),
                    metadata_json={
                        "payment_id":
                            payment.id,
                    },
                )
            )

            await db.commit()

        return {
            "success": True,
            "already_refunded": True,
            "sale_id": sale.id,
            "sale_status": "refunded",
            "payment_id": payment.id,
            "payment_status": (
                payment.status
            ),
        }

    if payment.status != "approved":
        raise HTTPException(
            status_code=409,
            detail=(
                "Somente pagamentos "
                "aprovados podem ser "
                "estornados."
            ),
        )

    mercado_pago_payment_id = str(
        payment
        .mercado_pago_payment_id
        or ""
    ).strip()

    if not mercado_pago_payment_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "Payment ID do Mercado Pago "
                "não encontrado para "
                "esta cobrança."
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
        == "orders"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta cobrança utiliza "
                "Orders API. Utilize a "
                "rotina de estorno "
                "de Orders."
            ),
        )

    idempotency_key = str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            (
                "portabilidadepro:"
                f"card-sale:{sale.id}:"
                f"payment:{payment.id}:"
                "full-refund"
            ),
        )
    )

    refund = await (
        MercadoPagoService
        .refund_payment(
            mercado_pago_payment_id,
            idempotency_key=(
                idempotency_key
            ),
        )
    )

    now = datetime.now(
        timezone.utc
    )

    refund_record = {
        "refund_id": (
            refund.get("id")
        ),
        "payment_id": (
            refund.get(
                "payment_id"
            )
            or mercado_pago_payment_id
        ),
        "amount": (
            refund.get("amount")
            or float(
                payment.amount
                or 0
            )
        ),
        "status": (
            refund.get("status")
        ),
        "date_created": (
            refund.get(
                "date_created"
            )
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
        "idempotency_key": (
            idempotency_key
        ),
    }

    previous_history = (
        mp_payload.get(
            "refund_history"
        )
        if isinstance(
            mp_payload.get(
                "refund_history"
            ),
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
        "last_refund":
            refund_record,
        "payment_refund_response":
            refund,
    }

    payment.status = "refunded"
    payment.status_detail = (
        "refunded"
    )
    payment.updated_at = now

    if data.reason:
        payment.internal_note = (
            f"{payment.internal_note or ''}\n"
            f"Estorno CardSale: "
            f"{data.reason}"
        ).strip()

    old_status = sale.status

    sale.status = "refunded"
    sale.updated_at = now

    db.add(
        CardSaleAudit(
            sale_id=sale.id,
            actor_user_id=(
                current_user.id
            ),
            event="sale_refunded",
            old_status=old_status,
            new_status=sale.status,
            metadata_json={
                "payment_id":
                    payment.id,
                "mercado_pago_payment_id":
                    mercado_pago_payment_id,
                "refund_id":
                    refund.get("id"),
                "amount":
                    refund_record[
                        "amount"
                    ],
                "reason":
                    data.reason,
                "idempotency_key":
                    idempotency_key,
            },
        )
    )

    await db.commit()

    await db.refresh(payment)
    await db.refresh(sale)

    return {
        "success": True,
        "sale_id": sale.id,
        "sale_status": sale.status,
        "payment_id": payment.id,
        "payment_status": (
            payment.status
        ),
        "refund": refund_record,
    }


@router.get("/{sale_id}")
async def get_card_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    sale = await _get_sale(
        sale_id=sale_id,
        db=db,
        current_user=current_user,
    )

    documents_result = await db.execute(
        select(CardSaleDocument).where(
            CardSaleDocument.sale_id
            == sale.id,
            CardSaleDocument.deleted_at
            .is_(None),
        ).order_by(
            CardSaleDocument.id.asc()
        )
    )

    documents = (
        documents_result
        .scalars()
        .all()
    )

    types = {
        document.document_type
        for document in documents
    }

    return {
        "success": True,
        "sale": _serialize_sale(
            sale,
            types,
        ),
        "documents": [
            {
                "id": document.id,
                "document_type": (
                    document.document_type
                ),
                "original_filename": (
                    document.original_filename
                ),
                "mime_type": (
                    document.mime_type
                ),
                "file_size": (
                    document.file_size
                ),
                "sha256": (
                    document.sha256
                ),
                "uploaded_at": (
                    document.uploaded_at
                    .isoformat()
                    if document.uploaded_at
                    else None
                ),
            }
            for document in documents
        ],
    }


@router.post(
    "/{sale_id}/documents/{document_type}"
)
async def upload_card_sale_document(
    sale_id: int,
    document_type: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Tipo de documento inválido."
            ),
        )

    sale = await _get_sale(
        sale_id=sale_id,
        db=db,
        current_user=current_user,
    )

    if sale.status not in (
        "documentation_pending",
        "documentation_complete",
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Os documentos estão bloqueados "
                "durante ou após a autorização. "
                "Revogue a autorização antes "
                "de substituir documentos."
            ),
        )

    content = await file.read(
        MAX_FILE_SIZE + 1
    )

    await file.close()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Arquivo vazio.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "O arquivo deve possuir "
                "no máximo 5 MB."
            ),
        )

    detected_mime, extension = (
        _detect_image_type(
            content
        )
    )

    sha256 = hashlib.sha256(
        content
    ).hexdigest()

    storage_key = (
        f"sales/{sale.id}/"
        f"{document_type}/"
        f"{uuid.uuid4().hex}."
        f"{extension}"
    )

    try:
        await CardSaleStorageService.upload(
            storage_key=storage_key,
            content=content,
            mime_type=detected_mime,
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail=(
                "Não foi possível armazenar "
                "o documento no Storage."
            ),
        )

    old_document = None

    try:
        old_result = await db.execute(
            select(
                CardSaleDocument
            ).where(
                CardSaleDocument.sale_id
                == sale.id,
                CardSaleDocument
                .document_type
                == document_type,
                CardSaleDocument.deleted_at
                .is_(None),
            )
        )

        old_document = (
            old_result
            .scalar_one_or_none()
        )

        now = datetime.now(
            timezone.utc
        )

        if old_document:
            old_document.deleted_at = now

            # Garante que o índice único
            # parcial libere o tipo antes
            # de inserir a nova versão.
            await db.flush()

        document = CardSaleDocument(
            sale_id=sale.id,
            document_type=document_type,
            storage_key=storage_key,
            original_filename=(
                file.filename
                if file.filename
                else None
            ),
            mime_type=detected_mime,
            file_size=len(content),
            sha256=sha256,
            uploaded_by_user_id=(
                current_user.id
            ),
        )

        db.add(document)

        await db.flush()

        progress_result = await db.execute(
            select(
                CardSaleDocument
                .document_type
            ).where(
                CardSaleDocument.sale_id
                == sale.id,
                CardSaleDocument.deleted_at
                .is_(None),
            )
        )

        received_types = set(
            progress_result.scalars().all()
        )

        old_status = sale.status

        if DOCUMENT_TYPES.issubset(
            received_types
        ):
            sale.status = (
                "documentation_complete"
            )

            if (
                sale.documentation_completed_at
                is None
            ):
                sale.documentation_completed_at = (
                    now
                )

        else:
            sale.status = (
                "documentation_pending"
            )

        sale.updated_at = now

        db.add(
            CardSaleAudit(
                sale_id=sale.id,
                actor_user_id=current_user.id,
                event=(
                    "document_replaced"
                    if old_document
                    else "document_uploaded"
                ),
                old_status=old_status,
                new_status=sale.status,
                metadata_json={
                    "document_type": (
                        document_type
                    ),
                    "document_id": (
                        document.id
                    ),
                    "mime_type": (
                        detected_mime
                    ),
                    "file_size": (
                        len(content)
                    ),
                    "sha256": sha256,
                },
            )
        )

        await db.commit()

        await db.refresh(document)
        await db.refresh(sale)

    except Exception:
        await db.rollback()

        try:
            await (
                CardSaleStorageService
                .remove(
                    storage_key
                )
            )
        except Exception:
            pass

        raise

    # Depois do commit é seguro apagar
    # a versão antiga do Storage.
    if old_document:
        try:
            await (
                CardSaleStorageService
                .remove(
                    old_document.storage_key
                )
            )
        except Exception:
            # Não falha a venda se a limpeza
            # física antiga der problema.
            pass

    return {
        "success": True,
        "document": {
            "id": document.id,
            "document_type": (
                document.document_type
            ),
            "mime_type": (
                document.mime_type
            ),
            "file_size": (
                document.file_size
            ),
            "sha256": document.sha256,
        },
        "sale": _serialize_sale(
            sale,
            received_types,
        ),
    }
