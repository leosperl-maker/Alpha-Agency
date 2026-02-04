"""
MoltBot Integration - Complete CRM Access API
Provides full CRM access for MoltBot autonomous agent
Supports: Contacts, Invoices, Quotes, Tasks, Documents, Calendar, Search
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx
import logging

from .database import db

router = APIRouter(prefix="/moltbot", tags=["MoltBot"])
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================

# Admin phone numbers (whitelisted for full CRM access)
ADMIN_PHONES = os.environ.get('MOLTBOT_ADMIN_PHONES', '').split(',')
MOLTBOT_SECRET = os.environ.get('MOLTBOT_SECRET', 'moltbot-alpha-secret-2024')

# ==================== MODELS ====================

class MoltBotAuth(BaseModel):
    phone: Optional[str] = None
    secret: Optional[str] = None
    platform: Optional[str] = "whatsapp"  # whatsapp, telegram, web

class ContactCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    company: Optional[str] = ""
    source: Optional[str] = "moltbot"
    note: Optional[str] = ""
    tags: Optional[List[str]] = []

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    due_date: Optional[str] = None  # ISO format
    priority: Optional[str] = "medium"  # low, medium, high, urgent
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = ""
    items: List[Dict[str, Any]]  # [{description, quantity, unit_price}]
    type: Optional[str] = "devis"  # devis, facture
    notes: Optional[str] = ""
    due_days: Optional[int] = 30

class AppointmentCreate(BaseModel):
    title: str
    start_time: str  # ISO format
    end_time: Optional[str] = None
    description: Optional[str] = ""
    client_id: Optional[str] = None
    client_email: Optional[str] = None
    location: Optional[str] = ""
    visio: Optional[bool] = False
    send_invitation: Optional[bool] = True

class ReminderCreate(BaseModel):
    message: str
    remind_at: str  # ISO format
    repeat: Optional[str] = None  # daily, weekly, monthly
    task_id: Optional[str] = None

class SearchQuery(BaseModel):
    query: str
    types: Optional[List[str]] = ["contacts", "tasks", "invoices", "documents"]
    limit: Optional[int] = 10

class WebhookPayload(BaseModel):
    event_type: str
    platform: Optional[str] = None
    phone: Optional[str] = None
    user_id: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# ==================== AUTH HELPERS ====================

def verify_admin(phone: str = None, secret: str = None) -> bool:
    """Verify if request is from admin (full access) or public (limited)"""
    if secret == MOLTBOT_SECRET:
        return True
    if phone and phone.replace('+', '').replace(' ', '') in [p.replace('+', '').replace(' ', '') for p in ADMIN_PHONES if p]:
        return True
    return False

def get_access_level(phone: str = None, secret: str = None) -> str:
    """Return access level: admin or public"""
    if verify_admin(phone, secret):
        return "admin"
    return "public"

# ==================== CRM ACCESS ENDPOINTS ====================

# ----- CONTACTS -----

@router.get("/contacts")
async def list_contacts(
    search: Optional[str] = None,
    limit: int = 20,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """List all contacts (Admin only)"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"contacts": contacts, "count": len(contacts)}

