
import sqlite3
import os

db_path = './backend/local_db.sqlite'
if not os.path.exists(db_path):
    db_path = 'local_db.sqlite'

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get C6 Bank ID
    cursor.execute("SELECT id, name FROM banks WHERE name LIKE '%C6%'")
    bank = cursor.fetchone()
    if bank:
        bank_id = bank[0]
        print(f"Bank: {bank[1]} (ID: {bank_id})")
        
        # Get Tables for C6
        cursor.execute("SELECT id, name, active, agreement, min_paid_installments FROM bank_tables WHERE bank_id = ?", (bank_id,))
        tables = cursor.fetchall()
        print("\nTables for C6:")
        for t in tables:
            print(f"ID: {t[0]}, Name: {t[1]}, Active: {t[2]}, Agreement: {t[3]}, Min Paid: {t[4]}")
            
        # Get Rules for C6
        cursor.execute("SELECT * FROM bank_rules WHERE bank_id = ?", (bank_id, ))
        rules = cursor.fetchall()
        print("\nRules for C6:")
        for r in rules:
            print(r)
    else:
        print("Bank C6 not found.")
    
    conn.close()
else:
    print("DB not found.")
