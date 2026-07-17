import sqlite3
import os

def run_migrations():
    # Caminho do banco
    db_path = 'local_db.sqlite'
    if not os.path.exists(db_path):
        print(f"Banco {db_path} não encontrado, criando novo.")
        
    conn = sqlite3.connect(db_path)
    
    try:
        cols = [c[1] for c in conn.execute('PRAGMA table_info(users)').fetchall()]
        
        if 'avatar_url' not in cols:
            conn.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT')
            print("Coluna avatar_url adicionada.")
        if 'dark_mode' not in cols:
            conn.execute('ALTER TABLE users ADD COLUMN dark_mode BOOLEAN DEFAULT 0')
            print("Coluna dark_mode adicionada.")
            
        tables = [t[0] for t in conn.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall()]
        
        if 'promotora_rules' not in tables:
            conn.execute('''
                CREATE TABLE promotora_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    promotora_id INTEGER NOT NULL,
                    rule_key VARCHAR(50) NOT NULL,
                    rule_value VARCHAR(255) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(promotora_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            print("Tabela promotora_rules criada.")
            
        if 'user_bank_visibility' not in tables:
            conn.execute('''
                CREATE TABLE user_bank_visibility (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    bank_name VARCHAR(100) NOT NULL,
                    is_visible BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ''')
            print("Tabela user_bank_visibility criada.")

        conn.commit()
        print("Migrações locais SQLite concluídas com sucesso!")
    except Exception as e:
        print(f"Erro ao executar migração manual: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    run_migrations()
