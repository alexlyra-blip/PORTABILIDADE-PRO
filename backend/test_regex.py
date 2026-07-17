import json
import re

gemini_reply = """```json
{
  "action": "simulate",
  "data": { "convenio": "INSS", "banco_origem": "C6", "idade": 50, "parcela": 133.00, "saldo_devedor": 5000.00, "total_term": 84, "remaining_term": 60, "benefit_species": "não sei", "analfabeto": "nao" }
}
```"""

sim_data = None
try:
    json_str = gemini_reply
    match = re.search(r'\{.*\}', json_str, re.DOTALL)
    if match:
        json_str = match.group(0)
    elif "```json" in json_str:
        json_str = json_str.split("```json")[1].split("```")[0].strip()
    elif "```" in json_str:
        json_str = json_str.split("```")[1].split("```")[0].strip()
    
    print("EXTRACTED STRING:")
    print(repr(json_str))
    
    data = json.loads(json_str)
    sim_data = data.get("data", {})
    print("SIM DATA:", sim_data)
except Exception as e:
    import traceback
    traceback.print_exc()
    sim_data = None
    print("FAILED")

if sim_data:
    print("SUCCESS, SIM_DATA is truthy")
else:
    print("sim_data is falsy")
