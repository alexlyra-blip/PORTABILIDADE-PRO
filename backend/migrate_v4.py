import sqlite3

def migrate():
    conn = sqlite3.connect("local_db.sqlite")
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE coefficients ADD COLUMN interest_rate_refin FLOAT")
        print("Added interest_rate_refin to coefficients table")
    except sqlite3.OperationalError as e:
        print(f"Error or already exists: {e}")
            
    conn.commit()
    conn.close()
    print("Phase 3 Migration completed!")

if __name__ == "__main__":
    migrate()
