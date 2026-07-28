
def resolver_taxa_juros(pv, pmt, n):
    i = 0.02
    for _ in range(100):
        f = pmt * (1 - (1 + i)**(-n)) / i - pv
        df = pmt * (n * (1 + i)**(-n - 1) * i - (1 - (1 + i)**(-n))) / (i**2)
        i = i - f / df
    return i * 100

print('Tabela 3 (18653.05):', resolver_taxa_juros(18653.05, 380, 120))
print('Tabela 6 (19197.74):', resolver_taxa_juros(19197.74, 380, 120))

