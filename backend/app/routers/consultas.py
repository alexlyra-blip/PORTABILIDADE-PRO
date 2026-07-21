import asyncio
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import json
from datetime import datetime, timedelta, timezone
import logging

from app.database import get_db, AsyncSessionLocal
from app.routers.deps import get_current_user, verify_n8n_internal_key
from app.models.sqlalchemy_models import ConsultaCpfCache
from app.schemas.consultas import (
    ConsultaResponse,
    ConsultaCpfMultiResponse,
    BeneficiosRequest,
    BeneficiosResponse,
    BeneficioRequest,
    CreditosResponse,
    BeneficioDetalhado
)
from app.services.consultas.promosys_provider import PromosysProvider
from app.services.consultas.margin_rules import recalculate_consulta_payload
from app.services.consultas.multicorban_provider import MultiCorbanProvider
from app.utils.config_helper import get_active_provider
from app.services.margem_service import calcular_valor_liberado_margem, obter_coeficiente_fator, resolve_margin_convenio

logger = logging.getLogger("consultas_router")

router = APIRouter(prefix="/consultas")
internal_router = APIRouter(prefix="/internal/consultas")

# Cache curto para o saldo da MultiCorban (30 a 60 segundos)
multicorban_saldo_cache = {
    "data": None,
    "expires_at": datetime.min
}

class CpfRequest(BaseModel):
    cpf: str
    convenio: Optional[str] = "INSS"

class MultiCorbanCpfRequest(BaseModel):
    cpf: str

class MultiCorbanGeralRequest(BaseModel):
    cpf_cnpj: str

class MultiCorbanOfflineRequest(BaseModel):
    beneficio: str

def get_provider_by_type(provider_type: str):
    if provider_type == "multicorban":
        return MultiCorbanProvider()
    return PromosysProvider()

