import base64
import binascii
import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sqlalchemy_models import (
    CardSale,
    CardSaleAudit,
    CardSaleAuthorization,
    Payment,
    User,
)
from app.routers.deps import get_credit_card_user
from app.schemas.card_sale_schema import (
    CompleteCardSaleAuthorizationRequest,
)
from app.schemas.payment_schema import (
    CreatePaymentLinkRequest,
)
from app.services.card_sale_storage_service import (
    CardSaleStorageService,
)
from app.services.mercado_pago_service import (
    MercadoPagoService,
)
from app.services.payment_persistence_service import (
    PaymentPersistenceService,
)


router = APIRouter()

AUTHORIZATION_TTL_HOURS = 72
SIGNATURE_MAX_SIZE = 1024 * 1024


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(
            tzinfo=timezone.utc
        )

    return value.astimezone(
        timezone.utc
    )


def _frontend_url() -> str:
    return (
        os.getenv(
            "FRONTEND_URL",
            "https://portabilidadepro.com.br",
        )
        .strip()
        .rstrip("/")
    )


def _authorization_url(
    token: str,
) -> str:
    return (
        f"{_frontend_url()}"
        f"/autorizar-venda/{token}"
    )


def _mask_cpf(cpf: str) -> str:
    digits = "".join(
        char
        for char in cpf or ""
        if char.isdigit()
    )

    if len(digits) != 11:
        return "***"

    return (
        f"***.{digits[3:6]}."
        f"{digits[6:9]}-**"
    )


def _mask_phone(
    phone: str,
) -> str:
    digits = "".join(
        char
        for char in phone or ""
        if char.isdigit()
    )

    if len(digits) < 4:
        return "****"

    return (
        "••••••"
        + digits[-4:]
    )


def _term_text(
    sale: CardSale,
) -> str:
    amount = float(
        sale.amount or 0
    )

    amount_text = (
        f"{amount:,.2f}"
        .replace(",", "X")
        .replace(".", ",")
        .replace("X", ".")
    )

    return (
        "TERMO DE AUTORIZAÇÃO DA OPERAÇÃO\n\n"

        f"Titular: {sale.customer_name}\n"
        f"CPF: {_mask_cpf(sale.customer_cpf)}\n\n"

        "Declaro que conferi os dados da "
        "operação apresentada e manifesto "
        "minha concordância com o seu "
        "prosseguimento nas condições "
        "informadas abaixo.\n\n"

        f"Descrição: {sale.description}\n"
        f"Valor: R$ {amount_text}\n"
        f"Parcelamento: {sale.installments}x\n\n"

        "Declaro que tive oportunidade de "
        "ler este termo antes da confirmação "
        "e que o aceite e a assinatura "
        "realizados nesta página correspondem "
        "à minha manifestação de vontade.\n\n"

        "O sistema registrará evidências "
        "técnicas do aceite, incluindo data, "
        "hora e identificação técnica da "
        "sessão, para composição do dossiê "
        "da operação."
    )


def _request_ip(
    request: Request,
) -> str | None:
    forwarded = request.headers.get(
        "x-forwarded-for"
    )

    if forwarded:
        return (
            forwarded
            .split(",")[0]
            .strip()[:64]
        )

    if request.client:
        return (
            request.client.host[:64]
        )

    return None


def _decode_signature(
    data_url: str,
) -> bytes:
    prefix = (
        "data:image/png;base64,"
    )

    if not data_url.startswith(
        prefix
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Assinatura inválida. "
                "O formato deve ser PNG."
            ),
        )

    encoded = data_url[
        len(prefix):
    ]

    try:
        content = base64.b64decode(
            encoded,
            validate=True,
        )

    except (
        ValueError,
        binascii.Error,
    ) as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Não foi possível interpretar "
                "a assinatura."
            ),
        ) from exc

    if not content:
        raise HTTPException(
            status_code=400,
            detail=(
                "A assinatura está vazia."
            ),
        )

    if (
        len(content)
        > SIGNATURE_MAX_SIZE
    ):
        raise HTTPException(
            status_code=413,
            detail=(
                "A assinatura excede "
                "1 MB."
            ),
        )

    if not content.startswith(
        b"\x89PNG\r\n\x1a\n"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Arquivo de assinatura "
                "inválido."
            ),
        )

    return content


