import asyncio
from app.services.consultas.promosys_provider import PromosysProvider
import httpx

async def test():
    provider = PromosysProvider()
    try:
        # First test the API raw response
        token = await provider._get_token()
        print(f"Token: {token[:20]}...")
        
        cpf_test = "60072718382"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{provider.base_url}/consultaCpfOffline.php",
                data={"token": token, "cpf": cpf_test},
                timeout=10.0
            )
            print("Status:", resp.status_code)
            try:
                data = resp.json()
                print("Code:", data.get("Code"))
                print("Msg:", data.get("Msg"))
                if "Consulta" in data:
                    print("Consulta length:", len(data["Consulta"]))
                else:
                    print("Full JSON:", data)
            except Exception as je:
                print("JSON Error:", je)
                print("Text:", resp.text)
                
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test())
