import sqlite3
import bcrypt
import sys

# force UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

NEW_PASSWORD = "mudar123"
EMAIL = "alexlyra@gmail.com"

hashed = bcrypt.hashpw(NEW_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

conn = sqlite3.connect("local_db.sqlite")
result = conn.execute("SELECT id, role FROM users WHERE email = ?", (EMAIL,)).fetchone()

if result:
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE email = ?",
        (hashed, EMAIL)
    )
    conn.commit()
    print(f"OK - Senha de {EMAIL} redefinida para: {NEW_PASSWORD}")
else:
    # Se não existir, cria como admin para os testes
    conn.execute(
        "INSERT INTO users (name, email, password_hash, role, seller_limit, is_temporary_password) VALUES (?, ?, ?, ?, ?, ?)",
        ("Alex Lyra", EMAIL, hashed, "admin", 0, 0)
    )
    conn.commit()
    print(f"Usuário criado com sucesso! Email: {EMAIL} | Senha: {NEW_PASSWORD} (Perfil: Admin)")

conn.close()