async def _get_authorization_by_token(
    *,
    token: str,
    db: AsyncSession,
) -> CardSaleAuthorization:

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.token
            == token
        )
    )

    authorization = (
        result.scalar_one_or_none()
    )

    if not authorization:
        raise HTTPException(
            status_code=404,
            detail=(
                "Autorização não encontrada."
            ),
        )

    if (
        authorization.status
        not in (
            "authorized",
            "revoked",
        )
        and _aware(
            authorization.expires_at
        )
        <= _now()
    ):
        authorization.status = (
            "expired"
        )

        await db.commit()

    if authorization.status == "expired":
        raise HTTPException(
            status_code=410,
            detail=(
                "Este link de autorização "
                "expirou."
            ),
        )

    if authorization.status == "revoked":
        raise HTTPException(
            status_code=410,
            detail=(
                "Este link não é mais válido."
            ),
        )

    return authorization


async def _get_sale(
    *,
    sale_id: int,
    db: AsyncSession,
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
            detail=(
                "Venda não encontrada."
            ),
        )

    return sale


async def _get_owned_sale(
    *,
    sale_id: int,
    db: AsyncSession,
    current_user: User,
) -> CardSale:

    sale = await _get_sale(
        sale_id=sale_id,
        db=db,
    )

    if (
        current_user.role != "admin"
        and sale.created_by_user_id
        != current_user.id
    ):
        raise HTTPException(
            status_code=404,
            detail=(
                "Venda não encontrada."
            ),
        )

    return sale


async def _get_payment(
    *,
    sale: CardSale,
    db: AsyncSession,
):
    if not sale.payment_id:
        return None

    result = await db.execute(
        select(Payment).where(
            Payment.id
            == sale.payment_id
        )
    )

    return result.scalar_one_or_none()


def _money_decimal(
    value,
) -> Decimal:
    try:
        return Decimal(
            str(value)
        ).quantize(
            Decimal("0.01")
        )
    except Exception as exc:
        raise HTTPException(
            status_code=409,
            detail=(
                "Venda com valor financeiro "
                "inválido."
            ),
        ) from exc


def _validate_financial_snapshot(
    sale: CardSale,
) -> Decimal:

    if sale.reference_amount is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Venda sem valor de referência."
            ),
        )

    if sale.customer_total is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Venda sem valor final "
                "calculado."
            ),
        )

    if sale.installment_value is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Venda sem valor de parcela "
                "calculado."
            ),
        )

    reference_amount = _money_decimal(
        sale.reference_amount
    )

    customer_total = _money_decimal(
        sale.customer_total
    )

    installment_value = _money_decimal(
        sale.installment_value
    )

    amount = _money_decimal(
        sale.amount
    )

    if reference_amount <= 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "Valor de referência inválido."
            ),
        )

    if customer_total <= 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "Valor final da venda inválido."
            ),
        )

    if installment_value <= 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "Valor da parcela inválido."
            ),
        )

    if amount != customer_total:
        raise HTTPException(
            status_code=409,
            detail=(
                "Valor da venda divergente do "
                "snapshot financeiro."
            ),
        )

    if sale.payment_channel != "checkout":
        raise HTTPException(
            status_code=409,
            detail=(
                "Canal financeiro da venda "
                "inválido."
            ),
        )

    if sale.installment_mode != "seller":
        raise HTTPException(
            status_code=409,
            detail=(
                "Modalidade de parcelamento "
                "inválida."
            ),
        )

    if sale.simulation_type not in {
        "receive",
        "charge",
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "Tipo de simulação inválido."
            ),
        )

    if sale.commission_table not in {
        1,
        2,
        3,
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "Tabela de comissão inválida."
            ),
        )

    if (
        sale.installments is None
        or sale.installments < 1
        or sale.installments > 12
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Quantidade de parcelas "
                "inválida."
            ),
        )

    snapshot = (
        sale.pricing_snapshot
        if isinstance(
            sale.pricing_snapshot,
            dict,
        )
        else {}
    )

    if not snapshot:
        raise HTTPException(
            status_code=409,
            detail=(
                "Venda sem snapshot "
                "financeiro."
            ),
        )

    snapshot_total = snapshot.get(
        "customer_total"
    )

    snapshot_installment = snapshot.get(
        "installment_value"
    )

    snapshot_reference = snapshot.get(
        "reference_amount"
    )

    if snapshot_total is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Snapshot sem valor final."
            ),
        )

    if snapshot_installment is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Snapshot sem valor de parcela."
            ),
        )

    if snapshot_reference is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Snapshot sem valor de "
                "referência."
            ),
        )

    if (
        _money_decimal(snapshot_total)
        != customer_total
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Snapshot financeiro divergente "
                "do valor final da venda."
            ),
        )

    if (
        _money_decimal(
            snapshot_installment
        )
        != installment_value
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Snapshot financeiro divergente "
                "do valor da parcela."
            ),
        )

    if (
        _money_decimal(snapshot_reference)
        != reference_amount
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Snapshot financeiro divergente "
                "do valor de referência."
            ),
        )

    return customer_total


