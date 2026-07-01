from fastapi import APIRouter, UploadFile, File, HTTPException
import pdfplumber
import io
import re
from datetime import datetime
import math

router = APIRouter()

def parse_currency(value_str):
    if not value_str: return 0.0
    try:
        clean_str = re.sub(r'[R$\s]', '', value_str)
        clean_str = clean_str.replace('.', '').replace(',', '.')
        return float(clean_str)
    except:
        return 0.0

BANK_NAMES_MAP = {
    "041": "041 - BANRISUL", "626": "626 - BANCO C6 CONSIGNADO", "033": "033 - BANCO SANTANDER",
    "908": "908 - PARATI CFI", "001": "001 - BANCO DO BRASIL", "104": "104 - CAIXA",
    "237": "237 - BANCO BRADESCO", "341": "341 - ITAU CONSIGNADO S.A.", "077": "077 - BANCO INTER",
    "025": "025 - BANCO ALFA", "422": "422 - BANCO SAFRA", "707": "707 - BANCO DAYCOVAL",
    "655": "655 - BANCO VOTORANTIM", "623": "623 - BANCO PAN", "069": "069 - BANCO CREFISA",
    "212": "212 - BANCO ORIGINAL", "047": "047 - BANESE", "935": "935 - FACTA",
    "012": "012 - BANCO INBURSA", "318": "318 - BANCO BMG", "121": "121 - AGIBANK",
    "169": "169 - BANCO OLE", "254": "254 - PARANA BANCO", "966": "966 - SABEMI",
    "389": "389 - BANCO MERCANTIL", "335": "335 - DIGIO", "753": "753 - NBC BANK",
    "290": "290 - PAGBANK", "752": "752 - BNP PARIBAS", "611": "611 - PAULISTA",
    "380": "380 - PICPAY", "329": "329 - QI SOCIEDADE", "359": "359 - ZEMA",
    "756": "756 - SICOOB"
}

def clean_bank_name(banco_str):
    if not banco_str: return "BANCO DESCONHECIDO"
    # Tenta casar pelo codigo numerico
    match = re.search(r'^(\d{3})', banco_str)
    if match and match.group(1) in BANK_NAMES_MAP:
        return BANK_NAMES_MAP[match.group(1)]
    
    cleaned = " ".join(banco_str.split())
    # Fallback caso nao tenha codigo mas tenha espacos errados (ex: SANTA NDER)
    upper_no_space = cleaned.upper().replace(" ", "")
    if 'C6CONSIGNADO' in upper_no_space: return '626 - BANCO C6 CONSIGNADO'
    if 'SANTANDER' in upper_no_space: return '033 - BANCO SANTANDER'
    if 'PARATI' in upper_no_space: return '908 - PARATI CFI'
    if 'BANRISUL' in upper_no_space or 'ESTADODORIOGRANDE' in upper_no_space: return '041 - BANRISUL'
    
    return cleaned

def calcular_taxa(valor: float, parcela: float, parcelas: int) -> float:
    if parcelas <= 0 or parcela <= 0 or valor <= 0: return 0.0
    min_rate = 0.0
    max_rate = 1.0
    for _ in range(100):
        taxa = (min_rate + max_rate) / 2.0
        try:
            pv = parcela * ((1.0 - math.pow(1.0 + taxa, -parcelas)) / taxa)
            if pv > valor:
                min_rate = taxa
            else:
                max_rate = taxa
        except:
            break
    return ((min_rate + max_rate) / 2.0) * 100.0

