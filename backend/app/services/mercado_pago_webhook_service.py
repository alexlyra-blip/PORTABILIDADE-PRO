import hashlib
import hmac
import os
from typing import Optional

from fastapi import HTTPException


class MercadoPagoWebhookService:
    @staticmethod
    def get_secret() -> str:
        secret = os.getenv(
            "MERCADO_PAGO_WEBHOOK_SECRET",
            "",
        ).strip()

        if not secret:
            raise HTTPException(
                status_code=500,
                detail="MERCADO_PAGO_WEBHOOK_SECRET não configurado.",
            )

        return secret

    @staticmethod
    def parse_signature(
        x_signature: str,
    ) -> tuple[Optional[str], Optional[str]]:
        timestamp = None
        signature_hash = None

        for item in x_signature.split(","):
            item = item.strip()

            if "=" not in item:
                continue

            key, value = item.split("=", 1)

            if key == "ts":
                timestamp = value

            elif key == "v1":
                signature_hash = value

        return timestamp, signature_hash

    @classmethod
    def validate(
        cls,
        x_signature: Optional[str],
        x_request_id: Optional[str],
        data_id: Optional[str],
    ) -> None:
        if not x_signature:
            raise HTTPException(
                status_code=401,
                detail="Webhook sem assinatura.",
            )

        timestamp, received_hash = cls.parse_signature(
            x_signature
        )

        if not timestamp or not received_hash:
            raise HTTPException(
                status_code=401,
                detail="Assinatura do webhook inválida.",
            )

        manifest = ""

        if data_id:
            manifest += f"id:{str(data_id).lower()};"

        if x_request_id:
            manifest += f"request-id:{x_request_id};"

        manifest += f"ts:{timestamp};"

        expected_hash = hmac.new(
            cls.get_secret().encode("utf-8"),
            manifest.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(
            expected_hash,
            received_hash,
        ):
            raise HTTPException(
                status_code=401,
                detail="Assinatura do webhook inválida.",
            )
