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
    """Generate professional PDF for invoice or quote matching the Alpha Agency design"""
    # Default settings if none provided
    if not invoice_settings:
        invoice_settings = {}
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=1.5*cm, 
        leftMargin=1.5*cm, 
        topMargin=1.5*cm, 
        bottomMargin=3.5*cm  # More space for footer
    )
    styles = getSampleStyleSheet()
    elements = []
    
    # Colors
    BRAND_RED = colors.HexColor('#CE0202')
    DARK_GRAY = colors.HexColor('#333333')
    LIGHT_GRAY = colors.HexColor('#666666')
    
    # Styles
    company_name_style = ParagraphStyle('CompanyName', parent=styles['Heading1'], fontSize=20, textColor=BRAND_RED, spaceAfter=0)
    company_info_style = ParagraphStyle('CompanyInfo', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, leading=12)
    doc_title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=16, textColor=DARK_GRAY, alignment=TA_RIGHT, spaceAfter=5)
    doc_info_style = ParagraphStyle('DocInfo', parent=styles['Normal'], fontSize=10, textColor=DARK_GRAY, alignment=TA_RIGHT, leading=14)
    client_header_style = ParagraphStyle('ClientHeader', parent=styles['Normal'], fontSize=10, textColor=BRAND_RED, spaceAfter=5)
    client_info_style = ParagraphStyle('ClientInfo', parent=styles['Normal'], fontSize=10, textColor=DARK_GRAY, leading=14)
    table_header_style = ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=9, textColor=colors.white, alignment=TA_CENTER)
    table_cell_style = ParagraphStyle('TableCell', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, leading=12)
    table_cell_right_style = ParagraphStyle('TableCellRight', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, alignment=TA_RIGHT)
    totals_style = ParagraphStyle('Totals', parent=styles['Normal'], fontSize=10, textColor=DARK_GRAY, alignment=TA_RIGHT)
    totals_bold_style = ParagraphStyle('TotalsBold', parent=styles['Normal'], fontSize=11, textColor=BRAND_RED, alignment=TA_RIGHT)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=LIGHT_GRAY, alignment=TA_CENTER, leading=10)
    section_style = ParagraphStyle('Section', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, leading=13)
    
    # Header with Logo and Document Info
    logo_path = fetch_logo_image()
    header_left = []
    if logo_path:
        try:
            header_left.append(Image(logo_path, width=6*cm, height=2.2*cm))
        except:
            header_left.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", company_name_style))
    else:
        header_left.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", company_name_style))
    
    doc_number = doc_data.get('invoice_number') or doc_data.get('quote_number', '')
    doc_date = doc_data.get('created_at', '')[:10]
    
    if doc_type == "devis":
        title_text = f"Devis {doc_number}"
        date_label = "En date du"
        validity = doc_data.get('valid_until', '')
        validity_text = f"Validité: {validity}" if validity else ""
    else:
        title_text = f"Facture {doc_number}"
        date_label = "Date"
        due_date = doc_data.get('due_date', '')
        validity_text = f"Échéance: {due_date}" if due_date else ""
    
    header_right = []
    header_right.append(Paragraph(f"<b>{title_text}</b>", doc_title_style))
    header_right.append(Paragraph(f"{date_label}: {doc_date}", doc_info_style))
    if validity_text:
        header_right.append(Paragraph(validity_text, doc_info_style))
    
    header_table_data = [[header_left, header_right]]
    header_table = Table(header_table_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('ALIGN', (1, 0), (1, 0), 'RIGHT')]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # ===== SENDER (left) and RECIPIENT (right) side by side =====
    # Sender info block
    sender_content = []
    sender_content.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", client_info_style))
    sender_content.append(Paragraph(f"{COMPANY_INFO['address']}", company_info_style))
    sender_content.append(Paragraph(f"{COMPANY_INFO['city']}, {COMPANY_INFO['region']}", company_info_style))
    sender_content.append(Spacer(1, 0.15*cm))
    sender_content.append(Paragraph(f"Tél: {COMPANY_INFO['phone']}", company_info_style))
    sender_content.append(Paragraph(f"Email: {COMPANY_INFO['email']}", company_info_style))
    
    # Recipient info block
    recipient_content = []
    recipient_content.append(Paragraph("<b>DESTINATAIRE</b>", client_header_style))
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    if client_name:
        recipient_content.append(Paragraph(f"<b>{client_name}</b>", client_info_style))
    if contact.get('company'):
        recipient_content.append(Paragraph(contact['company'], client_info_style))
    if contact.get('email'):
        recipient_content.append(Paragraph(contact['email'], client_info_style))
    if contact.get('phone'):
        recipient_content.append(Paragraph(contact['phone'], client_info_style))
    
    # Create a two-column table: Sender (left) | Recipient (right)
    address_table_data = [[sender_content, recipient_content]]
    address_table = Table(address_table_data, colWidths=[8.5*cm, 8.5*cm])
    address_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(address_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # Items table
    table_data = [[
        Paragraph("<b>Description</b>", table_header_style),
        Paragraph("<b>Qté</b>", table_header_style),
        Paragraph("<b>PU HT</b>", table_header_style),
        Paragraph("<b>TVA</b>", table_header_style),
        Paragraph("<b>Total HT</b>", table_header_style)
    ]]
    
    subtotal = 0
    tva_rate = 0.085
    
    for item in doc_data.get('items', []):
        qty = item.get('quantity', 1)
        unit_price = item.get('unit_price', 0)
        discount = item.get('discount', 0)
        discount_type = item.get('discountType', 'percent')
        
        line_total = qty * unit_price
        discount_amount = 0
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                discount_amount = line_total * (discount / 100)
                line_total -= discount_amount
            else:  # fixed amount
                discount_amount = discount
                line_total -= discount
        
        subtotal += line_total
        tva_amount = line_total * tva_rate
        
        title = item.get('title', '').strip()
        desc = item.get('description', '').strip()
        
        # Limit very long descriptions to prevent page overflow (max ~1500 chars)
        if len(desc) > 1500:
            desc = desc[:1497] + "..."
        
        # Format description with proper line breaks
        desc = desc.replace('\n', '<br/>')
        
        # Adjust font size based on description length
        desc_font_size = 8 if len(desc) < 500 else 7
        
        if title and desc:
            full_desc = f"<b>{title}</b><br/><font size='{desc_font_size}'>{desc}</font>"
        elif title:
            full_desc = f"<b>{title}</b>"
        else:
            full_desc = f"<font size='{desc_font_size}'>{desc}</font>"
        
        # Format discount correctly
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                full_desc += f"<br/><font size='7' color='#CE0202'>Remise: -{discount}%</font>"
            else:
                full_desc += f"<br/><font size='7' color='#CE0202'>Remise: -{discount:.2f} €</font>"
        
        table_data.append([
            Paragraph(full_desc, table_cell_style),
            Paragraph(str(qty), table_cell_right_style),
            Paragraph(f"{unit_price:.2f} €", table_cell_right_style),
            Paragraph(f"8.5%<br/>({tva_amount:.2f} €)", table_cell_right_style),
            Paragraph(f"{line_total:.2f} €", table_cell_right_style)
        ])
    
    # Apply global discount
    global_discount = doc_data.get('globalDiscount', 0)
    global_discount_type = doc_data.get('globalDiscountType', '%')
    if global_discount:
        if global_discount_type == '%':
            subtotal -= subtotal * (global_discount / 100)
        else:
            subtotal -= global_discount
    
    items_table = Table(table_data, colWidths=[9*cm, 1.2*cm, 2.3*cm, 2.3*cm, 2.2*cm], repeatRows=1, splitByRow=True)
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F8F8')]),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # Totals
    tva_total = subtotal * tva_rate
    total_ttc = subtotal + tva_total
    
    totals_data = [
        ['', '', '', Paragraph("Total net HT:", totals_style), Paragraph(f"<b>{subtotal:.2f} €</b>", totals_style)],
    ]
    if global_discount:
        totals_data.insert(0, ['', '', '', Paragraph(f"Remise globale ({global_discount}{global_discount_type}):", totals_style), Paragraph(f"<b>appliquée</b>", totals_style)])
    
    totals_data.extend([
        ['', '', '', Paragraph("TVA 8.50%:", totals_style), Paragraph(f"<b>{tva_total:.2f} €</b>", totals_style)],
        ['', '', '', Paragraph("<b>TOTAL TTC:</b>", totals_bold_style), Paragraph(f"<b>{total_ttc:.2f} €</b>", totals_bold_style)],
    ])
    
    totals_table = Table(totals_data, colWidths=[8*cm, 1.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEABOVE', (3, -1), (-1, -1), 1, BRAND_RED),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # Conditions for quotes
    if doc_type == "devis":
        elements.append(Spacer(1, 0.5*cm))
        elements.append(Paragraph("<b>Conditions de règlement:</b>", section_style))
        
        # Use custom conditions from settings or document
        conditions_text = doc_data.get('conditions') or invoice_settings.get('default_conditions', '')
        if conditions_text:
            for line in conditions_text.strip().split('\n'):
                if line.strip():
                    elements.append(Paragraph(line.strip(), section_style))
        
        elements.append(Spacer(1, 0.6*cm))
        
        # Signature section
        signature_text = invoice_settings.get('signature_text', "Bon pour accord")
        elements.append(Paragraph(f"<b>{signature_text}</b>", section_style))
        elements.append(Spacer(1, 1.5*cm))
        elements.append(Paragraph("_" * 50, section_style))
    
    # Payment info for invoices
    if doc_type == "facture":
        elements.append(Spacer(1, 0.5*cm))
        
        # Conditions from document or settings
        conditions = doc_data.get('conditions') or invoice_settings.get('default_conditions', '')
        if conditions:
            elements.append(Paragraph("<b>Conditions de paiement:</b>", section_style))
            for line in conditions.split('\n'):
                if line.strip():
                    elements.append(Paragraph(line.strip(), section_style))
            elements.append(Spacer(1, 0.4*cm))
    
    # Bank details section (for both)
    elements.append(Spacer(1, 0.3*cm))
    bank_details = doc_data.get('bank_details') or invoice_settings.get('bank_details', '')
    if bank_details:
        elements.append(Paragraph("<b>Détails du paiement:</b>", section_style))
        elements.append(Paragraph(f"Bénéficiaire: {COMPANY_INFO['commercial_name']}", section_style))
        for line in bank_details.split('\n'):
            if line.strip():
                elements.append(Paragraph(line.strip(), section_style))
    
    # Build document with footer
    def footer_canvas(canvas, doc):
        canvas.saveState()
        # Footer line
        canvas.setStrokeColor(colors.HexColor('#CCCCCC'))
        canvas.line(1.5*cm, 2.8*cm, A4[0] - 1.5*cm, 2.8*cm)
        
        # Footer text
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(colors.HexColor('#666666'))
        
        # Line 1: Company info
        footer_line1 = f"{COMPANY_INFO['name']} - {COMPANY_INFO['legal_form']} au capital de {COMPANY_INFO['capital']} €"
        canvas.drawCentredString(A4[0]/2, 2.4*cm, footer_line1)
        
        # Line 2: Address
        footer_line2 = f"{COMPANY_INFO['address']}, {COMPANY_INFO['city']} - {COMPANY_INFO['region']}"
        canvas.drawCentredString(A4[0]/2, 2.0*cm, footer_line2)
        
        # Line 3: Legal info
        footer_line3 = f"SIRET: {COMPANY_INFO['siret']} | TVA: {COMPANY_INFO['tva_intra']} | RCS: {COMPANY_INFO['rcs']}"
        canvas.drawCentredString(A4[0]/2, 1.6*cm, footer_line3)
        
        # Line 4: Contact + Legal mentions
        footer_line4 = "Pas d'escompte pour règlement anticipé. En cas de retard de paiement: pénalités au taux légal x3 + 40€ de frais de recouvrement."
        canvas.drawCentredString(A4[0]/2, 1.2*cm, footer_line4)
        
        # Page number
        canvas.drawRightString(A4[0] - 1.5*cm, 0.8*cm, f"Page {doc.page}")
        
        canvas.restoreState()
    
    doc.build(elements, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
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
    valid_statuses = ["brouillon", "en_attente", "envoyee", "payée", "partiellement_payée", "en_retard", "annulee"]
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
