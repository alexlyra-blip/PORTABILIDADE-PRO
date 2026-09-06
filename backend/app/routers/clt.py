import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routers.deps import (
    get_current_user,
    verify_n8n_internal_key,
)
from app.services.bank_credentials_service import BankCredentialsService
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

    # Necessaria para autorizacao C6 Credito do Trabalhador.
    data_nascimento: Optional[str] = None

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

    lotus_proposal_id: Optional[str] = None


class CltSimulacaoRequest(BaseModel):
    cpf: str
    banco_id: Optional[str] = "presenca_bank"
    lotus_proposal_id: Optional[str] = None
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


async def carregar_fintech_corban_credentials(
    db: AsyncSession,
    user_id: int,
):
    return await BankCredentialsService.get_decrypted_credentials(
        db,
        user_id=user_id,
        provider="FINTECH_CORBAN",
    )

async def carregar_presenca_credentials(
    db: AsyncSession,
    user_id: int,
):
    return await BankCredentialsService.get_decrypted_credentials(
        db,
        user_id=user_id,
        provider="PRESENCA",
    )

async def carregar_lotus_credentials(
    db: AsyncSession,
    user_id: int,
):
    return await BankCredentialsService.get_decrypted_credentials(
        db,
        user_id=user_id,
        provider="LOTUS",
    )

async def carregar_c6_credentials(
    db: AsyncSession,
    user_id: int,
):
    return await BankCredentialsService.get_decrypted_credentials(
        db,
        user_id=user_id,
        provider="C6",
    )


def validar_permissao(current_user) -> None:
    allowed_roles = {
        "admin",
        "promotora",
        "corretor",
        "vendedor",
    }

    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=(
                "Você não tem permissão "
                "para acessar o módulo CLT."
            ),
        )


async def consultar_core(
    request: CltConsultaRequest,
    lotus_credentials=None,
    presenca_credentials=None,
    c6_credentials=None,
):
    orchestrator = CltOrchestrator(
        lotus_credentials=lotus_credentials,
        presenca_credentials=presenca_credentials,
        c6_credentials=c6_credentials,
    )

    try:
        return await orchestrator.processar(
            cpf=request.cpf,
            nome_informado=request.nome,
            telefone_informado=request.telefone,
            email_informado=request.email,
            data_nascimento_informada=request.data_nascimento,
            vinculo_index=request.vinculo_index,
            valor_parcela=request.valor_parcela,
            valor_solicitado=request.valor_solicitado,
            quantidade_parcelas=request.quantidade_parcelas,
            lotus_proposal_id=request.lotus_proposal_id,
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


async def simular_core(
    request: CltSimulacaoRequest,
    lotus_credentials=None,
    presenca_credentials=None,
):
    orchestrator = CltOrchestrator(
        lotus_credentials=lotus_credentials,
        presenca_credentials=presenca_credentials,
    )

    if request.banco_id == "lotus_mais":
        if not request.lotus_proposal_id:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "proposalId da Lotus não informado.",
                    "code": "LOTUS_PROPOSAL_ID_AUSENTE",
                },
            )
        if not request.valor_solicitado:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Para refazer a simulação da Lotus informe "
                    "valor_solicitado."
                ),
            )
        try:
            provider_result = await orchestrator.lotus.consultar_fluxo(
                cpf=request.cpf,
                nome=request.nome or "Cliente CLT",
                telefone=request.telefone or "",
                proposal_id=request.lotus_proposal_id,
                valor_solicitado=request.valor_solicitado,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            logger.exception("Erro na simulação Lotus CLT: %s", exc)
            raise HTTPException(
                status_code=502,
                detail="Não foi possível concluir a simulação Lotus.",
            )

        return {
            "success": True,
            "status": provider_result.get("status"),
            "cliente": {
                "cpf": request.cpf,
                "nome": request.nome,
                "telefone": request.telefone,
                "email": request.email,
            },
            "autorizacao": None,
            "autorizacoes": [],
            "bancos": [provider_result],
        }

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
    db: AsyncSession = Depends(get_db),
):
    validar_permissao(current_user)

    lotus_credentials = await carregar_lotus_credentials(
        db,
        current_user.id,
    )

    presenca_credentials = await carregar_presenca_credentials(
        db,
        current_user.id,
    )

    c6_credentials = await carregar_c6_credentials(
        db,
        current_user.id,
    )

    return await consultar_core(
        request,
        lotus_credentials=lotus_credentials,
        presenca_credentials=presenca_credentials,
        c6_credentials=c6_credentials,
    )


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
    db: AsyncSession = Depends(get_db),
):
    validar_permissao(current_user)

    lotus_credentials = await carregar_lotus_credentials(
        db,
        current_user.id,
    )

    presenca_credentials = await carregar_presenca_credentials(
        db,
        current_user.id,
    )

    return await simular_core(
        request,
        lotus_credentials=lotus_credentials,
        presenca_credentials=presenca_credentials,
    )


@internal_router.post("/simular")
async def simular_clt_internal(
    request: CltSimulacaoRequest,
    api_key: str = Depends(verify_n8n_internal_key),
):
    return await simular_core(request)
