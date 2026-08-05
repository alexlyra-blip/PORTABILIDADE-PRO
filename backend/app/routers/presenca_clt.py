import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.routers.deps import (
    get_current_user,
    verify_n8n_internal_key,
)
from app.services.presenca_bank_service import (
    PresencaBankService,
)


logger = logging.getLogger("presenca_clt_router")


router = APIRouter(
    prefix="/consultas/presenca-clt",
)

internal_router = APIRouter(
    prefix="/internal/consultas/presenca-clt",
)


class PresencaTermoRequest(BaseModel):
    cpf: str
    nome: str
    telefone: str


class PresencaCpfRequest(BaseModel):
    cpf: str


class PresencaMargemRequest(BaseModel):
    cpf: str
    matricula: str
    cnpj: str


class PresencaProcessarRequest(BaseModel):
    cpf: str
    nome: str
    telefone: str
    email: Optional[str] = None
    vinculo_index: Optional[int] = Field(
        default=None,
        ge=1,
    )
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


def erro_http(exc: Exception) -> HTTPException:
    logger.error(
        "Erro na integração Presença CLT: %s",
        exc,
    )

    if isinstance(exc, ValueError):
        return HTTPException(
            status_code=400,
            detail=str(exc),
        )

    return HTTPException(
        status_code=502,
        detail=(
            "Não foi possível concluir a consulta "
            "na Presença Bank."
        ),
    )


async def gerar_termo_core(
    request: PresencaTermoRequest,
):
    service = PresencaBankService()

    try:
        response = await service.gerar_termo(
            cpf=request.cpf,
            nome=request.nome,
            telefone=request.telefone,
        )

        return {
            "success": True,
            "provider": "presenca_bank",
            "status": "awaiting_authorization",
            "autorizacao_id": response.get(
                "autorizacaoId"
            ),
            "authorization_url": response.get(
                "shorturl"
            ),
        }
    except Exception as exc:
        raise erro_http(exc)


async def consultar_vinculos_core(
    request: PresencaCpfRequest,
):
    service = PresencaBankService()

    try:
        raw_response = await service.consultar_vinculos(
            request.cpf
        )

        vinculos = service.normalizar_vinculos(
            raw_response
        )

        return {
            "success": True,
            "provider": "presenca_bank",
            "total_vinculos": len(vinculos),
            "total_elegiveis": len([
                vinculo
                for vinculo in vinculos
                if vinculo["elegivel"]
            ]),
            "vinculos": vinculos,
        }
    except Exception as exc:
        raise erro_http(exc)


async def consultar_margem_core(
    request: PresencaMargemRequest,
):
    service = PresencaBankService()

    try:
        raw_response = await service.consultar_margem(
            cpf=request.cpf,
            matricula=request.matricula,
            cnpj=request.cnpj,
        )

        margem = service.normalizar_margem(
            raw_response
        )

        return {
            "success": True,
            "provider": "presenca_bank",
            "margem": margem,
        }
    except Exception as exc:
        raise erro_http(exc)


async def processar_consulta_core(
    request: PresencaProcessarRequest,
):
    service = PresencaBankService()

    try:
        return await service.processar_consulta(
            cpf=request.cpf,
            nome=request.nome,
            telefone=request.telefone,
            email=request.email,
            vinculo_index=request.vinculo_index,
            valor_parcela=request.valor_parcela,
            valor_solicitado=request.valor_solicitado,
            quantidade_parcelas=request.quantidade_parcelas,
        )
    except Exception as exc:
        raise erro_http(exc)


@router.post("/termo")
async def gerar_termo(
    request: PresencaTermoRequest,
    current_user=Depends(get_current_user),
):
    validar_permissao(current_user)

    return await gerar_termo_core(request)


@router.post("/vinculos")
async def consultar_vinculos(
    request: PresencaCpfRequest,
    current_user=Depends(get_current_user),
):
    validar_permissao(current_user)

    return await consultar_vinculos_core(request)


@router.post("/margem")
async def consultar_margem(
    request: PresencaMargemRequest,
    current_user=Depends(get_current_user),
):
    validar_permissao(current_user)

    return await consultar_margem_core(request)


@router.post("/processar")
async def processar_consulta(
    request: PresencaProcessarRequest,
    current_user=Depends(get_current_user),
):
    validar_permissao(current_user)

    return await processar_consulta_core(request)


@internal_router.post("/termo")
async def gerar_termo_internal(
    request: PresencaTermoRequest,
    api_key: str = Depends(
        verify_n8n_internal_key
    ),
):
    return await gerar_termo_core(request)


@internal_router.post("/vinculos")
async def consultar_vinculos_internal(
    request: PresencaCpfRequest,
    api_key: str = Depends(
        verify_n8n_internal_key
    ),
):
    return await consultar_vinculos_core(request)


@internal_router.post("/margem")
async def consultar_margem_internal(
    request: PresencaMargemRequest,
    api_key: str = Depends(
        verify_n8n_internal_key
    ),
):
    return await consultar_margem_core(request)


@internal_router.post("/processar")
async def processar_consulta_internal(
    request: PresencaProcessarRequest,
    api_key: str = Depends(
        verify_n8n_internal_key
    ),
):
    return await processar_consulta_core(request)
