import os
import psycopg2

def migrate():
    print("[MIGRATE] Iniciando migração da coluna context_data em whatsapp_chat_logs...")
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERRO] DATABASE_URL não encontrada no ambiente.")
        return
        
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        
    try:
        print(f"[MIGRATE] Conectando ao banco...")
        conn = psycopg2.connect(db_url, connect_timeout=10)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("[MIGRATE] Executando ADD COLUMN IF NOT EXISTS...")
        query = """
        ALTER TABLE public.whatsapp_chat_logs 
        ADD COLUMN IF NOT EXISTS context_data JSONB NOT NULL DEFAULT '{}'::jsonb;
        """
        cursor.execute(query)
        
        print("[MIGRATE] Sucesso! A coluna context_data agora existe com NOT NULL DEFAULT '{}'.")
    except Exception as e:
        print(f"[ERRO] Falha ao executar migração: {e}")
    finally:
        if 'conn' in locals() and conn:
            cursor.close()
            conn.close()
            print("[MIGRATE] Conexão fechada.")

if __name__ == "__main__":
    migrate()
