import sys
import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update the Prompt
old_prompt = '''- Para os outros dados, confirme amigavelmente de forma breve (Ex: "✅ Idade confirmada.\\n\\n").'''
new_prompt = '''- Para TODOS os outros dados, confirme amigavelmente REPETINDO a informação exata que o cliente forneceu na mensagem anterior. (Exemplo: "✅ Idade confirmada: 50 anos.\\n\\n", "✅ Parcela confirmada: R$ 150,00.\\n\\n", "✅ Saldo devedor confirmado: R$ 5.000,00.\\n\\n", "✅ Prazo total confirmado: 84 meses.\\n\\n"). É PROIBIDO confirmar dizendo apenas "Idade confirmada", você deve SEMPRE mostrar o valor.'''
if old_prompt in code:
    code = code.replace(old_prompt, new_prompt)

# 2. Improve JSON parsing and fallback logic
old_json_logic = '''        if "```json" in gemini_reply or "{" in gemini_reply:
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
                
                reply = await run_simulation_and_respond(session, db, user_id=matched_user.id)'''

new_json_logic = '''        if "{" in gemini_reply:
            try:
                import re, traceback
                json_str = gemini_reply
                match = re.search(r'\\{.*\\}', json_str, re.DOTALL)
                if match:
                    json_str = match.group(0)
                else:
                    if "```json" in json_str:
                        json_str = json_str.split("```json")[1].split("```")[0].strip()
                    
                data = json.loads(json_str)
                sim_data = data.get("data", {})
                
                session["convenio"] = sim_data.get("convenio", "INSS")
                session["banco_origem"] = sim_data.get("banco_origem", "")
                session["idade"] = str(sim_data.get("idade", 50))
                session["parcela"] = str(sim_data.get("parcela", 1))
                session["saldo_devedor"] = str(sim_data.get("saldo_devedor", 1))
                session["total_term"] = str(sim_data.get("total_term", 84))
                session["remaining_term"] = str(sim_data.get("remaining_term", 60))
                session["benefit_species"] = str(sim_data.get("benefit_species", ""))
                session["analfabeto"] = "sim" if str(sim_data.get("analfabeto", "")).lower() == "sim" else "não"
                
                reply = await run_simulation_and_respond(session, db, user_id=matched_user.id)'''
if old_json_logic in code:
    code = code.replace(old_json_logic, new_json_logic)

# 3. Update exception handler in chat webhook to print traceback
old_except = '''            except Exception as e:
                print(f"Error parsing Gemini JSON: {e}")
                err = "⚠️ Entendi os dados, mas ocorreu um erro. Pode confirmar sua Idade e Saldo?"'''
new_except = '''            except Exception as e:
                import traceback
                print(f"Error parsing Gemini JSON: {e}")
                traceback.print_exc()
                err = "⚠️ Entendi os dados, mas ocorreu um erro ao gerar a simulação. Pode confirmar sua Idade e Saldo?"'''
if old_except in code:
    code = code.replace(old_except, new_except)

# 4. Fallbacks in run_simulation_and_respond
old_sim_call = '''        input_data = SimulacaoInput(
            banco=session["banco_origem"],
            convenio=session["convenio"],
            idade=parse_integer(str(session["idade"])) or 50,
            parcela=parse_float(str(session["parcela"])) or 0.0,
            saldo_devedor=parse_float(str(session["saldo_devedor"])) or 0.0,
            total_term=parse_integer(str(session["total_term"])) or 84,
            remaining_term=parse_integer(str(session["remaining_term"])) or 0,
            analfabeto=session.get("analfabeto", False) == "sim",
            especie_beneficio=session.get("benefit_species"),
            nome_cliente="Cliente WhatsApp"
        )'''

new_sim_call = '''        input_data = SimulacaoInput(
            banco=session["banco_origem"],
            convenio=session["convenio"],
            idade=max(parse_integer(str(session["idade"])) or 50, 18),
            parcela=max(parse_float(str(session["parcela"])) or 1.0, 1.0),
            saldo_devedor=max(parse_float(str(session["saldo_devedor"])) or 1.0, 1.0),
            total_term=max(parse_integer(str(session["total_term"])) or 84, 1),
            remaining_term=max(parse_integer(str(session["remaining_term"])) or 60, 1),
            analfabeto=session.get("analfabeto", False) == "sim",
            especie_beneficio=session.get("benefit_species"),
            nome_cliente="Cliente WhatsApp"
        )'''
if old_sim_call in code:
    code = code.replace(old_sim_call, new_sim_call)

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied prompt and parsing fixes to chat.py")
