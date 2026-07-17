import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import json
from datetime import datetime, timedelta, timezone

from app.database import get_db
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
from app.services.consultas.multicorban_provider import MultiCorbanProvider
from app.utils.config_helper import get_active_provider
from app.services.margem_service import calcular_valor_liberado_margem

router = APIRouter(prefix="/consultas")
internal_router = APIRouter(prefix="/internal/consultas")

def get_provider():
    active = get_active_provider()
    if active == "multicorban":
        return MultiCorbanProvider()
    return PromosysProvider()

class CpfRequest(BaseModel):
    cpf: str
    convenio: Optional[str] = "INSS"

async def _execute_promosys_cpf_query(cpf: str, db: AsyncSession, convenio: str = "INSS"):
    clean_cpf = ''.join(filter(str.isdigit, cpf))
    if not clean_cpf:
        raise HTTPException(status_code=400, detail="CPF é obrigatório.")
    
    # Máscara do CPF para exibição segura nos logs
    masked_cpf = f"{clean_cpf[:3]}******{clean_cpf[-2:]}" if len(clean_cpf) >= 5 else "***"
    
    # 1. Verifica o cache no banco de dados
    stmt = select(ConsultaCpfCache).where(ConsultaCpfCache.cpf == clean_cpf)
    result = await db.execute(stmt)
    cache_entry = result.scalar_one_or_none()
    
    if cache_entry:
        now_utc = datetime.now(timezone.utc)
        created_at = cache_entry.updated_at or cache_entry.created_at
        
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
            
        if (now_utc - created_at) <= timedelta(days=30):
            try:
                dados_json = json.loads(cache_entry.dados_json)
                # Verifica se o cache está no formato multi-benefícios novo
                if isinstance(dados_json, dict) and "beneficios" in dados_json and "beneficio_principal" in dados_json:
                    print(f"[CACHE] Usando cache para o CPF {masked_cpf}")
                    
                    # Filtra telefones nulos
                    for b in dados_json.get("beneficios", []):
                        if "telefones" in b and isinstance(b["telefones"], list):
                            b["telefones"] = [t for t in b["telefones"] if t]
                    
                # Recalculate margins with today's daily coefficient
                for b in dados_json.get("beneficios", []):
                    if "margens" in b and b["margens"]:
                        margem_livre = b["margens"].get("margem_livre", 0.0)
                        liberado_aprox = await calcular_valor_liberado_margem(margem_livre, db)
                        b["margens"]["valor_liberado_margem"] = liberado_aprox
                    if "cliente" in b and b["cliente"]:
                        margem_livre = b["cliente"].get("margem_livre", 0.0) or b.get("margens", {}).get("margem_livre", 0.0)
                        liberado_aprox = await calcular_valor_liberado_margem(margem_livre, db)
                        b["cliente"]["valor_liberado_margem"] = liberado_aprox

                bp = dados_json.get("beneficio_principal")
                if bp:
                    if "margens" in bp and bp["margens"]:
                        margem_livre = bp["margens"].get("margem_livre", 0.0)
                        liberado_aprox = await calcular_valor_liberado_margem(margem_livre, db)
                        bp["margens"]["valor_liberado_margem"] = liberado_aprox
                    if "cliente" in bp and bp["cliente"]:
                        margem_livre = bp["cliente"].get("margem_livre", 0.0) or bp.get("margens", {}).get("margem_livre", 0.0)
                        liberado_aprox = await calcular_valor_liberado_margem(margem_livre, db)
                        bp["cliente"]["valor_liberado_margem"] = liberado_aprox
                        
                # Root-level keys (since ConsultaCpfMultiResponse inherits from first_res)
                if "margens" in dados_json and dados_json["margens"]:
                    margem_livre = dados_json["margens"].get("margem_livre", 0.0)
                    liberado_aprox = await calcular_valor_liberado_margem(margem_livre, db)
                    dados_json["margens"]["valor_liberado_margem"] = liberado_aprox
                if "cliente" in dados_json and dados_json["cliente"]:
                    margem_livre = dados_json["cliente"].get("margem_livre", 0.0) or dados_json.get("margens", {}).get("margem_livre", 0.0)
                    liberado_aprox = await calcular_valor_liberado_margem(margem_livre, db)
                    dados_json["cliente"]["valor_liberado_margem"] = liberado_aprox

                if bp and "telefones" in bp and isinstance(bp["telefones"], list):
                    bp["telefones"] = [t for t in bp["telefones"] if t]
                    
                return ConsultaCpfMultiResponse(**dados_json)
            except Exception as cache_err:
                print(f"[WARNING] Erro ao ler cache ou cache no formato antigo para CPF {masked_cpf}: {cache_err}")
        else:
            print(f"[INFO] Cache expirado para o CPF {masked_cpf}. Buscando na Promosys...")
    
    provider = get_provider()
    
    # 2. Busca lista de benefícios
    try:
        beneficios_info = await provider.consultar_beneficios(clean_cpf, convenio=convenio)
    except ValueError as e:
        err_msg = str(e)
        if "token" in err_msg.lower() or "autentica" in err_msg.lower() or "credencia" in err_msg.lower():
            raise HTTPException(status_code=401, detail="Falha de autenticação na Promosys.")
        if "nenhum benefício encontrado" in err_msg.lower() or "não encontrado" in err_msg.lower():
            raise HTTPException(status_code=404, detail="Nenhum benefício encontrado para este CPF.")
        raise HTTPException(status_code=502, detail=f"Erro na Promosys ao listar benefícios: {err_msg}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro de comunicação com a Promosys: {str(e)}")
        
    beneficios_list = beneficios_info.get("beneficios", [])
    if not beneficios_list:
        raise HTTPException(status_code=404, detail="Nenhum benefício encontrado para este CPF.")
        
    # 3. Consulta cada benefício
    detailed_beneficios = []
    
    async def fetch_and_normalize(nb: str):
        try:
            res = await provider.consultar_por_beneficio(nb)
            if "telefones" in res and isinstance(res["telefones"], list):
                res["telefones"] = [t for t in res["telefones"] if t]
            return nb, res
        except Exception as e:
            print(f"[WARNING] Erro ao consultar benefício {nb}: {str(e)}")
            return nb, None
            
    # Executa em paralelo
    tasks = [fetch_and_normalize(nb) for nb in beneficios_list]
    results = await asyncio.gather(*tasks)
    
    for nb, res in results:
        if res:
            detalhe = BeneficioDetalhado(
                numero=nb,
                cliente=res["cliente"],
                margens=res["margens"],
                beneficio=res["beneficio"],
                banco_pagador=res["banco_pagador"],
                emprestimos=res["emprestimos"],
                cartoes=res["cartoes"],
                telefones=res["telefones"],
                resumo=res["resumo"]
            )
            detailed_beneficios.append(detalhe)
            
    if not detailed_beneficios:
        raise HTTPException(status_code=404, detail="Não foi possível recuperar dados detalhados para os benefícios.")
        
    # 4. Define beneficio principal (primeiro benefício)
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
    
    # 5. Salva no cache
    resultado_dict = multi_response.model_dump()
    dados_str = json.dumps(resultado_dict)
    
    if cache_entry:
        cache_entry.dados_json = dados_str
        cache_entry.updated_at = func.now()
    else:
        nova_consulta = ConsultaCpfCache(cpf=clean_cpf, dados_json=dados_str)
        db.add(nova_consulta)
        
    await db.commit()
    return multi_response

