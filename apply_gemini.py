import sys
import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Add imports if missing
if 'import google.generativeai as genai' not in code:
    code = code.replace('import json', 'import json\nimport google.generativeai as genai\nimport asyncio\nimport httpx\nimport os')

# Add the timeout task definition before chat_interaction
timeout_task_code = """
async def background_timeout_task(sender: str, session: dict, db: AsyncSession):
    await asyncio.sleep(900)  # Wait 15 minutes
    
    # Check if they sent a message recently
    current_time = datetime.now().timestamp()
    last_time = session.get("last_request_time", 0.0)
    
    if (current_time - last_time) >= 890:  # Allow small margin
        if session.get("state") != "finished":
            session["state"] = "finished"
            protocol = session.get("protocol", "N/A")
            
            reply_text = (
                "⏳ *Atendimento encerrado por inatividade.*\\n\\n"
                f"📝 *Protocolo:* {protocol}\\n"
                "Se precisar de uma nova simulação, estarei sempre à disposição!"
            )
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, True)
            
            # Send via Evolution API
            evo_url = os.getenv("EVOLUTION_API_URL")
            evo_key = os.getenv("EVOLUTION_API_KEY")
            if evo_url and evo_key:
                payload = {
                    "number": sender,
                    "options": {"delay": 1200},
                    "textMessage": {"text": reply_text}
                }
                headers = {
                    "apikey": evo_key,
                    "Content-Type": "application/json"
                }
                try:
                    async with httpx.AsyncClient() as client:
                        await client.post(evo_url, json=payload, headers=headers)
                except Exception as e:
                    print(f"Error sending timeout msg via Evo API: {e}")

def get_gemini_response(session: dict, message: str) -> str:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return "⚠️ Chave do Gemini (GEMINI_API_KEY) não configurada no servidor."
        
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    system_prompt = \"\"\"Você é a Clara, Assistente Especialista em Portabilidade de Crédito Consignado.
Seu objetivo é extrair de forma amigável as informações necessárias para simular uma portabilidade.
Você precisa obrigatoriamente coletar os seguintes dados do cliente:
1. convenio (INSS, SIAPE, GOV_EST, FORCAS, CLT_PRIVADO)
2. banco_origem (ex: C6, Pan, Bradesco)
3. idade (número inteiro)
4. parcela (valor financeiro atual da parcela)
5. saldo_devedor (valor atual estimado da dívida)
6. total_term (prazo total original do contrato, geralmente 84 para INSS, 120 SIAPE)
7. remaining_term (quantas parcelas faltam pagar)
8. benefit_species (apenas se for INSS, número da espécie do benefício, ex: 31, 21. Ou 'ignorar' se cliente não souber)
9. analfabeto (sim ou não)

Atualmente o cliente já forneceu alguns dados, e outros estão faltando.
Seja amigável e use emojis.
SE o cliente quiser corrigir algo (ex: 'ah não, o saldo é 5000'), você deve entender e corrigir!
NÃO simule os valores, você não sabe calcular taxas, quem faz isso é o sistema.

REGRA DE OURO: Quando (e APENAS QUANDO) você tiver coletado com sucesso TODOS esses dados necessários, a sua resposta deve ser ÚNICA E EXCLUSIVAMENTE um JSON estruturado com os dados extraídos, sem mais nenhum texto adicional fora do JSON, no seguinte formato exato:
```json
{
  "action": "simulate",
  "data": {
    "convenio": "INSS",
    "banco_origem": "C6",
    "idade": 50,
    "parcela": 150.00,
    "saldo_devedor": 5000.00,
    "total_term": 84,
    "remaining_term": 68,
    "benefit_species": "31",
    "analfabeto": "nao"
  }
}
```

Se ainda faltar dados, converse normalmente como a Clara, pedindo apenas 1 ou 2 dados por vez.\"\"\"

    # Construct chat history
    history = system_prompt + "\\n\\n--- HISTÓRICO ---\\n"
    for msg in session.get("messages", [])[-15:]:  # get last 15 msgs
        role = "Cliente" if msg["role"] == "user" else "Clara"
        history += f"{role}: {msg['text']}\\n"
        
    history += f"Cliente: {message}\\nClara:"
    
    try:
        response = model.generate_content(history)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        return "⚠️ Desculpe, estou com instabilidade no momento."

"""
if 'async def background_timeout_task' not in code:
    code = code.replace('def chat_interaction', timeout_task_code + '\n@router.post("/external/chat")\nasync def chat_interaction')

# We need to replace the state machine starting from waiting_convenio to the end
# Since it's big, we'll use regex to replace everything from `elif state == "waiting_convenio":` 
# down to `elif state == "waiting_additional_questions":`

new_state_logic = """    elif state == "waiting_data_collection":
        gemini_reply = get_gemini_response(session, msg_lower)
        
        # Check if Gemini outputted the final JSON
        if '"action": "simulate"' in gemini_reply or "```json" in gemini_reply:
            try:
                # Extract JSON block
                json_str = gemini_reply
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0].strip()
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0].strip()
                    
                data = json.loads(json_str)
                sim_data = data.get("data", {})
                
                # Fill session variables
                session["convenio"] = sim_data.get("convenio", "INSS")
                session["banco_origem"] = sim_data.get("banco_origem", "")
                session["idade"] = str(sim_data.get("idade", 50))
                session["parcela"] = str(sim_data.get("parcela", 0))
                session["saldo_devedor"] = str(sim_data.get("saldo_devedor", 0))
                session["total_term"] = str(sim_data.get("total_term", 84))
                session["remaining_term"] = str(sim_data.get("remaining_term", 68))
                session["benefit_species"] = str(sim_data.get("benefit_species", ""))
                session["analfabeto"] = "sim" if str(sim_data.get("analfabeto", "")).lower() == "sim" else "não"
                
                reply = await run_simulation_and_respond(session, db, user_id=matched_user.id)
                session["messages"].append({"role": "bot", "text": reply, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                
                return {
                    "status": "success",
                    "reply": reply,
                    "sender": sender
                }
            except Exception as e:
                print(f"Error parsing Gemini JSON: {e}")
                err = "⚠️ Entendi os dados, mas ocorreu um erro ao simular. Pode confirmar sua Idade e Saldo?"
                session["messages"].append({"role": "bot", "text": err, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                return {"status": "success", "reply": err, "sender": sender}
        else:
            # Normal chat response from Gemini
            session["messages"].append({"role": "bot", "text": gemini_reply, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": gemini_reply,
                "sender": sender
            }
"""

# Replace all old states
import re

start_marker = r'elif state == "waiting_convenio":'
end_marker = r'elif state == "waiting_additional_questions":'

# Use re.sub to replace the block
pattern = start_marker + r'.*?' + end_marker
if re.search(pattern, code, re.DOTALL):
    code = re.sub(pattern, new_state_logic + '\n    ' + end_marker, code, flags=re.DOTALL)
else:
    print("Could not find the state machine block to replace!")

# Also redirect "simular" option to "waiting_data_collection"
code = code.replace('session["state"] = "waiting_convenio"', 'session["state"] = "waiting_data_collection"')
code = code.replace('session["state"] = "waiting_banco_origem"', 'session["state"] = "waiting_data_collection"')
code = code.replace('session["state"] = "waiting_idade"', 'session["state"] = "waiting_data_collection"')

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied Gemini logic and background task")
