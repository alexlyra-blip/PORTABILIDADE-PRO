import asyncio
from typing import Any, Dict, List, Optional

from app.services.consultas.multicorban_provider import (
    MultiCorbanProvider,
)
from app.services.presenca_bank_service import (
    PresencaBankService,
)
from app.services.lotus_clt_service import LotusCltService


class CltOrchestrator:
    """
    Orquestrador genérico de consultas CLT.

    A MultiCorban é utilizada para enriquecimento de dados.
    Cada banco CLT é consultado por um serviço independente.
    """

    def __init__(
        self,
        lotus_credentials: Optional[Dict[str, Any]] = None,
        presenca_credentials: Optional[Dict[str, Any]] = None,
    ):
        self.multicorban = MultiCorbanProvider()

        lotus_credentials = lotus_credentials or {}
        presenca_credentials = presenca_credentials or {}

        self.presenca = PresencaBankService(
            login=presenca_credentials.get("login"),
            password=presenca_credentials.get("password"),
        )

        self.lotus = LotusCltService(
            email=lotus_credentials.get("login"),
            password=lotus_credentials.get("password"),
        )

    @staticmethod
    def _to_dict(value: Any) -> Dict[str, Any]:
        if value is None:
            return {}

        if isinstance(value, dict):
            return value

        if hasattr(value, "model_dump"):
            return value.model_dump()

        if hasattr(value, "dict"):
            return value.dict()

        return {}

    @staticmethod
    def _digits(value: Any) -> str:
        return "".join(
            character
            for character in str(value or "")
            if character.isdigit()
        )

    @staticmethod
    def _normalizar_nome(value: Any) -> str:
        return " ".join(
            str(value or "").strip().split()
        )

    @classmethod
    def _normalizar_telefone(
        cls,
        value: Any,
    ) -> str:
        telefone = cls._digits(value)

        if telefone.startswith("55") and len(telefone) in (
            12,
            13,
        ):
            telefone = telefone[2:]

        if len(telefone) not in (10, 11):
            return ""

        if len(set(telefone)) == 1:
            return ""

        return telefone

    @staticmethod
    def _normalizar_email(value: Any) -> str:
        email = str(value or "").strip().lower()

        if not email or "@" not in email:
            return ""

        local, domain = email.split("@", 1)

        if not local or not domain or "." not in domain:
            return ""

        return email

    @classmethod
    def _extrair_telefone_item(
        cls,
        item: Any,
    ) -> str:
        if isinstance(item, dict):
            for key in (
                "telefone",
                "celular",
                "numero",
                "whatsapp",
                "phone",
                "mobile",
            ):
                telefone = cls._normalizar_telefone(
                    item.get(key)
                )

                if telefone:
                    return telefone

            return ""

        return cls._normalizar_telefone(item)

    @classmethod
    def _extrair_dados_multicorban(
        cls,
        response: Any,
    ) -> Dict[str, str]:
        data = cls._to_dict(response)
        cliente = cls._to_dict(
            data.get("cliente")
        )

        nome = ""

        for value in (
            cliente.get("nome"),
            cliente.get("nome_cliente"),
            data.get("nome"),
            data.get("nome_cliente"),
        ):
            nome = cls._normalizar_nome(value)

            if nome:
                break

        telefone = ""

        raw_telefones = (
            data.get("telefones")
            or cliente.get("telefones")
            or []
        )

        if not isinstance(raw_telefones, list):
            raw_telefones = [raw_telefones]

        for item in raw_telefones:
            telefone = cls._extrair_telefone_item(
                item
            )

            if telefone:
                break

        if not telefone:
            for value in (
                cliente.get("telefone"),
                cliente.get("celular"),
                cliente.get("whatsapp"),
                data.get("telefone"),
                data.get("celular"),
            ):
                telefone = cls._normalizar_telefone(
                    value
                )

                if telefone:
                    break

        email = ""

        for value in (
            cliente.get("email"),
            cliente.get("e_mail"),
            data.get("email"),
            data.get("e_mail"),
        ):
            email = cls._normalizar_email(value)

            if email:
                break

        return {
            "nome": nome,
            "telefone": telefone,
            "email": email,
        }

    @staticmethod
    def _mascarar_telefone(
        telefone: str,
    ) -> str:
        clean = CltOrchestrator._digits(telefone)

        if len(clean) < 6:
            return "***"

        return (
            f"{clean[:2]}"
            f"*****"
            f"{clean[-4:]}"
        )

    async def processar(
        self,
        cpf: str,
        nome_informado: Optional[str] = None,
        telefone_informado: Optional[str] = None,
        email_informado: Optional[str] = None,
        vinculo_index: Optional[int] = None,
        valor_parcela: Optional[float] = None,
        valor_solicitado: Optional[float] = None,
        quantidade_parcelas: Optional[int] = None,
        lotus_proposal_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self._digits(cpf)

        if len(cpf_clean) != 11:
            raise ValueError("CPF inválido.")

        dados_multicorban = {
            "nome": "",
            "telefone": "",
            "email": "",
        }

        multicorban_error = None

        try:
            multicorban_response = (
                await self.multicorban.consultar_por_cpf(
                    cpf_clean,
                    convenio="CLT",
                )
            )

            dados_multicorban = (
                self._extrair_dados_multicorban(
                    multicorban_response
                )
            )
        except Exception as exc:
            # A indisponibilidade da MultiCorban não impede
            # o fluxo caso o corretor tenha informado os dados.
            multicorban_error = str(exc)

        nome_manual = self._normalizar_nome(
            nome_informado
        )

        telefone_manual = self._normalizar_telefone(
            telefone_informado
        )

        email_manual = self._normalizar_email(
            email_informado
        )

        # Dados informados pelo corretor têm prioridade.
        nome = (
            nome_manual
            or dados_multicorban["nome"]
        )

        telefone = (
            telefone_manual
            or dados_multicorban["telefone"]
        )

        email = (
            email_manual
            or dados_multicorban["email"]
        )

        fonte_nome = (
            "informado_pelo_corretor"
            if nome_manual
            else (
                "multicorban"
                if dados_multicorban["nome"]
                else ""
            )
        )

        fonte_telefone = (
            "informado_pelo_corretor"
            if telefone_manual
            else (
                "multicorban"
                if dados_multicorban["telefone"]
                else ""
            )
        )

        fonte_email = (
            "informado_pelo_corretor"
            if email_manual
            else (
                "multicorban"
                if dados_multicorban["email"]
                else ""
            )
        )

        pendencias: List[str] = []

        if not nome:
            pendencias.append("nome")

        if not telefone:
            pendencias.append("telefone")

        if not email:
            pendencias.append("email")

        if pendencias:
            mensagens = {
                "nome": (
                    "Informe o nome completo do cliente."
                ),
                "telefone": (
                    "Informe o telefone do cliente com DDD."
                ),
                "email": (
                    "Informe o e-mail do cliente."
                ),
            }

            return {
                "success": True,
                "status": "dados_incompletos",
                "requires_customer_data": True,
                "campos_pendentes": pendencias,
                "mensagem": " ".join(
                    mensagens[campo]
                    for campo in pendencias
                ),
                "cliente": {
                    "cpf": cpf_clean,
                    "nome": nome,
                    "telefone": telefone,
                    "email": email,
                },
                "dados_multicorban": {
                    "nome": dados_multicorban["nome"],
                    "telefone": (
                        self._mascarar_telefone(
                            dados_multicorban["telefone"]
                        )
                        if dados_multicorban["telefone"]
                        else ""
                    ),
                    "email": dados_multicorban["email"],
                },
                "fontes_dados": {
                    "nome": fonte_nome,
                    "telefone": fonte_telefone,
                    "email": fonte_email,
                },
                "multicorban_error": multicorban_error,
                "bancos": [],
            }

        async def executar_presenca():
            try:
                result = await self.presenca.processar_consulta(
                    cpf=cpf_clean,
                    nome=nome,
                    telefone=telefone,
                    email=email,
                    vinculo_index=vinculo_index,
                    valor_parcela=valor_parcela,
                    valor_solicitado=valor_solicitado,
                    quantidade_parcelas=quantidade_parcelas,
                )
                return {
                    **result,
                    "banco_id": "presenca_bank",
                    "banco": "Presença Bank",
                }
            except Exception as exc:
                return {
                    "banco_id": "presenca_bank",
                    "banco": "Presença Bank",
                    "status": "erro_banco",
                    "mensagem": str(exc),
                    "ofertas": [],
                }

        async def executar_lotus():
            try:
                return await self.lotus.consultar_fluxo(
                    cpf=cpf_clean,
                    nome=nome,
                    telefone=telefone,
                    proposal_id=lotus_proposal_id,
                    valor_solicitado=valor_solicitado,
                )
            except Exception as exc:
                return {
                    "banco_id": "lotus_mais",
                    "banco": "Lotus Mais",
                    "status": "erro_banco",
                    "mensagem": str(exc),
                    "ofertas": [],
                }

        banco_presenca, banco_lotus = await asyncio.gather(
            executar_presenca(),
            executar_lotus(),
        )

        bancos = [banco_presenca, banco_lotus]
        autorizacoes = []
        for bank in bancos:
            url = bank.get("authorization_url")
            if bank.get("status") == "awaiting_authorization" and url:
                autorizacoes.append(
                    {
                        "banco_id": bank.get("banco_id"),
                        "banco": bank.get("banco"),
                        "id": bank.get("autorizacao_id") or bank.get("proposal_id"),
                        "url": url,
                    }
                )

        statuses = [str(bank.get("status") or "") for bank in bancos]
        if "requires_selection" in statuses:
            overall_status = "requires_selection"
        elif "awaiting_authorization" in statuses:
            overall_status = "awaiting_authorization"
        elif "processing" in statuses:
            overall_status = "processing"
        elif "ajuste_simulacao" in statuses:
            overall_status = "ajuste_simulacao"
        elif "completed" in statuses:
            overall_status = "completed"
        elif all(status == "erro_banco" for status in statuses):
            overall_status = "erro_bancos"
        elif any(
            status in {
                "cliente_nao_elegivel",
                "empresa_nao_elegivel",
                "sem_vinculo_elegivel",
                "sem_margem",
                "sem_ofertas",
            }
            for status in statuses
        ):
            overall_status = "completed"
        else:
            overall_status = statuses[0] or "processing"

        return {
            "success": True,
            "status": overall_status,
            "requires_customer_data": False,
            "cliente": {
                "cpf": cpf_clean,
                "nome": nome,
                "telefone": telefone,
                "email": email,
            },
            "fontes_dados": {
                "nome": fonte_nome,
                "telefone": fonte_telefone,
                "email": fonte_email,
            },
            "multicorban_error": multicorban_error,
            # Compatibilidade com o frontend antigo.
            "autorizacao": autorizacoes[0] if autorizacoes else None,
            "autorizacoes": autorizacoes,
            "bancos": bancos,
        }
