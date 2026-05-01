
import sqlite3
import os

db_paths = [
    'backend/local_db.sqlite',
    'local_db.sqlite'
]

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Migrating DB at {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # Add accepts_loas column if it doesn't exist
            cursor.execute("ALTER TABLE bank_rules ADD COLUMN accepts_loas BOOLEAN DEFAULT 1")
            print("- Column 'accepts_loas' added.")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                 print("- Column 'accepts_loas' already exists.")
            else:
                print(f"- Error adding column: {e}")

        try:
            # Ensure accepts_disability (just in case they were all false)
            cursor.execute("UPDATE bank_rules SET accepts_disability = 1 WHERE accepts_disability IS NULL")
            print("- Column 'accepts_disability' defaults fixed.")
        except:
            pass

        conn.commit()
        conn.close()
        print("Done.")
    else:
        print(f"DB not found at {db_path}")

print("Migration completed.")
