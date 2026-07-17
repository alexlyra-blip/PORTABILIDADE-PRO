
import asyncio
from app.database import SessionLocal
from app.models.sqlalchemy_models import User
from app.services import auth_service
from sqlalchemy.future import select

async def create_local_admin():
    email = "admin@portpro.com.br"
    password = "admin123"
    name = "Administrador Local"
    
    async with SessionLocal() as db:
        # Verifica se já existe
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"\n[!] O usuário {email} já existe. Atualizando senha para 'admin123'...")
            existing.password_hash = auth_service.get_password_hash(password)
            existing.role = "admin"
            existing.active = True
        else:
            print(f"\n[*] Criando novo usuário administrador: {email}")
            new_user = User(
                name=name,
                email=email,
                password_hash=auth_service.get_password_hash(password),
                role="admin",
                active=True,
                is_temporary_password=False
            )
            db.add(new_user)
        
        await db.commit()
        print(f"\n✅ SUCESSO! Você já pode logar no seu simulador local.")
        print(f"📧 Email: {email}")
        print(f"🔑 Senha: {password}\n")

if __name__ == "__main__":
    asyncio.run(create_local_admin())
