import sys
import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

marker = """    # Save user message to memory
    if input_data.pdf_url:
        session["messages"].append({"role": "user", "text": f"[PDF Document Sent: {input_data.pdf_url}]", "timestamp": datetime.now().isoformat()})
    else:
        session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})"""

new_block = """    # Save user message to memory
    if input_data.pdf_url:
        session["messages"].append({"role": "user", "text": f"[PDF Document Sent: {input_data.pdf_url}]", "timestamp": datetime.now().isoformat()})
    else:
        # Check if it's the N8N payload
        if "[DADOS_PDF_N8N]" in message:
            import json
            try:
                json_str = message.split("[DADOS_PDF_N8N]")[1].strip()
                data = json.loads(json_str)
                
                if not session.get("protocol"):
                    session["protocol"] = generate_protocol()
                    session["user_id"] = matched_user.id
                    session["client_name"] = first_name
                
                session["convenio"] = data.get("convenio", "INSS")
                session["idade"] = str(data.get("idade", 50))
                session["analfabeto"] = "sim" if data.get("analfabeto", False) else "não"
                
                contratos = data.get("contratos", [])
                if not contratos:
                    reply_text = "⚠️ *Não encontramos contratos ativos neste extrato.*"
                    session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
                    await save_chat_log(db, session, sender, False)
                    return {"status": "success", "reply": reply_text}
                
                all_replies = []
                for idx, c in enumerate(contratos[:5]):
                    session["banco_origem"] = c.get("banco", "")
                    session["parcela"] = str(c.get("parcela", 0))
                    session["saldo_devedor"] = str(c.get("saldo", 0))
                    session["total_term"] = str(c.get("prazo_total", 84))
                    session["remaining_term"] = str(c.get("prazo_restante", 68))
                    session["benefit_species"] = str(c.get("especie", ""))
                    
                    reply = await run_simulation_and_respond(session, db, user_id=matched_user.id)
                    all_replies.append(f"📌 *CONTRATO {idx+1} ({session['banco_origem']} - Parcela R$ {session['parcela']}):*\\n\\n" + reply)
                
                final_reply = "\\n\\n➖➖➖➖➖➖➖➖➖➖\\n\\n".join(all_replies)
                
                session["messages"].append({"role": "user", "text": "[Dados do Extrato PDF recebidos via N8N e simulados com sucesso]", "timestamp": datetime.now().isoformat()})
                session["messages"].append({"role": "bot", "text": final_reply, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                
                return {
                    "status": "success",
                    "reply": final_reply
                }
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {"status": "error", "reply": "Erro ao processar dados estruturados do PDF."}
        else:
            session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})"""

if marker in code:
    code = code.replace(marker, new_block)
else:
    # try CRLF
    marker_crlf = marker.replace('\n', '\r\n')
    new_block_crlf = new_block.replace('\n', '\r\n')
    if marker_crlf in code:
        code = code.replace(marker_crlf, new_block_crlf)
    else:
        print("Could not find the marker block!")

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done updating chat.py")
