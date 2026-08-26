from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models.sqlalchemy_models import User
from app.routers.deps import get_current_user
from app.services.portabilidade_multipla_service import (
    PortabilidadeMultiplaFactaService,
)


router = APIRouter()


class ContratoMultiplaInput(BaseModel):
    banco: str
    parcela: float
    saldo_devedor: float = 0.0
    contrato: Optional[str] = None
    beneficio: str


class PortabilidadeMultiplaInput(BaseModel):
    banco_destino: str = "FACTA"
    convenio: str = "INSS"
    margem_disponivel: float = 0.0
    contratos: List[ContratoMultiplaInput]
    valor_operacao_refin: Optional[float] = None


@router.get("/config")
async def configuracao_portabilidade_multipla(
    current_user: User = Depends(get_current_user),
):
    return {
        "banco": "FACTA",
        "convenio": "INSS",
        "max_contratos": (
            PortabilidadeMultiplaFactaService
            .MAX_CONTRATOS
        ),
        "grupo_a": sorted(
            PortabilidadeMultiplaFactaService
            .GRUPO_A
        ),
        "grupo_b": sorted(
            PortabilidadeMultiplaFactaService
            .GRUPO_B
        ),
        "grupo_c": sorted(
            PortabilidadeMultiplaFactaService
            .GRUPO_C
        ),
        "parcela_minima_refin": 50.0,
        "valor_minimo_operacao": 3000.0,
        "adicional_viabilidade": 20.0,
    }


@router.post("/validar")
async def validar_portabilidade_multipla(
    payload: PortabilidadeMultiplaInput,
    current_user: User = Depends(get_current_user),
):
    contratos = []

    for contrato in payload.contratos:
        if hasattr(contrato, "model_dump"):
            contratos.append(
                contrato.model_dump()
            )
        else:
            contratos.append(
                contrato.dict()
            )

    return (
        PortabilidadeMultiplaFactaService
        .validar(
            banco_destino=(
                payload.banco_destino
            ),
            convenio=payload.convenio,
            margem_disponivel=(
                payload.margem_disponivel
            ),
            contratos=contratos,
            valor_operacao_refin=(
                payload.valor_operacao_refin
            ),
        )
    )
