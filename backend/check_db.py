import sqlite3
import os

db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Projeto Simulador de Porabilidade\backend\local_db.sqlite'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check columns
cursor.execute("PRAGMA table_info(bank_rules)")
columns = [row[1] for row in cursor.fetchall()]

print(f"Current columns: {columns}")

needed = ['excluded_origin_banks', 'origin_banks_min_paid']
for col in needed:
    if col not in columns:
        print(f"Adding column {col}...")
        try:
            cursor.execute(f"ALTER TABLE bank_rules ADD COLUMN {col} TEXT")
            conn.commit()
            print(f"Column {col} added successfully.")
        except Exception as e:
            print(f"Error adding {col}: {e}")
    else:
        print(f"Column {col} already exists.")

conn.close()
