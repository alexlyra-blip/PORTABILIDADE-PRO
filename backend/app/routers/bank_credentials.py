from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sqlalchemy_models import User
from app.routers.deps import get_current_user
from app.schemas.bank_credentials import (
    BankCredentialResponse,
    BankCredentialUpsertRequest,
)
from app.services.bank_credentials_service import BankCredentialsService


router = APIRouter()


@router.get(
    "",
    response_model=List[BankCredentialResponse],
)
async def list_my_bank_credentials(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = await BankCredentialsService.list_records(
        db,
        current_user.id,
    )

    return [
        BankCredentialsService.to_safe_dict(record)
        for record in records
    ]


@router.put(
    "/{provider}",
    response_model=BankCredentialResponse,
)
async def save_my_bank_credentials(
    provider: str,
    payload: BankCredentialUpsertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.provider.strip().upper() != provider.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider do corpo diferente do provider da rota.",
        )

    try:
        record = await BankCredentialsService.upsert_credentials(
            db,
            user_id=current_user.id,
            provider=provider,
            login=payload.login,
            password=payload.password,
            extra_credentials=payload.extra_credentials,
            is_active=payload.is_active,
        )

        await db.commit()
        await db.refresh(record)

        return BankCredentialsService.to_safe_dict(record)

    except ValueError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{provider}",
)
async def delete_my_bank_credentials(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        deleted = await BankCredentialsService.delete_credentials(
            db,
            user_id=current_user.id,
            provider=provider,
        )

        await db.commit()

        return {
            "success": True,
            "deleted": deleted,
            "provider": provider.strip().upper(),
        }

    except ValueError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc