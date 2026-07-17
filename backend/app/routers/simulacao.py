from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import re
import os
import traceback

from app.database import get_db
from app.models.models import SimulacaoInput
from app.routers.deps import get_current_user, verify_n8n_internal_key, get_n8n_service_user
from app.models.sqlalchemy_models import User
from app.services.simulador_service import SimuladorService

router = APIRouter()

@router.post("/simular")
async def simular_portabilidade(
    input_data: SimulacaoInput, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        resultados = await SimuladorService.executar(input_data, db, current_user.id)
        return resultados
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class ClienteInput(BaseModel):
    nome: Optional[str] = ""
    cpf: str
    idade: Optional[int] = 0
    beneficio: str
    especie: Optional[str] = ""
    salario: Optional[float] = 0.0
    margem_livre: Optional[float] = 0.0
    banco_pagador: Optional[str] = ""
    codigo_banco_pagador: Optional[str] = ""
    analfabeto: Optional[bool] = None
    nao_assina: Optional[bool] = None
    cliente_assina: Optional[bool] = None

class PromosysInput(BaseModel):
    origem: Optional[str] = "PROMOSYS"
    cliente: ClienteInput
    margens: Optional[Dict[str, Any]] = {}
    emprestimos: List[Dict[str, Any]] = []
    cartoes: Optional[List[Dict[str, Any]]] = []
    telefones: Optional[List[str]] = []
    analfabeto: Optional[bool] = None
    nao_assina: Optional[bool] = None
    cliente_assina: Optional[bool] = None

def extrair_codigo_especie(especie: str) -> str:
    if not especie:
        return ""
    match = re.match(r"^(\d{1,2})", str(especie).strip())
    if match:
        return match.group(1).zfill(2)
    return ""

# Shared Core Function for Promosys Simulation (resuming 100% of current logic)
async def processar_simulacao_promosys_core(
    payload: PromosysInput,
    db: AsyncSession,
    user_id: int
) -> dict:
    if not payload.cliente.cpf:
        raise HTTPException(status_code=400, detail="CPF não informado.")
    if not payload.cliente.beneficio:
        raise HTTPException(status_code=400, detail="Benefício não informado.")
    if not payload.emprestimos or len(payload.emprestimos) == 0:
        raise HTTPException(status_code=400, detail="Nenhum contrato (empréstimo) encontrado para simulação.")

    idade_cliente = payload.cliente.idade or 0
    possui_dois_cartoes = len(payload.cartoes) >= 2 if payload.cartoes else False
    
    # Check for analfabeto / não assina flags
    is_analfabeto = (
        payload.analfabeto is True or
        payload.nao_assina is True or
        payload.cliente_assina is False or
        payload.cliente.analfabeto is True or
        payload.cliente.nao_assina is True or
        payload.cliente.cliente_assina is False
    )
    
    # Calculate negative margin correctly
    margem_livre_cliente = payload.margens.get("margem_livre", 0) if payload.margens else payload.cliente.margem_livre
    valor_margem_negativa = abs(margem_livre_cliente) if margem_livre_cliente and margem_livre_cliente < 0 else 0.0

    simulacoes_result = []

    for emp in payload.emprestimos:
        # Skip invalid loans
        if not emp.get("parcela") or not emp.get("quitacao") or not emp.get("prazo") or not emp.get("banco"):
            continue

        # Construir o input para o simulador
        sim_input = SimulacaoInput(
            banco=str(emp.get("codigo", "")) or str(emp.get("banco", "")),
            convenio="INSS",
            sub_convenio=None,
            idade=max(18, idade_cliente), # Simulate requires > 17
            parcela=float(emp.get("parcela", 0)),
            saldo_devedor=float(emp.get("quitacao", 0)),
            total_term=int(emp.get("prazo", 0)),
            remaining_term=max(1, int(emp.get("prazo_restante", 0))),
            taxa_atual=float(emp.get("taxa", 0)) if emp.get("taxa") else None,
            benefit_species=extrair_codigo_especie(payload.cliente.especie),
            cpf=payload.cliente.cpf,
            nome_cliente=payload.cliente.nome,
            analfabeto=is_analfabeto,
            is_60_plus=idade_cliente >= 60,
            is_invalidez_60_plus=extrair_codigo_especie(payload.cliente.especie) in ["04", "05", "06", "32", "92", "87"] and idade_cliente >= 60,
            possui_dois_cartoes=possui_dois_cartoes,
            valor_margem_negativa=float(valor_margem_negativa)
        )

        # Rodar a simulacao
        try:
            resultados_contrato = await SimuladorService.executar(sim_input, db, user_id)
            simulacoes_result.append({
                "contrato": emp,
                "ofertas": resultados_contrato
            })
        except Exception as sim_err:
            # Log sim err but continue
            print(f"Erro simulando contrato {emp.get('contrato')}: {str(sim_err)}")

    return {
        "success": True,
        "cliente": payload.cliente.dict(),
        "total_contratos": len(payload.emprestimos),
        "simulacoes": simulacoes_result,
        "cartoes": payload.cartoes or []
    }

# Endpoint 1: JWT Authentication for Web System
@router.post("/promosys")
async def simular_portabilidade_promosys(
    payload: PromosysInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return await processar_simulacao_promosys_core(payload, db, current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint 2: Internal integration endpoint protected by x-api-key
@router.post("/internal/promosys/simular", tags=["Internal Integration"])
async def simular_portabilidade_promosys_interna(
    payload: PromosysInput,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_n8n_internal_key)
):
    try:
        # Resolve technical user for audit using the shared helper
        tech_user = await get_n8n_service_user(db)

        # Audit logging (no complete CPF, no API key)
        print(f"[AUDIT] Rota interna chamada: POST /api/internal/promosys/simular | "
              f"Usuario tecnico ID: {tech_user.id} ({tech_user.name}) | "
              f"Contratos processados: {len(payload.emprestimos)}")

        return await processar_simulacao_promosys_core(payload, db, tech_user.id)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
