import sys

with open('backend/app/routers/chat.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace generate_protocol definition
old_gen = '''def generate_protocol() -> str:
    initials = os.getenv("PROMOTORA_INITIALS", "J2")'''
new_gen = '''def generate_protocol(user_name: str = None) -> str:
    if user_name:
        parts = user_name.strip().split()
        if len(parts) >= 2:
            initials = (parts[0][0] + parts[1][0]).upper()
        elif len(parts) == 1:
            initials = parts[0][:2].upper()
        else:
            initials = os.getenv("PROMOTORA_INITIALS", "J2")
    else:
        initials = os.getenv("PROMOTORA_INITIALS", "J2")'''
code = code.replace(old_gen, new_gen)

# Replace generate_protocol() calls with generate_protocol(matched_user.name)
code = code.replace('generate_protocol()', 'generate_protocol(matched_user.name)')

# Update Gemini error message to show error
old_err = '''    except Exception as e:
        print(f"Gemini error: {e}")
        return "⚠️ Desculpe, estou com instabilidade no momento."'''
new_err = '''    except Exception as e:
        print(f"Gemini error: {e}")
        return f"⚠️ Desculpe, ocorreu um erro na Inteligência: {type(e).__name__} - {e}"'''
code = code.replace(old_err, new_err)

with open('backend/app/routers/chat.py', 'w', encoding='utf-8') as f:
    f.write(code)

print('Success')
