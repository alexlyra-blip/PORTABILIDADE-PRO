
import sqlite3
import os

db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Simulador de Portabilidade\backend\local_db.sqlite'
report_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Simulador de Portabilidade\logo_report.txt'

if not os.path.exists(db_path):
    with open(report_path, 'w') as f:
        f.write(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

with open(report_path, 'w', encoding='utf-8') as f:
    f.write("--- SUB AGREEMENT LOGOS ---\n")
    cursor.execute("SELECT id, name, logo_url FROM sub_agreement_logos")
    for row in cursor.fetchall():
        f.write(f"ID: {row[0]}, Name: {row[1]}, Logo: {row[2]}\n")
    
    f.write("\n--- BANKS ---\n")
    cursor.execute("SELECT id, name, logo_url FROM banks")
    for row in cursor.fetchall():
        f.write(f"ID: {row[0]}, Name: {row[1]}, Logo: {row[2]}\n")

conn.close()
