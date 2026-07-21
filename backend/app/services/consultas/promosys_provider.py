import os
import re
import httpx
import math
from typing import Dict, Any
import datetime

from app.services.consultas.base_provider import ConsultaBeneficioProvider
from app.services.consultas.margin_rules import recalculate_benefit_margins


def safe_float(value) -> float:
    """Converte números da API, inclusive valores no padrão brasileiro."""
    if value is None or value == "":
        return 0.0

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()
    text = re.sub(r"[^0-9,.-]", "", text)

    if not text or text in {"-", ".", ","}:
        return 0.0

    try:
        if "," in text and "." in text:
            if text.rfind(",") > text.rfind("."):
                # Exemplo brasileiro: 23.877,58
                text = text.replace(".", "").replace(",", ".")
            else:
                # Exemplo internacional: 23,877.58
                text = text.replace(",", "")
        elif "," in text:
            # Exemplo: 23877,58
            text = text.replace(".", "").replace(",", ".")
        elif text.count(".") > 1:
            # Mantém o último ponto como separador decimal.
            parts = text.split(".")
            text = "".join(parts[:-1]) + "." + parts[-1]

        return float(text)
    except (TypeError, ValueError):
        return 0.0


def money(value) -> float:
    return round(safe_float(value), 2)


def _normalize_contract_key(value: str) -> str:
    """Normaliza nomes de campos vindos do provedor."""
    return re.sub(
        r"[^a-z0-9]",
        "",
        str(value or "").lower(),
    )


def first_money_value(
    data: dict,
    *keys: str,
    absolute: bool = False,
) -> float:
    """Retorna o primeiro valor monetário não zero."""

    source = data or {}

    normalized_values = {
        _normalize_contract_key(key): value
        for key, value in source.items()
    }

    for key in keys:
        normalized_key = _normalize_contract_key(key)

        raw_value = (
            source.get(key)
            if key in source
            else normalized_values.get(normalized_key)
        )

        value = money(raw_value)

        if value != 0:
            return abs(value) if absolute else value

    return 0.0


def first_money_by_tokens(
    data: dict,
    *tokens: str,
    absolute: bool = False,
) -> float:
    """Procura campos monetários por partes normalizadas do nome."""

    normalized_tokens = [
        _normalize_contract_key(token)
        for token in tokens
    ]

    for key, raw_value in (data or {}).items():
        normalized_key = _normalize_contract_key(key)

        if not any(
            token in normalized_key
            for token in normalized_tokens
        ):
            continue

        value = money(raw_value)

        if value != 0:
            return abs(value) if absolute else value

    return 0.0


