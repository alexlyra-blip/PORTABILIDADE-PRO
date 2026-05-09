
import sqlite3
import os

db_path = r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Simulador de Portabilidade\backend\local_db.sqlite'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get recent simulations current_bank values
cursor.execute("SELECT current_bank, COUNT(*) FROM simulations GROUP BY current_bank ORDER BY COUNT(*) DESC LIMIT 5")
banks = cursor.fetchall()
print(f"Top origin banks in simulations: {banks}")

# Get sub agreement logos
cursor.execute("SELECT name, logo_url FROM sub_agreement_logos")
logos = cursor.fetchall()
print(f"Logos in sub_agreement_logos: {logos}")

conn.close()
