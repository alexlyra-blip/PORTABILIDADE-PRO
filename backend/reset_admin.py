import sqlite3
import bcrypt
import sys

# force UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

NEW_PASSWORD = "admin123"
EMAIL = "admin@teste.com"

hashed = bcrypt.hashpw(NEW_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

conn = sqlite3.connect("local_db.sqlite")
result = conn.execute("SELECT id FROM users WHERE email = ?", (EMAIL,)).fetchone()

if result:
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE email = ?",
        (hashed, EMAIL)
    )
    conn.commit()
    print("OK - Senha redefinida para: admin123")
    print(f"Email: {EMAIL}")
else:
    conn.execute(
        "INSERT INTO users (name, email, password_hash, role, seller_limit, is_temporary_password) VALUES (?, ?, ?, ?, ?, ?)",
        ("Administrador", EMAIL, hashed, "admin", 0, 0)
    )
    conn.commit()
    print(f"Admin criado! Email: {EMAIL} | Senha: {NEW_PASSWORD}")

conn.close()
