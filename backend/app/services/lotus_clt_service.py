import asyncio
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx


logger = logging.getLogger("lotus_clt_service")


class LotusCltService:
    """Cliente da API CLT da Lotus Mais.

    Mantém token, proposalId e última pré-simulação em memória para evitar
    recriações desnecessárias durante o fluxo interativo do corretor.
    O frontend também devolve o proposalId nas atualizações, então o fluxo
    continua funcional mesmo quando o cache local não estiver disponível.
    """

    _client: Optional[httpx.AsyncClient] = None
    _token: Optional[str] = None
    _token_created_at: float = 0.0
    _proposal_by_cpf: Dict[str, str] = {}
    _simulation_cache: Dict[str, Dict[str, Any]] = {}

    TERMINAL_STATUSES = {
        "CREDIT_ANALYSIS_REPROVED",
        "REFUSED",
        "CANCELED",
        "EXPIRED",
        "CONSENT_REJECTED",
        "SIGNATURE_FAILED",
        "REGISTRATION_FAILED",
        "DISBURSEMENT_FAILED",
    }

    def __init__(self):
        self.base_url = os.getenv(
            "LOTUS_BASE_URL",
            "https://backoffice-prod-dycyrhjbkq-rj.a.run.app",
        ).rstrip("/")
        self.email = (os.getenv("LOTUS_EMAIL") or "").strip()
        self.password = (os.getenv("LOTUS_PASSWORD") or "").strip()
        self.timeout = float(os.getenv("LOTUS_TIMEOUT", "45"))
        self.callback_url = (os.getenv("LOTUS_CALLBACK_URL") or "").strip()

    @classmethod
    def get_client(cls, timeout: float = 45.0) -> httpx.AsyncClient:
        if cls._client is None:
            cls._client = httpx.AsyncClient(
                timeout=httpx.Timeout(timeout),
                limits=httpx.Limits(
                    max_keepalive_connections=8,
                    max_connections=20,
                ),
            )
        return cls._client

    @staticmethod
    def _digits(value: Any) -> str:
        return "".join(ch for ch in str(value or "") if ch.isdigit())

    @staticmethod
    def _money_from_cents(value: Any) -> float:
        try:
            return round(float(value or 0) / 100.0, 2)
        except (TypeError, ValueError):
            return 0.0

    async def _authenticate(self, force: bool = False) -> str:
        # O token observado na API possui validade longa. Renovamos o cache
        # local a cada 8 horas e também fazemos retry automático em 401.
        if (
            not force
            and self.__class__._token
            and (time.time() - self.__class__._token_created_at) < 8 * 3600
        ):
            return self.__class__._token

        if not self.email or not self.password:
            raise ValueError(
                "LOTUS_EMAIL e LOTUS_PASSWORD não estão configurados."
            )

        client = self.get_client(self.timeout)
        response = await client.post(
            f"{self.base_url}/v1/auth/signin",
            json={"email": self.email, "password": self.password},
        )

        if response.status_code not in (200, 201):
            if response.status_code == 401:
                raise ValueError("Usuário ou senha da Lotus inválidos.")
            raise ValueError(
                f"Falha ao autenticar na Lotus (HTTP {response.status_code})."
            )

        data = response.json()
        token = str(data.get("token") or "").strip()
        if not token:
            raise ValueError("Token não retornado pela Lotus.")

        self.__class__._token = token
        self.__class__._token_created_at = time.time()
        return token

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        retry_auth: bool = True,
    ) -> Any:
        token = await self._authenticate()
        client = self.get_client(self.timeout)
        response = await client.request(
            method,
            f"{self.base_url}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            json=json,
        )

        if response.status_code == 401 and retry_auth:
            await self._authenticate(force=True)
            return await self._request(
                method,
                path,
                json=json,
                retry_auth=False,
            )

        if response.status_code >= 400:
            detail = ""
            try:
                payload = response.json()
                detail = str(
                    payload.get("message")
                    or payload.get("error")
                    or payload
                )
            except Exception:
                detail = response.text[:500]

            raise ValueError(
                f"Lotus retornou HTTP {response.status_code}: {detail}"
            )

        if response.status_code == 204 or not response.content:
            return {}
        return response.json()

    async def criar_proposta(
        self,
        *,
        cpf: str,
        nome: str,
        telefone: str,
        data_nascimento: Optional[str] = None,
        callback_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self._digits(cpf)
        phone_clean = self._digits(telefone)

        payload: Dict[str, Any] = {
            "name": " ".join(str(nome or "").strip().split()),
            "cpf": cpf_clean,
            "phone": phone_clean,
        }
        if data_nascimento:
            payload["birthDate"] = str(data_nascimento)

        final_callback = (callback_url or self.callback_url or "").strip()
        if final_callback:
            payload["callbackUrl"] = final_callback

        data = await self._request(
            "POST",
            "/v1/clt/proposal-lead",
            json=payload,
        )
        proposal_id = str(data.get("proposalId") or data.get("id") or "")
        if not proposal_id:
            raise ValueError("proposalId não retornado pela Lotus.")

        self.__class__._proposal_by_cpf[cpf_clean] = proposal_id
        return data

    async def detalhes(self, proposal_id: str) -> Dict[str, Any]:
        return await self._request(
            "GET",
            f"/v1/clt/proposals/{proposal_id}/details",
        )

    async def pre_simular(
        self,
        proposal_id: str,
        loan_amount_cents: int,
        *,
        has_insurance: bool = False,
    ) -> Dict[str, Any]:
        if loan_amount_cents <= 0:
            raise ValueError("Valor solicitado para a Lotus deve ser maior que zero.")

        cache_key = f"{proposal_id}:{loan_amount_cents}:{int(has_insurance)}"
        cached = self.__class__._simulation_cache.get(cache_key)
        if cached:
            return cached

        data = await self._request(
            "POST",
            f"/v1/clt/proposals/{proposal_id}/pre-simulation",
            json={
                "loanAmount": int(loan_amount_cents),
                "hasInsurance": bool(has_insurance),
            },
        )
        self.__class__._simulation_cache[cache_key] = data
        return data

    async def selecionar_parcela(
        self,
        proposal_id: str,
        installment_id: str,
    ) -> None:
        await self._request(
            "PUT",
            f"/v1/clt/proposals/{proposal_id}/select-installment/{installment_id}",
        )

    def normalizar_simulacao(
        self,
        simulation: Dict[str, Any],
    ) -> Dict[str, Any]:
        raw_offers = simulation.get("installmentsData") or []
        offers: List[Dict[str, Any]] = []

        for item in raw_offers:
            if not isinstance(item, dict):
                continue
            prazo = int(item.get("installments") or 0)
            offers.append(
                {
                    "id": item.get("id"),
                    "tabela_id": item.get("id"),
                    "tabela": f"Lotus Fast - {prazo}x" if prazo else "Lotus Fast",
                    "banco": "Lotus Mais",
                    "banco_id": "lotus_mais",
                    "prazo": prazo,
                    "parcela": self._money_from_cents(
                        item.get("installmentsValue")
                    ),
                    "taxa": float(item.get("monthlyInterestRate") or 0),
                    "taxa_anual": float(item.get("annualInterestRate") or 0),
                    "iof": self._money_from_cents(item.get("iof")),
                    "tac": self._money_from_cents(item.get("tac")),
                    "custo_total": self._money_from_cents(item.get("loanCost")),
                    "valor_liberado": self._money_from_cents(
                        item.get("totalTransfer")
                    ),
                }
            )

        offers.sort(key=lambda item: int(item.get("prazo") or 0), reverse=True)
        best = offers[0] if offers else None
        return {
            "status": "completed" if offers else "sem_ofertas",
            "ofertas": offers,
            "melhor_oferta": best,
            "valor_liberado": self._money_from_cents(
                simulation.get("totalTransfer")
            ),
            "custo_total": self._money_from_cents(
                simulation.get("amountToPay")
            ),
            "iof": self._money_from_cents(simulation.get("iof")),
            "taxa": float(simulation.get("interestRate") or 0),
            "taxa_anual": float(simulation.get("annualInterestRate") or 0),
            "simulacao_id": simulation.get("id"),
        }

    async def consultar_fluxo(
        self,
        *,
        cpf: str,
        nome: str,
        telefone: str,
        proposal_id: Optional[str] = None,
        valor_solicitado: Optional[float] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self._digits(cpf)
        current_id = (
            str(proposal_id or "").strip()
            or self.__class__._proposal_by_cpf.get(cpf_clean, "")
        )

        if not current_id:
            created = await self.criar_proposta(
                cpf=cpf_clean,
                nome=nome,
                telefone=telefone,
            )
            current_id = str(created.get("proposalId") or created.get("id"))

        self.__class__._proposal_by_cpf[cpf_clean] = current_id

        # A criação é assíncrona. Fazemos uma espera curta apenas para tentar
        # devolver o shortLink já na primeira chamada sem bloquear demais a UI.
        details: Dict[str, Any] = {}
        for attempt in range(4):
            details = await self.detalhes(current_id)
            if details.get("status") != "PENDING_PARTNER_INTEGRATION":
                break
            if attempt < 3:
                await asyncio.sleep(0.7)

        raw_status = str(details.get("status") or "PENDING_PARTNER_INTEGRATION")
        short_link = details.get("shortLink")
        max_loan_cents = int(details.get("maxLoan") or 0)

        base = {
            "banco_id": "lotus_mais",
            "banco": "Lotus Mais",
            "provider_status": raw_status,
            "proposal_id": current_id,
            "authorization_url": short_link,
            "max_loan": self._money_from_cents(max_loan_cents),
            "ofertas": [],
        }

        if raw_status == "WAITING_AGREEMENT_REQUEST":
            return {
                **base,
                "status": "awaiting_authorization",
                "mensagem": "Aguardando autorização eSocial do cliente.",
            }

        if raw_status in {
            "PENDING_PARTNER_INTEGRATION",
            "APPROVED_AGREEMENT",
            "WAITING_CREDIT_ANALYSIS",
            "IN_REVIEW",
        }:
            return {
                **base,
                "status": "processing",
                "mensagem": "A Lotus está processando a análise de crédito.",
            }

        if raw_status == "CREDIT_ANALYSIS_APPROVED":
            requested_cents = 0
            if valor_solicitado is not None:
                requested_cents = int(round(float(valor_solicitado) * 100))

            loan_amount = requested_cents or max_loan_cents
            if max_loan_cents and loan_amount > max_loan_cents:
                return {
                    **base,
                    "status": "ajuste_simulacao",
                    "mensagem": (
                        "O valor solicitado ultrapassa o limite aprovado pela Lotus."
                    ),
                    "limites_permitidos": [
                        {
                            "descricao": "Valor máximo Lotus",
                            "valor": self._money_from_cents(max_loan_cents),
                        }
                    ],
                }

            simulation = await self.pre_simular(current_id, loan_amount)
            normalized = self.normalizar_simulacao(simulation)
            return {
                **base,
                **normalized,
                "max_loan": self._money_from_cents(max_loan_cents),
            }

        terminal_messages = {
            "CREDIT_ANALYSIS_REPROVED": "Análise de crédito não aprovada pela Lotus.",
            "REFUSED": "Proposta recusada pela Lotus.",
            "CANCELED": "Proposta cancelada na Lotus.",
            "EXPIRED": "Proposta expirada na Lotus.",
            "CONSENT_REJECTED": "Consentimento eSocial recusado pelo cliente.",
            "SIGNATURE_FAILED": "Falha na assinatura da proposta Lotus.",
            "REGISTRATION_FAILED": "Falha no registro da proposta Lotus.",
            "DISBURSEMENT_FAILED": "Falha no desembolso da proposta Lotus.",
        }
        if raw_status in self.TERMINAL_STATUSES:
            return {
                **base,
                "status": "cliente_nao_elegivel",
                "mensagem": terminal_messages.get(
                    raw_status,
                    "A proposta Lotus foi encerrada sem oferta disponível.",
                ),
                "error_code": raw_status,
            }

        return {
            **base,
            "status": "processing",
            "mensagem": f"Status Lotus: {raw_status}",
        }
