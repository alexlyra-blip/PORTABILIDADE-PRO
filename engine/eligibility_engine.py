from datetime import datetime
from dateutil.relativedelta import relativedelta

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
