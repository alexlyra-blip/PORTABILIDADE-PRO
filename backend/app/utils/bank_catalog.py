import re
from typing import Any, Tuple

BANK_CATALOG = {
    "001": "BANCO DO BRASIL",
    "003": "BANCO DA AMAZÔNIA",
    "004": "BANCO DO NORDESTE",
    "012": "BANCO INBURSA",
    "021": "BANESTES",
    "025": "BANCO ALFA",
    "029": "ITAÚ CONSIGNADO",
    "033": "SANTANDER",
    "041": "BANRISUL",
    "047": "BANCO DO ESTADO DO SERGIPE",
    "069": "CREFISA",
    "070": "BRB",
    "074": "BANCO SAFRA",
    "077": "BANCO INTER",
    "079": "PICPAY",
    "081": "BANCO SEGURO",
    "104": "CAIXA",
    "121": "AGIBANK",
    "149": "FACTA FINANCEIRA",
    "169": "OLÉ CONSIGNADO",
    "184": "ITAÚ BBA",
    "212": "BANCO ORIGINAL",
    "233": "BANCO CIFRA",
    "237": "BRADESCO",
    "250": "BANCO BCV",
    "254": "PARANÁ BANCO",
    "268": "BARIGUI",
    "290": "PAGBANK",
    "318": "BANCO BMG",
    "320": "CCB BRASIL",
    "326": "PARATI",
    "329": "QI SOCIEDADE",
    "335": "DIGIO",
    "336": "C6 BANK",
    "341": "ITAÚ",
    "359": "ZEMA",
    "380": "PICPAY",
    "386": "NU FINANCEIRA",
    "389": "BANCO MERCANTIL",
    "422": "BANCO SAFRA",
    "465": "CAPITAL CONSIG",
    "604": "BANCO INDUSTRIAL DO BRASIL",
    "611": "PAULISTA",
    "623": "BANCO PAN",
    "626": "C6 CONSIGNADO",
    "643": "BANCO PINE",
    "655": "BANCO VOTORANTIM",
    "707": "BANCO DAYCOVAL",
    "739": "BANCO CETELEM",
    "748": "SICREDI",
    "752": "BNP PARIBAS",
    "753": "NBC BANK",
    "756": "SICOOB",
    "908": "PARATI CFI",
    "925": "BRB CRÉDITO",
    "935": "FACTA FINANCEIRA",
    "966": "SABEMI",
}


def resolve_bank_info(raw_code: Any, raw_name: Any = "") -> Tuple[str, str]:
    """
    Normaliza o código do banco para 3 dígitos e resolve o nome canônico do banco
    a partir do catálogo oficial, evitando repetições como '079 - 79' ou '079 - 079'.
    
    Retorna uma tupla (codigo_3_digitos, nome_do_banco).
    Exemplo:
        resolve_bank_info('79', '79') -> ('079', 'PICPAY')
        resolve_bank_info('643', '643') -> ('643', 'BANCO PINE')
        resolve_bank_info('121', '121 - AGIBANK') -> ('121', 'AGIBANK')
    """
    code_digits = "".join(filter(str.isdigit, str(raw_code or "")))
    clean_code = code_digits.zfill(3)[:3] if code_digits else ""

    raw_name_str = str(raw_name or "").strip()

    # Se não temos código explícito, tenta extrair dos primeiros dígitos do nome
    if not clean_code and raw_name_str:
        match = re.match(r"^(\d{1,3})", raw_name_str)
        if match:
            clean_code = match.group(1).zfill(3)

    # Remover prefixo de código que já possa existir no nome (ex: '079 - ', '79 - ')
    cleaned_name = raw_name_str
    if clean_code:
        code_num = str(int(clean_code))
        cleaned_name = re.sub(
            rf"^(?:0*{code_num}|{clean_code})\s*[-–—:]\s*",
            "",
            cleaned_name,
            flags=re.IGNORECASE,
        ).strip()

    # Verifica se o nome recebido é meramente numérico ou idêntico ao código
    is_pure_digits = (
        cleaned_name.isdigit()
        or not cleaned_name
        or cleaned_name == clean_code
        or (cleaned_name.isdigit() and int(cleaned_name) == int(clean_code or 0))
    )

    catalog_name = BANK_CATALOG.get(clean_code)

    if catalog_name:
        # Se temos nome no catálogo oficial, preferimos o catálogo (especialmente se o recebido for código puro ou vazio)
        resolved_name = catalog_name
    elif not is_pure_digits:
        resolved_name = cleaned_name
    else:
        resolved_name = clean_code or str(raw_code or "")

    return clean_code or str(raw_code or ""), resolved_name
