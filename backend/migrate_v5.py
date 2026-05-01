import sqlite3

def migrate():
    conn = sqlite3.connect("local_db.sqlite")
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE simulation_results ADD COLUMN table_name VARCHAR(100)")
        print("Added table_name to simulation_results table")
    except sqlite3.OperationalError as e:
        print(f"Error or already exists: {e}")
            
    conn.commit()
    conn.close()
    print("Migration completed!")

if __name__ == "__main__":
    migrate()
