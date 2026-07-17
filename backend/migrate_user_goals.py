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
        cursor.execute("ALTER TABLE users ADD COLUMN monthly_goal REAL DEFAULT 110000.0;")
        print("[SQLITE] Added monthly_goal column to users table.")
    except Exception as e:
        print(f"[SQLITE] users.monthly_goal error: {e}")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN daily_goal REAL DEFAULT 5000.0;")
        print("[SQLITE] Added daily_goal column to users table.")
    except Exception as e:
        print(f"[SQLITE] users.daily_goal error: {e}")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN monthly_goal_type VARCHAR(20) DEFAULT 'mensal';")
        print("[SQLITE] Added monthly_goal_type column to users table.")
    except Exception as e:
        print(f"[SQLITE] users.monthly_goal_type error: {e}")
        
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
                cursor.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthly_goal DOUBLE PRECISION DEFAULT 110000.0;")
                print("[POSTGRES] Added monthly_goal column to users table.")
            except Exception as e:
                print(f"[POSTGRES] users.monthly_goal error: {e}")

            try:
                cursor.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_goal DOUBLE PRECISION DEFAULT 5000.0;")
                print("[POSTGRES] Added daily_goal column to users table.")
            except Exception as e:
                print(f"[POSTGRES] users.daily_goal error: {e}")

            try:
                cursor.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthly_goal_type VARCHAR(20) DEFAULT 'mensal';")
                print("[POSTGRES] Added monthly_goal_type column to users table.")
            except Exception as e:
                print(f"[POSTGRES] users.monthly_goal_type error: {e}")
                
            cursor.close()
            conn.close()
            print("[POSTGRES] PostgreSQL migration completed successfully.")
            return
        except Exception as e:
            print(f"[POSTGRES] Attempt {index+1} failed: {e}")

def main():
    print("--- STARTING DATABASE MIGRATION FOR USER GOALS ---")
    migrate_sqlite()
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_url = "postgresql+asyncpg://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
        print(f"[INFO] DATABASE_URL not set in environment. Using default Supabase URL.")
        
    migrate_postgres(db_url)
    print("--- DATABASE MIGRATION COMPLETED ---")

if __name__ == "__main__":
    main()
