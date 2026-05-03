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
    
    # 4. Applying Adjustments from TABLE (Phase 7)
    port_adj = float(tabela_obj.portability_adjustment or 0.0)
    nova_taxa_portabilidade = taxa_portabilidade_calc + port_adj
    
    # 5. Weighted Refinancing Rate Math
    taxa_convenio_tabela = float(tabela_obj.taxa_convenio or 0.0)
    
    # Se taxa convenio for zero, usamos o interest_rate do próprio coeficiente como base (Taxa Tabela)
    base_rate = taxa_convenio_tabela if taxa_convenio_tabela > 0 else float(coeficiente_obj.interest_rate)
    
    # FÓRMULA CORRIGIDA: Usa a taxa JÁ AJUSTADA (ex: 1,40%) para a média
    taxa_refin_ponderada = (nova_taxa_portabilidade + base_rate) / 2
    
    refin_adj = float(tabela_obj.refin_adjustment or 0.0)
    final_refin_rate = taxa_refin_ponderada + refin_adj
    
    # 6. Validation: Dual Rate Check (Portability & Refinance)
    # 6.a Validação Portabilidade: Deve atingir o mínimo específico da tabela (se houver)
    min_port_limit = float(getattr(tabela_obj, "min_port_rate", 0.0) or 0.0)
    if min_port_limit > 0 and nova_taxa_portabilidade < (min_port_limit - 0.0001):
        return False, 0.0, None, f"Taxa Portabilidade ({nova_taxa_portabilidade:.3f}%) abaixo do mínimo da tabela ({min_port_limit:.3f}%)."

    # 6.b Validação Refin: Regra de Vantagem Real (Tabela < Taxa Atual Informada)
    # Compara a taxa da tabela (1,55%) diretamente contra a taxa que o cliente paga (1,59%)
    disable_validation = any(getattr(r, "disable_weighted_rate_validation", False) for r in (banco.rules or []))
    
    taxa_cliente = float(cliente_input.taxa_juros or 0)
    if not disable_validation and taxa_cliente > 0 and base_rate >= taxa_cliente:
        return False, 0.0, None, f"Taxa da tabela ({base_rate:.3f}%) não é inferior à taxa informada do cliente ({taxa_cliente:.3f}%)"
    
    return True, float(valor_liberado), {
        "taxa_portabilidade_atual": float(nova_taxa_portabilidade),
        "taxa_refin": float(final_refin_rate),
        "weighted_refin": float(taxa_refin_ponderada),
        "port_adj": float(port_adj),
        "refin_adj": float(refin_adj),
        "taxa_convenio": float(taxa_convenio_tabela)
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
