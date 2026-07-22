from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
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
    SubAgreementLogoCreate, SubAgreementLogoResponse,
    RuleCreate, BankVisibilityCreate
)
from app.routers.deps import get_admin_user, get_current_user, get_manager_user
from typing import List
from pydantic import BaseModel
from app.utils.config_helper import get_active_provider, set_active_provider

router = APIRouter()

def compress_logo_to_webp_base64(file_contents: bytes) -> str:
    import io
    import base64
    from PIL import Image
    
    try:
        # Carregar imagem
        img = Image.open(io.BytesIO(file_contents))
        
        # Converter para RGBA para preservar transparência se aplicável
        if img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA')
            
        # Redimensionar para tamanho máximo de 128x128 usando LANCZOS
        img.thumbnail((128, 128), Image.Resampling.LANCZOS)
        
        # Salvar em formato WEBP leve com qualidade 75
        out_buf = io.BytesIO()
        img.save(out_buf, format="WEBP", quality=75)
        webp_bytes = out_buf.getvalue()
        
        return f"data:image/webp;base64,{base64.b64encode(webp_bytes).decode()}"
    except Exception as e:
        print(f"Error compressing image: {e}")
        raise e

# Announcements
@router.post("/announcements")
async def create_announcement(data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.create_announcement(db, data)

@router.get("/announcements/active")
async def get_active_announcement(db: AsyncSession = Depends(get_db)):
    return await AdminService.get_active_announcement(db)

@router.get("/announcements")
async def list_announcements(db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.get_all_announcements(db)

@router.patch("/announcements/{announcement_id}")
async def update_announcement(announcement_id: int, data: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    ann = await AdminService.update_announcement(db, announcement_id, data)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return ann

@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    success = await AdminService.delete_announcement(db, announcement_id)
    if not success:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return {"message": "Announcement deleted"}


# Banks
@router.get("/banks", response_model=List[BankWithRulesResponse])
async def list_banks(db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    # Vendedores and Promotoras might need to see banks for simulator
    banks = await AdminService.get_all_banks(db)
    from app.schemas.simulacao_schema import BankWithRulesResponse
    result = []
    for b in banks:
        b_dict = BankWithRulesResponse.from_orm(b).dict()
        if b_dict.get('logo_url') and b_dict['logo_url'].startswith('data:image'):
            b_dict['logo_url'] = f'/api/admin/banks/{b.id}/image'
        result.append(b_dict)
    return result

@router.get("/banks/{bank_id}/image")
async def get_bank_image(bank_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.future import select
    from app.models.sqlalchemy_models import Bank
    from fastapi import Response, HTTPException
    import base64

    result = await db.execute(select(Bank).where(Bank.id == bank_id))
    bank = result.scalar_one_or_none()
    
    if not bank or not bank.logo_url or not bank.logo_url.startswith("data:image"):
        raise HTTPException(status_code=404, detail="Image not found")
        
    try:
        header, encoded = bank.logo_url.split(",", 1)
        content_type = header.split(":")[1].split(";")[0]
        image_data = base64.b64decode(encoded)
        return Response(content=image_data, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image format")

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
    try:
        base64_logo = compress_logo_to_webp_base64(contents)
    except Exception:
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
async def list_bank_tables(bank_id: int, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
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
@router.get("/banks/{bank_id}/coefficients", response_model=List[CoefficientResponse])
async def list_bank_coefficients(bank_id: int, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    return await AdminService.get_coefficients_by_bank(db, bank_id)

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

# Coefficients
@router.get("/margin-coefficients")
async def get_daily_margin_coefficients(
    year: int,
    month: int,
    convenio: str = "INSS",
    db: AsyncSession = Depends(get_db),
    admin: UserResponse = Depends(get_admin_user),
):
    try:
        return await AdminService.get_daily_margin_coefficients(
            db,
            year,
            month,
            convenio,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.post("/margin-coefficients")
async def save_daily_margin_coefficients(
    data: list = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: UserResponse = Depends(get_admin_user),
):
    try:
        success = await AdminService.save_daily_margin_coefficients(
            db,
            data,
        )
        return {"success": success}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

# SubAgreementLogos
@router.get("/sub-logos", response_model=List[SubAgreementLogoResponse])
async def list_sub_logos(db: AsyncSession = Depends(get_db)):
    logos = await AdminService.get_all_sub_logos(db)
    from app.schemas.simulacao_schema import SubAgreementLogoResponse
    result = []
    for l in logos:
        l_dict = SubAgreementLogoResponse.from_orm(l).dict()
        if l_dict.get('logo_url') and l_dict['logo_url'].startswith('data:image'):
            l_dict['logo_url'] = f'/api/admin/sub-logos/{l.id}/image'
        result.append(l_dict)
    return result

@router.get("/sub-logos/{logo_id}/image")
async def get_sub_logo_image(logo_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.future import select
    from app.models.sqlalchemy_models import SubAgreementLogo
    from fastapi import Response, HTTPException
    import base64

    result = await db.execute(select(SubAgreementLogo).where(SubAgreementLogo.id == logo_id))
    logo = result.scalar_one_or_none()
    
    if not logo or not logo.logo_url or not logo.logo_url.startswith("data:image"):
        raise HTTPException(status_code=404, detail="Image not found")
        
    try:
        header, encoded = logo.logo_url.split(",", 1)
        content_type = header.split(":")[1].split(";")[0]
        image_data = base64.b64decode(encoded)
        return Response(content=image_data, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image format")

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
    try:
        base64_logo = compress_logo_to_webp_base64(contents)
    except Exception:
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
async def get_user_rules(user_id: int, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    return await AdminService.get_promotora_rules(db, user_id)

@router.post("/users/{user_id}/rules")
async def set_user_rule(user_id: int, rule: RuleCreate, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    return await AdminService.set_promotora_rule(db, user_id, rule.rule_key, rule.rule_value, current_user)

@router.get("/users/{user_id}/visible-banks", response_model=List[BankResponse])
async def get_user_visible_banks(user_id: int, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    return await AdminService.get_visible_banks_for_user(db, user_id)

@router.post("/users/{user_id}/visible-banks")
async def set_user_visible_banks(user_id: int, visibility: BankVisibilityCreate, db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_manager_user)):
    return await AdminService.set_bank_visibility(db, user_id, visibility.bank_name, visibility.is_visible, current_user)

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

@router.get("/dashboard-recent")
async def get_dashboard_recent(
    days: int = 30,
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user)
):
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="days deve estar entre 1 e 365")
    if page < 1:
        raise HTTPException(status_code=400, detail="page deve ser maior ou igual a 1")
    if page_size < 5 or page_size > 20:
        raise HTTPException(status_code=400, detail="page_size deve estar entre 5 e 20")

    return await AdminService.get_dashboard_recent(
        db,
        current_user,
        days=days,
        page=page,
        page_size=page_size
    )

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

@router.get("/active-theme")
async def get_active_theme(db: AsyncSession = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    theme = await AdminService.get_active_theme(db)
    return {"theme": theme}

@router.post("/active-theme")
async def set_active_theme(payload: dict, db: AsyncSession = Depends(get_db), admin: UserResponse = Depends(get_admin_user)):
    theme = payload.get("theme", "default")
    if theme not in ["default", "sao_joao", "copa_mundo"]:
        raise HTTPException(status_code=400, detail="Tema inválido")
    updated_theme = await AdminService.set_active_theme(db, admin.id, theme)
    return {"theme": updated_theme}

from app.models.sqlalchemy_models import WhatsappChatLog, User
from datetime import datetime
import json

@router.get("/whatsapp-logs")
async def get_whatsapp_logs(
    db: AsyncSession = Depends(get_db),
    start_date: str = None,
    end_date: str = None,
    protocol: str = None,
    phone: str = None,
    user_id: int = None
):
    query = select(WhatsappChatLog, User).outerjoin(User, WhatsappChatLog.user_id == User.id).order_by(WhatsappChatLog.created_at.desc())
    
    if protocol:
        query = query.where(WhatsappChatLog.protocol.ilike(f"%{protocol}%"))
    if phone:
        query = query.where(WhatsappChatLog.sender_phone.ilike(f"%{phone}%"))
    if user_id:
        query = query.where(WhatsappChatLog.user_id == user_id)
        
    result = await db.execute(query)
    rows = result.all()
    
    def safe_loads(msg_str):
        if not msg_str: return []
        try:
            val = json.loads(msg_str)
            if isinstance(val, str):
                try:
                    val = json.loads(val)
                except:
                    pass
            if isinstance(val, list):
                return val
            return []
        except:
            return []
            
    return [
        {
            "id": log.id,
            "protocol": log.protocol,
            "sender_phone": log.sender_phone,
            "client_name": log.client_name,
            "status": log.status,
            "created_at": log.created_at,
            "updated_at": log.updated_at,
            "user_id": log.user_id,
            "user_name": user.name if user else "Desconhecido",
            "messages": safe_loads(log.messages)
        }
        for log, user in rows
    ]

class CpfConfigInput(BaseModel):
    active_provider: str

@router.get("/cpf-config")
async def get_cpf_config(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return {
        "active_provider": await get_active_provider(db)
    }


@router.post("/cpf-config")
async def save_cpf_config(
    payload: CpfConfigInput,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_admin_user),
):
    try:
        saved_provider = await set_active_provider(
            db,
            payload.active_provider,
        )

        return {
            "success": True,
            "active_provider": saved_provider,
        }
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

