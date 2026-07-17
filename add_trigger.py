import sys

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# I will find the `@router.post("/external/chat")` and then right before the function returns (or at the top of the function),
# But since the timeout needs to start counting AFTER we receive a message (and update last_request_time),
# it's best to trigger it at the end of the `chat_interaction` function. 
# Or even better, trigger it right after setting `session["last_request_time"] = datetime.now().timestamp()`.
# Let's find where `last_request_time` is updated.
if 'session["last_request_time"] = datetime.now().timestamp()' in code:
    code = code.replace(
        'session["last_request_time"] = datetime.now().timestamp()',
        'session["last_request_time"] = datetime.now().timestamp()\n    asyncio.create_task(background_timeout_task(sender, session, db))'
    )
else:
    print("Could not find last_request_time update!")

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Added asyncio.create_task to chat.py")
