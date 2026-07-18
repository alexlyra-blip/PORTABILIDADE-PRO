import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("multicorban_service")

class MultiCorbanService:
    _client: Optional[httpx.AsyncClient] = None

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        if cls._client is None:
            timeout_val = float(os.getenv("MULTICORBAN_TIMEOUT", "30.0"))
            limits = httpx.Limits(max_keepalive_connections=5, max_connections=20)
            cls._client = httpx.AsyncClient(limits=limits, timeout=timeout_val)
        return cls._client

    def __init__(self):
        self.base_url = os.getenv("MULTICORBAN_BASE_URL", "https://api.bancodatahub.com").rstrip("/")
        # MULTICORBAN_API_TOKEN must be loaded from env, do not define a default value here
        self.token = os.getenv("MULTICORBAN_API_TOKEN")

    def _mask_value(self, val: str) -> str:
        if len(val) >= 5:
            return f"{val[:3]}******{val[-2:]}"
        return "***"

    async def _request(self, endpoint: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        if not self.token:
            raise ValueError("Token de API da MultiCorban não configurado.")
            
        client = self.get_client()
        headers = {
            "Authorization": self.token,
            "Content-Type": "application/json"
        }
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        masked_payload = None
        if payload:
            masked_payload = {}
            for k, v in payload.items():
                if k in ["cpf", "cpf_cnpj", "beneficio"]:
                    masked_payload[k] = self._mask_value(str(v))
                else:
                    masked_payload[k] = v
        
        logger.info(f"Enviando POST para MultiCorban: {url} | Payload: {masked_payload}")
        
        try:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code == 401 or response.status_code == 403:
                raise ValueError("Autenticação MultiCorban inválida.")
            elif response.status_code == 429:
                raise ValueError("Limite de requisições da MultiCorban atingido.")
            elif response.status_code == 400 or response.status_code == 422:
                # Sanitized error response logging
                logger.error(f"Erro {response.status_code} na MultiCorban. Response: {response.text[:200]}")
                raise ValueError("Dados rejeitados pela MultiCorban.")
            elif response.status_code >= 500:
                raise ValueError("Serviço MultiCorban temporariamente indisponível.")
                
            return response.json()
            
        except httpx.TimeoutException:
            logger.error(f"Timeout na chamada ao endpoint: {url}")
            raise ValueError("A MultiCorban demorou para responder.")
        except httpx.RequestError as e:
            logger.error(f"Erro de conexão com MultiCorban no endpoint {url}: {str(e)}")
            raise ValueError("Serviço MultiCorban temporariamente indisponível.")
            
    async def consultar_cpf(self, cpf: str) -> Any:
        return await self._request("cpf", {"cpf": cpf})

    async def consultar_siape(self, cpf: str) -> Any:
        return await self._request("siape", {"cpf": cpf})

    async def consultar_geral(self, cpf_cnpj: str) -> Any:
        return await self._request("geral", {"cpf_cnpj": cpf_cnpj})

    async def consultar_offline(self, beneficio: str) -> Any:
        return await self._request("offline", {"beneficio": beneficio})

    async def consultar_saldo(self) -> Any:
        return await self._request("saldoApi")
