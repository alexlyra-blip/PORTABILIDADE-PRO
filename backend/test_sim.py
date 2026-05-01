import urllib.request
import json
import sys

BASE = "http://localhost:8000"

try:
    login_data = json.dumps({"email": "admin@teste.com", "password": "admin123"}).encode()
    req = urllib.request.Request(f"{BASE}/api/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    auth_resp = json.loads(resp.read())
    if "access_token" not in auth_resp:
        print(f"Login failed: {auth_resp}")
        sys.exit(1)
    token = auth_resp["access_token"]
    print(f"Token: {token[:20]}...")
except Exception as e:
    print(f"Login error: {str(e)}")
    sys.exit(1)

# Simulate
sim_data = json.dumps({
    "nome_cliente": "Test User",
    "convenio": "INSS",
    "banco": "ITAU",
    "parcela": 500.0,
    "saldo_devedor": 15000.0,
    "total_term": 84,
    "remaining_term": 72,
    "taxa_atual": 1.5,
    "idade": 65,
    "benefit_species": "41",
    "is_60_plus": False,
    "benefit_time_years": 0,
    "benefit_time_months": 0
}).encode()

req2 = urllib.request.Request(
    f"{BASE}/api/simular", 
    data=sim_data, 
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
)

try:
    resp2 = urllib.request.urlopen(req2)
    result = json.loads(resp2.read())
    print(f"Status: {resp2.status}")
    print(json.dumps(result, indent=2, default=str)[:3000])
except urllib.error.HTTPError as e:
    print(f"Error: {e.code}")
    print(e.read().decode()[:2000])
