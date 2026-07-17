import sys
import re

with open('backend/app/routers/admin.py', 'r', encoding='utf-8') as f:
    admin_code = f.read()

# Make sure we import User
if 'from app.models.sqlalchemy_models import WhatsappChatLog' in admin_code and 'User' not in admin_code.split('from app.models.sqlalchemy_models import WhatsappChatLog')[0]:
    admin_code = admin_code.replace(
        'from app.models.sqlalchemy_models import WhatsappChatLog',
        'from app.models.sqlalchemy_models import WhatsappChatLog, User'
    )

old_query_block = '''    query = select(WhatsappChatLog).options(joinedload(WhatsappChatLog.user)).order_by(WhatsappChatLog.created_at.desc())
    
    if protocol:
        query = query.where(WhatsappChatLog.protocol.ilike(f"%{protocol}%"))
    if phone:
        query = query.where(WhatsappChatLog.sender_phone.ilike(f"%{phone}%"))
    if user_id:
        query = query.where(WhatsappChatLog.user_id == user_id)
        
    # We could do date filtering if start_date/end_date exist
    # For now simply fetch and return
    result = await db.execute(query)
    logs = result.scalars().all()
    
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
            "user_name": log.user.name if log.user else "Desconhecido",
            "messages": json.loads(log.messages) if log.messages else []
        }
        for log in logs
    ]'''

new_query_block = '''    query = select(WhatsappChatLog, User).outerjoin(User, WhatsappChatLog.user_id == User.id).order_by(WhatsappChatLog.created_at.desc())
    
    if protocol:
        query = query.where(WhatsappChatLog.protocol.ilike(f"%{protocol}%"))
    if phone:
        query = query.where(WhatsappChatLog.sender_phone.ilike(f"%{phone}%"))
    if user_id:
        query = query.where(WhatsappChatLog.user_id == user_id)
        
    result = await db.execute(query)
    rows = result.all()
    
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
            "messages": json.loads(log.messages) if log.messages else []
        }
        for log, user in rows
    ]'''

admin_code = admin_code.replace(old_query_block, new_query_block)

with open('backend/app/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(admin_code)

print("Applied outerjoin fix")
