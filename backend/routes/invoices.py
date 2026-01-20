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
    payment_type: Optional[str] = "solde"  # acompte, solde
    acompte_percent: Optional[float] = None  # Pourcentage d'acompte (30, 40, 50, etc.)
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
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
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
    Generate professional PDF for invoice or quote.
    NOUVELLE CHARTE COULEURS ROUGE PASTEL - VERSION AFFINÉE.
    
    Features:
    - Logo à gauche, titre "DEVIS"/"FACTURE" à droite
    - Coins arrondis sur toutes les sections pastel (simulé)
    - DESTINATAIRE en noir, petit, discret
    - Textes plus fins et petits
    - Dates sur une seule ligne avec labels en rouge foncé
    - Pas de bordure foncée, juste fond pastel
    """
    if not invoice_settings:
        invoice_settings = {}
    
    buffer = BytesIO()
    
    # ===== NOUVELLE CHARTE COULEURS ROUGE PASTEL AFFINÉE =====
    BRAND_RED = colors.HexColor('#CE0202')          # Rouge brand pour titre DEVIS/FACTURE
    DARK_GRAY = colors.HexColor('#333333')          # Texte principal
    LIGHT_GRAY = colors.HexColor('#666666')         # Texte secondaire
    NAVY_BLUE = colors.HexColor('#1a1a2e')          # En-tête du tableau des articles
    GREEN_POSITIVE = colors.HexColor('#22c55e')     # Total TTC
    BORDER_COLOR = colors.HexColor('#CCCCCC')       # Bordures tableau
    
    # COULEUR PASTEL ROSE/ROUGE
    PASTEL_PINK = colors.HexColor('#FFF0F5')        # Fond des encadrés (LavenderBlush)
    DATE_LABEL_RED = colors.HexColor('#B85050')     # Rouge foncé pour labels de dates
    
    # Get company info
    company_name = invoice_settings.get('company_name') or COMPANY_INFO['commercial_name']
    company_address = invoice_settings.get('company_address') or f"{COMPANY_INFO['address']}, {COMPANY_INFO['city']}"
    company_siret = invoice_settings.get('company_siret') or COMPANY_INFO['siret']
    company_vat = invoice_settings.get('company_vat') or COMPANY_INFO['tva_intra']
    company_phone = invoice_settings.get('company_phone') or COMPANY_INFO['phone']
    company_email = invoice_settings.get('company_email') or COMPANY_INFO['email']
    
    # Document info with date formatting
    doc_number = doc_data.get('invoice_number') or doc_data.get('quote_number', '')
    created_at_raw = doc_data.get('created_at', '')
    if created_at_raw:
        doc_date = created_at_raw.split('T')[0] if 'T' in created_at_raw else created_at_raw[:10]
    else:
        from datetime import datetime
        doc_date = datetime.now().strftime('%Y-%m-%d')
    
    # Format date to French format (DD/MM/YYYY)
    try:
        from datetime import datetime
        dt = datetime.strptime(doc_date, '%Y-%m-%d')
        doc_date_formatted = dt.strftime('%d/%m/%Y')
    except:
        doc_date_formatted = doc_date
    
    # Doc title and type
    doc_type_title = "DEVIS" if doc_type == "devis" else "FACTURE"
    
    # Format validity/due date
    valid_until = doc_data.get('valid_until', '')
    due_date_raw = doc_data.get('due_date', '')
    due_date_formatted = ""
    
    if valid_until:
        try:
            if 'T' in valid_until:
                valid_until = valid_until.split('T')[0]
            dt = datetime.strptime(valid_until, '%Y-%m-%d')
            due_date_formatted = dt.strftime('%d/%m/%Y')
        except:
            due_date_formatted = valid_until
    elif due_date_raw:
        try:
            if 'T' in due_date_raw:
                due_date_raw = due_date_raw.split('T')[0]
            dt = datetime.strptime(due_date_raw, '%Y-%m-%d')
            due_date_formatted = dt.strftime('%d/%m/%Y')
        except:
            due_date_formatted = due_date_raw
    
    # Calculate totals
    subtotal = 0
    tva_rate = 0.085
    items_data = []
    
    for item in doc_data.get('items', []):
        qty = item.get('quantity', 1)
        unit_price = item.get('unit_price', 0)
        discount = item.get('discount', 0)
        discount_type = item.get('discountType', 'percent')
        
        line_total = qty * unit_price
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                line_total -= line_total * (discount / 100)
            else:
                line_total -= discount
        
        subtotal += line_total
        
        title = item.get('title', '').strip() or "Service"
        desc = item.get('description', '').strip()
        
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                discount_str = f"{discount:.0f}%"
            else:
                discount_str = f"{discount:.2f}€"
        else:
            discount_str = "-"
        
        items_data.append({
            'title': title,
            'description': desc,
            'qty': qty,
            'unit_price': unit_price,
            'discount_str': discount_str,
            'total': line_total
        })
    
    # Apply global discount
    global_discount = doc_data.get('globalDiscount', 0)
    global_discount_type = doc_data.get('globalDiscountType', '%')
    if global_discount:
        if global_discount_type == '%':
            subtotal -= subtotal * (global_discount / 100)
        else:
            subtotal -= global_discount
    
    tva_total = subtotal * tva_rate
    total_ttc = subtotal + tva_total
    
    # Create document
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
    
    # ===== STYLES AFFINÉS =====
    # Titre DEVIS/FACTURE - plus grand, à droite
    big_title_style = ParagraphStyle('BigTitle', fontSize=32, textColor=BRAND_RED, fontName='Helvetica-Bold', leading=36, alignment=TA_RIGHT)
    
    # Numéro de document - discret
    doc_number_style = ParagraphStyle('DocNumber', fontSize=9, textColor=LIGHT_GRAY, leading=11, alignment=TA_RIGHT)
    
    # Styles pour les encadrés - PLUS FINS
    company_name_style = ParagraphStyle('CompanyName', fontSize=9, textColor=DARK_GRAY, fontName='Helvetica-Bold', leading=11)
    company_style = ParagraphStyle('Company', fontSize=8, textColor=LIGHT_GRAY, leading=10)
    
    # DESTINATAIRE - petit, noir, discret (pas en rouge, pas gras)
    client_header = ParagraphStyle('ClientHeader', fontSize=8, textColor=DARK_GRAY, fontName='Helvetica', leading=10)
    client_name_style = ParagraphStyle('ClientName', fontSize=9, textColor=DARK_GRAY, fontName='Helvetica-Bold', leading=11)
    client_style = ParagraphStyle('Client', fontSize=8, textColor=LIGHT_GRAY, leading=10)
    
    # Date inline style - labels en rouge foncé
    date_inline_style = ParagraphStyle('DateInline', fontSize=8, textColor=DATE_LABEL_RED, leading=10)
    
    # Table header style
    th_centered = ParagraphStyle('TableHeaderCentered', fontSize=8, textColor=colors.white, alignment=TA_CENTER, fontName='Helvetica-Bold')
    
    # Cell styles
    td_center = ParagraphStyle('TDCenter', fontSize=9, textColor=DARK_GRAY, alignment=TA_CENTER)
    td_right = ParagraphStyle('TDRight', fontSize=9, textColor=DARK_GRAY, alignment=TA_RIGHT)
    
    # Totals styles
    totals_style = ParagraphStyle('Totals', fontSize=9, textColor=DARK_GRAY, alignment=TA_RIGHT)
    totals_green = ParagraphStyle('TotalsGreen', fontSize=10, textColor=GREEN_POSITIVE, fontName='Helvetica-Bold', alignment=TA_RIGHT)
    
    # Pastel box styles
    pastel_header_style = ParagraphStyle('PastelHeader', fontSize=9, textColor=DARK_GRAY, fontName='Helvetica-Bold', spaceAfter=4)
    pastel_text_style = ParagraphStyle('PastelText', fontSize=8, textColor=DARK_GRAY, leading=10)
    pastel_bullet_style = ParagraphStyle('PastelBullet', fontSize=8, textColor=DARK_GRAY, leading=10, leftIndent=10)
    
    # ===== HEADER: LOGO À GAUCHE + TITRE À DROITE =====
    logo_path = fetch_logo_image()
    
    # Logo à gauche (plus grand)
    logo_left = []
    if logo_path:
        try:
            logo_left.append(Image(logo_path, width=5*cm, height=1.75*cm))
        except:
            logo_left.append(Paragraph(f"<b>{company_name}</b>", ParagraphStyle('', fontSize=14, textColor=BRAND_RED)))
    else:
        logo_left.append(Paragraph(f"<b>{company_name}</b>", ParagraphStyle('', fontSize=14, textColor=BRAND_RED)))
    
    # Titre + numéro à droite
    title_right = [
        Paragraph(f"<b>{doc_type_title}</b>", big_title_style),
        Paragraph(f"N° {doc_number}", doc_number_style),
    ]
    
    header_row1 = Table([[logo_left, title_right]], colWidths=[10*cm, 7*cm])
    header_row1.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_row1)
    elements.append(Spacer(1, 0.4*cm))
    
    # ===== ENCADRÉS AGENCE + DESTINATAIRE (coins arrondis simulés, pas de bordure foncée) =====
    
    # Encadré agence (gauche) - textes plus fins
    sender_content = [
        Paragraph(f"<b>{company_name}</b>", company_name_style),
        Paragraph(company_address, company_style),
        Paragraph(f"Tél: {company_phone}", company_style),
        Paragraph(company_email, company_style),
        Spacer(1, 0.1*cm),
        Paragraph(f"SIRET: {company_siret}", company_style),
        Paragraph(f"TVA: {company_vat}", company_style),
    ]
    
    sender_table = Table([[sender_content]], colWidths=[8*cm])
    sender_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PASTEL_PINK),
        # Pas de bordure foncée - juste fond pastel
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    # Encadré destinataire (droite) - DESTINATAIRE en noir, petit, discret
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    recipient_content = [Paragraph("DESTINATAIRE", client_header)]  # Petit, noir, pas gras
    if client_name:
        recipient_content.append(Paragraph(f"<b>{client_name}</b>", client_name_style))
    if contact.get('company'):
        recipient_content.append(Paragraph(contact['company'], client_style))
    if contact.get('email'):
        recipient_content.append(Paragraph(contact['email'], client_style))
    if contact.get('phone'):
        recipient_content.append(Paragraph(f"Tél: {contact['phone']}", client_style))
    
    recipient_table = Table([[recipient_content]], colWidths=[8*cm])
    recipient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PASTEL_PINK),
        # Pas de bordure foncée
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    # Combiner les deux encadrés côte à côte
    address_row = Table([[sender_table, recipient_table]], colWidths=[8.5*cm, 8.5*cm])
    address_row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(address_row)
    elements.append(Spacer(1, 0.3*cm))
    
    # ===== DEUX PASTILLES DE DATES - ALIGNÉES AVEC LA COLONNE DÉSIGNATION =====
    echeance_label = "Échéance :" if doc_type == "facture" else "Validité :"
    
    # Style pour les pastilles - tout sur une ligne
    date_pill_style = ParagraphStyle('DatePill', fontSize=8, textColor=DARK_GRAY, leading=10)
    
    # Pastille 1: Date d'émission - ÉLARGIE pour tenir sur une seule ligne
    emission_table = Table([[Paragraph(f"<b>Date d'émission :</b> {doc_date_formatted}", date_pill_style)]], colWidths=[4.8*cm])
    emission_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PASTEL_PINK),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    # Pastille 2: Validité/Échéance
    echeance_table = Table([[Paragraph(f"<b>{echeance_label}</b> {due_date_formatted or '-'}", date_pill_style)]], colWidths=[3.5*cm])
    echeance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PASTEL_PINK),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    # Les pastilles doivent être alignées à GAUCHE, au même niveau que le début de la colonne Désignation
    dates_row = Table(
        [[emission_table, Spacer(0.3*cm, 0), echeance_table, '']], 
        colWidths=[4.8*cm, 0.3*cm, 3.5*cm, 7.9*cm]
    )
    dates_row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(dates_row)
    elements.append(Spacer(1, 0.4*cm))
    
    # ===== TABLE HEADER =====
    col_widths = [8.0*cm, 1.2*cm, 1.6*cm, 2.0*cm, 1.3*cm, 2.4*cm]
    
    header_row = [[
        Paragraph("<b>Désignation</b>", th_centered),
        Paragraph("<b>Qté</b>", th_centered),
        Paragraph("<b>Remise</b>", th_centered),
        Paragraph("<b>P.U. HT</b>", th_centered),
        Paragraph("<b>TVA</b>", th_centered),
        Paragraph("<b>Total HT</b>", th_centered),
    ]]
    
    header_table = Table(header_row, colWidths=col_widths)
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))
    elements.append(header_table)
    
    # ===== ITEMS =====
    MAX_CHARS_PER_CHUNK = 1200
    
    from reportlab.platypus import LongTable
    
    table_data = []
    
    for idx, item in enumerate(items_data):
        title = item['title']
        desc = item['description']
        
        # Split long descriptions
        if desc and len(desc) > MAX_CHARS_PER_CHUNK:
            desc_chunks = []
            remaining = desc
            while remaining:
                if len(remaining) <= MAX_CHARS_PER_CHUNK:
                    desc_chunks.append(remaining)
                    break
                cut_point = MAX_CHARS_PER_CHUNK
                newline_pos = remaining.rfind('\n', 0, cut_point)
                if newline_pos > cut_point * 0.6:
                    cut_point = newline_pos + 1
                else:
                    period_pos = remaining.rfind('.', 0, cut_point)
                    if period_pos > cut_point * 0.7:
                        cut_point = period_pos + 1
                    else:
                        space_pos = remaining.rfind(' ', 0, cut_point)
                        if space_pos > cut_point * 0.5:
                            cut_point = space_pos + 1
                desc_chunks.append(remaining[:cut_point])
                remaining = remaining[cut_point:]
            
            first_chunk = desc_chunks[0].replace('\n', '<br/>')
            designation_content = f"<b>{title}</b><br/><font size='8' color='#666666'>{first_chunk}</font>"
            
            table_data.append([
                Paragraph(designation_content, ParagraphStyle('Des', fontSize=9, textColor=DARK_GRAY, leading=12)),
                Paragraph(f"{item['qty']:.2f}", td_center),
                Paragraph(item['discount_str'], td_center),
                Paragraph(f"{item['unit_price']:.2f} €", td_right),
                Paragraph("8.5%", td_center),
                Paragraph(f"<b>{item['total']:.2f} €</b>", td_right),
            ])
            
            for chunk in desc_chunks[1:]:
                chunk_formatted = chunk.replace('\n', '<br/>')
                continuation_content = f"<font size='8' color='#666666'>{chunk_formatted}</font>"
                table_data.append([
                    Paragraph(continuation_content, ParagraphStyle('Des', fontSize=8, textColor=LIGHT_GRAY, leading=11)),
                    Paragraph("", td_center),
                    Paragraph("", td_center),
                    Paragraph("", td_right),
                    Paragraph("", td_center),
                    Paragraph("", td_right),
                ])
        else:
            if desc:
                desc_formatted = desc.replace('\n', '<br/>')
                designation_content = f"<b>{title}</b><br/><font size='8' color='#666666'>{desc_formatted}</font>"
            else:
                designation_content = f"<b>{title}</b>"
            
            table_data.append([
                Paragraph(designation_content, ParagraphStyle('Des', fontSize=9, textColor=DARK_GRAY, leading=12)),
                Paragraph(f"{item['qty']:.2f}", td_center),
                Paragraph(item['discount_str'], td_center),
                Paragraph(f"{item['unit_price']:.2f} €", td_right),
                Paragraph("8.5%", td_center),
                Paragraph(f"<b>{item['total']:.2f} €</b>", td_right),
            ])
    
    # Create items table
    items_table = LongTable(table_data, colWidths=col_widths, repeatRows=0, splitByRow=1)
    items_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (0, -1), 'TOP'),
        ('VALIGN', (1, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.3*cm))
    
    # ===== TOTALS =====
    totals_data = []
    if global_discount:
        if global_discount_type == '%':
            totals_data.append(['', Paragraph(f"Remise globale ({global_discount:.0f}%):", totals_style), Paragraph("appliquée", totals_style)])
        else:
            totals_data.append(['', Paragraph(f"Remise globale ({global_discount:.2f} €):", totals_style), Paragraph("appliquée", totals_style)])
    
    totals_data.extend([
        ['', Paragraph("Total HT:", totals_style), Paragraph(f"<b>{subtotal:.2f} €</b>", totals_style)],
        ['', Paragraph("TVA 8.50%:", totals_style), Paragraph(f"<b>{tva_total:.2f} €</b>", totals_style)],
        ['', Paragraph("<font color='#22c55e'><b>Montant Total de votre investissement (TTC):</b></font>", totals_green), 
         Paragraph(f"<font color='#22c55e'><b>{total_ttc:.2f} €</b></font>", totals_green)],
    ])
    
    totals_table = Table(totals_data, colWidths=[8*cm, 6*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (1, -1), (-1, -1), 1.5, GREEN_POSITIVE),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.3*cm))
    
    # ===== SECTION PAIEMENTS REÇUS =====
    payments = doc_data.get('payments', [])
    total_paid = doc_data.get('total_paid', 0)
    
    if payments and total_paid > 0:
        # Style pour les paiements
        payment_title_style = ParagraphStyle('PaymentTitle', fontSize=10, textColor=DARK_GRAY, fontName='Helvetica-Bold', spaceAfter=4)
        payment_line_style = ParagraphStyle('PaymentLine', fontSize=9, textColor=DARK_GRAY, leading=12)
        payment_total_style = ParagraphStyle('PaymentTotal', fontSize=10, textColor=GREEN_POSITIVE, fontName='Helvetica-Bold')
        
        payment_content = []
        payment_content.append(Paragraph("<b>💳 Paiements reçus :</b>", payment_title_style))
        
        for pmt in payments:
            # Formater la date
            pmt_date = pmt.get('payment_date', '')
            if pmt_date:
                try:
                    dt = datetime.strptime(pmt_date.split('T')[0], '%Y-%m-%d')
                    pmt_date = dt.strftime('%d/%m/%Y')
                except:
                    pass
            
            pmt_amount = pmt.get('amount', 0)
            pmt_method = pmt.get('payment_method', 'virement')
            pmt_type = pmt.get('payment_type', 'solde')
            pmt_percent = pmt.get('acompte_percent')
            
            # Formater le texte selon le type
            if pmt_type == 'acompte' and pmt_percent:
                pmt_text = f"• <b>Acompte de {pmt_amount:.2f} € ({pmt_percent}%)</b> reçu le {pmt_date} ({pmt_method})"
            else:
                pmt_text = f"• Paiement de <b>{pmt_amount:.2f} €</b> reçu le {pmt_date} ({pmt_method})"
            
            payment_content.append(Paragraph(pmt_text, payment_line_style))
        
        # Afficher le solde restant
        remaining = max(0, total_ttc - total_paid)
        if remaining > 0:
            payment_content.append(Spacer(1, 0.2*cm))
            payment_content.append(Paragraph(f"<b>Reste à payer : {remaining:.2f} €</b>", payment_line_style))
        else:
            payment_content.append(Spacer(1, 0.2*cm))
            payment_content.append(Paragraph(f"<font color='#22c55e'><b>✓ FACTURE SOLDÉE</b></font>", payment_total_style))
        
        # Créer la table avec fond pastel
        payments_table = Table([[payment_content]], colWidths=[17*cm])
        payments_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PASTEL_PINK),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(payments_table)
        elements.append(Spacer(1, 0.3*cm))
    
    elements.append(Spacer(1, 0.1*cm))
    
    # ===== CONDITIONS DE RÈGLEMENT (rouge pastel, pas de bordure) =====
    # TOUJOURS utiliser les conditions des settings de facturation
    conditions_text = invoice_settings.get('default_conditions', '')
    if conditions_text:
        conditions_content = []
        conditions_content.append(Paragraph("<b>Conditions de règlement :</b>", pastel_header_style))
        for line in conditions_text.strip().split('\n'):
            if line.strip():
                conditions_content.append(Paragraph(f"• {line.strip()}", pastel_bullet_style))
        
        conditions_table = Table([[conditions_content]], colWidths=[17*cm])
        conditions_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PASTEL_PINK),
            # Pas de bordure foncée
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(conditions_table)
        elements.append(Spacer(1, 0.2*cm))
    
    # ===== DÉTAILS DU PAIEMENT (rouge pastel, pas de bordure) =====
    # TOUJOURS utiliser les détails bancaires des settings de facturation
    bank_details = invoice_settings.get('bank_details', '')
    if bank_details:
        payment_content = []
        payment_content.append(Paragraph("<b>Détails du paiement :</b>", pastel_header_style))
        payment_content.append(Paragraph(f"<b>Bénéficiaire :</b> {company_name}", pastel_text_style))
        for line in bank_details.strip().split('\n'):
            if line.strip():
                if ':' in line:
                    parts = line.split(':', 1)
                    payment_content.append(Paragraph(f"<b>{parts[0].strip()} :</b> {parts[1].strip()}", pastel_text_style))
                else:
                    payment_content.append(Paragraph(line.strip(), pastel_text_style))
        
        payment_table = Table([[payment_content]], colWidths=[17*cm])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), PASTEL_PINK),
            # Pas de bordure foncée
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(payment_table)
    
    elements.append(Spacer(1, 0.4*cm))
    
    # ===== SIGNATURE =====
    if doc_type == "devis":
        accord_style = ParagraphStyle('Accord', fontSize=9, textColor=DARK_GRAY, leading=12)
        accord_content = [
            Paragraph("<b>Bon pour accord &amp; signature :</b>", accord_style),
            Spacer(1, 0.6*cm),
            Paragraph("_" * 50, accord_style),
        ]
        accord_table = Table([[accord_content]], colWidths=[17*cm])
        accord_table.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(accord_table)
    
    # ===== FOOTER =====
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
    """Add a payment to an invoice (Acompte or Solde)"""
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
        "payment_type": payment.payment_type or "solde",  # acompte ou solde
        "acompte_percent": payment.acompte_percent,  # Pourcentage si acompte
        "notes": payment.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing_payments = invoice.get('payments', [])
    existing_payments.append(payment_doc)
    
    total_paid = sum(p['amount'] for p in existing_payments)
    total_due = invoice.get('total', 0)
    remaining = max(0, total_due - total_paid)
    
    # Déterminer le nouveau statut
    new_status = invoice.get('status', 'en_attente')
    if total_paid >= total_due:
        new_status = "payée"
    elif total_paid > 0:
        # Si c'est un acompte, statut "partiel"
        new_status = "partiel"
    
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
    
    # Déterminer le message selon le type de paiement
    if payment.payment_type == "acompte" and payment.acompte_percent:
        message = f"Acompte de {payment.amount:.2f}€ ({payment.acompte_percent}%) enregistré"
    else:
        message = f"Paiement de {payment.amount:.2f}€ enregistré"
    
    return {
        "payment_id": payment_id,
        "total_paid": total_paid,
        "remaining": remaining,
        "status": new_status,
        "message": message
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
    remaining = max(0, total_due - total_paid)
    
    # Déterminer le nouveau statut
    new_status = "en_attente"
    if total_paid >= total_due:
        new_status = "payée"
    elif total_paid > 0:
        new_status = "partiel"
    
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
