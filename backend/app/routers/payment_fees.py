from typing import Any, Dict

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import BaseModel

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.database import get_db

from app.models.sqlalchemy_models import User

from app.routers.deps import get_admin_user

from app.services.payment_fee_config_service import (
    PaymentFeeConfigService,
)


router = APIRouter()


class FeeConfigUpdateRequest(BaseModel):
    fees: Dict[str, Any]


@router.get("/public")
async def public_fees(
    db: AsyncSession = Depends(get_db),
):
    return await (
        PaymentFeeConfigService
        .get_config(db)
    )


@router.get("/admin")
async def admin_fees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
):
    return await (
        PaymentFeeConfigService
        .get_config(db)
    )


@router.put("/admin")
async def update_fees(
    data: FeeConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        get_admin_user
    ),
):
    try:
        result = await (
            PaymentFeeConfigService
            .save_config(
                db=db,
                fees=data.fees,
                user_id=current_user.id,
            )
        )

        return {
            "success": True,
            **result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
