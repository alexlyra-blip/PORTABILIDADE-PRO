import sqlite3

conn = sqlite3.connect("local_db.sqlite")
rows = conn.execute("SELECT id, email, role FROM users").fetchall()
print("Usuarios cadastrados:")
for row in rows:
    print(row)
conn.close()
