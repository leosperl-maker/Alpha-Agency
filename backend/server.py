from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks
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

# Company Info
COMPANY_INFO = {
    "name": "Alpha Digital",
    "commercial_name": "Alpha Agency",
    "address": "3 Boulevard du Marquisat de Houelbourg, 97122 Baie-Mahault",
    "phone": "0691 266 003",
    "email": "leo.sperl@alphagency.fr",
    "siren": "À compléter",
    "siret": "À compléter",
    "capital": "À compléter",
    "legal_form": "SASU",
    "horaires": "Du mardi au samedi de 10h à 19h"
}

# Cloudinary Config
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

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

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    score: Optional[str] = None
    tags: Optional[List[str]] = None

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

class InvoiceCreate(BaseModel):
    quote_id: Optional[str] = None
    contact_id: str
    items: List[QuoteItemCreate]
    due_date: Optional[str] = None
    notes: Optional[str] = None

class SubscriptionCreate(BaseModel):
    contact_id: str
    plan_name: str = "Site Web 90€/mois"
    amount: float = 90.0
    billing_cycle: str = "monthly"
    start_date: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
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

def generate_quote_pdf(quote: dict, contact: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#6A0F1A'), alignment=TA_LEFT)
    elements.append(Paragraph("ALPHA Agency", title_style))
    elements.append(Spacer(1, 0.5*cm))
    
    company_style = ParagraphStyle('Company', parent=styles['Normal'], fontSize=10, textColor=colors.grey)
    elements.append(Paragraph(f"{COMPANY_INFO['address']}", company_style))
    elements.append(Paragraph(f"Tél: {COMPANY_INFO['phone']} | Email: {COMPANY_INFO['email']}", company_style))
    elements.append(Spacer(1, 1*cm))
    
    # Quote info
    quote_title = ParagraphStyle('QuoteTitle', parent=styles['Heading2'], fontSize=18, textColor=colors.black)
    elements.append(Paragraph(f"DEVIS N° {quote['quote_number']}", quote_title))
    elements.append(Paragraph(f"Date: {quote['created_at'][:10]}", styles['Normal']))
    elements.append(Paragraph(f"Validité: {quote.get('valid_until', 'Non spécifiée')}", styles['Normal']))
    elements.append(Spacer(1, 0.5*cm))
    
    # Client info
    elements.append(Paragraph("<b>Client:</b>", styles['Normal']))
    elements.append(Paragraph(f"{contact.get('first_name', '')} {contact.get('last_name', '')}", styles['Normal']))
    if contact.get('company'):
        elements.append(Paragraph(f"{contact['company']}", styles['Normal']))
    elements.append(Paragraph(f"{contact.get('email', '')}", styles['Normal']))
    elements.append(Spacer(1, 1*cm))
    
    # Items table
    table_data = [['Description', 'Qté', 'Prix unitaire', 'Total']]
    subtotal = 0
    for item in quote.get('items', []):
        total = item['quantity'] * item['unit_price']
        subtotal += total
        table_data.append([
            item['description'],
            str(item['quantity']),
            f"{item['unit_price']:.2f} €",
            f"{total:.2f} €"
        ])
    
    tva = subtotal * 0.085  # TVA Guadeloupe 8.5%
    total_ttc = subtotal + tva
    
    table_data.append(['', '', 'Sous-total HT:', f"{subtotal:.2f} €"])
    table_data.append(['', '', 'TVA (8.5%):', f"{tva:.2f} €"])
    table_data.append(['', '', 'Total TTC:', f"{total_ttc:.2f} €"])
    
    table = Table(table_data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6A0F1A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -4), 0.5, colors.grey),
        ('FONTNAME', (-2, -3), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 1*cm))
    
    # Notes
    if quote.get('notes'):
        elements.append(Paragraph("<b>Notes:</b>", styles['Normal']))
        elements.append(Paragraph(quote['notes'], styles['Normal']))
    
    # Footer
    elements.append(Spacer(1, 2*cm))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Paragraph(f"{COMPANY_INFO['commercial_name']} - {COMPANY_INFO['legal_form']} au capital de {COMPANY_INFO['capital']}", footer_style))
    elements.append(Paragraph(f"SIREN: {COMPANY_INFO['siren']} - SIRET: {COMPANY_INFO['siret']}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_invoice_pdf(invoice: dict, contact: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#6A0F1A'), alignment=TA_LEFT)
    elements.append(Paragraph("ALPHA Agency", title_style))
    elements.append(Spacer(1, 0.5*cm))
    
    company_style = ParagraphStyle('Company', parent=styles['Normal'], fontSize=10, textColor=colors.grey)
    elements.append(Paragraph(f"{COMPANY_INFO['address']}", company_style))
    elements.append(Paragraph(f"Tél: {COMPANY_INFO['phone']} | Email: {COMPANY_INFO['email']}", company_style))
    elements.append(Spacer(1, 1*cm))
    
    # Invoice info
    invoice_title = ParagraphStyle('InvoiceTitle', parent=styles['Heading2'], fontSize=18, textColor=colors.black)
    elements.append(Paragraph(f"FACTURE N° {invoice['invoice_number']}", invoice_title))
    elements.append(Paragraph(f"Date: {invoice['created_at'][:10]}", styles['Normal']))
    elements.append(Paragraph(f"Échéance: {invoice.get('due_date', 'Non spécifiée')}", styles['Normal']))
    elements.append(Spacer(1, 0.5*cm))
    
    # Client info
    elements.append(Paragraph("<b>Client:</b>", styles['Normal']))
    elements.append(Paragraph(f"{contact.get('first_name', '')} {contact.get('last_name', '')}", styles['Normal']))
    if contact.get('company'):
        elements.append(Paragraph(f"{contact['company']}", styles['Normal']))
    elements.append(Paragraph(f"{contact.get('email', '')}", styles['Normal']))
    elements.append(Spacer(1, 1*cm))
    
    # Items table
    table_data = [['Description', 'Qté', 'Prix unitaire', 'Total']]
    subtotal = 0
    for item in invoice.get('items', []):
        total = item['quantity'] * item['unit_price']
        subtotal += total
        table_data.append([
            item['description'],
            str(item['quantity']),
            f"{item['unit_price']:.2f} €",
            f"{total:.2f} €"
        ])
    
    tva = subtotal * 0.085
    total_ttc = subtotal + tva
    
    table_data.append(['', '', 'Sous-total HT:', f"{subtotal:.2f} €"])
    table_data.append(['', '', 'TVA (8.5%):', f"{tva:.2f} €"])
    table_data.append(['', '', 'Total TTC:', f"{total_ttc:.2f} €"])
    
    table = Table(table_data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6A0F1A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -4), 0.5, colors.grey),
        ('FONTNAME', (-2, -3), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 1*cm))
    
    # Payment status
    status_color = colors.green if invoice.get('status') == 'payée' else colors.orange if invoice.get('status') == 'en_attente' else colors.red
    status_style = ParagraphStyle('Status', parent=styles['Normal'], fontSize=12, textColor=status_color)
    elements.append(Paragraph(f"<b>Statut: {invoice.get('status', 'En attente').upper()}</b>", status_style))
    
    # Footer
    elements.append(Spacer(1, 2*cm))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Paragraph(f"{COMPANY_INFO['commercial_name']} - {COMPANY_INFO['legal_form']} au capital de {COMPANY_INFO['capital']}", footer_style))
    elements.append(Paragraph(f"SIREN: {COMPANY_INFO['siren']} - SIRET: {COMPANY_INFO['siret']}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

# ==================== AUTH ROUTES ====================

# Création du super admin initial si aucun utilisateur n'existe
async def create_initial_super_admin():
    count = await db.users.count_documents({})
    if count == 0:
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "email": "admin@alphagency.fr",
            "password": hash_password("Alpha2024!"),
            "full_name": "Super Admin",
            "role": "super_admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info("Super admin initial créé: admin@alphagency.fr / Alpha2024!")

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
        "items": [item.model_dump() for item in invoice.items],
        "subtotal": subtotal,
        "tva": tva,
        "total": total,
        "status": "en_attente",
        "due_date": invoice.due_date or (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        "notes": invoice.notes,
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

@api_router.put("/invoices/{invoice_id}/status", response_model=dict)
async def update_invoice_status(invoice_id: str, status: str, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["en_attente", "payée", "en_retard", "annulée"]
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

@api_router.post("/tasks", response_model=dict)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        **task.model_dump(),
        "status": "à_faire",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task_doc)
    return {"id": task_id, "message": "Tâche créée"}

@api_router.get("/tasks", response_model=List[dict])
async def get_tasks(current_user: dict = Depends(get_current_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return tasks

@api_router.put("/tasks/{task_id}/status", response_model=dict)
async def update_task_status(task_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.update_one({"id": task_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return {"message": "Statut mis à jour"}

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
    
    # Invoices stats
    pending_invoices = await db.invoices.count_documents({"status": "en_attente"})
    overdue_invoices = await db.invoices.count_documents({"status": "en_retard"})
    
    # KPIs from settings
    kpis = await db.settings.find_one({"type": "kpis"}, {"_id": 0})
    
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
            "pending": pending_invoices,
            "overdue": overdue_invoices
        },
        "kpis": kpis.get("data", {}) if kpis else {"sessions": 0, "leads": 0, "conversion_rate": 0}
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

@api_router.get("/admin/users", response_model=List[dict])
async def get_admin_users(current_user: dict = Depends(get_current_user)):
    """Get all admin users (super_admin only)"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user or user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return users

@api_router.delete("/admin/users/{user_id}", response_model=dict)
async def delete_admin_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an admin user (super_admin only)"""
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not user or user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    if user_id == current_user['user_id']:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": "Utilisateur supprimé"}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
