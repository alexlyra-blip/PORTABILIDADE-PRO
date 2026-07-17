from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.simulador_service import SimuladorService
from app.models.models import SimulacaoInput
from app.routers.deps import verify_n8n_internal_key

router = APIRouter()

@router.post("/external/simulate")
async def external_simulate(
    request: SimulacaoInput, 
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_n8n_internal_key)
):
    try:
        # Executa usando o user_id 1 (Admin) como padrão para o n8n
        res = await SimuladorService.executar(request, db, user_id=1)
        
        ofertas = res.get("ofertas", [])
        rejeitados = res.get("rejeitados", [])
        
        return {
            "status": "success",
            "cliente": request.nome_cliente or "Cliente WhatsApp",
            "total_aprovados": len(ofertas),
            "total_rejeitados": len(rejeitados),
            "melhor_oferta": ofertas[0] if ofertas else None,
            "ofertas": ofertas,
            "detalhes_rejeicao": [{"banco": r["banco"], "motivo": r["motivo"]} for r in rejeitados]
        }
    except Exception as e:
        import traceback
        print(f"ERROR N8N INTEGRATION: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro no motor de simulação: {str(e)}")
