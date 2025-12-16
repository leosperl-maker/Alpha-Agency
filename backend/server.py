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
    "commercial_name": "ALPHA Agency",
    "address": "3 Boulevard du Marquisat de Houelbourg, 97122 Baie-Mahault",
    "phone": "0691 266 003",
    "email": "leo.sperl@alphagency.fr",
    "siren": "À compléter",
    "siret": "À compléter",
    "capital": "À compléter",
    "legal_form": "SASU"
}

app = FastAPI(title="ALPHA Agency API")
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

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
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
    token = create_token(user_id, user.email, "admin")
    return {"token": token, "user": {"id": user_id, "email": user.email, "full_name": user.full_name, "role": "admin"}}

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

# ==================== MAIN APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
