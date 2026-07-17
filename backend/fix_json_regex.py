import sys

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_block = '''        if '"action": "simulate"' in gemini_reply or "```json" in gemini_reply:
            try:
                json_str = gemini_reply
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0].strip()
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0].strip()
                    
                data = json.loads(json_str)'''

new_block = '''        if '"action": "simulate"' in gemini_reply or "```json" in gemini_reply or '"convenio"' in gemini_reply:
            try:
                import re
                json_str = gemini_reply
                # Try to extract just the JSON object from the string
                match = re.search(r'\\{.*\\}', json_str, re.DOTALL)
                if match:
                    json_str = match.group(0)
                else:
                    if "```json" in json_str:
                        json_str = json_str.split("```json")[1].split("```")[0].strip()
                    elif "```" in json_str:
                        json_str = json_str.split("```")[1].split("```")[0].strip()
                    
                data = json.loads(json_str)'''

if old_block in code:
    code = code.replace(old_block, new_block)
    with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Success")
else:
    print("Failed to find block")
