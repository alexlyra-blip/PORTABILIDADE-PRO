import sys
import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import SimulacaoInput

# Fix path for engine access
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
from engine.simulation_engine import executar_simulacao_completa

class SimuladorService:
    @staticmethod
    async def executar(input_data: SimulacaoInput, db: AsyncSession, user_id: int):
        return await executar_simulacao_completa(input_data, db, user_id)