@router.get("/contacts/{contact_id}")
async def get_contact(
    contact_id: str,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Get contact details by ID or name"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    # Search by ID or name
    contact = await db.contacts.find_one(
        {"$or": [
            {"id": contact_id},
            {"first_name": {"$regex": contact_id, "$options": "i"}},
            {"last_name": {"$regex": contact_id, "$options": "i"}},
            {"company": {"$regex": contact_id, "$options": "i"}}
        ]},
        {"_id": 0}
    )
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    
    # Get related data
    invoices = await db.invoices.find({"client_id": contact.get("id")}, {"_id": 0}).to_list(10)
    tasks = await db.tasks.find({"contact_id": contact.get("id")}, {"_id": 0}).to_list(10)
    
    return {
        "contact": contact,
        "invoices": invoices,
        "tasks": tasks
    }

@router.post("/contacts")
async def create_contact(
    data: ContactCreate,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Create a new contact"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    contact_id = str(uuid.uuid4())
    contact = {
        "id": contact_id,
        "first_name": data.first_name,
        "last_name": data.last_name,
        "email": data.email,
        "phone": data.phone,
        "company": data.company,
        "source": data.source,
        "note": data.note,
        "tags": data.tags or ["moltbot"],
        "status": "lead",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contacts.insert_one(contact)
    return {"success": True, "contact_id": contact_id, "message": f"Contact {data.first_name} {data.last_name} créé"}

# ----- TASKS -----

@router.get("/tasks")
async def list_tasks(
    status: Optional[str] = None,  # todo, in_progress, done
    due_today: bool = False,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """List tasks"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if status:
        query["status"] = status
    if due_today:
        today = datetime.now(timezone.utc).date().isoformat()
        query["due_date"] = {"$regex": f"^{today}"}
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(50)
    return {"tasks": tasks, "count": len(tasks)}

@router.post("/tasks")
async def create_task(
    data: TaskCreate,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Create a new task"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "title": data.title,
        "description": data.description,
        "status": "todo",
        "priority": data.priority,
        "due_date": data.due_date,
        "assigned_to": data.assigned_to,
        "contact_id": data.contact_id,
        "source": "moltbot",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.insert_one(task)
    return {"success": True, "task_id": task_id, "message": f"Tâche '{data.title}' créée"}

@router.put("/tasks/{task_id}/complete")
async def complete_task(
    task_id: str,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Mark task as completed"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    result = await db.tasks.update_one(
        {"$or": [{"id": task_id}, {"title": {"$regex": task_id, "$options": "i"}}]},
        {"$set": {"status": "done", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    return {"success": True, "message": "Tâche marquée comme terminée"}

# ----- INVOICES/QUOTES -----

@router.get("/invoices")
async def list_invoices(
    type: Optional[str] = None,  # devis, facture
    status: Optional[str] = None,  # draft, sent, paid, overdue
    client_name: Optional[str] = None,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """List invoices/quotes"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    if client_name:
        query["client_name"] = {"$regex": client_name, "$options": "i"}
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"invoices": invoices, "count": len(invoices)}

@router.post("/invoices")
async def create_invoice(
    data: InvoiceCreate,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Create a new invoice/quote"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    # Generate number
    count = await db.invoices.count_documents({"type": data.type})
    prefix = "DEV" if data.type == "devis" else "FAC"
    year = datetime.now().year
    number = f"{prefix}-{year}-{str(count + 1).zfill(3)}"
    
    # Calculate totals
    subtotal = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in data.items)
    tax = subtotal * 0.20  # 20% TVA
    total = subtotal + tax
    
    invoice_id = str(uuid.uuid4())
    invoice = {
        "id": invoice_id,
        "number": number,
        "type": data.type,
        "client_name": data.client_name,
        "client_email": data.client_email,
        "items": data.items,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": "draft",
        "notes": data.notes,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=data.due_days)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "moltbot"
    }
    
    await db.invoices.insert_one(invoice)
    
    return {
        "success": True,
        "invoice_id": invoice_id,
        "number": number,
        "total": total,
        "message": f"{'Devis' if data.type == 'devis' else 'Facture'} {number} créé(e) - {total:.2f}€"
    }

@router.put("/invoices/{invoice_id}/add-item")
async def add_invoice_item(
    invoice_id: str,
    description: str,
    quantity: int = 1,
    unit_price: float = 0,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Add item to existing invoice"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    invoice = await db.invoices.find_one(
        {"$or": [{"id": invoice_id}, {"number": {"$regex": invoice_id, "$options": "i"}}]}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    new_item = {"description": description, "quantity": quantity, "unit_price": unit_price}
    items = invoice.get("items", []) + [new_item]
    
    subtotal = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in items)
    tax = subtotal * 0.20
    total = subtotal + tax
    
    await db.invoices.update_one(
        {"id": invoice["id"]},
        {"$set": {"items": items, "subtotal": subtotal, "tax": tax, "total": total}}
    )
    
    return {"success": True, "new_total": total, "message": f"Service ajouté, nouveau total: {total:.2f}€"}

# ----- APPOINTMENTS -----

@router.get("/appointments")
async def list_appointments(
    date: Optional[str] = None,  # YYYY-MM-DD
    upcoming: bool = True,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """List appointments"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if date:
        query["start_time"] = {"$regex": f"^{date}"}
    elif upcoming:
        query["start_time"] = {"$gte": datetime.now(timezone.utc).isoformat()}
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("start_time", 1).to_list(50)
    return {"appointments": appointments, "count": len(appointments)}

@router.post("/appointments")
async def create_appointment(
    data: AppointmentCreate,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Create a new appointment"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    appointment_id = str(uuid.uuid4())
    
    # Calculate end time if not provided (default 1 hour)
    start = datetime.fromisoformat(data.start_time.replace('Z', '+00:00'))
    if data.end_time:
        end = datetime.fromisoformat(data.end_time.replace('Z', '+00:00'))
    else:
        end = start + timedelta(hours=1)
    
    # Generate visio link if requested
    visio_link = None
    if data.visio:
        visio_link = f"https://meet.google.com/alpha-{appointment_id[:8]}"
    
    appointment = {
        "id": appointment_id,
        "title": data.title,
        "description": data.description,
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "client_id": data.client_id,
        "client_email": data.client_email,
        "location": visio_link if data.visio else data.location,
        "visio": data.visio,
        "visio_link": visio_link,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "moltbot"
    }
    
    await db.appointments.insert_one(appointment)
    
    # TODO: Send calendar invitation via email
    invitation_sent = False
    if data.send_invitation and data.client_email:
        # Integration with email service would go here
        invitation_sent = True
    
    return {
        "success": True,
        "appointment_id": appointment_id,
        "visio_link": visio_link,
        "invitation_sent": invitation_sent,
        "message": f"RDV '{data.title}' créé le {start.strftime('%d/%m/%Y à %H:%M')}"
    }

# ----- DOCUMENTS -----

@router.get("/documents")
async def list_documents(
    search: Optional[str] = None,
    category: Optional[str] = None,
    client_id: Optional[str] = None,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """List documents"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category
    if client_id:
        query["client_id"] = client_id
    
    documents = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"documents": documents, "count": len(documents)}

@router.get("/documents/{doc_id}")
async def get_document(
    doc_id: str,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Get document details and download URL"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    doc = await db.documents.find_one(
        {"$or": [{"id": doc_id}, {"name": {"$regex": doc_id, "$options": "i"}}]},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    return {"document": doc, "download_url": doc.get("url")}

# ----- SEARCH -----

@router.post("/search")
async def global_search(
    data: SearchQuery,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Search across all CRM data"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    results = {"query": data.query, "results": {}}
    
    if "contacts" in data.types:
        contacts = await db.contacts.find(
            {"$or": [
                {"first_name": {"$regex": data.query, "$options": "i"}},
                {"last_name": {"$regex": data.query, "$options": "i"}},
                {"email": {"$regex": data.query, "$options": "i"}},
                {"company": {"$regex": data.query, "$options": "i"}}
            ]},
            {"_id": 0}
        ).limit(data.limit).to_list(data.limit)
        results["results"]["contacts"] = contacts
    
    if "tasks" in data.types:
        tasks = await db.tasks.find(
            {"title": {"$regex": data.query, "$options": "i"}},
            {"_id": 0}
        ).limit(data.limit).to_list(data.limit)
        results["results"]["tasks"] = tasks
    
    if "invoices" in data.types:
        invoices = await db.invoices.find(
            {"$or": [
                {"number": {"$regex": data.query, "$options": "i"}},
                {"client_name": {"$regex": data.query, "$options": "i"}}
            ]},
            {"_id": 0}
        ).limit(data.limit).to_list(data.limit)
        results["results"]["invoices"] = invoices
    
    if "documents" in data.types:
        documents = await db.documents.find(
            {"name": {"$regex": data.query, "$options": "i"}},
            {"_id": 0}
        ).limit(data.limit).to_list(data.limit)
        results["results"]["documents"] = documents
    
    return results

# ----- BUSINESS SEARCH (SIRET/SIREN/Kbis) -----

@router.get("/business-search")
async def search_business_info(
    query: str,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """
    Search for company information (SIRET, SIREN, Kbis data)
    Uses French government API
    """
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    query = query.strip().replace(" ", "")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Determine search type
            if len(query) == 14 and query.isdigit():
                # SIRET search
                url = f"https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/{query}"
            elif len(query) == 9 and query.isdigit():
                # SIREN search
                url = f"https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales/{query}"
            else:
                # Name search
                url = f"https://entreprise.data.gouv.fr/api/sirene/v3/unites_legales?denomination={query}&per_page=5"
            
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse the response based on search type
                if "etablissement" in data:
                    # SIRET result
                    etab = data["etablissement"]
                    ul = etab.get("unite_legale", {})
                    addr = etab.get("adresse", {})
                    
                    return {
                        "found": True,
                        "company_name": ul.get("denomination") or f"{ul.get('prenom_1', '')} {ul.get('nom', '')}".strip(),
                        "siren": ul.get("siren"),
                        "siret": etab.get("siret"),
                        "creation_date": ul.get("date_creation"),
                        "address": f"{addr.get('numero_voie', '')} {addr.get('type_voie', '')} {addr.get('libelle_voie', '')}".strip(),
                        "city": addr.get("libelle_commune"),
                        "postal_code": addr.get("code_postal"),
                        "activity": etab.get("activite_principale"),
                        "source": "entreprise.data.gouv.fr"
                    }
                elif "unite_legale" in data:
                    # SIREN result
                    ul = data["unite_legale"]
                    return {
                        "found": True,
                        "company_name": ul.get("denomination") or f"{ul.get('prenom_1', '')} {ul.get('nom', '')}".strip(),
                        "siren": ul.get("siren"),
                        "creation_date": ul.get("date_creation"),
                        "activity": ul.get("activite_principale"),
                        "source": "entreprise.data.gouv.fr"
                    }
                elif "unites_legales" in data and data["unites_legales"]:
                    # Name search results
                    results = []
                    for ul in data["unites_legales"][:5]:
                        results.append({
                            "company_name": ul.get("denomination") or f"{ul.get('prenom_1', '')} {ul.get('nom', '')}".strip(),
                            "siren": ul.get("siren"),
                            "creation_date": ul.get("date_creation"),
                            "activity": ul.get("activite_principale")
                        })
                    return {"found": True, "results": results, "count": len(results)}
                else:
                    return {"found": False, "message": "Aucune entreprise trouvée"}
            else:
                return {"found": False, "message": "Aucune entreprise trouvée"}
                
    except Exception as e:
        logger.error(f"Business search error: {str(e)}")
        return {"found": False, "error": str(e)}

# ----- STATS / DASHBOARD -----

@router.get("/stats")
async def get_stats(
    period: str = "month",  # today, week, month, year
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Get business stats"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    now = datetime.now(timezone.utc)
    
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    start_iso = start_date.isoformat()
    
    # Contacts
    new_contacts = await db.contacts.count_documents({"created_at": {"$gte": start_iso}})
    total_contacts = await db.contacts.count_documents({})
    
    # Tasks
    tasks_todo = await db.tasks.count_documents({"status": "todo"})
    tasks_done = await db.tasks.count_documents({"status": "done", "completed_at": {"$gte": start_iso}})
    
    # Revenue
    invoices = await db.invoices.find(
        {"type": "facture", "status": "paid", "paid_at": {"$gte": start_iso}},
        {"total": 1}
    ).to_list(1000)
    revenue = sum(inv.get("total", 0) for inv in invoices)
    
    # Pending quotes
    pending_quotes = await db.invoices.find(
        {"type": "devis", "status": {"$in": ["sent", "draft"]}},
        {"total": 1}
    ).to_list(100)
    pending_value = sum(q.get("total", 0) for q in pending_quotes)
    
    # Upcoming appointments
    upcoming_rdv = await db.appointments.count_documents({
        "start_time": {"$gte": now.isoformat()},
        "status": "scheduled"
    })
    
    return {
        "period": period,
        "contacts": {
            "new": new_contacts,
            "total": total_contacts
        },
        "tasks": {
            "pending": tasks_todo,
            "completed": tasks_done
        },
        "revenue": {
            "current": revenue,
            "pending_quotes": pending_value,
            "pending_count": len(pending_quotes)
        },
        "appointments": {
            "upcoming": upcoming_rdv
        }
    }

# ----- REMINDERS -----

@router.get("/reminders")
async def list_reminders(
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """List pending reminders"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    reminders = await db.reminders.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("remind_at", 1).to_list(50)
    
    return {"reminders": reminders}

@router.post("/reminders")
async def create_reminder(
    data: ReminderCreate,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Create a reminder"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    reminder_id = str(uuid.uuid4())
    reminder = {
        "id": reminder_id,
        "message": data.message,
        "remind_at": data.remind_at,
        "repeat": data.repeat,
        "task_id": data.task_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reminders.insert_one(reminder)
    
    remind_time = datetime.fromisoformat(data.remind_at.replace('Z', '+00:00'))
    return {
        "success": True,
        "reminder_id": reminder_id,
        "message": f"Rappel programmé pour le {remind_time.strftime('%d/%m/%Y à %H:%M')}"
    }

# ----- DAILY BRIEFING -----

@router.get("/briefing")
async def get_daily_briefing(
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Get daily briefing (morning summary)"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    today = datetime.now(timezone.utc).date().isoformat()
    now = datetime.now(timezone.utc)
    
    # Today's tasks
    tasks_today = await db.tasks.find(
        {"$or": [
            {"due_date": {"$regex": f"^{today}"}},
            {"status": "todo"}
        ]},
        {"_id": 0}
    ).to_list(20)
    
    # Today's appointments
    appointments_today = await db.appointments.find(
        {"start_time": {"$regex": f"^{today}"}},
        {"_id": 0}
    ).sort("start_time", 1).to_list(10)
    
    # Overdue invoices
    overdue = await db.invoices.find(
        {"status": "overdue"},
        {"_id": 0, "number": 1, "client_name": 1, "total": 1}
    ).to_list(5)
    
    # New leads (last 24h)
    yesterday = (now - timedelta(days=1)).isoformat()
    new_leads = await db.contacts.count_documents({
        "created_at": {"$gte": yesterday},
        "status": "lead"
    })
    
    # Stats
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_revenue = await db.invoices.find(
        {"type": "facture", "status": "paid", "paid_at": {"$gte": month_start}},
        {"total": 1}
    ).to_list(1000)
    ca_month = sum(inv.get("total", 0) for inv in month_revenue)
    
    return {
        "date": today,
        "greeting": f"Bonjour ! Voici votre briefing du {datetime.now().strftime('%d/%m/%Y')}",
        "tasks": {
            "count": len(tasks_today),
            "items": tasks_today[:5]
        },
        "appointments": {
            "count": len(appointments_today),
            "items": appointments_today
        },
        "alerts": {
            "overdue_invoices": overdue,
            "new_leads": new_leads
        },
        "stats": {
            "ca_month": ca_month
        }
    }

# ----- END OF DAY RECAP -----

@router.get("/recap")
async def get_daily_recap(
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """Get end of day recap"""
    if get_access_level(phone, secret) != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    
    today = datetime.now(timezone.utc).date().isoformat()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Completed tasks today
    completed = await db.tasks.find(
        {"status": "done", "completed_at": {"$gte": today_start}},
        {"_id": 0, "title": 1}
    ).to_list(20)
    
    # Remaining tasks
    remaining = await db.tasks.find(
        {"status": {"$in": ["todo", "in_progress"]}, "due_date": {"$regex": f"^{today}"}},
        {"_id": 0, "title": 1, "priority": 1}
    ).to_list(20)
    
    # Tomorrow's preview
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()
    tomorrow_tasks = await db.tasks.find(
        {"due_date": {"$regex": f"^{tomorrow}"}},
        {"_id": 0, "title": 1}
    ).to_list(10)
    tomorrow_rdv = await db.appointments.find(
        {"start_time": {"$regex": f"^{tomorrow}"}},
        {"_id": 0, "title": 1, "start_time": 1}
    ).to_list(10)
    
    # Day stats
    new_contacts = await db.contacts.count_documents({"created_at": {"$gte": today_start}})
    invoices_sent = await db.invoices.count_documents({"created_at": {"$gte": today_start}})
    
    return {
        "date": today,
        "summary": f"Récap de votre journée du {datetime.now().strftime('%d/%m/%Y')}",
        "completed": {
            "count": len(completed),
            "tasks": completed
        },
        "remaining": {
            "count": len(remaining),
            "tasks": remaining
        },
        "tomorrow": {
            "tasks": tomorrow_tasks,
            "appointments": tomorrow_rdv
        },
        "day_stats": {
            "new_contacts": new_contacts,
            "invoices_sent": invoices_sent
        },
        "productivity": f"{len(completed)}/{len(completed) + len(remaining)} tâches terminées" if (completed or remaining) else "Aucune tâche planifiée"
    }

# ----- WEBHOOK (for MoltBot events) -----

@router.post("/webhook")
async def moltbot_webhook(payload: WebhookPayload):
    """
    Webhook endpoint for MoltBot integration
    Handles incoming events from MoltBot
    """
    logger.info(f"MoltBot webhook: {payload.event_type} from {payload.platform}")
    
    access_level = get_access_level(payload.phone)
    
    try:
        if payload.event_type == "contact_create" and access_level == "admin":
            data = payload.data or {}
            contact_id = str(uuid.uuid4())
            contact = {
                "id": contact_id,
                "first_name": data.get("first_name", ""),
                "last_name": data.get("last_name", ""),
                "email": data.get("email", ""),
                "phone": data.get("phone", ""),
                "company": data.get("company", ""),
                "source": f"moltbot_{payload.platform or 'unknown'}",
                "status": "lead",
                "tags": ["moltbot"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.contacts.insert_one(contact)
            return {"success": True, "message": "Contact créé", "contact_id": contact_id}
        
        elif payload.event_type == "task_create" and access_level == "admin":
            data = payload.data or {}
            task_id = str(uuid.uuid4())
            task = {
                "id": task_id,
                "title": data.get("title", "Tâche MoltBot"),
                "description": data.get("description", ""),
                "status": "todo",
                "priority": data.get("priority", "medium"),
                "due_date": data.get("due_date"),
                "source": "moltbot",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.tasks.insert_one(task)
            return {"success": True, "message": "Tâche créée", "task_id": task_id}
        
        elif payload.event_type == "task_complete" and access_level == "admin":
            task_id = payload.data.get("task_id") if payload.data else None
            if task_id:
                await db.tasks.update_one(
                    {"id": task_id},
                    {"$set": {"status": "done", "completed_at": datetime.now(timezone.utc).isoformat()}}
                )
                return {"success": True, "message": "Tâche terminée"}
        
        elif payload.event_type == "message":
            logger.info(f"Message from {payload.phone}: {payload.message}")
            return {"success": True, "message": "Message reçu", "access_level": access_level}
        
        elif payload.event_type == "public_inquiry" and access_level == "public":
            # Handle public FAQ queries - limited info only
            return {
                "success": True,
                "message": "Requête publique reçue",
                "response_type": "faq"
            }
        
        return {"success": True, "message": f"Event {payload.event_type} traité"}
    
    except Exception as e:
        logger.error(f"MoltBot webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ----- PUBLIC FAQ (Limited access) -----

@router.get("/public/faq")
async def get_public_faq():
    """Get public FAQ for website chatbot (no auth required)"""
    # This would be configurable via admin panel
    faq = await db.settings.find_one({"key": "moltbot_faq"})
    
    default_faq = [
        {"question": "Quels sont vos services ?", "answer": "Nous proposons la création de sites web, le community management, la photographie et la publicité digitale."},
        {"question": "Quels sont vos tarifs ?", "answer": "Nos tarifs dépendent de votre projet. Contactez-nous pour un devis personnalisé gratuit."},
        {"question": "Quel est le délai de livraison ?", "answer": "Un site vitrine est généralement livré en 7 jours ouvrés."},
        {"question": "Comment vous contacter ?", "answer": "Par téléphone au 0690 05 34 44, par email à contact@alphagency.fr ou via notre formulaire de contact."},
        {"question": "Où êtes-vous situés ?", "answer": "Nous sommes basés en Guadeloupe, à Baie-Mahault."}
    ]
    
    return {"faq": faq.get("items") if faq else default_faq}

@router.post("/public/inquiry")
async def submit_public_inquiry(
    name: str,
    email: str,
    message: str,
    phone: Optional[str] = None
):
    """Submit public inquiry from website chatbot"""
    # Create as lead
    contact_id = str(uuid.uuid4())
    
    # Check if contact exists
    existing = await db.contacts.find_one({"email": email})
    
    if existing:
        # Add note to existing contact
        await db.contacts.update_one(
            {"email": email},
            {
                "$push": {"notes": {"date": datetime.now(timezone.utc).isoformat(), "text": message}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        contact_id = existing["id"]
    else:
        # Create new contact
        names = name.split(" ", 1)
        contact = {
            "id": contact_id,
            "first_name": names[0],
            "last_name": names[1] if len(names) > 1 else "",
            "email": email,
            "phone": phone or "",
            "source": "chatbot_website",
            "status": "lead",
            "note": message,
            "tags": ["chatbot", "website"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.contacts.insert_one(contact)
    
    return {
        "success": True,
        "message": "Merci pour votre message ! Nous vous répondrons rapidement.",
        "contact_id": contact_id
    }


# ----- AI CHAT (pour répondre à n'importe quelle question) -----

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    phone: Optional[str] = Header(None, alias="X-MoltBot-Phone"),
    secret: Optional[str] = Header(None, alias="X-MoltBot-Secret")
):
    """
    Chat with MoltBot using AI (Gemini) for any question.
    Can answer general questions, provide CRM context, search data, and more.
    """
    
    access = get_access_level(phone, secret)
    if access == "none":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    message = request.message.lower()
    original_message = request.message
    
    try:
        # ========== SMART CRM QUERIES ==========
        # Check if user is asking for specific CRM data
        
        specific_data = ""
        
        # Search for specific client/contact
        if any(kw in message for kw in ["trouve", "cherche", "recherche", "où est", "quel est", "combien"]):
            
            # Extract search term - look for names, companies, etc
            search_terms = []
            for word in original_message.split():
                if len(word) > 2 and word[0].isupper():
                    search_terms.append(word)
            
            if search_terms:
                search_query = " ".join(search_terms)
                
                # Search contacts
                contacts_found = await db.contacts.find(
                    {"$or": [
                        {"first_name": {"$regex": search_query, "$options": "i"}},
                        {"last_name": {"$regex": search_query, "$options": "i"}},
                        {"company": {"$regex": search_query, "$options": "i"}},
                        {"email": {"$regex": search_query, "$options": "i"}}
                    ]},
                    {"_id": 0, "first_name": 1, "last_name": 1, "company": 1, "email": 1, "phone": 1, "status": 1}
                ).limit(5).to_list(5)
                
                # Search invoices
                invoices_found = await db.invoices.find(
                    {"$or": [
                        {"client_name": {"$regex": search_query, "$options": "i"}},
                        {"number": {"$regex": search_query, "$options": "i"}}
                    ]},
                    {"_id": 0, "number": 1, "client_name": 1, "total": 1, "status": 1, "type": 1, "created_at": 1}
                ).limit(5).to_list(5)
                
                if contacts_found:
                    specific_data += f"\n📇 Contacts trouvés pour '{search_query}':\n"
                    for c in contacts_found:
                        specific_data += f"- {c.get('first_name','')} {c.get('last_name','')} ({c.get('company','N/A')}) - {c.get('email','N/A')} - {c.get('phone','N/A')}\n"
                
                if invoices_found:
                    specific_data += f"\n📄 Documents trouvés pour '{search_query}':\n"
                    for i in invoices_found:
                        specific_data += f"- {i.get('number','')} - {i.get('client_name','')} - {i.get('total',0):.2f}€ ({i.get('type','')}, {i.get('status','')})\n"
        
        # Count queries
        if "combien" in message:
            now = datetime.now(timezone.utc)
            
            if "client" in message or "contact" in message:
                if "mois" in message or "ce mois" in message:
                    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    count = await db.contacts.count_documents({"created_at": {"$gte": month_start.isoformat()}})
                    specific_data += f"\n📊 Nouveaux contacts ce mois-ci: {count}\n"
                elif "semaine" in message:
                    week_start = now - timedelta(days=now.weekday())
                    count = await db.contacts.count_documents({"created_at": {"$gte": week_start.isoformat()}})
                    specific_data += f"\n📊 Nouveaux contacts cette semaine: {count}\n"
                else:
                    total = await db.contacts.count_documents({})
                    clients = await db.contacts.count_documents({"status": {"$in": ["client", "active"]}})
                    leads = await db.contacts.count_documents({"status": "lead"})
                    specific_data += f"\n📊 Total contacts: {total} ({clients} clients, {leads} leads)\n"
            
            if "facture" in message or "devis" in message:
                if "mois" in message:
                    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    factures = await db.invoices.count_documents({"type": "facture", "created_at": {"$gte": month_start.isoformat()}})
                    devis = await db.invoices.count_documents({"type": "devis", "created_at": {"$gte": month_start.isoformat()}})
                    specific_data += f"\n📊 Ce mois: {factures} factures, {devis} devis\n"
                else:
                    factures = await db.invoices.count_documents({"type": "facture"})
                    devis = await db.invoices.count_documents({"type": "devis"})
                    specific_data += f"\n📊 Total: {factures} factures, {devis} devis\n"
            
            if "tâche" in message or "tache" in message:
                pending = await db.tasks.count_documents({"status": {"$in": ["todo", "in_progress"]}})
                completed = await db.tasks.count_documents({"status": "completed"})
                specific_data += f"\n📊 Tâches: {pending} en cours, {completed} terminées\n"
            
            if "ca" in message or "chiffre" in message or "revenu" in message:
                month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                revenue = await db.invoices.aggregate([
                    {"$match": {"type": "facture", "status": "paid", "created_at": {"$gte": month_start.isoformat()}}},
                    {"$group": {"_id": None, "total": {"$sum": "$total"}}}
                ]).to_list(1)
                ca = revenue[0]["total"] if revenue else 0
                specific_data += f"\n💰 CA ce mois: {ca:.2f}€\n"
        
        # Activity summary
        if any(kw in message for kw in ["résume", "résumé", "activité", "récap", "recap"]):
            now = datetime.now(timezone.utc)
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = now - timedelta(days=now.weekday())
            
            # Today's activity
            tasks_today = await db.tasks.count_documents({"due_date": {"$gte": today.isoformat(), "$lt": (today + timedelta(days=1)).isoformat()}})
            appts_today = await db.appointments.count_documents({"start_time": {"$gte": today.isoformat(), "$lt": (today + timedelta(days=1)).isoformat()}})
            
            # Week activity
            new_contacts_week = await db.contacts.count_documents({"created_at": {"$gte": week_start.isoformat()}})
            invoices_week = await db.invoices.count_documents({"created_at": {"$gte": week_start.isoformat()}})
            
            specific_data += f"""
📆 Résumé d'activité:
Aujourd'hui: {tasks_today} tâches dues, {appts_today} RDV
Cette semaine: {new_contacts_week} nouveaux contacts, {invoices_week} documents créés
"""
        
        # ========== BUILD CRM CONTEXT ==========
        crm_context = ""
        
        if access == "admin":
            now = datetime.now(timezone.utc)
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
            
            contacts_count = await db.contacts.count_documents({})
            leads_count = await db.contacts.count_documents({"status": "lead"})
            clients_count = await db.contacts.count_documents({"status": {"$in": ["client", "active"]}})
            tasks_pending = await db.tasks.count_documents({"status": {"$in": ["todo", "in_progress"]}})
            
            revenue_data = await db.invoices.find(
                {"type": "facture", "status": "paid", "created_at": {"$gte": month_start}},
                {"total": 1}
            ).to_list(1000)
            ca_month = sum(inv.get("total", 0) for inv in revenue_data)
            
            crm_context = f"""
Contexte CRM Alpha Agency (données en temps réel):
- {contacts_count} contacts ({leads_count} leads, {clients_count} clients)
- {tasks_pending} tâches en cours
- CA ce mois: {ca_month:.2f}€
"""
        
        # Add specific data found
        if specific_data:
            crm_context += f"\n--- Données trouvées pour ta question ---{specific_data}"
        
        # ========== AI RESPONSE ==========
        system_prompt = f"""Tu es MoltBot, l'assistant IA d'Alpha Agency (agence de communication digitale en Guadeloupe).

CAPACITÉS:
✅ Répondre aux questions sur le CRM (contacts, devis, factures, tâches)
✅ Fournir des statistiques et métriques business
✅ Chercher des informations spécifiques (clients, documents)
✅ Conseiller sur le marketing, la communication, les réseaux sociaux
✅ Aider à la rédaction de contenus
✅ Répondre à n'importe quelle question générale

STYLE:
- Réponds toujours en français
- Sois concis et utile
- Si des données CRM sont fournies, utilise-les pour répondre précisément
- Si tu ne trouves pas d'information, suggère d'utiliser les commandes CRM

{crm_context}
"""
        
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid
        session_id = str(uuid.uuid4())
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        )
        
        user_msg = UserMessage(text=original_message)
        response = await chat.send_message(user_msg)
        
        return {
            "success": True,
            "response": response,
            "source": "ai",
            "data_found": bool(specific_data)
        }
    
    except Exception as e:
        logger.error(f"AI Chat error: {e}")
        return {
            "success": False,
            "response": f"Désolé, je n'ai pas pu traiter votre demande. Erreur: {str(e)}",
            "source": "error"
        }



async def chat_with_moltbot_ai(message: str, context: str = "") -> str:
    """
    Helper function for WhatsApp integration.
    Returns AI response as plain text string.
    """
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid
        
        session_id = str(uuid.uuid4())
        
        system_prompt = context if context else """Tu es MoltBot, l'assistant IA d'Alpha Agency.
Réponds de manière concise et utile en français.
Tu aides avec le CRM, le marketing, et les questions générales."""
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        )
        
        user_msg = UserMessage(text=message)
        response = await chat.send_message(user_msg)
        
        return response
        
    except Exception as e:
        logger.error(f"chat_with_moltbot_ai error: {e}")
        return f"Désolé, une erreur est survenue. Essayez une commande comme 'aide', 'stats' ou 'briefing'."

