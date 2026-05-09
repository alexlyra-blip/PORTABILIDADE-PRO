
import sqlite3
import os

db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Simulador de Portabilidade\backend\local_db.sqlite'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get ALL sub agreement logos
cursor.execute("SELECT id, name, logo_url FROM sub_agreement_logos")
logos = cursor.fetchall()
print("--- SUB AGREEMENT LOGOS ---")
for l in logos:
    print(l)

# Get ALL banks
cursor.execute("SELECT id, name, logo_url FROM banks")
banks = cursor.fetchall()
print("\n--- BANKS ---")
for b in banks:
    print(b)

conn.close()
