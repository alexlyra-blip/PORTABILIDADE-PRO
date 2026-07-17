import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.get('http://localhost:8000/admin/banks/1/tables')
        print(res.status_code)
        print(res.text[:500])

asyncio.run(test())
