import sys

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Add last_request_time update and background task trigger
if 'session["last_request_time"] = datetime.now().timestamp()' not in code:
    code = code.replace(
        'if sender not in CHAT_SESSIONS:\n        CHAT_SESSIONS[sender] = {',
        'if sender not in CHAT_SESSIONS:\n        CHAT_SESSIONS[sender] = {'
    )
    # Actually, we can update it right after getting the session
    code = code.replace(
        'session = CHAT_SESSIONS[sender]',
        'session = CHAT_SESSIONS[sender]\n    session["last_request_time"] = datetime.now().timestamp()\n    asyncio.create_task(background_timeout_task(sender, session, db))'
    )

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Injected timeout trigger")
