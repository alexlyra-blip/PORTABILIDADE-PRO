from decimal import Decimal

def calcular_viabilidade_financeira(cliente_input, banco, coeficiente_obj, tabela_obj, disable_weighted_validation=False, abate_hp12c=False):
    """
    Realiza os cálculos financeiros baseados no coeficiente e novas regras de tabela (Phase 5).
    """
    # 1. Troco Calculation using Coefficient
    # (Installment / Coefficient) - Balance
    coeficiente_valor = Decimal(str(coeficiente_obj.coefficient))
    saldo_devedor = Decimal(str(cliente_input.saldo_devedor))
    parcela_atual = Decimal(str(cliente_input.valor_parcela))

    # Subtração da margem negativa conforme a validação da taxa ponderada
    margem_negativa = Decimal(str(getattr(cliente_input, "valor_margem_negativa", 0.0) or 0.0))

    parcela_para_refin = parcela_atual
    parcela_para_portabilidade = parcela_atual

    if margem_negativa > 0:
        if disable_weighted_validation:
            # Taxa ponderada DESATIVADA: deduz apenas no cálculo do refinanciamento (troco)
            parcela_para_refin = max(Decimal('0.0'), parcela_atual - margem_negativa)
            parcela_para_portabilidade = parcela_atual
        else:
            # Taxa ponderada ATIVA: deduz já na parcela da portabilidade (impacta cálculo da taxa)
            parcela_para_portabilidade = max(Decimal('0.0'), parcela_atual - margem_negativa)
            parcela_para_refin = parcela_para_portabilidade

    # Capacidade máxima de financiamento com a parcela final (com abatimento, se houver)
    capacidade_financiamento = parcela_para_refin / coeficiente_valor
    valor_liberado = capacidade_financiamento - saldo_devedor

    if valor_liberado <= 0:
        return False, 0.0, None, "Sem margem para liberação de troco ou saldo negativo."

    # 2. Validation: Ticket Mínimo (Valor Total Contrato)
    valor_total_contrato = capacidade_financiamento
    if tabela_obj.min_ticket and valor_total_contrato < Decimal(str(tabela_obj.min_ticket)):
        return False, 0.0, None, f"Ticket mínimo não atingido (RS {valor_total_contrato:.2f} < RS {tabela_obj.min_ticket:.2f})."

    if getattr(tabela_obj, "max_ticket", None) and valor_total_contrato > Decimal(str(tabela_obj.max_ticket)):
        return False, 0.0, None, f"Ticket máximo ultrapassado (RS {valor_total_contrato:.2f} > RS {tabela_obj.max_ticket:.2f})."

    # 3. Automated Portability Rate Calculation (i)
    # Prioritizes Front-End provided rate (e.g. manual adjustment) over HP-12C recalculation
    provided_rate = getattr(cliente_input, "taxa_juros", 0.0)
    if provided_rate and provided_rate > 0 and not abate_hp12c:
        taxa_portabilidade_calc = provided_rate
    else:
        try:
            pmt_para_rate = parcela_para_portabilidade
            taxa_portabilidade_calc = resolver_taxa_juros(
                float(saldo_devedor),
                float(pmt_para_rate),
                int(cliente_input.prazo_restante)
            )
        except Exception:
            taxa_portabilidade_calc = 0.0

    # 4. Cálculo da Portabilidade Ajustada (Conforme Frontend)
    taxa_port_base = float(taxa_portabilidade_calc)
    ajuste_port = float(tabela_obj.portability_adjustment or 0.0)
    taxa_port_ajustada = taxa_port_base + ajuste_port

    # 5. Cálculo do Teto (Final Refin) - CONFORME CÓDIGO DO PREVIEW
    # Média entre a taxa do cliente e a taxa com ajuste de portabilidade
    media_taxas = (taxa_port_base + taxa_port_ajustada) / 2
    ajuste_refin = float(tabela_obj.refin_adjustment or 0.0)
    final_refin_rate = media_taxas + ajuste_refin

    # Taxa da Tabela para comparação
    taxa_tabela = float(tabela_obj.taxa_convenio or 0.0)
    if taxa_tabela <= 0:
        taxa_tabela = float(coeficiente_obj.interest_rate)

    # 5.5. Validação Pró-Ativa de Taxa (Cliente vs Banco Destino)
    # Se a taxa atual do cliente for menor que a taxa oferecida pelo banco de destino,
    # a portabilidade é inviável por taxa incompatível e não calcula refinanciamento.
    if taxa_port_base > 0 and taxa_port_base < (taxa_tabela - 0.0001):
        return False, 0.0, None, f"Taxa da portabilidade ({taxa_port_base:.2f}%) menor que a taxa do banco ({taxa_tabela:.2f}%) - Refinanciamento não calculado"

    # 6. Validação de Vantagem Real (Trava de Disponibilidade)
    # A tabela só fica disponível se a Taxa Refin Final for MAIOR OU IGUAL à taxa da tabela
    if not disable_weighted_validation:
        if final_refin_rate < (taxa_tabela - 0.0001):
            return False, 0.0, None, f"Tabela indisponível: Taxa Refin ({final_refin_rate:.3f}%) menor que Taxa Tabela ({taxa_tabela:.3f}%)"

    return True, float(valor_liberado), {
        "taxa_portabilidade_atual": float(taxa_port_ajustada),
        "taxa_refin": float(final_refin_rate),
        "weighted_refin": float(media_taxas),
        "port_adj": ajuste_port,
        "refin_adj": ajuste_refin,
        "taxa_convenio": float(taxa_tabela),
        "valor_parcela": float(parcela_para_refin)
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
