from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import shutil
import os
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.services.admin_service import AdminService
from app.schemas.simulacao_schema import (
    BankCreate, BankResponse, BankWithRulesResponse,
    BankRuleCreate, BankRuleResponse,
    BankTableCreate, BankTableResponse,
    CoefficientCreate, CoefficientResponse,
    UserCreate, UserResponse,
    CompanyCreate, CompanyResponse,
    SimulationResponse,
    SubAgreementLogoCreate, SubAgreementLogoResponse
)
from app.routers.deps import get_admin_user, get_current_user, get_manager_user
from typing import List

router = APIRouter()

# Auto-migration at startup
@router.on_event("startup")
async def ensure_columns_exist():
    from sqlalchemy import text
    from app.models.sqlalchemy_models import Bank
    from sqlalchemy import select, delete
    async for db in get_db():
        try:
            # Apenas garantimos que a coluna de validação exista no PostgreSQL
            from sqlalchemy import text
            is_sqlite = db.bind.dialect.name == "sqlite"
            
            if not is_sqlite:
                await db.execute(text("ALTER TABLE bank_rules ADD COLUMN IF NOT EXISTS disable_weighted_rate_validation BOOLEAN DEFAULT FALSE"))
            
            await db.commit()
            print("🚀 Database migration check completed.")
        except Exception as e:
            print(f"ℹ️ Migration info: {e}")
        break

