from datetime import datetime, timedelta, timezone
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.sqlalchemy_models import User


SUBSCRIPTION_DAYS = 30
NOTICE_DAYS = 5


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_datetime(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def days_remaining(expires_at, now=None):
    expires_at = normalize_datetime(expires_at)
    if not expires_at:
        return None
    now = normalize_datetime(now) or utc_now()
    return max(0, ceil((expires_at - now).total_seconds() / 86400))


async def apply_auto_renewal(db: AsyncSession, user: User, now=None) -> bool:
    """Renova silenciosamente apenas a assinatura do próprio titular."""
    now = normalize_datetime(now) or utc_now()
    expires_at = normalize_datetime(user.subscription_expires_at)
    if not expires_at or not bool(user.subscription_auto_renew) or expires_at > now:
        return False

    while expires_at <= now:
        expires_at += timedelta(days=SUBSCRIPTION_DAYS)
    user.subscription_expires_at = expires_at
    user.subscription_last_renewed_at = now
    user.subscription_last_renewed_by_user_id = None
    await db.flush()
    return True


async def find_promotora_ancestor(db: AsyncSession, user: User):
    """Localiza a promotora na cadeia sem depender de apenas um nível."""
    parent_id = user.broker_id
    visited = {user.id}
    for _ in range(20):
        if not parent_id or parent_id in visited:
            return None
        visited.add(parent_id)
        result = await db.execute(select(User).where(User.id == parent_id))
        parent = result.scalar_one_or_none()
        if not parent:
            return None
        if parent.role == "promotora":
            return parent
        parent_id = parent.broker_id
    return None


async def validate_effective_access(db: AsyncSession, user: User):
    now = utc_now()
    changed = await apply_auto_renewal(db, user, now)

    if not user.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    own_expiry = normalize_datetime(user.subscription_expires_at)
    if own_expiry and own_expiry <= now:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu acesso expirou. Entre em contato com o administrador.",
        )

    promotora = await find_promotora_ancestor(db, user)
    if promotora:
        changed = await apply_auto_renewal(db, promotora, now) or changed
        promoter_expiry = normalize_datetime(promotora.subscription_expires_at)
        if not promotora.active or (promoter_expiry and promoter_expiry <= now):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="O acesso da sua promotora está indisponível. Fale com o responsável pela promotora.",
            )

    if changed:
        await db.commit()
        await db.refresh(user)
    return user


def own_access_notice(user: User):
    """Nunca usa a data da promotora: subordinados não veem o vencimento dela."""
    remaining = days_remaining(user.subscription_expires_at)
    if remaining is None or remaining > NOTICE_DAYS:
        return None
    return {
        "type": "subscription_expiration",
        "days_remaining": remaining,
        "expires_at": user.subscription_expires_at,
        "message": (
            "Seu acesso expira hoje."
            if remaining == 0
            else f"Seu acesso expira em {remaining} dia{'s' if remaining != 1 else ''}."
        ),
    }


async def resolve_branding_user(db: AsyncSession, user: User):
    return await find_promotora_ancestor(db, user) or user
