import os
import json

CONFIG_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "provider_config.json"))

def get_active_provider() -> str:
    if not os.path.exists(CONFIG_FILE_PATH):
        return "promosys"
    try:
        with open(CONFIG_FILE_PATH, "r") as f:
            data = json.load(f)
            return data.get("active_provider", "promosys")
    except Exception:
        return "promosys"

def set_active_provider(provider: str):
    if provider not in ["promosys", "multicorban"]:
        raise ValueError("Provider inválido. Deve ser 'promosys' ou 'multicorban'")
    try:
        with open(CONFIG_FILE_PATH, "w") as f:
            json.dump({"active_provider": provider}, f, indent=4)
    except Exception as e:
        print(f"Erro ao salvar provider_config: {e}")
