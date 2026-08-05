import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.routers.deps import (
    get_current_user,
    verify_n8n_internal_key,
)
from app.services.clt_orchestrator import (
    CltOrchestrator,
)


logger = logging.getLogger("clt_router")


router = APIRouter(prefix="/clt")

internal_router = APIRouter(
    prefix="/internal/clt"
)


class CltConsultaRequest(BaseModel):
    cpf: str

    nome: Optional[str] = None

    # Sempre telefone do cliente.
    telefone: Optional[str] = None

    email: Optional[str] = None

    vinculo_index: Optional[int] = Field(
        default=None,
        ge=1,
    )

    # Ajuste opcional da nova simulação. Informe somente
    # valor_parcela ou valor_solicitado.
    valor_parcela: Optional[float] = Field(
        default=None,
        gt=0,
    )

    valor_solicitado: Optional[float] = Field(
        default=None,
        gt=0,
    )

    quantidade_parcelas: Optional[int] = Field(
        default=None,
        ge=0,
        le=120,
    )


class CltSimulacaoRequest(BaseModel):
    cpf: str
    nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    data_nascimento: Optional[str] = None
    nome_mae: Optional[str] = None
    sexo: Optional[str] = None
    cnpj_empregador: Optional[str] = None
    matricula: Optional[str] = None
    margem_disponivel: Optional[float] = Field(default=None, ge=0)
    margem_base: Optional[float] = Field(default=None, ge=0)
    total_devido: Optional[float] = Field(default=None, ge=0)
    valor_parcela: Optional[float] = Field(default=None, gt=0)
    valor_solicitado: Optional[float] = Field(default=None, gt=0)
    quantidade_parcelas: Optional[int] = Field(default=None, ge=0, le=120)


def validar_permissao(current_user) -> None:
    if (
        current_user.role != "admin"
        and not getattr(
            current_user,
            "can_consult_cpf",
            False,
        )
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Você não tem permissão "
                "para realizar consultas de CPF."
            ),
        )


async def consultar_core(
    request: CltConsultaRequest,
):
    orchestrator = CltOrchestrator()

    try:
        return await orchestrator.processar(
            cpf=request.cpf,
            nome_informado=request.nome,
            telefone_informado=request.telefone,
            email_informado=request.email,
            vinculo_index=request.vinculo_index,
            valor_parcela=request.valor_parcela,
            valor_solicitado=request.valor_solicitado,
            quantidade_parcelas=request.quantidade_parcelas,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception(
            "Erro na consulta CLT: %s",
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Não foi possível concluir "
                "a consulta CLT."
            ),
        )


async def simular_core(request: CltSimulacaoRequest):
    orchestrator = CltOrchestrator()

    cached_context = orchestrator.presenca.obter_contexto_simulacao(
        request.cpf
    ) or {}

    def context_value(name, fallback=None):
        informed = getattr(request, name, None)
        if informed is not None and str(informed).strip() != "":
            return informed
        return cached_context.get(name, fallback)

    simulation_context = {
        "cpf": request.cpf,
        "nome": context_value("nome"),
        "telefone": context_value("telefone"),
        "email": context_value("email"),
        "data_nascimento": context_value("data_nascimento"),
        "nome_mae": context_value("nome_mae"),
        "sexo": context_value("sexo"),
        "cnpj_empregador": context_value("cnpj_empregador"),
        "matricula": context_value("matricula"),
        "margem_disponivel": context_value("margem_disponivel", 0),
        "margem_base": context_value("margem_base", 0),
        "total_devido": context_value("total_devido", 0),
    }

    missing = [
        field
        for field in (
            "nome",
            "telefone",
            "email",
            "data_nascimento",
            "nome_mae",
            "sexo",
            "cnpj_empregador",
            "matricula",
        )
        if not str(simulation_context.get(field) or "").strip()
    ]

    if missing:
        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "Os dados autorizados da simulação expiraram. "
                    "Atualize a consulta uma vez para recuperá-los."
                ),
                "code": "CONTEXTO_SIMULACAO_EXPIRADO",
                "missing": missing,
            },
        )

    try:
        provider_result = await orchestrator.presenca.simular_com_contexto(
            **simulation_context,
            valor_parcela=request.valor_parcela,
            valor_solicitado=request.valor_solicitado,
            quantidade_parcelas=request.quantidade_parcelas,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Erro na simulação CLT: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Não foi possível concluir a simulação CLT.",
        )

    bank_result = {
        **provider_result,
        "banco_id": "presenca_bank",
        "banco": "Presença Bank",
    }

    return {
        "success": True,
        "status": provider_result.get("status"),
        "cliente": {
            "cpf": request.cpf,
            "nome": simulation_context["nome"],
            "telefone": simulation_context["telefone"],
            "email": simulation_context["email"],
        },
        "autorizacao": None,
        "bancos": [bank_result],
    }


@router.post("/consulta")
async def consultar_clt(
    request: CltConsultaRequest,
    current_user=Depends(get_current_user),
):
    validar_permissao(current_user)

    return await consultar_core(request)


@internal_router.post("/consulta")
async def consultar_clt_internal(
    request: CltConsultaRequest,
    api_key: str = Depends(
        verify_n8n_internal_key
    ),
):
    return await consultar_core(request)


@router.post("/simular")
async def simular_clt(
    request: CltSimulacaoRequest,
    current_user=Depends(get_current_user),
):
    validar_permissao(current_user)
    return await simular_core(request)


@internal_router.post("/simular")
async def simular_clt_internal(
    request: CltSimulacaoRequest,
    api_key: str = Depends(verify_n8n_internal_key),
):
    return await simular_core(request)
