import asyncio
import httpx

async def main():
    base_url = "https://jcf.promosysweb.com/services"
    usuario = "ALXS"
    senha = "48k6joB6cJPUlVAS"
    
    print("Testing Promosys with provided credentials...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/token.php",
                data={"usuario": usuario, "senha": senha},
                timeout=10.0
            )
        print(f"Token Status: {response.status_code}")
        data = response.json()
        print(f"Token JSON: {data}")
        
        token = data.get("Token")
        if token:
            print("\nTesting CPF Consultation...")
            cpf = "11111111111" # Dummy CPF
            async with httpx.AsyncClient() as client:
                res2 = await client.post(
                    f"{base_url}/consultaCpfOffline.php",
                    data={"token": token, "cpf": cpf},
                    timeout=10.0
                )
            print(f"CPF Status: {res2.status_code}")
            print(f"CPF JSON: {res2.text[:500]}") # Print first 500 chars

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