@router.post("/promosys/cpf", response_model=ConsultaCpfMultiResponse)
async def consultar_promosys_cpf(request: CpfRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        if current_user.role != "admin" and not getattr(current_user, "can_consult_cpf", False):
            raise HTTPException(status_code=403, detail="Você não tem permissão para realizar consultas de CPF.")

        return await _execute_promosys_cpf_query(request.cpf, db, request.convenio)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        clean_cpf = ''.join(filter(str.isdigit, request.cpf))
        masked_cpf = f"{clean_cpf[:3]}******{clean_cpf[-2:]}" if len(clean_cpf) >= 5 else "***"
        print(f"[ERROR] Erro inesperado ao consultar Promosys para CPF {masked_cpf}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao realizar consulta na Promosys.")

@internal_router.post("/promosys/cpf", response_model=ConsultaCpfMultiResponse)
async def consultar_promosys_cpf_internal(
    request: CpfRequest, 
    db: AsyncSession = Depends(get_db), 
    api_key: str = Depends(verify_n8n_internal_key)
):
    try:
        return await _execute_promosys_cpf_query(request.cpf, db, request.convenio)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        clean_cpf = ''.join(filter(str.isdigit, request.cpf))
        masked_cpf = f"{clean_cpf[:3]}******{clean_cpf[-2:]}" if len(clean_cpf) >= 5 else "***"
        print(f"[ERROR] Erro inesperado ao consultar Promosys para CPF {masked_cpf} (interno): {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao realizar consulta na Promosys.")


@router.post("/promosys/beneficios", response_model=BeneficiosResponse)
async def consultar_promosys_beneficios(request: BeneficiosRequest):
    try:
        clean_cpf = ''.join(filter(str.isdigit, request.cpf))
        if not clean_cpf:
            raise HTTPException(status_code=400, detail="CPF é obrigatório.")
            
        provider = get_provider()
        try:
            res = await provider.consultar_beneficios(clean_cpf)
            return res
        except ValueError as e:
            err_msg = str(e)
            if "token" in err_msg.lower() or "autentica" in err_msg.lower():
                raise HTTPException(status_code=401, detail="Falha de autenticação na Promosys.")
            if "nenhum benefício encontrado" in err_msg.lower() or "não encontrado" in err_msg.lower():
                raise HTTPException(status_code=404, detail="Nenhum benefício encontrado para este CPF.")
            raise HTTPException(status_code=502, detail=f"Erro na Promosys ao listar benefícios: {err_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Erro inesperado em /promosys/beneficios: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar benefícios.")


@router.post("/promosys/beneficio", response_model=ConsultaResponse)
async def consultar_promosys_beneficio(request: BeneficioRequest):
    try:
        if not request.beneficio or not request.beneficio.strip():
            raise HTTPException(status_code=400, detail="Número do benefício é obrigatório.")
            
        provider = get_provider()
        try:
            res = await provider.consultar_por_beneficio(request.beneficio.strip())
            if "telefones" in res and isinstance(res["telefones"], list):
                res["telefones"] = [t for t in res["telefones"] if t]
            return ConsultaResponse(**res)
        except ValueError as e:
            err_msg = str(e)
            if "token" in err_msg.lower() or "autentica" in err_msg.lower():
                raise HTTPException(status_code=401, detail="Falha de autenticação na Promosys.")
            if "nenhum dado retornado" in err_msg.lower() or "não encontrado" in err_msg.lower():
                raise HTTPException(status_code=404, detail=f"Benefício {request.beneficio} não encontrado.")
            raise HTTPException(status_code=502, detail=f"Erro na Promosys ao consultar benefício: {err_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Erro inesperado em /promosys/beneficio para NB {request.beneficio}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar benefício.")


@router.post("/promosys/creditos", response_model=CreditosResponse)
async def consultar_promosys_creditos():
    try:
        provider = get_provider()
        try:
            res = await provider.consultar_creditos()
            return res
        except ValueError as e:
            err_msg = str(e)
            if "token" in err_msg.lower() or "autentica" in err_msg.lower():
                raise HTTPException(status_code=401, detail="Falha de autenticação na Promosys.")
            raise HTTPException(status_code=502, detail=f"Erro na Promosys ao consultar créditos: {err_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Erro inesperado ao consultar créditos: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar créditos.")
