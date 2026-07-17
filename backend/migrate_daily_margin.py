import os
import sqlite3
import psycopg2
from urllib.parse import urlparse

def migrate_sqlite():
    db_path = "local_db.sqlite"
    if not os.path.exists(db_path):
        print(f"[SQLITE] Database file {db_path} not found. Skipping SQLite migration.")
        return
    
    print(f"[SQLITE] Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN can_consult_cpf BOOLEAN DEFAULT 0;")
        print("[SQLITE] Added can_consult_cpf column to users table.")
    except Exception as e:
        print(f"[SQLITE] users.can_consult_cpf: {e}")
        
    try:
        cursor.execute("ALTER TABLE banks ADD COLUMN is_margin_base BOOLEAN DEFAULT 0;")
        print("[SQLITE] Added is_margin_base column to banks table.")
    except Exception as e:
        print(f"[SQLITE] banks.is_margin_base: {e}")

    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_margin_coefficients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_id INTEGER,
            date DATETIME NOT NULL,
            coefficient FLOAT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bank_id) REFERENCES banks (id)
        );
        """)
        print("[SQLITE] Created daily_margin_coefficients table.")
    except Exception as e:
        print(f"[SQLITE] daily_margin_coefficients table: {e}")
        
    conn.commit()
    conn.close()
    print("[SQLITE] SQLite migration completed successfully.")

def migrate_postgres(url):
    # Adjust asyncpg scheme to psycopg2 compatible scheme
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
        
    urls_to_try = [url]
    if "5432" in url:
        urls_to_try.append(url.replace("5432", "6543"))
        
    for index, try_url in enumerate(urls_to_try):
        print(f"[POSTGRES] Connecting to PostgreSQL database (Attempt {index+1})...")
        try:
            conn = psycopg2.connect(try_url, connect_timeout=15)
            conn.autocommit = True
            cursor = conn.cursor()
            
            try:
                cursor.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_consult_cpf BOOLEAN DEFAULT FALSE;")
                print("[POSTGRES] Added can_consult_cpf column to users table.")
            except Exception as e:
                print(f"[POSTGRES] users.can_consult_cpf error: {e}")
                
            try:
                cursor.execute("ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS is_margin_base BOOLEAN DEFAULT FALSE;")
                print("[POSTGRES] Added is_margin_base column to banks table.")
            except Exception as e:
                print(f"[POSTGRES] banks.is_margin_base error: {e}")

            try:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS public.daily_margin_coefficients (
                    id SERIAL PRIMARY KEY,
                    bank_id INTEGER REFERENCES public.banks(id) ON DELETE CASCADE,
                    date TIMESTAMP WITH TIME ZONE NOT NULL,
                    coefficient DOUBLE PRECISION NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                """)
                print("[POSTGRES] Created daily_margin_coefficients table.")
            except Exception as e:
                print(f"[POSTGRES] daily_margin_coefficients table error: {e}")
                
            cursor.close()
            conn.close()
            print("[POSTGRES] PostgreSQL migration completed successfully.")
            return # Success!
        except Exception as e:
            print(f"[POSTGRES] Attempt {index+1} failed: {e}")

def main():
    print("--- STARTING DATABASE MIGRATION ---")
    
    # Run SQLite migration if local db exists
    migrate_sqlite()
    
    # Run Postgres migration if DATABASE_URL is defined or fallback to default Supabase URL
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        # Fallback to the one hardcoded in app/database.py
        db_url = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
        print(f"[INFO] DATABASE_URL not set in environment. Using default Supabase URL.")
        
    migrate_postgres(db_url)
    
    print("--- DATABASE MIGRATION COMPLETED ---")

if __name__ == "__main__":
    main()
