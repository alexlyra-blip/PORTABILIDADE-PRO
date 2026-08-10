import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sqlalchemy_models import (
    CardSale,
    CardSaleAudit,
    CardSaleDocument,
    User,
)
from app.routers.deps import (
    get_credit_card_user,
)
from app.schemas.card_sale_schema import (
    CreateCardSaleRequest,
)
from app.services.card_sale_storage_service import (
    CardSaleStorageService,
)


router = APIRouter()


MAX_FILE_SIZE = 5 * 1024 * 1024

DOCUMENT_TYPES = {
    "document_front",
    "document_back",
    "selfie",
}


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
        amount=data.amount,
        installments=data.installments,
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
                "amount": str(
                    data.amount
                ),
                "installments": (
                    data.installments
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
