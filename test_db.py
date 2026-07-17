import sqlite3
import json

try:
    conn = sqlite3.connect('backend/app/portabilidade.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cur.fetchall()
    print("TABLES:")
    for t in tables:
        print(t[0])
except Exception as e:
    print("ERROR:", e)
