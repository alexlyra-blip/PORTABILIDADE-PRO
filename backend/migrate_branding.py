import sqlite3
import os

db_path = "local_db.sqlite"

def migrate():
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    columns_to_add = [
        ("is_temporary_password", "BOOLEAN DEFAULT 1"),
        ("seller_limit", "INTEGER DEFAULT 0"),
        ("brand_color", "VARCHAR(7)"),
        ("logo_url", "TEXT"),
        ("role", "VARCHAR(20) DEFAULT 'corretor'"),
        ("broker_id", "INTEGER REFERENCES users(id)"),
    ]

    for col_name, col_def in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError:
            print(f"Column {col_name} already exists")

    conn.commit()
    conn.close()
    print("Migration finished.")

if __name__ == "__main__":
    migrate()
