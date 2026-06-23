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
    
    from datetime import datetime, timezone
    user.last_access = datetime.now(timezone.utc)
    user.current_token = token
    await db.commit()
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
            "highlight_color": user.highlight_color,
            "logo_url": user.logo_url,
            "avatar_url": user.avatar_url,
            "seller_limit": user.seller_limit,
            "is_temporary_password": user.is_temporary_password,
        }
    }

@router.get("/branding")
async def get_branding(email: str, db: AsyncSession = Depends(get_db)):
    from app.models.sqlalchemy_models import User
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        return {
            "name": "Portabilidade PRO",
            "logo_url": None,
            "brand_color": "#2563eb",
            "sidebar_color": "#0f172a"
        }
        
    branding_user = user
    if user.role == "vendedor" and user.broker_id:
        broker_result = await db.execute(select(User).where(User.id == user.broker_id))
        broker = broker_result.scalar_one_or_none()
        if broker:
            branding_user = broker
            
    return {
        "name": branding_user.name,
        "logo_url": branding_user.logo_url or branding_user.avatar_url,
        "brand_color": branding_user.brand_color or "#2563eb",
        "sidebar_color": branding_user.sidebar_color or "#0f172a",
        "highlight_color": branding_user.highlight_color or branding_user.brand_color or "#2563eb",
        "sidebar_color_secondary": branding_user.sidebar_color_secondary or ""
    }

