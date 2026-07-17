import asyncio
from app.services.consultas.multicorban_provider import MultiCorbanProvider

async def test():
    provider = MultiCorbanProvider()
    try:
        res = await provider.consultar_creditos()
        print(res)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test())
