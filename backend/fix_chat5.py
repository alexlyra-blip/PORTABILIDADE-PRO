import sys
import re

with open('c:/Users/alexa/OneDrive/Ambiente de Trabalho/Projeto Simulador de Porabilidade/backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_str = '''- Para TODOS os outros dados, confirme amigavelmente REPETINDO a informação exata que o cliente forneceu na mensagem anterior SEMPRE EM NEGRITO E ITÁLICO. (Exemplo: "_*✅ Idade confirmada: 50 anos.*_\\n\\n", "_*✅ Parcela confirmada: R$ 150,00.*_\\n\\n", "_*✅ Saldo devedor confirmado: R$ 5.000,00.*_\\n\\n", "_*✅ Prazo total confirmado: 84 meses.*_\\n\\n"). É PROIBIDO confirmar dizendo apenas "Idade confirmada", você deve SEMPRE mostrar o valor.'''

new_str = '''- Para TODOS os outros dados, confirme amigavelmente REPETINDO a informação exata que o cliente forneceu na mensagem anterior SEMPRE EM NEGRITO E ITÁLICO. (Exemplo: "_*✅ Idade confirmada: 50 anos.*_\\n\\n", "_*✅ Parcela confirmada: R$ 150,00.*_\\n\\n", "_*✅ Saldo devedor confirmado: R$ 5.000,00.*_\\n\\n", "_*✅ Prazo total confirmado: 84 meses.*_\\n\\n", "_*✅ Parcelas restantes confirmadas: 60 parcelas.*_\\n\\n"). É PROIBIDO confirmar dizendo apenas "Idade confirmada", você deve SEMPRE mostrar o valor.'''

if old_str in code:
    code = code.replace(old_str, new_str)
    with open('c:/Users/alexa/OneDrive/Ambiente de Trabalho/Projeto Simulador de Porabilidade/backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Success")
else:
    print("Failed to find string")
