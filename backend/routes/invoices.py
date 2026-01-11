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
    """Fetch and cache the logo image for PDF generation"""
    try:
        logo_path = "/tmp/alpha_logo.png"
        urllib.request.urlretrieve(COMPANY_INFO['logo_url'], logo_path)
        return logo_path
    except Exception as e:
        logger.error(f"Failed to fetch logo: {e}")
        return None

def generate_professional_pdf(doc_data: dict, contact: dict, doc_type: str = "facture", invoice_settings: dict = None) -> BytesIO:
    """Generate professional PDF for invoice or quote matching the Alpha Agency design"""
    # Default settings if none provided
    if not invoice_settings:
        invoice_settings = {
            "default_payment_terms": "30",
            "default_tva_rate": "8.5",
            "default_conditions": """• Ce devis est valable 30 jours à compter de sa date d'émission.
• Paiement par virement bancaire ou carte bancaire.
• Le règlement doit intervenir sous 30 jours après réception de la facture.""",
            "bank_details": "",
            "footer_text": "Merci de votre confiance - Alpha Agency",
            "signature_text": "Bon pour accord, le client :"
        }
    
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
    
    # Header
    logo_path = fetch_logo_image()
    header_left = []
    if logo_path:
        try:
            header_left.append(Image(logo_path, width=6*cm, height=2.2*cm))
        except:
            header_left.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", company_name_style))
    else:
        header_left.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", company_name_style))
    
    header_left.append(Spacer(1, 0.3*cm))
    header_left.append(Paragraph(f"{COMPANY_INFO['address']}", company_info_style))
    header_left.append(Paragraph(f"{COMPANY_INFO['city']}, {COMPANY_INFO['region']}", company_info_style))
    header_left.append(Spacer(1, 0.2*cm))
    header_left.append(Paragraph(f"Tél: {COMPANY_INFO['phone']}", company_info_style))
    header_left.append(Paragraph(f"Email: {COMPANY_INFO['email']}", company_info_style))
    
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
    elements.append(Spacer(1, 0.8*cm))
    
    # Client section
    elements.append(Paragraph("<b>DESTINATAIRE</b>", client_header_style))
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    if client_name:
        elements.append(Paragraph(f"<b>{client_name}</b>", client_info_style))
    if contact.get('company'):
        elements.append(Paragraph(contact['company'], client_info_style))
    if contact.get('email'):
        elements.append(Paragraph(contact['email'], client_info_style))
    if contact.get('phone'):
        elements.append(Paragraph(contact['phone'], client_info_style))
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
        discount_type = item.get('discountType', '%')
        
        line_total = qty * unit_price
        if discount:
            if discount_type == '%':
                line_total -= line_total * (discount / 100)
            else:
                line_total -= discount
        
        subtotal += line_total
        tva_amount = line_total * tva_rate
        
        title = item.get('title', '').strip()
        desc = item.get('description', '').strip().replace('\n', '<br/>')
        
        if title and desc:
            full_desc = f"<b>{title}</b><br/><font size='8'>{desc}</font>"
        elif title:
            full_desc = f"<b>{title}</b>"
        else:
            full_desc = desc
        
        if discount:
            full_desc += f"<br/><font size='7' color='#CE0202'>Remise: -{discount}{discount_type}</font>"
        
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
    
    items_table = Table(table_data, colWidths=[8*cm, 1.5*cm, 2.5*cm, 2.5*cm, 2.5*cm], repeatRows=1)
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
        conditions_style = ParagraphStyle('Conditions', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, leading=12)
        elements.append(Paragraph("<b>Conditions:</b>", conditions_style))
        
        # Use custom conditions from settings or document
        conditions_text = doc_data.get('conditions') or invoice_settings.get('default_conditions', '')
        if conditions_text:
            for line in conditions_text.strip().split('\n'):
                if line.strip():
                    elements.append(Paragraph(line.strip(), conditions_style))
        
        elements.append(Spacer(1, 0.8*cm))
        signature_text = invoice_settings.get('signature_text', "Bon pour accord, le client :")
        elements.append(Paragraph(f"<b>Signature du client précédée de la mention '{signature_text}':</b>", conditions_style))
        elements.append(Spacer(1, 2*cm))
        elements.append(Paragraph("_" * 40, conditions_style))
    
    # Payment info for invoices
    if doc_type == "facture":
        payment_style = ParagraphStyle('Payment', parent=styles['Normal'], fontSize=9, textColor=DARK_GRAY, leading=12)
        
        # Bank details from document or settings
        bank_details = doc_data.get('bank_details') or invoice_settings.get('bank_details', '')
        if bank_details:
            elements.append(Paragraph("<b>Coordonnées bancaires:</b>", payment_style))
            for line in bank_details.split('\n'):
                if line.strip():
                    elements.append(Paragraph(line.strip(), payment_style))
            elements.append(Spacer(1, 0.5*cm))
        
        # Conditions from document or settings
        conditions = doc_data.get('conditions') or invoice_settings.get('default_conditions', '')
        if conditions:
            elements.append(Paragraph("<b>Conditions de paiement:</b>", payment_style))
            for line in conditions.split('\n'):
                if line.strip():
                    elements.append(Paragraph(line.strip(), payment_style))
    
    # Footer
    elements.append(Spacer(1, 1*cm))
    footer_text = f"{COMPANY_INFO['name']} - {COMPANY_INFO['address']} - {COMPANY_INFO['city']} - {COMPANY_INFO['region']}"
    elements.append(Paragraph(footer_text, footer_style))
    legal_text = f"SIRET: {COMPANY_INFO['siret']} | NAF: {COMPANY_INFO['naf']} | TVA: {COMPANY_INFO['tva_intra']} | RCS: {COMPANY_INFO['rcs']}"
    elements.append(Paragraph(legal_text, footer_style))
    capital_text = f"{COMPANY_INFO['legal_form']} au capital de {COMPANY_INFO['capital']} € | Tél: {COMPANY_INFO['phone']} | Email: {COMPANY_INFO['email']}"
    elements.append(Paragraph(capital_text, footer_style))
    
    doc.build(elements)
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


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Download invoice as PDF"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    contact = await db.contacts.find_one({"id": invoice['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    doc_type = invoice.get('document_type', 'facture')
    pdf_buffer = generate_professional_pdf(invoice, contact, doc_type)
    
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
    
    doc_type = invoice.get('document_type', 'facture')
    pdf_buffer = generate_professional_pdf(invoice, contact, doc_type)
    
    # Configure Cloudinary
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
        api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET', '')
    )
    
    filename = f"{'devis' if doc_type == 'devis' else 'facture'}_{invoice['invoice_number']}"
    
    try:
        # Upload PDF to Cloudinary
        result = cloudinary.uploader.upload(
            pdf_buffer.getvalue(),
            resource_type="raw",
            public_id=f"pdfs/{filename}",
            overwrite=True,
            format="pdf"
        )
        
        return {
            "url": result.get('secure_url'),
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