async def _ensure_payment(
    *,
    sale: CardSale,
    authorization: CardSaleAuthorization,
    db: AsyncSession,
):
    if sale.payment_id:
        return await _get_payment(
            sale=sale,
            db=db,
        )

    locked_customer_total = (
        _validate_financial_snapshot(
            sale
        )
    )

    if (
        authorization.status
        != "authorized"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "O cliente ainda não "
                "autorizou esta venda."
            ),
        )

    if sale.installments > 12:
        raise HTTPException(
            status_code=409,
            detail=(
                "O pagamento atual suporta "
                "até 12 parcelas."
            ),
        )

    marker = (
        f"CARD_SALE:{sale.id}:"
        f"AUTH:{authorization.id}"
    )

    existing_result = await db.execute(
        select(Payment).where(
            Payment.internal_note
            == marker
        )
    )

    existing = (
        existing_result
        .scalar_one_or_none()
    )

    if existing:
        sale.payment_id = existing.id
        sale.status = "payment_created"
        sale.updated_at = _now()

        await db.commit()

        return existing

    payment_data = (
        CreatePaymentLinkRequest(
            customer_name=(
                sale.customer_name
            ),
            customer_email=(
                sale.customer_email
            ),
            customer_document=(
                sale.customer_cpf
            ),
            customer_phone=(
                sale.customer_phone
            ),
            description=(
                sale.description
            ),
            amount=locked_customer_total,
            package_name=(
                "Venda Cartão de Crédito"
            ),
            consultation_quantity=None,
            expiration_days=7,
            internal_note=marker,
            max_installments=(
                sale.installments
            ),
            default_installments=(
                sale.installments
            ),
            installment_mode=(
                sale.installment_mode
            ),
        )
    )

    mercado_pago_result = (
        await MercadoPagoService
        .create_payment_link(
            data=payment_data,
            created_by_user_id=(
                sale.created_by_user_id
            ),
        )
    )

    payment = (
        await PaymentPersistenceService
        .save_created_payment(
            db=db,
            data=payment_data,
            created_by_user_id=(
                sale.created_by_user_id
            ),
            mercado_pago_result=(
                mercado_pago_result
            ),
        )
    )

    old_status = sale.status

    sale.payment_id = payment.id
    sale.status = "payment_created"
    sale.updated_at = _now()

    db.add(
        CardSaleAudit(
            sale_id=sale.id,
            actor_user_id=None,
            event="payment_link_created",
            old_status=old_status,
            new_status=sale.status,
            metadata_json={
                "payment_id": (
                    payment.id
                ),
                "preference_id": (
                    payment.preference_id
                ),
            },
        )
    )

    await db.commit()
    await db.refresh(sale)

    return payment


