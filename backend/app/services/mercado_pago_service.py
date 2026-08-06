import os
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException

from app.schemas.payment_schema import CreatePaymentLinkRequest


MERCADO_PAGO_API_URL = "https://api.mercadopago.com"


class MercadoPagoService:
    @staticmethod
    def get_access_token() -> str:
        token = os.getenv("MERCADO_PAGO_ACCESS_TOKEN", "").strip()

        if not token:
            raise HTTPException(
                status_code=500,
                detail="MERCADO_PAGO_ACCESS_TOKEN não configurado no backend.",
            )

        return token

    @staticmethod
    def get_frontend_url() -> str:
        return os.getenv(
            "FRONTEND_URL",
            "https://portabilidadepro.com.br",
        ).rstrip("/")

    @staticmethod
    def get_backend_url() -> str:
        return os.getenv(
            "BACKEND_URL",
            "https://api.portabilidadepro.com.br",
        ).rstrip("/")

    @staticmethod
    def create_reference() -> str:
        date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
        random_part = secrets.token_hex(4).upper()
        return f"PP-{date_part}-{random_part}"

    @staticmethod
    def split_customer_name(full_name: str) -> Dict[str, str]:
        parts = full_name.strip().split(maxsplit=1)

        payer = {
            "name": parts[0],
        }

        if len(parts) > 1:
            payer["surname"] = parts[1]

        return payer

    @classmethod
    async def create_payment_link(
        cls,
        data: CreatePaymentLinkRequest,
        created_by_user_id: int,
    ) -> Dict[str, Any]:
        token = cls.get_access_token()
        frontend_url = cls.get_frontend_url()
        backend_url = cls.get_backend_url()

        reference = cls.create_reference()
        expiration_date = datetime.now(timezone.utc) + timedelta(
            days=data.expiration_days
        )

        payer: Dict[str, Any] = cls.split_customer_name(
            data.customer_name
        )

        if data.customer_email:
            payer["email"] = str(data.customer_email)

        if data.customer_document:
            payer["identification"] = {
                "type": (
                    "CPF"
                    if len(data.customer_document) == 11
                    else "CNPJ"
                ),
                "number": data.customer_document,
            }

        item_description_parts = [data.description]

        if data.package_name:
            item_description_parts.append(
                f"Pacote: {data.package_name}"
            )

        if data.consultation_quantity is not None:
            item_description_parts.append(
                f"Consultas: {data.consultation_quantity}"
            )

        item_description = " | ".join(item_description_parts)

        payload: Dict[str, Any] = {
            "items": [
                {
                    "id": reference,
                    "title": data.description,
                    "description": item_description,
                    "category_id": "services",
                    "quantity": 1,
                    "currency_id": "BRL",
                    "unit_price": float(
                        Decimal(data.amount).quantize(
                            Decimal("0.01")
                        )
                    ),
                }
            ],
            "payer": payer,
            "external_reference": reference,
            "statement_descriptor": "PORTABILIDADEPRO",
            "back_urls": {
                "success": (
                    f"{frontend_url}/pagamento/sucesso"
                    f"?reference={reference}"
                ),
                "pending": (
                    f"{frontend_url}/pagamento/pendente"
                    f"?reference={reference}"
                ),
                "failure": (
                    f"{frontend_url}/pagamento/falha"
                    f"?reference={reference}"
                ),
            },
            "auto_return": "approved",
            "notification_url": (
                f"{backend_url}/api/payments/webhook"
            ),
            "expires": True,
            "expiration_date_to": expiration_date.isoformat(),
            "metadata": {
                "created_by_user_id": created_by_user_id,
                "customer_phone": data.customer_phone,
                "package_name": data.package_name,
                "consultation_quantity": (
                    data.consultation_quantity
                ),
                "internal_note": data.internal_note,
            },
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Idempotency-Key": secrets.token_hex(16),
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{MERCADO_PAGO_API_URL}/checkout/preferences",
                    json=payload,
                    headers=headers,
                )
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=504,
                detail="O Mercado Pago demorou para responder.",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Não foi possível conectar à API do "
                    "Mercado Pago."
                ),
            ) from exc

        try:
            response_data = response.json()
        except ValueError:
            response_data = {
                "message": response.text
            }

        if response.status_code not in (200, 201):
            raise HTTPException(
                status_code=502,
                detail={
                    "message": (
                        "O Mercado Pago não conseguiu criar "
                        "a preferência."
                    ),
                    "mercado_pago_status": response.status_code,
                    "mercado_pago_response": response_data,
                },
            )

        payment_url: Optional[str] = response_data.get("init_point")
        sandbox_url: Optional[str] = response_data.get(
            "sandbox_init_point"
        )
        environment = os.getenv(
            "MERCADO_PAGO_ENVIRONMENT",
            "test",
        ).lower()

        if environment == "test" and sandbox_url:
            selected_url = sandbox_url
        else:
            selected_url = payment_url

        if not selected_url:
            raise HTTPException(
                status_code=502,
                detail=(
                    "O Mercado Pago criou a preferência, mas "
                    "não retornou o link do checkout."
                ),
            )

        return {
            "success": True,
            "reference": reference,
            "preference_id": response_data["id"],
            "payment_url": selected_url,
            "production_url": payment_url,
            "sandbox_url": sandbox_url,
            "amount": str(data.amount),
            "status": "created",
            "mercado_pago_response": response_data,
        }

    @classmethod
    async def get_payment(cls, payment_id: str) -> Dict[str, Any]:
        token = cls.get_access_token()

        headers = {
            "Authorization": f"Bearer {token}",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    (
                        f"{MERCADO_PAGO_API_URL}/v1/payments/"
                        f"{payment_id}"
                    ),
                    headers=headers,
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail="Falha ao consultar o pagamento.",
            ) from exc

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": (
                        "Não foi possível consultar o pagamento."
                    ),
                    "mercado_pago_status": response.status_code,
                    "mercado_pago_response": response.text,
                },
            )

        return response.json()
