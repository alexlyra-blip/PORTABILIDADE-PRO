import sys
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sqlite3
from sqlalchemy import select, text

# Carregar arquivo .env manualmente caso o dotenv não esteja instalado
if os.path.exists(".env"):
    with open(".env", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ[k] = v
elif os.path.exists("../.env"):
    with open("../.env", encoding="utf-8") as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                k, v = line.strip().split("=", 1)
                os.environ[k] = v

from app.database import engine, Base, AsyncSessionLocal
from app.models.sqlalchemy_models import User, Bank

from app.routers import auth, banks, users, admin, pdf, simulacao, chat, contracts, pdf_extractor

# Database Migration Hack (Safe for Windows env)
# Remove old sqlite migrate call
# migrate()

app = FastAPI(
    title="Portabilidade Platform API",
    description="Motor Python de Cálculos Financeiros e CRM",
    version="2.0.0"
)

# REFORMA DE BANCO - FORÇA BRUTA
def run_db_fix():
    print("[DB_FIX] Iniciando run_db_fix()...")
    import psycopg2
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url: 
            print("[WARNING] DATABASE_URL nao encontrada no ambiente.")
            return
        
        # Garante o driver correto para o psycopg2
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        
        print(f"[DB_FIX] Tentando conectar ao banco para reforma: {db_url.split('@')[-1]}")
        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.autocommit = True
        cursor = conn.cursor()
        print("[DB_FIX] Executando DB FIX...")
        queries = [
            'ALTER TABLE "users" ALTER COLUMN "avatar_url" TYPE TEXT;',
            'ALTER TABLE "users" ALTER COLUMN "logo_url" TYPE TEXT;',
            'ALTER TABLE "banks" ALTER COLUMN "logo_url" TYPE TEXT;',
            'ALTER TABLE "sub_agreement_logos" ALTER COLUMN "logo_url" TYPE TEXT;',
            'ALTER TABLE "promotora_rules" ALTER COLUMN "rule_value" TYPE TEXT;',
            'ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "image_url" TEXT;',
            'ALTER TABLE "simulation_results" ADD COLUMN IF NOT EXISTS "term" INTEGER;',
            'ALTER TABLE "simulation_results" ADD COLUMN IF NOT EXISTS "installment" FLOAT;',
            'ALTER TABLE "bank_tables" ADD COLUMN IF NOT EXISTS "max_ticket" NUMERIC(15, 2);',
            'ALTER TABLE "bank_rules" ADD COLUMN IF NOT EXISTS "disability_max_age" INTEGER;',
            'ALTER TABLE "bank_rules" ADD COLUMN IF NOT EXISTS "disability_grace_age" INTEGER;',
            'ALTER TABLE "whatsapp_chat_logs" ADD COLUMN IF NOT EXISTS "context_data" JSONB NOT NULL DEFAULT \'{}\'::jsonb;',
            'ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "produto" VARCHAR(100);',
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_access" TIMESTAMP WITH TIME ZONE;',
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "current_token" TEXT;',
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sidebar_color_secondary" VARCHAR(50);',
            'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "highlight_color" VARCHAR(7);',
            'CREATE INDEX IF NOT EXISTS "ix_contracts_data_aceite" ON "contracts" ("data_aceite");',
            'CREATE INDEX IF NOT EXISTS "ix_contracts_data_hora" ON "contracts" ("data_hora");',
            'CREATE INDEX IF NOT EXISTS "ix_contracts_status" ON "contracts" ("status");',
            'CREATE INDEX IF NOT EXISTS "ix_contracts_user_id" ON "contracts" ("user_id");',
            'CREATE INDEX IF NOT EXISTS "ix_contracts_broker_id" ON "contracts" ("broker_id");',
            'CREATE INDEX IF NOT EXISTS "ix_simulations_created_at" ON "simulations" ("created_at");',
            'CREATE INDEX IF NOT EXISTS "ix_simulations_user_id" ON "simulations" ("user_id");',
            'CREATE INDEX IF NOT EXISTS "ix_simulation_results_sim_id" ON "simulation_results" ("simulation_id");',
            'CREATE INDEX IF NOT EXISTS "ix_simulation_results_bank_id" ON "simulation_results" ("bank_id");'
        ]
        for query in queries:
            try:
                cursor.execute(query)
            except Exception as e:
                print(f"[ERROR] Erro ao executar: {query} -> {e}")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[FATAL] DB FIX ERROR FATAL: {e}")

try:
    print("[SYSTEM] INICIANDO BACKEND PORTABILIDADE-API...")
    # run_db_fix() removed because it blocks indefinitely on ALTER TABLE locks
except Exception as e:
    print(f"[FATAL] Erro fatal na inicializacao: {e}")

@app.middleware("http")
async def catch_exceptions_middleware(request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR: {e}")
        print(traceback.format_exc())
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.on_event("startup")
async def startup_event():
    print("[SYSTEM] API Iniciada sem verificacoes de banco para evitar lentidao no boot.")
    try:
        from app.routers.chat import start_inactivity_check_loop
        start_inactivity_check_loop()
    except Exception as e:
        print(f"[ERROR] Failed to start inactivity check loop: {e}")
    
    # Migracao SQLite Local para nova coluna (mantido pois eh local e nao trava)
    try:
        import sqlite3
        import os
        for db_file in ['./local_db.sqlite', './backend/local_db.sqlite']:
            if os.path.exists(db_file):
                conn_sq = sqlite3.connect(db_file)
                try: conn_sq.execute("ALTER TABLE bank_tables ADD COLUMN abater_margem_hp12c BOOLEAN DEFAULT 0")
                except: pass
                conn_sq.commit()
                conn_sq.close()
    except Exception as e:
        pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files for Logos
os.makedirs("uploads/logos", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from app.routers import auth, banks, users, admin, pdf, simulacao, external, chat

# ... (restante dos imports e lógica)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(banks.router, prefix="/api/banks", tags=["Banks"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(pdf.router, prefix="/api/pdf", tags=["Proposals"])
app.include_router(simulacao.router, prefix="/api", tags=["Simulation"])
app.include_router(external.router, prefix="/api", tags=["External Integration"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(contracts.router, prefix="/api", tags=["Contracts"])
app.include_router(pdf_extractor.router, prefix="/api/pdf-extractor", tags=["Extractor"])
from app.routers import consultas
app.include_router(consultas.router, prefix="/api", tags=["Consultas"])
app.include_router(consultas.internal_router, prefix="/api", tags=["Internal Consultas"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Motor de Simulação Online"}