# =====================================================
# PÚBLICO — CLIENTE
# =====================================================


@router.get(
    "/public/authorization/{token}"
)
async def get_public_authorization(
    token: str,
    db: AsyncSession = Depends(
        get_db
    ),
) -> Dict[str, Any]:

    authorization = (
        await _get_authorization_by_token(
            token=token,
            db=db,
        )
    )

    sale = await _get_sale(
        sale_id=(
            authorization.sale_id
        ),
        db=db,
    )

    payment = await _get_payment(
        sale=sale,
        db=db,
    )

    return {
        "success": True,
        "authorization": {
            "status": (
                authorization.status
            ),
            "expires_at": (
                authorization.expires_at
                .isoformat()
            ),
            "authorized_at": (
                authorization
                .authorized_at
                .isoformat()
                if authorization
                .authorized_at
                else None
            ),
        },
        "sale": {
            "customer_name": (
                sale.customer_name
            ),
            "customer_cpf": (
                _mask_cpf(
                    sale.customer_cpf
                )
            ),
            "customer_phone": (
                _mask_phone(
                    sale.customer_phone
                )
            ),
            "description": (
                sale.description
            ),
            "amount": float(
                sale.amount or 0
            ),
            "installments": (
                sale.installments
            ),
        },
        "term": {
            "version": (
                authorization.term_version
            ),
            "text": (
                authorization.term_text
            ),
            "sha256": (
                authorization.term_sha256
            ),
        },
        "payment": (
            {
                "created": True,
                "status": payment.status,
                "checkout_url": (
                    payment.checkout_url
                ),
            }
            if payment
            else {
                "created": False,
                "status": None,
                "checkout_url": None,
            }
        ),
    }


@router.post(
    "/public/authorization/"
    "{token}/complete"
)
async def complete_public_authorization(
    token: str,
    data: CompleteCardSaleAuthorizationRequest,
    request: Request,
    db: AsyncSession = Depends(
        get_db
    ),
) -> Dict[str, Any]:

    authorization = (
        await _get_authorization_by_token(
            token=token,
            db=db,
        )
    )

    sale = await _get_sale(
        sale_id=(
            authorization.sale_id
        ),
        db=db,
    )

    if (
        authorization.status
        == "authorized"
    ):
        payment = await _get_payment(
            sale=sale,
            db=db,
        )

        return {
            "success": True,
            "authorized": True,
            "payment_created": (
                payment is not None
            ),
            "payment_url": (
                payment.checkout_url
                if payment
                else None
            ),
        }

    if not data.accepted:
        raise HTTPException(
            status_code=400,
            detail=(
                "É necessário aceitar "
                "o termo."
            ),
        )

    signature = _decode_signature(
        data.signature_data_url
    )

    signature_sha256 = (
        hashlib.sha256(
            signature
        ).hexdigest()
    )

    storage_key = (
        f"sales/{sale.id}/"
        f"authorization/"
        f"signature-"
        f"{uuid.uuid4().hex}.png"
    )

    try:
        await CardSaleStorageService.upload(
            storage_key=storage_key,
            content=signature,
            mime_type="image/png",
        )

    except Exception as exc:
        print(
            "[CARD_SALE_AUTH] "
            "Falha ao armazenar assinatura:",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Não foi possível armazenar "
                "a assinatura."
            ),
        ) from exc

    now = _now()
    old_status = sale.status

    authorization.accepted_at = now
    authorization.accepted_ip = (
        _request_ip(request)
    )
    authorization.accepted_user_agent = (
        request.headers.get(
            "user-agent",
            "",
        )[:2000]
    )
    authorization.signer_name = (
        data.signer_name
    )
    authorization.signature_storage_key = (
        storage_key
    )
    authorization.signature_sha256 = (
        signature_sha256
    )
    authorization.authorized_at = now
    authorization.status = "authorized"

    sale.status = "authorized"
    sale.updated_at = now

    db.add(
        CardSaleAudit(
            sale_id=sale.id,
            actor_user_id=None,
            event=(
                "authorization_completed"
            ),
            old_status=old_status,
            new_status=sale.status,
            metadata_json={
                "authorization_id": (
                    authorization.id
                ),
                "term_version": (
                    authorization.term_version
                ),
                "term_sha256": (
                    authorization.term_sha256
                ),
                "signature_sha256": (
                    signature_sha256
                ),
            },
        )
    )

    try:
        await db.commit()

    except Exception:
        await db.rollback()

        try:
            await (
                CardSaleStorageService
                .remove(storage_key)
            )
        except Exception:
            pass

        raise

    payment = None
    payment_error = None

    try:
        payment = await _ensure_payment(
            sale=sale,
            authorization=authorization,
            db=db,
        )

    except Exception as exc:
        await db.rollback()

        payment_error = (
            type(exc).__name__
        )

        print(
            "[CARD_SALE_PAYMENT] "
            f"Venda {sale.id}: "
            f"{payment_error}"
        )

    return {
        "success": True,
        "authorized": True,
        "payment_created": (
            payment is not None
        ),
        "payment_pending_creation": (
            payment is None
        ),
        "payment_url": (
            payment.checkout_url
            if payment
            else None
        ),
    }


