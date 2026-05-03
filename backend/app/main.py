from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sqlite3
from app.routers import auth, banks, users, admin, pdf, simulacao

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
        print("🔨 Executando ALTER COLUMNs...")
        cursor.execute('ALTER TABLE "users" ALTER COLUMN "avatar_url" TYPE TEXT;')
        cursor.execute('ALTER TABLE "users" ALTER COLUMN "logo_url" TYPE TEXT;')
        cursor.execute('ALTER TABLE "banks" ALTER COLUMN "logo_url" TYPE TEXT;')
        cursor.execute('ALTER TABLE "sub_agreement_logos" ALTER COLUMN "logo_url" TYPE TEXT;')
        print("✅ Colunas convertidas para TEXT.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ DB FIX ERROR: {e}")

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
    from app.database import AsyncSessionLocal
    from app.models.sqlalchemy_models import User
    from app.services.auth_service import get_password_hash
    from sqlalchemy import select

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
            
        # Update columns to Text to support Base64
        from sqlalchemy import text
        reformas = [
            'ALTER TABLE "users" ALTER COLUMN "avatar_url" TYPE TEXT',
            'ALTER TABLE "users" ALTER COLUMN "logo_url" TYPE TEXT',
            'ALTER TABLE "banks" ALTER COLUMN "logo_url" TYPE TEXT',
            'ALTER TABLE "sub_agreement_logos" ALTER COLUMN "logo_url" TYPE TEXT'
        ]
        for sql in reformas:
            try: 
                await session.execute(text(sql))
                print(f"SQL SUCCESS: {sql}")
            except Exception as e: 
                print(f"SQL INFO: {sql} -> {e}")
            
        await session.commit()

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

from app.routers import auth, banks, users, admin, pdf, simulacao, external

# ... (restante dos imports e lógica)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(banks.router, prefix="/api/banks", tags=["Banks"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(pdf.router, prefix="/api/pdf", tags=["Proposals"])
app.include_router(simulacao.router, prefix="/api", tags=["Simulation"])
app.include_router(external.router, prefix="/api", tags=["External Integration"])

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Motor de Simulação Online"}
