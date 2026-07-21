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
from app.services.margem_service import calcular_valor_liberado_margem, obter_coeficiente_fator

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

async def _execute_cpf_query_flow(
    cpf: str,
    db: AsyncSession,
    convenio: str = "INSS",
    provider_type: str = "promosys",
):
    clean_cpf = "".join(filter(str.isdigit, cpf))

    if not clean_cpf:
        raise HTTPException(
            status_code=400,
            detail="CPF é obrigatório.",
        )

    convenio = str(
        convenio or "INSS"
    ).strip().upper()

    provider_type = str(
        provider_type or "promosys"
    ).strip().lower()

    masked_cpf = (
        f"{clean_cpf[:3]}******{clean_cpf[-2:]}"
        if len(clean_cpf) >= 5
        else "***"
    )

    # A tabela consulta_cpf_cache possui CPF único e não
    # diferencia convênio. Para impedir mistura entre INSS
    # e SIAPE, somente o INSS utiliza esse cache persistente.
    use_persistent_cache = convenio == "INSS"

    cache_json = None
    cache_updated_at = None

    if use_persistent_cache:
        stmt = select(ConsultaCpfCache).where(
            ConsultaCpfCache.cpf == clean_cpf
        )

        result = await db.execute(stmt)
        cache_entry = result.scalar_one_or_none()

        if cache_entry:
            cache_json = cache_entry.dados_json
            cache_updated_at = (
                cache_entry.updated_at
                or cache_entry.created_at
            )

            if (
                cache_updated_at
                and cache_updated_at.tzinfo is None
            ):
                cache_updated_at = (
                    cache_updated_at.replace(
                        tzinfo=timezone.utc
                    )
                )

    # Não mantemos a conexão aberta durante a chamada
    # externa ao provedor.
    await db.close()

    # Cache persistente exclusivo do INSS.
    if (
        use_persistent_cache
        and cache_json
        and cache_updated_at
    ):
        now_utc = datetime.now(timezone.utc)

        if (
            now_utc - cache_updated_at
        ) <= timedelta(days=30):
            try:
                dados_json = json.loads(cache_json)

                # Esta função possui regras de margem
                # específicas do INSS.
                dados_json = recalculate_consulta_payload(
                    dados_json
                )

                async with AsyncSessionLocal() as temp_db:
                    coef_fator = (
                        await obter_coeficiente_fator(
                            temp_db,
                            convenio=convenio,
                        )
                    )

                    async def atualizar_valores(
                        item: dict,
                    ):
                        if not isinstance(item, dict):
                            return

                        item["convenio"] = (
                            item.get("convenio")
                            or convenio
                        )

                        margens = (
                            item.get("margens")
                            or {}
                        )

                        cliente = (
                            item.get("cliente")
                            or {}
                        )

                        margem_livre = margens.get(
                            "margem_livre"
                        )

                        if margem_livre is None:
                            margem_livre = cliente.get(
                                "margem_livre",
                                0.0,
                            )

                        valor_liberado = (
                            await calcular_valor_liberado_margem(
                                margem_livre or 0.0,
                                temp_db,
                                convenio=convenio,
                            )
                        )

                        if margens:
                            margens[
                                "valor_liberado_margem"
                            ] = valor_liberado
                            margens[
                                "coeficiente_utilizado"
                            ] = coef_fator

                        if cliente:
                            cliente[
                                "valor_liberado_margem"
                            ] = valor_liberado
                            cliente[
                                "coeficiente_utilizado"
                            ] = coef_fator

                    for beneficio_item in dados_json.get(
                        "beneficios",
                        [],
                    ):
                        await atualizar_valores(
                            beneficio_item
                        )

                    beneficio_principal = dados_json.get(
                        "beneficio_principal"
                    )

                    if beneficio_principal:
                        await atualizar_valores(
                            beneficio_principal
                        )

                    await atualizar_valores(dados_json)

                for beneficio_item in dados_json.get(
                    "beneficios",
                    [],
                ):
                    telefones = beneficio_item.get(
                        "telefones"
                    )

                    if isinstance(telefones, list):
                        beneficio_item["telefones"] = [
                            telefone
                            for telefone in telefones
                            if telefone
                        ]

                if beneficio_principal:
                    telefones = beneficio_principal.get(
                        "telefones"
                    )

                    if isinstance(telefones, list):
                        beneficio_principal[
                            "telefones"
                        ] = [
                            telefone
                            for telefone in telefones
                            if telefone
                        ]

                print(
                    f"[CACHE] Usando cache para o CPF "
                    f"{masked_cpf}"
                )

                return ConsultaCpfMultiResponse(
                    **dados_json
                )

            except Exception as cache_err:
                print(
                    "[WARNING] Erro ao carregar cache "
                    f"para o CPF {masked_cpf}: "
                    f"{cache_err}"
                )

    provider = get_provider_by_type(provider_type)

    try:
        beneficios_info = (
            await provider.consultar_beneficios(
                clean_cpf,
                convenio=convenio,
            )
        )

    except ValueError as error:
        err_msg = str(error)

        if (
            "token" in err_msg.lower()
            or "autentica" in err_msg.lower()
            or "credencia" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=401,
                detail=(
                    "Falha de autenticação no provedor "
                    f"{provider_type}."
                ),
            )

        if (
            "nenhum benefício encontrado"
            in err_msg.lower()
            or "não encontrado" in err_msg.lower()
        ):
            raise HTTPException(
                status_code=404,
                detail=(
                    "Nenhum benefício encontrado "
                    "para este CPF."
                ),
            )

        raise HTTPException(
            status_code=502,
            detail=(
                f"Erro no provedor {provider_type} "
                "ao listar benefícios: "
                f"{err_msg}"
            ),
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "Erro de comunicação com o provedor "
                f"{provider_type}: {str(error)}"
            ),
        )

    beneficios_list = beneficios_info.get(
        "beneficios",
        [],
    )

    if not beneficios_list:
        raise HTTPException(
            status_code=404,
            detail=(
                "Nenhum benefício encontrado "
                "para este CPF."
            ),
        )

    numeros_beneficios = []
    numeros_vistos = set()

    for item in beneficios_list:
        numero = "".join(
            filter(str.isdigit, str(item))
        )

        if not numero:
            continue

        if numero in numeros_vistos:
            continue

        numeros_vistos.add(numero)
        numeros_beneficios.append(numero)

    if not numeros_beneficios:
        raise HTTPException(
            status_code=502,
            detail=(
                f"O provedor {provider_type} retornou "
                "benefícios, mas os identificadores "
                "não puderam ser identificados."
            ),
        )

    detailed_beneficios = []
    results = []

    async with AsyncSessionLocal() as temp_db:
        coef_fator = await obter_coeficiente_fator(
            temp_db,
            convenio=convenio,
        )

        for numero_beneficio in numeros_beneficios:
            try:
                # O MultiCorban precisa do convênio para
                # localizar a matrícula no cache correto.
                if provider_type == "multicorban":
                    res = (
                        await provider.consultar_por_beneficio(
                            numero_beneficio,
                            convenio=convenio,
                        )
                    )
                else:
                    res = (
                        await provider.consultar_por_beneficio(
                            numero_beneficio
                        )
                    )

                res["convenio"] = (
                    res.get("convenio")
                    or convenio
                )

                if (
                    "telefones" in res
                    and isinstance(
                        res["telefones"],
                        list,
                    )
                ):
                    res["telefones"] = [
                        telefone
                        for telefone in res["telefones"]
                        if telefone
                    ]

                margens = res.get("margens") or {}
                cliente = res.get("cliente") or {}

                margem_livre = margens.get(
                    "margem_livre"
                )

                if margem_livre is None:
                    margem_livre = cliente.get(
                        "margem_livre",
                        0.0,
                    )

                valor_liberado = (
                    await calcular_valor_liberado_margem(
                        margem_livre or 0.0,
                        temp_db,
                        convenio=convenio,
                    )
                )

                if margens:
                    margens[
                        "valor_liberado_margem"
                    ] = valor_liberado
                    margens[
                        "coeficiente_utilizado"
                    ] = coef_fator

                if cliente:
                    cliente[
                        "valor_liberado_margem"
                    ] = valor_liberado
                    cliente[
                        "coeficiente_utilizado"
                    ] = coef_fator

                results.append(
                    (numero_beneficio, res)
                )

                detalhe = BeneficioDetalhado(
                    numero=numero_beneficio,
                    convenio=res.get(
                        "convenio",
                        convenio,
                    ),
                    cliente=res["cliente"],
                    margens=res["margens"],
                    beneficio=res["beneficio"],
                    banco_pagador=res.get(
                        "banco_pagador"
                    ),
                    emprestimos=res.get(
                        "emprestimos",
                        [],
                    ),
                    cartoes=res.get(
                        "cartoes",
                        [],
                    ),
                    margens_cartao=res.get(
                        "margens_cartao",
                        {},
                    ),
                    telefones=res.get(
                        "telefones",
                        [],
                    ),
                    resumo=res.get("resumo"),
                )

                detailed_beneficios.append(
                    detalhe
                )

            except Exception as error:
                numero_mascarado = (
                    f"***{numero_beneficio[-4:]}"
                    if len(numero_beneficio) >= 4
                    else "***"
                )

                print(
                    "[WARNING] Erro ao consultar "
                    f"benefício {numero_mascarado} "
                    f"no provedor {provider_type}: "
                    f"{error}"
                )

                results.append(
                    (numero_beneficio, None)
                )

    if not detailed_beneficios:
        raise HTTPException(
            status_code=404,
            detail=(
                "Não foi possível recuperar dados "
                "detalhados para os benefícios."
            ),
        )

    first_res = next(
        (
            result_data
            for _, result_data in results
            if result_data is not None
        ),
        None,
    )

    if not first_res:
        raise HTTPException(
            status_code=404,
            detail=(
                "Não foi possível recuperar dados "
                "detalhados para os benefícios."
            ),
        )

    beneficio_principal = ConsultaResponse(
        **first_res
    )

    multi_response = ConsultaCpfMultiResponse(
        success=True,
        cpf=clean_cpf,
        total_beneficios=len(
            detailed_beneficios
        ),
        beneficios=detailed_beneficios,
        beneficio_principal=beneficio_principal,
        **first_res,
    )

    # A tabela atual não possui coluna de convênio.
    # Portanto, somente INSS pode ser persistido nela.
    if use_persistent_cache:
        resultado_dict = multi_response.model_dump()
        dados_str = json.dumps(resultado_dict)

        try:
            async with AsyncSessionLocal() as write_db:
                stmt = select(
                    ConsultaCpfCache
                ).where(
                    ConsultaCpfCache.cpf
                    == clean_cpf
                )

                res_cache = await write_db.execute(
                    stmt
                )

                existing_cache = (
                    res_cache.scalar_one_or_none()
                )

                if existing_cache:
                    existing_cache.dados_json = (
                        dados_str
                    )
                    existing_cache.updated_at = (
                        func.now()
                    )
                else:
                    nova_consulta = ConsultaCpfCache(
                        cpf=clean_cpf,
                        dados_json=dados_str,
                    )
                    write_db.add(nova_consulta)

                await write_db.commit()

        except Exception as cache_write_err:
            print(
                "[WARNING] Falha ao gravar cache "
                f"no banco: {cache_write_err}"
            )

    return multi_response

# ROTA UNIFICADA CPF
@router.post("/cpf", response_model=ConsultaCpfMultiResponse)
async def consultar_cpf_unificado(
    request: CpfRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    if current_user.role != "admin" and not getattr(current_user, "can_consult_cpf", False):
        raise HTTPException(status_code=403, detail="Você não tem permissão para realizar consultas de CPF.")
    
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
