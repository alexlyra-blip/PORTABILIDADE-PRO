import sys

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

new_endpoint = """@router.get("/external/check-timeout/{sender}")
async def check_timeout(sender: str, db: AsyncSession = Depends(get_db)):
    sender = normalize_phone(sender)
    
    session = CHAT_SESSIONS.get(sender)
    if not session:
        return {"timeout": False, "reason": "No active session"}
        
    if session.get("state") == "finished":
        return {"timeout": False, "reason": "Session already finished"}
        
    last_time = session.get("last_request_time", 0.0)
    current_time = datetime.now().timestamp()
    
    # 15 minutes = 900 seconds
    if (current_time - last_time) >= 900:
        session["state"] = "finished"
        protocol = session.get("protocol", "N/A")
        
        reply_text = (
            "⏳ *Atendimento encerrado por inatividade.*\\n\\n"
            f"📝 *Protocolo:* {protocol}\\n"
            "Se precisar de uma nova simulação, estarei sempre à disposição!"
        )
        session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
        await save_chat_log(db, session, sender, True)
        
        return {"timeout": True, "reply": reply_text}
    
    return {"timeout": False, "reason": "Active recently"}

@router.post("/external/chat")"""

marker = '@router.post("/external/chat")'

if marker in code:
    code = code.replace(marker, new_endpoint)
else:
    print("Could not find router.post")

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done inserting GET endpoint")