# =====================================================
# INTERNO — VENDEDOR / ADMIN
# =====================================================


@router.get(
    "/{sale_id}/authorization"
)
async def get_sale_authorization(
    sale_id: int,
    db: AsyncSession = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    sale = await _get_owned_sale(
        sale_id=sale_id,
        db=db,
        current_user=current_user,
    )

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.sale_id
            == sale.id
        )
    )

    authorization = (
        result.scalar_one_or_none()
    )

    payment = await _get_payment(
        sale=sale,
        db=db,
    )

    return {
        "success": True,
        "authorization": (
            {
                "id": authorization.id,
                "status": (
                    authorization.status
                ),
                "url": (
                    _authorization_url(
                        authorization.token
                    )
                ),
                "expires_at": (
                    authorization
                    .expires_at
                    .isoformat()
                ),
                "authorized_at": (
                    authorization
                    .authorized_at
                    .isoformat()
                    if authorization
                    .authorized_at
                    else None
                ),
            }
            if authorization
            else None
        ),
        "payment": (
            {
                "id": payment.id,
                "status": payment.status,
                "checkout_url": (
                    payment.checkout_url
                ),
            }
            if payment
            else None
        ),
    }


@router.post(
    "/{sale_id}/authorization"
)
async def create_sale_authorization(
    sale_id: int,
    db: AsyncSession = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    sale = await _get_owned_sale(
        sale_id=sale_id,
        db=db,
        current_user=current_user,
    )

    if sale.payment_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta venda já possui "
                "pagamento vinculado."
            ),
        )

    if sale.status not in (
        "documentation_complete",
        "authorization_pending",
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Conclua primeiro os três "
                "documentos da venda."
            ),
        )

    if sale.installments > 12:
        raise HTTPException(
            status_code=409,
            detail=(
                "O pagamento atual suporta "
                "até 12 parcelas."
            ),
        )

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.sale_id
            == sale.id
        )
    )

    authorization = (
        result.scalar_one_or_none()
    )

    if (
        authorization
        and authorization.status
        == "authorized"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta autorização já "
                "foi concluída."
            ),
        )

    token = secrets.token_urlsafe(48)

    term = _term_text(sale)

    term_sha256 = (
        hashlib.sha256(
            term.encode("utf-8")
        ).hexdigest()
    )

    expires_at = (
        _now()
        + timedelta(
            hours=(
                AUTHORIZATION_TTL_HOURS
            )
        )
    )

    if authorization:
        authorization.token = token
        authorization.status = "pending"
        authorization.term_version = "v1"
        authorization.term_text = term
        authorization.term_sha256 = (
            term_sha256
        )
        authorization.expires_at = (
            expires_at
        )

        authorization.accepted_at = None
        authorization.accepted_ip = None
        authorization.accepted_user_agent = (
            None
        )
        authorization.signer_name = None
        authorization.signature_storage_key = (
            None
        )
        authorization.signature_sha256 = (
            None
        )
        authorization.authorized_at = None

    else:
        authorization = (
            CardSaleAuthorization(
                sale_id=sale.id,
                token=token,
                status="pending",
                term_version="v1",
                term_text=term,
                term_sha256=(
                    term_sha256
                ),
                expires_at=(
                    expires_at
                ),
            )
        )

        db.add(authorization)

    old_status = sale.status

    sale.status = (
        "authorization_pending"
    )
    sale.updated_at = _now()

    await db.flush()

    db.add(
        CardSaleAudit(
            sale_id=sale.id,
            actor_user_id=(
                current_user.id
            ),
            event=(
                "authorization_link_created"
            ),
            old_status=old_status,
            new_status=sale.status,
            metadata_json={
                "authorization_id": (
                    authorization.id
                ),
                "expires_at": (
                    expires_at.isoformat()
                ),
                "term_sha256": (
                    term_sha256
                ),
            },
        )
    )

    await db.commit()

    await db.refresh(
        authorization
    )

    return {
        "success": True,
        "authorization": {
            "id": authorization.id,
            "status": (
                authorization.status
            ),
            "url": (
                _authorization_url(
                    authorization.token
                )
            ),
            "expires_at": (
                authorization
                .expires_at
                .isoformat()
            ),
        },
    }


