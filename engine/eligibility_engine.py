from datetime import datetime
from dateutil.relativedelta import relativedelta
import re
import json

def _banco_corresponde(banco_input, banco_regra):
    """
    Retorna True se o banco_input (ex: "318 - BMG S.A." ou "623") corresponde ao banco_regra (ex: "BMG" ou "PAN").
    """
    if not banco_input or not banco_regra:
        return False
    
    # Dicionário de códigos para nomes
    MAPA_CODIGOS_BANCOS = {
        "121": "AGIBANK",
        "250": "BANCO BCV",
        "025": "BANCO ALFA",
        "233": "BANCO CIFRA",
        "001": "BANCO DO BRASIL",
        "047": "BANCO DO ESTADO DO SERGIPE",
        "079": "BANCO ORIGINAL",
        "643": "BANCO PINE",
        "081": "BANCO SEGURO",
        "041": "BANRISUL",
        "268": "BARIGUI",
        "318": "BMG",
        "237": "BRADESCO",
        "070": "BRB",
        "626": "C6 CONSIGNADO",
        "320": "CCB BRASIL",
        "104": "CAIXA",
        "069": "CREFISA",
        "707": "DAYCOVAL",
        "335": "DIGIO",
        "149": "FACTA",
        "012": "INBURSA",
        "029": "ITAÚ CONSIGNADO",
        "184": "ITAÚ BBA",
        "341": "ITAÚ UNIBANCO",
        "389": "MERCANTIL",
        "386": "NU FINANCEIRA",
        "753": "NBC BANK",
        "169": "OLÉ CONSIGNADO",
        "290": "PAGBANK",
        "623": "PAN",
        "254": "PARANÁ BANCO",
        "752": "BNP PARIBAS",
        "326": "PARATI",
        "611": "PAULISTA",
        "380": "PICPAY",
        "329": "QI SOCIEDADE",
        "966": "SABEMI",
        "422": "SAFRA",
        "033": "SANTANDER",
        "359": "ZEMA",
        "077": "BANCO INTER",
        "756": "SICOOB"
    }

    b_input = str(banco_input).upper().strip()
    b_regra = str(banco_regra).upper().strip()

    # Resolve o input do banco (ex: "623" -> "PAN")
    if b_input in MAPA_CODIGOS_BANCOS:
        b_input = MAPA_CODIGOS_BANCOS[b_input].upper()
    else:
        for cod, nome in MAPA_CODIGOS_BANCOS.items():
            if b_input.startswith(cod):
                b_input = nome.upper()
                break

    # Resolve também o banco da regra por segurança (ex: se cadastrado como "623")
    if b_regra in MAPA_CODIGOS_BANCOS:
        b_regra = MAPA_CODIGOS_BANCOS[b_regra].upper()
    else:
        for cod, nome in MAPA_CODIGOS_BANCOS.items():
            if b_regra.startswith(cod):
                b_regra = nome.upper()
                break
    
    # Match exato
    if b_input == b_regra:
        return True
        
    # Match de substring simples
    if b_regra in b_input or b_input in b_regra:
        return True
        
    # Match por palavras-chave limpas (removendo ruídos comuns)
    def clean_words(text):
        for noise in ["BANCO", "S.A.", "SA", "CONSIGNADO", "CREDITO", "FINANCEIRA", "BANK", "PORTABILIDADE", "INSTITUICAO"]:
            text = text.replace(noise, " ")
        return set(re.findall(r'[A-Z0-9]{2,}', text))
        
    words_input = clean_words(b_input)
    words_regra = clean_words(b_regra)
    
    if words_input and words_regra and len(words_input.intersection(words_regra)) > 0:
        return True
        
    return False

