import sqlite3
import os

db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Projeto Simulador de Porabilidade\backend\local_db.sqlite'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all bank tables
cursor.execute("SELECT id, bank_id, name, agreement, sub_agreement, active FROM bank_tables")
tbls = cursor.fetchall()
print(f"\nAll Tables in bank_tables ({len(tbls)}):")
for t in tbls:
    cursor.execute("SELECT count(*) FROM coefficients WHERE table_id = ?", (t[0],))
    coeff_count = cursor.fetchone()[0]
    # Get bank name
    cursor.execute("SELECT name FROM banks WHERE id = ?", (t[1],))
    bank_name = cursor.fetchone()
    bank_name = bank_name[0] if bank_name else "Unknown"
    print(f"  ID: {t[0]} | Bank: {bank_name} | Name: {t[2]} | Agreement: {t[3]} | Sub: {t[4]} | Active: {t[5]} | Coeffs: {coeff_count}")
    
conn.close()
