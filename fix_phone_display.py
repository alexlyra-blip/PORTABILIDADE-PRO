import sys

with open('frontend/src/app/admin/whatsapp/page.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add cleanPhone helper
clean_phone_fn = '''  const formatDate = (ds: string) => {
    if (!ds) return "";
    const d = new Date(ds);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR").slice(0,5);
  };
  
  const cleanPhone = (p: string) => p ? p.split('@')[0].split(':')[0] : '';'''

code = code.replace(
    '''  const formatDate = (ds: string) => {
    if (!ds) return "";
    const d = new Date(ds);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR").slice(0,5);
  };''',
    clean_phone_fn
)

# Replace table cell
code = code.replace(
    '<span className="text-[10px] font-bold text-slate-400 mt-0.5">{log.sender_phone}</span>',
    '<span className="text-[10px] font-bold text-slate-400 mt-0.5">{cleanPhone(log.sender_phone)}</span>'
)

# Replace modal header
code = code.replace(
    'Chat: {selectedLog.client_name || selectedLog.sender_phone}',
    'Chat: {selectedLog.client_name || cleanPhone(selectedLog.sender_phone)}'
)

with open('frontend/src/app/admin/whatsapp/page.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied phone formatting")