def verificar_elegibilidade(cliente_input, regra_banco):
    """
    Verifica se o cliente passa nos filtros iniciais baseados nas regras cadastradas.
    Controle rigoroso para Espécie Invalidez (INSS) e Analfabetismo.
    """
    # 0. Convênio Ativo para Simulação
    if not getattr(regra_banco, "active", True):
        return False, "Simulação desativada para este convênio neste banco."
    
    # 1. Limite de Idade Geral
    idade_cliente = int(getattr(cliente_input, "idade", getattr(cliente_input, "client_age", 0)))
    
    if regra_banco.min_age and idade_cliente < regra_banco.min_age:
        return False, f"Idade abaixo do mínimo ({regra_banco.min_age})."
        
    if regra_banco.max_age and idade_cliente > regra_banco.max_age:
        return False, f"Idade acima do máximo ({regra_banco.max_age})."
        
    # 2. Tipo de Convênio (Allowed Benefit Types)
    convenio_cliente = str(getattr(cliente_input, "convenio", getattr(cliente_input, "agreement", ""))).upper()
    especie_cliente = str(getattr(cliente_input, "especie_beneficio", getattr(cliente_input, "benefit_species", ""))).strip()

    if regra_banco.allowed_benefit_types:
        beneficios_permitidos = [b.strip().upper() for b in regra_banco.allowed_benefit_types.split(",")]
        if convenio_cliente not in beneficios_permitidos and especie_cliente not in beneficios_permitidos:
            return False, f"Convênio/Espécie {convenio_cliente}/{especie_cliente} não aceito por este banco."
            
    # 3. Mínimo de Parcelas Pagas
    prazo_total = int(getattr(cliente_input, "prazo_total", getattr(cliente_input, "total_term", 0)))
    prazo_restante = int(getattr(cliente_input, "prazo_restante", getattr(cliente_input, "remaining_term", 0)))
    parcelas_pagas = prazo_total - prazo_restante
    
    if regra_banco.min_paid_installments and parcelas_pagas < regra_banco.min_paid_installments:
        return False, f"Mínimo de parcelas pagas não atingido ({parcelas_pagas}/{regra_banco.min_paid_installments})."
        
    # 3.1 Bancos de Origem Excluídos
    banco_origem = str(getattr(cliente_input, "banco", getattr(cliente_input, "bank", ""))).upper().strip()
    if hasattr(regra_banco, "excluded_origin_banks") and regra_banco.excluded_origin_banks:
        bancos_excluidos = [b.strip() for b in str(regra_banco.excluded_origin_banks).split(",") if b.strip()]
        for b_excluido in bancos_excluidos:
            if _banco_corresponde(banco_origem, b_excluido):
                return False, f"Banco de origem {banco_origem} não é portado por este banco."
                
    # 3.2 Regras Específicas de Parcelas Pagas por Banco de Origem
    if hasattr(regra_banco, "origin_banks_min_paid") and regra_banco.origin_banks_min_paid:
        try:
            regras_especificas = json.loads(regra_banco.origin_banks_min_paid)
            if isinstance(regras_especificas, dict):
                for b_nome, min_pagas in regras_especificas.items():
                    if _banco_corresponde(banco_origem, b_nome):
                        if parcelas_pagas < int(min_pagas):
                            return False, f"Mínimo de parcelas pagas para o banco {b_nome} não atingido ({parcelas_pagas}/{min_pagas})."
        except Exception as e:
            pass
            
    # 4. Cliente 60+
    is_60_plus = bool(getattr(cliente_input, "is_60_plus", idade_cliente >= 60))
    if is_60_plus and not regra_banco.accepts_60_plus:
        return False, "Banco não aceita clientes com 60 anos ou mais nesta modalidade."
            
    # 5. Alfabetização
    is_illiterate = bool(getattr(cliente_input, "is_illiterate", getattr(cliente_input, "analfabeto", False)))
    if is_illiterate and regra_banco.literacy_required:
        return False, "Banco exige alfabetização (não aceita analfabetos)."
            
    # 6. Saldo Devedor e Parcela
    saldo_devedor = float(getattr(cliente_input, "saldo_devedor", getattr(cliente_input, "debt_balance", 0)))
    valor_parcela = float(getattr(cliente_input, "valor_parcela", getattr(cliente_input, "installment_value", 0)))

    if hasattr(regra_banco, "min_debt_balance") and regra_banco.min_debt_balance:
        if not getattr(regra_banco, "use_balance_plus_released", False):
            if saldo_devedor < float(regra_banco.min_debt_balance):
                return False, f"Saldo devedor abaixo do mínimo (Mín: R$ {regra_banco.min_debt_balance})."
            
    if hasattr(regra_banco, "min_installment_value") and regra_banco.min_installment_value:
        if valor_parcela < float(regra_banco.min_installment_value):
            return False, f"Valor de parcela abaixo do mínimo (Mín: R$ {regra_banco.min_installment_value})."

    # 7. Espécies Bloqueadas
    if convenio_cliente == "INSS" and hasattr(regra_banco, "excluded_benefit_types") and regra_banco.excluded_benefit_types:
        bloqueadas = [b.strip().upper() for b in str(regra_banco.excluded_benefit_types).split(",") if b.strip()]
        if especie_cliente in bloqueadas:
            return False, f"Espécie de benefício bloqueada neste banco ({especie_cliente})."

    # 8. Regras Específicas: Invalidez e LOAS
    # Espécies Invalidez (Phase 9: Strict Validation)
    especies_invalidez = ["04", "05", "06", "32", "33", "34", "92", "4", "5", "6"]
    especies_loas = ["87", "88"]
    
    if convenio_cliente == "INSS":
        # Validação Invalidez
        if especie_cliente in especies_invalidez:
            if not getattr(regra_banco, "accepts_disability", True):
                return False, f"Banco não aceita Invalidez (Espécie {especie_cliente})."
            
            # Regra para menores de 60 anos (DIB / Tempo de benefício)
            if idade_cliente < 60:
                # 8.1 Idade mínima para invalidez
                if regra_banco.disability_min_age and idade_cliente < regra_banco.disability_min_age:
                    return False, f"Idade para invalidez ({idade_cliente}) abaixo do mínimo exigido ({regra_banco.disability_min_age})."
                
                # 8.2 Tempo de benefício (DIB)
                dib = getattr(cliente_input, "benefit_start_date", getattr(cliente_input, "data_concessao", None))
                
                # Se a regra exige tempo, a DIB é obrigatória
                exigidos_anos = int(regra_banco.disability_min_benefit_years or 0)
                exigidos_meses = int(regra_banco.disability_min_benefit_months or 0)
                total_meses_exigidos = (exigidos_anos * 12) + exigidos_meses
                
                if total_meses_exigidos > 0:
                    if not dib:
                        return False, "Data de concessão (DIB) obrigatória para benefício de invalidez abaixo de 60 anos."
                    
                    try:
                        dt_concessao = None
                        dib_str = str(dib).strip()[:10]
                        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                            try:
                                dt_concessao = datetime.strptime(dib_str, fmt)
                                break
                            except: continue
                        
                        if not dt_concessao:
                            return False, f"Formato de data DIB inválido: {dib}. Use DD/MM/AAAA ou AAAA-MM-DD."
                        
                        hoje = datetime.now()
                        diff = relativedelta(hoje, dt_concessao)
                        total_meses_cliente = (diff.years * 12) + diff.months
                        
                        if total_meses_cliente < total_meses_exigidos:
                            return False, f"Tempo de benefício insuficiente ({diff.years}a {diff.months}m). Exigido pelo banco: {exigidos_anos}a {exigidos_meses}m."
                    except Exception as e:
                        return False, f"Erro ao validar tempo de benefício: {str(e)}"

        # Validação LOAS
        if especie_cliente in especies_loas:
            if not getattr(regra_banco, "accepts_loas", True):
                return False, f"Banco não aceita LOAS (Espécie {especie_cliente})."

    return True, "Elegível"
