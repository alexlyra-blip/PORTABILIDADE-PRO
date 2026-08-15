import re
import time
from typing import Any, Dict, Optional

import httpx


class C6BankError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        code: Optional[str] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


import logging

logger = logging.getLogger(__name__)


class C6BankService:
    """
    Cliente da API C6 Marketplace.

    Fluxos suportados:
    - autenticacao;
    - autorizacao Credito do Trabalhador;
    - status da autorizacao;
    - simulacao de Refin INSS.

    IMPORTANTE:
    /marketplace/proposal/simulation apenas simula.
    Este servico nao cria proposta financeira.
    """

    DEFAULT_BASE_URL = (
        "https://marketplace-proposal-service-api-p.c6bank.info"
    )

    def __init__(
        self,
        credentials: Optional[Dict[str, Any]] = None,
    ):
        credentials = credentials or {}

        extras = (
            credentials.get("extra_credentials")
            or {}
        )

        self.username = str(
            credentials.get("login")
            or ""
        ).strip()

        self.password = str(
            credentials.get("password")
            or ""
        ).strip()

        self.promoter_code = str(
            extras.get("promoter_code")
            or ""
        ).strip()

        self.base_url = str(
            extras.get("base_url")
            or self.DEFAULT_BASE_URL
        ).rstrip("/")

        self.timeout = 30.0

        # Cache por instancia.
        # Nao compartilhamos token entre usuarios.
        self._token: Optional[str] = None
        self._token_expires_at: float = 0.0

    # ========================================================
    # NORMALIZADORES
    # ========================================================

    @staticmethod
    def limpar_documento(value: Any) -> str:
        return re.sub(
            r"\D",
            "",
            str(value or ""),
        )

    @staticmethod
    def formatar_cpf(value: Any) -> str:
        cpf = C6BankService.limpar_documento(
            value
        )

        if len(cpf) != 11:
            return cpf

        return (
            f"{cpf[:3]}."
            f"{cpf[3:6]}."
            f"{cpf[6:9]}-"
            f"{cpf[9:]}"
        )

    @staticmethod
    def normalizar_data(value: Any) -> str:
        raw = str(value or "").strip()

        if not raw:
            return ""

        # DD/MM/YYYY
        match = re.fullmatch(
            r"(\d{2})/(\d{2})/(\d{4})",
            raw,
        )

        if match:
            day, month, year = match.groups()
            return f"{year}-{month}-{day}"

        # YYYYMMDD
        if re.fullmatch(r"\d{8}", raw):
            return (
                f"{raw[:4]}-"
                f"{raw[4:6]}-"
                f"{raw[6:8]}"
            )

        # YYYY-MM-DD ou ISO.
        if len(raw) >= 10:
            possible = raw[:10]

            if re.fullmatch(
                r"\d{4}-\d{2}-\d{2}",
                possible,
            ):
                return possible

        return raw

    @staticmethod
    def separar_telefone(
        telefone: Any,
    ) -> Optional[Dict[str, str]]:
        clean = C6BankService.limpar_documento(
            telefone
        )

        # Remove 55 quando vier DDI.
        if (
            len(clean) in (12, 13)
            and clean.startswith("55")
        ):
            clean = clean[2:]

        if len(clean) not in (10, 11):
            return None

        return {
            "codigo_area": clean[:2],
            "numero": clean[2:],
        }

    # ========================================================
    # ERROS
    # ========================================================

    @staticmethod
    def _extrair_erro(
        response: httpx.Response,
    ) -> Dict[str, Optional[str]]:
        message = None
        code = None

        try:
            data = response.json()
        except Exception:
            data = None

        if isinstance(data, dict):
            message = (
                data.get("message")
                or data.get("mensagem")
                or data.get("error_description")
                or data.get("error")
            )

            details = data.get("details")

            if (
                isinstance(details, list)
                and details
                and isinstance(details[0], dict)
            ):
                first = details[0]

                message = (
                    first.get("message")
                    or message
                )

                code = (
                    first.get("code")
                    or first.get("error_code")
                )

            code = (
                code
                or data.get("code")
                or data.get("error_code")
            )

        if not message:
            message = (
                response.text[:300]
                if response.text
                else "Erro na API do C6 Bank."
            )

        return {
            "message": str(message),
            "code": (
                str(code)
                if code is not None
                else None
            ),
        }

    @classmethod
    def _raise_response_error(
        cls,
        response: httpx.Response,
        context: str,
    ) -> None:
        error = cls._extrair_erro(
            response
        )

        code = error.get("code")
        message = error.get("message")

        if code:
            final_message = (
                f"{context}: {message} ({code})"
            )
        else:
            final_message = (
                f"{context}: {message}"
            )

        raise C6BankError(
            final_message,
            status_code=response.status_code,
            code=code,
        )

    # ========================================================
    # AUTENTICACAO
    # ========================================================

    async def autenticar(
        self,
        *,
        force_refresh: bool = False,
    ) -> str:
        now = time.monotonic()

        if (
            not force_refresh
            and self._token
            and now < self._token_expires_at
        ):
            return self._token

        if not self.username:
            raise C6BankError(
                "Usuario/login C6 nao configurado."
            )

        if not self.password:
            raise C6BankError(
                "Senha C6 nao configurada."
            )

        async with httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            response = await client.post(
                f"{self.base_url}/auth/token",
                headers={
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                },
                data={
                    "username": self.username,
                    "password": self.password,
                },
            )

        if response.status_code not in (
            200,
            201,
        ):
            self._raise_response_error(
                response,
                "Falha na autenticacao C6",
            )

        try:
            data = response.json()
        except Exception as exc:
            raise C6BankError(
                "C6 retornou autenticacao em formato invalido."
            ) from exc

        token = str(
            data.get("access_token")
            or ""
        ).strip()

        if not token:
            raise C6BankError(
                "C6 nao retornou access_token."
            )

        try:
            expires = int(
                data.get("expires_in_seconds")
                or 1100
            )
        except Exception:
            expires = 1100

        # Margem de seguranca antes da expiracao.
        safe_ttl = max(
            60,
            expires - 30,
        )

        self._token = token
        self._token_expires_at = (
            time.monotonic()
            + safe_ttl
        )

        return token

    async def _headers(
        self,
        accept: str,
    ) -> Dict[str, str]:
        token = await self.autenticar()

        # Conforme documentacao e teste real:
        # token bruto, sem prefixo Bearer.
        return {
            "Accept": accept,
            "Content-Type": "application/json",
            "Authorization": token,
        }

    # ========================================================
    # TESTE DE CONEXAO
    # ========================================================

    async def testar_conexao(
        self,
    ) -> Dict[str, Any]:
        token = await self.autenticar(
            force_refresh=True
        )

        return {
            "success": True,
            "provider": "C6",
            "status": "connected",
            "token_received": bool(token),
            "promoter_code_configured": bool(
                self.promoter_code
            ),
        }

    # ========================================================
    # CLT - STATUS DA AUTORIZACAO
    # ========================================================

    async def consultar_status_autorizacao(
        self,
        cpf: str,
    ) -> Dict[str, Any]:
        cpf_clean = self.limpar_documento(
            cpf
        )

        if len(cpf_clean) != 11:
            raise C6BankError(
                "CPF invalido para consulta C6."
            )

        headers = await self._headers(
            "application/vnd.c6bank_authorization_status_v1+json"
        )

        async with httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            response = await client.post(
                (
                    f"{self.base_url}"
                    "/marketplace/authorization/status"
                ),
                headers=headers,
                json={
                    "cpf": cpf_clean,
                },
            )

        if response.status_code not in (
            200,
            201,
        ):
            self._raise_response_error(
                response,
                "Consulta de autorizacao C6",
            )

        data = response.json()

        return {
            "success": True,
            "provider": "C6",
            "banco_id": "c6_bank",
            "banco": "C6 Bank",
            "cpf": cpf_clean,
            "status": data.get("status"),
            "observacao": (
                data.get("observacao")
                or data.get("message")
            ),
            "raw_status": data,
        }

    # ========================================================
    # CLT - GERACAO DO LINK
    # ========================================================

    async def gerar_link_autorizacao(
        self,
        *,
        cpf: str,
        nome: str,
        data_nascimento: str,
        telefone: Optional[str] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self.limpar_documento(
            cpf
        )

        if len(cpf_clean) != 11:
            raise C6BankError(
                "CPF invalido para autorizacao C6."
            )

        nome = str(
            nome or ""
        ).strip()

        birth_date = self.normalizar_data(
            data_nascimento
        )

        if not nome:
            raise C6BankError(
                "Nome obrigatorio para autorizacao C6."
            )

        if not birth_date:
            raise C6BankError(
                "Data de nascimento obrigatoria "
                "para autorizacao C6."
            )

        payload: Dict[str, Any] = {
            "nome": nome,
            "cpf": cpf_clean,
            "data_nascimento": birth_date,
        }

        phone_data = self.separar_telefone(
            telefone
        )

        if phone_data:
            payload["telefone"] = phone_data

        headers = await self._headers(
            (
                "application/vnd."
                "c6bank_authorization_generate_liveness_v1+json"
            )
        )

        async with httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            response = await client.post(
                (
                    f"{self.base_url}"
                    "/marketplace/authorization/generate-liveness"
                ),
                headers=headers,
                json=payload,
            )

        if response.status_code not in (
            200,
            201,
        ):
            self._raise_response_error(
                response,
                "Geracao do link C6",
            )

        data = response.json()

        link = str(
            data.get("link")
            or ""
        ).strip()

        return {
            "success": True,
            "provider": "C6",
            "banco_id": "c6_bank",
            "banco": "C6 Bank",
            "status": "awaiting_authorization",
            "requires_authorization": True,
            "cpf": cpf_clean,
            "authorization_url": link,
            "data_expiracao": (
                data.get("data_expiracao")
            ),
        }

    # ========================================================
    # INSS - SIMULACAO DE REFINANCIAMENTO
    # ========================================================

    async def simular_refin_inss(
        self,
        *,
        cpf: str,
        beneficio: str,
        contrato: str,
        data_nascimento: str,
        renda: float,
        parcela: float,
        prazo: int = 108,
        public_agency: str = "000001",
        promoter_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self.limpar_documento(
            cpf
        )

        nb_clean = self.limpar_documento(
            beneficio
        )

        contrato_clean = str(
            contrato or ""
        ).strip()

        birth_date = self.normalizar_data(
            data_nascimento
        )

        promoter = str(
            promoter_code
            or self.promoter_code
            or ""
        ).strip()

        if len(cpf_clean) != 11:
            raise C6BankError(
                "CPF invalido para Refin C6."
            )

        if not nb_clean:
            raise C6BankError(
                "Beneficio INSS ausente para Refin C6."
            )

        if not contrato_clean:
            raise C6BankError(
                "Numero do contrato C6 ausente."
            )

        if not birth_date:
            raise C6BankError(
                "Data de nascimento ausente para Refin C6."
            )

        if float(renda or 0) <= 0:
            raise C6BankError(
                "Renda do cliente ausente para Refin C6."
            )

        if float(parcela or 0) <= 0:
            raise C6BankError(
                "Parcela do contrato ausente para Refin C6."
            )

        if not promoter:
            raise C6BankError(
                "Codigo da Promotora C6 nao configurado."
            )

        payload = {
            "operation_type": "REFINANCIAMENTO",
            "product_type_code": "0002",
            "simulation_type": "POR_VALOR_PARCELA",
            "formalization_subtype": "DIGITAL_WEB",
            "promoter_code": promoter,
            "covenant_group": "INSS",
            "public_agency": str(
                public_agency or "000001"
            ),
            "installment_quantity": int(
                prazo or 96
            ),
            "installment_amount": round(
                float(parcela),
                2,
            ),
            "client": {
                "tax_identifier":
                    self.formatar_cpf(cpf_clean),
                "enrollment": nb_clean,
                "birth_date": birth_date,
                "income_amount": round(
                    float(renda),
                    2,
                ),
            },
            "refinancing_contracts": [
                contrato_clean
            ],
        }

        headers = await self._headers(
            "application/vnd.c6bank_simulation_v1+json"
        )

        async with httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            response = await client.post(
                (
                    f"{self.base_url}"
                    "/marketplace/proposal/simulation"
                ),
                headers=headers,
                json=payload,
            )

        if response.status_code not in (
            200,
            201,
        ):
            self._raise_response_error(
                response,
                "Simulacao Refin C6",
            )

        data = response.json()

        # A documentacao apresenta os campos financeiros
        # diretamente na raiz da resposta. Em producao, porem,
        # a API pode encapsular a simulacao em outro objeto.
        # Procuramos os campos recursivamente sem depender
        # do nome desse wrapper.
        def find_value(obj, field):
            if isinstance(obj, dict):
                if field in obj:
                    value = obj.get(field)
                    if value is not None:
                        return value

                for child in obj.values():
                    found = find_value(child, field)
                    if found is not None:
                        return found

            elif isinstance(obj, list):
                for child in obj:
                    found = find_value(child, field)
                    if found is not None:
                        return found

            return None

        # A API real do C6 pode devolver varias condicoes
        # dentro de credit_conditions.
        credit_conditions = (
            data.get("credit_conditions")
            if isinstance(data, dict)
            else None
        )

        condition_items = (
            [
                item
                for item in credit_conditions
                if isinstance(item, dict)
            ]
            if isinstance(credit_conditions, list)
            else []
        )

        def condition_number(condition, field):
            if not isinstance(condition, dict):
                return 0.0

            value = condition.get(field)

            if value in (None, ""):
                return 0.0

            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        # Mantem a ordem enviada pelo C6.
        # Nao aplica regra comercial de maior valor/menor taxa.
        selected_condition = None

        for condition in condition_items:
            if any(
                value > 0
                for value in (
                    condition_number(
                        condition,
                        "client_amount",
                    ),
                    condition_number(
                        condition,
                        "installment_amount",
                    ),
                    condition_number(
                        condition,
                        "monthly_customer_rate",
                    ),
                    condition_number(
                        condition,
                        "net_amount",
                    ),
                    condition_number(
                        condition,
                        "principal_amount",
                    ),
                )
            ):
                selected_condition = condition
                break

        # Formato antigo: campos diretamente na raiz.
        financial_source = (
            selected_condition
            if selected_condition is not None
            else data
        )

        def number_value(field, default=0.0):
            value = find_value(
                financial_source,
                field,
            )

            if value in (None, ""):
                return float(default)

            try:
                return float(value)
            except (TypeError, ValueError):
                return float(default)

        covenant = (
            find_value(
                financial_source,
                "covenant",
            )
            or {}
        )

        if not isinstance(covenant, dict):
            covenant = {}

        product = (
            find_value(
                financial_source,
                "product",
            )
            or {}
        )

        if not isinstance(product, dict):
            product = {}

        valor_liberado = number_value(
            "client_amount"
        )

        parcela_retorno = number_value(
            "installment_amount"
        )

        taxa_retorno = number_value(
            "monthly_customer_rate"
        )

        valor_liquido = number_value(
            "net_amount"
        )

        valor_solicitado = number_value(
            "requested_amount"
        )

        valor_principal = number_value(
            "principal_amount"
        )

        valor_bruto = number_value(
            "gross_amount"
        )

        iof_retorno = number_value(
            "iof_amount"
        )

        # HTTP 200 sozinho nao significa que recebemos uma
        # condicao financeira utilizavel. Evita exibir uma
        # falsa simulacao de R$ 0,00.
        has_financial_result = any(
            value > 0
            for value in (
                valor_liberado,
                parcela_retorno,
                taxa_retorno,
                valor_liquido,
                valor_solicitado,
                valor_principal,
                valor_bruto,
            )
        )

        if not has_financial_result:
            top_keys = (
                sorted(data.keys())
                if isinstance(data, dict)
                else [type(data).__name__]
            )

            logger.warning(
                "[C6_REFIN] HTTP sucesso sem campos financeiros. "
                "Campos raiz=%s",
                top_keys,
            )

            raise C6BankError(
                "C6 respondeu a simulacao, mas nao retornou "
                "uma condicao financeira valida."
            )

        # Normaliza todas as condicoes financeiras validas
        # mantendo exatamente a ordem retornada pelo C6.
        normalized_conditions = []

        for condition in condition_items:
            covenant_item = (
                condition.get("covenant")
                or {}
            )

            product_item = (
                condition.get("product")
                or {}
            )

            if not isinstance(
                covenant_item,
                dict,
            ):
                covenant_item = {}

            if not isinstance(
                product_item,
                dict,
            ):
                product_item = {}

            item_valor_liberado = condition_number(
                condition,
                "client_amount",
            )

            item_parcela = condition_number(
                condition,
                "installment_amount",
            )

            item_taxa = condition_number(
                condition,
                "monthly_customer_rate",
            )

            item_valor_liquido = condition_number(
                condition,
                "net_amount",
            )

            item_valor_solicitado = condition_number(
                condition,
                "requested_amount",
            )

            item_valor_principal = condition_number(
                condition,
                "principal_amount",
            )

            item_valor_bruto = condition_number(
                condition,
                "gross_amount",
            )

            item_iof = condition_number(
                condition,
                "iof_amount",
            )

            item_cet = condition_number(
                condition,
                "monthly_effective_total_cost_rate",
            )

            item_prazo = int(
                condition_number(
                    condition,
                    "installment_quantity",
                )
                or prazo
                or 0
            )

            # Ignora apenas condicoes sem qualquer
            # resultado financeiro utilizavel.
            if not any(
                value > 0
                for value in (
                    item_valor_liberado,
                    item_parcela,
                    item_taxa,
                    item_valor_liquido,
                    item_valor_solicitado,
                    item_valor_principal,
                    item_valor_bruto,
                )
            ):
                continue

            normalized_conditions.append(
                {
                    "tabela": (
                        covenant_item.get("description")
                        or product_item.get("description")
                        or "Refinanciamento C6"
                    ),
                    "tabela_codigo": (
                        covenant_item.get("code")
                    ),
                    "produto": (
                        product_item.get("description")
                    ),
                    "produto_codigo": (
                        product_item.get("code")
                    ),
                    "prazo": item_prazo,
                    "parcela": item_parcela,
                    "taxa": item_taxa,
                    "cet_mensal": item_cet,
                    "valor_liberado": (
                        item_valor_liberado
                    ),
                    "valor_cliente": (
                        item_valor_liberado
                    ),
                    "valor_liquido": (
                        item_valor_liquido
                    ),
                    "valor_solicitado": (
                        item_valor_solicitado
                    ),
                    "valor_principal": (
                        item_valor_principal
                    ),
                    "valor_bruto": (
                        item_valor_bruto
                    ),
                    "iof": item_iof,
                    "primeiro_vencimento": (
                        condition.get(
                            "first_due_date"
                        )
                    ),
                    "ultimo_vencimento": (
                        condition.get(
                            "last_due_date"
                        )
                    ),
                    "refinancing": (
                        condition.get(
                            "refinancing"
                        )
                        if isinstance(
                            condition.get(
                                "refinancing"
                            ),
                            list,
                        )
                        else []
                    ),
                }
            )

        return {
            "success": True,
            "provider": "C6",
            "banco_id": "c6_bank",
            "banco": "C6 Bank",
            "operacao": "REFINANCIAMENTO",
            "status": "simulado",
            "contrato_origem": contrato_clean,
            "total_condicoes": len(normalized_conditions) or 1,
            "condicoes": normalized_conditions,

            "tabela": (
                covenant.get("description")
                or product.get("description")
                or "Refinanciamento C6"
            ),

            "tabela_codigo": (
                covenant.get("code")
            ),

            "produto": (
                product.get("description")
            ),

            "produto_codigo": (
                product.get("code")
            ),

            "prazo": int(
                number_value(
                    "installment_quantity",
                    prazo or 0,
                )
            ),

            "parcela": parcela_retorno,

            "taxa": taxa_retorno,

            "cet_mensal": number_value(
                "monthly_effective_total_cost_rate"
            ),

            "valor_liberado": valor_liberado,

            "valor_cliente": valor_liberado,

            "valor_liquido": valor_liquido,

            "valor_solicitado": valor_solicitado,

            "valor_principal": valor_principal,

            "valor_bruto": valor_bruto,

            "iof": iof_retorno,

            "primeiro_vencimento": find_value(
                data,
                "first_due_date",
            ),

            "ultimo_vencimento": find_value(
                data,
                "last_due_date",
            ),

            "refinancing": (
                data.get("refinancing")
                or []
            ),
        }
