import asyncio
import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache(maxsize=1)
def _get_supabase_client() -> Client:
    url = (
        os.getenv("SUPABASE_URL")
        or ""
    ).strip()

    key = (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY"
        )
        or ""
    ).strip()

    if not url:
        raise RuntimeError(
            "SUPABASE_URL não configurada."
        )

    if not key:
        raise RuntimeError(
            "SUPABASE_SECRET_KEY não configurada."
        )

    return create_client(
        url,
        key,
    )


def _get_bucket_name() -> str:
    bucket = (
        os.getenv("CARD_SALES_BUCKET")
        or ""
    ).strip()

    if not bucket:
        raise RuntimeError(
            "CARD_SALES_BUCKET não configurado."
        )

    return bucket


class CardSaleStorageService:

    @classmethod
    async def check_bucket(
        cls,
    ) -> str:
        bucket = _get_bucket_name()

        def operation():
            client = _get_supabase_client()
            client.storage.get_bucket(
                bucket
            )

        await asyncio.to_thread(
            operation
        )

        return bucket

    @classmethod
    async def upload(
        cls,
        *,
        storage_key: str,
        content: bytes,
        mime_type: str,
    ) -> None:
        bucket = _get_bucket_name()

        def operation():
            client = _get_supabase_client()

            client.storage.from_(
                bucket
            ).upload(
                path=storage_key,
                file=content,
                file_options={
                    "content-type": mime_type,
                    "upsert": "false",
                },
            )

        await asyncio.to_thread(
            operation
        )

    @classmethod
    async def remove(
        cls,
        storage_key: str,
    ) -> None:
        bucket = _get_bucket_name()

        def operation():
            client = _get_supabase_client()

            client.storage.from_(
                bucket
            ).remove(
                [storage_key]
            )

        await asyncio.to_thread(
            operation
        )
