import sys
import re

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(r'("reply":\s*[^,\n]+)(\s*})', r'\1,\n                "sender": sender\2', code)

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated chat.py with sender")
