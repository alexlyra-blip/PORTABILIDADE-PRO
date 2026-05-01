
import sqlite3
import os

db_path = 'backend/local_db.sqlite'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Fix AGIGANK typo
    cursor.execute("UPDATE bank_rules SET excluded_origin_banks = REPLACE(excluded_origin_banks, 'AGIGANK', 'AGIBANK')")
    # Fix DAYCOVAL in case it's misspelled
    cursor.execute("UPDATE bank_rules SET excluded_origin_banks = REPLACE(excluded_origin_banks, 'DAYCOVAL', 'BANCO DAYCOVAL')")
    
    # Check current rules
    cursor.execute("SELECT id, excluded_origin_banks FROM bank_rules WHERE excluded_origin_banks LIKE '%AGI%'")
    rows = cursor.fetchall()
    print("Fixed Agibank rules:")
    for row in rows:
        print(row)
        
    conn.commit()
    conn.close()
    print("Database fixed successfully.")
else:
    print(f"DB not found at {os.path.abspath(db_path)}")
