from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import auth_service
from app.models import sqlalchemy_models
from app.schemas import simulacao_schema as schemas
from sqlalchemy.future import select

router = APIRouter()

@router.post("/login")
async def login(req: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(sqlalchemy_models.User).where(sqlalchemy_models.User.email == req.email))
    user = result.scalar_one_or_none()
    
    if not user or not auth_service.verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou senha incorretos")
    
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sua conta está inativa. Entre em contato com o administrador.")
    
    token = auth_service.create_access_token(subject=user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "company_id": user.company_id,
            "brand_color": user.brand_color,
            "sidebar_color": user.sidebar_color,
            "sidebar_color_secondary": user.sidebar_color_secondary,
            "logo_url": user.logo_url,
            "avatar_url": user.avatar_url,
            "seller_limit": user.seller_limit,
            "is_temporary_password": user.is_temporary_password,
        }
    }
