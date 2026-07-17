import asyncio
import httpx
import json

async def main():
    base_url = "https://jcf.promosysweb.com/services"
    
    print("Testing with form data...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/token.php",
                data={"usuario": "dummy", "senha": "123"},
                timeout=10.0
            )
        print(f"Status: {response.status_code}")
        print(f"Text: {response.text}")
    except Exception as e:
        print(f"Form data error: {e}")

    print("\nTesting with JSON data...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/token.php",
                json={"usuario": "dummy", "senha": "123"},
                timeout=10.0
            )
        print(f"Status: {response.status_code}")
        print(f"Text: {response.text}")
    except Exception as e:
        print(f"JSON error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
