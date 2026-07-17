import sqlite3
import os

db_path = 'local_db.sqlite'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bank_rules'")
row = cursor.fetchone()
if row:
    print(row[0])
else:
    print("Table not found")
conn.close()