@router.post(
    "/{sale_id}/authorization/revoke"
)
async def revoke_sale_authorization(
    sale_id: int,
    db: AsyncSession = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    sale = await _get_owned_sale(
        sale_id=sale_id,
        db=db,
        current_user=current_user,
    )

    if sale.payment_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "A venda já possui "
                "pagamento vinculado."
            ),
        )

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.sale_id
            == sale.id
        )
    )

    authorization = (
        result.scalar_one_or_none()
    )

    if not authorization:
        raise HTTPException(
            status_code=404,
            detail=(
                "Autorização não encontrada."
            ),
        )

    if (
        authorization.status
        == "authorized"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Uma autorização concluída "
                "não pode ser revogada "
                "pelo vendedor."
            ),
        )

    old_status = sale.status

    authorization.status = "revoked"

    sale.status = (
        "documentation_complete"
    )
    sale.updated_at = _now()

    db.add(
        CardSaleAudit(
            sale_id=sale.id,
            actor_user_id=(
                current_user.id
            ),
            event=(
                "authorization_revoked"
            ),
            old_status=old_status,
            new_status=sale.status,
            metadata_json={
                "authorization_id": (
                    authorization.id
                ),
            },
        )
    )

    await db.commit()

    return {
        "success": True,
        "revoked": True,
    }


@router.post(
    "/{sale_id}/payment"
)
async def create_or_retry_sale_payment(
    sale_id: int,
    db: AsyncSession = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_credit_card_user
    ),
) -> Dict[str, Any]:

    sale = await _get_owned_sale(
        sale_id=sale_id,
        db=db,
        current_user=current_user,
    )

    result = await db.execute(
        select(
            CardSaleAuthorization
        ).where(
            CardSaleAuthorization.sale_id
            == sale.id
        )
    )

    authorization = (
        result.scalar_one_or_none()
    )

    if (
        not authorization
        or authorization.status
        != "authorized"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "A autorização do cliente "
                "ainda não foi concluída."
            ),
        )

    payment = await _ensure_payment(
        sale=sale,
        authorization=authorization,
        db=db,
    )

    if not payment:
        raise HTTPException(
            status_code=502,
            detail=(
                "Não foi possível criar "
                "o pagamento."
            ),
        )

    return {
        "success": True,
        "payment": {
            "id": payment.id,
            "status": payment.status,
            "checkout_url": (
                payment.checkout_url
            ),
        },
    }
