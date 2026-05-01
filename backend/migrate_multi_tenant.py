import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "app", "local_db.sqlite")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Add columns to users table
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)")
            print("Added avatar_url to users")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e).lower():
                print(e)
            else:
                print("avatar_url already exists")

        try:
            cursor.execute("ALTER TABLE users ADD COLUMN dark_mode BOOLEAN DEFAULT 0")
            print("Added dark_mode to users")
        except sqlite3.OperationalError as e:
            if "duplicate column name" not in str(e).lower():
                print(e)
            else:
                print("dark_mode already exists")

        # Create new tables
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_bank_visibility (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            bank_name VARCHAR(100) NOT NULL,
            priority BOOLEAN DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """)
        print("Ensured user_bank_visibility table exists")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS promotora_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            promotora_id INTEGER NOT NULL,
            max_installments INTEGER DEFAULT 84,
            FOREIGN KEY(promotora_id) REFERENCES users(id)
        )
        """)
        print("Ensured promotora_rules table exists")

        conn.commit()
        print("Migration complete.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
