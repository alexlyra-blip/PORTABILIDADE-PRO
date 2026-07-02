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
    print("🛠️ Iniciando run_db_fix()...")
    import psycopg2
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url: 
            print("⚠️ DATABASE_URL não encontrada no ambiente.")
            return
        
        # Garante o driver correto para o psycopg2
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        
        print(f"🔌 Tentando conectar ao banco para reforma: {db_url.split('@')[-1]}")
        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.autocommit = True
        cursor = conn.cursor()
        print("🔨 Executando DB FIX...")
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
                print(f"⚠️ Erro ao executar: {query} -> {e}")

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ DB FIX ERROR FATAL: {e}")

print("🚀 INICIANDO BACKEND PORTABILIDADE-API...")
try:
    run_db_fix()
except Exception as e:
    print(f"🔥 Erro fatal no run_db_fix: {e}")

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
    # 1. CRIA AS TABELAS AUTOMATICAMENTE SE NÃO EXISTIREM
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Estrutura do banco de dados verificada/criada.")
        
    # Tenta adicionar as colunas novas caso seja um banco antigo (Supabase/Postgres)
    # REMOVIDO: Executar ALTER TABLE no startup trava o banco se houver transações pendentes (Lock Queue).
    # As colunas já foram adicionadas manualmente.
    
    print("✅ Verificação de banco ignorada para evitar locks.")

    # Migração SQLite Local para nova coluna abater_margem_hp12c
    try:
        import sqlite3
        for db_file in ['./local_db.sqlite', './backend/local_db.sqlite']:
            if os.path.exists(db_file):
                conn_sq = sqlite3.connect(db_file)
                try: conn_sq.execute("ALTER TABLE bank_tables ADD COLUMN abater_margem_hp12c BOOLEAN DEFAULT 0")
                except: pass
                try: conn_sq.execute("ALTER TABLE bank_rules ADD COLUMN active BOOLEAN DEFAULT 1")
                except: pass
                try: conn_sq.execute("ALTER TABLE users ADD COLUMN last_access DATETIME")
                except: pass
                try: conn_sq.execute("ALTER TABLE users ADD COLUMN current_token TEXT")
                except: pass
                try: conn_sq.execute("ALTER TABLE bank_rules ADD COLUMN disable_weighted_rate_validation BOOLEAN DEFAULT 0")
                except: pass
                try: conn_sq.execute("ALTER TABLE bank_rules ADD COLUMN disability_max_age INTEGER")
                except: pass
                try: conn_sq.execute("ALTER TABLE bank_rules ADD COLUMN disability_grace_age INTEGER")
                except: pass
                try: conn_sq.execute("ALTER TABLE users ADD COLUMN sidebar_color_secondary VARCHAR(50)")
                except: pass
                try: conn_sq.execute("ALTER TABLE users ADD COLUMN highlight_color VARCHAR(7)")
                except: pass
                try: conn_sq.execute("ALTER TABLE bank_tables ADD COLUMN max_ticket DECIMAL(15, 2)")
                except: pass
                try: conn_sq.execute("ALTER TABLE simulation_results ADD COLUMN term INTEGER")
                except: pass
                try: conn_sq.execute("ALTER TABLE simulation_results ADD COLUMN installment FLOAT")
                except: pass
                try: conn_sq.execute("ALTER TABLE announcements ADD COLUMN image_url TEXT")
                except: pass
                conn_sq.commit()
                conn_sq.close()
                print(f"✅ Colunas SQLite local verificadas/criadas para o banco {db_file}.")
    except Exception as e:
        print(f"SQLite migration log: {e}")

    # 2. DIAGNÓSTICO DE DADOS
    async with AsyncSessionLocal() as session:
        res_banks = await session.execute(select(Bank))
        banks_count = len(res_banks.scalars().all())
        res_users = await session.execute(select(User))
        users_count = len(res_users.scalars().all())
        print(f"📊 Diagnóstico: Encontrados {banks_count} bancos e {users_count} usuários no banco de dados.")

    from app.services.auth_service import get_password_hash

    async with AsyncSessionLocal() as session:
        # Check for alexlyra@gmail.com
        res = await session.execute(select(User).where(User.email == "alexlyra@gmail.com"))
        if not res.scalar():
            admin = User(
                name="Alexandre Lyra",
                email="alexlyra@gmail.com",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin)
            print("LOG: Alexandre admin user created at startup.")
        
        # Check for admin@teste.com
        res = await session.execute(select(User).where(User.email == "admin@teste.com"))
        if not res.scalar():
            admin2 = User(
                name="Admin Teste",
                email="admin@teste.com",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin2)
            print("LOG: Default admin user created at startup.")
        
        await session.commit()
        print("✅ Usuários iniciais persistidos com sucesso.")

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

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Motor de Simulação Online"}