async def _execute_cpf_query_flow(cpf: str, db: AsyncSession, convenio: str = "INSS", provider_type: str = "promosys"):
    clean_cpf = ''.join(filter(str.isdigit, cpf))
    if not clean_cpf:
        raise HTTPException(status_code=400, detail="CPF é obrigatório.")
    
    masked_cpf = f"{clean_cpf[:3]}******{clean_cpf[-2:]}" if len(clean_cpf) >= 5 else "***"
    margin_convenio = resolve_margin_convenio(convenio)
    
    # 1. Verifica o cache no banco de dados usando a sessão existente
    stmt = select(ConsultaCpfCache).where(ConsultaCpfCache.cpf == clean_cpf)
    result = await db.execute(stmt)
    cache_entry = result.scalar_one_or_none()
    
    cache_json = None
    if cache_entry:
        cache_json = cache_entry.dados_json
        cache_updated_at = cache_entry.updated_at or cache_entry.created_at
        if cache_updated_at.tzinfo is None:
            cache_updated_at = cache_updated_at.replace(tzinfo=timezone.utc)
            
    # Liberamos a sessão do DB imediatamente para evitar segurar a conexão
    # durante a chamada externa de API
    await db.close()
    
    # 2. Se temos cache válido (<= 30 dias), retornamos ele após recalcular margens
    if cache_json:
        now_utc = datetime.now(timezone.utc)
        if (now_utc - cache_updated_at) <= timedelta(days=30):
            try:
                dados_json = json.loads(cache_json)
                dados_json = recalculate_consulta_payload(dados_json)
                
                # Para recalcular margens, abrimos uma sessão rápida e a fechamos em seguida
                async with AsyncSessionLocal() as temp_db:
                    coef_fator = await obter_coeficiente_fator(temp_db, margin_convenio)
                    for b in dados_json.get("beneficios", []):
                        if "margens" in b and b["margens"]:
                            margem_livre = b["margens"].get("margem_livre", 0.0)
                            b["margens"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                            b["margens"]["coeficiente_utilizado"] = coef_fator
                        if "cliente" in b and b["cliente"]:
                            margem_livre = b["cliente"].get("margem_livre", 0.0) or b.get("margens", {}).get("margem_livre", 0.0)
                            b["cliente"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                            b["cliente"]["coeficiente_utilizado"] = coef_fator
                    
                    bp = dados_json.get("beneficio_principal")
                    if bp:
                        if "margens" in bp and bp["margens"]:
                            margem_livre = bp["margens"].get("margem_livre", 0.0)
                            bp["margens"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                            bp["margens"]["coeficiente_utilizado"] = coef_fator
                        if "cliente" in bp and bp["cliente"]:
                            margem_livre = bp["cliente"].get("margem_livre", 0.0) or bp.get("margens", {}).get("margem_livre", 0.0)
                            bp["cliente"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                            bp["cliente"]["coeficiente_utilizado"] = coef_fator
                            
                    if "margens" in dados_json and dados_json["margens"]:
                        margem_livre = dados_json["margens"].get("margem_livre", 0.0)
                        dados_json["margens"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                        dados_json["margens"]["coeficiente_utilizado"] = coef_fator
                    if "cliente" in dados_json and dados_json["cliente"]:
                        margem_livre = dados_json["cliente"].get("margem_livre", 0.0) or dados_json.get("margens", {}).get("margem_livre", 0.0)
                        dados_json["cliente"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                        dados_json["cliente"]["coeficiente_utilizado"] = coef_fator
                
                # Filtra telefones nulos
                for b in dados_json.get("beneficios", []):
                    if "telefones" in b and isinstance(b["telefones"], list):
                        b["telefones"] = [t for t in b["telefones"] if t]
                if bp and "telefones" in bp and isinstance(bp["telefones"], list):
                    bp["telefones"] = [t for t in bp["telefones"] if t]
                    
                print(f"[CACHE] Usando cache para o CPF {masked_cpf}")
                return ConsultaCpfMultiResponse(**dados_json)
            except Exception as cache_err:
                print(f"[WARNING] Erro ao carregar cache para o CPF {masked_cpf}: {cache_err}")
                
    # 3. Consulta externa via Provedor Ativo
    provider = get_provider_by_type(provider_type)
    
    try:
        beneficios_info = await provider.consultar_beneficios(clean_cpf, convenio=convenio)
    except ValueError as e:
        err_msg = str(e)
        if "token" in err_msg.lower() or "autentica" in err_msg.lower() or "credencia" in err_msg.lower():
            raise HTTPException(status_code=401, detail=f"Falha de autenticação no provedor {provider_type}.")
        if "nenhum benefício encontrado" in err_msg.lower() or "não encontrado" in err_msg.lower():
            raise HTTPException(status_code=404, detail="Nenhum benefício encontrado para este CPF.")
        raise HTTPException(status_code=502, detail=f"Erro no provedor {provider_type} ao listar benefícios: {err_msg}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro de comunicação com o provedor {provider_type}: {str(e)}")
        
    beneficios_list = beneficios_info.get("beneficios", [])
    if not beneficios_list:
        raise HTTPException(status_code=404, detail="Nenhum benefício encontrado para este CPF.")
        
    numeros_beneficios = []
    numeros_vistos = set()
    for item in beneficios_list:
        numero = "".join(filter(str.isdigit, str(item)))
        if not numero:
            continue
        if numero in numeros_vistos:
            continue
        numeros_vistos.add(numero)
        numeros_beneficios.append(numero)
        
    if not numeros_beneficios:
        raise HTTPException(
            status_code=502,
            detail=f"O provedor {provider_type} retornou benefícios, mas os números dos NBs não puderam ser identificados."
        )
        
    detailed_beneficios = []
    results = []
    
    async with AsyncSessionLocal() as temp_db:
        coef_fator = await obter_coeficiente_fator(temp_db, margin_convenio)
        for nb in numeros_beneficios:
            try:
                res = await provider.consultar_por_beneficio(nb)
                if "telefones" in res and isinstance(res["telefones"], list):
                    res["telefones"] = [t for t in res["telefones"] if t]
                
                # Recalcular margens com base no banco e registrar coeficiente
                if "margens" in res and res["margens"]:
                    margem_livre = res["margens"].get("margem_livre", 0.0)
                    res["margens"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                    res["margens"]["coeficiente_utilizado"] = coef_fator
                if "cliente" in res and res["cliente"]:
                    margem_livre = res["cliente"].get("margem_livre", 0.0) or res.get("margens", {}).get("margem_livre", 0.0)
                    res["cliente"]["valor_liberado_margem"] = await calcular_valor_liberado_margem(margem_livre, temp_db, margin_convenio)
                    res["cliente"]["coeficiente_utilizado"] = coef_fator
                    
                results.append((nb, res))
                
                detalhe = BeneficioDetalhado(
                    numero=nb,
                    cliente=res["cliente"],
                    margens=res["margens"],
                    beneficio=res["beneficio"],
                    banco_pagador=res["banco_pagador"],
                    emprestimos=res["emprestimos"],
                    cartoes=res["cartoes"],
                    telefones=res.get("telefones", []),
                    resumo=res["resumo"]
                )
                detailed_beneficios.append(detalhe)
            except Exception as erro_beneficio:
                nb_mascarado = f"***{nb[-4:]}" if len(nb) >= 4 else "***"
                print(f"[WARNING] Erro ao consultar benefício {nb_mascarado} no provedor {provider_type}: {erro_beneficio}")
                results.append((nb, None))
            
    if not detailed_beneficios:
        raise HTTPException(status_code=404, detail="Não foi possível recuperar dados detalhados para os benefícios.")
        
    first_res = next((res for nb, res in results if res is not None), None)
    if not first_res:
        raise HTTPException(status_code=404, detail="Não foi possível recuperar dados detalhados para os benefícios.")
        
    beneficio_principal = ConsultaResponse(**first_res)
    
    multi_response = ConsultaCpfMultiResponse(
        success=True,
        cpf=clean_cpf,
        total_beneficios=len(detailed_beneficios),
        beneficios=detailed_beneficios,
        beneficio_principal=beneficio_principal,
        **first_res
    )
    
    # 4. Salva no cache abrindo uma nova conexão rápida
    resultado_dict = multi_response.model_dump()
    dados_str = json.dumps(resultado_dict)
    
    try:
        async with AsyncSessionLocal() as write_db:
            stmt = select(ConsultaCpfCache).where(ConsultaCpfCache.cpf == clean_cpf)
            res_cache = await write_db.execute(stmt)
            existing_cache = res_cache.scalar_one_or_none()
            
            if existing_cache:
                existing_cache.dados_json = dados_str
                existing_cache.updated_at = func.now()
            else:
                nova_consulta = ConsultaCpfCache(cpf=clean_cpf, dados_json=dados_str)
                write_db.add(nova_consulta)
            await write_db.commit()
    except Exception as cache_write_err:
        print(f"[WARNING] Falha ao gravar cache no banco: {cache_write_err}")
        
    return multi_response

# ROTA UNIFICADA CPF
@router.post("/cpf", response_model=ConsultaCpfMultiResponse)
async def consultar_cpf_unificado(
    request: CpfRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    # A rota continua protegida por get_current_user, mas está disponível
    # para todos os perfis autenticados do CRM.
    provider_type = get_active_provider()
    
    if provider_type == "multicorban":
        conv_upper = str(request.convenio or "INSS").upper()
        if conv_upper not in ["INSS", "SIAPE", "GOVERNO", "CLT", "CLT PRIVADO"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Convênio '{request.convenio}' não é suportado pelo provedor MultiCorban."
            )
            
    try:
        return await _execute_cpf_query_flow(request.cpf, db, request.convenio, provider_type)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Erro na rota unificada CPF: {str(e)}\n{tb}")
        raise HTTPException(status_code=500, detail=f"Erro interno de processamento.")

# MANTER ROTAS PROMOSYS PARA COMPATIBILIDADE (Clara/n8n)
@router.post("/promosys/cpf", response_model=ConsultaCpfMultiResponse)
async def consultar_promosys_cpf(request: CpfRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "admin" and not getattr(current_user, "can_consult_cpf", False):
        raise HTTPException(status_code=403, detail="Você não tem permissão para realizar consultas de CPF.")
    return await _execute_cpf_query_flow(request.cpf, db, request.convenio, "promosys")

@internal_router.post("/promosys/cpf", response_model=ConsultaCpfMultiResponse)
async def consultar_promosys_cpf_internal(
    request: CpfRequest, 
    db: AsyncSession = Depends(get_db), 
    api_key: str = Depends(verify_n8n_internal_key)
):
    return await _execute_cpf_query_flow(request.cpf, db, request.convenio, "promosys")

@router.post("/promosys/beneficios", response_model=BeneficiosResponse)
async def consultar_promosys_beneficios(request: BeneficiosRequest):
    try:
        clean_cpf = ''.join(filter(str.isdigit, request.cpf))
        provider = PromosysProvider()
        res = await provider.consultar_beneficios(clean_cpf)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/promosys/beneficio", response_model=ConsultaResponse)
async def consultar_promosys_beneficio(request: BeneficioRequest):
    try:
        provider = PromosysProvider()
        res = await provider.consultar_por_beneficio(request.beneficio.strip())
        return ConsultaResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/promosys/creditos", response_model=CreditosResponse)
async def consultar_promosys_creditos():
    try:
        provider = PromosysProvider()
        res = await provider.consultar_creditos()
        return res
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

# ROTAS ESPECÍFICAS MULTICORBAN
@router.post("/multicorban/cpf", response_model=ConsultaResponse)
async def consultar_multicorban_cpf(request: MultiCorbanCpfRequest, current_user = Depends(get_current_user)):
    if current_user.role != "admin" and not getattr(current_user, "can_consult_cpf", False):
        raise HTTPException(status_code=403, detail="Você não tem permissão para realizar consultas.")
    provider = MultiCorbanProvider()
    try:
        return await provider.consultar_por_cpf(request.cpf, convenio="INSS")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/multicorban/siape", response_model=ConsultaResponse)
async def consultar_multicorban_siape(request: MultiCorbanCpfRequest, current_user = Depends(get_current_user)):
    if current_user.role != "admin" and not getattr(current_user, "can_consult_cpf", False):
        raise HTTPException(status_code=403, detail="Você não tem permissão para realizar consultas.")
    provider = MultiCorbanProvider()
    try:
        return await provider.consultar_por_cpf(request.cpf, convenio="SIAPE")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/multicorban/geral", response_model=ConsultaResponse)
async def consultar_multicorban_geral(request: MultiCorbanGeralRequest, current_user = Depends(get_current_user)):
    if current_user.role != "admin" and not getattr(current_user, "can_consult_cpf", False):
        raise HTTPException(status_code=403, detail="Você não tem permissão para realizar consultas.")
    provider = MultiCorbanProvider()
    try:
        return await provider.consultar_por_cpf(request.cpf_cnpj, convenio="GOVERNO")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/multicorban/offline", response_model=ConsultaResponse)
async def consultar_multicorban_offline(request: MultiCorbanOfflineRequest, current_user = Depends(get_current_user)):
    if current_user.role != "admin" and not getattr(current_user, "can_consult_cpf", False):
        raise HTTPException(status_code=403, detail="Você não tem permissão para realizar consultas.")
    provider = MultiCorbanProvider()
    try:
        return await provider.consultar_por_beneficio(request.beneficio)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/multicorban/saldo")
async def get_multicorban_saldo(current_user = Depends(get_current_user)):
    global multicorban_saldo_cache
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado.")
        
    now = datetime.now()
    if multicorban_saldo_cache["data"] and now < multicorban_saldo_cache["expires_at"]:
        return multicorban_saldo_cache["data"]
        
    provider = MultiCorbanProvider()
    try:
        res = await provider.consultar_creditos()
        normalized = {
            "success": True,
            "provider": "multicorban",
            "creditos_online": res.get("creditos"),
            "creditos_offline": res.get("creditos_offline"),
            "geracao_leads": res.get("creditos_geracao_leads"),
            "saldo_total": res.get("saldo_total"),
            "raw": res.get("raw", {})
        }
        
        multicorban_saldo_cache["data"] = normalized
        multicorban_saldo_cache["expires_at"] = now + timedelta(seconds=45) # 45 segundos de cache
        return normalized
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao consultar saldo MultiCorban: {str(e)}")
