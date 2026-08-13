import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx


logger = logging.getLogger("fintech_corban_clt_service")


class FintechCorbanCltService:
    _client: Optional[httpx.AsyncClient] = None

    def __init__(
        self,
        login: Optional[str] = None,
        password: Optional[str] = None,
        subscription: Optional[str] = None,
    ):
        self.base_url = os.getenv(
            "FINTECH_CORBAN_BASE_URL",
            "https://api.fintechdocorban.com.br/super-simples",
        ).rstrip("/")

        self.login = (
            login
            if login is not None
            else os.getenv("FINTECH_CORBAN_LOGIN")
            or ""
        ).strip()

        self.password = (
            password
            if password is not None
            else os.getenv("FINTECH_CORBAN_PASSWORD")
            or ""
        ).strip()

        self.subscription = (
            subscription
            if subscription is not None
            else os.getenv("FINTECH_CORBAN_SUBSCRIPTION")
            or ""
        ).strip()

        self.timeout = float(
            os.getenv("FINTECH_CORBAN_TIMEOUT", "60")
        )

        # Token isolado por instância/usuário.
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    @classmethod
    def get_client(
        cls,
        timeout: float = 60.0,
    ) -> httpx.AsyncClient:
        if cls._client is None:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(timeout),
                limits=httpx.Limits(
                    max_keepalive_connections=5,
                    max_connections=20,
                ),
            )

        return cls._client

    def validar_configuracao(self) -> None:
        if not self.login:
            raise ValueError(
                "Login da Fintech do Corban não configurado."
            )

        if not self.password:
            raise ValueError(
                "Senha da Fintech do Corban não configurada."
            )

        if not self.subscription:
            raise ValueError(
                "Subscription da Fintech do Corban não configurada."
            )

    def _token_valido(self) -> bool:
        if (
            not self._access_token
            or not self._token_expires_at
        ):
            return False

        agora = datetime.now(timezone.utc)

        return self._token_expires_at > (
            agora + timedelta(seconds=60)
        )

    async def autenticar(
        self,
        force_refresh: bool = False,
    ) -> str:
        self.validar_configuracao()

        if (
            not force_refresh
            and self._token_valido()
        ):
            return str(self._access_token)

        client = self.get_client(self.timeout)

        try:
            response = await client.post(
                f"{self.base_url}/Api/V1/User/Login",
                params={
                    "saveLog": "false",
                },
                headers={
                    "Subscription": self.subscription,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "login": self.login,
                    "password": self.password,
                },
            )

        except httpx.TimeoutException as exc:
            raise ValueError(
                "A Fintech do Corban demorou para autenticar."
            ) from exc

        except httpx.RequestError as exc:
            logger.error(
                "Erro de conexão com Fintech do Corban: %s",
                str(exc),
            )

            raise ValueError(
                "Não foi possível conectar à Fintech do Corban."
            ) from exc

        if response.status_code in (401, 403):
            raise ValueError(
                "Credenciais da Fintech do Corban inválidas."
            )

        if response.status_code < 200 or response.status_code >= 300:
            raise ValueError(
                "Falha ao autenticar na Fintech do Corban "
                f"(HTTP {response.status_code})."
            )

        try:
            data: Dict[str, Any] = response.json()
        except Exception as exc:
            raise ValueError(
                "Resposta de autenticação inválida "
                "da Fintech do Corban."
            ) from exc

        token = str(
            data.get("access_token")
            or ""
        ).strip()

        if not token:
            raise ValueError(
                "access_token não retornado "
                "pela Fintech do Corban."
            )

        expires_in = data.get("expires_in")

        try:
            expires_seconds = int(expires_in or 3600)
        except (TypeError, ValueError):
            expires_seconds = 3600

        if expires_seconds <= 0:
            expires_seconds = 3600

        self._access_token = token
        self._token_expires_at = (
            datetime.now(timezone.utc)
            + timedelta(seconds=expires_seconds)
        )

        return token