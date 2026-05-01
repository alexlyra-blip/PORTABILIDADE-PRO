from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter()

# Input model expanded for comparison
class PropostaInput(BaseModel):
    client_name: str
    banco: str
    taxa_juros: float
    valor_liberado: float
    parcela_nova: float
    prazo: int
    # Comparison data
    original_banco: str
    original_parcela: float
    original_taxa: float
    original_prazo_restante: int
    original_saldo: float
    # User info
    user_name: str
    user_avatar: str = None

def draw_watermark(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica-Bold', 60)
    canvas.setStrokeColor(colors.lightgrey)
    canvas.setFillAlpha(0.08) # Slightly more subtle
    
    # Center rotation
    canvas.translate(A4[0]/2, A4[1]/2)
    canvas.rotate(45)
    canvas.drawCentredString(0, 0, "Portabilidade PRO")
    canvas.restoreState()

@router.post("/generate-proposal")
async def generate_proposal(data: PropostaInput):
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            rightMargin=2*cm, 
            leftMargin=2*cm, 
            topMargin=1.5*cm, 
            bottomMargin=1.5*cm
        )
        
        styles = getSampleStyleSheet()
        elements = []
        
        # 1. Custom Styles
        title_style = ParagraphStyle(
            'HeaderTitle', parent=styles['Heading1'], fontSize=18, 
            textColor=colors.HexColor('#0f172a'), alignment=1, spaceAfter=20
        )
        subtitle_style = ParagraphStyle(
            'SubHeader', parent=styles['Heading2'], fontSize=12, 
            textColor=colors.HexColor('#3b82f6'), alignment=0, spaceBefore=10, spaceAfter=10
        )
        normal_style = styles["Normal"]
        
        # 2. HEADER: User Data & Logo (Enhanced Visibility)
        avatar_path = None
        if data.user_avatar:
            # Handle different path formats
            img_filename = data.user_avatar.split('/')[-1]
            # Try multiple common locations
            possible_paths = [
                os.path.join("uploads", "logos", img_filename),
                os.path.join("uploads", "avatars", img_filename),
                os.path.join("static", "uploads", "logos", img_filename)
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    avatar_path = p
                    break

        user_info = f"<b>{data.user_name}</b><br/><font size=9 color='#64748b'>Especialista em Crédito Consignado</font>"
        
        if avatar_path:
            # Bigger, prominent logo (2.5cm)
            img = Image(avatar_path, 2.5*cm, 2.5*cm)
            header_table = Table([[img, Paragraph(user_info, styles['Normal'])]], colWidths=[3*cm, 14*cm])
        else:
            # Fallback with stylized placeholder
            header_table = Table([[Paragraph("<font size=20>👤</font>", styles['Heading1']), Paragraph(user_info, styles['Normal'])]], colWidths=[3*cm, 14*cm])

        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), 
            ('LEFTPADDING', (1,0), (1,0), 20),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10)
        ]))
        
        elements.append(header_table)
        # Separator line with blue accent
        elements.append(Table([[None]], colWidths=[17.5*cm], rowHeights=[2], style=[('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#3b82f6'))]))
        elements.append(Spacer(1, 1.2*cm))

        # 3. TITLE & INTRO
        elements.append(Paragraph("PROPOSTA DE PORTABILIDADE", title_style))
        intro = f"Olá, <b>{data.client_name}</b>. Analisamos o seu perfil e encontramos uma oportunidade de otimização financeira para o seu contrato atual."
        elements.append(Paragraph(intro, normal_style))
        elements.append(Spacer(1, 1*cm))

        # 4. COMPARISON TABLE (All wrapped in Paragraph for automatic word wrapping)
        comp_data = [
            [Paragraph("<b>ITEM PARA COMPARAÇÃO</b>", styles['Normal']), 
             Paragraph("<b>CONTRATO ATUAL</b>", styles['Normal']), 
             Paragraph("<b>NOVA PROPOSTA (96x)</b>", styles['Normal'])],
            
            [Paragraph("Instituição Financeira", styles['Normal']), 
             Paragraph(data.original_banco, styles['Normal']), 
             Paragraph(data.banco, styles['Normal'])],
            
            [Paragraph("Taxa de Juros Mensal", styles['Normal']), 
             Paragraph(f"{data.original_taxa:.2f}% a.m.", styles['Normal']), 
             Paragraph(f"{data.taxa_juros:.3f}% a.m.", styles['Normal'])],
            
            [Paragraph("Valor da Parcela", styles['Normal']), 
             Paragraph(f"R$ {data.original_parcela:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), styles['Normal']), 
             Paragraph(f"R$ {data.parcela_nova:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), styles['Normal'])],
            
            [Paragraph("Saldo Devedor / Liberado", styles['Normal']), 
             Paragraph(f"R$ {data.original_saldo:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), styles['Normal']), 
             Paragraph(f"💸 R$ {data.valor_liberado:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), styles['Normal'])],
            
            [Paragraph("Prazo Restante Contrato Atual", styles['Normal']), 
             Paragraph(f"{data.original_prazo_restante} Meses", styles['Normal']), 
             Paragraph(f"{data.prazo} Meses", styles['Normal'])]
        ]

        # Column Widths optimized for wrapping
        t = Table(comp_data, colWidths=[5*cm, 6*cm, 6*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (2,1), (2,-1), colors.HexColor('#eff6ff')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#475569')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINEBEFORE', (2,0), (2,-1), 1.5, colors.HexColor('#3b82f6')),
            ('LINEAFTER', (2,0), (2,-1), 1.5, colors.HexColor('#3b82f6')),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 2*cm))

        # 5. TROCO BANNER (Ajustado para evitar sobreposição)
        banner_style_label = ParagraphStyle('BannerLabel', alignment=1, fontSize=10, textColor=colors.grey, leading=14)
        banner_style_value = ParagraphStyle('BannerValue', alignment=1, fontSize=30, textColor=colors.HexColor('#10b981'), fontName='Helvetica-Bold', leading=36)
        
        elements.append(Paragraph("VALOR TOTAL ESTIMADO QUE VOCÊ RECEBE DE VOLTA:", banner_style_label))
        elements.append(Spacer(1, 0.4*cm)) # Espaçamento garantido
        
        valor_formatado = f"R$ {data.valor_liberado:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        elements.append(Paragraph(valor_formatado, banner_style_value))
        elements.append(Spacer(1, 2.5*cm))

        # 6. FOOTER
        elements.append(Paragraph("TERMOS E CONVENÇÕES", subtitle_style))
        terms = [
            "1. Os valores aqui apresentados são aproximados e dependem da confirmação do saldo devedor exato.",
            "2. O prazo da nova proposta é fixado em 96 meses para maximizar o troco liberado.",
            "3. O troco será depositado em sua conta após a averbação bem-sucedida.",
            f"Relatório gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ]
        for term in terms:
            elements.append(Paragraph(term, ParagraphStyle('Term', fontSize=7, textColor=colors.grey, leftIndent=10)))
            elements.append(Spacer(1, 2))

        doc.build(elements, onFirstPage=draw_watermark, onLaterPages=draw_watermark)
        buffer.seek(0)
        filename = f"proposta_{data.client_name.replace(' ', '_')}.pdf"
        
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar o PDF: {str(e)}")