def normalize_promosys_contract_values(contract: dict) -> dict:
    """
    Mantém separados:
    - valor original do contrato;
    - valor efetivamente liberado;
    - saldo devedor/valor para quitação.
    """

    saldo_devedor = first_money_value(
        contract,
        "QUITACAOATUAL",
        "QuitacaoAtual",
        "quitacao_atual",
        "Quitacao",
        "QUITACAO",
        "quitacao",
        "Vl_Quitacao",
        "VL_QUITACAO",
        "VlrQuitacao",
        "ValorQuitacao",
        "Valor_Quitacao",
        "ValorQuitacaoAtual",
        "VlQuitacaoAtual",
        "VlrQuitacaoAtual",
        "SaldoDevedor",
        "SALDO_DEVEDOR",
        "saldo_devedor",
        "Saldo_Devedor",
        "SaldoDevedorAtual",
        "SaldoAtual",
        "ValorSaldoDevedor",
        "ValorLiquidacao",
        "Valor_Liquidacao",
        absolute=True,
    )

    if saldo_devedor == 0:
        saldo_devedor = first_money_by_tokens(
            contract,
            "saldodevedor",
            "quitacao",
            "liquidacao",
            absolute=True,
        )

    valor_liberado = first_money_value(
        contract,
        "ValorLiberado",
        "VALORLIBERADO",
        "valor_liberado",
        "Valor_Liberado",
        "Vl_Liberado",
        "VlrLiberado",
        "ValorLiquidoLiberado",
        absolute=True,
    )

    if valor_liberado == 0:
        valor_liberado = first_money_by_tokens(
            contract,
            "valorliberado",
            "vlliberado",
            "vlrliberado",
            absolute=True,
        )

    valor_contrato = first_money_value(
        contract,
        "Vl_Emprestimo",
        "VL_EMPRESTIMO",
        "vl_emprestimo",
        "VlrEmprestimo",
        "ValorEmprestimo",
        "Valor_Emprestimo",
        "ValorOriginal",
        "VALOR_ORIGINAL",
        "ValorContrato",
        "VALOR_CONTRATO",
        "valor_contrato",
        "ValorFinanciado",
        "VlFinanciado",
        "ValorOperacao",
        "ValorOperação",
        absolute=True,
    )

    if valor_contrato == 0:
        valor_contrato = first_money_by_tokens(
            contract,
            "valoremprestimo",
            "vlemprestimo",
            "vlremprestimo",
            "valorcontrato",
            "valororiginal",
            "valorfinanciado",
            "vlfinanciado",
            "valoroperacao",
            absolute=True,
        )

    # Não substituir valor do contrato pelo valor liberado.
    return {
        "quitacao": saldo_devedor,
        "saldo_devedor": saldo_devedor,
        "valor_liberado": valor_liberado,
        "valor_contrato": valor_contrato,
    }


def safe_int(value) -> int:
    try:
        if value is None or value == "":
            return 0
        return int(float(str(value).replace(",", ".")))
    except Exception:
        return 0


def safe_str(value) -> str:
    return str(value) if value is not None else ""


