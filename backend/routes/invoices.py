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


# ==================== PDF GENERATION (WeasyPrint) ====================

import urllib.request
from weasyprint import HTML, CSS
import html

def fetch_logo_image():
    """Fetch, resize and cache the logo image for PDF generation"""
    try:
        from PIL import Image as PILImage
        import io
        import base64
        
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
        
        # Convert to base64 for embedding in HTML
        with open(resized_path, 'rb') as f:
            logo_data = base64.b64encode(f.read()).decode('utf-8')
        return f"data:image/png;base64,{logo_data}"
    except Exception as e:
        logger.error(f"Failed to fetch/resize logo: {e}")
        return None

def generate_professional_pdf(doc_data: dict, contact: dict, doc_type: str = "facture", invoice_settings: dict = None) -> BytesIO:
    """
    Generate professional PDF using WeasyPrint (HTML/CSS).
    Handles long descriptions naturally - text flows across pages inside table cells.
    100% conforme au modèle de référence DEV-20231124-00060.pdf
    """
    if not invoice_settings:
        invoice_settings = {}
    
    # Get company info from settings or fallback to defaults
    company_name = invoice_settings.get('company_name') or COMPANY_INFO['commercial_name']
    company_address = invoice_settings.get('company_address') or f"{COMPANY_INFO['address']}, {COMPANY_INFO['city']}"
    company_siret = invoice_settings.get('company_siret') or COMPANY_INFO['siret']
    company_vat = invoice_settings.get('company_vat') or COMPANY_INFO['tva_intra']
    company_phone = invoice_settings.get('company_phone') or COMPANY_INFO['phone']
    company_email = invoice_settings.get('company_email') or COMPANY_INFO['email']
    
    # Document info
    doc_number = doc_data.get('invoice_number') or doc_data.get('quote_number', '')
    doc_date = doc_data.get('created_at', '')[:10]
    
    if doc_type == "devis":
        doc_title = f"Devis {doc_number}"
        date_label = "En date du"
    else:
        doc_title = f"Facture {doc_number}"
        date_label = "Date"
    
    # Client info
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    client_company = contact.get('company', '')
    client_email = contact.get('email', '')
    client_phone = contact.get('phone', '')
    
    # Logo
    logo_src = fetch_logo_image() or ""
    
    # Calculate totals
    subtotal = 0
    tva_rate = 0.085
    
    items_html = ""
    for idx, item in enumerate(doc_data.get('items', [])):
        qty = item.get('quantity', 1)
        unit_price = item.get('unit_price', 0)
        discount = item.get('discount', 0)
        discount_type = item.get('discountType', 'percent')
        
        # Calculate line total
        line_total = qty * unit_price
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                line_total -= line_total * (discount / 100)
            else:
                line_total -= discount
        
        subtotal += line_total
        
        title = html.escape(item.get('title', '').strip() or "Service")
        desc = item.get('description', '').strip()
        
        # Format description with line breaks (escape HTML but keep line breaks)
        desc_html = html.escape(desc).replace('\n', '<br>') if desc else ""
        
        # Format discount
        if discount:
            if discount_type == 'percent' or discount_type == '%':
                discount_str = f"{discount:.0f}%"
            else:
                discount_str = f"{discount:.2f}€"
        else:
            discount_str = "-"
        
        # Alternating row colors
        row_bg = "#f9f9f9" if idx % 2 == 1 else "#ffffff"
        
        items_html += f"""
        <tr style="background-color: {row_bg};">
            <td class="designation">
                <strong>{title}</strong>
                {f'<br><span class="description">{desc_html}</span>' if desc_html else ''}
            </td>
            <td class="center">{qty:.2f}</td>
            <td class="center">{discount_str}</td>
            <td class="right">{unit_price:.2f} €</td>
            <td class="center">8.5%</td>
            <td class="right"><strong>{line_total:.2f} €</strong></td>
        </tr>
        """
    
    # Apply global discount
    global_discount = doc_data.get('globalDiscount', 0)
    global_discount_type = doc_data.get('globalDiscountType', '%')
    global_discount_html = ""
    if global_discount:
        if global_discount_type == '%':
            subtotal -= subtotal * (global_discount / 100)
            global_discount_html = f'<tr><td colspan="2"></td><td colspan="3" class="right">Remise globale ({global_discount:.0f}%):</td><td class="right">appliquée</td></tr>'
        else:
            subtotal -= global_discount
            global_discount_html = f'<tr><td colspan="2"></td><td colspan="3" class="right">Remise globale ({global_discount:.2f} €):</td><td class="right">appliquée</td></tr>'
    
    tva_total = subtotal * tva_rate
    total_ttc = subtotal + tva_total
    
    # Conditions and bank details
    conditions_text = doc_data.get('conditions') or invoice_settings.get('default_conditions', '')
    bank_details = doc_data.get('bank_details') or invoice_settings.get('bank_details', '')
    
    conditions_html = ""
    if conditions_text:
        conditions_items = "".join([f"<li>{html.escape(line.strip())}</li>" for line in conditions_text.strip().split('\n') if line.strip()])
        conditions_html = f"""
        <div class="grey-box">
            <h4>Conditions de règlement:</h4>
            <ul>{conditions_items}</ul>
        </div>
        """
    
    bank_html = ""
    if bank_details:
        bank_lines = ""
        for line in bank_details.strip().split('\n'):
            if line.strip():
                if ':' in line:
                    parts = line.split(':', 1)
                    bank_lines += f"<p><strong>{html.escape(parts[0])}:</strong> {html.escape(parts[1])}</p>"
                else:
                    bank_lines += f"<p>{html.escape(line.strip())}</p>"
        bank_html = f"""
        <div class="grey-box">
            <h4>Détails du paiement:</h4>
            <p><strong>Bénéficiaire:</strong> {html.escape(company_name)}</p>
            {bank_lines}
        </div>
        """
    
    # Signature section for devis only
    signature_html = ""
    if doc_type == "devis":
        signature_html = """
        <div class="signature-section">
            <p><strong>Bon pour accord & signature :</strong></p>
            <div class="signature-line"></div>
        </div>
        """
    
    # Additional info (validity/due date)
    additional_info = ""
    if doc_type == "devis" and doc_data.get('valid_until'):
        additional_info = f"<p>Validité: {doc_data['valid_until']}</p>"
    elif doc_type == "facture" and doc_data.get('due_date'):
        additional_info = f"<p>Échéance: {doc_data['due_date']}</p>"
    
    # Build the complete HTML
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 1.5cm 1.5cm 2.5cm 1.5cm;
                @bottom-center {{
                    content: none;
                }}
            }}
            
            * {{
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }}
            
            body {{
                font-family: Helvetica, Arial, sans-serif;
                font-size: 9pt;
                color: #333333;
                line-height: 1.4;
            }}
            
            .header {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
            }}
            
            .header-left {{
                width: 50%;
            }}
            
            .header-right {{
                width: 45%;
                text-align: right;
            }}
            
            .logo {{
                max-width: 180px;
                max-height: 70px;
            }}
            
            .doc-title {{
                font-size: 14pt;
                color: #CE0202;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            
            .doc-info {{
                font-size: 9pt;
                color: #333333;
            }}
            
            .addresses {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
            }}
            
            .sender, .recipient {{
                width: 48%;
            }}
            
            .recipient {{
                text-align: right;
            }}
            
            .recipient-label {{
                color: #CE0202;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            
            /* TABLE STYLES - CRITICAL FOR PROPER LAYOUT */
            table.items {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                table-layout: fixed;
            }}
            
            table.items thead th {{
                background-color: #1a1a2e;
                color: white;
                font-weight: bold;
                font-size: 8pt;
                padding: 10px 5px;
                text-align: center;
                vertical-align: middle;
                border: 0.5px solid #cccccc;
                /* NO word-wrap on headers */
                white-space: nowrap;
            }}
            
            /* Column widths - adjusted so "Remise" fits on one line */
            table.items th:nth-child(1),
            table.items td:nth-child(1) {{ width: 48%; }}  /* Désignation */
            table.items th:nth-child(2),
            table.items td:nth-child(2) {{ width: 7%; }}   /* Qté */
            table.items th:nth-child(3),
            table.items td:nth-child(3) {{ width: 10%; }}  /* Remise */
            table.items th:nth-child(4),
            table.items td:nth-child(4) {{ width: 12%; }}  /* P.U. HT */
            table.items th:nth-child(5),
            table.items td:nth-child(5) {{ width: 8%; }}   /* TVA */
            table.items th:nth-child(6),
            table.items td:nth-child(6) {{ width: 15%; }}  /* Total HT */
            
            table.items td {{
                padding: 8px 5px;
                border: 0.5px solid #cccccc;
                vertical-align: top;
                font-size: 9pt;
            }}
            
            table.items td.designation {{
                text-align: left;
                /* Allow text to wrap naturally inside the cell */
                word-wrap: break-word;
                overflow-wrap: break-word;
            }}
            
            table.items td.designation .description {{
                font-size: 8pt;
                color: #666666;
                display: block;
                margin-top: 5px;
            }}
            
            table.items td.center {{
                text-align: center;
                vertical-align: middle;
            }}
            
            table.items td.right {{
                text-align: right;
                vertical-align: middle;
            }}
            
            /* TOTALS TABLE */
            table.totals {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }}
            
            table.totals td {{
                padding: 4px 5px;
                font-size: 9pt;
            }}
            
            table.totals td.label {{
                text-align: right;
                width: 75%;
            }}
            
            table.totals td.value {{
                text-align: right;
                width: 25%;
            }}
            
            table.totals tr.ttc td {{
                color: #22c55e;
                font-weight: bold;
                font-size: 10pt;
                border-top: 2px solid #22c55e;
                padding-top: 8px;
            }}
            
            /* GREY BOXES */
            .grey-box {{
                background-color: #f5f5f5;
                padding: 10px 15px;
                margin-bottom: 10px;
            }}
            
            .grey-box h4 {{
                font-size: 10pt;
                margin-bottom: 6px;
            }}
            
            .grey-box ul {{
                margin-left: 20px;
            }}
            
            .grey-box li, .grey-box p {{
                font-size: 9pt;
                margin-bottom: 3px;
            }}
            
            /* SIGNATURE */
            .signature-section {{
                margin-top: 20px;
            }}
            
            .signature-line {{
                border-bottom: 1px solid #333;
                width: 200px;
                height: 30px;
                margin-top: 10px;
            }}
            
            /* FOOTER */
            .footer {{
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 6pt;
                color: #666666;
                border-top: 1px solid #cccccc;
                padding-top: 5px;
            }}
            
            .page-number {{
                position: fixed;
                bottom: 5px;
                right: 1.5cm;
                font-size: 6pt;
                color: #666666;
            }}
        </style>
    </head>
    <body>
        <!-- HEADER -->
        <div class="header">
            <div class="header-left">
                {f'<img src="{logo_src}" class="logo" alt="Logo">' if logo_src else f'<div class="doc-title">{html.escape(company_name)}</div>'}
            </div>
            <div class="header-right">
                <div class="doc-title">{doc_title}</div>
                <div class="doc-info">{date_label}: {doc_date}</div>
                {additional_info}
            </div>
        </div>
        
        <!-- ADDRESSES -->
        <div class="addresses">
            <div class="sender">
                <strong>{html.escape(company_name)}</strong><br>
                {html.escape(company_address)}<br>
                Tél: {html.escape(company_phone)}<br>
                Email: {html.escape(company_email)}
            </div>
            <div class="recipient">
                <div class="recipient-label">DESTINATAIRE</div>
                {f'<strong>{html.escape(client_name)}</strong><br>' if client_name else ''}
                {f'{html.escape(client_company)}<br>' if client_company else ''}
                {f'{html.escape(client_email)}<br>' if client_email else ''}
                {f'Tél: {html.escape(client_phone)}' if client_phone else ''}
            </div>
        </div>
        
        <!-- ITEMS TABLE -->
        <table class="items">
            <thead>
                <tr>
                    <th>Désignation</th>
                    <th>Qté</th>
                    <th>Remise</th>
                    <th>P.U. HT</th>
                    <th>TVA</th>
                    <th>Total HT</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>
        
        <!-- TOTALS -->
        <table class="totals">
            {global_discount_html}
            <tr>
                <td class="label">Total HT:</td>
                <td class="value"><strong>{subtotal:.2f} €</strong></td>
            </tr>
            <tr>
                <td class="label">TVA 8.50%:</td>
                <td class="value"><strong>{tva_total:.2f} €</strong></td>
            </tr>
            <tr class="ttc">
                <td class="label">Montant Total de votre investissement (TTC):</td>
                <td class="value">{total_ttc:.2f} €</td>
            </tr>
        </table>
        
        <!-- CONDITIONS & BANK DETAILS -->
        {conditions_html}
        {bank_html}
        
        <!-- SIGNATURE (devis only) -->
        {signature_html}
        
        <!-- FOOTER -->
        <div class="footer">
            {COMPANY_INFO['name']} - {COMPANY_INFO['legal_form']} au capital de {COMPANY_INFO['capital']} €<br>
            {html.escape(company_address)}<br>
            SIRET: {company_siret} | TVA: {company_vat}<br>
            En cas de retard de paiement: pénalités au taux légal x3 + 40€ de frais de recouvrement.
        </div>
    </body>
    </html>
    """
    
    # Generate PDF with WeasyPrint
    buffer = BytesIO()
    html_doc = HTML(string=html_content)
    html_doc.write_pdf(buffer)
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
