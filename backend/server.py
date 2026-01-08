from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import resend
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from fastapi.responses import StreamingResponse

# Backup system imports
from utils.backup_manager import BackupManager
from utils.backup_scheduler import backup_scheduler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Company Info - Updated with real information from PDF template
COMPANY_INFO = {
    "name": "ALPHA DIGITAL",
    "commercial_name": "ALPHAGENCY",
    "tagline": "",  # Retiré comme demandé
    "address": "3 Boulevard du Marquisat de Houelbourg",
    "city": "97122 Baie-Mahault",
    "region": "Guadeloupe",
    "phone": "0690 05 34 44",
    "email": "comptabilite@alphagency.fr",
    "contact_email": "leo.sperl@alphagency.fr",
    "siret": "91255383100013",
    "siren": "912553831",
    "naf": "7311Z",
    "tva_intra": "FR47912553831",
    "rcs": "Pointe-à-Pitre",
    "capital": "100",
    "legal_form": "SASU",
    "logo_url": "https://customer-assets.emergentagent.com/job_46adb236-f8e1-4856-a9f0-1ea29ce009cd/artifacts/kpvir23o_LOGO%20DEVIS%20FACTURES.png"
}

# Cloudinary Config
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

# Backup Manager (initialized at startup)
backup_manager = None

# Initialize Cloudinary if credentials are available
import cloudinary
import cloudinary.uploader
if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )

app = FastAPI(title="Alpha Agency API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    created_at: str

class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = "website"
    project_type: Optional[str] = None
    budget: Optional[str] = None
    message: Optional[str] = None
    tags: Optional[List[str]] = []
    # Nouveaux champs
    poste: Optional[str] = None
    note: Optional[str] = None
    infos_sup: Optional[str] = None
    city: Optional[str] = None

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    score: Optional[str] = None
    tags: Optional[List[str]] = None
    # Nouveaux champs
    poste: Optional[str] = None
    note: Optional[str] = None
    infos_sup: Optional[str] = None
    budget: Optional[str] = None
    city: Optional[str] = None
    project_type: Optional[str] = None

class OpportunityCreate(BaseModel):
    contact_id: str
    title: str
    amount: float
    probability: Optional[int] = 50
    status: Optional[str] = "nouveau"
    offer_type: Optional[str] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None

class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    probability: Optional[int] = None
    status: Optional[str] = None
    offer_type: Optional[str] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None

class QuoteItemCreate(BaseModel):
    title: Optional[str] = ""  # Titre du service
    description: str
    quantity: int = 1
    unit_price: float
    
class QuoteCreate(BaseModel):
    contact_id: str
    opportunity_id: Optional[str] = None
    items: List[QuoteItemCreate]
    valid_until: Optional[str] = None
    notes: Optional[str] = None

class QuoteUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    amount: float
    payment_date: str
    payment_method: Optional[str] = "virement"  # virement, chèque, carte, espèces
    notes: Optional[str] = None

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

class SubscriptionCreate(BaseModel):
    contact_id: str
    plan_name: str = "Site Web 90€/mois"
    amount: float = 90.0
    billing_cycle: str = "monthly"
    start_date: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"

class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    image_url: Optional[str] = None
    tags: Optional[List[str]] = []
    published: bool = False

class PortfolioCreate(BaseModel):
    title: str
    category: str
    description: str
    image_url: str
    link: Optional[str] = None
    tags: Optional[List[str]] = []

class LeadFormSubmission(BaseModel):
    first_name: str
    last_name: str
    company: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    project_type: str
    budget: Optional[str] = None
    message: Optional[str] = None

class KPIUpdate(BaseModel):
    sessions: Optional[int] = None
    leads: Optional[int] = None
    conversion_rate: Optional[float] = None
    mrr: Optional[float] = None
    signed_revenue: Optional[float] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ==================== EMAIL HELPERS ====================

async def send_email_notification(to: str, subject: str, html_content: str):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html_content
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

async def send_new_lead_notification(lead: dict):
    admin_email = os.environ.get('ADMIN_EMAIL', 'leo.sperl@alphagency.fr')
    html = f"""
    <h2>Nouveau lead reçu - ALPHA Agency</h2>
    <p><strong>Nom:</strong> {lead.get('first_name')} {lead.get('last_name')}</p>
    <p><strong>Email:</strong> {lead.get('email')}</p>
    <p><strong>Téléphone:</strong> {lead.get('phone', 'Non renseigné')}</p>
    <p><strong>Entreprise:</strong> {lead.get('company', 'Non renseignée')}</p>
    <p><strong>Type de projet:</strong> {lead.get('project_type')}</p>
    <p><strong>Budget:</strong> {lead.get('budget', 'Non renseigné')}</p>
    <p><strong>Message:</strong> {lead.get('message', 'Aucun')}</p>
    """
    await send_email_notification(admin_email, f"Nouveau lead: {lead.get('first_name')} {lead.get('last_name')}", html)

# ==================== PDF GENERATION ====================

import urllib.request
from PIL import Image as PILImage

def fetch_logo_image():
    """Fetch and cache the logo image for PDF generation"""
    try:
        logo_path = "/tmp/alpha_logo.png"
        urllib.request.urlretrieve(COMPANY_INFO['logo_url'], logo_path)
        return logo_path
    except Exception as e:
        logger.error(f"Failed to fetch logo: {e}")
        return None

def generate_professional_pdf(doc_data: dict, contact: dict, doc_type: str = "facture") -> BytesIO:
    """Generate professional PDF for invoice or quote matching the Alpha Agency design"""
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
    
    # ===== HEADER SECTION =====
    # Logo and company info in a table layout
    logo_path = fetch_logo_image()
    
    # Company name style
    company_name_style = ParagraphStyle(
        'CompanyName', 
        parent=styles['Heading1'], 
        fontSize=20, 
        textColor=BRAND_RED,
        spaceAfter=0
    )
    company_tagline_style = ParagraphStyle(
        'CompanyTagline', 
        parent=styles['Normal'], 
        fontSize=9, 
        textColor=LIGHT_GRAY,
        spaceAfter=2
    )
    company_info_style = ParagraphStyle(
        'CompanyInfo', 
        parent=styles['Normal'], 
        fontSize=9, 
        textColor=DARK_GRAY,
        leading=12
    )
    
    # Build header content
    header_left = []
    if logo_path:
        try:
            # Logo plus grand et visible
            header_left.append(Image(logo_path, width=6*cm, height=2.2*cm))
        except:
            header_left.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", company_name_style))
    else:
        header_left.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", company_name_style))
    
    header_left.append(Spacer(1, 0.3*cm))
    # Pas de tagline (retiré comme demandé)
    header_left.append(Paragraph(f"{COMPANY_INFO['address']}", company_info_style))
    header_left.append(Paragraph(f"{COMPANY_INFO['city']}, {COMPANY_INFO['region']}", company_info_style))
    header_left.append(Spacer(1, 0.2*cm))
    header_left.append(Paragraph(f"Tél: {COMPANY_INFO['phone']}", company_info_style))
    header_left.append(Paragraph(f"Email: {COMPANY_INFO['email']}", company_info_style))
    
    # Document info (right side)
    doc_title_style = ParagraphStyle(
        'DocTitle', 
        parent=styles['Heading1'], 
        fontSize=16, 
        textColor=DARK_GRAY,
        alignment=TA_RIGHT,
        spaceAfter=5
    )
    doc_info_style = ParagraphStyle(
        'DocInfo', 
        parent=styles['Normal'], 
        fontSize=10, 
        textColor=DARK_GRAY,
        alignment=TA_RIGHT,
        leading=14
    )
    
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
    
    # Create header table
    header_table_data = [[header_left, header_right]]
    header_table = Table(header_table_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # ===== CLIENT SECTION =====
    client_header_style = ParagraphStyle(
        'ClientHeader', 
        parent=styles['Normal'], 
        fontSize=10, 
        textColor=BRAND_RED,
        spaceAfter=5
    )
    client_info_style = ParagraphStyle(
        'ClientInfo', 
        parent=styles['Normal'], 
        fontSize=10, 
        textColor=DARK_GRAY,
        leading=14
    )
    
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
    
    # ===== ITEMS TABLE =====
    # Table header style
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_GRAY,
        leading=12
    )
    table_cell_right_style = ParagraphStyle(
        'TableCellRight',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_GRAY,
        alignment=TA_RIGHT
    )
    
    # Build table data
    table_data = [[
        Paragraph("<b>Description</b>", table_header_style),
        Paragraph("<b>Qté</b>", table_header_style),
        Paragraph("<b>PU HT</b>", table_header_style),
        Paragraph("<b>TVA</b>", table_header_style),
        Paragraph("<b>Total HT</b>", table_header_style)
    ]]
    
    subtotal = 0
    tva_rate = 0.085  # TVA Guadeloupe 8.5%
    
    for item in doc_data.get('items', []):
        qty = item.get('quantity', 1)
        unit_price = item.get('unit_price', 0)
        total = qty * unit_price
        subtotal += total
        tva_amount = total * tva_rate
        
        # Handle Titre + Description (Title in bold, description below)
        title = item.get('title', '').strip()
        desc = item.get('description', '').strip().replace('\n', '<br/>')
        
        if title and desc:
            full_desc = f"<b>{title}</b><br/><font size='8'>{desc}</font>"
        elif title:
            full_desc = f"<b>{title}</b>"
        else:
            full_desc = desc
        
        table_data.append([
            Paragraph(full_desc, table_cell_style),
            Paragraph(str(qty), table_cell_right_style),
            Paragraph(f"{unit_price:.2f} €", table_cell_right_style),
            Paragraph(f"8.5%<br/>({tva_amount:.2f} €)", table_cell_right_style),
            Paragraph(f"{total:.2f} €", table_cell_right_style)
        ])
    
    # Create table
    items_table = Table(
        table_data, 
        colWidths=[8*cm, 1.5*cm, 2.5*cm, 2.5*cm, 2.5*cm],
        repeatRows=1
    )
    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        # Content rows
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        # Alignment
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        # Alternate row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F8F8')]),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # ===== TOTALS SECTION =====
    tva_total = subtotal * tva_rate
    total_ttc = subtotal + tva_total
    
    totals_style = ParagraphStyle(
        'Totals',
        parent=styles['Normal'],
        fontSize=10,
        textColor=DARK_GRAY,
        alignment=TA_RIGHT
    )
    totals_bold_style = ParagraphStyle(
        'TotalsBold',
        parent=styles['Normal'],
        fontSize=11,
        textColor=BRAND_RED,
        alignment=TA_RIGHT
    )
    
    totals_data = [
        ['', '', '', Paragraph("Total net HT:", totals_style), Paragraph(f"<b>{subtotal:.2f} €</b>", totals_style)],
        ['', '', '', Paragraph("TVA 8.50%:", totals_style), Paragraph(f"<b>{tva_total:.2f} €</b>", totals_style)],
        ['', '', '', Paragraph("<b>TOTAL TTC:</b>", totals_bold_style), Paragraph(f"<b>{total_ttc:.2f} €</b>", totals_bold_style)],
    ]
    
    totals_table = Table(totals_data, colWidths=[8*cm, 1.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEABOVE', (3, 2), (-1, 2), 1, BRAND_RED),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # ===== CONDITIONS & SIGNATURE SECTION (for quotes) =====
    if doc_type == "devis":
        conditions_style = ParagraphStyle(
            'Conditions',
            parent=styles['Normal'],
            fontSize=9,
            textColor=DARK_GRAY,
            leading=12
        )
        
        elements.append(Paragraph("<b>Conditions:</b>", conditions_style))
        elements.append(Paragraph("• Date de validité: 30 jours à compter de la date du devis", conditions_style))
        elements.append(Paragraph("• Moyen de règlement: Virement bancaire ou chèque", conditions_style))
        elements.append(Paragraph("• Délai de règlement: 30% à la commande, solde à la livraison", conditions_style))
        elements.append(Spacer(1, 0.8*cm))
        
        # Signature zone
        elements.append(Paragraph("<b>Signature du client précédée de la mention 'Lu et approuvé, bon pour accord':</b>", conditions_style))
        elements.append(Spacer(1, 2*cm))
        elements.append(Paragraph("_" * 40, conditions_style))
    
    # ===== PAYMENT INFO (for invoices) =====
    if doc_type == "facture":
        payment_style = ParagraphStyle(
            'Payment',
            parent=styles['Normal'],
            fontSize=9,
            textColor=DARK_GRAY,
            leading=12
        )
        
        if doc_data.get('bank_details'):
            elements.append(Paragraph("<b>Coordonnées bancaires:</b>", payment_style))
            for line in doc_data['bank_details'].split('\n'):
                elements.append(Paragraph(line, payment_style))
            elements.append(Spacer(1, 0.5*cm))
        
        if doc_data.get('conditions'):
            elements.append(Paragraph("<b>Conditions de paiement:</b>", payment_style))
            for line in doc_data['conditions'].split('\n'):
                elements.append(Paragraph(line, payment_style))
    
    # ===== FOOTER =====
    elements.append(Spacer(1, 1*cm))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=LIGHT_GRAY,
        alignment=TA_CENTER,
        leading=10
    )
    
    footer_text = f"{COMPANY_INFO['name']} - {COMPANY_INFO['address']} - {COMPANY_INFO['city']} - {COMPANY_INFO['region']}"
    elements.append(Paragraph(footer_text, footer_style))
    
    legal_text = f"SIRET: {COMPANY_INFO['siret']} | NAF: {COMPANY_INFO['naf']} | TVA: {COMPANY_INFO['tva_intra']} | RCS: {COMPANY_INFO['rcs']}"
    elements.append(Paragraph(legal_text, footer_style))
    
    capital_text = f"{COMPANY_INFO['legal_form']} au capital de {COMPANY_INFO['capital']} € | Tél: {COMPANY_INFO['phone']} | Email: {COMPANY_INFO['email']}"
    elements.append(Paragraph(capital_text, footer_style))
    
    # Build document
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_quote_pdf(quote: dict, contact: dict) -> BytesIO:
    """Generate professional quote PDF"""
    return generate_professional_pdf(quote, contact, doc_type="devis")

def generate_invoice_pdf(invoice: dict, contact: dict) -> BytesIO:
    """Generate professional invoice PDF"""
    return generate_professional_pdf(invoice, contact, doc_type="facture")

# ==================== AUTH ROUTES ====================

# Création du super admin initial ou réinitialisation du mot de passe
async def create_initial_super_admin():
    admin_email = "admin@alphagency.fr"
    default_password = "superpassword"
    
    # Vérifier si l'admin existe
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if existing_admin:
        # Réinitialiser le mot de passe de l'admin existant
        new_hash = hash_password(default_password)
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password": new_hash}}
        )
        logger.info(f"Mot de passe admin réinitialisé: {admin_email} / {default_password}")
    else:
        # Créer le super admin s'il n'existe pas
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "email": admin_email,
            "password": hash_password(default_password),
            "full_name": "Super Admin",
            "role": "super_admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info(f"Super admin initial créé: {admin_email} / {default_password}")

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate, current_user: dict = Depends(get_current_user)):
    # Seul un super_admin peut créer de nouveaux comptes
    existing_user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not existing_user or existing_user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Seul un super administrateur peut créer des comptes")
    
    existing = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "full_name": user.full_name,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return {"id": user_id, "message": "Compte administrateur créé avec succès"}

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    token = create_token(user['id'], user['email'], user['role'])
    return {"token": token, "user": {"id": user['id'], "email": user['email'], "full_name": user['full_name'], "role": user['role']}}

