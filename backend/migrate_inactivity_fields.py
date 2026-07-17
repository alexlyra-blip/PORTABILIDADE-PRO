import os
import sqlite3
import psycopg2

def migrate_sqlite():
    db_path = "local_db.sqlite"
    if not os.path.exists(db_path):
        print(f"[SQLITE] Database file {db_path} not found. Skipping SQLite migration.")
        return
    
    print(f"[SQLITE] Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE whatsapp_chat_logs ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
        print("[SQLITE] Added last_activity_at column to whatsapp_chat_logs table.")
    except Exception as e:
        print(f"[SQLITE] whatsapp_chat_logs.last_activity_at error: {e}")

    try:
        cursor.execute("ALTER TABLE whatsapp_chat_logs ADD COLUMN closed_at TIMESTAMP;")
        print("[SQLITE] Added closed_at column to whatsapp_chat_logs table.")
    except Exception as e:
        print(f"[SQLITE] whatsapp_chat_logs.closed_at error: {e}")

    try:
        cursor.execute("ALTER TABLE whatsapp_chat_logs ADD COLUMN close_reason VARCHAR(50);")
        print("[SQLITE] Added close_reason column to whatsapp_chat_logs table.")
    except Exception as e:
        print(f"[SQLITE] whatsapp_chat_logs.close_reason error: {e}")
        
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
                cursor.execute("ALTER TABLE public.whatsapp_chat_logs ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();")
                print("[POSTGRES] Added last_activity_at column to whatsapp_chat_logs table.")
            except Exception as e:
                print(f"[POSTGRES] whatsapp_chat_logs.last_activity_at error: {e}")

            try:
                cursor.execute("ALTER TABLE public.whatsapp_chat_logs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;")
                print("[POSTGRES] Added closed_at column to whatsapp_chat_logs table.")
            except Exception as e:
                print(f"[POSTGRES] whatsapp_chat_logs.closed_at error: {e}")

            try:
                cursor.execute("ALTER TABLE public.whatsapp_chat_logs ADD COLUMN IF NOT EXISTS close_reason VARCHAR(50);")
                print("[POSTGRES] Added close_reason column to whatsapp_chat_logs table.")
            except Exception as e:
                print(f"[POSTGRES] whatsapp_chat_logs.close_reason error: {e}")
                
            cursor.close()
            conn.close()
            print("[POSTGRES] PostgreSQL migration completed successfully.")
            return
        except Exception as e:
            print(f"[POSTGRES] Attempt {index+1} failed: {e}")

def main():
    print("--- STARTING DATABASE MIGRATION FOR INACTIVITY FIELDS ---")
    migrate_sqlite()
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_url = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
        print(f"[INFO] DATABASE_URL not set in environment. Using default Supabase URL.")
        
    migrate_postgres(db_url)
    print("--- DATABASE MIGRATION COMPLETED ---")

if __name__ == "__main__":
    main()
