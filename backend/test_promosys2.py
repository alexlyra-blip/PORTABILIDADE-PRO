import asyncio
import os
import sys

# Load env manually
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ[k] = v

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.consultas.promosys_provider import PromosysProvider
from app.services.consultas.consulta_service import ConsultaService

async def main():
    try:
        provider = PromosysProvider()
        # Test with a dummy response mock or just print logic
        print("Test ready")
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
