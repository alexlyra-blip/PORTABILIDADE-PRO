from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import SimulacaoInput
from app.routers.deps import get_current_user
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
