import urllib.request
import urllib.error

url = "https://api.portabilidadepro.com.br/api/admin/dashboard-stats?days=1"
print(f"Buscando {url} ...")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req, timeout=10)
    print("STATUS:", response.status)
    # Ler apenas os primeiros 200 bytes para n\u00e3o poluir o log
    data = response.read(200)
    print("DATA:", data)
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.reason)
except urllib.error.URLError as e:
    print("URL Error:", e.reason)
except Exception as e:
    print("Error:", e)
