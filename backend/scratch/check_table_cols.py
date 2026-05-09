
import sqlite3
import os

db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Simulador de Portabilidade\backend\local_db.sqlite'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check columns
cursor.execute("PRAGMA table_info(bank_tables)")
columns = [row[1] for row in cursor.fetchall()]

print(f"Current columns in bank_tables: {columns}")

needed = ['portability_adjustment', 'refin_adjustment', 'min_port_rate', 'min_rate']
for col in needed:
    if col not in columns:
        print(f"Column {col} is MISSING!")
    else:
        print(f"Column {col} exists.")

conn.close()
