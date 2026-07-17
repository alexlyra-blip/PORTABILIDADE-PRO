import sys
import re

# 1. Update admin.py
with open('backend/app/routers/admin.py', 'r', encoding='utf-8') as f:
    admin_code = f.read()

# Add joinedload import
if 'from sqlalchemy.orm import joinedload' not in admin_code:
    admin_code = admin_code.replace(
        'from sqlalchemy import select',
        'from sqlalchemy import select\nfrom sqlalchemy.orm import joinedload'
    )

old_query = '''    query = select(WhatsappChatLog).order_by(WhatsappChatLog.created_at.desc())'''
new_query = '''    query = select(WhatsappChatLog).options(joinedload(WhatsappChatLog.user)).order_by(WhatsappChatLog.created_at.desc())'''
admin_code = admin_code.replace(old_query, new_query)

old_return_dict = '''            "user_id": log.user_id,
            "messages": json.loads(log.messages) if log.messages else []'''
new_return_dict = '''            "user_id": log.user_id,
            "user_name": log.user.name if log.user else "Desconhecido",
            "messages": json.loads(log.messages) if log.messages else []'''
admin_code = admin_code.replace(old_return_dict, new_return_dict)

with open('backend/app/routers/admin.py', 'w', encoding='utf-8') as f:
    f.write(admin_code)

# 2. Update page.tsx
with open('frontend/src/app/admin/whatsapp/page.tsx', 'r', encoding='utf-8') as f:
    page_code = f.read()

# Add user_name to interface ChatLog
page_code = page_code.replace(
    'user_id: number;',
    'user_id: number;\n  user_name?: string;'
)

# Add brandColor state
brand_state = '''  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  const [brandColor, setBrandColor] = useState('#2563eb');

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const user = JSON.parse(u);
        if (user.brand_color) setBrandColor(user.brand_color);
      }
    } catch(e) {}
  }, []);'''
page_code = page_code.replace(
    '  const [modalOpen, setModalOpen] = useState(false);\n  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);',
    brand_state
)

# Change PageHeader
page_code = page_code.replace(
    'title="Auditoria WhatsApp"',
    'title="Auditoria" highlight="WhatsApp"'
)

# Buttons styling
# "Atualizar" button
old_btn_atualizar = '''className="h-12 px-6 bg-slate-900 dark:bg-slate-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"'''
new_btn_atualizar = '''className="h-12 px-6 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-slate-900/20 hover:opacity-90 transition-all flex items-center gap-2" style={{ backgroundColor: brandColor }}'''
page_code = page_code.replace(old_btn_atualizar, new_btn_atualizar)

# "Ver Chat" button
old_btn_chat = '''className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition-all"'''
new_btn_chat = '''className="inline-flex items-center gap-2 px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-90 transition-all" style={{ backgroundColor: brandColor }}'''
page_code = page_code.replace(old_btn_chat, new_btn_chat)

# Protocol badge color
old_protocol = '''<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-bold text-xs">'''
new_protocol = '''<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs">'''
page_code = page_code.replace(old_protocol, new_protocol)

# Add User column to table
page_code = page_code.replace(
    '<th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Protocolo</th>',
    '<th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Protocolo</th>\n                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Usuário</th>'
)
page_code = page_code.replace(
    '''                      <td className="p-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{formatDate(log.created_at)}</span>
                      </td>''',
    '''                      <td className="p-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{log.user_name || 'Desconhecido'}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{formatDate(log.created_at)}</span>
                      </td>'''
)

# Chat Modal Header icon
page_code = page_code.replace(
    '<Icons.MessageCircle size={24} className="text-purple-500" />',
    '<Icons.MessageCircle size={24} className="text-green-500" />'
)

# Chat background and message styling
old_chat_bg = '''<div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50 dark:bg-slate-900/50" style={{ backgroundImage: 'radial-gradient(circle at center, #f1f5f9 1px, transparent 1px)', backgroundSize: '20px 20px' }}>'''
new_chat_bg = '''<div className="p-6 overflow-y-auto flex-1 space-y-4" style={{ backgroundColor: '#efeae2', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundSize: '400px' }}>'''
page_code = page_code.replace(old_chat_bg, new_chat_bg)

# User message bubble bg from purple to green
page_code = page_code.replace(
    "? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm' \n                        : 'bg-purple-600 text-white rounded-tr-sm'",
    "? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm' \n                        : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-sm shadow-sm'"
)

# User message header and timestamp
page_code = page_code.replace(
    '<div className="text-[10px] font-black uppercase tracking-widest text-purple-200 mb-2">{selectedLog.client_name || \'Cliente\'}</div>',
    '<div className="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-300 mb-2">{selectedLog.client_name || \'Cliente\'}</div>'
)
page_code = page_code.replace(
    "isBot ? 'text-slate-400' : 'text-purple-200'",
    "isBot ? 'text-slate-400' : 'text-slate-500 dark:text-green-200'"
)

# Bold text parsing
old_msg_text = '''{msg.text}'''
new_msg_text = '''{msg.text.split(/(\\*[^*]+\\*)/g).map((part, i) => 
                          part.startsWith('*') && part.endsWith('*') 
                            ? <strong key={i} className="text-green-600 dark:text-green-400 font-bold">{part.slice(1, -1)}</strong> 
                            : part
                        )}'''
# Since {msg.text} is present in the code, we replace exactly the one inside the message bubble:
old_bubble_text = '''<div className={`text-sm font-medium whitespace-pre-wrap leading-relaxed ${isBot ? 'text-slate-700 dark:text-slate-300' : 'text-white'}`}>
                        {msg.text}
                      </div>'''
new_bubble_text = '''<div className={`text-sm font-medium whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200`}>
                        {msg.text.split(/(\\*[^*]+\\*)/g).map((part, i) => 
                          part.startsWith('*') && part.endsWith('*') 
                            ? <strong key={i} className="text-green-600 dark:text-green-400 font-bold">{part.slice(1, -1)}</strong> 
                            : part
                        )}
                      </div>'''
page_code = page_code.replace(old_bubble_text, new_bubble_text)


with open('frontend/src/app/admin/whatsapp/page.tsx', 'w', encoding='utf-8') as f:
    f.write(page_code)

print("Done updating admin.py and page.tsx")
