from fastapi import APIRouter, Depends

from app.models.sqlalchemy_models import User
from app.routers.deps import get_credit_card_user


router = APIRouter()


@router.get("/access")
async def credit_card_access(
    current_user: User = Depends(
        get_credit_card_user
    ),
):
    """
    Endpoint utilizado pelo frontend para
    validar a permissão real no backend.
    """
    return {
        "success": True,
        "authorized": True,
        "user_id": current_user.id,
        "role": current_user.role,
    }
