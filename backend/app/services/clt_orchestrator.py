from typing import Any, Dict, List, Optional

from app.services.consultas.multicorban_provider import (
    MultiCorbanProvider,
)
from app.services.presenca_bank_service import (
    PresencaBankService,
)


class CltOrchestrator:
    """
    Orquestrador genérico de consultas CLT.

    A MultiCorban é utilizada para enriquecimento de dados.
    Cada banco CLT é consultado por um serviço independente.
    """

    def __init__(self):
        self.multicorban = MultiCorbanProvider()
        self.presenca = PresencaBankService()

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

        empresa_obj = (
            cls._to_dict(cliente.get("empresa"))
            or cls._to_dict(data.get("empresa"))
            or cls._to_dict(data.get("empresa_data"))
            or {}
        )
        razao_social = (
            empresa_obj.get("razao_social")
            or empresa_obj.get("Razão Social")
            or empresa_obj.get("Razao Social")
            or data.get("razao_social")
            or cliente.get("razao_social")
            or ""
        )
        cnpj_empresa = (
            empresa_obj.get("cnpj")
            or empresa_obj.get("CNPJ")
            or data.get("cnpj")
            or data.get("cnpj_empresa")
            or cliente.get("cnpj")
            or ""
        )
        quantidade_funcionarios = (
            empresa_obj.get("quantidade_funcionarios")
            or empresa_obj.get("Total de Registros")
            or data.get("quantidade_funcionarios")
            or data.get("total_registros")
            or 0
        )

        return {
            "nome": nome,
            "telefone": telefone,
            "email": email,
            "empresa": {
                "razao_social": razao_social,
                "cnpj": cnpj_empresa,
                "quantidade_funcionarios": quantidade_funcionarios,
            },
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
    ) -> Dict[str, Any]:
        cpf_clean = self._digits(cpf)

        if len(cpf_clean) != 11:
            raise ValueError("CPF inválido.")

        dados_multicorban = {
            "nome": "",
            "telefone": "",
            "email": "",
            "empresa": {},
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

        try:
            resultado_presenca = (
                await self.presenca.processar_consulta(
                    cpf=cpf_clean,
                    nome=nome,
                    telefone=telefone,
                    email=email,
                    vinculo_index=vinculo_index,
                    valor_parcela=valor_parcela,
                    valor_solicitado=valor_solicitado,
                    quantidade_parcelas=quantidade_parcelas,
                )
            )
        except Exception as exc:
            err_msg = str(exc)
            status_code = "empresa_nao_elegivel" if "empresa" in err_msg.lower() else "banco_indisponivel"
            resultado_presenca = {
                "success": False,
                "status": status_code,
                "mensagem": err_msg,
                "errors": [err_msg],
                "vinculos": [],
                "ofertas": [],
            }

        banco_presenca = {
            **resultado_presenca,
            "banco_id": "presenca_bank",
            "banco": "Presença Bank",
        }

        autorizacao = None

        if (
            resultado_presenca.get("status")
            == "awaiting_authorization"
        ):
            autorizacao = {
                "banco_id": "presenca_bank",
                "banco": "Presença Bank",
                "id": resultado_presenca.get(
                    "autorizacao_id"
                ),
                "url": resultado_presenca.get(
                    "authorization_url"
                ),
            }

        empresa_dict = dict(dados_multicorban.get("empresa") or {})
        vinculos_presenca = resultado_presenca.get("vinculos") or []
        cnpj_presenca = (
            resultado_presenca.get("cnpj_empregador")
            or (vinculos_presenca[0].get("cnpj_empregador") if vinculos_presenca else "")
        )
        if not empresa_dict.get("cnpj") and cnpj_presenca:
            empresa_dict["cnpj"] = cnpj_presenca
        if not empresa_dict.get("quantidade_funcionarios") and len(vinculos_presenca) > 0:
            empresa_dict["quantidade_funcionarios"] = len(vinculos_presenca)

        return {
            "success": True,
            "status": resultado_presenca.get(
                "status"
            ),
            "requires_customer_data": False,
            "cliente": {
                "cpf": cpf_clean,
                "nome": nome,
                "telefone": telefone,
                "email": email,
            },
            "empresa": empresa_dict,
            "fontes_dados": {
                "nome": fonte_nome,
                "telefone": fonte_telefone,
                "email": fonte_email,
            },
            "multicorban_error": multicorban_error,
            "autorizacao": autorizacao,
            "bancos": [
                banco_presenca,
            ],
        }
