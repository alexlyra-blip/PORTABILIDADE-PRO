import sqlite3
db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Projeto Simulador de Porabilidade\backend\local_db.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT id, agreement, excluded_origin_banks, origin_banks_min_paid FROM bank_rules")
rows = cursor.fetchall()
for row in rows:
    print(f"Rule ID {row[0]} ({row[1]}): Excluded={row[2]}, MinPaid={row[3]}")
conn.close()
