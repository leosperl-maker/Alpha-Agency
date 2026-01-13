"""
Invoices routes - CRUD, Status, Payments, PDF generation
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone, timedelta
from io import BytesIO

from .database import db, get_current_user, COMPANY_INFO, logger

router = APIRouter(prefix="/invoices", tags=["Invoices"])


# ==================== MODELS ====================

class QuoteItemCreate(BaseModel):
    title: Optional[str] = ""  # Titre du service
    description: str
    quantity: int = 1
    unit_price: float
    discount: Optional[float] = 0  # Remise sur la ligne
    discountType: Optional[str] = "%"  # % ou €

class InvoiceCreate(BaseModel):
    quote_id: Optional[str] = None
    contact_id: str
    items: List[QuoteItemCreate]
    due_date: Optional[str] = None
    payment_terms: Optional[str] = "30"
    notes: Optional[str] = None
    conditions: Optional[str] = None
    bank_details: Optional[str] = None
    document_type: Optional[str] = "facture"  # facture or devis
    globalDiscount: Optional[float] = 0
    globalDiscountType: Optional[str] = "%"

class InvoiceUpdate(BaseModel):
    contact_id: Optional[str] = None
    items: Optional[List[QuoteItemCreate]] = None
    due_date: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    conditions: Optional[str] = None
    bank_details: Optional[str] = None
    document_type: Optional[str] = None
    globalDiscount: Optional[float] = None
    globalDiscountType: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str

class PaymentCreate(BaseModel):
    amount: float
    payment_date: str
    payment_method: Optional[str] = "virement"  # virement, chèque, carte, espèces
    notes: Optional[str] = None


# ==================== HELPERS ====================

async def get_next_invoice_number(doc_type: str = "facture"):
    """Generate next invoice/quote number"""
    prefix = "DEV" if doc_type == "devis" else "FAC"
    counter_name = f"{prefix.lower()}_number"
    
    counter = await db.counters.find_one_and_update(
        {"name": counter_name},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True
    )
    return f"{prefix}-{datetime.now().year}-{str(counter['value']).zfill(4)}"


def calculate_invoice_totals(items: list, global_discount: float = 0, global_discount_type: str = "%"):
    """Calculate subtotal, discounts, TVA and total for invoice items"""
    subtotal = 0
    for item in items:
        qty = item.get('quantity', 1) if isinstance(item, dict) else item.quantity
        price = item.get('unit_price', 0) if isinstance(item, dict) else item.unit_price
        discount = item.get('discount', 0) if isinstance(item, dict) else getattr(item, 'discount', 0)
        discount_type = item.get('discountType', '%') if isinstance(item, dict) else getattr(item, 'discountType', '%')
        
        line_total = qty * price
        if discount:
            if discount_type == '%':
                line_total -= line_total * (discount / 100)
            else:  # €
                line_total -= discount
        subtotal += line_total
    
    # Apply global discount
    if global_discount:
        if global_discount_type == '%':
            subtotal -= subtotal * (global_discount / 100)
        else:  # €
            subtotal -= global_discount
    
    tva = subtotal * 0.085  # 8.5% TVA Guadeloupe
    total = subtotal + tva
    
    return subtotal, tva, total


# ==================== PDF GENERATION ====================

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import urllib.request

def fetch_logo_image():
    """Fetch, resize and cache the logo image for PDF generation"""
    try:
        from PIL import Image as PILImage
        import io
        
        logo_path = "/tmp/alpha_logo.png"
        resized_path = "/tmp/alpha_logo_resized.png"
        
        # Download image
        urllib.request.urlretrieve(COMPANY_INFO['logo_url'], logo_path)
        
        # Resize to reasonable dimensions for PDF (max 300x100 pixels)
        with PILImage.open(logo_path) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = PILImage.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            
            # Resize maintaining aspect ratio
            max_width = 300
            max_height = 100
            img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)
            img.save(resized_path, 'PNG', optimize=True)
        
        return resized_path
    except Exception as e:
        logger.error(f"Failed to fetch/resize logo: {e}")
        return None

def generate_professional_pdf(doc_data: dict, contact: dict, doc_type: str = "facture", invoice_settings: dict = None) -> BytesIO:
    """
    Generate professional PDF for invoice or quote matching the Alpha Agency / GHI style.
    NO BLANK PAGES - content flows naturally across pages.
    Uses separate flowables for each item to allow proper page breaks.
    """
    if not invoice_settings:
        invoice_settings = {}
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=2.5*cm
    )
    styles = getSampleStyleSheet()
    elements = []
    
    # Colors - Updated to match preview
    BRAND_RED = colors.HexColor('#CE0202')
    DARK_GRAY = colors.HexColor('#333333')
    LIGHT_GRAY = colors.HexColor('#666666')
    NAVY_BLUE = colors.HexColor('#1a1a2e')  # Dark navy blue for table header
    GREEN_POSITIVE = colors.HexColor('#22c55e')  # Green for TTC
    
    # Get company info from settings or fallback to defaults
    company_name = invoice_settings.get('company_name') or COMPANY_INFO['commercial_name']
    company_address = invoice_settings.get('company_address') or f"{COMPANY_INFO['address']}, {COMPANY_INFO['city']}"
    company_siret = invoice_settings.get('company_siret') or COMPANY_INFO['siret']
    company_vat = invoice_settings.get('company_vat') or COMPANY_INFO['tva_intra']
    company_phone = invoice_settings.get('company_phone') or COMPANY_INFO['phone']
    company_email = invoice_settings.get('company_email') or COMPANY_INFO['email']
    
    # ===== STYLES =====
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=14, textColor=BRAND_RED, alignment=TA_RIGHT, spaceAfter=3)
    info_style = ParagraphStyle('Info', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, alignment=TA_RIGHT, leading=12)
    company_style = ParagraphStyle('Company', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, leading=12)
    client_header = ParagraphStyle('ClientHeader', parent=styles['Normal'], fontSize=9, textColor=BRAND_RED, fontName='Helvetica-Bold')
    client_style = ParagraphStyle('Client', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, leading=12)
    
    # Table styles - Navy blue header
    th_style = ParagraphStyle('TableHeader', fontSize=8, textColor=colors.white, alignment=TA_CENTER, fontName='Helvetica-Bold')
    td_style = ParagraphStyle('TableCell', fontSize=8, textColor=DARK_GRAY, leading=11)
    td_right = ParagraphStyle('TableCellRight', fontSize=8, textColor=DARK_GRAY, alignment=TA_RIGHT, leading=11)
    td_center = ParagraphStyle('TableCellCenter', fontSize=8, textColor=DARK_GRAY, alignment=TA_CENTER, leading=11)
    
    # Item styles
    item_title_style = ParagraphStyle('ItemTitle', fontSize=9, textColor=DARK_GRAY, fontName='Helvetica-Bold', leading=12, spaceBefore=6)
    item_desc_style = ParagraphStyle('ItemDesc', fontSize=8, textColor=DARK_GRAY, leading=11, leftIndent=10)
    item_meta_style = ParagraphStyle('ItemMeta', fontSize=8, textColor=LIGHT_GRAY, leading=10, leftIndent=10)
    
    # Content styles
    section_style = ParagraphStyle('Section', fontSize=9, textColor=DARK_GRAY, leading=12, spaceBefore=6, spaceAfter=3)
    totals_style = ParagraphStyle('Totals', fontSize=9, textColor=DARK_GRAY, alignment=TA_RIGHT)
    totals_bold = ParagraphStyle('TotalsBold', fontSize=10, textColor=BRAND_RED, alignment=TA_RIGHT, fontName='Helvetica-Bold')
    
    # ===== HEADER: Logo + Doc Info =====
    logo_path = fetch_logo_image()
    header_left = []
    if logo_path:
        try:
            header_left.append(Image(logo_path, width=5*cm, height=1.8*cm))
        except:
            header_left.append(Paragraph(f"<b>{company_name}</b>", ParagraphStyle('', fontSize=16, textColor=BRAND_RED)))
    else:
        header_left.append(Paragraph(f"<b>{company_name}</b>", ParagraphStyle('', fontSize=16, textColor=BRAND_RED)))
    
    doc_number = doc_data.get('invoice_number') or doc_data.get('quote_number', '')
    doc_date = doc_data.get('created_at', '')[:10]
    
    if doc_type == "devis":
        doc_title = f"Devis {doc_number}"
        date_label = "En date du"
    else:
        doc_title = f"Facture {doc_number}"
        date_label = "Date"
    
    header_right = [
        Paragraph(f"<b>{doc_title}</b>", title_style),
        Paragraph(f"{date_label}: {doc_date}", info_style),
    ]
    if doc_type == "devis" and doc_data.get('valid_until'):
        header_right.append(Paragraph(f"Validité: {doc_data['valid_until']}", info_style))
    elif doc_type == "facture" and doc_data.get('due_date'):
        header_right.append(Paragraph(f"Échéance: {doc_data['due_date']}", info_style))
    
    header_table = Table([[header_left, header_right]], colWidths=[9*cm, 8*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ===== SENDER & RECIPIENT SIDE BY SIDE =====
    sender_info = [
        Paragraph(f"<b>{company_name}</b>", company_style),
        Paragraph(company_address, company_style),
        Paragraph(f"Tél: {company_phone}", company_style),
        Paragraph(f"Email: {company_email}", company_style),
    ]
    
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    recipient_info = [Paragraph("<b>DESTINATAIRE</b>", client_header)]
    if client_name:
        recipient_info.append(Paragraph(f"<b>{client_name}</b>", client_style))
    if contact.get('company'):
        recipient_info.append(Paragraph(contact['company'], client_style))
    if contact.get('email'):
        recipient_info.append(Paragraph(contact['email'], client_style))
    if contact.get('phone'):
        recipient_info.append(Paragraph(f"Tél: {contact['phone']}", client_style))
    
    addr_table = Table([[sender_info, recipient_info]], colWidths=[8.5*cm, 8.5*cm])
    addr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(addr_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # ===== TABLE APPROACH: Use a frameless design for long descriptions =====
    # For items with very long descriptions, we use a different approach:
    # - Header row as a Table
    # - Each item row: compact info table + description as Paragraph (for natural flow)
    
    col_widths = [9*cm, 1.3*cm, 1.3*cm, 2*cm, 1.2*cm, 2.2*cm]
    
    from reportlab.platypus import LongTable, KeepTogether
    
    # Style pour la cellule Désignation
    designation_style = ParagraphStyle(
        'Designation', 
        fontSize=9, 
        textColor=DARK_GRAY, 
        leading=12,
        wordWrap='LTR'
    )
    
    # Header row only - Dark navy blue
    header_data = [[
        Paragraph("<b>Désignation</b>", th_style),
        Paragraph("<b>Qté</b>", th_style),
        Paragraph("<b>Remise</b>", th_style),
        Paragraph("<b>P.U. HT</b>", th_style),
        Paragraph("<b>TVA</b>", th_style),
        Paragraph("<b>Total HT</b>", th_style),
    ]]
    
    header_table = Table(header_data, colWidths=col_widths)
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_BLUE),  # Dark navy blue header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
    ]))
    elements.append(header_table)
    
    subtotal = 0
    tva_rate = 0.085
    
    # Threshold for long descriptions (> 500 chars means it might overflow a page)
    LONG_DESC_THRESHOLD = 500
    
    # ===== ITEMS =====
    for idx, item in enumerate(doc_data.get('items', [])):
        qty = item.get('quantity', 1)
        unit_price = item.get('unit_price', 0)
        discount = item.get('discount', 0)
        discount_type = item.get('discountType', 'percent')
        
        # Calcul: Total HT = Qté × PU HT - Remise
        line_total = qty * unit_price
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                line_total -= line_total * (discount / 100)
            else:
                line_total -= discount
        
        subtotal += line_total
        
        title = item.get('title', '').strip() or "Service"
        desc = item.get('description', '').strip()
        
        # Format discount
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                discount_str = f"{discount:.0f}%"
            else:
                discount_str = f"{discount:.2f}€"
        else:
            discount_str = "-"
        
        row_bg = colors.white if idx % 2 == 0 else colors.HexColor('#F9F9F9')
        desc_formatted = desc.replace('\n', '<br/>') if desc else ""
        
        # For short descriptions, use standard table row
        if len(desc) <= LONG_DESC_THRESHOLD:
            if desc:
                designation_content = f"<b>{title}</b><br/><font size='8' color='#666666'>{desc_formatted}</font>"
            else:
                designation_content = f"<b>{title}</b>"
            
            designation_para = Paragraph(designation_content, designation_style)
            
            data_row = [[
                designation_para,
                Paragraph(f"{qty:.2f}", td_center),
                Paragraph(discount_str, td_center),
                Paragraph(f"{unit_price:.2f} €", td_right),
                Paragraph("8.5%", td_center),
                Paragraph(f"<b>{line_total:.2f} €</b>", td_right),
            ]]
            
            item_table = Table(data_row, colWidths=col_widths)
            item_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), row_bg),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (0, 0), 'TOP'),
                ('VALIGN', (1, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ]))
            elements.append(item_table)
        else:
            # For long descriptions:
            # 1. Title row with numeric values (compact)
            # 2. Description as a pure flowing Paragraph (can span pages naturally)
            
            # Title row with numeric values
            title_row = [[
                Paragraph(f"<b>{title}</b>", designation_style),
                Paragraph(f"{qty:.2f}", td_center),
                Paragraph(discount_str, td_center),
                Paragraph(f"{unit_price:.2f} €", td_right),
                Paragraph("8.5%", td_center),
                Paragraph(f"<b>{line_total:.2f} €</b>", td_right),
            ]]
            
            title_table = Table(title_row, colWidths=col_widths)
            title_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), row_bg),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
                ('LINEBEFORE', (1, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ]))
            elements.append(title_table)
            
            # Description as a pure flowing paragraph (can span pages naturally)
            desc_para_style = ParagraphStyle(
                'LongDesc', 
                fontSize=8, 
                textColor=LIGHT_GRAY, 
                leading=11,
                leftIndent=12,
                rightIndent=12,
                spaceBefore=4,
                spaceAfter=8,
                backColor=row_bg,
                borderWidth=0.5,
                borderColor=colors.HexColor('#CCCCCC'),
                borderPadding=8,
            )
            
            desc_para = Paragraph(desc_formatted, desc_para_style)
            elements.append(desc_para)
    
    elements.append(Spacer(1, 0.4*cm))
    
    # ===== GLOBAL DISCOUNT =====
    global_discount = doc_data.get('globalDiscount', 0)
    global_discount_type = doc_data.get('globalDiscountType', '%')
    if global_discount:
        if global_discount_type == '%':
            subtotal -= subtotal * (global_discount / 100)
        else:
            subtotal -= global_discount
    
    # ===== TOTALS - with green TTC =====
    tva_total = subtotal * tva_rate
    total_ttc = subtotal + tva_total
    
    # Style for green TTC
    totals_green = ParagraphStyle('TotalsGreen', fontSize=10, textColor=GREEN_POSITIVE, fontName='Helvetica-Bold', alignment=TA_RIGHT)
    
    totals_data = []
    if global_discount:
        if global_discount_type == '%':
            totals_data.append(['', Paragraph(f"Remise globale ({global_discount:.0f}%):", totals_style), Paragraph("appliquée", totals_style)])
        else:
            totals_data.append(['', Paragraph(f"Remise globale ({global_discount:.2f} €):", totals_style), Paragraph("appliquée", totals_style)])
    
    totals_data.extend([
        ['', Paragraph("Total HT:", totals_style), Paragraph(f"<b>{subtotal:.2f} €</b>", totals_style)],
        ['', Paragraph("TVA 8.50%:", totals_style), Paragraph(f"<b>{tva_total:.2f} €</b>", totals_style)],
        ['', Paragraph("<font color='#22c55e'><b>Montant Total de votre<br/>investissement (TTC):</b></font>", totals_green), 
         Paragraph(f"<font color='#22c55e'><b>{total_ttc:.2f} €</b></font>", totals_green)],
    ])
    
    totals_table = Table(totals_data, colWidths=[9*cm, 5*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEABOVE', (1, -1), (-1, -1), 1.5, GREEN_POSITIVE),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ===== CONDITIONS DE RÈGLEMENT & DÉTAILS DE PAIEMENT - Fond gris clair =====
    # (Pas de section "Pour Alpha Agency / Bon pour accord" - directement les conditions)
    
    # Récupérer les données depuis les paramètres
    conditions_text = doc_data.get('conditions') or invoice_settings.get('default_conditions', '')
    bank_details = doc_data.get('bank_details') or invoice_settings.get('bank_details', '')
    
    # Style pour le texte dans les blocs gris
    grey_header_style = ParagraphStyle(
        'GreyHeader', 
        fontSize=10, 
        textColor=colors.HexColor('#333333'), 
        fontName='Helvetica-Bold',
        spaceBefore=0,
        spaceAfter=6
    )
    grey_text_style = ParagraphStyle(
        'GreyText', 
        fontSize=9, 
        textColor=colors.HexColor('#333333'),
        leading=12
    )
    grey_bullet_style = ParagraphStyle(
        'GreyBullet', 
        fontSize=9, 
        textColor=colors.HexColor('#333333'),
        leading=12,
        leftIndent=10,
        bulletIndent=0
    )
    
    # Couleur de fond gris clair
    GREY_BG = colors.HexColor('#F5F5F5')
    
    # === Section Conditions de Règlement ===
    if conditions_text:
        conditions_content = []
        conditions_content.append(Paragraph("<b>Conditions de règlement:</b>", grey_header_style))
        for line in conditions_text.strip().split('\n'):
            if line.strip():
                conditions_content.append(Paragraph(f"• {line.strip()}", grey_bullet_style))
        
        # Créer un tableau avec fond gris pour contenir les conditions
        conditions_table = Table([[conditions_content]], colWidths=[17*cm])
        conditions_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), GREY_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(conditions_table)
        elements.append(Spacer(1, 0.3*cm))
    
    # === Section Détails du Paiement ===
    if bank_details:
        payment_content = []
        payment_content.append(Paragraph("<b>Détails du paiement:</b>", grey_header_style))
        payment_content.append(Paragraph(f"<b>Bénéficiaire:</b> {company_name}", grey_text_style))
        for line in bank_details.strip().split('\n'):
            if line.strip():
                # Formater les lignes IBAN, BIC, etc.
                if ':' in line:
                    payment_content.append(Paragraph(f"<b>{line.split(':')[0]}:</b> {':'.join(line.split(':')[1:])}", grey_text_style))
                else:
                    payment_content.append(Paragraph(line.strip(), grey_text_style))
        
        # Créer un tableau avec fond gris pour contenir les détails de paiement
        payment_table = Table([[payment_content]], colWidths=[17*cm])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), GREY_BG),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(payment_table)
    
    elements.append(Spacer(1, 0.5*cm))
    
    # === Section Bon pour accord (for devis) ===
    if doc_type == "devis":
        accord_style = ParagraphStyle('Accord', fontSize=9, textColor=DARK_GRAY, leading=12)
        accord_content = [
            Paragraph("<b>Bon pour accord &amp; signature :</b>", accord_style),
            Spacer(1, 0.8*cm),
            Paragraph("_" * 50, accord_style),
        ]
        accord_table = Table([[accord_content]], colWidths=[17*cm])
        accord_table.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(accord_table)
    
    elements.append(Spacer(1, 0.3*cm))
    
    # ===== FOOTER on every page =====
    def add_footer(canvas, doc_obj):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#CCCCCC'))
        canvas.line(1.5*cm, 2.2*cm, A4[0] - 1.5*cm, 2.2*cm)
        
        canvas.setFont('Helvetica', 6)
        canvas.setFillColor(colors.HexColor('#666666'))
        
        footer1 = f"{COMPANY_INFO['name']} - {COMPANY_INFO['legal_form']} au capital de {COMPANY_INFO['capital']} €"
        canvas.drawCentredString(A4[0]/2, 1.9*cm, footer1)
        canvas.drawCentredString(A4[0]/2, 1.6*cm, company_address)
        footer3 = f"SIRET: {company_siret} | TVA: {company_vat}"
        canvas.drawCentredString(A4[0]/2, 1.3*cm, footer3)
        footer4 = "En cas de retard de paiement: pénalités au taux légal x3 + 40€ de frais de recouvrement."
        canvas.drawCentredString(A4[0]/2, 1.0*cm, footer4)
        
        # Page number
        canvas.drawRightString(A4[0] - 1.5*cm, 0.7*cm, f"Page {doc_obj.page}")
        
        canvas.restoreState()
    
    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    buffer.seek(0)
    return buffer


# ==================== ROUTES ====================

@router.post("", response_model=dict)
async def create_invoice(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    """Create a new invoice or quote"""
    invoice_id = str(uuid.uuid4())
    doc_type = invoice.document_type or "facture"
    logger.info(f"Creating document with type: {doc_type}")
    logger.info(f"Creating document with type: {doc_type}, raw value: {invoice.document_type}")
    invoice_number = await get_next_invoice_number(doc_type)
    
    items_list = [item.model_dump() for item in invoice.items]
    subtotal, tva, total = calculate_invoice_totals(
        items_list, 
        invoice.globalDiscount or 0, 
        invoice.globalDiscountType or '%'
    )
    
    invoice_doc = {
        "id": invoice_id,
        "invoice_number": invoice_number,
        "quote_id": invoice.quote_id,
        "contact_id": invoice.contact_id,
        "document_type": doc_type,
        "items": items_list,
        "subtotal": subtotal,
        "tva": tva,
        "total": total,
        "globalDiscount": invoice.globalDiscount or 0,
        "globalDiscountType": invoice.globalDiscountType or "%",
        "status": "brouillon",
        "due_date": invoice.due_date or (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "payment_terms": invoice.payment_terms or "30",
        "notes": invoice.notes,
        "conditions": invoice.conditions,
        "bank_details": invoice.bank_details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice_doc)
    
    type_label = "Devis" if doc_type == "devis" else "Facture"
    return {"id": invoice_id, "invoice_number": invoice_number, "message": f"{type_label} créé(e)"}


@router.get("", response_model=List[dict])
async def get_invoices(current_user: dict = Depends(get_current_user), status: Optional[str] = None):
    """Get all invoices"""
    query = {}
    if status:
        query["status"] = status
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices


@router.get("/{invoice_id}", response_model=dict)
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return invoice


@router.put("/{invoice_id}", response_model=dict)
async def update_invoice(invoice_id: str, invoice_update: InvoiceUpdate, current_user: dict = Depends(get_current_user)):
    """Update an invoice"""
    existing = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    update_data = {}
    for key, value in invoice_update.model_dump().items():
        if value is not None:
            if key == 'items':
                update_data['items'] = [item.model_dump() if hasattr(item, 'model_dump') else item for item in value]
            else:
                update_data[key] = value
    
    # Recalculate totals if items changed
    if 'items' in update_data:
        global_discount = update_data.get('globalDiscount', existing.get('globalDiscount', 0))
        global_discount_type = update_data.get('globalDiscountType', existing.get('globalDiscountType', '%'))
        subtotal, tva, total = calculate_invoice_totals(update_data['items'], global_discount, global_discount_type)
        update_data['subtotal'] = subtotal
        update_data['tva'] = tva
        update_data['total'] = total
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    return {"message": "Facture mise à jour"}


@router.delete("/{invoice_id}", response_model=dict)
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an invoice"""
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {"message": "Facture supprimée"}