class PromosysProvider(ConsultaBeneficioProvider):
    _cached_token = None
    _token_expires_at = None
    _siape_clt_cache = {}

    def __init__(self):
        self.usuario = os.getenv("PROMOSYS_USUARIO", "ALXS")
        self.senha = os.getenv("PROMOSYS_SENHA", "48k6joB6cJPUlVAS")
        self.base_url = "https://jcf.promosysweb.com/services"

    async def _get_token(self, force_refresh=False) -> str:
        if not force_refresh and PromosysProvider._cached_token and PromosysProvider._token_expires_at:
            if datetime.datetime.now() < PromosysProvider._token_expires_at:
                return PromosysProvider._cached_token

        if not self.usuario or not self.senha:
            raise ValueError("PROMOSYS_USUARIO e PROMOSYS_SENHA não configurados.")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/token.php",
                data={
                    "usuario": self.usuario,
                    "senha": self.senha
                },
                timeout=30.0
            )

        data = response.json()

        if data.get("Code") != "000":
            raise ValueError(f"Erro ao gerar token Promosys: {data}")

        token = data.get("Token")

        if not token:
            raise ValueError(f"Token Promosys não retornado: {data}")

        # Cache o token por 12 horas
        PromosysProvider._cached_token = token
        PromosysProvider._token_expires_at = datetime.datetime.now() + datetime.timedelta(hours=12)

        return token

    async def consultar_por_cpf(self, cpf: str) -> Dict[str, Any]:
        try:
            return await self._do_consultar_por_cpf(cpf, force_refresh=False)
        except ValueError as e:
            if "token" in str(e).lower() or "autentica" in str(e).lower():
                # Tenta renovar o token
                return await self._do_consultar_por_cpf(cpf, force_refresh=True)
            raise e

    async def _do_consultar_por_cpf(self, cpf: str, force_refresh: bool) -> Dict[str, Any]:
        token = await self._get_token(force_refresh=force_refresh)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/consultaCpfOffline.php",
                data={
                    "token": token,
                    "cpf": cpf
                },
                timeout=60.0
            )

        data = response.json()

        if data.get("Code") == "401" or data.get("Code") == "202": # Assumindo erro de token expirado
            raise ValueError(f"Token expirado ou inválido: {data}")
            
        if data.get("Code") != "000":
            raise ValueError(f"Erro na consulta Promosys: {data}")

        consultas = data.get("Consulta", [])

        if not consultas:
            raise ValueError(f"Nenhum benefício encontrado na Promosys: {data}")

        raw = consultas[0]

        return await self._normalize_response(raw, cpf)

    async def _normalize_response(self, raw: dict, cpf: str) -> Dict[str, Any]:
        beneficio = raw.get("BENEFICIO", {}) or {}
        dados_bancarios = raw.get("DADOS_BANCARIOS", {}) or {}
        contratos = raw.get("CONTRATO", []) or []

        salario = safe_float(raw.get("MR"))
        total_comprometido = safe_float(beneficio.get("TotalComprometido"))

        margem_emprestimo = money(salario * 0.40)
        margem_cartao = money(salario * 0.05)
        margem_livre = money(margem_emprestimo - total_comprometido)

        rmc_promosys = safe_float(beneficio.get("ValorRMC"))
        rcc_promosys = safe_float(beneficio.get("ValorRCC"))

        possui_rmc = rmc_promosys > 0
        possui_rcc = rcc_promosys > 0
        possui_cartao = possui_rmc or possui_rcc

        cartao_utilizado = margem_cartao if possui_cartao else 0.0
        cartao_disponivel = 0.0 if possui_cartao else margem_cartao

        emprestimos = []
        cartoes = []

        for ct in contratos:
            tipo = safe_int(ct.get("Tipo_Emprestimo"))

            banco_nome = safe_str(ct.get("Banco_Nome"))
            banco_codigo = safe_str(ct.get("Banco"))
            contrato = safe_str(ct.get("Contrato"))
            parcela = money(ct.get("Vl_Parcela"))
            contract_values = normalize_promosys_contract_values(ct)
            quitacao = contract_values["quitacao"]
            saldo_devedor = contract_values["saldo_devedor"]
            valor_liberado = contract_values["valor_liberado"]
            valor_contrato = contract_values["valor_contrato"]
            prazo = safe_int(ct.get("Prazo"))
            parcelas_pagas = safe_int(ct.get("ParcPagas"))
            prazo_restante = max(0, prazo - parcelas_pagas)

            if tipo == 98:
                emprestimos.append({
                    "banco": banco_nome,
                    "codigo": banco_codigo,
                    "contrato": contrato,
                    "parcela": parcela,
                    "quitacao": quitacao,
                    "saldo_devedor": saldo_devedor,
                    "valor_liberado": valor_liberado,
                    "prazo": prazo,
                    "parcelas_pagas": parcelas_pagas,
                    "prazo_restante": prazo_restante,
                    "taxa": safe_float(ct.get("TaxaJuros")),
                    "taxa_ponderada": safe_float(ct.get("TaxaJurosPonderada")),
                    "situacao": safe_str(ct.get("Situacao")),
                    "valor_contrato": valor_contrato
                })
            else:
                cartoes.append({
                    "banco": banco_nome,
                    "codigo": banco_codigo,
                    "contrato": contrato,
                    "tipo": "Cartão Consignado" if tipo == 76 else "Cartão Benefício",
                    "tipo_codigo": tipo,
                    "parcela_promosys": parcela,
                    "limite_cartao": margem_cartao,
                    "utilizado": margem_cartao if parcela > 0 else 0.0,
                    "disponivel": 0.0 if parcela > 0 else margem_cartao,
                    "situacao": safe_str(ct.get("Situacao"))
                })

        total_parcelas = money(sum(c["parcela"] for c in emprestimos))
        maior_troco = money(max([c["valor_liberado"] for c in emprestimos], default=0))
        maior_parcela = money(max([c["parcela"] for c in emprestimos], default=0))

        # Montar endereço completo do cliente
        endereco_partes = []
        if raw.get("ENDERECO"):
            endereco_partes.append(safe_str(raw.get("ENDERECO")))
        if raw.get("BAIRRO"):
            endereco_partes.append(safe_str(raw.get("BAIRRO")))
        if raw.get("CIDADE") or raw.get("UF"):
            cidade_uf = []
            if raw.get("CIDADE"):
                cidade_uf.append(safe_str(raw.get("CIDADE")))
            if raw.get("UF"):
                cidade_uf.append(safe_str(raw.get("UF")))
            endereco_partes.append(" / ".join(cidade_uf))
        if raw.get("CEP"):
            endereco_partes.append(f"CEP: {safe_str(raw.get('CEP'))}")
        
        endereco_completo = ", ".join(endereco_partes) if endereco_partes else ""

        nascto = raw.get("NASCTO")
        data_nasc = ""
        if nascto is not None:
            try:
                val = int(nascto)
                dt = datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc) + datetime.timedelta(seconds=val)
                data_nasc = dt.strftime("%Y-%m-%d")
            except Exception:
                pass

        response = {
            "origem": "PROMOSYS",

            "cliente": {
                "nome": safe_str(raw.get("NOME")),
                "cpf": safe_str(raw.get("FULL_CPF")) or cpf,
                "beneficio": safe_str(beneficio.get("nb")),
                "idade": safe_int(raw.get("IDADE")),
                "especie": safe_str(raw.get("ESP")),
                "salario": money(salario),
                "margem_livre": margem_livre,
                "valor_liberado_margem": 0.0,
                "banco_pagador": safe_str(dados_bancarios.get("NOME_BANCO_PAGTO") or dados_bancarios.get("NOME_BANCO")),
                "endereco": endereco_completo,
                "data_nascimento": data_nasc,
                "filiacao": safe_str(raw.get("NOME_MAE") or raw.get("MAE") or raw.get("NOMEMAE") or raw.get("NOME_DA_MAE") or raw.get("NOMEDAMAE") or raw.get("MAE_NOME") or raw.get("FILIACAO") or ""),
                "coeficiente_utilizado": 0.0
            },

            "margens": {
                "salario": money(salario),
                "margem_emprestimo": margem_emprestimo,
                "total_comprometido": money(total_comprometido),
                "margem_livre": margem_livre,
                "valor_liberado_margem": 0.0,
                "coeficiente_utilizado": 0.0,
                "margem_cartao": margem_cartao,
                "possui_cartao": possui_cartao,
                "cartao_utilizado": money(cartao_utilizado),
                "cartao_disponivel": money(cartao_disponivel),
                "rmc_promosys": money(rmc_promosys),
                "rcc_promosys": money(rcc_promosys)
            },

            "beneficio": {
                "situacao": safe_str(beneficio.get("situacao")),
                "bloqueado": bool(beneficio.get("Bloqueado")),
                "bloqueio_emprestimo": safe_str(beneficio.get("bloqemp")),
                "possui_representante_legal": safe_str(beneficio.get("possuirepresentantelegal")),
                "especie_consignavel": safe_str(raw.get("ESP_Consignavel")),
                "contratos_atualizados_ate": safe_str(raw.get("ContratosAtualizadosAte")),
                "uf": safe_str(raw.get("UF")),
                "ddb": safe_str(dados_bancarios.get("DIB_FORMATADO"))
            },

            "banco_pagador": {
                "codigo": safe_str(dados_bancarios.get("BANCO_PAGTO") or dados_bancarios.get("BANCO")),
                "nome": safe_str(dados_bancarios.get("NOME_BANCO_PAGTO") or dados_bancarios.get("NOME_BANCO")),
                "agencia": safe_str(dados_bancarios.get("AGENCIA")),
                "conta": safe_str(dados_bancarios.get("CONTA")),
                "tipo_pagamento": safe_str(dados_bancarios.get("NOME_TIPO_PAGTO"))
            },

            "telefones": [
                raw.get("WHATSAPP_1_FORMATADO"),
                raw.get("WHATSAPP_2_FORMATADO"),
                raw.get("WHATSAPP_3_FORMATADO")
            ],

            "emprestimos": emprestimos,

            "cartoes": cartoes,

            "resumo": {
                "total_emprestimos": len(emprestimos),
                "total_cartoes": len(cartoes),
                "total_parcelas_emprestimos": total_parcelas,
                "maior_troco": maior_troco,
                "maior_parcela": maior_parcela
            }
        }
        return recalculate_benefit_margins(response)

    async def consultar_beneficios(self, cpf: str, convenio: str = "INSS") -> Dict[str, Any]:
        self.convenio_temp = convenio
        try:
            return await self._do_consultar_beneficios(cpf, force_refresh=False)
        except ValueError as e:
            if "token" in str(e).lower() or "autentica" in str(e).lower() or "expirado" in str(e).lower():
                return await self._do_consultar_beneficios(cpf, force_refresh=True)
            raise e

    async def _do_consultar_beneficios(self, cpf: str, force_refresh: bool) -> Dict[str, Any]:
        token = await self._get_token(force_refresh=force_refresh)
        clean_cpf = ''.join(filter(str.isdigit, cpf))
        
        # Implementação para SIAPE e CLT
        if getattr(self, "convenio_temp", "") == "SIAPE" or getattr(self, "convenio_temp", "") == "CLT":
            endpoint = "/consultaOfflineSiape.php" if getattr(self, "convenio_temp", "") == "SIAPE" else "/consultaOfflineClt.php"
            key = "cpf" if endpoint == "/consultaOfflineSiape.php" else "cpf" # ambos usam minúsculo como testado
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}{endpoint}",
                    data={"token": token, key: clean_cpf},
                    timeout=60.0
                )
            data = response.json()
            if data.get("Code") == "401" or data.get("Code") == "202":
                raise ValueError(f"Token expirado ou inválido: {data}")
            if data.get("Code") != "000":
                raise ValueError(f"Erro ao consultar {getattr(self, 'convenio_temp', '')} na Promosys: {data.get('Msg') or data}")
                
            consultas = data.get("Consulta", [])
            if not consultas:
                raise ValueError(f"Nenhum dado encontrado para este CPF no convênio {getattr(self, 'convenio_temp', '')}.")
                
            PromosysProvider._siape_clt_cache[clean_cpf] = consultas[0]
            pseudo_nb = f"{getattr(self, 'convenio_temp', '')}-{clean_cpf}"
            return {"beneficios": [pseudo_nb]}
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/beneficios.php",
                data={
                    "token": token,
                    "cpf": clean_cpf
                },
                timeout=60.0
            )
            
        data = response.json()
        
        if data.get("Code") == "401" or data.get("Code") == "202":
            raise ValueError(f"Token expirado ou inválido: {data}")

        if data.get("Code") != "000":
            raise ValueError(f"Erro ao consultar benefícios na Promosys: {data.get('Msg') or data}")
            
        beneficios_raw = data.get("Beneficios", [])

        if not beneficios_raw:
            raise ValueError(
                "Nenhum benefício encontrado para este CPF."
            )

        def extrair_numero_beneficio(item):
            if item is None:
                return ""

            if isinstance(item, (str, int, float)):
                return "".join(
                    filter(str.isdigit, str(item))
                )

            if not isinstance(item, dict):
                return ""

            chaves_numero = (
                "beneficio",
                "Beneficio",
                "BENEFICIO",
                "numero_beneficio",
                "numeroBeneficio",
                "NumeroBeneficio",
                "numero",
                "Numero",
                "NB",
                "nb",
            )

            for chave in chaves_numero:
                valor = item.get(chave)

                if valor is not None:
                    numero = "".join(
                        filter(str.isdigit, str(valor))
                    )

                    if numero:
                        return numero

            for chave_aninhada in (
                "cliente",
                "beneficio_dados",
                "dados",
                "data",
            ):
                valor_aninhado = item.get(chave_aninhada)

                if isinstance(valor_aninhado, dict):
                    numero = extrair_numero_beneficio(
                        valor_aninhado
                    )

                    if numero:
                        return numero

            return ""

        numeros_beneficios = []
        numeros_vistos = set()

        for item in beneficios_raw:
            numero = extrair_numero_beneficio(item)

            if not numero:
                continue

            if numero in numeros_vistos:
                continue

            numeros_vistos.add(numero)
            numeros_beneficios.append(numero)

        if not numeros_beneficios:
            raise ValueError(
                "A Promosys informou benefícios, mas não foi "
                "possível identificar os números dos NBs."
            )

        return {
            "success": True,
            "cpf": clean_cpf,
            "total_beneficios": len(numeros_beneficios),
            "beneficios": numeros_beneficios
        }

    async def consultar_por_beneficio(self, beneficio: str) -> Dict[str, Any]:
        try:
            return await self._do_consultar_por_beneficio(beneficio, force_refresh=False)
        except ValueError as e:
            if "token" in str(e).lower() or "autentica" in str(e).lower() or "expirado" in str(e).lower():
                return await self._do_consultar_por_beneficio(beneficio, force_refresh=True)
            raise e

    async def _do_consultar_por_beneficio(self, beneficio: str, force_refresh: bool) -> Dict[str, Any]:
        if beneficio.startswith("SIAPE-") or beneficio.startswith("CLT-"):
            # Recuperar cache para os pseudos NBs de SIAPE e CLT
            cpf = beneficio.split("-", 1)[1]
            if cpf not in PromosysProvider._siape_clt_cache:
                raise ValueError(f"Cache não encontrado para {beneficio}.")
            raw = PromosysProvider._siape_clt_cache[cpf]
            return await self._normalize_response(raw, cpf)
            
        token = await self._get_token(force_refresh=force_refresh)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/consultaOffline.php",
                data={
                    "token": token,
                    "beneficio": beneficio
                },
                timeout=60.0
            )
            
        data = response.json()
        
        if data.get("Code") == "401" or data.get("Code") == "202":
            raise ValueError(f"Token expirado ou inválido: {data}")

        if data.get("Code") != "000":
            raise ValueError(f"Erro ao consultar benefício na Promosys: {data.get('Msg') or data}")
            
        consultas = data.get("Consulta")
        if not consultas:
            raise ValueError(f"Nenhum dado retornado para o benefício {beneficio}.")
            
        if isinstance(consultas, list):
            if not consultas:
                raise ValueError(f"Nenhum dado retornado para o benefício {beneficio}.")
            raw = consultas[0]
        else:
            raw = consultas
            
        cpf = raw.get("FULL_CPF", "")
        return await self._normalize_response(raw, cpf)

    async def consultar_creditos(self) -> Dict[str, Any]:
        try:
            return await self._do_consultar_creditos(force_refresh=False)
        except ValueError as e:
            if "token" in str(e).lower() or "autentica" in str(e).lower() or "expirado" in str(e).lower():
                return await self._do_consultar_creditos(force_refresh=True)
            raise e

    async def _do_consultar_creditos(self, force_refresh: bool) -> Dict[str, Any]:
        token = await self._get_token(force_refresh=force_refresh)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/creditos.php",
                data={
                    "token": token
                },
                timeout=30.0
            )
            
        data = response.json()
        
        if data.get("Code") == "401" or data.get("Code") == "202":
            raise ValueError(f"Token expirado ou inválido: {data}")

        if data.get("Code") != "000":
            raise ValueError(f"Erro ao consultar créditos na Promosys: {data.get('Msg') or data}")
            
        return {
            "success": True,
            "creditos": safe_int(data.get("CreditosOnline")),
            "creditos_offline": safe_int(data.get("CreditosOffline")),
            "creditos_geracao_leads": safe_int(data.get("CreditosGeracaoLeads"))
        }
