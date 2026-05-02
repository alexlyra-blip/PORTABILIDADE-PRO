from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.simulador_service import SimuladorService
from app.models.models import SimulacaoInput
import os

router = APIRouter()

# API KEY para o n8n
N8N_API_KEY = os.getenv("N8N_API_KEY", "portabilidade_pro_secret_key_2024")

async def verify_n8n_key(x_api_key: str = Header(None)):
    if x_api_key != N8N_API_KEY:
        raise HTTPException(status_code=403, detail="Chave de API inválida")
    return x_api_key

@router.post("/external/simulate")
async def external_simulate(
    request: SimulacaoInput, 
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_n8n_key)
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