@router.put("/{invoice_id}/status", response_model=dict)
async def update_invoice_status(invoice_id: str, status_update: StatusUpdate, current_user: dict = Depends(get_current_user)):
    """Update invoice status"""
    status = status_update.status
    valid_statuses = ["brouillon", "en_attente", "envoyée", "envoyee", "payée", "partiellement_payée", "en_retard", "annulée", "annulee"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs possibles: {valid_statuses}")
    
    update_data = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if status == "payée":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {"message": f"Statut mis à jour: {status}"}


@router.get("/{invoice_id}/pdf-token")
async def get_pdf_download_token(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Generate a temporary token for PDF download (for mobile Safari)"""
    import secrets
    
    # Verify invoice exists
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0, "invoice_number": 1})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Generate temporary token (valid for 5 minutes)
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Store token in database
    await db.pdf_tokens.insert_one({
        "token": token,
        "invoice_id": invoice_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "token": token,
        "invoice_number": invoice.get('invoice_number'),
        "expires_in": 300
    }


@router.get("/{invoice_id}/pdf-download/{token}")
async def download_pdf_with_token(invoice_id: str, token: str):
    """Download PDF using temporary token (no auth header needed - for mobile Safari)"""
    # Verify token
    token_doc = await db.pdf_tokens.find_one({"token": token, "invoice_id": invoice_id})
    if not token_doc:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    
    # Check expiration
    expires_at = datetime.fromisoformat(token_doc['expires_at'].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.pdf_tokens.delete_one({"token": token})
        raise HTTPException(status_code=401, detail="Token expiré")
    
    # Check usage count - allow up to 3 uses within expiration time
    use_count = token_doc.get('use_count', 0)
    if use_count >= 3:
        await db.pdf_tokens.delete_one({"token": token})
        raise HTTPException(status_code=401, detail="Token déjà utilisé")
    
    # Increment usage count instead of deleting
    await db.pdf_tokens.update_one(
        {"token": token},
        {"$inc": {"use_count": 1}}
    )
    
    # Get invoice
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    contact = await db.contacts.find_one({"id": invoice['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    # Load invoice settings
    invoice_settings = await db.settings.find_one({"type": "invoice_settings"}, {"_id": 0})
    
    doc_type = invoice.get('document_type', 'facture')
    pdf_buffer = generate_professional_pdf(invoice, contact, doc_type, invoice_settings)
    
    # Get PDF bytes and size
    pdf_buffer.seek(0)
    pdf_bytes = pdf_buffer.read()
    pdf_size = len(pdf_bytes)
    
    # RFC 5987 compliant filename for Safari/iOS
    filename = f"{'devis' if doc_type == 'devis' else 'facture'}_{invoice['invoice_number']}.pdf"
    # URL-encode filename for Content-Disposition
    from urllib.parse import quote
    filename_encoded = quote(filename)
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename_encoded}",
            "Content-Type": "application/pdf",
            "Content-Length": str(pdf_size),
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Content-Type-Options": "nosniff"
        }
    )


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Download invoice as PDF"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    contact = await db.contacts.find_one({"id": invoice['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    # Load invoice settings
    invoice_settings = await db.settings.find_one({"type": "invoice_settings"}, {"_id": 0})
    
    doc_type = invoice.get('document_type', 'facture')
    pdf_buffer = generate_professional_pdf(invoice, contact, doc_type, invoice_settings)
    
    filename = f"{'devis' if doc_type == 'devis' else 'facture'}_{invoice['invoice_number']}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.get("/{invoice_id}/pdf-url")
async def get_invoice_pdf_url(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Generate PDF and upload to Cloudinary, return direct URL (iOS compatible)"""
    import cloudinary
    import cloudinary.uploader
    import os
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    contact = await db.contacts.find_one({"id": invoice['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    # Load invoice settings
    invoice_settings = await db.settings.find_one({"type": "invoice_settings"}, {"_id": 0})
    
    doc_type = invoice.get('document_type', 'facture')
    pdf_buffer = generate_professional_pdf(invoice, contact, doc_type, invoice_settings)
    
    # IMPORTANT: Reset buffer position to beginning
    pdf_buffer.seek(0)
    pdf_data = pdf_buffer.read()
    
    if len(pdf_data) == 0:
        logger.error("PDF buffer is empty!")
        raise HTTPException(status_code=500, detail="Erreur: PDF vide")
    
    logger.info(f"Generated PDF size: {len(pdf_data)} bytes")
    
    # Configure Cloudinary
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
        api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET', '')
    )
    
    filename = f"{'devis' if doc_type == 'devis' else 'facture'}_{invoice['invoice_number']}"
    unique_filename = f"{filename}_{int(datetime.now(timezone.utc).timestamp())}"
    
    try:
        import base64
        # Convert bytes to base64 data URI for upload
        pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
        data_uri = f"data:application/pdf;base64,{pdf_base64}"
        
        # Upload PDF to Cloudinary
        result = cloudinary.uploader.upload(
            data_uri,
            resource_type="raw",
            public_id=f"invoices/{unique_filename}",
            overwrite=True
        )
        
        secure_url = result.get('secure_url', '')
        logger.info(f"Cloudinary upload result: {secure_url}")
        
        return {
            "url": secure_url,
            "filename": f"{filename}.pdf"
        }
    except Exception as e:
        logger.error(f"Error uploading PDF to Cloudinary: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF")


# ==================== PAYMENTS ROUTES ====================

@router.post("/{invoice_id}/payments", response_model=dict)
async def add_payment(invoice_id: str, payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    """Add a payment to an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "invoice_id": invoice_id,
        "amount": payment.amount,
        "payment_date": payment.payment_date,
        "payment_method": payment.payment_method,
        "notes": payment.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing_payments = invoice.get('payments', [])
    existing_payments.append(payment_doc)
    
    total_paid = sum(p['amount'] for p in existing_payments)
    total_due = invoice.get('total', 0)
    remaining = total_due - total_paid
    
    new_status = invoice.get('status', 'en_attente')
    if total_paid >= total_due:
        new_status = "payée"
    elif total_paid > 0:
        new_status = "partiellement_payée"
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "payments": existing_payments,
            "total_paid": total_paid,
            "remaining": remaining,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "payment_id": payment_id,
        "total_paid": total_paid,
        "remaining": remaining,
        "status": new_status,
        "message": "Paiement enregistré"
    }


@router.get("/{invoice_id}/payments", response_model=List[dict])
async def get_invoice_payments(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get all payments for an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return invoice.get('payments', [])


@router.delete("/{invoice_id}/payments/{payment_id}", response_model=dict)
async def delete_payment(invoice_id: str, payment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a payment from an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    payments = invoice.get('payments', [])
    payments = [p for p in payments if p['id'] != payment_id]
    
    total_paid = sum(p['amount'] for p in payments)
    total_due = invoice.get('total', 0)
    remaining = total_due - total_paid
    
    new_status = "en_attente"
    if total_paid >= total_due:
        new_status = "payée"
    elif total_paid > 0:
        new_status = "partiellement_payée"
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "payments": payments,
            "total_paid": total_paid,
            "remaining": remaining,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Paiement supprimé", "status": new_status}



# ==================== EMAIL ====================

class SendEmailRequest(BaseModel):
    recipient_email: str
    document_type: str = "facture"

@router.post("/{invoice_id}/send-email", response_model=dict)
async def send_invoice_email(invoice_id: str, request: SendEmailRequest, current_user: dict = Depends(get_current_user)):
    """Send invoice/quote by email"""
    import os
    import base64
    
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    contact = await db.contacts.find_one({"id": invoice['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": request.recipient_email}
    
    # Load invoice settings
    invoice_settings = await db.settings.find_one({"type": "invoice_settings"}, {"_id": 0})
    if not invoice_settings:
        invoice_settings = {}
    
    # Load email templates
    email_templates = await db.settings.find_one({"type": "email_templates"}, {"_id": 0})
    
    # Generate PDF
    doc_type = request.document_type
    pdf_buffer = generate_professional_pdf(invoice, contact, doc_type, invoice_settings)
    pdf_buffer.seek(0)
    pdf_bytes = pdf_buffer.read()
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    
    # Prepare email - use templates if available
    doc_label = "Devis" if doc_type == "devis" else "Facture"
    doc_number = invoice.get('invoice_number', '')
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip() or "Client"
    
    # Get company info from settings
    company_name = invoice_settings.get('company_name') or COMPANY_INFO['commercial_name']
    company_phone = invoice_settings.get('company_phone') or COMPANY_INFO['phone']
    company_email = invoice_settings.get('company_email') or COMPANY_INFO['email']
    company_address = invoice_settings.get('company_address') or f"{COMPANY_INFO['address']}, {COMPANY_INFO['city']}"
    company_siret = invoice_settings.get('company_siret') or COMPANY_INFO['siret']
    company_vat = invoice_settings.get('company_vat') or COMPANY_INFO['tva_intra']
    
    # Use template if available
    if email_templates and doc_type in email_templates:
        template = email_templates[doc_type]
        subject = template.get('subject', f"{doc_label} {{{{numero}}}} - {{{{company_name}}}}")
        body_template = template.get('body', '')
    else:
        # Default templates
        subject = f"{doc_label} {{{{numero}}}} - {{{{company_name}}}}"
        if doc_type == 'devis':
            body_template = """Bonjour {{client_name}},

Veuillez trouver ci-joint votre devis <strong>{{numero}}</strong> d'un montant de <strong>{{montant}} €</strong>.

Ce devis est valable 30 jours à compter de sa date d'émission. Pour l'accepter, merci de nous retourner une copie signée avec la mention "Bon pour accord".

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
{{company_name}}
{{company_phone}}
{{company_email}}"""
        else:
            body_template = """Bonjour {{client_name}},

Veuillez trouver ci-joint votre facture <strong>{{numero}}</strong> d'un montant de <strong>{{montant}} €</strong>.

Nous vous remercions de bien vouloir procéder au règlement dans les délais convenus.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
{{company_name}}
{{company_phone}}
{{company_email}}"""
    
    # Replace variables
    replacements = {
        '{{numero}}': doc_number,
        '{{client_name}}': client_name,
        '{{montant}}': f"{invoice.get('total', 0):.2f}",
        '{{company_name}}': company_name,
        '{{company_phone}}': company_phone,
        '{{company_email}}': company_email
    }
    
    for var, val in replacements.items():
        subject = subject.replace(var, val)
        body_template = body_template.replace(var, val)
    
    # Convert newlines to HTML and wrap in template
    body_html = body_template.replace('\n', '<br>')
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/tttfxeo1_Logo%20Header.png" alt="{company_name}" style="max-height: 60px;">
            </div>
            
            <div style="white-space: pre-wrap;">{body_html}</div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
                {company_name} - {company_address}<br>
                SIRET: {company_siret} | TVA: {company_vat}
            </p>
        </div>
    </body>
    </html>
    """
    
    # Send via Brevo
    brevo_api_key = os.environ.get('BREVO_API_KEY')
    sender_email = os.environ.get('BREVO_SENDER_EMAIL', company_email)
    
    if not brevo_api_key:
        raise HTTPException(status_code=500, detail="Service email non configuré")
    
    import httpx
    
    filename = f"{'devis' if doc_type == 'devis' else 'facture'}_{doc_number}.pdf"
    
    # Copy recipient for company
    copy_email = "leo.sperl@alphagency.com"
    
    email_data = {
        "sender": {"name": company_name, "email": sender_email},
        "to": [{"email": request.recipient_email, "name": client_name}],
        "bcc": [{"email": copy_email, "name": "Alpha Agency"}],  # Hidden copy
        "subject": subject,
        "htmlContent": html_body,
        "attachment": [{"content": pdf_base64, "name": filename}]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": brevo_api_key,
                "Content-Type": "application/json"
            },
            json=email_data
        )
        
        if response.status_code not in [200, 201]:
            logger.error(f"Brevo error: {response.text}")
            raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")
    
    # Update invoice to mark as sent
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": "envoyée" if invoice.get('status') == 'brouillon' else invoice.get('status'),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "sent_to": request.recipient_email,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Email envoyé à {request.recipient_email} (copie envoyée à {copy_email})", "status": "sent"}
