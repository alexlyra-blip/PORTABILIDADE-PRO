import sqlite3

def upgrade():
    conn = sqlite3.connect('local_db.sqlite')
    c = conn.cursor()
    try:
        c.execute('ALTER TABLE bank_tables ADD COLUMN min_installment NUMERIC(15, 2);')
        c.execute('ALTER TABLE bank_tables ADD COLUMN max_installment NUMERIC(15, 2);')
        c.execute('ALTER TABLE bank_tables ADD COLUMN min_age INTEGER;')
        c.execute('ALTER TABLE bank_tables ADD COLUMN max_age INTEGER;')
        c.execute('ALTER TABLE bank_tables ADD COLUMN term INTEGER;')
    except Exception:
        pass
    
    try:
        c.execute('ALTER TABLE bank_rules ADD COLUMN sub_agreement VARCHAR(50);')
    except Exception:
        pass

    try:
        c.execute('ALTER TABLE bank_tables ADD COLUMN sub_agreement VARCHAR(50);')
    except Exception:
        pass

    try:
        c.execute('ALTER TABLE banks ADD COLUMN priority INTEGER DEFAULT 99;')
    except Exception:
        pass

    try:
        c.execute('ALTER TABLE bank_rules ADD COLUMN excluded_benefit_types TEXT;')
    except Exception:
        pass

    try:
        c.execute('''
            CREATE TABLE IF NOT EXISTS sub_agreement_logos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) UNIQUE,
                logo_url VARCHAR(500)
            );
        ''')
    except Exception:
        pass
        
    try:
        conn.commit()
        print("Banco de dados atualizado com sucesso!")
    except Exception as e:
        print(f"Erro ao atualizar: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade()