@router.post("/inss")
async def extract_inss_pdf(file: UploadFile = File(...)):
    if file.content_type != 'application/pdf':
        raise HTTPException(400, "O arquivo deve ser um PDF")

    try:
        contents = await file.read()
        pdf_stream = io.BytesIO(contents)
        
        extracted_data = {
            "cliente": "",
            "beneficio": "",
            "especie": "",
            "margem_maxima": 0.0,
            "margem_comprometida": 0.0,
            "margem_disponivel": 0.0,
            "data_extrato": "",
            "bloqueado_emprestimo": None,
            "emprestimos_ativos": []
        }

        with pdfplumber.open(pdf_stream) as pdf:
            # Página 1: Dados Pessoais
            if len(pdf.pages) > 0:
                p1_text = pdf.pages[0].extract_text() or ""
                lines = p1_text.split('\n')
                for i, line in enumerate(lines):
                    if "HISTÓRICO DE" in line.upper() or "EMPRÉSTIMO CONSIGNADO" in line.upper():
                        # O nome costuma ser logo abaixo do título
                        if i + 1 < len(lines) and lines[i+1].strip():
                            if lines[i+1].strip().upper() not in ["HISTÓRICO DE", "EMPRÉSTIMO CONSIGNADO", "BENEFÍCIO"]:
                                extracted_data["cliente"] = lines[i+1].strip()
                            elif i + 2 < len(lines) and lines[i+2].strip() not in ["BENEFÍCIO"]:
                                extracted_data["cliente"] = lines[i+2].strip()

                    if "PENSAO POR MORTE" in line.upper() or "APOSENTADORIA" in line.upper() or "AMPARO SOCIAL" in line.upper() or "BPC" in line.upper():
                        extracted_data["especie"] = line.strip()

                    match_ben = re.search(r'Nº Benefício:\s*([\d\.\-]+)', line)
                    if match_ben:
                        extracted_data["beneficio"] = match_ben.group(1)

                    if not extracted_data["data_extrato"]:
                        match_date = re.search(r'(\d{2}/\d{2}/\d{4})', line)
                        if match_date:
                            extracted_data["data_extrato"] = match_date.group(1)
                    
                    if "LIBERADO PARA EMPR" in line.upper() or "ELEGÍVEL PARA EMPR" in line.upper() or "ELEGIVEL PARA EMPR" in line.upper():
                        extracted_data["bloqueado_emprestimo"] = False
                    elif "BLOQUEADO PARA EMPR" in line.upper() or "BLOQUEADO PARA EMPRESTIMO" in line.upper():
                        if "SIM" in line.upper():
                            extracted_data["bloqueado_emprestimo"] = True
                        elif "NÃO" in line.upper() or "NAO" in line.upper():
                            extracted_data["bloqueado_emprestimo"] = False
                        else:
                            extracted_data["bloqueado_emprestimo"] = True
                            
            if extracted_data.get("bloqueado_emprestimo") is None and len(pdf.pages) > 0:
                p1_tables = pdf.pages[0].extract_tables()
                if p1_tables:
                    for table in p1_tables:
                        for row in table:
                            if not row: continue
                            clean_row = [str(c).upper().replace('\n', ' ') for c in row if c]
                            for idx_cell, cell in enumerate(clean_row):
                                if "LIBERADO PARA EMPR" in cell or "ELEGÍVEL PARA EMPR" in cell or "ELEGIVEL PARA EMPR" in cell:
                                    extracted_data["bloqueado_emprestimo"] = False
                                elif "BLOQUEADO PARA EMPR" in cell or "BLOQUEADO PARA EMPRESTIMO" in cell:
                                    if idx_cell + 1 < len(clean_row):
                                        if "SIM" in clean_row[idx_cell+1]: extracted_data["bloqueado_emprestimo"] = True
                                        elif "NÃO" in clean_row[idx_cell+1] or "NAO" in clean_row[idx_cell+1]: extracted_data["bloqueado_emprestimo"] = False
                                    else:
                                        extracted_data["bloqueado_emprestimo"] = True
            
            # Páginas restantes: Margem e Empréstimos
            for page in pdf.pages:
                text = page.extract_text() or ""
                
                # Procura margem no texto
                match_max = re.search(r'MÁXIMO DE COMPROMETIMENTO PERMITIDO\s+R\$\s*([\d\.,]+)', text)
                match_comp = re.search(r'TOTAL COMPROMETIDO\s+R\$\s*([\d\.,]+)', text)
                
                if match_max: extracted_data["margem_maxima"] = parse_currency(match_max.group(1))
                if match_comp: extracted_data["margem_comprometida"] = parse_currency(match_comp.group(1))
                
                # Extrai tabelas
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2: continue
                    # Verifica se é a tabela de Empréstimos
                    # Vamos verificar se a tabela possui muitas colunas e se tem ATIVO
                    for row in table:
                        if not row: continue
                        clean_row = [str(c).replace('\n', ' ').strip() if c else "" for c in row]
                        
                        # Verifica se é uma linha de empréstimo (Normalmente tem mais de 10 colunas, "ATIVO" na coluna 2 ou 3)
                        is_loan_row = len(clean_row) > 10 and any("ATIVO" in c.upper() for c in clean_row[:4])
                        if is_loan_row:
                            try:
                                # Filtro extra para ignorar cabeçalhos (que caem na regra de ter a palavra ATIVO)
                                if "ATIVOS" in clean_row[0].upper() or not any(char.isdigit() for char in clean_row[0]):
                                    continue

                                # Identificar colunas baseadas no padrão INSS (0-based)
                                # [0:Contrato, 1:Banco, 2:Situação, 3:Origem, 4:Data Inclusão, 5:Início, 6:Fim, 7:Qtd, 8:Parcela, ..., 14:Taxa Mensal]
                                contrato = clean_row[0].replace(' ', '').strip()
                                banco_raw = clean_row[1] if len(clean_row) > 1 else ""
                                
                                # Filtrar RMC e RCC
                                if "RMC" in banco_raw.upper() or "RCC" in banco_raw.upper() or "CARTÃO" in banco_raw.upper() or "CARTAO" in banco_raw.upper():
                                    continue
                                
                                inicio_desconto = clean_row[5] if len(clean_row) > 5 else ""
                                
                                # Limpeza do prazo (ex: "84")
                                prazo_str = clean_row[7] if len(clean_row) > 7 else ""
                                prazo_total = int(re.sub(r'\D', '', prazo_str)) if prazo_str else 0
                                
                                parcela = parse_currency(clean_row[8]) if len(clean_row) > 8 else 0.0
                                taxa_mensal = parse_currency(clean_row[14]) if len(clean_row) > 14 else 0.0
                                
                                # Extração do Valor Financiado (coluna 10) ou Liberado (coluna 9)
                                valor_financiado = 0.0
                                if len(clean_row) > 10:
                                    valor_financiado = parse_currency(clean_row[10])
                                if valor_financiado == 0 and len(clean_row) > 9:
                                    valor_financiado = parse_currency(clean_row[9])

                                # Cálculo da taxa de juros se estiver zerada ou não informada
                                if taxa_mensal == 0 and valor_financiado > 0 and prazo_total > 0 and parcela > 0:
                                    taxa_mensal = calcular_taxa(valor_financiado, parcela, prazo_total)

                                # Cálculo do saldo devedor
                                meses_pagos = 0
                                se_iniciou = re.match(r'(\d{2})/(\d{4})', inicio_desconto)
                                if se_iniciou:
                                    mes, ano = map(int, se_iniciou.groups())
                                    hoje = datetime.today()
                                    meses_pagos = (hoje.year - ano) * 12 + (hoje.month - mes)
                                    if meses_pagos < 0: meses_pagos = 0
                                
                                prazo_restante = max(0, prazo_total - meses_pagos)
                                
                                saldo_devedor = 0.0
                                if prazo_restante > 0 and taxa_mensal > 0:
                                    taxa_dec = taxa_mensal / 100.0
                                    saldo_devedor = parcela * ((1 - math.pow(1 + taxa_dec, -prazo_restante)) / taxa_dec)
                                elif prazo_restante > 0 and taxa_mensal == 0:
                                    saldo_devedor = parcela * prazo_restante

                                extracted_data["emprestimos_ativos"].append({
                                    "banco": clean_bank_name(banco_raw),
                                    "contrato": contrato,
                                    "parcela": parcela,
                                    "prazo_total": prazo_total,
                                    "prazo_restante": prazo_restante,
                                    "taxa_mensal": taxa_mensal,
                                    "saldo_devedor": round(saldo_devedor, 2)
                                })
                            except Exception as e:
                                print("Erro parseando linha:", clean_row, e)
                                pass

        # Calcular margem
        extracted_data["margem_disponivel"] = round(extracted_data["margem_maxima"] - extracted_data["margem_comprometida"], 2)

        return {"success": True, "data": extracted_data}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Falha na extração: {str(e)}")
