import sys
import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the simulation finished state setting and the goodbye message
old_reply = """            f"🏛️ *Outros bancos também elegíveis:* {other_banks_str}\\n\\n"
            "🙏 *Muito obrigada pelo seu contato!*\\n"
            "Foi um prazer te ajudar hoje. Se precisar realizar uma nova simulação, estarei por aqui!\\n\\n"
            "_Encerrando o atendimento atual e limpando a memória..._"
        )
        session["state"] = "finished"
        return reply"""

new_reply = """            f"🏛️ *Outros bancos também elegíveis:* {other_banks_str}\\n\\n"
            "Posso te ajudar com mais alguma dúvida sobre essa simulação, ou você gostaria de ver outra tabela?\\n"
            "Se o atendimento já estiver concluído, basta digitar *'obrigado'* ou *'encerrar'* para finalizar! 🙏"
        )
        session["state"] = "waiting_additional_questions"
        return reply"""

if old_reply in code:
    code = code.replace(old_reply, new_reply)
else:
    # Try with CRLF
    old_reply_crlf = old_reply.replace('\n', '\r\n')
    new_reply_crlf = new_reply.replace('\n', '\r\n')
    if old_reply_crlf in code:
        code = code.replace(old_reply_crlf, new_reply_crlf)
    else:
        print("Could not find the simulation reply block to replace!")

# Now add the handling for "waiting_additional_questions"
# We'll inject it before the # Default fallback at the end of the webhook
fallback_marker = """    # Default fallback
    session["messages"].append({"role": "bot", "text": "💡 *Dica:* Para realizar uma nova simulação de portabilidade a qualquer momento, basta digitar **simular** ou **reset**! 🚀", "timestamp": datetime.now().isoformat()})"""

waiting_block = """    elif state == "waiting_additional_questions":
        if any(word in msg_lower for word in ["obrigad", "valeu", "tchau", "encerrar", "agradeç"]):
            session["state"] = "finished"
            reply_text = (
                "🙏 *Muito obrigada pelo seu contato!*\\n"
                "Foi um prazer te ajudar hoje. Se precisar realizar uma nova simulação, estarei por aqui!\\n\\n"
                f"📝 *Protocolo de Atendimento:* {session.get('protocol')}\\n\\n"
                "_Atendimento encerrado com sucesso. Tenha um ótimo dia!_"
            )
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, True)
            return {
                "status": "success",
                "reply": reply_text
            }
        else:
            reply_text = (
                "Entendido! Se quiser realizar uma nova simulação, digite *simular*.\\n"
                "Caso não tenha mais dúvidas, basta me dizer *'obrigado'* ou *'encerrar'* para finalizarmos o atendimento e eu gerar o seu protocolo. 😉"
            )
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": reply_text
            }

"""

if fallback_marker in code:
    code = code.replace(fallback_marker, waiting_block + fallback_marker)
else:
    fallback_marker_crlf = fallback_marker.replace('\n', '\r\n')
    waiting_block_crlf = waiting_block.replace('\n', '\r\n')
    if fallback_marker_crlf in code:
        code = code.replace(fallback_marker_crlf, waiting_block_crlf + fallback_marker_crlf)
    else:
        print("Could not find fallback marker!")

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done updating chat.py")
