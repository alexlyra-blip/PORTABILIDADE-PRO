import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx


logger = logging.getLogger("presenca_bank_service")


class PresencaBankService:
    _client: Optional[httpx.AsyncClient] = None
    _cached_token: Optional[str] = None
    _token_expires_at: Optional[datetime] = None
    _simulation_context_cache: Dict[str, Dict[str, Any]] = {}
    _simulation_context_ttl = timedelta(minutes=30)

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        if cls._client is None:
            timeout = float(
                os.getenv("PRESENA_BANK_TIMEOUT", "90")
            )

            limits = httpx.Limits(
                max_keepalive_connections=5,
                max_connections=20,
            )

            cls._client = httpx.AsyncClient(
                timeout=timeout,
                limits=limits,
            )

        return cls._client

    def __init__(self):
        self.base_url = os.getenv(
            "PRESENA_BANK_BASE_URL",
            "https://presenca-bank-api.azurewebsites.net",
        ).rstrip("/")

        self.login = os.getenv("PRESENA_BANK_LOGIN")
        self.password = os.getenv("PRESENA_BANK_PASSWORD")

        self.product_id = int(
            os.getenv("PRESENA_BANK_PRODUCT_ID", "28")
        )

    @staticmethod
    def limpar_documento(value: str) -> str:
        return "".join(
            char for char in str(value or "")
            if char.isdigit()
        )

    @staticmethod
    def mascarar_documento(value: str) -> str:
        clean = PresencaBankService.limpar_documento(value)

        if len(clean) < 5:
            return "***"

        return f"{clean[:3]}******{clean[-2:]}"

    def validar_configuracao(self) -> None:
        if not self.login or not self.password:
            raise ValueError(
                "PRESENA_BANK_LOGIN e PRESENA_BANK_PASSWORD "
                "não estão configurados."
            )

    @staticmethod
    def _extrair_mensagem_erro(
        response: httpx.Response,
    ) -> str:
        try:
            data = response.json()
        except Exception:
            return response.text[:300] or "Erro não detalhado."

        if isinstance(data, dict):
            return str(
                data.get("message")
                or data.get("detail")
                or data.get("code")
                or data
            )

        return str(data)

    @classmethod
    def _token_valido(cls) -> bool:
        if not cls._cached_token or not cls._token_expires_at:
            return False

        agora = datetime.now(timezone.utc)

        return cls._token_expires_at > (
            agora + timedelta(seconds=60)
        )

    async def autenticar(
        self,
        force_refresh: bool = False,
    ) -> str:
        self.validar_configuracao()

        if not force_refresh and self._token_valido():
            return str(self._cached_token)

        client = self.get_client()

        try:
            response = await client.post(
                f"{self.base_url}/login",
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "login": self.login,
                    "senha": self.password,
                },
            )
        except httpx.TimeoutException as exc:
            raise ValueError(
                "A Presença Bank demorou para autenticar."
            ) from exc
        except httpx.RequestError as exc:
            logger.error(
                "Erro de conexão ao autenticar na Presença Bank: %s",
                exc,
            )
            raise ValueError(
                "Não foi possível conectar à Presença Bank."
            ) from exc

        if response.status_code in (401, 403):
            raise ValueError(
                "Usuário ou senha da Presença Bank inválidos."
            )

        if response.status_code >= 500:
            raise ValueError(
                "Serviço de autenticação da Presença Bank "
                "temporariamente indisponível."
            )

        if not response.is_success:
            message = self._extrair_mensagem_erro(response)
            raise ValueError(
                f"Falha na autenticação da Presença Bank: {message}"
            )

        data = response.json()
        token = data.get("token")

        if not token:
            raise ValueError(
                "A Presença Bank autenticou, mas não retornou token."
            )

        expire_at = data.get("expireAt")
        parsed_expiration = None

        if expire_at:
            try:
                parsed_expiration = datetime.fromisoformat(
                    str(expire_at).replace("Z", "+00:00")
                )

                if parsed_expiration.tzinfo is None:
                    parsed_expiration = parsed_expiration.replace(
                        tzinfo=timezone.utc
                    )
            except ValueError:
                parsed_expiration = None

        if parsed_expiration is None:
            parsed_expiration = (
                datetime.now(timezone.utc)
                + timedelta(minutes=45)
            )

        PresencaBankService._cached_token = token
        PresencaBankService._token_expires_at = (
            parsed_expiration
        )

        return token

    async def _request(
        self,
        method: str,
        endpoint: str,
        payload: Optional[Dict[str, Any]] = None,
        retry_auth: bool = True,
    ) -> Any:
        token = await self.autenticar()
        client = self.get_client()

        url = f"{self.base_url}/{endpoint.lstrip('/')}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        logger.info(
            "Presença Bank %s %s",
            method.upper(),
            endpoint,
        )

        try:
            response = await client.request(
                method.upper(),
                url,
                headers=headers,
                json=payload,
            )
        except httpx.TimeoutException as exc:
            raise ValueError(
                "A Presença Bank demorou para responder."
            ) from exc
        except httpx.RequestError as exc:
            logger.error(
                "Erro de conexão com a Presença Bank em %s: %s",
                endpoint,
                exc,
            )
            raise ValueError(
                "Serviço Presença Bank temporariamente indisponível."
            ) from exc

        if response.status_code == 401 and retry_auth:
            await self.autenticar(force_refresh=True)

            return await self._request(
                method,
                endpoint,
                payload,
                retry_auth=False,
            )

        message = self._extrair_mensagem_erro(response)

        if response.status_code in (401, 403):
            raise ValueError(
                "Autenticação ou permissão inválida na Presença Bank."
            )

        if response.status_code == 429:
            raise ValueError(
                "Limite de requisições da Presença Bank atingido."
            )

        if response.status_code in (400, 404, 409, 422):
            raise ValueError(message)

        if response.status_code >= 500:
            raise ValueError(
                "A Presença Bank está temporariamente indisponível."
            )

        if not response.is_success:
            raise ValueError(
                f"Presença Bank retornou HTTP "
                f"{response.status_code}: {message}"
            )

        if not response.content:
            return {}

        try:
            return response.json()
        except ValueError:
            return {"raw": response.text}

    async def gerar_termo(
        self,
        cpf: str,
        nome: str,
        telefone: str,
    ) -> Dict[str, Any]:
        cpf_clean = self.limpar_documento(cpf)
        telefone_clean = self.limpar_documento(telefone)

        if len(cpf_clean) != 11:
            raise ValueError("CPF inválido.")

        if not str(nome or "").strip():
            raise ValueError("Nome do cliente é obrigatório.")

        if len(telefone_clean) not in (10, 11):
            raise ValueError("Telefone inválido.")

        return await self._request(
            "POST",
            "/consultas/termo-inss",
            {
                "cpf": cpf_clean,
                "nome": str(nome).strip(),
                "telefone": telefone_clean,
                "produtoId": self.product_id,
            },
        )

    async def consultar_vinculos(
        self,
        cpf: str,
    ) -> Any:
        cpf_clean = self.limpar_documento(cpf)

        if len(cpf_clean) != 11:
            raise ValueError("CPF inválido.")

        return await self._request(
            "POST",
            "/v3/operacoes/consignado-privado/"
            "consultar-vinculos",
            {"cpf": cpf_clean},
        )

    async def consultar_margem(
        self,
        cpf: str,
        matricula: str,
        cnpj: str,
    ) -> Any:
        cpf_clean = self.limpar_documento(cpf)
        matricula_clean = str(matricula or "").strip()
        cnpj_clean = self.limpar_documento(cnpj)

        if len(cpf_clean) != 11:
            raise ValueError("CPF inválido.")

        if not matricula_clean:
            raise ValueError("Matrícula é obrigatória.")

        if not cnpj_clean:
            raise ValueError(
                "CNPJ ou inscrição do empregador é obrigatório."
            )

        return await self._request(
            "POST",
            "/v3/operacoes/consignado-privado/"
            "consultar-margem",
            {
                "cpf": cpf_clean,
                "matricula": matricula_clean,
                "cnpj": cnpj_clean,
            },
        )

    async def consultar_tabelas(
        self,
        payload: Dict[str, Any],
    ) -> Any:
        return await self._request(
            "POST",
            "/v5/operacoes/simulacao/disponiveis",
            payload,
        )

    @staticmethod
    def _formatar_brl(value: float) -> str:
        formatted = f"{float(value):,.2f}"
        formatted = formatted.replace(",", "X")
        formatted = formatted.replace(".", ",")
        formatted = formatted.replace("X", ".")
        return f"R$ {formatted}"

    @classmethod
    def _extrair_limites_permitidos(
        cls,
        message: str,
    ) -> List[float]:
        text = str(message or "")
        patterns = re.findall(
            r"valor\s+m[aá]ximo\s+permitido\s*[^0-9]*([0-9][0-9.,]*)",
            text,
            flags=re.IGNORECASE,
        )

        limits: List[float] = []

        for raw in patterns:
            candidate = str(raw).strip().rstrip(".,")

            try:
                # O retorno atual da API usa o padrão 15,000.00.
                if "," in candidate and "." in candidate:
                    value = float(candidate.replace(",", ""))
                elif "," in candidate:
                    value = float(candidate.replace(".", "").replace(",", "."))
                else:
                    value = float(candidate)
            except ValueError:
                continue

            rounded = round(value, 2)
            if rounded > 0 and rounded not in limits:
                limits.append(rounded)

        return sorted(limits)

    @classmethod
    def _mensagem_ajuste_simulacao(
        cls,
        original_message: str,
        limits: List[float],
    ) -> str:
        if limits:
            formatted = [cls._formatar_brl(value) for value in limits]

            if len(formatted) == 1:
                limits_text = formatted[0]
            else:
                limits_text = ", ".join(formatted[:-1]) + f" e {formatted[-1]}"

            return (
                "O valor calculado ultrapassou o limite permitido "
                f"pelas tabelas disponíveis. Limites identificados: {limits_text}. "
                "Informe uma parcela ou um valor de contrato menor para gerar "
                "uma nova simulação."
            )

        return (
            "O valor calculado ultrapassou o limite permitido pelas tabelas "
            "disponíveis. Informe uma parcela ou um valor de contrato menor "
            "para gerar uma nova simulação."
        )

    @classmethod
    def salvar_contexto_simulacao(
        cls,
        context: Dict[str, Any],
    ) -> None:
        cpf = cls.limpar_documento(context.get("cpf"))
        if len(cpf) != 11:
            return

        cls._simulation_context_cache[cpf] = {
            "expires_at": datetime.now(timezone.utc) + cls._simulation_context_ttl,
            "data": dict(context),
        }

    @classmethod
    def obter_contexto_simulacao(
        cls,
        cpf: str,
    ) -> Optional[Dict[str, Any]]:
        cpf_clean = cls.limpar_documento(cpf)
        cached = cls._simulation_context_cache.get(cpf_clean)
        if not cached:
            return None

        expires_at = cached.get("expires_at")
        if not isinstance(expires_at, datetime) or expires_at <= datetime.now(timezone.utc):
            cls._simulation_context_cache.pop(cpf_clean, None)
            return None

        data = cached.get("data")
        return dict(data) if isinstance(data, dict) else None

    @staticmethod
    def _montar_contexto_simulacao(
        *,
        cpf: str,
        nome: str,
        telefone: str,
        email: str,
        data_nascimento: str,
        nome_mae: str,
        sexo: str,
        cnpj_empregador: str,
        matricula: str,
        margem_disponivel: float,
        margem_base: float = 0.0,
        total_devido: float = 0.0,
    ) -> Dict[str, Any]:
        return {
            "cpf": cpf,
            "nome": str(nome or "").strip(),
            "telefone": str(telefone or "").strip(),
            "email": str(email or "").strip(),
            "data_nascimento": str(data_nascimento or "").strip(),
            "nome_mae": str(nome_mae or "").strip(),
            "sexo": str(sexo or "").strip(),
            "cnpj_empregador": str(cnpj_empregador or "").strip(),
            "matricula": str(matricula or "").strip(),
            "margem_disponivel": round(float(margem_disponivel or 0), 2),
            "margem_base": round(float(margem_base or 0), 2),
            "total_devido": round(float(total_devido or 0), 2),
        }

    def _montar_payload_simulacao(
        self,
        *,
        cpf: str,
        nome: str,
        telefone: str,
        email: str,
        data_nascimento: str,
        nome_mae: str,
        sexo: str,
        cnpj_empregador: str,
        matricula: str,
        valor_parcela: Optional[float],
        valor_solicitado: Optional[float],
        quantidade_parcelas: Optional[int],
    ) -> Dict[str, Any]:
        phone_data = self.separar_telefone(telefone)

        return {
            "tomador": {
                "telefone": phone_data,
                "cpf": self.limpar_documento(cpf),
                "nome": str(nome or "").strip(),
                "dataNascimento": str(data_nascimento or "").strip(),
                "nomeMae": str(nome_mae or "").strip(),
                "email": str(email or "").strip(),
                "sexo": str(sexo or "").strip(),
                "vinculoEmpregaticio": {
                    "cnpjEmpregador": self.limpar_documento(cnpj_empregador),
                    "registroEmpregaticio": str(matricula or "").strip(),
                },
                "dadosBancarios": {
                    "codigoBanco": None,
                    "agencia": None,
                    "conta": None,
                    "digitoConta": None,
                    "formaCredito": None,
                },
                "endereco": {
                    "cep": "",
                    "rua": "",
                    "numero": "",
                    "complemento": "",
                    "cidade": "",
                    "estado": "",
                    "bairro": "",
                },
            },
            "proposta": {
                "valorSolicitado": round(float(valor_solicitado or 0), 2),
                "quantidadeParcelas": int(quantidade_parcelas or 0),
                "produtoId": self.product_id,
                "valorParcela": round(float(valor_parcela or 0), 2),
            },
            "documentos": [],
        }

    async def simular_com_contexto(
        self,
        *,
        cpf: str,
        nome: str,
        telefone: str,
        email: str,
        data_nascimento: str,
        nome_mae: str,
        sexo: str,
        cnpj_empregador: str,
        matricula: str,
        margem_disponivel: float,
        margem_base: float = 0.0,
        total_devido: float = 0.0,
        valor_parcela: Optional[float] = None,
        valor_solicitado: Optional[float] = None,
        quantidade_parcelas: Optional[int] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self.limpar_documento(cpf)
        cnpj_clean = self.limpar_documento(cnpj_empregador)
        matricula_clean = str(matricula or "").strip()

        if len(cpf_clean) != 11:
            raise ValueError("CPF inválido para a simulação.")

        required = {
            "nome": nome,
            "telefone": telefone,
            "email": email,
            "data de nascimento": data_nascimento,
            "nome da mãe": nome_mae,
            "sexo": sexo,
            "CNPJ do empregador": cnpj_clean,
            "matrícula": matricula_clean,
        }
        missing = [label for label, value in required.items() if not str(value or "").strip()]
        if missing:
            raise ValueError(
                "Dados insuficientes para simular: " + ", ".join(missing) + "."
            )

        parcela = float(valor_parcela) if valor_parcela is not None else None
        solicitado = float(valor_solicitado) if valor_solicitado is not None else None

        if parcela is not None and solicitado is not None:
            raise ValueError("Informe somente o valor da parcela ou o valor do contrato.")
        if parcela is None and solicitado is None:
            raise ValueError("Informe o valor da parcela ou o valor do contrato.")
        if parcela is not None and parcela <= 0:
            raise ValueError("O valor da parcela deve ser maior que zero.")
        if solicitado is not None and solicitado <= 0:
            raise ValueError("O valor do contrato deve ser maior que zero.")
        if parcela is not None and margem_disponivel and parcela > float(margem_disponivel):
            raise ValueError(
                "A parcela informada deve ser de até "
                f"{self._formatar_brl(margem_disponivel)}."
            )

        context = self._montar_contexto_simulacao(
            cpf=cpf_clean,
            nome=nome,
            telefone=telefone,
            email=email,
            data_nascimento=data_nascimento,
            nome_mae=nome_mae,
            sexo=sexo,
            cnpj_empregador=cnpj_clean,
            matricula=matricula_clean,
            margem_disponivel=margem_disponivel,
            margem_base=margem_base,
            total_devido=total_devido,
        )
        self.salvar_contexto_simulacao(context)

        payload = self._montar_payload_simulacao(
            cpf=cpf_clean,
            nome=nome,
            telefone=telefone,
            email=email,
            data_nascimento=data_nascimento,
            nome_mae=nome_mae,
            sexo=sexo,
            cnpj_empregador=cnpj_clean,
            matricula=matricula_clean,
            valor_parcela=parcela,
            valor_solicitado=solicitado,
            quantidade_parcelas=quantidade_parcelas,
        )

        try:
            raw_ofertas = await self.consultar_tabelas(payload)
        except ValueError as exc:
            raw_message = str(exc).strip()
            searchable = raw_message.upper()
            adjustable = any(
                term in searchable
                for term in (
                    "MARGEM_OU_VALOR_INSUFICIENTE",
                    "VALOR SOLICITADO",
                    "VALOR MÁXIMO PERMITIDO",
                    "VALOR MAXIMO PERMITIDO",
                )
            )
            if not adjustable:
                raise

            limits = self._extrair_limites_permitidos(raw_message)
            clean_message = self._mensagem_ajuste_simulacao(raw_message, limits)
            return {
                "success": False,
                "provider": "presenca_bank",
                "status": "ajuste_simulacao",
                "requires_adjustment": True,
                "contexto_simulacao": context,
                "margens": {
                    "disponivel": round(float(margem_disponivel or 0), 2),
                    "utilizada": parcela or 0.0,
                    "base": round(float(margem_base or 0), 2),
                    "total_devido": round(float(total_devido or 0), 2),
                },
                "simulacao_solicitada": {
                    "valor_parcela": parcela,
                    "valor_solicitado": solicitado,
                    "quantidade_parcelas": int(quantidade_parcelas or 0),
                },
                "limites_permitidos": limits,
                "mensagem": clean_message,
                "errors": [clean_message],
                "errorCodes": ["MARGEM_OU_VALOR_INSUFICIENTE"],
                "ofertas": [],
            }

        ofertas = self.normalizar_ofertas(raw_ofertas)
        melhor = max(ofertas, key=lambda item: item["valor_liberado"]) if ofertas else None

        return {
            "success": True,
            "provider": "presenca_bank",
            "status": "completed" if ofertas else "sem_ofertas",
            "requires_adjustment": False,
            "contexto_simulacao": context,
            "margens": {
                "disponivel": round(float(margem_disponivel or 0), 2),
                "utilizada": melhor["parcela"] if melhor else 0.0,
                "base": round(float(margem_base or 0), 2),
                "total_devido": round(float(total_devido or 0), 2),
            },
            "melhor_oferta": melhor,
            "ofertas": ofertas,
        }

    @staticmethod
    def normalizar_vinculos(
        response: Any,
    ) -> List[Dict[str, Any]]:
        if isinstance(response, list):
            raw_vinculos = response
        elif isinstance(response, dict):
            raw_vinculos = (
                response.get("id")
                or response.get("vinculos")
                or response.get("data")
                or []
            )
        else:
            raw_vinculos = []

        if not isinstance(raw_vinculos, list):
            raw_vinculos = []

        vinculos = []

        for index, item in enumerate(raw_vinculos, start=1):
            if not isinstance(item, dict):
                continue

            vinculos.append({
                "index": index,
                "matricula": str(
                    item.get("matricula") or ""
                ),
                "cnpj_empregador": str(
                    item.get(
                        "numeroInscricaoEmpregador"
                    ) or ""
                ),
                "elegivel": bool(
                    item.get("elegivel", False)
                ),
                "cpf": str(item.get("cpf") or ""),
            })

        return vinculos

    @staticmethod
    def normalizar_margem(
        response: Dict[str, Any],
    ) -> Dict[str, Any]:
        return {
            "disponivel": round(
                float(
                    response.get(
                        "valorMargemDisponivel",
                        response.get(
                            "valorMargemAvaliavel",
                            response.get("valorMargem", 0),
                        ),
                    )
                    or 0
                ),
                2,
            ),
            "base": round(
                float(
                    response.get(
                        "valorMargemBase",
                        response.get("valorBaseMargem", 0),
                    )
                    or 0
                ),
                2,
            ),
            "total_devido": round(
                float(
                    response.get(
                        "valorTotalDevido",
                        response.get(
                            "valorTotalVencimentos",
                            0,
                        ),
                    )
                    or 0
                ),
                2,
            ),
            "matricula": str(
                response.get(
                    "registroEmpregaticio",
                    response.get("matricula", ""),
                )
                or ""
            ),
            "cnpj_empregador": str(
                response.get(
                    "cnpjEmpregador",
                    response.get(
                        "numeroInscricaoEmpregador",
                        "",
                    ),
                )
                or ""
            ),
            "data_admissao": str(
                response.get("dataAdmissao") or ""
            ),
            "data_nascimento": str(
                response.get("dataNascimento") or ""
            ),
            "nome_mae": str(
                response.get("nomeMae") or ""
            ),
            "sexo": PresencaBankService.normalizar_sexo(
                response.get("sexo")
            ),
        }

    @staticmethod
    def normalizar_sexo(value: Any) -> str:
        normalized = str(value or "").strip().lower()

        if normalized in ("m", "masculino"):
            return "M"

        if normalized in ("f", "feminino"):
            return "F"

        return str(value or "").strip()

    @staticmethod
    def normalizar_ofertas(
        response: Any,
    ) -> List[Dict[str, Any]]:
        if isinstance(response, list):
            raw_ofertas = response
        elif isinstance(response, dict):
            raw_ofertas = (
                response.get("ofertas")
                or response.get("data")
                or response.get("id")
                or []
            )
        else:
            raw_ofertas = []

        if not isinstance(raw_ofertas, list):
            raw_ofertas = []

        ofertas = []

        for item in raw_ofertas:
            if not isinstance(item, dict):
                continue

            tipo_credito = item.get("tipoCredito") or {}

            ofertas.append({
                "banco": "Presença Bank",
                "tabela_id": int(item.get("id") or 0),
                "tabela": str(item.get("nome") or ""),
                "prazo": int(item.get("prazo") or 0),
                "taxa": round(
                    float(item.get("taxaJuros") or 0),
                    4,
                ),
                "parcela": round(
                    float(item.get("valorParcela") or 0),
                    2,
                ),
                "valor_liberado": round(
                    float(item.get("valorLiberado") or 0),
                    2,
                ),
                "tipo_credito": str(
                    tipo_credito.get("name") or ""
                ),
                "tipo_credito_id": int(
                    tipo_credito.get("id") or 0
                ),
                "produto_type": str(
                    item.get("type") or
                    tipo_credito.get("type") or ""
                ),
                "taxa_seguro": round(
                    float(item.get("taxaSeguro") or 0),
                    4,
                ),
                "valor_seguro": round(
                    float(item.get("valorSeguro") or 0),
                    2,
                ),
                "teste": bool(item.get("teste", False)),
            })

        return ofertas

    @staticmethod
    def separar_telefone(
        telefone: str,
    ) -> Dict[str, str]:
        clean = PresencaBankService.limpar_documento(
            telefone
        )

        if clean.startswith("55") and len(clean) in (12, 13):
            clean = clean[2:]

        if len(clean) not in (10, 11):
            raise ValueError("Telefone inválido.")

        return {
            "ddd": clean[:2],
            "numero": clean[2:],
        }

    async def processar_consulta(
        self,
        cpf: str,
        nome: str,
        telefone: str,
        email: Optional[str] = None,
        vinculo_index: Optional[int] = None,
        valor_parcela: Optional[float] = None,
        valor_solicitado: Optional[float] = None,
        quantidade_parcelas: Optional[int] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self.limpar_documento(cpf)

        try:
            raw_vinculos = await self.consultar_vinculos(
                cpf_clean
            )
        except ValueError as exc:
            message = str(exc).strip()

            if (
                "TERMO_INVALIDO_OU_AUSENTE"
                not in message.upper()
            ):
                raise

            termo = await self.gerar_termo(
                cpf=cpf_clean,
                nome=nome,
                telefone=telefone,
            )

            return {
                "success": True,
                "provider": "presenca_bank",
                "status": "awaiting_authorization",
                "requires_authorization": True,
                "requires_selection": False,
                "cpf": cpf_clean,
                "autorizacao_id": (
                    termo.get("autorizacaoId")
                    or termo.get("autorizacao_id")
                    or termo.get("id")
                ),
                "authorization_url": (
                    termo.get("shorturl")
                    or termo.get("shortUrl")
                    or termo.get("url")
                ),
                "vinculos": [],
                "ofertas": [],
            }

        vinculos = self.normalizar_vinculos(
            raw_vinculos
        )

        elegiveis = [
            vinculo
            for vinculo in vinculos
            if vinculo["elegivel"]
        ]

        if not elegiveis:
            return {
                "success": True,
                "provider": "presenca_bank",
                "status": "sem_vinculo_elegivel",
                "cpf": cpf_clean,
                "requires_selection": False,
                "vinculos": vinculos,
                "ofertas": [],
            }

        if len(elegiveis) > 1 and vinculo_index is None:
            return {
                "success": True,
                "provider": "presenca_bank",
                "status": "requires_selection",
                "cpf": cpf_clean,
                "requires_selection": True,
                "vinculos": elegiveis,
                "ofertas": [],
            }

        selected_position = (
            int(vinculo_index or 1) - 1
        )

        if (
            selected_position < 0
            or selected_position >= len(elegiveis)
        ):
            raise ValueError(
                "O vínculo selecionado não existe."
            )

        vinculo = elegiveis[selected_position]

        raw_margem = await self.consultar_margem(
            cpf_clean,
            vinculo["matricula"],
            vinculo["cnpj_empregador"],
        )

        margem = self.normalizar_margem(raw_margem)

        if margem["disponivel"] <= 0:
            return {
                "success": True,
                "provider": "presenca_bank",
                "status": "sem_margem",
                "requires_selection": False,
                "contexto_simulacao": self._montar_contexto_simulacao(
                    cpf=cpf_clean,
                    nome=nome,
                    telefone=telefone,
                    email=email_final,
                    data_nascimento=margem["data_nascimento"],
                    nome_mae=margem["nome_mae"],
                    sexo=margem["sexo"],
                    cnpj_empregador=(
                        margem["cnpj_empregador"]
                        or vinculo["cnpj_empregador"]
                    ),
                    matricula=(
                        margem["matricula"]
                        or vinculo["matricula"]
                    ),
                    margem_disponivel=margem["disponivel"],
                    margem_base=margem["base"],
                    total_devido=margem["total_devido"],
                ),
                "cliente": {
                    "cpf": cpf_clean,
                    "nome": str(nome or "").strip(),
                    "data_nascimento": margem[
                        "data_nascimento"
                    ],
                    "nome_mae": margem["nome_mae"],
                    "sexo": margem["sexo"],
                },
                "vinculo": vinculo,
                "margens": {
                    "disponivel": margem["disponivel"],
                    "utilizada": 0.0,
                    "base": margem["base"],
                    "total_devido": margem[
                        "total_devido"
                    ],
                },
                "ofertas": [],
            }

        email_final = str(
            email
            or os.getenv(
                "PRESENA_BANK_DEFAULT_EMAIL",
                "",
            )
        ).strip()

        if not email_final:
            raise ValueError(
                "E-mail é obrigatório para consultar "
                "as tabelas da Presença Bank."
            )

        context = self._montar_contexto_simulacao(
            cpf=cpf_clean,
            nome=nome,
            telefone=telefone,
            email=email_final,
            data_nascimento=margem["data_nascimento"],
            nome_mae=margem["nome_mae"],
            sexo=margem["sexo"],
            cnpj_empregador=(
                margem["cnpj_empregador"]
                or vinculo["cnpj_empregador"]
            ),
            matricula=(
                margem["matricula"]
                or vinculo["matricula"]
            ),
            margem_disponivel=margem["disponivel"],
            margem_base=margem["base"],
            total_devido=margem["total_devido"],
        )
        self.salvar_contexto_simulacao(context)

        phone_data = self.separar_telefone(
            telefone
        )

        parcela_desejada = (
            float(valor_parcela)
            if valor_parcela is not None
            else None
        )
        valor_desejado = (
            float(valor_solicitado)
            if valor_solicitado is not None
            else None
        )

        if (
            parcela_desejada is not None
            and valor_desejado is not None
        ):
            raise ValueError(
                "Informe somente o valor da parcela "
                "ou o valor do contrato."
            )

        if (
            parcela_desejada is not None
            and parcela_desejada > margem["disponivel"]
        ):
            return {
                "success": False,
                "provider": "presenca_bank",
                "status": "ajuste_simulacao",
                "requires_adjustment": True,
                "requires_selection": False,
                "contexto_simulacao": context,
                "cliente": {
                    "cpf": cpf_clean,
                    "nome": str(nome or "").strip(),
                    "data_nascimento": margem[
                        "data_nascimento"
                    ],
                    "nome_mae": margem["nome_mae"],
                    "sexo": margem["sexo"],
                },
                "vinculo": vinculo,
                "margens": {
                    "disponivel": margem["disponivel"],
                    "utilizada": 0.0,
                    "base": margem["base"],
                    "total_devido": margem["total_devido"],
                },
                "mensagem": (
                    "O valor da parcela informado é maior "
                    "que a margem disponível."
                ),
                "errors": [
                    "Informe uma parcela de até "
                    f"R$ {margem['disponivel']:.2f}."
                ],
                "errorCodes": [
                    "MARGEM_OU_VALOR_INSUFICIENTE"
                ],
                "ofertas": [],
            }

        simulation_payload = {
            "tomador": {
                "telefone": phone_data,
                "cpf": cpf_clean,
                "nome": str(nome or "").strip(),
                "dataNascimento": margem[
                    "data_nascimento"
                ],
                "nomeMae": margem["nome_mae"],
                "email": email_final,
                "sexo": margem["sexo"],
                "vinculoEmpregaticio": {
                    "cnpjEmpregador": (
                        margem["cnpj_empregador"]
                        or vinculo["cnpj_empregador"]
                    ),
                    "registroEmpregaticio": (
                        margem["matricula"]
                        or vinculo["matricula"]
                    ),
                },
                "dadosBancarios": {
                    "codigoBanco": None,
                    "agencia": None,
                    "conta": None,
                    "digitoConta": None,
                    "formaCredito": None,
                },
                "endereco": {
                    "cep": "",
                    "rua": "",
                    "numero": "",
                    "complemento": "",
                    "cidade": "",
                    "estado": "",
                    "bairro": "",
                },
            },
            "proposta": {
                "valorSolicitado": (
                    round(valor_desejado, 2)
                    if valor_desejado is not None
                    else 0
                ),
                "quantidadeParcelas": int(
                    quantidade_parcelas or 0
                ),
                "produtoId": self.product_id,
                "valorParcela": (
                    round(parcela_desejada, 2)
                    if parcela_desejada is not None
                    else (
                        0
                        if valor_desejado is not None
                        else margem["disponivel"]
                    )
                ),
            },
            "documentos": [],
        }

        try:
            raw_ofertas = await self.consultar_tabelas(
                simulation_payload
            )
        except ValueError as exc:
            error_message = str(exc).strip()
            searchable_error = error_message.upper()

            adjustable_error = any(
                term in searchable_error
                for term in (
                    "MARGEM_OU_VALOR_INSUFICIENTE",
                    "VALOR SOLICITADO",
                    "VALOR MÁXIMO PERMITIDO",
                    "VALOR MAXIMO PERMITIDO",
                    "MARGEM INSUFICIENTE",
                )
            )

            if not adjustable_error:
                raise

            limits = self._extrair_limites_permitidos(error_message)
            clean_message = self._mensagem_ajuste_simulacao(
                error_message,
                limits,
            )

            return {
                "success": False,
                "provider": "presenca_bank",
                "status": "ajuste_simulacao",
                "requires_adjustment": True,
                "requires_selection": False,
                "contexto_simulacao": context,
                "cliente": {
                    "cpf": cpf_clean,
                    "nome": str(nome or "").strip(),
                    "data_nascimento": margem[
                        "data_nascimento"
                    ],
                    "nome_mae": margem["nome_mae"],
                    "sexo": margem["sexo"],
                },
                "vinculo": vinculo,
                "margens": {
                    "disponivel": margem["disponivel"],
                    "utilizada": (
                        parcela_desejada
                        or margem["disponivel"]
                    ),
                    "base": margem["base"],
                    "total_devido": margem["total_devido"],
                },
                "simulacao_solicitada": {
                    "valor_parcela": parcela_desejada,
                    "valor_solicitado": valor_desejado,
                    "quantidade_parcelas": int(
                        quantidade_parcelas or 0
                    ),
                },
                "limites_permitidos": limits,
                "mensagem": clean_message,
                "errors": [clean_message],
                "errorCodes": [
                    "MARGEM_OU_VALOR_INSUFICIENTE"
                ],
                "ofertas": [],
            }

        ofertas = self.normalizar_ofertas(
            raw_ofertas
        )

        melhor_oferta = None

        if ofertas:
            melhor_oferta = max(
                ofertas,
                key=lambda oferta: oferta[
                    "valor_liberado"
                ],
            )

        return {
            "success": True,
            "provider": "presenca_bank",
            "status": (
                "completed"
                if ofertas
                else "sem_ofertas"
            ),
            "requires_selection": False,
            "contexto_simulacao": context,
            "cliente": {
                "cpf": cpf_clean,
                "nome": str(nome or "").strip(),
                "data_nascimento": margem[
                    "data_nascimento"
                ],
                "nome_mae": margem["nome_mae"],
                "sexo": margem["sexo"],
            },
            "vinculo": {
                **vinculo,
                "data_admissao": margem[
                    "data_admissao"
                ],
            },
            "margens": {
                "disponivel": margem["disponivel"],
                "utilizada": (
                    melhor_oferta["parcela"]
                    if melhor_oferta
                    else 0.0
                ),
                "base": margem["base"],
                "total_devido": margem[
                    "total_devido"
                ],
            },
            "melhor_oferta": melhor_oferta,
            "ofertas": ofertas,
        }
