import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Generate protocol before welcome menu
# Find:
#     if len(session["messages"]) == 0:
#         session["messages"].append({"role": "bot", "text": get_welcome_menu(first_name, session.get("protocol", "000000")), "timestamp": datetime.now().isoformat()})
# Replace with:
#     if len(session["messages"]) == 0:
#         if not session.get("protocol"):
#             session["protocol"] = generate_protocol()
#         session["messages"].append({"role": "bot", "text": get_welcome_menu(first_name, session["protocol"]), "timestamp": datetime.now().isoformat()})
code = code.replace(
    '    if len(session["messages"]) == 0:\n        session["messages"].append({"role": "bot", "text": get_welcome_menu(first_name, session.get("protocol", "000000")), "timestamp": datetime.now().isoformat()})',
    '    if len(session["messages"]) == 0:\n        if not session.get("protocol"):\n            session["protocol"] = generate_protocol()\n            session["user_id"] = matched_user.id\n            session["client_name"] = first_name\n        session["messages"].append({"role": "bot", "text": get_welcome_menu(first_name, session["protocol"]), "timestamp": datetime.now().isoformat()})'
)
# Also fix any other occurrences of get_welcome_menu(..., "000000")
code = code.replace('get_welcome_menu(first_name, session.get("protocol", "000000"))', 'get_welcome_menu(first_name, session["protocol"])')

# 2. Update System Prompt in get_gemini_response
# Replace the system_prompt definition.
new_prompt = '''    system_prompt = """Você é a Clara, Assistente Especialista em Portabilidade de Crédito Consignado.
Sua missão é extrair de forma simpática as informações para simular uma portabilidade.
Colete obrigatoriamente (nesta exata ordem, se possível):
1. convenio (INSS, SIAPE, GOV_EST, FORCAS, CLT_PRIVADO)
2. banco_origem (ex: C6, Pan, Bradesco)
3. idade
4. parcela
5. saldo_devedor
6. total_term (prazo total)
7. remaining_term (parcelas restantes)
8. benefit_species (só INSS, ou 'ignorar')
9. analfabeto (sim/nao)

Se o cliente corrigir algo que já falou antes, entenda e atualize o contexto!

MUITO IMPORTANTE: Ao fazer uma pergunta pedindo um dado, você DEVE OBRIGATORIAMENTE usar EXATAMENTE um dos textos abaixo, com os mesmos emojis e formatação originais do nosso sistema. Responda apenas com a pergunta e nada mais.
- Para Convênio: "Escolha o seu convênio:\\n1️⃣ INSS\\n2️⃣ SIAPE\\n3️⃣ GOVERNO\\n4️⃣ FORÇAS ARMADAS\\n5️⃣ CLT PRIVADO"
- Para Banco de Origem: "🏦 Agora, por favor, informe o nome do *Banco de Origem* (atual):"
- Para Idade: "Perfeito! Qual é a *idade* do cliente? 🎂"
- Para Parcela: "💰 Qual é o *valor da parcela* atual do contrato (R$)? (Ex: 150,00)"
- Para Saldo: "💳 Qual é o *saldo devedor estimado* (R$)? (Ex: 5.000,00)"
- Para Prazo Total: "📆 Qual é o *prazo total* do contrato original (meses)? (Ex: 84 ou 120)"
- Para Parcelas Restantes: "⏳ Quantas *parcelas restantes* (a pagar) faltam? (Ex: 68)"
- Para Espécie (só se INSS): "📄 Informe o número da *espécie* do benefício (ou digite 'não sei' para pular):"
- Para Analfabeto: "O cliente é analfabeto? (Digite SIM ou NÃO):"

REGRA: Quando tiver TODOS esses 9 dados, e SOMENTE quando tiver todos, sua resposta DEVE ser ÚNICA E EXCLUSIVAMENTE um JSON exato:
```json
{
  "action": "simulate",
  "data": { "convenio": "INSS", "banco_origem": "C6", "idade": 50, "parcela": 150.00, "saldo_devedor": 5000.00, "total_term": 84, "remaining_term": 68, "benefit_species": "31", "analfabeto": "nao" }
}
```
Senão, peça o próximo dado faltante usando o texto EXATO correspondente da lista acima."""'''

# Find the start of system_prompt in code and replace it
start_idx = code.find('    system_prompt = """Você é a Clara')
end_idx = code.find('"""', start_idx + 25) + 3 # find the closing triple quotes

if start_idx != -1 and end_idx != -1:
    code = code[:start_idx] + new_prompt + code[end_idx:]
else:
    print("Could not find system_prompt")


# 3. Update simular logic
# Find:
#     if msg_lower == "simular" and session.get("state") in ["idle", "waiting_initial_choice"]:
#         if not session.get("protocol"):
#             session["protocol"] = generate_protocol()
#             session["user_id"] = matched_user.id
#             session["client_name"] = first_name
#         session["state"] = "waiting_data_collection"
#         session["messages"].append({"role": "bot", "text": get_current_step_instruction(session), "timestamp": datetime.now().isoformat()})
#         await save_chat_log(db, session, sender, False)
#         return {
#             "status": "success",
#             "reply": get_current_step_instruction(session),
#                 "sender": sender
#         }

replacement = """    if msg_lower == "simular" and session.get("state") in ["idle", "waiting_initial_choice"]:
        if not session.get("protocol"):
            session["protocol"] = generate_protocol()
            session["user_id"] = matched_user.id
            session["client_name"] = first_name
        session["state"] = "waiting_data_collection"
        
        gemini_reply = get_gemini_response(session, "simular")
        session["messages"].append({"role": "bot", "text": gemini_reply, "timestamp": datetime.now().isoformat()})
        await save_chat_log(db, session, sender, False)
        return {
            "status": "success",
            "reply": gemini_reply,
            "sender": sender
        }"""

# Use regex to replace the block to handle spacing differences
pattern = r'    if msg_lower == "simular" and session\.get\("state"\) in \["idle", "waiting_initial_choice"\]:.*?return \{.*?\}'
code = re.sub(pattern, replacement, code, flags=re.DOTALL)

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied strict Gemini layout and fixed protocol")
