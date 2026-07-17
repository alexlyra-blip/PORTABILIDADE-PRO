import sqlite3
import os

def migrate():
    conn = sqlite3.connect("local_db.sqlite")
    cursor = conn.cursor()
    
    # Add new columns to bank_rules
    columns_to_add = [
        ("accepts_disability", "BOOLEAN DEFAULT 0"),
        ("disability_min_age", "INTEGER"),
        ("disability_min_benefit_years", "INTEGER"),
        ("disability_min_benefit_months", "INTEGER")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE bank_rules ADD COLUMN {col_name} {col_type}")
            print(f"Added {col_name} to bank_rules table")
        except sqlite3.OperationalError as e:
            print(f"Column {col_name} already exists or error: {e}")
            
    conn.commit()
    conn.close()
    
    # Create upload directory
    os.makedirs("uploads/logos", exist_ok=True)
    print("Created uploads/logos directory")
    
    print("Phase 2 Migration completed!")

if __name__ == "__main__":
    migrate()
