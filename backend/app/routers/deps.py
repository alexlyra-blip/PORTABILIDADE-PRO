from fastapi import Header, HTTPException, Depends, status
from typing import Optional
from jose import jwt, JWTError
import os
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.services import auth_service
from app.models.sqlalchemy_models import User

async def get_current_user(authorization: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token não fornecido")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Formato de token inválido")
    
    token = authorization.split(" ")[1]
    try:
        payload = auth_service.decode_token(token)
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        
    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
        
    return user

async def get_admin_user(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores")
    return user

async def get_manager_user(user: User = Depends(get_current_user)):
    if user.role not in ["admin", "promotora"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a administradores ou promotoras")
    return user

async def verify_n8n_internal_key(x_api_key: str = Header(None)):
    internal_key = os.getenv("N8N_INTERNAL_API_KEY", "portabilidade_pro_secret_key_2024")
    if not x_api_key or not secrets.compare_digest(x_api_key, internal_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API Key inválida")
    return x_api_key

async def get_n8n_service_user(db: AsyncSession) -> User:
    tech_user_id_str = os.getenv("N8N_SERVICE_USER_ID")
    tech_user = None
    if tech_user_id_str:
        try:
            tech_user_id = int(tech_user_id_str)
            stmt = select(User).where(User.id == tech_user_id, User.active == True)
            res = await db.execute(stmt)
            tech_user = res.scalar_one_or_none()
        except ValueError:
            pass
            
    if not tech_user:
        # Fallback to active admin sorted by id ascending
        stmt = select(User).where(User.active == True, User.role == "admin").order_by(User.id.asc())
        res = await db.execute(stmt)
        tech_user = res.scalars().first()
        
    if not tech_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Nenhum usuário técnico ou administrador ativo foi encontrado para a integração n8n."
        )
    return tech_user
