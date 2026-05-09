
import sqlite3
import os

db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Simulador de Portabilidade\backend\local_db.sqlite'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find C6 bank ID
cursor.execute("SELECT id, name FROM banks WHERE name LIKE '%C6%'")
banks = cursor.fetchall()
print(f"Banks found: {banks}")

for b_id, b_name in banks:
    print(f"\n--- Rules for {b_name} (ID: {b_id}) ---")
    cursor.execute("SELECT agreement, min_release_amount FROM bank_rules WHERE bank_id = ?", (b_id,))
    rules = cursor.fetchall()
    for r in rules:
        print(f"Agreement: {r[0]}, Min Release: {r[1]}")
    
    print(f"\n--- Tables for {b_name} ---")
    cursor.execute("SELECT name, min_ticket, min_installment FROM bank_tables WHERE bank_id = ?", (b_id,))
    tables = cursor.fetchall()
    for t in tables:
        print(f"Table: {t[0]}, Min Ticket: {t[1]}, Min Installment: {t[2]}")

conn.close()
