import asyncio
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def test_login():
    client = TestClient(app)
    print("Testando login com alexlyra@gmail.com...")
    response = client.post("/api/auth/login", json={
        "email": "alexlyra@gmail.com",
        "password": "mudar_senha_em_producao"
    })
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
    
    print("\nTestando com senha xandy@2013...")
    response = client.post("/api/auth/login", json={
        "email": "alexlyra@gmail.com",
        "password": "xandy@2013"
    })
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")

if __name__ == "__main__":
    test_login()
