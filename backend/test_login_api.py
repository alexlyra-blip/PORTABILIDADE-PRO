import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

def run_test():
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"email": "alexlyra@gmail.com", "password": "alexandrelyra"})
    print(response.status_code)
    print(response.json())

if __name__ == "__main__":
    run_test()
