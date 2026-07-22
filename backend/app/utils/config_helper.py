from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sqlalchemy_models import SystemSetting


CPF_PROVIDER_SETTING_KEY = "cpf_active_provider"

VALID_CPF_PROVIDERS = {
    "promosys",
    "multicorban",
}


def normalize_provider(provider: str) -> str:
    normalized = str(provider or "").strip().lower()

    if normalized not in VALID_CPF_PROVIDERS:
        raise ValueError(
            "Provider inválido. Deve ser "
            "'promosys' ou 'multicorban'."
        )

    return normalized


async def get_active_provider(
    db: AsyncSession,
) -> Optional[str]:
    result = await db.execute(
        select(SystemSetting).where(
            SystemSetting.setting_key
            == CPF_PROVIDER_SETTING_KEY
        )
    )

    setting = result.scalar_one_or_none()

    if not setting:
        return None

    provider = str(
        setting.setting_value or ""
    ).strip().lower()

    if provider not in VALID_CPF_PROVIDERS:
        return None

    return provider


async def set_active_provider(
    db: AsyncSession,
    provider: str,
) -> str:
    normalized = normalize_provider(provider)

    result = await db.execute(
        select(SystemSetting).where(
            SystemSetting.setting_key
            == CPF_PROVIDER_SETTING_KEY
        )
    )

    setting = result.scalar_one_or_none()

    if setting:
        setting.setting_value = normalized
    else:
        setting = SystemSetting(
            setting_key=CPF_PROVIDER_SETTING_KEY,
            setting_value=normalized,
        )
        db.add(setting)

    await db.commit()
    await db.refresh(setting)

    return str(setting.setting_value)
