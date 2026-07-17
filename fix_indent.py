import sys

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# The original block looked like this:
#     if sender not in CHAT_SESSIONS:
#         ...
#         session = CHAT_SESSIONS[sender]
#         session["messages"].append({"role": "bot", "text": get_welcome_menu(first_name, protocol), "timestamp": datetime.now().isoformat()})
#         ...

code = code.replace(
    '        session = CHAT_SESSIONS[sender]\n    session["last_request_time"] = datetime.now().timestamp()\n    asyncio.create_task(background_timeout_task(sender, session, db))\n        session["messages"].append',
    '        session = CHAT_SESSIONS[sender]\n        session["messages"].append'
)

# And insert it PROPERLY at the very top of chat_interaction, right after extracting message
code = code.replace(
    '    message = input_data.message.strip()\n    msg_lower = message.lower()',
    '    message = input_data.message.strip()\n    msg_lower = message.lower()\n    \n    if sender in CHAT_SESSIONS:\n        session = CHAT_SESSIONS[sender]\n        session["last_request_time"] = datetime.now().timestamp()\n        asyncio.create_task(background_timeout_task(sender, session, db))'
)

# Wait, if sender is NOT in CHAT_SESSIONS yet, the timeout isn't triggered for the first message?
# Actually, the first message initializes the session, and it will trigger next time. That's fine.

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed indentation")
