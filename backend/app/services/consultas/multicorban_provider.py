import os
import logging
from typing import Dict, Any, List
from datetime import datetime

from app.services.consultas.base_provider import ConsultaBeneficioProvider
from app.services.consultas.margin_rules import recalculate_benefit_margins
from app.services.consultas.siape_normalizer import is_siape_response, normalize_siape_response
from app.services.multicorban_service import MultiCorbanService

logger = logging.getLogger("multicorban_provider")

def safe_float(value) -> float:
    try:
        if value is None or value == "":
            return 0.0
        return float(str(value).replace(",", "."))
    except Exception:
        return 0.0

def safe_int(value) -> int:
    try:
        if value is None or value == "":
            return 0
        return int(float(str(value).replace(",", ".")))
    except Exception:
        return 0

def safe_str(value) -> str:
    return str(value) if value is not None else ""

class MultiCorbanProvider(ConsultaBeneficioProvider):
    _cache = {}

    @staticmethod
    def _extract_identifier(item: dict) -> str:
        beneficiario = item.get("Beneficiario", {}) or {}
        cadastro = item.get("Cadastro", {}) or {}

        return str(
            beneficiario.get("Beneficio", "")
            or item.get("Beneficio", "")
            or cadastro.get("Matricula", "")
        ).strip()

    def __init__(self):
        self.service = MultiCorbanService()

    async def consultar_por_cpf(self, cpf: str, convenio: str = "INSS") -> Dict[str, Any]:
        clean_cpf = ''.join(filter(str.isdigit, cpf))
        convenio = str(convenio or "INSS").strip().upper()

        if convenio == "SIAPE":
            data = await self.service.consultar_siape(clean_cpf)
        elif convenio in ["GOVERNO", "CLT", "CLT PRIVADO"]:
            data = await self.service.consultar_geral(clean_cpf)
        else:
            data = await self.service.consultar_cpf(clean_cpf)

        if not data:
            raise ValueError("Nenhum benefício encontrado para este CPF.")

        if isinstance(data, dict):
            data = [data]

        self._cache[f"{convenio}:{clean_cpf}"] = data
        return await self._normalize_response(data[0], convenio=convenio)

    async def consultar_beneficios(self, cpf: str, convenio: str = "INSS") -> Dict[str, Any]:
        clean_cpf = ''.join(filter(str.isdigit, cpf))
        convenio = str(convenio or "INSS").strip().upper()

        if convenio == "SIAPE":
            data = await self.service.consultar_siape(clean_cpf)
        elif convenio in ["GOVERNO", "CLT", "CLT PRIVADO"]:
            data = await self.service.consultar_geral(clean_cpf)
        else:
            data = await self.service.consultar_cpf(clean_cpf)

        if not data:
            raise ValueError("Nenhum benefício encontrado para este CPF.")

        if isinstance(data, dict):
            data = [data]

        self._cache[f"{convenio}:{clean_cpf}"] = data

        beneficios = []
        for item in data:
            nb = self._extract_identifier(item)
            if nb:
                beneficios.append(nb)

        if not beneficios:
            raise ValueError("Nenhum benefício encontrado para este CPF.")

        return {
            "success": True,
            "cpf": clean_cpf,
            "total_beneficios": len(beneficios),
            "beneficios": beneficios
        }

    async def consultar_por_beneficio(
        self,
        beneficio: str,
        convenio: str = "INSS",
    ) -> Dict[str, Any]:
        convenio = str(convenio or "INSS").strip().upper()
        target_item = None
        for cache_key, items in list(self._cache.items()):
            if not str(cache_key).startswith(f"{convenio}:"):
                continue

            for item in items:
                nb = self._extract_identifier(item)
                if nb == beneficio:
                    target_item = item
                    break
            if target_item:
                break

        if not target_item:
            # Query offline directly if not in cache
            data = await self.service.consultar_offline(beneficio)
            if isinstance(data, list) and len(data) > 0:
                target_item = data[0]
            elif isinstance(data, dict):
                target_item = data

        if not target_item:
            raise ValueError(f"Benefício {beneficio} não encontrado.")

        return await self._normalize_response(target_item, convenio=convenio)

    async def consultar_creditos(self) -> Dict[str, Any]:
        try:
            data = await self.service.consultar_saldo()
            # Mapeia para o formato legado para compatibilidade se necessário
            return {
                "success": True,
                "creditos": int(data.get("online") or data.get("saldo") or 0),
                "creditos_offline": int(data.get("offline") or 0),
                "creditos_geracao_leads": int(data.get("onlineflash") or data.get("leads") or 0)
            }
        except Exception as e:
            logger.error(f"Erro ao consultar saldo legando MultiCorban: {e}")

        return {
            "success": True,
            "creditos": 0,
            "creditos_offline": 0,
            "creditos_geracao_leads": 0
        }

    async def _normalize_response(
        self,
        raw: dict,
        convenio: str = "INSS",
    ) -> Dict[str, Any]:
        convenio = str(convenio or "INSS").strip().upper()

        if convenio == "SIAPE" or is_siape_response(raw):
            return normalize_siape_response(raw)

        beneficiario = raw.get("Beneficiario", {}) or {}
        resumo_fin = raw.get("ResumoFinanceiro", {}) or {}
        dados_bancarios = raw.get("DadosBancarios", {}) or {}
        emprestimos_list = raw.get("Emprestimos", []) or []
        rmc_raw = raw.get("Rmc", {}) or {}
        rcc_raw = raw.get("RCC", {}) or {}
        telefones_list = raw.get("Telefone", []) or []

        salario = safe_float(resumo_fin.get("ValorBeneficio") or beneficiario.get("ValorBeneficio") or 0.0)

        especie = str(beneficiario.get("Especie") or "")
        is_loas = especie in ["87", "88"]
        percent = 0.35 if is_loas else 0.40

        # Procurar margem consignável em vários campos possíveis que a consulta do Multicorban pode entregar
        margem_consignavel_api = None
        for dict_obj in [resumo_fin, beneficiario, raw]:
            if not dict_obj or not isinstance(dict_obj, dict):
                continue
            for key in ["MargemConsignavel", "MargemConsignavelSiape", "MargemBruta", "Margem_Consignavel"]:
                if key in dict_obj and dict_obj[key] is not None:
                    try:
                        val = safe_float(dict_obj[key])
                        if val != 0.0:
                            margem_consignavel_api = val
                            break
                    except:
                        pass
            if margem_consignavel_api is not None:
                break

        if margem_consignavel_api is not None:
            margem_consignavel = margem_consignavel_api
        else:
            margem_consignavel = salario * percent

        total_loans_installments = sum(safe_float(emp.get("ValorParcela")) for emp in emprestimos_list)

        rmc_val = 0.0
        if isinstance(rmc_raw, dict):
            rmc_val = safe_float(rmc_raw.get("ValorParcela") or rmc_raw.get("Valor") or 0.0)
        elif isinstance(rmc_raw, list) and len(rmc_raw) > 0:
            rmc_val = safe_float(rmc_raw[0].get("ValorParcela") or rmc_raw[0].get("Valor") or 0.0)

        rcc_val = 0.0
        if isinstance(rcc_raw, dict):
            rcc_val = safe_float(rcc_raw.get("ValorParcela") or rcc_raw.get("Valor") or 0.0)
        elif isinstance(rcc_raw, list) and len(rcc_raw) > 0:
            rcc_val = safe_float(rcc_raw[0].get("ValorParcela") or rcc_raw[0].get("Valor") or 0.0)

        total_comprometido = total_loans_installments + rmc_val + rcc_val

        # Procurar margem livre em vários campos possíveis que a consulta do Multicorban pode entregar (especialmente para SIAPE)
        margem_livre_api = None
        for dict_obj in [resumo_fin, beneficiario, raw]:
            if not dict_obj or not isinstance(dict_obj, dict):
                continue
            for key in ["MargemLivre", "MargemLivreSiape", "MargemDisponivel", "MargemDisponivelSiape", "MargemLivreNovo", "Margem_Livre"]:
                if key in dict_obj and dict_obj[key] is not None:
                    try:
                        val = safe_float(dict_obj[key])
                        if val != 0.0:
                            margem_livre_api = val
                            break
                    except:
                        pass
            if margem_livre_api is not None:
                break

        if margem_livre_api is not None:
            margem_livre = margem_livre_api
        else:
            margem_livre = margem_consignavel - total_comprometido

        endereco_partes = []
        if beneficiario.get("Endereco"):
            endereco_partes.append(safe_str(beneficiario.get("Endereco")))
        if beneficiario.get("Bairro"):
            endereco_partes.append(safe_str(beneficiario.get("Bairro")))
        if beneficiario.get("Cidade") or beneficiario.get("UFBeneficio") or beneficiario.get("UF"):
            cidade_uf = []
            if beneficiario.get("Cidade"):
                cidade_uf.append(safe_str(beneficiario.get("Cidade")))
            uf_val = beneficiario.get("UFBeneficio") or beneficiario.get("UF")
            if uf_val:
                cidade_uf.append(safe_str(uf_val))
            endereco_partes.append(" / ".join(cidade_uf))
        if beneficiario.get("CEP"):
            endereco_partes.append(f"CEP: {safe_str(beneficiario.get('CEP'))}")
        endereco_completo = ", ".join(endereco_partes) if endereco_partes else ""

        emprestimos = []
        for emp in emprestimos_list:
            parcela = safe_float(emp.get("ValorParcela"))
            quitacao = safe_float(emp.get("Quitacao"))
            prazo = safe_int(emp.get("Prazo"))
            restantes = safe_int(emp.get("ParcelasRestantes"))
            pagas = max(0, prazo - restantes)

            emprestimos.append({
                "banco": safe_str(emp.get("NomeBanco") or emp.get("Banco")),
                "codigo": safe_str(emp.get("Banco")),
                "contrato": safe_str(emp.get("Contrato")),
                "parcela": parcela,
                "quitacao": quitacao,
                "valor_liberado": 0.0,
                "prazo": prazo,
                "parcelas_pagas": pagas,
                "prazo_restante": restantes,
                "taxa": safe_float(emp.get("Taxa")),
                "situacao": "ATIVO",
                "valor_contrato": safe_float(emp.get("ValorOriginal") or emp.get("ValorEmprestimo") or emp.get("Quitacao") or 0.0)
            })

        cartoes = []
        if rmc_val > 0 or rmc_raw.get("Contrato"):
            cartoes.append({
                "banco": safe_str(rmc_raw.get("NomeBanco") or rmc_raw.get("Banco")),
                "codigo": safe_str(rmc_raw.get("Banco")),
                "contrato": safe_str(rmc_raw.get("Contrato")),
                "tipo": "Cartão Consignado (RMC)",
                "parcela_promosys": rmc_val,
                "limite_cartao": safe_float(rmc_raw.get("Valor")),
                "utilizado": safe_float(rmc_raw.get("Valor")),
                "disponivel": 0.0,
                "situacao": "ATIVO"
            })

        if rcc_val > 0 or rcc_raw.get("Contrato"):
            cartoes.append({
                "banco": safe_str(rcc_raw.get("NomeBanco") or rcc_raw.get("Banco")),
                "codigo": safe_str(rcc_raw.get("Banco")),
                "contrato": safe_str(rcc_raw.get("Contrato")),
                "tipo": "Cartão Benefício (RCC)",
                "parcela_promosys": rcc_val,
                "limite_cartao": safe_float(rcc_raw.get("Valor")),
                "utilizado": safe_float(rcc_raw.get("Valor")),
                "disponivel": 0.0,
                "situacao": "ATIVO"
            })

        total_parcelas = sum(c["parcela"] for c in emprestimos)
        maior_parcela = max([c["parcela"] for c in emprestimos], default=0.0)

        telefones = [safe_str(t) for t in telefones_list if t]

        idade = 0
        birth_str = beneficiario.get("DataNascimento")
        if birth_str:
            try:
                birth_date = datetime.strptime(birth_str, "%Y-%m-%d")
                today = datetime.today()
                idade = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            except:
                pass

        response = {
            "origem": "MULTICORBAN",
            "cliente": {
                "nome": safe_str(beneficiario.get("Nome")),
                "cpf": safe_str(beneficiario.get("CPF")),
                "beneficio": safe_str(beneficiario.get("Beneficio")),
                "idade": idade,
                "especie": especie,
                "salario": salario,
                "margem_livre": margem_livre,
                "valor_liberado_margem": 0.0,
                "banco_pagador": safe_str(dados_bancarios.get("Banco")),
                "endereco": endereco_completo,
                "data_nascimento": safe_str(beneficiario.get("DataNascimento")),
                "filiacao": safe_str(beneficiario.get("NomeMae") or beneficiario.get("Nome_Mae") or beneficiario.get("Mae") or beneficiario.get("NomeDaMae") or beneficiario.get("Nome_Da_Mae") or beneficiario.get("Filiacao") or ""),
                "coeficiente_utilizado": 0.0
            },
            "margens": {
                "salario": salario,
                "margem_emprestimo": margem_consignavel,
                "total_comprometido": total_comprometido,
                "margem_livre": margem_livre,
                "valor_liberado_margem": 0.0,
                "coeficiente_utilizado": 0.0,
                "margem_cartao": salario * 0.05,
                "possui_cartao": len(cartoes) > 0,
                "cartao_utilizado": rmc_val + rcc_val,
                "cartao_disponivel": max(0.0, (salario * 0.10) - (rmc_val + rcc_val)),
                "rmc_promosys": rmc_val,
                "rcc_promosys": rcc_val
            },
            "beneficio": {
                "situacao": safe_str(beneficiario.get("Situacao")),
                "bloqueado": safe_str(beneficiario.get("BloqueadoEmprestimo")) == "1",
                "bloqueio_emprestimo": "Sim" if safe_str(beneficiario.get("BloqueadoEmprestimo")) == "1" else "Não",
                "possui_representante_legal": "Sim" if safe_str(beneficiario.get("RL")) == "1" else "Não",
                "especie_consignavel": "Sim",
                "contratos_atualizados_ate": datetime.now().strftime("%Y-%m-%d"),
                "uf": safe_str(beneficiario.get("UFBeneficio") or beneficiario.get("UF")),
                "ddb": safe_str(beneficiario.get("DIB"))
            },
            "banco_pagador": {
                "codigo": safe_str(dados_bancarios.get("Banco")),
                "nome": safe_str(dados_bancarios.get("Banco")),
                "agencia": safe_str(dados_bancarios.get("Agencia")),
                "conta": safe_str(dados_bancarios.get("ContaPagto")),
                "tipo_pagamento": "Cartão Magnético" if safe_str(dados_bancarios.get("MeioPagamento")) == "1" else "Conta Corrente"
            },
            "telefones": telefones,
            "emprestimos": emprestimos,
            "cartoes": cartoes,
            "resumo": {
                "total_emprestimos": len(emprestimos),
                "total_cartoes": len(cartoes),
                "total_parcelas_emprestimos": total_parcelas,
                "maior_troco": 0.0,
                "maior_parcela": maior_parcela
            }
        }
        return recalculate_benefit_margins(response)
