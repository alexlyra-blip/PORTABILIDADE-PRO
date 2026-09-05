import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.services.consultas.multicorban_provider import (
    MultiCorbanProvider,
)
from app.services.presenca_bank_service import (
    PresencaBankService,
)
from app.services.lotus_clt_service import LotusCltService
from app.services.c6_bank_service import (
    C6BankError,
    C6BankService,
)


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
        c6_credentials: Optional[Dict[str, Any]] = None,
    ):
        self.multicorban = MultiCorbanProvider()

        lotus_credentials = lotus_credentials or {}
        presenca_credentials = presenca_credentials or {}
        c6_credentials = c6_credentials or {}

        self.presenca = PresencaBankService(
            login=presenca_credentials.get("login"),
            password=presenca_credentials.get("password"),
        )

        self.lotus = LotusCltService(
            email=lotus_credentials.get("login"),
            password=lotus_credentials.get("password"),
        )

        self.c6 = C6BankService(
            credentials=c6_credentials,
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
        data_nascimento_informada: Optional[str] = None,
        vinculo_index: Optional[int] = None,
        valor_parcela: Optional[float] = None,
        valor_solicitado: Optional[float] = None,
        quantidade_parcelas: Optional[int] = None,
        lotus_proposal_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        cpf_clean = self._digits(cpf)

        if len(cpf_clean) != 11:
            raise ValueError("CPF inválido.")

        data_nascimento_raw = str(
            data_nascimento_informada
            or ""
        ).strip()

        data_nascimento = ""

        if data_nascimento_raw:
            for formato_data in (
                "%Y-%m-%d",
                "%d/%m/%Y",
            ):
                try:
                    data_nascimento = (
                        datetime.strptime(
                            data_nascimento_raw,
                            formato_data,
                        ).strftime(
                            "%Y-%m-%d"
                        )
                    )
                    break
                except ValueError:
                    continue

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

        async def executar_c6():
            # C6 participa somente quando
            # houver credenciais configuradas.
            if (
                not self.c6.username
                or not self.c6.password
            ):
                return None

            campos_pendentes = []

            if not nome:
                campos_pendentes.append("nome")

            if not data_nascimento:
                campos_pendentes.append(
                    "data_nascimento"
                )

            if campos_pendentes:
                return {
                    "banco_id": "c6_bank",
                    "banco": "C6 Bank",
                    "status": "dados_incompletos",
                    "mensagem": (
                        "Informe os dados obrigatorios "
                        "para consultar o C6 Bank."
                    ),
                    "campos_pendentes": campos_pendentes,
                    "ofertas": [],
                }

            # Primeiro consulta o status atual.
            try:
                status_result = (
                    await self.c6.consultar_status_autorizacao(
                        cpf_clean
                    )
                )

                c6_status = str(
                    status_result.get("status")
                    or ""
                ).strip().upper()

                print(
                    "[C6 CLT STATUS]",
                    {
                        "status": c6_status or None,
                        "observacao": (
                            status_result.get("observacao")
                            or None
                        ),
                        "data_expiracao": (
                            (status_result.get("raw_status") or {}).get(
                                "data_expiracao"
                            )
                        ),
                    },
                )

                raw_status = (
                    status_result.get("raw_status")
                    or {}
                )

                # Autorizacao confirmada pelo C6.
                if c6_status in {
                    "AUTHORIZED",
                    "AUTORIZADO",
                }:
                    return {
                        **status_result,
                        "status": "authorized",
                        "authorization_status": c6_status,
                        "requires_authorization": False,
                        "data_expiracao": (
                            raw_status.get("data_expiracao")
                        ),
                        "mensagem": (
                            "Autorizacao C6 confirmada. "
                            "Simulacao C6 ainda nao executada."
                        ),
                        "ofertas": [],
                    }

                # Existe uma autorizacao criada e o C6
                # ainda esta processando a conclusao.
                # NUNCA gerar outro link neste estado.
                if c6_status in {
                    "AGUARDANDO_AUTORIZACAO",
                    "AWAITING_AUTHORIZATION",
                    "WAITING_FOR_AUTHORIZATION",
                    "AWAITING",
                    "PENDING",
                    "WAITING",
                }:
                    return {
                        **status_result,
                        "status": "awaiting_authorization",
                        "authorization_status": c6_status,
                        "requires_authorization": True,
                        "authorization_pending": True,
                        "mensagem": (
                            "Autorizacao C6 ja existente. "
                            "Aguardando confirmacao do banco. "
                            "Nenhum novo link foi gerado."
                        ),
                        "ofertas": [],
                    }

                # Apenas estados realmente negativos
                # seguem para uma nova autorizacao.
                if c6_status not in {
                    "NAO_AUTORIZADO",
                    "UNAUTHORIZED",
                    "REPROVED",
                    "REJECTED",
                    "EXPIRED",
                    "EXPIRADO",
                }:
                    return {
                        **status_result,
                        "status": "processing",
                        "authorization_status": c6_status,
                        "requires_authorization": False,
                        "mensagem": (
                            "Status de autorizacao C6 "
                            "ainda em processamento."
                        ),
                        "ofertas": [],
                    }

            except C6BankError:
                # Quando ainda nao existe autorizacao
                # cadastrada, o fluxo pode gerar o
                # primeiro link normalmente.
                pass

            except Exception:
                # Mantem isolamento do C6 em relacao
                # aos demais bancos.
                pass

            # Cliente ainda nao esta autorizado.
            # Gera o link de liveness do C6.
            try:
                result = (
                    await self.c6.gerar_link_autorizacao(
                        cpf=cpf_clean,
                        nome=nome,
                        data_nascimento=data_nascimento,
                        telefone=telefone or None,
                    )
                )

                return {
                    **result,
                    "ofertas": [],
                }

            except C6BankError as exc:
                return {
                    "banco_id": "c6_bank",
                    "banco": "C6 Bank",
                    "status": "erro_banco",
                    "mensagem": str(exc),
                    "codigo": exc.code,
                    "http_status": exc.status_code,
                    "ofertas": [],
                }

            except Exception as exc:
                return {
                    "banco_id": "c6_bank",
                    "banco": "C6 Bank",
                    "status": "erro_banco",
                    "mensagem": (
                        "Nao foi possivel concluir "
                        "a autorizacao C6."
                    ),
                    "erro_tipo": type(exc).__name__,
                    "ofertas": [],
                }


        banco_presenca, banco_lotus, banco_c6 = await asyncio.gather(
            executar_presenca(),
            executar_lotus(),
            executar_c6(),
        )

        bancos = [
            bank
            for bank in (
                banco_presenca,
                banco_lotus,
                banco_c6,
            )
            if bank is not None
        ]
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

        bank_pending_fields = sorted({
            field
            for bank in bancos
            for field in (
                bank.get("campos_pendentes")
                or []
            )
            if field
        })

        statuses = [str(bank.get("status") or "") for bank in bancos]
        if "requires_selection" in statuses:
            overall_status = "requires_selection"
        elif "dados_incompletos" in statuses:
            overall_status = "dados_incompletos"
        elif "awaiting_authorization" in statuses:
            overall_status = "awaiting_authorization"
        elif "processing" in statuses:
            overall_status = "processing"
        elif "ajuste_simulacao" in statuses:
            overall_status = "ajuste_simulacao"
        elif "authorized" in statuses:
            overall_status = "authorized"
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
            "requires_customer_data": bool(
                bank_pending_fields
            ),
            "campos_pendentes": bank_pending_fields,
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
