import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sqlalchemy_models import SystemSetting

logger = logging.getLogger("config_helper")


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


MULTICORBAN_TOTAL_CONSULTAS_KEY = "multicorban_total_consultas"
MULTICORBAN_RENEWAL_DAY_KEY = "multicorban_renewal_day"
DEFAULT_MULTICORBAN_TOTAL = 1000
DEFAULT_MULTICORBAN_RENEWAL_DAY = 15


async def get_system_setting(
    db: AsyncSession,
    key: str,
    default: Optional[str] = None,
) -> Optional[str]:
    try:
        result = await db.execute(
            select(SystemSetting).where(
                SystemSetting.setting_key == key
            )
        )
        setting = result.scalar_one_or_none()
        if setting and setting.setting_value is not None:
            return str(setting.setting_value).strip()
    except Exception as e:
        logger.warning(f"Erro ao ler configuracao {key}: {e}")
    return default


async def set_system_setting(
    db: AsyncSession,
    key: str,
    value: str,
) -> str:
    try:
        result = await db.execute(
            select(SystemSetting).where(
                SystemSetting.setting_key == key
            )
        )
        setting = result.scalar_one_or_none()
        if setting:
            setting.setting_value = value
        else:
            setting = SystemSetting(
                setting_key=key,
                setting_value=value,
            )
            db.add(setting)
        await db.commit()
        await db.refresh(setting)
        return str(setting.setting_value)
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao gravar configuracao {key}: {e}")
        try:
            from app.database import engine
            async with engine.begin() as conn:
                await conn.run_sync(SystemSetting.__table__.create, checkfirst=True)
            result = await db.execute(
                select(SystemSetting).where(
                    SystemSetting.setting_key == key
                )
            )
            setting = result.scalar_one_or_none()
            if setting:
                setting.setting_value = value
            else:
                setting = SystemSetting(setting_key=key, setting_value=value)
                db.add(setting)
            await db.commit()
            return value
        except Exception as e2:
            logger.error(f"Falha ao retentar gravacao de {key}: {e2}")
            return value


async def get_multicorban_quota_config(
    db: AsyncSession,
) -> dict:
    total_str = await get_system_setting(
        db,
        MULTICORBAN_TOTAL_CONSULTAS_KEY,
        str(DEFAULT_MULTICORBAN_TOTAL),
    )
    day_str = await get_system_setting(
        db,
        MULTICORBAN_RENEWAL_DAY_KEY,
        str(DEFAULT_MULTICORBAN_RENEWAL_DAY),
    )

    try:
        total = int(total_str) if total_str else DEFAULT_MULTICORBAN_TOTAL
    except (ValueError, TypeError):
        total = DEFAULT_MULTICORBAN_TOTAL

    try:
        day = int(day_str) if day_str else DEFAULT_MULTICORBAN_RENEWAL_DAY
    except (ValueError, TypeError):
        day = DEFAULT_MULTICORBAN_RENEWAL_DAY

    return {
        "total_consultas": max(1, total),
        "dia_renovacao": max(1, min(28, day)),
    }


async def set_multicorban_quota_config(
    db: AsyncSession,
    total_consultas: int,
    dia_renovacao: int = 15,
) -> dict:
    total = max(1, int(total_consultas))
    day = max(1, min(28, int(dia_renovacao)))

    await set_system_setting(
        db,
        MULTICORBAN_TOTAL_CONSULTAS_KEY,
        str(total),
    )
    await set_system_setting(
        db,
        MULTICORBAN_RENEWAL_DAY_KEY,
        str(day),
    )

    return {
        "total_consultas": total,
        "dia_renovacao": day,
    }


def calculate_renewal_cycle(
    renewal_day: int = 15,
    ref_date: Optional[object] = None,
) -> tuple:
    from datetime import datetime

    now = ref_date or datetime.now()
    year = now.year
    month = now.month

    if now.day >= renewal_day:
        start_date = datetime(year, month, renewal_day, 0, 0, 0)
        if month == 12:
            end_date = datetime(year + 1, 1, renewal_day, 0, 0, 0)
        else:
            end_date = datetime(year, month + 1, renewal_day, 0, 0, 0)
    else:
        if month == 1:
            start_date = datetime(year - 1, 12, renewal_day, 0, 0, 0)
        else:
            start_date = datetime(year, month - 1, renewal_day, 0, 0, 0)
        end_date = datetime(year, month, renewal_day, 0, 0, 0)

    if hasattr(now, "tzinfo") and now.tzinfo is not None:
        start_date = start_date.replace(tzinfo=now.tzinfo)
        end_date = end_date.replace(tzinfo=now.tzinfo)

    return start_date, end_date

