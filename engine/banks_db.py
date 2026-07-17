# Um mock simulando o banco de dados onde os coeficientes e perfis ficam armazenados
BANCOS_DB = [
    { 
        "id": 1, 
        "nome": "Banco Itaú", 
        "tabela_nome": "Inbursa Normal",
        "taxa_maxima": 1.60, 
        "idade_max": 70, 
        "coeficiente": 0.02345, 
        "bancos_proibidos": ["Banco Itaú", "Itaú Consignado"],
        "beneficios_aceitos": ["INSS", "SIAPE", "Governo", "Prefeitura", "ForcasArmadas"]
    },
    { 
        "id": 2, 
        "nome": "Banco do Brasil", 
        "tabela_nome": "Portabilidade BB",
        "taxa_maxima": 1.55, 
        "idade_max": 65, 
        "coeficiente": 0.02410, 
        "bancos_proibidos": ["Banco do Brasil", "BB"],
        "beneficios_aceitos": ["INSS", "SIAPE", "ForcasArmadas"]
    },
    { 
        "id": 3, 
        "nome": "Bradesco", 
        "tabela_nome": "Portabilidade Promocional",
        "taxa_maxima": 1.65, 
        "idade_max": 73, 
        "coeficiente": 0.02290, 
        "bancos_proibidos": ["Bradesco", "Banco Bradesco"],
        "beneficios_aceitos": ["INSS", "Governo"]
    },
    { 
        "id": 4, 
        "nome": "Caixa Econômica", 
        "tabela_nome": "Caixa Segura",
        "taxa_maxima": 1.50, 
        "idade_max": 68, 
        "coeficiente": 0.02450, 
        "bancos_proibidos": ["Caixa Econômica", "CEF"],
        "beneficios_aceitos": ["INSS", "SIAPE", "Governo", "Prefeitura"]
    },
    { 
        "id": 5, 
        "nome": "Santander", 
        "tabela_nome": "Olho no Olho",
        "taxa_maxima": 1.58, 
        "idade_max": 72, 
        "coeficiente": 0.02380, 
        "bancos_proibidos": ["Santander", "Banco Santander"],
        "beneficios_aceitos": ["INSS", "Governo", "Prefeitura"]
    },
    { 
        "id": 6, 
        "nome": "Banco PAN", 
        "tabela_nome": "Tabela PAN Flex",
        "taxa_maxima": 1.70, 
        "idade_max": 75, 
        "coeficiente": 0.02200, 
        "bancos_proibidos": ["Banco PAN"],
        "beneficios_aceitos": ["INSS", "SIAPE", "Governo", "Prefeitura", "ForcasArmadas"]
    },
    { 
        "id": 7, 
        "nome": "Banco BMG", 
        "tabela_nome": "BMG Mais",
        "taxa_maxima": 1.68, 
        "idade_max": 74, 
        "coeficiente": 0.02250, 
        "bancos_proibidos": ["Banco BMG"],
        "beneficios_aceitos": ["INSS", "SIAPE"]
    }
]

def buscar_bancos_ativos():
    """ Simula uma query: SELECT * FROM Bancos WHERE ativo = True """
    return BANCOS_DB
