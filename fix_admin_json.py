import sys
import re

with open('backend/app/routers/admin.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Make sure we add a safe json loading mechanism
old_block = '''    return [
        {
            "id": log.id,
            "protocol": log.protocol,
            "sender_phone": log.sender_phone,
            "client_name": log.client_name,
            "status": log.status,
            "created_at": log.created_at,
            "updated_at": log.updated_at,
            "user_id": log.user_id,
            "user_name": user.name if user else "Desconhecido",
            "messages": json.loads(log.messages) if log.messages else []
        }
        for log, user in rows
    ]'''

new_block = '''    def safe_loads(msg_str):
        if not msg_str: return []
        try:
            return json.loads(msg_str)
        except:
            return []
            
    return [
        {
            "id": log.id,
            "protocol": log.protocol,
            "sender_phone": log.sender_phone,
            "client_name": log.client_name,
            "status": log.status,
            "created_at": log.created_at,
            "updated_at": log.updated_at,
            "user_id": log.user_id,
            "user_name": user.name if user else "Desconhecido",
            "messages": safe_loads(log.messages)
        }
        for log, user in rows
    ]'''

if old_block in code:
    code = code.replace(old_block, new_block)

with open('backend/app/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied safe JSON loads to admin.py")