# Announcements
@router.post("/announcements")
async def create_announcement(data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_announcement(db, data)

@router.get("/announcements/active")
async def get_active_announcement(db: AsyncSession = Depends(get_db)):
    return await AdminService.get_active_announcement(db)

# Banks
@router.get("/banks", response_model=List[BankWithRulesResponse])
async def list_banks(db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    # Vendedores and Promotoras might need to see banks for simulator
    return await AdminService.get_all_banks(db)

@router.post("/banks", response_model=BankResponse)
async def create_bank(bank: BankCreate, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_bank(db, bank)

@router.patch("/banks/{bank_id}", response_model=BankResponse)
async def update_bank(bank_id: int, bank_data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    bank = await AdminService.update_bank(db, bank_id, bank_data)
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
    return bank

@router.delete("/banks/{bank_id}")
async def delete_bank(bank_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    success = await AdminService.delete_bank(db, bank_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bank not found")
    return {"message": "Bank deleted"}

@router.post("/banks/{bank_id}/upload-logo")
async def upload_bank_logo(
    bank_id: int, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db), 
    admin: UserResponse = Depends(get_admin_user)
):
    import base64
    contents = await file.read()
    base64_logo = f"data:{file.content_type};base64,{base64.b64encode(contents).decode()}"
    
    bank = await AdminService.update_bank(db, bank_id, {"logo_url": base64_logo})
    
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")
        
    return {"logo_url": base64_logo}

# Rules
@router.get("/banks/{bank_id}/rules", response_model=List[BankRuleResponse])
async def list_bank_rules(bank_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.get_rules_by_bank(db, bank_id)

@router.post("/banks/{bank_id}/rules", response_model=BankRuleResponse)
async def create_bank_rule(bank_id: int, rule: BankRuleCreate, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    # Ensure the rule is associated with the correct bank
    rule.bank_id = bank_id
    return await AdminService.create_rule(db, rule)

@router.post("/bank-rules", response_model=BankRuleResponse)
async def create_rule(rule: BankRuleCreate, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_rule(db, rule)

@router.patch("/bank-rules/{rule_id}", response_model=BankRuleResponse)
async def update_rule(rule_id: int, rule_data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    rule = await AdminService.update_rule(db, rule_id, rule_data)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@router.delete("/bank-rules/{rule_id}")
async def delete_rule(rule_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    success = await AdminService.delete_rule(db, rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted"}

# Tables
@router.get("/banks/{bank_id}/tables", response_model=List[BankTableResponse])
async def list_bank_tables(bank_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.get_tables_by_bank(db, bank_id)

@router.post("/bank-tables", response_model=BankTableResponse)
async def create_table(table: BankTableCreate, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_table(db, table)

@router.patch("/bank-tables/{table_id}", response_model=BankTableResponse)
async def update_table(table_id: int, table_data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    table = await AdminService.update_table(db, table_id, table_data)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

@router.delete("/bank-tables/{table_id}")
async def delete_table(table_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    success = await AdminService.delete_table(db, table_id)
    if not success:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

# Coefficients
@router.get("/bank-tables/{table_id}/coefficients", response_model=List[CoefficientResponse])
async def list_table_coefficients(table_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.get_coefficients_by_table(db, table_id)

@router.post("/coefficients", response_model=CoefficientResponse)
async def create_coefficient(coeff: CoefficientCreate, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_coefficient(db, coeff)

@router.patch("/coefficients/{coeff_id}", response_model=CoefficientResponse)
async def update_coefficient(coeff_id: int, coeff_data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    coeff = await AdminService.update_coefficient(db, coeff_id, coeff_data)
    if not coeff:
        raise HTTPException(status_code=404, detail="Coefficient not found")
    return coeff

@router.delete("/coefficients/{coeff_id}")
async def delete_coefficient(coeff_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    success = await AdminService.delete_coefficient(db, coeff_id)
    if not success:
        raise HTTPException(status_code=404, detail="Coefficient not found")
    return {"message": "Coefficient deleted"}

# SubAgreementLogos
@router.get("/sub-logos", response_model=List[SubAgreementLogoResponse])
async def list_sub_logos(db: AsyncSession = Depends(get_db)):
    return await AdminService.get_all_sub_logos(db)

@router.post("/sub-logos", response_model=SubAgreementLogoResponse)
async def create_sub_logo(logo_data: SubAgreementLogoCreate, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_sub_logo(db, logo_data)

@router.patch("/sub-logos/{logo_id}", response_model=SubAgreementLogoResponse)
async def update_sub_logo(logo_id: int, logo_data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.update_sub_logo(db, logo_id, logo_data)

@router.delete("/sub-logos/{logo_id}")
async def delete_sub_logo(logo_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    success = await AdminService.delete_sub_logo(db, logo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Logo not found")
    return {"message": "Logo deleted"}

@router.post("/sub-logos/{logo_id}/upload-logo")
async def upload_sub_logo(
    logo_id: int, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db), 
    admin: UserResponse = Depends(get_admin_user)
):
    import base64
    contents = await file.read()
    base64_logo = f"data:{file.content_type};base64,{base64.b64encode(contents).decode()}"
    
    logo = await AdminService.update_sub_logo(db, logo_id, {"logo_url": base64_logo})
    if not logo:
        raise HTTPException(status_code=404, detail="Logo not found")
    return {"logo_url": base64_logo}

# Users
@router.get("/users", response_model=List[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    return await AdminService.get_all_users(db, current_user)

@router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    return await AdminService.create_user(db, user.dict(), current_user)

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: dict, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    user_obj = await AdminService.update_user(db, user_id, user_data, current_user)
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    return user_obj

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    success = await AdminService.delete_user(db, user_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    user_obj = await AdminService.get_user_by_id(db, user_id, current_user)
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    return user_obj

# Configuracoes de Regras e Bancos
@router.get("/users/{user_id}/rules")
async def get_user_rules(user_id: int, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    return await AdminService.get_promotora_rules(db, user_id)

@router.post("/users/{user_id}/rules")
async def set_user_rule(user_id: int, rule_key: str, rule_value: str, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    return await AdminService.set_promotora_rule(db, user_id, rule_key, rule_value, current_user)

@router.get("/users/{user_id}/visible-banks", response_model=List[BankResponse])
async def get_user_visible_banks(user_id: int, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    return await AdminService.get_visible_banks_for_user(db, user_id)

@router.post("/users/{user_id}/visible-banks")
async def set_user_visible_banks(user_id: int, bank_name: str, is_visible: bool, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    return await AdminService.set_bank_visibility(db, user_id, bank_name, is_visible, current_user)

# Companies
@router.get("/companies", response_model=List[CompanyResponse])
async def list_companies(db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.get_all_companies(db)

@router.post("/companies", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_company(db, company)

@router.patch("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: int, company_data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    company = await AdminService.update_company(db, company_id, company_data)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.delete("/companies/{company_id}")
async def delete_company(company_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    success = await AdminService.delete_company(db, company_id)
    if not success:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"message": "Company deleted"}

# Simulations History
@router.get("/simulations", response_model=List[SimulationResponse])
async def list_simulations(db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    return await AdminService.get_all_simulations(db, current_user)

@router.get("/dashboard-stats")
async def get_dashboard_stats(days: int = 30, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    return await AdminService.get_dashboard_stats(db, current_user, days=days)

@router.get("/export-stats-pdf")
async def export_stats_pdf(days: int = 30, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    if current_user.role not in ["admin", "promotora"]:
        raise HTTPException(status_code=403, detail="Não autorizado")
    
    stats = await AdminService.get_dashboard_stats(db, current_user, days)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []
    
    title = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1, fontSize=18, textColor=colors.HexColor('#0f172a'))
    elements.append(Paragraph(f"Relatório de Produtividade - Últimos {days} Dias", title))
    elements.append(Spacer(1, 0.5*cm))
    
    elements.append(Paragraph(f"Gerado por: {current_user.name} ({current_user.role.upper()}) em {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 1*cm))
    
    elements.append(Paragraph("Resumo de Simulações", styles['Heading2']))
    summary_data = [
        ["Bancos Atingidos", "Tabelas Atingidas", "Total de Simulações na Base"],
        [str(stats["totals"]["banks"]), str(stats["totals"]["tables"]), str(stats["totals"]["simulations_period"])]
    ]
    t = Table(summary_data, colWidths=[5*cm, 5*cm, 5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3b82f6')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 1*cm))
    
    elements.append(Paragraph("Ranking de Usuários (Top 5+ Consultores)", styles['Heading2']))
    users_data = [["Posição", "Nome do Consultor", "Simulações / Vendas"]]
    for i, u in enumerate(stats["stats"].get("top_3_users", [])[:10]): 
        users_data.append([f"#{i+1}", u["name"], str(u["count"])])
        
    t_users = Table(users_data, colWidths=[3*cm, 8*cm, 5*cm])
    t_users.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(t_users)
    elements.append(Spacer(1, 1*cm))

    elements.append(Paragraph("Ranking de Bancos e Instituições (Top 5+ Ofertas)", styles['Heading2']))
    banks_data = [["Posição", "Instituição Bancária", "Ofertas Emitidas"]]
    for i, b in enumerate(stats["stats"].get("top_3_banks", [])[:10]): 
        banks_data.append([f"#{i+1}", b["name"], str(b["count"])])
        
    t_banks = Table(banks_data, colWidths=[3*cm, 8*cm, 5*cm])
    t_banks.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(t_banks)

    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=relatorio_vendas_{days}d.pdf"}
    )
