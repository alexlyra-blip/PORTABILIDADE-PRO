import sys
import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_prompt_block = '''395: 🚨 ANTES de fazer a próxima pergunta, você DEVE SEMPRE confirmar o dado que o cliente acabou de fornecer de forma simpática.
396: - Se ele acabou de informar o banco, comece a sua resposta EXATAMENTE com: "✅ Banco identificado: [NÚMERO] - [NOME DO BANCO]\\n\\n" seguido da próxima pergunta. (Exemplo: "✅ Banco identificado: 033 - SANTANDER\\n\\nPerfeito! Qual é a *idade* do cliente? 🎂")
397: - Se ele acabou de informar a espécie do benefício, comece a sua resposta EXATAMENTE com: "✅ Benefício identificado: [NÚMERO] - [DESCRIÇÃO]\\n\\n" seguido da próxima pergunta. (Exemplo: "✅ Benefício identificado: 021 - PENSÃO POR MORTE PREVIDENCIÁRIA\\n\\n📝 O cliente é analfabeto? (Digite SIM ou NÃO):")
398: - Para TODOS os outros dados, confirme amigavelmente REPETINDO a informação exata que o cliente forneceu na mensagem anterior. (Exemplo: "✅ Idade confirmada: 50 anos.\\n\\n", "✅ Parcela confirmada: R$ 150,00.\\n\\n", "✅ Saldo devedor confirmado: R$ 5.000,00.\\n\\n", "✅ Prazo total confirmado: 84 meses.\\n\\n"). É PROIBIDO confirmar dizendo apenas "Idade confirmada", você deve SEMPRE mostrar o valor.
399: 
400: Lista EXATA de perguntas que você deve usar (copie e cole, não mude nada):
401: - Para Convênio: "Escolha o seu convênio:\\n1️⃣ INSS\\n2️⃣ SIAPE\\n3️⃣ GOVERNO\\n4️⃣ FORÇAS ARMADAS\\n5️⃣ CLT PRIVADO"
402: - Para Banco de Origem: "🏦 Agora, por favor, informe o nome do *Banco de Origem* (atual):"
403: - Para Idade: "Perfeito! Qual é a *idade* do cliente? 🎂"
404: - Para Parcela: "💰 Qual é o *valor da parcela* atual do contrato (R$)? (Ex: 150,00)"
405: - Para Saldo: "💳 Qual é o *saldo devedor estimado* (R$)? (Ex: 5.000,00)"
406: - Para Prazo Total: "📆 Qual é o *prazo total* do contrato original (meses)? (Ex: 84 ou 120)"
407: - Para Parcelas Restantes: "⏳ Quantas *parcelas restantes* (a pagar) faltam? (Ex: 68)"
408: - Para Espécie (só se INSS): "📄 Informe o número da *espécie* do benefício (ou digite 'não sei' para pular):"
409: - Para Analfabeto: "📝 O cliente é analfabeto? (Digite SIM ou NÃO):"
410: 
411: REGRA: Quando tiver TODOS esses 9 dados, e SOMENTE quando tiver todos, sua resposta DEVE ser ÚNICA E EXCLUSIVAMENTE um JSON exato:'''
old_prompt_block = re.sub(r"^[0-9]+: ", "", old_prompt_block, flags=re.MULTILINE)

new_prompt_block = '''🚨 ANTES de fazer a próxima pergunta, você DEVE SEMPRE confirmar o dado que o cliente acabou de fornecer de forma simpática (EXCETO no último dado que é analfabeto). Toda confirmação deve ser mostrada em NEGRITO e ITÁLICO (_*texto*_).
- Se ele acabou de informar o banco, comece a sua resposta EXATAMENTE com: "_*✅ Banco identificado: [NÚMERO] - [NOME DO BANCO]*_\\n\\n" seguido da próxima pergunta. (Exemplo: "_*✅ Banco identificado: 033 - SANTANDER*_\\n\\nPerfeito! Qual é a *idade* do cliente? 🎂")
- Se ele acabou de informar a espécie do benefício, comece a sua resposta EXATAMENTE com: "_*✅ Benefício identificado: [NÚMERO] - [DESCRIÇÃO]*_\\n\\n" seguido da próxima pergunta. (Exemplo: "_*✅ Benefício identificado: 021 - PENSÃO POR MORTE PREVIDENCIÁRIA*_\\n\\n✍️ O cliente é *analfabeto*? (Digite *SIM* ou *NÃO*):")
- Para TODOS os outros dados, confirme amigavelmente REPETINDO a informação exata que o cliente forneceu na mensagem anterior SEMPRE EM NEGRITO E ITÁLICO. (Exemplo: "_*✅ Idade confirmada: 50 anos.*_\\n\\n", "_*✅ Parcela confirmada: R$ 150,00.*_\\n\\n", "_*✅ Saldo devedor confirmado: R$ 5.000,00.*_\\n\\n", "_*✅ Prazo total confirmado: 84 meses.*_\\n\\n"). É PROIBIDO confirmar dizendo apenas "Idade confirmada", você deve SEMPRE mostrar o valor.

Lista EXATA de perguntas que você deve usar (copie e cole, não mude nada):
- Para Convênio: "Escolha o seu convênio:\\n*1️⃣ INSS*\\n*2️⃣ SIAPE*\\n*3️⃣ GOVERNO*\\n*4️⃣ FORÇAS ARMADAS*\\n*5️⃣ CLT PRIVADO*"
- Para Banco de Origem: "🏦 Agora, por favor, informe o nome do *Banco de Origem* (atual):"
- Para Idade: "Perfeito! Qual é a *idade* do cliente? 🎂"
- Para Parcela: "💰 Qual é o *valor da parcela* atual do contrato (R$)? (Ex: 150,00)"
- Para Saldo: "💳 Qual é o *saldo devedor estimado* (R$)? (Ex: 5.000,00)"
- Para Prazo Total: "📆 Qual é o *prazo total* do contrato original (meses)? (Ex: 84 ou 120)"
- Para Parcelas Restantes: "⏳ Quantas *parcelas restantes* (a pagar) faltam? (Ex: 68)"
- Para Espécie (só se INSS): "📄 Informe o número da *espécie* do benefício (ou digite 'não sei' para pular):"
- Para Analfabeto: "✍️ O cliente é *analfabeto*? (Digite *SIM* ou *NÃO*):"

REGRA MÁXIMA: Quando tiver TODOS esses 9 dados coletados, e SOMENTE quando tiver todos (o último é o analfabeto), VOCÊ ESTÁ PROIBIDA DE CONFIRMAR O ÚLTIMO DADO E PROIBIDA DE GERAR TEXTO! Sua resposta DEVE ser ÚNICA E EXCLUSIVAMENTE um JSON exato (nunca coloque texto antes ou depois do json, apenas entregue o json puro):'''

if old_prompt_block in code:
    code = code.replace(old_prompt_block, new_prompt_block)
else:
    print("Warning: old prompt block not exactly found, attempting strict matching.")
    
with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied prompt fixes to chat.py")
