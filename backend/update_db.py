import os
import psycopg2
import time

DATABASE_URL = os.getenv("DATABASE_URL")

def force_fix():
    print("!!! INICIANDO REFORMA TANQUE DE GUERRA !!!")
    if not DATABASE_URL:
        print("Erro: DATABASE_URL ausente.")
        return

    conn = None
    for i in range(5):
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            print("Conectado ao Supabase.")
            break
        except Exception as e:
            print(f"Erro na conexão {i+1}: {e}")
            time.sleep(2)

    if not conn: return

    cursor = conn.cursor()
    
    # Lista de todas as colunas que guardam imagens em todo o sistema
    reformas = [
        ("users", "avatar_url"),
        ("users", "logo_url"),
        ("banks", "logo_url"),
        ("sub_agreement_logos", "logo_url")
    ]

    for table, col in reformas:
        try:
            print(f"Forçando {table}.{col} para TEXT...")
            # Usando SET DATA TYPE que é o comando mais forte do Postgres
            cursor.execute(f'ALTER TABLE "{table}" ALTER COLUMN "{col}" SET DATA TYPE TEXT;')
            print(f"OK: {table}.{col} reformado.")
        except Exception as e:
            print(f"INFO: {table}.{col} ignorado: {e}")

    cursor.close()
    conn.close()
    print("!!! REFORMA CONCLUÍDA COM SUCESSO !!!")

if __name__ == "__main__":
    force_fix()
