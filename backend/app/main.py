from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sqlite3
from app.routers import auth, banks, users, admin, pdf, simulacao

# Database Migration Hack (Safe for Windows env)
def migrate():
    db_path = './local_db.sqlite'
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            try: conn.execute("ALTER TABLE bank_rules ADD COLUMN accepts_loas BOOLEAN DEFAULT 1")
            except: pass
            try: conn.execute("ALTER TABLE bank_tables ADD COLUMN min_port_rate FLOAT DEFAULT 0.0")
            except: pass
            try: conn.execute("ALTER TABLE bank_rules ADD COLUMN excluded_origin_banks TEXT")
            except: pass
            try: conn.execute("ALTER TABLE bank_rules ADD COLUMN origin_banks_min_paid TEXT")
            except: pass
            try: conn.execute("ALTER TABLE bank_rules ADD COLUMN excluded_benefit_types TEXT")
            except: pass
            try: conn.execute("ALTER TABLE users ADD COLUMN phone TEXT")
            except: pass
            conn.execute("UPDATE bank_rules SET accepts_loas = 1 WHERE accepts_loas IS NULL")

            conn.execute("UPDATE bank_rules SET accepts_disability = 1 WHERE accepts_disability IS NULL OR accepts_disability = 0")

            
            try: conn.execute("""
                CREATE TABLE IF NOT EXISTS announcements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    message TEXT NOT NULL,
                    active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            except: pass
            
            # Diagnostic for C6
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM banks WHERE name LIKE '%C6%'")
            b_c6 = cursor.fetchone()
            if b_c6:
                print(f"DIAGNOSTIC: C6 ID is {b_c6[0]}")
                cursor.execute("SELECT id, name, taxa_convenio, refin_adjustment FROM bank_tables WHERE bank_id = ?", (b_c6[0],))
                tabs = cursor.fetchall()
                for t in tabs:
                    print(f" - Table {t[1]} (ID {t[0]}): Conv {t[2]}, Adj {t[3]}")
                    cursor.execute("SELECT term, interest_rate FROM coefficients WHERE table_id = ?", (t[0],))
                    coeffs = cursor.fetchall()
                    for c in coeffs: print(f"   * Term {c[0]}: Rate {c[1]}")
            
            conn.commit()
            conn.close()
        except Exception as e:
            if "duplicate" in str(e).lower(): pass
            else: print(f"MIGRATION ERROR: {e}")

migrate()

app = FastAPI(
    title="Portabilidade Platform API",
    description="Motor Python de Cálculos Financeiros e CRM",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files for Logos
os.makedirs("uploads/logos", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(banks.router, prefix="/api/banks", tags=["Banks"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(pdf.router, prefix="/api/pdf", tags=["Proposals"])
app.include_router(simulacao.router, prefix="/api", tags=["Simulation"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Motor de Simulação Online"}
