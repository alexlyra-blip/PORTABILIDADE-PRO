import os
import psycopg2

db_url = "postgresql://postgres.dnuftfvuzggwyidghfgk:alexandrelyra2013@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

print("Conectando para limpar locks...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cursor = conn.cursor()

cursor.execute("""
    SELECT pid, state, query 
    FROM pg_stat_activity 
    WHERE state = 'idle in transaction' OR wait_event_type = 'Lock';
""")
rows = cursor.fetchall()
print(f"Encontrados {len(rows)} processos travados/ociosos.")

for row in rows:
    pid = row[0]
    print(f"Matando PID {pid} (Query: {row[2][:50]}...)")
    cursor.execute(f"SELECT pg_terminate_backend({pid});")

print("Limpeza concluída.")
cursor.close()
conn.close()