@api_router.get("/auth/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

# ==================== CONTACTS ROUTES ====================

@api_router.post("/contacts", response_model=dict)
async def create_contact(contact: ContactCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        **contact.model_dump(),
        "status": "nouveau",
        "score": "tiède",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    return {"id": contact_id, "message": "Contact créé avec succès"}

@api_router.get("/contacts", response_model=List[dict])
async def get_contacts(current_user: dict = Depends(get_current_user), status: Optional[str] = None, score: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if score:
        query["score"] = score
    contacts = await db.contacts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=dict)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    return contact

@api_router.put("/contacts/{contact_id}", response_model=dict)
async def update_contact(contact_id: str, update: ContactUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    return {"message": "Contact mis à jour"}

@api_router.delete("/contacts/{contact_id}", response_model=dict)
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    return {"message": "Contact supprimé"}

# ==================== CONTACTS IMPORT ====================
import pandas as pd
import io
import re

class ImportOptions(BaseModel):
    mapping: dict  # {"file_column": "db_field"}
    status: str = "nouveau"
    tags: List[str] = []
    update_existing: bool = False
    identifier_field: str = "email"  # "email" or "phone"
    subscribe_email: bool = False
    subscribe_sms: bool = False

@api_router.post("/contacts/import/parse", response_model=dict)
async def parse_import_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Parse uploaded file and return columns for mapping"""
    
    # Check file type
    allowed_extensions = ['.csv', '.xls', '.xlsx']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Format non supporté. Utilisez {', '.join(allowed_extensions)}")
    
    # Check file size (100 MB max)
    contents = await file.read()
    if len(contents) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 100 MB)")
    
    try:
        # Parse file based on type
        if file_ext == '.csv':
            # Try different encodings
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding=encoding, nrows=100)
                    break
                except:
                    continue
            else:
                raise HTTPException(status_code=400, detail="Impossible de lire le fichier CSV")
        elif file_ext == '.xlsx':
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl', nrows=100)
        elif file_ext == '.xls':
            df = pd.read_excel(io.BytesIO(contents), engine='xlrd', nrows=100)
        else:
            raise HTTPException(status_code=400, detail="Format non supporté")
        
        # Get columns
        columns = df.columns.tolist()
        
        # Get preview data (first 5 rows)
        preview = df.head(5).fillna('').astype(str).to_dict('records')
        
        # Get total rows (re-read full file to count)
        if file_ext == '.csv':
            df_full = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        else:
            df_full = pd.read_excel(io.BytesIO(contents))
        total_rows = len(df_full)
        
        return {
            "columns": columns,
            "preview": preview,
            "total_rows": total_rows,
            "filename": file.filename
        }
        
    except Exception as e:
        logger.error(f"Error parsing import file: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur lors de la lecture du fichier: {str(e)}")

@api_router.post("/contacts/import/execute", response_model=dict)
async def execute_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    status: str = Form("nouveau"),
    tags: str = Form(""),
    update_existing: bool = Form(False),
    identifier_field: str = Form("email"),
    subscribe_email: bool = Form(False),
    subscribe_sms: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """Execute the import with the specified options"""
    import json
    
    # Parse mapping
    try:
        field_mapping = json.loads(mapping)
    except:
        raise HTTPException(status_code=400, detail="Mapping invalide")
    
    # Parse tags
    tag_list = [t.strip() for t in tags.split(',') if t.strip()] if tags else []
    
    # Read file
    contents = await file.read()
    file_ext = '.' + file.filename.split('.')[-1].lower()
    
    try:
        if file_ext == '.csv':
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding=encoding)
                    break
                except:
                    continue
        elif file_ext == '.xlsx':
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
        elif file_ext == '.xls':
            df = pd.read_excel(io.BytesIO(contents), engine='xlrd')
        else:
            raise HTTPException(status_code=400, detail="Format non supporté")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lecture fichier: {str(e)}")
    
    # Results tracking
    results = {
        "imported": 0,
        "updated": 0,
        "skipped": 0,
        "errors": []
    }
    
    # Email validation regex
    email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    # Identify which columns map to Budget (can be multiple)
    budget_columns = [col for col, field in field_mapping.items() if field == "budget"]
    
    # Process each row
    for index, row in df.iterrows():
        try:
            # Build contact data from mapping
            contact_data = {}
            budget_values = []
            
            for file_col, db_field in field_mapping.items():
                if db_field and db_field != "ignore" and file_col in df.columns:
                    value = row[file_col]
                    if pd.notna(value):
                        value_str = str(value).strip()
                        # Handle Budget concatenation (multiple columns → one field)
                        if db_field == "budget":
                            if value_str:
                                budget_values.append(value_str)
                        else:
                            contact_data[db_field] = value_str
            
            # Concatenate budget values with " / "
            if budget_values:
                contact_data["budget"] = " / ".join(budget_values)
            
            # Check required fields (email or phone)
            email = contact_data.get('email', '').strip()
            phone = contact_data.get('phone', '').strip()
            
            if not email and not phone:
                results["errors"].append(f"Ligne {index + 2}: Email ou téléphone requis")
                results["skipped"] += 1
                continue
            
            # Validate email if provided
            if email and not email_regex.match(email):
                results["errors"].append(f"Ligne {index + 2}: Email invalide ({email})")
                results["skipped"] += 1
                continue
            
            # Handle created_at: use from file if mapped, otherwise use import date
            if 'created_at' in contact_data:
                # Try to parse the date from file
                try:
                    # Try different date formats
                    date_str = contact_data['created_at']
                    parsed_date = None
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d', '%d.%m.%Y']:
                        try:
                            parsed_date = datetime.strptime(date_str, fmt)
                            break
                        except:
                            continue
                    if parsed_date:
                        contact_data['created_at'] = parsed_date.replace(tzinfo=timezone.utc).isoformat()
                    else:
                        # If can't parse, use current date
                        contact_data['created_at'] = datetime.now(timezone.utc).isoformat()
                except:
                    contact_data['created_at'] = datetime.now(timezone.utc).isoformat()
            else:
                contact_data['created_at'] = datetime.now(timezone.utc).isoformat()
            
            # Check for existing contact
            identifier_value = email if identifier_field == "email" else phone
            identifier_query = {"email": email} if identifier_field == "email" and email else {"phone": phone}
            
            existing_contact = await db.contacts.find_one(identifier_query)
            
            if existing_contact:
                if update_existing:
                    # Update existing contact (but not created_at)
                    update_data = {k: v for k, v in contact_data.items() if v and k != 'created_at'}
                    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
                    if tag_list:
                        existing_tags = existing_contact.get('tags', [])
                        update_data["tags"] = list(set(existing_tags + tag_list))
                    if subscribe_email:
                        update_data["subscribe_email"] = True
                    if subscribe_sms:
                        update_data["subscribe_sms"] = True
                    
                    await db.contacts.update_one({"id": existing_contact["id"]}, {"$set": update_data})
                    results["updated"] += 1
                else:
                    results["skipped"] += 1
            else:
                # Create new contact
                contact_id = str(uuid.uuid4())
                contact_doc = {
                    "id": contact_id,
                    "first_name": contact_data.get('first_name', ''),
                    "last_name": contact_data.get('last_name', ''),
                    "email": contact_data.get('email', ''),
                    "phone": contact_data.get('phone', ''),
                    "company": contact_data.get('company', ''),
                    "city": contact_data.get('city', ''),
                    "project_type": contact_data.get('project_type', ''),
                    "poste": contact_data.get('poste', ''),
                    "note": contact_data.get('note', ''),
                    "infos_sup": contact_data.get('infos_sup', ''),
                    "budget": contact_data.get('budget', ''),
                    "status": status,
                    "score": "tiède",
                    "tags": tag_list,
                    "subscribe_email": subscribe_email,
                    "subscribe_sms": subscribe_sms,
                    "source": "import",
                    "created_at": contact_data.get('created_at', datetime.now(timezone.utc).isoformat()),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.contacts.insert_one(contact_doc)
                results["imported"] += 1
                
        except Exception as e:
            results["errors"].append(f"Ligne {index + 2}: {str(e)}")
            results["skipped"] += 1
    
    # Limit errors to first 20
    if len(results["errors"]) > 20:
        results["errors"] = results["errors"][:20] + [f"... et {len(results['errors']) - 20} autres erreurs"]
    
    return results

# ==================== OPPORTUNITIES ROUTES ====================

@api_router.post("/opportunities", response_model=dict)
async def create_opportunity(opp: OpportunityCreate, current_user: dict = Depends(get_current_user)):
    opp_id = str(uuid.uuid4())
    opp_doc = {
        "id": opp_id,
        **opp.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.opportunities.insert_one(opp_doc)
    return {"id": opp_id, "message": "Opportunité créée"}

@api_router.get("/opportunities", response_model=List[dict])
async def get_opportunities(current_user: dict = Depends(get_current_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    opps = await db.opportunities.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return opps

@api_router.put("/opportunities/{opp_id}", response_model=dict)
async def update_opportunity(opp_id: str, update: OpportunityUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.opportunities.update_one({"id": opp_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    return {"message": "Opportunité mise à jour"}

@api_router.delete("/opportunities/{opp_id}", response_model=dict)
async def delete_opportunity(opp_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.opportunities.delete_one({"id": opp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    return {"message": "Opportunité supprimée"}

# ==================== QUOTES ROUTES ====================

async def get_next_quote_number():
    counter = await db.counters.find_one_and_update(
        {"name": "quote_number"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True
    )
    return f"DEV-{datetime.now().year}-{str(counter['value']).zfill(4)}"

@api_router.post("/quotes", response_model=dict)
async def create_quote(quote: QuoteCreate, current_user: dict = Depends(get_current_user)):
    quote_id = str(uuid.uuid4())
    quote_number = await get_next_quote_number()
    
    subtotal = sum(item.quantity * item.unit_price for item in quote.items)
    tva = subtotal * 0.085
    total = subtotal + tva
    
    quote_doc = {
        "id": quote_id,
        "quote_number": quote_number,
        "contact_id": quote.contact_id,
        "opportunity_id": quote.opportunity_id,
        "items": [item.model_dump() for item in quote.items],
        "subtotal": subtotal,
        "tva": tva,
        "total": total,
        "status": "brouillon",
        "valid_until": quote.valid_until or (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "notes": quote.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quotes.insert_one(quote_doc)
    return {"id": quote_id, "quote_number": quote_number, "message": "Devis créé"}

@api_router.get("/quotes", response_model=List[dict])
async def get_quotes(current_user: dict = Depends(get_current_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return quotes

@api_router.get("/quotes/{quote_id}", response_model=dict)
async def get_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return quote

@api_router.put("/quotes/{quote_id}", response_model=dict)
async def update_quote(quote_id: str, update: QuoteUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return {"message": "Devis mis à jour"}

@api_router.get("/quotes/{quote_id}/pdf")
async def download_quote_pdf(quote_id: str, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    contact = await db.contacts.find_one({"id": quote['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    pdf_buffer = generate_quote_pdf(quote, contact)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=devis_{quote['quote_number']}.pdf"}
    )

@api_router.post("/quotes/{quote_id}/send", response_model=dict)
async def send_quote(quote_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    contact = await db.contacts.find_one({"id": quote['contact_id']}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "envoyé", "sent_at": datetime.now(timezone.utc).isoformat()}})
    
    html = f"""
    <h2>Votre devis ALPHA Agency</h2>
    <p>Bonjour {contact.get('first_name', '')},</p>
    <p>Veuillez trouver ci-joint votre devis n°{quote['quote_number']}.</p>
    <p>Montant total: {quote['total']:.2f} € TTC</p>
    <p>Ce devis est valable jusqu'au {quote.get('valid_until', 'Non spécifié')}.</p>
    <p>Cordialement,<br>L'équipe ALPHA Agency</p>
    """
    background_tasks.add_task(send_email_notification, contact['email'], f"Votre devis n°{quote['quote_number']}", html)
    
    return {"message": "Devis envoyé"}

@api_router.post("/quotes/{quote_id}/convert-to-invoice", response_model=dict)
async def convert_quote_to_invoice(quote_id: str, current_user: dict = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    invoice_id = str(uuid.uuid4())
    invoice_number = await get_next_invoice_number()
    
    invoice_doc = {
        "id": invoice_id,
        "invoice_number": invoice_number,
        "quote_id": quote_id,
        "contact_id": quote['contact_id'],
        "items": quote['items'],
        "subtotal": quote['subtotal'],
        "tva": quote['tva'],
        "total": quote['total'],
        "status": "en_attente",
        "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice_doc)
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "accepté"}})
    
    return {"invoice_id": invoice_id, "invoice_number": invoice_number, "message": "Facture créée à partir du devis"}

# ==================== INVOICES ROUTES ====================

async def get_next_invoice_number():
    counter = await db.counters.find_one_and_update(
        {"name": "invoice_number"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True
    )
    return f"FAC-{datetime.now().year}-{str(counter['value']).zfill(4)}"

@api_router.post("/invoices", response_model=dict)
async def create_invoice(invoice: InvoiceCreate, current_user: dict = Depends(get_current_user)):
    invoice_id = str(uuid.uuid4())
    invoice_number = await get_next_invoice_number()
    
    subtotal = sum(item.quantity * item.unit_price for item in invoice.items)
    tva = subtotal * 0.085
    total = subtotal + tva
    
    invoice_doc = {
        "id": invoice_id,
        "invoice_number": invoice_number,
        "quote_id": invoice.quote_id,
        "contact_id": invoice.contact_id,
        "document_type": invoice.document_type or "facture",
        "items": [item.model_dump() for item in invoice.items],
        "subtotal": subtotal,
        "tva": tva,
        "total": total,
        "status": "brouillon",
        "due_date": invoice.due_date or (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "payment_terms": invoice.payment_terms or "30",
        "notes": invoice.notes,
        "conditions": invoice.conditions,
        "bank_details": invoice.bank_details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice_doc)
    return {"id": invoice_id, "invoice_number": invoice_number, "message": "Facture créée"}

@api_router.get("/invoices", response_model=List[dict])
async def get_invoices(current_user: dict = Depends(get_current_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=dict)
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return invoice

class InvoiceUpdate(BaseModel):
    contact_id: Optional[str] = None
    items: Optional[List[QuoteItemCreate]] = None
    due_date: Optional[str] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    conditions: Optional[str] = None
    bank_details: Optional[str] = None
    document_type: Optional[str] = None

@api_router.put("/invoices/{invoice_id}", response_model=dict)
async def update_invoice(invoice_id: str, invoice_update: InvoiceUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    update_data = {}
    for key, value in invoice_update.model_dump().items():
        if value is not None:
            if key == 'items':
                update_data['items'] = [item.model_dump() if hasattr(item, 'model_dump') else item for item in value]
                # Recalculate totals
                subtotal = sum(item.get('quantity', 0) * item.get('unit_price', 0) if isinstance(item, dict) else item.quantity * item.unit_price for item in value)
                tva = subtotal * 0.085
                total = subtotal + tva
                update_data['subtotal'] = subtotal
                update_data['tva'] = tva
                update_data['total'] = total
            else:
                update_data[key] = value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    return {"message": "Facture mise à jour"}

@api_router.delete("/invoices/{invoice_id}", response_model=dict)
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {"message": "Facture supprimée"}

class StatusUpdate(BaseModel):
    status: str

@api_router.put("/invoices/{invoice_id}/status", response_model=dict)
async def update_invoice_status(invoice_id: str, status_update: StatusUpdate, current_user: dict = Depends(get_current_user)):
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

@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    contact = await db.contacts.find_one({"id": invoice['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    pdf_buffer = generate_invoice_pdf(invoice, contact)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=facture_{invoice['invoice_number']}.pdf"}
    )

# ==================== PAYMENTS ROUTES ====================

@api_router.post("/invoices/{invoice_id}/payments", response_model=dict)
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
    
    # Add payment to invoice payments array
    existing_payments = invoice.get('payments', [])
    existing_payments.append(payment_doc)
    
    # Calculate total paid
    total_paid = sum(p['amount'] for p in existing_payments)
    total_due = invoice.get('total', 0)
    remaining = total_due - total_paid
    
    # Auto-update status based on payments
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

@api_router.get("/invoices/{invoice_id}/payments", response_model=List[dict])
async def get_invoice_payments(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get all payments for an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return invoice.get('payments', [])

@api_router.delete("/invoices/{invoice_id}/payments/{payment_id}", response_model=dict)
async def delete_payment(invoice_id: str, payment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a payment from an invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    payments = invoice.get('payments', [])
    payments = [p for p in payments if p['id'] != payment_id]
    
    # Recalculate totals
    total_paid = sum(p['amount'] for p in payments)
    total_due = invoice.get('total', 0)
    remaining = total_due - total_paid
    
    # Update status
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

# ==================== SUBSCRIPTIONS ROUTES ====================

@api_router.post("/subscriptions", response_model=dict)
async def create_subscription(sub: SubscriptionCreate, current_user: dict = Depends(get_current_user)):
    sub_id = str(uuid.uuid4())
    start_date = sub.start_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    sub_doc = {
        "id": sub_id,
        "contact_id": sub.contact_id,
        "plan_name": sub.plan_name,
        "amount": sub.amount,
        "billing_cycle": sub.billing_cycle,
        "status": "actif",
        "start_date": start_date,
        "next_billing_date": (datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=30)).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subscriptions.insert_one(sub_doc)
    return {"id": sub_id, "message": "Abonnement créé"}

@api_router.get("/subscriptions", response_model=List[dict])
async def get_subscriptions(current_user: dict = Depends(get_current_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    subs = await db.subscriptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return subs

@api_router.put("/subscriptions/{sub_id}/status", response_model=dict)
async def update_subscription_status(sub_id: str, status: str, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["actif", "suspendu", "annulé", "expiré"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs possibles: {valid_statuses}")
    
    result = await db.subscriptions.update_one({"id": sub_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    return {"message": f"Statut mis à jour: {status}"}

# ==================== TASKS ROUTES ====================

# ==================== BLOG ROUTES ====================

@api_router.post("/blog", response_model=dict)
async def create_blog_post(post: BlogPostCreate, current_user: dict = Depends(get_current_user)):
    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        **post.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blog_posts.insert_one(post_doc)
    return {"id": post_id, "message": "Article créé"}

@api_router.get("/blog", response_model=List[dict])
async def get_blog_posts(published_only: bool = True):
    query = {"published": True} if published_only else {}
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return posts

@api_router.get("/blog/{slug}", response_model=dict)
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return post

# ==================== PORTFOLIO ROUTES ====================

@api_router.post("/portfolio", response_model=dict)
async def create_portfolio_item(item: PortfolioCreate, current_user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    item_doc = {
        "id": item_id,
        **item.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolio.insert_one(item_doc)
    return {"id": item_id, "message": "Réalisation ajoutée"}

@api_router.get("/portfolio", response_model=List[dict])
async def get_portfolio(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    items = await db.portfolio.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items

@api_router.put("/portfolio/{item_id}", response_model=dict)
async def update_portfolio_item(item_id: str, item: PortfolioCreate, current_user: dict = Depends(get_current_user)):
    update_data = item.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.portfolio.update_one({"id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Réalisation non trouvée")
    return {"message": "Réalisation mise à jour"}

@api_router.delete("/portfolio/{item_id}", response_model=dict)
async def delete_portfolio_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.portfolio.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Réalisation non trouvée")
    return {"message": "Réalisation supprimée"}

# ==================== LEAD FORM (PUBLIC) ====================

@api_router.post("/lead", response_model=dict)
async def submit_lead_form(lead: LeadFormSubmission, background_tasks: BackgroundTasks):
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "project_type": lead.project_type,
        "budget": lead.budget,
        "message": lead.message,
        "source": "website",
        "status": "nouveau",
        "score": "chaud" if lead.budget and "+" in str(lead.budget) else "tiède",
        "tags": [lead.project_type] if lead.project_type else [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    
    # Send notification
    background_tasks.add_task(send_new_lead_notification, contact_doc)
    
    return {"message": "Votre demande a été envoyée avec succès. Nous vous recontacterons rapidement.", "contact_id": contact_id}

# ==================== KPI / DASHBOARD ====================

@api_router.get("/dashboard/stats", response_model=dict)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Counts
    total_contacts = await db.contacts.count_documents({})
    new_leads = await db.contacts.count_documents({"status": "nouveau"})
    total_opportunities = await db.opportunities.count_documents({})
    won_opportunities = await db.opportunities.count_documents({"status": "gagné"})
    
    # Revenue
    pipeline_revenue = await db.opportunities.aggregate([
        {"$match": {"status": {"$in": ["nouveau", "qualifié", "devis_envoyé"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    signed_revenue = await db.opportunities.aggregate([
        {"$match": {"status": "gagné"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # MRR from subscriptions
    mrr = await db.subscriptions.aggregate([
        {"$match": {"status": "actif"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Quotes stats
    pending_quotes = await db.quotes.count_documents({"status": {"$in": ["brouillon", "envoyé"]}})
    accepted_quotes = await db.quotes.count_documents({"status": "accepté"})
    
    # Invoices stats - updated for new status values
    brouillon_invoices = await db.invoices.count_documents({"status": "brouillon"})
    pending_invoices = await db.invoices.count_documents({"status": {"$in": ["en_attente", "envoyee"]}})
    overdue_invoices = await db.invoices.count_documents({"status": "en_retard"})
    paid_invoices = await db.invoices.count_documents({"status": "payée"})
    
    # Invoices totals
    total_invoiced = await db.invoices.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(1)
    total_paid = await db.invoices.aggregate([
        {"$match": {"status": "payée"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(1)
    
    # KPIs from settings
    kpis = await db.settings.find_one({"type": "kpis"}, {"_id": 0})
    
    # Leads trend for the last 6 months (based on contacts created_at)
    leads_trend = []
    now = datetime.now(timezone.utc)
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        count = await db.contacts.count_documents({
            "created_at": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        })
        month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
        leads_trend.append({"name": month_names[month_start.month - 1], "leads": count})
    
    # Pipeline stages distribution
    pipeline_stages = [
        {"name": "Nouveau", "value": await db.opportunities.count_documents({"status": "nouveau"}), "color": "#3B82F6"},
        {"name": "Qualifié", "value": await db.opportunities.count_documents({"status": "qualifié"}), "color": "#8B5CF6"},
        {"name": "Devis", "value": await db.opportunities.count_documents({"status": "devis_envoyé"}), "color": "#F59E0B"},
        {"name": "Gagné", "value": won_opportunities, "color": "#10B981"}
    ]
    
    return {
        "contacts": {
            "total": total_contacts,
            "new_leads": new_leads
        },
        "opportunities": {
            "total": total_opportunities,
            "won": won_opportunities,
            "pipeline_value": pipeline_revenue[0]['total'] if pipeline_revenue else 0,
            "signed_revenue": signed_revenue[0]['total'] if signed_revenue else 0
        },
        "mrr": mrr[0]['total'] if mrr else 0,
        "quotes": {
            "pending": pending_quotes,
            "accepted": accepted_quotes
        },
        "invoices": {
            "brouillon": brouillon_invoices,
            "pending": pending_invoices,
            "overdue": overdue_invoices,
            "paid": paid_invoices,
            "total_invoiced": total_invoiced[0]['total'] if total_invoiced else 0,
            "total_paid": total_paid[0]['total'] if total_paid else 0
        },
        "kpis": kpis.get("data", {}) if kpis else {"sessions": 0, "leads": 0, "conversion_rate": 0},
        "leads_trend": leads_trend,
        "pipeline_stages": pipeline_stages
    }

@api_router.put("/dashboard/kpis", response_model=dict)
async def update_kpis(kpis: KPIUpdate, current_user: dict = Depends(get_current_user)):
    kpi_data = {k: v for k, v in kpis.model_dump().items() if v is not None}
    await db.settings.update_one(
        {"type": "kpis"},
        {"$set": {"data": kpi_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "KPIs mis à jour"}

@api_router.get("/dashboard/pipeline", response_model=dict)
async def get_pipeline(current_user: dict = Depends(get_current_user)):
    statuses = ["nouveau", "qualifié", "devis_envoyé", "gagné", "perdu"]
    pipeline = {}
    
    for status in statuses:
        opps = await db.opportunities.find({"status": status}, {"_id": 0}).to_list(100)
        # Enrich with contact info
        for opp in opps:
            contact = await db.contacts.find_one({"id": opp.get("contact_id")}, {"_id": 0, "first_name": 1, "last_name": 1, "company": 1})
            opp["contact"] = contact if contact else {}
        pipeline[status] = opps
    
    return pipeline

# ==================== STRIPE PAYMENT ====================

@api_router.post("/payments/create-checkout", response_model=dict)
async def create_checkout_session(request: Request, plan: str = "site_90", origin_url: str = None):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    PLANS = {
        "site_90": {"name": "Site Web 90€/mois", "amount": 90.0},
        "cm_pack": {"name": "Pack Community Management", "amount": 450.0},
        "photo_pack": {"name": "Pack Photo", "amount": 350.0},
        "video_pack": {"name": "Pack Vidéo", "amount": 800.0},
        "ads_pack": {"name": "Pack Publicité Digitale", "amount": 500.0}
    }
    
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    host_url = origin_url or str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{host_url}paiement/succes?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}paiement/annule"
    
    checkout_request = CheckoutSessionRequest(
        amount=PLANS[plan]["amount"],
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"plan": plan, "plan_name": PLANS[plan]["name"]}
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "plan": plan,
        "plan_name": PLANS[plan]["name"],
        "amount": PLANS[plan]["amount"],
        "currency": "eur",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}", response_model=dict)
async def get_payment_status(session_id: str):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": status.status, "payment_status": status.payment_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total / 100,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        await db.payment_transactions.update_one(
            {"session_id": webhook_response.session_id},
            {"$set": {
                "status": webhook_response.event_type,
                "payment_status": webhook_response.payment_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== SETTINGS ROUTES ====================

class SettingsCompany(BaseModel):
    name: Optional[str] = None
    commercial_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    siren: Optional[str] = None
    siret: Optional[str] = None
    capital: Optional[str] = None
    tva_number: Optional[str] = None

class SettingsSocialLinks(BaseModel):
    linkedin: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None

class SettingsLegalTexts(BaseModel):
    mentions_legales: Optional[str] = None
    politique_confidentialite: Optional[str] = None
    politique_cookies: Optional[str] = None

class SettingsIntegrations(BaseModel):
    ga4_id: Optional[str] = None
    resend_api_key: Optional[str] = None
    stripe_api_key: Optional[str] = None

@api_router.get("/settings", response_model=dict)
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"type": "global"}, {"_id": 0})
    if not settings:
        settings = {
            "company": COMPANY_INFO,
            "social_links": {
                "linkedin": "https://linkedin.com",
                "instagram": "https://instagram.com",
                "facebook": "https://facebook.com",
                "twitter": "",
                "youtube": ""
            },
            "legal_texts": {
                "mentions_legales": "",
                "politique_confidentialite": "",
                "politique_cookies": ""
            },
            "integrations": {
                "ga4_id": "",
                "resend_api_key": "",
                "stripe_api_key": ""
            }
        }
    return settings

@api_router.put("/settings/company", response_model=dict)
async def update_settings_company(company: SettingsCompany, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in company.model_dump().items() if v is not None}
    await db.settings.update_one(
        {"type": "global"},
        {"$set": {"company": update_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Informations entreprise mises à jour"}

@api_router.put("/settings/social-links", response_model=dict)
async def update_settings_social(social: SettingsSocialLinks, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in social.model_dump().items() if v is not None}
    await db.settings.update_one(
        {"type": "global"},
        {"$set": {"social_links": update_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Réseaux sociaux mis à jour"}

@api_router.put("/settings/legal-texts", response_model=dict)
async def update_settings_legal(legal: SettingsLegalTexts, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in legal.model_dump().items() if v is not None}
    await db.settings.update_one(
        {"type": "global"},
        {"$set": {"legal_texts": update_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Textes légaux mis à jour"}

@api_router.put("/settings/integrations", response_model=dict)
async def update_settings_integrations(integrations: SettingsIntegrations, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in integrations.model_dump().items() if v is not None}
    await db.settings.update_one(
        {"type": "global"},
        {"$set": {"integrations": update_data, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Intégrations mises à jour"}

# ==================== CLOUDINARY UPLOAD ROUTES ====================

from fastapi import UploadFile, File

@api_router.post("/upload/image", response_model=dict)
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload image to Cloudinary"""
    if not CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=500, detail="Cloudinary non configuré")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé. Formats acceptés: JPEG, PNG, GIF, WEBP")
    
    try:
        # Read file content
        content = await file.read()
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            content,
            folder="alpha-agency",
            resource_type="image"
        )
        
        return {
            "url": result['secure_url'],
            "public_id": result['public_id'],
            "width": result.get('width'),
            "height": result.get('height'),
            "format": result.get('format')
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")

@api_router.post("/upload/document", response_model=dict)
async def upload_document(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload document (PDF, etc.) to Cloudinary"""
    if not CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=500, detail="Cloudinary non configuré")
    
    allowed_types = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé. Formats acceptés: PDF, DOC, DOCX")
    
    try:
        content = await file.read()
        result = cloudinary.uploader.upload(
            content,
            folder="alpha-agency/documents",
            resource_type="raw"
        )
        return {
            "url": result['secure_url'],
            "public_id": result['public_id']
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")

@api_router.post("/upload/audio", response_model=dict)
async def upload_audio(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload audio file to Cloudinary"""
    if not CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=500, detail="Cloudinary non configuré")
    
    allowed_types = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé. Formats acceptés: MP3, WAV, OGG")
    
    try:
        content = await file.read()
        result = cloudinary.uploader.upload(
            content,
            folder="alpha-agency/audio",
            resource_type="video"  # Cloudinary uses 'video' for audio too
        )
        return {
            "url": result['secure_url'],
            "public_id": result['public_id'],
            "duration": result.get('duration')
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")

@api_router.delete("/upload/{public_id:path}", response_model=dict)
async def delete_upload(public_id: str, current_user: dict = Depends(get_current_user)):
    """Delete file from Cloudinary"""
    if not CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=500, detail="Cloudinary non configuré")
    
    try:
        result = cloudinary.uploader.destroy(public_id)
        return {"message": "Fichier supprimé", "result": result}
    except Exception as e:
        logger.error(f"Cloudinary delete error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# ==================== DOCUMENTS PDF ROUTES ====================

# Document types and templates
DOCUMENT_TYPES = {
    "lettre_mission": {
        "name": "Lettre de mission",
        "templates": [
            {"id": "lm_site_web", "name": "Lettre de mission – Site web"},
            {"id": "lm_community_management", "name": "Lettre de mission – Community management"},
            {"id": "lm_meta_ads", "name": "Lettre de mission – Publicité Meta"},
            {"id": "lm_google_ads", "name": "Lettre de mission – Publicité Google Ads"},
            {"id": "lm_newsletter", "name": "Lettre de mission – Gestion de newsletter"},
            {"id": "lm_blog", "name": "Lettre de mission – Rédaction & publication d'articles de blog"}
        ]
    },
    "fiche_contact": {
        "name": "Fiche de contact",
        "templates": [
            {"id": "fc_community_management", "name": "Fiche de contact – Community management"},
            {"id": "fc_site_web_infographie", "name": "Fiche de contact – Site web + infographie"}
        ]
    }
}

class DocumentCreate(BaseModel):
    type: str  # lettre_mission or fiche_contact
    template_id: str
    internal_name: str
    client_name: str
    client_company: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: Optional[str] = None
    tarif: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    status: str = "brouillon"  # brouillon, finalisé

class DocumentUpdate(BaseModel):
    internal_name: Optional[str] = None
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: Optional[str] = None
    tarif: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

@api_router.get("/documents/types", response_model=dict)
async def get_document_types(current_user: dict = Depends(get_current_user)):
    """Get available document types and templates"""
    return DOCUMENT_TYPES

@api_router.post("/documents", response_model=dict)
async def create_document(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    """Create a new document"""
    if doc.type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Type de document invalide")
    
    valid_templates = [t['id'] for t in DOCUMENT_TYPES[doc.type]['templates']]
    if doc.template_id not in valid_templates:
        raise HTTPException(status_code=400, detail="Modèle invalide pour ce type de document")
    
    doc_id = str(uuid.uuid4())
    template_name = next((t['name'] for t in DOCUMENT_TYPES[doc.type]['templates'] if t['id'] == doc.template_id), "")
    
    doc_data = {
        "id": doc_id,
        "type": doc.type,
        "type_name": DOCUMENT_TYPES[doc.type]['name'],
        "template_id": doc.template_id,
        "template_name": template_name,
        "internal_name": doc.internal_name,
        "client_name": doc.client_name,
        "client_company": doc.client_company,
        "client_email": doc.client_email,
        "client_phone": doc.client_phone,
        "client_address": doc.client_address,
        "start_date": doc.start_date,
        "end_date": doc.end_date,
        "duration": doc.duration,
        "tarif": doc.tarif,
        "description": doc.description,
        "custom_fields": doc.custom_fields or {},
        "status": doc.status,
        "created_by": current_user['user_id'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.documents.insert_one(doc_data)
    return {"id": doc_id, "message": "Document créé avec succès"}

@api_router.get("/documents", response_model=List[dict])
async def get_documents(
    current_user: dict = Depends(get_current_user),
    type: Optional[str] = None,
    template_id: Optional[str] = None,
    client_name: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get all documents with optional filters"""
    query = {}
    if type:
        query["type"] = type
    if template_id:
        query["template_id"] = template_id
    if client_name:
        query["client_name"] = {"$regex": client_name, "$options": "i"}
    if status:
        query["status"] = status
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    # Archive: only show documents from last 3 months by default
    three_months_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    if "created_at" not in query:
        query["created_at"] = {"$gte": three_months_ago}
    
    documents = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return documents

@api_router.get("/documents/{doc_id}", response_model=dict)
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single document"""
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    return doc

@api_router.put("/documents/{doc_id}", response_model=dict)
async def update_document(doc_id: str, doc_update: DocumentUpdate, current_user: dict = Depends(get_current_user)):
    """Update a document"""
    existing = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    update_data = {k: v for k, v in doc_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.documents.update_one({"id": doc_id}, {"$set": update_data})
    return {"message": "Document mis à jour"}

@api_router.delete("/documents/{doc_id}", response_model=dict)
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a document"""
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    return {"message": "Document supprimé"}

@api_router.get("/documents/{doc_id}/pdf")
async def generate_document_pdf(doc_id: str, current_user: dict = Depends(get_current_user)):
    """Generate PDF for a document"""
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Generate PDF
    buffer = BytesIO()
    pdf_doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#CE0202'), spaceAfter=20)
    elements.append(Paragraph(doc['template_name'], title_style))
    elements.append(Spacer(1, 12))
    
    # Company info
    company_style = ParagraphStyle('Company', parent=styles['Normal'], fontSize=10)
    elements.append(Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b>", company_style))
    elements.append(Paragraph(f"{COMPANY_INFO['address']}", company_style))
    elements.append(Paragraph(f"Tél: {COMPANY_INFO['phone']} - Email: {COMPANY_INFO['email']}", company_style))
    elements.append(Spacer(1, 24))
    
    # Client info
    elements.append(Paragraph("<b>Client :</b>", styles['Heading3']))
    elements.append(Paragraph(f"Nom : {doc['client_name']}", styles['Normal']))
    if doc.get('client_company'):
        elements.append(Paragraph(f"Entreprise : {doc['client_company']}", styles['Normal']))
    if doc.get('client_email'):
        elements.append(Paragraph(f"Email : {doc['client_email']}", styles['Normal']))
    if doc.get('client_phone'):
        elements.append(Paragraph(f"Téléphone : {doc['client_phone']}", styles['Normal']))
    if doc.get('client_address'):
        elements.append(Paragraph(f"Adresse : {doc['client_address']}", styles['Normal']))
    elements.append(Spacer(1, 24))
    
    # Mission details
    elements.append(Paragraph("<b>Détails de la mission :</b>", styles['Heading3']))
    if doc.get('start_date'):
        elements.append(Paragraph(f"Date de début : {doc['start_date']}", styles['Normal']))
    if doc.get('end_date'):
        elements.append(Paragraph(f"Date de fin : {doc['end_date']}", styles['Normal']))
    if doc.get('duration'):
        elements.append(Paragraph(f"Durée : {doc['duration']}", styles['Normal']))
    if doc.get('tarif'):
        elements.append(Paragraph(f"Tarif : {doc['tarif']}", styles['Normal']))
    elements.append(Spacer(1, 12))
    
    # Description
    if doc.get('description'):
        elements.append(Paragraph("<b>Description :</b>", styles['Heading3']))
        elements.append(Paragraph(doc['description'], styles['Normal']))
        elements.append(Spacer(1, 24))
    
    # Custom fields
    if doc.get('custom_fields'):
        elements.append(Paragraph("<b>Informations complémentaires :</b>", styles['Heading3']))
        for key, value in doc['custom_fields'].items():
            elements.append(Paragraph(f"{key} : {value}", styles['Normal']))
        elements.append(Spacer(1, 24))
    
    # Placeholder for legal text
    elements.append(Spacer(1, 48))
    placeholder_style = ParagraphStyle('Placeholder', parent=styles['Normal'], fontSize=9, textColor=colors.grey, borderColor=colors.grey, borderWidth=1, borderPadding=10)
    elements.append(Paragraph("[Emplacement réservé pour les clauses juridiques - À compléter]", placeholder_style))
    
    # Signatures
    elements.append(Spacer(1, 48))
    sig_data = [
        ["Pour Alpha Agency", "Pour le Client"],
        ["", ""],
        ["Date : _______________", "Date : _______________"],
        ["Signature :", "Signature :"],
        ["", ""]
    ]
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(sig_table)
    
    # Footer
    elements.append(Spacer(1, 24))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Paragraph(f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", footer_style))
    elements.append(Paragraph(f"{COMPANY_INFO['commercial_name']} - {COMPANY_INFO.get('legal_form', 'SASU')}", footer_style))
    
    pdf_doc.build(elements)
    buffer.seek(0)
    
    filename = f"{doc['internal_name'].replace(' ', '_')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/documents/export-zip", response_model=dict)
async def export_documents_zip(
    current_user: dict = Depends(get_current_user),
    type: Optional[str] = None,
    client_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Export multiple documents as ZIP (returns download info)"""
    # For now, return document IDs that would be included
    query = {}
    if type:
        query["type"] = type
    if client_name:
        query["client_name"] = {"$regex": client_name, "$options": "i"}
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    
    documents = await db.documents.find(query, {"_id": 0, "id": 1, "internal_name": 1}).to_list(100)
    
    return {
        "message": f"{len(documents)} documents trouvés",
        "documents": documents,
        "note": "Utilisez GET /api/documents/{id}/pdf pour télécharger chaque document"
    }

# ==================== SAVED SERVICES ROUTES ====================

class ServiceCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    price: float

class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None

@api_router.post("/services", response_model=dict)
async def create_service(service: ServiceCreate, current_user: dict = Depends(get_current_user)):
    """Create a saved service for invoicing"""
    service_id = str(uuid.uuid4())
    service_doc = {
        "id": service_id,
        "title": service.title,
        "description": service.description or "",
        "price": service.price,
        "created_by": current_user['user_id'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.services.insert_one(service_doc)
    return {"id": service_id, "message": "Service créé avec succès"}

@api_router.get("/services", response_model=List[dict])
async def get_services(current_user: dict = Depends(get_current_user)):
    """Get all saved services"""
    services = await db.services.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return services

@api_router.get("/services/{service_id}", response_model=dict)
async def get_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single service"""
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    return service

@api_router.put("/services/{service_id}", response_model=dict)
async def update_service(service_id: str, service_update: ServiceUpdate, current_user: dict = Depends(get_current_user)):
    """Update a service"""
    existing = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    
    update_data = {k: v for k, v in service_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.services.update_one({"id": service_id}, {"$set": update_data})
    return {"message": "Service mis à jour"}

@api_router.delete("/services/{service_id}", response_model=dict)
async def delete_service(service_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a service"""
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service non trouvé")
    return {"message": "Service supprimé"}

# ==================== TASKS ROUTES (Notion-style) ====================

class TaskCreateModel(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"  # todo, in_progress, done
    priority: Optional[str] = "medium"  # low, medium, high, urgent
    category: Optional[str] = "general"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None  # Lien facultatif vers un contact

class TaskUpdateModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None
    completed_at: Optional[str] = None

@api_router.get("/tasks", response_model=List[dict])
async def get_tasks(status: Optional[str] = None, priority: Optional[str] = None, contact_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all tasks with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if contact_id:
        query["contact_id"] = contact_id
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tasks
    return tasks

@api_router.post("/tasks", response_model=dict)
async def create_task(task: TaskCreateModel, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        **task.model_dump(),
        "created_by": current_user['user_id'],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    await db.tasks.insert_one(task_doc)
    return {"id": task_id, "message": "Tâche créée"}

@api_router.get("/tasks/{task_id}", response_model=dict)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single task"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return task

@api_router.put("/tasks/{task_id}", response_model=dict)
async def update_task(task_id: str, task_update: TaskUpdateModel, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Set completed_at when status changes to done
    if update_data.get("status") == "done" and existing.get("status") != "done":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif update_data.get("status") != "done":
        update_data["completed_at"] = None
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    return {"message": "Tâche mise à jour"}

@api_router.delete("/tasks/{task_id}", response_model=dict)
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return {"message": "Tâche supprimée"}

@api_router.get("/tasks/stats/summary", response_model=dict)
async def get_tasks_stats(current_user: dict = Depends(get_current_user)):
    """Get task statistics"""
    total = await db.tasks.count_documents({})
    todo = await db.tasks.count_documents({"status": "todo"})
    in_progress = await db.tasks.count_documents({"status": "in_progress"})
    done = await db.tasks.count_documents({"status": "done"})
    
    # Overdue tasks
    now = datetime.now(timezone.utc).isoformat()
    overdue = await db.tasks.count_documents({
        "status": {"$ne": "done"},
        "due_date": {"$lt": now, "$ne": None}
    })
    
    return {
        "total": total,
        "todo": todo,
        "in_progress": in_progress,
        "done": done,
        "overdue": overdue,
        "completion_rate": round((done / total * 100) if total > 0 else 0, 1)
    }

# ==================== BUDGET ROUTES ====================

class BudgetEntryCreate(BaseModel):
    type: str  # income, expense
    amount: float
    category: str
    description: Optional[str] = ""
    date: Optional[str] = None
    recurring: Optional[bool] = False
    recurring_frequency: Optional[str] = None  # monthly, weekly, yearly

class BudgetEntryUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    recurring: Optional[bool] = None
    recurring_frequency: Optional[str] = None

@api_router.get("/budget", response_model=List[dict])
async def get_budget_entries(
    type: Optional[str] = None,
    category: Optional[str] = None,
    month: Optional[str] = None,  # Format: YYYY-MM
    current_user: dict = Depends(get_current_user)
):
    """Get budget entries with optional filters"""
    query = {}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    entries = await db.budget.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return entries

@api_router.post("/budget", response_model=dict)
async def create_budget_entry(entry: BudgetEntryCreate, current_user: dict = Depends(get_current_user)):
    """Create a budget entry"""
    entry_id = str(uuid.uuid4())
    entry_doc = {
        "id": entry_id,
        **entry.model_dump(),
        "date": entry.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_by": current_user['user_id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.budget.insert_one(entry_doc)
    return {"id": entry_id, "message": "Entrée créée"}

@api_router.put("/budget/{entry_id}", response_model=dict)
async def update_budget_entry(entry_id: str, entry_update: BudgetEntryUpdate, current_user: dict = Depends(get_current_user)):
    """Update a budget entry"""
    existing = await db.budget.find_one({"id": entry_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    
    update_data = {k: v for k, v in entry_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.budget.update_one({"id": entry_id}, {"$set": update_data})
    return {"message": "Entrée mise à jour"}

@api_router.delete("/budget/{entry_id}", response_model=dict)
async def delete_budget_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a budget entry"""
    result = await db.budget.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    return {"message": "Entrée supprimée"}

@api_router.get("/budget/summary", response_model=dict)
async def get_budget_summary(month: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get budget summary with totals by category"""
    query = {}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    else:
        # Default to current month
        current_month = datetime.now().strftime("%Y-%m")
        query["date"] = {"$regex": f"^{current_month}"}
    
    entries = await db.budget.find(query, {"_id": 0}).to_list(1000)
    
    total_income = sum(e["amount"] for e in entries if e["type"] == "income")
    total_expense = sum(e["amount"] for e in entries if e["type"] == "expense")
    
    # Group by category
    income_by_category = {}
    expense_by_category = {}
    
    for entry in entries:
        cat = entry["category"]
        if entry["type"] == "income":
            income_by_category[cat] = income_by_category.get(cat, 0) + entry["amount"]
        else:
            expense_by_category[cat] = expense_by_category.get(cat, 0) + entry["amount"]
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "income_by_category": income_by_category,
        "expense_by_category": expense_by_category,
        "entries_count": len(entries)
    }

@api_router.get("/budget/monthly-chart", response_model=list)
async def get_monthly_chart_data(year: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    """Get monthly income/expense data for charts"""
    if not year:
        year = datetime.now().year
    
    months_data = []
    month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
    
    for month in range(1, 13):
        month_str = f"{year}-{str(month).zfill(2)}"
        entries = await db.budget.find(
            {"date": {"$regex": f"^{month_str}"}},
            {"_id": 0}
        ).to_list(1000)
        
        income = sum(e["amount"] for e in entries if e["type"] == "income")
        expense = sum(e["amount"] for e in entries if e["type"] == "expense")
        
        months_data.append({
            "name": month_names[month - 1],
            "month": month_str,
            "income": income,
            "expense": expense,
            "balance": income - expense
        })
    
    return months_data

# ==================== ENHANCED INVOICE PDF ====================

def generate_professional_invoice_pdf(invoice: dict, contact: dict) -> BytesIO:
    """Generate a professional invoice PDF with logo and better formatting"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    elements = []
    
    # Custom styles
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#666666'))
    title_style = ParagraphStyle('InvoiceTitle', parent=styles['Heading1'], fontSize=28, textColor=colors.HexColor('#CE0202'), alignment=TA_RIGHT)
    section_title = ParagraphStyle('SectionTitle', parent=styles['Heading3'], fontSize=11, textColor=colors.HexColor('#1A1A1A'), spaceBefore=12, spaceAfter=6)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#333333'))
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#666666'))
    
    # Document type
    doc_type = invoice.get('document_type', 'facture')
    doc_label = 'DEVIS' if doc_type == 'devis' else 'FACTURE'
    
    # Header with logo and company info
    header_data = [
        [
            Paragraph(f"<b>{COMPANY_INFO['commercial_name']}</b><br/>{COMPANY_INFO['address']}<br/>Tél: {COMPANY_INFO['phone']}<br/>Email: {COMPANY_INFO['email']}", header_style),
            Paragraph(f"<font size='28' color='#CE0202'><b>{doc_label}</b></font><br/><font size='12'>{invoice['invoice_number']}</font>", ParagraphStyle('Right', parent=styles['Normal'], alignment=TA_RIGHT))
        ]
    ]
    header_table = Table(header_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # Dates row
    created_date = invoice.get('created_at', '')[:10] if invoice.get('created_at') else datetime.now().strftime('%Y-%m-%d')
    due_date = invoice.get('due_date', '')
    
    date_data = [
        [
            Paragraph(f"<b>Date d'émission:</b> {created_date}", normal_style),
            Paragraph(f"<b>Échéance:</b> {due_date if due_date else 'Non spécifiée'}", normal_style)
        ]
    ]
    date_table = Table(date_data, colWidths=[8.5*cm, 8.5*cm])
    date_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8F8F8')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(date_table)
    elements.append(Spacer(1, 0.6*cm))
    
    # Client info box
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip() or "Client"
    client_company = contact.get('company', '')
    client_email = contact.get('email', '')
    client_phone = contact.get('phone', '')
    
    client_text = f"<b>{client_name}</b>"
    if client_company:
        client_text += f"<br/>{client_company}"
    if client_email:
        client_text += f"<br/>{client_email}"
    if client_phone:
        client_text += f"<br/>Tél: {client_phone}"
    
    client_data = [
        [Paragraph("<b>FACTURER À:</b>", ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#666666')))],
        [Paragraph(client_text, normal_style)]
    ]
    client_table = Table(client_data, colWidths=[8*cm])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8F8F8')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # Items table
    items = invoice.get('items', [])
    table_data = [
        [
            Paragraph('<b>DESCRIPTION</b>', ParagraphStyle('TableHeader', fontSize=9, textColor=colors.white)),
            Paragraph('<b>QTÉ</b>', ParagraphStyle('TableHeader', fontSize=9, textColor=colors.white, alignment=TA_CENTER)),
            Paragraph('<b>PRIX UNIT. HT</b>', ParagraphStyle('TableHeader', fontSize=9, textColor=colors.white, alignment=TA_RIGHT)),
            Paragraph('<b>TOTAL HT</b>', ParagraphStyle('TableHeader', fontSize=9, textColor=colors.white, alignment=TA_RIGHT))
        ]
    ]
    
    subtotal = 0
    for item in items:
        qty = item.get('quantity', 1)
        unit_price = item.get('unit_price', 0)
        total = qty * unit_price
        subtotal += total
        
        # Handle multi-line descriptions
        desc = item.get('description', '').replace('\n', '<br/>')
        
        table_data.append([
            Paragraph(desc, ParagraphStyle('ItemDesc', fontSize=9)),
            Paragraph(str(qty), ParagraphStyle('ItemQty', fontSize=9, alignment=TA_CENTER)),
            Paragraph(f"{unit_price:.2f} €", ParagraphStyle('ItemPrice', fontSize=9, alignment=TA_RIGHT)),
            Paragraph(f"{total:.2f} €", ParagraphStyle('ItemTotal', fontSize=9, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
        ])
    
    tva = subtotal * 0.085
    total_ttc = subtotal + tva
    
    items_table = Table(table_data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A1A1A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 1), (-1, -1), 0.5, colors.HexColor('#E5E5E5')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAFAFA')]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.3*cm))
    
    # Totals
    totals_data = [
        ['', '', 'Sous-total HT:', f"{subtotal:.2f} €"],
        ['', '', 'TVA (8.5%):', f"{tva:.2f} €"],
        ['', '', 'TOTAL TTC:', f"{total_ttc:.2f} €"]
    ]
    
    totals_table = Table(totals_data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TEXTCOLOR', (2, 2), (2, 2), colors.HexColor('#CE0202')),
        ('TEXTCOLOR', (3, 2), (3, 2), colors.HexColor('#CE0202')),
        ('FONTSIZE', (2, 2), (3, 2), 12),
        ('LINEABOVE', (2, 2), (3, 2), 2, colors.HexColor('#CE0202')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # Notes
    notes = invoice.get('notes', '')
    if notes:
        elements.append(Paragraph("<b>Notes:</b>", section_title))
        elements.append(Paragraph(notes, normal_style))
        elements.append(Spacer(1, 0.4*cm))
    
    # Payment conditions and bank details
    conditions = invoice.get('conditions', '')
    bank_details = invoice.get('bank_details', '')
    
    footer_data = []
    if conditions:
        footer_data.append([Paragraph("<b>Conditions de paiement:</b><br/>" + conditions.replace('\n', '<br/>'), small_style)])
    if bank_details:
        footer_data.append([Paragraph("<b>Coordonnées bancaires:</b><br/><font face='Courier'>" + bank_details.replace('\n', '<br/>') + "</font>", small_style)])
    
    if footer_data:
        elements.append(Spacer(1, 0.3*cm))
        footer_table = Table(footer_data, colWidths=[17*cm])
        footer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8F8F8')),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(footer_table)
    
    # Legal footer
    elements.append(Spacer(1, 1*cm))
    legal_style = ParagraphStyle('Legal', parent=styles['Normal'], fontSize=7, textColor=colors.HexColor('#999999'), alignment=TA_CENTER)
    elements.append(Paragraph(f"{COMPANY_INFO['commercial_name']} - {COMPANY_INFO.get('legal_form', 'SASU')} - SIRET: {COMPANY_INFO.get('siret', 'À compléter')}", legal_style))
    elements.append(Paragraph(f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", legal_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

# Override invoice PDF endpoint with professional version
@api_router.get("/invoices/{invoice_id}/pdf")
async def download_professional_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    contact = await db.contacts.find_one({"id": invoice['contact_id']}, {"_id": 0})
    if not contact:
        contact = {"first_name": "", "last_name": "", "email": "", "company": ""}
    
    pdf_buffer = generate_professional_invoice_pdf(invoice, contact)
    doc_type = invoice.get('document_type', 'facture')
    prefix = 'devis' if doc_type == 'devis' else 'facture'
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={prefix}_{invoice['invoice_number']}.pdf"}
    )

# ==================== ADMIN USERS MANAGEMENT ====================

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

@api_router.get("/admin/users", response_model=List[dict])
async def get_admin_users(current_user: dict = Depends(get_current_user)):
    """Get all admin users (super_admin only)"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user or user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users

@api_router.put("/admin/users/{user_id}", response_model=dict)
async def update_admin_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update an admin user (super_admin only)"""
    admin = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not admin or admin.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Cannot change super_admin role
    if user.get('role') == 'super_admin' and user_data.role and user_data.role != 'super_admin':
        raise HTTPException(status_code=400, detail="Impossible de modifier le rôle du super admin")
    
    # Prepare update data
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "Utilisateur mis à jour"}

@api_router.delete("/admin/users/{user_id}", response_model=dict)
async def delete_admin_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an admin user (super_admin only)"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user or user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if user_id == current_user['user_id']:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    # Check if target is super_admin
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if target_user and target_user.get('role') == 'super_admin':
        raise HTTPException(status_code=400, detail="Impossible de supprimer un super admin")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Utilisateur supprimé"}

@api_router.post("/auth/forgot-password", response_model=dict)
async def forgot_password(request: PasswordResetRequest, background_tasks: BackgroundTasks):
    """Request password reset - sends email with reset token"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."}
    
    # Generate reset token (valid for 1 hour)
    reset_token = str(uuid.uuid4())
    reset_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.users.update_one(
        {"email": request.email},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": reset_expiry.isoformat()
        }}
    )
    
    # Send reset email
    frontend_url = os.environ.get('FRONTEND_URL', 'https://crm-enhance-10.preview.emergentagent.com')
    reset_link = f"{frontend_url}/alpha-admin-2024/reset-password?token={reset_token}"
    html_content = f"""
    <h2>Réinitialisation de mot de passe - Alpha Agency</h2>
    <p>Bonjour {user.get('full_name', '')},</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
    <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
    <p><a href="{reset_link}" style="background-color: #CE0202; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
    <p>Ce lien est valable pendant 1 heure.</p>
    <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    <br>
    <p>L'équipe Alpha Agency</p>
    """
    
    background_tasks.add_task(send_email_notification, request.email, "Réinitialisation de mot de passe - Alpha Agency", html_content)
    
    return {"message": "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."}

@api_router.post("/auth/reset-password", response_model=dict)
async def reset_password(request: PasswordResetConfirm):
    """Reset password using token from email"""
    user = await db.users.find_one({"reset_token": request.token}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    # Check token expiry
    expiry = user.get('reset_token_expiry')
    if expiry:
        expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expiry_dt:
            raise HTTPException(status_code=400, detail="Token expiré. Veuillez demander un nouveau lien.")
    
    # Validate password strength
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 8 caractères")
    
    # Update password and clear reset token
    await db.users.update_one(
        {"reset_token": request.token},
        {"$set": {
            "password": hash_password(request.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$unset": {
            "reset_token": "",
            "reset_token_expiry": ""
        }}
    )
    
    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}

@api_router.put("/auth/change-password", response_model=dict)
async def change_password(request: ChangePassword, current_user: dict = Depends(get_current_user)):
    """Change password for logged in user"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Verify current password
    if not verify_password(request.current_password, user['password']):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    # Validate new password
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 8 caractères")
    
    # Update password
    await db.users.update_one(
        {"id": current_user['user_id']},
        {"$set": {
            "password": hash_password(request.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Mot de passe modifié avec succès"}

# ==================== BACKUP ROUTES ====================

@api_router.post("/backup/manual", response_model=dict)
async def trigger_manual_backup(current_user: dict = Depends(get_current_user)):
    """Trigger a manual backup"""
    global backup_manager
    if current_user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Seul le super admin peut déclencher un backup")
    
    if not backup_manager:
        raise HTTPException(status_code=500, detail="Backup system not initialized")
    
    try:
        result = await backup_manager.create_backup(manual=True)
        return {"message": "Backup terminé", "backup": result}
    except Exception as e:
        logger.error(f"Manual backup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/backup/status", response_model=dict)
async def get_backup_status(current_user: dict = Depends(get_current_user)):
    """Get backup system status"""
    global backup_manager
    if not backup_manager:
        raise HTTPException(status_code=500, detail="Backup system not initialized")
    
    try:
        status = await backup_manager.get_backup_status()
        status["scheduler"] = backup_scheduler.get_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get backup status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/backup/history", response_model=list)
async def get_backup_history(limit: int = 20, current_user: dict = Depends(get_current_user)):
    """Get backup history"""
    global backup_manager
    if not backup_manager:
        raise HTTPException(status_code=500, detail="Backup system not initialized")
    
    try:
        return await backup_manager.get_backup_history(limit)
    except Exception as e:
        logger.error(f"Failed to get backup history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MAIN APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    # Create initial super admin if no users exist
    await create_initial_super_admin()
    
    # Initialize backup system
    global backup_manager
    backup_manager = BackupManager(db)
    backup_scheduler.set_backup_manager(backup_manager)
    backup_scheduler.start()
    logger.info("Backup scheduler started")

@app.on_event("shutdown")
async def shutdown_db_client():
    backup_scheduler.stop()
    client.close()

