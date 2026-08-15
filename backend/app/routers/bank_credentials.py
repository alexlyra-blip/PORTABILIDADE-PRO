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
from app.services.c6_bank_service import C6BankError, C6BankService


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



@router.post(
    "/{provider}/test",
)
async def test_my_bank_credentials(
    provider: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Testa a credencial bancaria salva do usuario.

    Nesta etapa o teste automatico esta habilitado
    para o C6 Bank.
    """

    try:
        normalized_provider = (
            BankCredentialsService
            .normalize_provider(provider)
        )

        if normalized_provider != "C6":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Teste de conexao automatico "
                    "disponivel nesta etapa apenas "
                    "para o C6 Bank."
                ),
            )

        credentials = await (
            BankCredentialsService
            .get_decrypted_credentials(
                db,
                user_id=current_user.id,
                provider="C6",
            )
        )

        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "Credenciais C6 nao configuradas "
                    "para este usuario."
                ),
            )

        extras = (
            credentials.get(
                "extra_credentials"
            )
            or {}
        )

        promoter_code = str(
            extras.get("promoter_code")
            or ""
        ).strip()

        if not promoter_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Codigo da Promotora C6 "
                    "nao configurado."
                ),
            )

        service = C6BankService(
            credentials
        )

        result = await service.testar_conexao()

        await (
            BankCredentialsService
            .set_test_result(
                db,
                user_id=current_user.id,
                provider="C6",
                status="connected",
            )
        )

        await db.commit()

        return {
            "success": True,
            "provider": "C6",
            "status": "connected",
            "message": (
                "Conexao com o C6 Bank "
                "validada com sucesso."
            ),
            "promoter_code_configured":
                result.get(
                    "promoter_code_configured",
                    False,
                ),
        }

    except HTTPException:
        raise

    except C6BankError as exc:
        try:
            await (
                BankCredentialsService
                .set_test_result(
                    db,
                    user_id=current_user.id,
                    provider="C6",
                    status="error",
                )
            )

            await db.commit()

        except Exception:
            await db.rollback()

        upstream_status = getattr(
            exc,
            "status_code",
            None,
        )

        # 401/403 normalmente indicam
        # credencial do usuario invalida.
        if upstream_status in (401, 403):
            http_status = (
                status.HTTP_400_BAD_REQUEST
            )
        else:
            http_status = (
                status.HTTP_502_BAD_GATEWAY
            )

        raise HTTPException(
            status_code=http_status,
            detail=str(exc),
        ) from exc

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