from decimal import Decimal

def calcular_viabilidade_financeira(cliente_input, banco, coeficiente_obj, tabela_obj):
    """
    Realiza os cálculos financeiros baseados no coeficiente e novas regras de tabela (Phase 5).
    """
    # 1. Troco Calculation using Coefficient
    # (Installment / Coefficient) - Balance
    coeficiente_valor = Decimal(str(coeficiente_obj.coefficient))
    saldo_devedor = Decimal(str(cliente_input.saldo_devedor))
    parcela_atual = Decimal(str(cliente_input.valor_parcela))
    
    # Capacidade máxima de financiamento com a parcela atual
    capacidade_financiamento = parcela_atual / coeficiente_valor
    valor_liberado = capacidade_financiamento - saldo_devedor
    
    if valor_liberado <= 0:
        return False, 0.0, None, "Sem margem para liberação de troco ou saldo negativo."

    # 2. Validation: Ticket Mínimo (Valor Total Contrato)
    valor_total_contrato = capacidade_financiamento
    if tabela_obj.min_ticket and valor_total_contrato < Decimal(str(tabela_obj.min_ticket)):
        return False, 0.0, None, f"Ticket mínimo não atingido (RS {valor_total_contrato:.2f} < RS {tabela_obj.min_ticket:.2f})."

    # 3. Automated Portability Rate Calculation (i)
    # Prioritizes Front-End provided rate (e.g. manual adjustment) over HP-12C recalculation
    provided_rate = getattr(cliente_input, "taxa_juros", 0.0)
    if provided_rate and provided_rate > 0:
        taxa_portabilidade_calc = provided_rate
    else:
        try:
            taxa_portabilidade_calc = resolver_taxa_juros(
                float(saldo_devedor), 
                float(parcela_atual), 
                int(cliente_input.prazo_restante)
            )
        except Exception:
            taxa_portabilidade_calc = 0.0
    
    # 4. Cálculo da Portabilidade Ajustada (Conforme Frontend)
    taxa_port_base = float(cliente_input.taxa_juros or taxa_portabilidade_calc)
    taxa_port_ajustada = taxa_port_base + float(tabela_obj.portability_adjustment or 0.0)
    
    # 5. Cálculo do Teto (Final Refin) - CONFORME CÓDIGO DO FRONTEND
    # LÓGICA: TAXA TABELA + AJUSTE REFIN (Ignora médias para bater com o preview)
    taxa_tabela = float(tabela_obj.taxa_convenio or 0.0)
    if taxa_tabela <= 0:
        taxa_tabela = float(coeficiente_obj.interest_rate)
        
    final_refin_rate = taxa_tabela + float(tabela_obj.refin_adjustment or 0.0)
    
    # 6. Validação de Vantagem Real
    disable_validation = any(getattr(r, "disable_weighted_rate_validation", False) for r in (banco.rules or []))
    
    if not disable_validation and taxa_tabela >= final_refin_rate:
        return False, 0.0, None, f"Taxa da tabela ({taxa_tabela:.3f}%) não é inferior à Taxa Refin Final ({final_refin_rate:.3f}%)"
    
    return True, float(valor_liberado), {
        "taxa_portabilidade_atual": float(taxa_port_ajustada),
        "taxa_refin": float(final_refin_rate),
        "weighted_refin": float((taxa_port_ajustada + taxa_tabela) / 2),
        "port_adj": float(tabela_obj.portability_adjustment or 0.0),
        "refin_adj": float(tabela_obj.refin_adjustment or 0.0),
        "taxa_convenio": float(taxa_tabela)
    }, "Cálculo aprovado"

def resolver_taxa_juros(pv, pmt, n):
    """
    Encontra a taxa de juros (i) para uma anuidade ordinária usando Newton-Raphson.
    PV = PMT * (1 - (1+i)^-n) / i
    """
    if pv <= 0 or pmt <= 0 or n <= 0: return 0.0
    
    # Estimativa inicial razoável (aprox. pmt/pv)
    i = (pmt * n / pv - 1) / n
    if i <= 0: i = 0.01

    for _ in range(20):
        # f(i) = pmt * (1 - (1+i)**-n) / i - pv
        # f'(i) = pmt * ( (n*i*(1+i)**(-n-1)) - (1 - (1+i)**-n) ) / i**2
        
        pow_n = (1 + i)**-n
        f = pmt * (1 - pow_n) / i - pv
        df = pmt * ( (n * i * (1 + i)**(-n - 1)) - (1 - pow_n) ) / (i**2)
        
        new_i = i - f / df
        if abs(new_i - i) < 1e-7:
            return new_i * 100 # Em percentual
        i = new_i
        if i <= 0: i = 0.0001 # Prevenir Log/DivZero em taxas negativas
            
    return i * 100

# Funções auxiliares mantidas para compatibilidade
def calcular_parcela_price(valor, taxa, prazo):
    if taxa == 0: return valor / prazo
    r = taxa / 100
    return valor * (r * (1 + r)**prazo) / ((1 + r)**prazo - 1)

def calcular_valor_financiado(parcela, taxa, prazo):
    if taxa == 0: return parcela * prazo
    r = taxa / 100
    return parcela * (((1 + r)**prazo - 1) / (r * (1 + r)**prazo))

def calcular_saldo_devedor_aproximado(parcela, taxa, prazo_restante):
    return calcular_valor_financiado(parcela, taxa, prazo_restante)
