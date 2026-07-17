import asyncio
from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models.sqlalchemy_models import SubAgreementLogo, Bank

async def main():
    async with AsyncSessionLocal() as session:
        # Fetch all sub agreement logos
        result = await session.execute(select(SubAgreementLogo))
        logos = result.scalars().all()
        print(f"Checking {len(logos)} sub logos...")
        
        updated_logos = 0
        for l in logos:
            if '' in l.name or '?' in l.name:
                old_name = l.name
                new_name = l.name.replace('', 'Ú').replace('?', 'Ú')
                # Special cases if any
                if "OL" in old_name or "OL?" in old_name:
                    new_name = old_name.replace('', 'É').replace('?', 'É')
                elif "PARAN" in old_name or "PARAN?" in old_name:
                    new_name = old_name.replace('', 'Á').replace('?', 'Á')
                
                print(f"Updating SubLogo ID {l.id}: '{old_name}' -> '{new_name}'")
                l.name = new_name
                updated_logos += 1
                
        # Fetch all banks
        result = await session.execute(select(Bank))
        banks = result.scalars().all()
        print(f"Checking {len(banks)} banks...")
        
        updated_banks = 0
        for b in banks:
            if b.name and ('' in b.name or '?' in b.name):
                old_name = b.name
                new_name = b.name.replace('', 'Ú').replace('?', 'Ú')
                if "OL" in old_name or "OL?" in old_name:
                    new_name = old_name.replace('', 'É').replace('?', 'É')
                elif "PARAN" in old_name or "PARAN?" in old_name:
                    new_name = old_name.replace('', 'Á').replace('?', 'Á')
                
                print(f"Updating Bank ID {b.id}: '{old_name}' -> '{new_name}'")
                b.name = new_name
                updated_banks += 1
                
        if updated_logos > 0 or updated_banks > 0:
            await session.commit()
            print(f"Committed changes: {updated_logos} logos updated, {updated_banks} banks updated.")
        else:
            print("No corrupted names found.")

if __name__ == "__main__":
    asyncio.run(main())
