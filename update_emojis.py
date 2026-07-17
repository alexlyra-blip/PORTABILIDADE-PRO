import sys

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the instruction emojis in get_current_step_instruction
code = code.replace(
    'return "Informe o nome do Banco de Origem (atual):"',
    'return "🏦 Agora, por favor, informe o nome do *Banco de Origem* (atual):"'
)
code = code.replace(
    'return "Qual é a idade do cliente?"',
    'return "Perfeito! Qual é a *idade* do cliente? 🎂"'
)
code = code.replace(
    'return "Qual é o valor da parcela atual (R$)?"',
    'return "💰 Qual é o *valor da parcela* atual do contrato (R$)? (Ex: 150,00)"'
)
code = code.replace(
    'return "Qual é o saldo devedor estimado (R$)?"',
    'return "💳 Qual é o *saldo devedor estimado* (R$)? (Ex: 5.000,00)"'
)
code = code.replace(
    'return "Qual é o prazo total do contrato original (meses)?"',
    'return "📆 Qual é o *prazo total* do contrato original (meses)? (Ex: 84 ou 120)"'
)
code = code.replace(
    'return "Quantas parcelas restantes (a pagar) faltam?"',
    'return "⏳ Quantas *parcelas restantes* (a pagar) faltam? (Ex: 68)"'
)
code = code.replace(
    'return "Informe o número da espécie do benefício (ou digite \'não sei\' para continuar):"',
    'return "📄 Informe o número da *espécie* do benefício (ou digite \'não sei\' para pular):"'
)

# Fix the confirmation emojis
code = code.replace(
    'reply_text = f"✅ *Convênio selecionado:* **{session[\'convenio\']}**"',
    'reply_text = f"✅ *Convênio selecionado:* **{session[\'convenio\']}** 🤝"'
)
code = code.replace(
    'reply_text = f"✅ *Banco de Origem:* **{session[\'banco_origem\']}**"',
    'reply_text = f"✅ *Banco de Origem:* **{session[\'banco_origem\']}** 🏦"'
)
code = code.replace(
    'reply_text = f"✅ *Idade do cliente:* **{val} anos**"',
    'reply_text = f"✅ *Idade do cliente:* **{val} anos** 📆"'
)
code = code.replace(
    'reply_text = f"✅ *Valor da parcela:* **R$ {val:.2f}**"',
    'reply_text = f"✅ *Valor da parcela:* **R$ {val:.2f}** 💵"'
)
code = code.replace(
    'reply_text = f"✅ *Saldo devedor:* **R$ {val:.2f}**"',
    'reply_text = f"✅ *Saldo devedor:* **R$ {val:.2f}** 📈"'
)
code = code.replace(
    'reply_text = f"✅ *Prazo total:* **{val} meses**"',
    'reply_text = f"✅ *Prazo total:* **{val} meses** ⏳"'
)
code = code.replace(
    'reply_text = f"✅ *Parcelas restantes:* **{val} meses**"',
    'reply_text = f"✅ *Parcelas restantes:* **{val} meses** 🏁"'
)

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
