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
