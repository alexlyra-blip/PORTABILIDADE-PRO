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
        cursor.execute("ALTER TABLE banks ADD COLUMN margin_base_priority INTEGER DEFAULT 0;")
        print("[SQLITE] Added margin_base_priority column to banks table.")
    except Exception as e:
        print(f"[SQLITE] banks.margin_base_priority error: {e}")
        
    conn.commit()
    conn.close()
    print("[SQLITE] SQLite migration completed.")

def migrate_postgres(url):
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
                cursor.execute("ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS margin_base_priority INTEGER DEFAULT 0;")
                print("[POSTGRES] Added margin_base_priority column to banks table.")
            except Exception as e:
                print(f"[POSTGRES] banks.margin_base_priority error: {e}")
                
            cursor.close()
            conn.close()
            print("[POSTGRES] PostgreSQL migration completed successfully.")
            return
        except Exception as e:
            print(f"[POSTGRES] Attempt {index+1} failed: {e}")

def main():
    print("--- STARTING DATABASE MIGRATION FOR MARGIN PRIORITY ---")
    migrate_sqlite()
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_url = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
        print(f"[INFO] DATABASE_URL not set in environment. Using default Supabase URL.")
        
    migrate_postgres(db_url)
    print("--- DATABASE MIGRATION COMPLETED ---")

if __name__ == "__main__":
    main()
