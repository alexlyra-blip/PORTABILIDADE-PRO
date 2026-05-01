
import sqlite3

conn = sqlite3.connect('local_db.sqlite')
cursor = conn.cursor()

# Get C6 ID
cursor.execute("SELECT id FROM banks WHERE name LIKE '%C6%'")
bank_id = cursor.fetchone()[0]

print(f"Bank ID for C6: {bank_id}")

# Get Rules
cursor.execute("SELECT * FROM bank_rules WHERE bank_id = ?", (bank_id,))
rules = cursor.fetchall()

# Get Column names
cursor.execute("PRAGMA table_info(bank_rules)")
columns = [col[1] for col in cursor.fetchall()]

for rule in rules:
    print("\n--- Rule ---")
    for col, val in zip(columns, rule):
        print(f"{col}: {val}")

conn.close()
