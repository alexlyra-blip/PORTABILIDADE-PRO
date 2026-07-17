import urllib.request
import sys

req = urllib.request.Request('https://api.portabilidadepro.com.br/api/admin/whatsapp-logs', headers={'User-Agent': 'Mozilla/5.0'})
try:
    res = urllib.request.urlopen(req)
    print("Success!")
except urllib.error.HTTPError as e:
    print(f"Error {e.code}: {e.read().decode('utf-8')}")
    sys.exit(1)
