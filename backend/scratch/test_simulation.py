
import asyncio
import sys
import os

# Adicionar o diretório do backend ao path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from engine.simulation_engine import executar_simulacao_completa
from app.db.database import get_db
from app.models.models import ClienteInput

async def test():
    print("Iniciando Simulação de Teste...")
    cliente = ClienteInput(
        nome_cliente="Teste Alexandre",
        cpf="00000000000",
        idade=60,
        convenio="INSS",
        especie_beneficio="41",
        banco="237 - BRADESCO S.A.",
        parcela=125.00,
        saldo_devedor=5000.00,
        prazo_total=84,
        remaining_term=60, # 84 - 24 = 60
        is_60_plus=True,
        analfabeto=False
    )
    
    # Simular o contexto de DB
    async for db in get_db():
        result = await executar_simulacao_completa(cliente, db, user_id=1)
        print("\n=== RESULTADO DA SIMULAÇÃO ===")
        print(f"Ofertas Aprovadas: {len(result['ofertas'])}")
        for o in result['ofertas']:
            print(f" -> {o['banco']} - Tabela: {o['tabela']} - Troco: R$ {o['valor_liberado']:.2f}")
            
        print(f"\nBancos Rejeitados: {len(result['rejeitados'])}")
        for r in result['rejeitados']:
            print(f" -> {r['banco']}: {r['motivo']}")
        break

if __name__ == "__main__":
    asyncio.run(test())
