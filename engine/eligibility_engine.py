from datetime import datetime
from dateutil.relativedelta import relativedelta

def verificar_elegibilidade(cliente_input, regra_banco):
    """
    Verifica se o cliente passa nos filtros iniciais baseados nas regras cadastras (Phase 8).
    Controle rigoroso para Espécie Invalidez (INSS).
    """
    
    # 1. Limite de Idade Geral
    if regra_banco.min_age and cliente_input.idade < regra_banco.min_age:
        return False, f"Idade abaixo do mínimo ({regra_banco.min_age})."
        
    if regra_banco.max_age and cliente_input.idade > regra_banco.max_age:
        return False, f"Idade acima do máximo ({regra_banco.max_age})."
        
    # 2. Tipo de Convênio (Allowed Benefit Types)
    # If the rule defines strict convenio filters (e.g. "INSS,SIAPE")
    if regra_banco.allowed_benefit_types:
        beneficios = [b.strip().upper() for b in regra_banco.allowed_benefit_types.split(",")]
        # Check if it's the convenio OR the species (if species list is provided)
        if str(cliente_input.convenio).upper() not in beneficios:
            if str(getattr(cliente_input, "especie_beneficio", "")).strip() not in beneficios:
                return False, f"Convênio/Espécie {cliente_input.convenio}/{cliente_input.especie_beneficio} não aceito por este banco."
            
    # 3. Mínimo de Parcelas Pagas (Geral e Específico)
    parcelas_pagas = int(cliente_input.prazo_total or 0) - int(cliente_input.prazo_restante or 0)
    
    # 3.1 Exclusão de Bancos de Origem
    def normalize_bank(b):
        return str(b).strip().upper()

    def get_code(b):
        import re
        match = re.search(r'^(\d{3})', normalize_bank(b))
        return match.group(1) if match else None

    # 3.1 Exclusão de Bancos de Origem (NÃO PORTADOS)
    if hasattr(regra_banco, "excluded_origin_banks") and regra_banco.excluded_origin_banks:
        bancos_excluidos = [normalize_bank(b) for b in str(regra_banco.excluded_origin_banks).split(",") if b.strip()]
        cliente_banco = normalize_bank(cliente_input.banco)
        cliente_code = get_code(cliente_input.banco)
        
        is_blocked = False
        for b_blocked in bancos_excluidos:
            blocked_code = get_code(b_blocked)
            if b_blocked in cliente_banco or (blocked_code and cliente_code == blocked_code):
                is_blocked = True
                break
                
        if is_blocked:
            return False, f"O banco portador não porta o banco de origem {cliente_input.banco}."
            
    # 3.2 Regra de Parcelas por Banco de Origem (Mínimo Específico)
    if hasattr(regra_banco, "origin_banks_min_paid") and regra_banco.origin_banks_min_paid:
        try:
            import json
            regras_por_banco = {}
            if isinstance(regra_banco.origin_banks_min_paid, dict):
                regras_por_banco = regra_banco.origin_banks_min_paid
            else:
                try:
                    # Tentar parsear o JSON. Substituir aspas simples por duplas caso o usuário tenha digitado errado.
                    sanitized_json = str(regra_banco.origin_banks_min_paid).replace("'", '"')
                    regras_por_banco = json.loads(sanitized_json)
                except:
                    regras_por_banco = {}

            cliente_banco = normalize_bank(cliente_input.banco)
            cliente_code = get_code(cliente_input.banco)
            
            for b_rule_name, min_esc in regras_por_banco.items():
                rule_bank_norm = normalize_bank(b_rule_name)
                rule_bank_code = get_code(b_rule_name)
                
                # Match by full name OR code OR code fragment
                if rule_bank_norm in cliente_banco or (rule_bank_code and cliente_code == rule_bank_code):
                    min_especifico = int(min_esc)
                    if parcelas_pagas < min_especifico:
                        return False, f"Para {cliente_input.banco}, so necessrias {min_especifico} parcelas pagas (Temos: {parcelas_pagas})."
        except Exception as e:
            print(f"Erro ao processar origin_banks_min_paid: {e}")

    # 3.3 Mínimo de Parcelas Geral
    if regra_banco.min_paid_installments:
        if parcelas_pagas < regra_banco.min_paid_installments:
            return False, f"Mínimo de parcelas pagas não atingido ({parcelas_pagas}/{regra_banco.min_paid_installments})."
            
    # 4. Cliente 60+
    if getattr(cliente_input, "is_60_plus", False):
        if not regra_banco.accepts_60_plus:
            return False, "Banco não aceita clientes com 60 anos ou mais nesta modalidade."
            
    # Nova Regra: Alfabetização
    if getattr(cliente_input, "analfabeto", False): # Use 'analfabeto' to match frontend payload
        if regra_banco.literacy_required:
            return False, "Banco exige alfabetização (não aceita analfabetos)."
            
    # 5. Saldo Devedor Mínimo (Apenas se não for somado ao troco)
    if hasattr(regra_banco, "min_debt_balance") and regra_banco.min_debt_balance:
        # Se NÃO for usar saldo + troco, validamos aqui o saldo bruto
        if not getattr(regra_banco, "use_balance_plus_released", False):
            if float(cliente_input.saldo_devedor) < float(regra_banco.min_debt_balance):
                return False, f"Saldo devedor abaixo do mínimo (Mín: R$ {regra_banco.min_debt_balance})."
            
    # 6. Parcela Mínima
    if hasattr(regra_banco, "min_installment_value") and regra_banco.min_installment_value:
        if float(cliente_input.valor_parcela) < float(regra_banco.min_installment_value):
            return False, f"Valor de parcela abaixo do mínimo (Mín: R$ {regra_banco.min_installment_value})."

    # 6.1 Benefício Não Atendido (Espécies bloqueadas)
    if str(cliente_input.convenio).upper() == "INSS" and hasattr(regra_banco, "excluded_benefit_types") and regra_banco.excluded_benefit_types:
        especies_bloqueadas = [b.strip().upper() for b in str(regra_banco.excluded_benefit_types).split(",") if b.strip()]
        beneficio_cliente = str(getattr(cliente_input, "especie_beneficio", "")).strip().upper()
        if beneficio_cliente in especies_bloqueadas:
            return False, f"O banco não atende esta espécie de benefício ({beneficio_cliente})."

    # 7. Regra Especial de INSS / INVALIDEZ (Espécies 04, 05, 06, 32, 33, 34, 92)
    especies_invalidez = ["04", "05", "06", "32", "33", "34", "92", "4", "5", "6", 4, 5, 6, 32, 33, 34, 92]
    especies_loas = ["87", "88", 87, 88]
    
    beneficio_cliente = str(getattr(cliente_input, "especie_beneficio", "")).strip()
    
    # Se Convênio é INSS e é espécie de invalidez
    if str(cliente_input.convenio).upper() == "INSS" and beneficio_cliente in especies_invalidez:
        # O Banco aceita invalidez?
        if not getattr(regra_banco, "accepts_disability", True):
            return False, f"Banco não aceita benefícios de Invalidez (Espécie {beneficio_cliente})."
            
        # Validação de Idade etc (se aceitar)
        if 1: # Mantido o contexto para facilitar o replace
            if cliente_input.idade < 60 and not getattr(cliente_input, "is_invalidez_60_plus", False):
                if regra_banco.disability_min_age and cliente_input.idade < regra_banco.disability_min_age:
                    return False, f"Idade mínima para portabilidade de invalidez neste banco é {regra_banco.disability_min_age} anos."
                    
    # Nova Regra: LOAS
    if str(cliente_input.convenio).upper() == "INSS" and beneficio_cliente in especies_loas:
        if not getattr(regra_banco, "accepts_loas", True):
            return False, f"Banco não aceita benefícios LOAS (Amparo Social - Espécie {beneficio_cliente})."

            # Validação de Tempo de Concessão (Data de Concessão)
            if hasattr(cliente_input, "data_concessao") and cliente_input.data_concessao:
                try:
                    # Garantindo que a data está no formato YYYY-MM-DD
                    dt_concessao = datetime.strptime(str(cliente_input.data_concessao)[:10], "%Y-%m-%d")
                    hoje = datetime.now()
                    diff = relativedelta(hoje, dt_concessao)
                    
                    anos_concessao = diff.years
                    meses_concessao = diff.months
                    
                    # Calcula o total em meses para facilitar comparação
                    total_meses_cliente = (anos_concessao * 12) + meses_concessao
                    total_meses_exigidos = (int(regra_banco.disability_min_benefit_years or 0) * 12) + int(regra_banco.disability_min_benefit_months or 0)
                    
                    if total_meses_cliente < total_meses_exigidos:
                        return False, f"Tempo de concessão insuficiente ({anos_concessao}a {meses_concessao}m). Exigido: {regra_banco.disability_min_benefit_years}a {regra_banco.disability_min_benefit_months}m."
                except Exception as e:
                    # Se data for inválida mas for requerida, negamos por segurança ou ignoramos se for opcional
                    print(f"Erro ao validar data de concessão: {e}")
            else:
                # Se não informou data de concessão mas a regra exige tempo mínimo
                if (regra_banco.disability_min_benefit_years or 0) > 0 or (regra_banco.disability_min_benefit_months or 0) > 0:
                    return False, "Data de concessão do benefício deve ser informada para espécies de invalidez."

    return True, "Elegível"
