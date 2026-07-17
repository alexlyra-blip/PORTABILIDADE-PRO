import sys
import json
import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Prepend imports at the very beginning
if 'import google.generativeai as genai' not in code:
    imports = "import google.generativeai as genai\nimport asyncio\nimport httpx\nimport os\n"
    code = imports + code

# 2. Add timeout task and get_gemini_response just before @router.post("/external/chat")
timeout_task_code = """
async def background_timeout_task(sender: str, session: dict, db: AsyncSession):
    await asyncio.sleep(900)  # Wait 15 minutes
    
    current_time = datetime.now().timestamp()
    last_time = session.get("last_request_time", 0.0)
    
    if (current_time - last_time) >= 890:
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
                    print(f"Error sending timeout msg: {e}")

def get_gemini_response(session: dict, message: str) -> str:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return "⚠️ Chave do Gemini não configurada."
        
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    system_prompt = \"\"\"Você é a Clara, Assistente Especialista em Portabilidade de Crédito Consignado.
Sua missão é extrair de forma simpática as informações para simular uma portabilidade.
Colete obrigatoriamente:
1. convenio (INSS, SIAPE, GOV_EST, FORCAS, CLT_PRIVADO)
2. banco_origem (ex: C6, Pan, Bradesco)
3. idade
4. parcela
5. saldo_devedor
6. total_term (prazo total)
7. remaining_term (parcelas restantes)
8. benefit_species (só INSS, ou 'ignorar')
9. analfabeto (sim/nao)

Se o cliente corrigir algo, atualize o contexto!

REGRA: Quando tiver TODOS esses dados, e SOMENTE quando tiver todos, sua resposta DEVE ser um JSON exato:
```json
{
  "action": "simulate",
  "data": { "convenio": "INSS", "banco_origem": "C6", "idade": 50, "parcela": 150.00, "saldo_devedor": 5000.00, "total_term": 84, "remaining_term": 68, "benefit_species": "31", "analfabeto": "nao" }
}
```
Senão, converse pedindo os dados faltantes.\"\"\"

    history = system_prompt + "\\n\\n--- HISTÓRICO ---\\n"
    for msg in session.get("messages", [])[-15:]:
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
    code = code.replace('@router.post("/external/chat")', timeout_task_code + '\n@router.post("/external/chat")')

# 3. Add session["last_request_time"] = datetime.now().timestamp() and asyncio.create_task at the beginning of chat_interaction
if 'asyncio.create_task(background_timeout_task(sender, session, db))' not in code:
    code = code.replace(
        'session = CHAT_SESSIONS[sender]',
        'session = CHAT_SESSIONS[sender]\n    session["last_request_time"] = datetime.now().timestamp()\n    asyncio.create_task(background_timeout_task(sender, session, db))'
    )

# 4. Find the correct state machine block to replace inside chat_interaction
chat_func_start = code.find('async def chat_interaction')
start_idx = code.find('    elif state == "waiting_convenio":', chat_func_start)
end_idx = code.find('    elif state == "waiting_additional_questions":', start_idx)

if start_idx != -1 and end_idx != -1:
    new_state_logic = """    elif state == "waiting_data_collection":
        gemini_reply = get_gemini_response(session, msg_lower)
        
        if '"action": "simulate"' in gemini_reply or "```json" in gemini_reply:
            try:
                json_str = gemini_reply
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0].strip()
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0].strip()
                    
                data = json.loads(json_str)
                sim_data = data.get("data", {})
                
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
                return {"status": "success", "reply": reply, "sender": sender}
            except Exception as e:
                print(f"Error parsing Gemini JSON: {e}")
                err = "⚠️ Entendi os dados, mas ocorreu um erro. Pode confirmar sua Idade e Saldo?"
                session["messages"].append({"role": "bot", "text": err, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                return {"status": "success", "reply": err, "sender": sender}
        else:
            session["messages"].append({"role": "bot", "text": gemini_reply, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {"status": "success", "reply": gemini_reply, "sender": sender}
"""
    code = code[:start_idx] + new_state_logic + code[end_idx:]

    # Redirect simular directly to waiting_data_collection
    # But only inside chat_interaction
    code = code.replace('session["state"] = "waiting_convenio"', 'session["state"] = "waiting_data_collection"')
else:
    print("Could not find start_idx or end_idx!")

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied Gemini logic safely")
