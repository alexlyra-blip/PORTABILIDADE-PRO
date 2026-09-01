from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sqlalchemy_models import User, UserBankCredential
from app.services.bank_credentials_crypto import (
    decrypt_json,
    decrypt_text,
    encrypt_json,
    encrypt_text,
)


SUPPORTED_PROVIDERS = {
    "PRESENCA",
    "LOTUS",
    "FINTECH_CORBAN",
    "C6",
}


class BankCredentialsService:
    @staticmethod
    def normalize_provider(provider: str) -> str:
        normalized = str(provider or "").strip().upper()

        if normalized not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Provider bancário não suportado: {provider}"
            )

        return normalized

    @staticmethod
    async def get_record(
        db: AsyncSession,
        user_id: int,
        provider: str,
    ) -> Optional[UserBankCredential]:
        provider = BankCredentialsService.normalize_provider(provider)

        result = await db.execute(
            select(UserBankCredential).where(
                UserBankCredential.user_id == user_id,
                UserBankCredential.provider == provider,
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def list_records(
        db: AsyncSession,
        user_id: int,
    ):
        result = await db.execute(
            select(UserBankCredential)
            .where(UserBankCredential.user_id == user_id)
            .order_by(UserBankCredential.provider.asc())
        )

        return list(result.scalars().all())

    @staticmethod
    async def upsert_credentials(
        db: AsyncSession,
        *,
        user_id: int,
        provider: str,
        login: Optional[str] = None,
        password: Optional[str] = None,
        extra_credentials: Optional[Dict[str, Any]] = None,
        is_active: bool = True,
    ) -> UserBankCredential:
        provider = BankCredentialsService.normalize_provider(provider)

        record = await BankCredentialsService.get_record(
            db,
            user_id,
            provider,
        )

        if record is None:
            record = UserBankCredential(
                user_id=user_id,
                provider=provider,
            )
            db.add(record)

        if (
            login is not None
            and str(login).strip()
        ):
            record.login_encrypted = encrypt_text(login)

        if (
            password is not None
            and str(password) != ""
        ):
            record.password_encrypted = encrypt_text(password)

        if extra_credentials is not None:
            record.extra_credentials_encrypted = encrypt_json(
                extra_credentials
            )

        record.is_active = bool(is_active)
        record.updated_at = datetime.now(timezone.utc)

        await db.flush()

        return record

    @staticmethod
    async def get_decrypted_credentials(
        db: AsyncSession,
        *,
        user_id: int,
        provider: str,
    ) -> Optional[Dict[str, Any]]:
        record = await BankCredentialsService.get_record(
            db,
            user_id,
            provider,
        )

        if record is None or not record.is_active:
            return None

        return {
            "provider": record.provider,
            "login": decrypt_text(record.login_encrypted),
            "password": decrypt_text(record.password_encrypted),
            "extra_credentials": decrypt_json(
                record.extra_credentials_encrypted
            ),
            "is_active": record.is_active,
        }

    @staticmethod
    async def resolve_decrypted_credentials_for_user(
        db: AsyncSession,
        *,
        user_id: int,
        provider: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Resolve credenciais bancarias na hierarquia:

        1. usuario atual;
        2. corretor vinculado pelo broker_id;
        3. promotora da mesma empresa;
        4. administrador da mesma empresa.

        Nunca cruza empresas diferentes.
        """
        provider = (
            BankCredentialsService
            .normalize_provider(provider)
        )

        user_result = await db.execute(
            select(User).where(
                User.id == user_id
            )
        )

        user = user_result.scalar_one_or_none()

        if user is None:
            return None

        candidate_ids = []

        def add_candidate(value):
            if (
                value
                and value not in candidate_ids
            ):
                candidate_ids.append(value)

        add_candidate(user.id)

        company_id = getattr(
            user,
            "company_id",
            None,
        )

        broker_id = getattr(
            user,
            "broker_id",
            None,
        )

        # Vendedor pode herdar a credencial do
        # corretor somente quando ambos pertencem
        # a mesma empresa.
        if broker_id and company_id:
            broker_result = await db.execute(
                select(User.id).where(
                    User.id == broker_id,
                    User.company_id == company_id,
                    User.active == True,
                )
            )

            broker_candidate = (
                broker_result.scalar_one_or_none()
            )

            if broker_candidate:
                add_candidate(
                    broker_candidate
                )

        if company_id:
            for role_name in (
                "promotora",
                "admin",
            ):
                role_result = await db.execute(
                    select(User.id)
                    .where(
                        User.company_id == company_id,
                        User.active == True,
                        User.role == role_name,
                    )
                    .order_by(User.id.asc())
                )

                for candidate_id in (
                    role_result.scalars().all()
                ):
                    add_candidate(candidate_id)

        for candidate_id in candidate_ids:
            credentials = await (
                BankCredentialsService
                .get_decrypted_credentials(
                    db,
                    user_id=candidate_id,
                    provider=provider,
                )
            )

            if credentials:
                credentials = dict(
                    credentials
                )

                # Credencial desativada nunca deve
                # ser herdada por outro usuario.
                if not credentials.get(
                    "is_active",
                    True,
                ):
                    continue

                credentials[
                    "_resolved_user_id"
                ] = candidate_id

                return credentials

        return None


    @staticmethod
    async def set_test_result(
        db: AsyncSession,
        *,
        user_id: int,
        provider: str,
        status: str,
    ) -> Optional[UserBankCredential]:
        record = await BankCredentialsService.get_record(
            db,
            user_id,
            provider,
        )

        if record is None:
            return None

        record.last_test_status = str(status or "").strip()[:30] or None
        record.last_tested_at = datetime.now(timezone.utc)
        record.updated_at = datetime.now(timezone.utc)

        await db.flush()

        return record

    @staticmethod
    async def delete_credentials(
        db: AsyncSession,
        *,
        user_id: int,
        provider: str,
    ) -> bool:
        record = await BankCredentialsService.get_record(
            db,
            user_id,
            provider,
        )

        if record is None:
            return False

        await db.delete(record)
        await db.flush()

        return True

    @staticmethod
    def to_safe_dict(
        record: UserBankCredential,
    ) -> Dict[str, Any]:
        return {
            "id": record.id,
            "provider": record.provider,
            "configured": bool(
                record.login_encrypted
                or record.password_encrypted
                or record.extra_credentials_encrypted
            ),
            "has_login": bool(record.login_encrypted),
            "has_password": bool(record.password_encrypted),
            "has_extra_credentials": bool(
                record.extra_credentials_encrypted
            ),
            "is_active": bool(record.is_active),
            "last_test_status": record.last_test_status,
            "last_tested_at": (
                record.last_tested_at.isoformat()
                if record.last_tested_at
                else None
            ),
            "created_at": (
                record.created_at.isoformat()
                if record.created_at
                else None
            ),
            "updated_at": (
                record.updated_at.isoformat()
                if record.updated_at
                else None
            ),
        }