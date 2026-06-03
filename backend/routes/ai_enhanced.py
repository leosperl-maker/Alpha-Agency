"""
AI Assistant Routes - Enhanced with image analysis and generation
Uses Emergent LLM Key for GPT-4o Vision, GPT Image 1, and Gemini Nano Banana
NOW CONTEXT-AWARE: Can access and reason about app data (invoices, contacts, tasks, etc.)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import uuid
import base64
import os
import re
from datetime import datetime, timezone, timedelta
import logging
import json

from .database import db, get_current_user

router = APIRouter(prefix="/ai-enhanced", tags=["AI Enhanced"])
logger = logging.getLogger(__name__)

# Environment variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
AI_DAILY_LIMIT = 200

# Check if emergentintegrations is available
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("emergentintegrations not installed - AI features will be limited")

# Direct Gemini (google-genai) — used when GEMINI_API_KEY is set (preferred provider)
try:
    from google import genai as _google_genai
    from google.genai import types as _genai_types
    _gemini_client = _google_genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
    GEMINI_AVAILABLE = bool(GEMINI_API_KEY)
except Exception as _gemini_err:  # ImportError or client init error
    _gemini_client = None
    GEMINI_AVAILABLE = False
    logger.warning(f"google-genai unavailable: {_gemini_err}")


# Les noms de modèles Gemini sont retirés régulièrement → chaîne de repli (cf. itér. 17).
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"]


async def _gemini_generate(system_message: str, messages, model: str) -> str:
    """Chat completion directe sur Gemini avec toute la conversation.
    Essaie le modèle demandé puis une chaîne de repli (robustesse aux retraits de modèles)."""
    import asyncio
    contents = []
    for m in messages:
        role = "model" if getattr(m, "role", "user") == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m.content or ""}]})

    chain = [model] + [m for m in GEMINI_MODELS if m != model]
    last_err = None
    for mdl in chain:
        def _call(_m=mdl):
            resp = _gemini_client.models.generate_content(
                model=_m,
                contents=contents,
                config=_genai_types.GenerateContentConfig(system_instruction=system_message),
            )
            return (getattr(resp, "text", "") or "").strip()
        try:
            text = await asyncio.to_thread(_call)
            if text:
                return text
        except Exception as e:
            last_err = e
            logger.warning(f"ai_enhanced: modèle Gemini {mdl} a échoué: {e}")
            continue
    raise RuntimeError(f"all_gemini_models_failed: {last_err}")


# ==================== MODELS ====================

class ChatMessage(BaseModel):
    role: str
    content: str
    image_url: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    conversation_id: Optional[str] = None
    model: Optional[str] = "gpt-4o"  # gpt-4o, gemini-3-flash-preview
    include_context: Optional[bool] = True  # Include app data context
    enable_actions: Optional[bool] = True  # Enable AI to perform actions
    
class ImageGenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = "gemini-3-pro-image-preview"  # gemini-3-pro-image-preview, gpt-image-1
    size: Optional[str] = "1024x1024"

# Action models
class ActionRequest(BaseModel):
    action_type: str  # create_task, update_contact, create_quote, mark_task_done
    params: dict

class TaskActionParams(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    contact_id: Optional[str] = None

class ContactUpdateParams(BaseModel):
    contact_id: str
    updates: dict

class QuoteActionParams(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    services: List[dict]  # [{title, description, quantity, unit_price}]
    notes: Optional[str] = ""


# ==================== ACTION HANDLERS ====================

async def execute_action(action_type: str, params: dict, user_id: str) -> dict:
    """Execute an action based on type and parameters"""
    try:
        if action_type == "create_task":
            return await create_task_action(params, user_id)
        elif action_type == "mark_task_done":
            return await mark_task_done_action(params)
        elif action_type == "update_contact":
            return await update_contact_action(params)
        elif action_type == "set_contact_status":
            return await set_contact_status_action(params)
        elif action_type == "add_contact_note":
            return await add_contact_note_action(params)
        elif action_type == "schedule_followup":
            return await schedule_followup_action(params, user_id)
        elif action_type == "merge_contacts":
            return await merge_contacts_action(params)
        elif action_type == "create_quote":
            return await create_quote_action(params, user_id)
        elif action_type == "get_document":
            return await get_document_action(params)
        elif action_type == "list_documents":
            return await list_documents_action(params)
        else:
            return {"success": False, "error": f"Action inconnue: {action_type}"}
    except Exception as e:
        logger.error(f"Action error: {str(e)}")
        return {"success": False, "error": str(e)}


async def create_task_action(params: dict, user_id: str) -> dict:
    """Create a new task"""
    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "title": params.get("title", "Nouvelle tâche"),
        "description": params.get("description", ""),
        "status": "todo",
        "priority": params.get("priority", "medium"),
        "category": params.get("category", "general"),
        "due_date": params.get("due_date"),
        "contact_id": params.get("contact_id"),
        "assigned_to": params.get("assigned_to"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id
    }
    await db.tasks.insert_one(task)
    return {
        "success": True, 
        "message": f"✅ Tâche créée: {task['title']}",
        "task_id": task_id,
        "task": {k: v for k, v in task.items() if k != "_id"}
    }


async def mark_task_done_action(params: dict) -> dict:
    """Mark a task as done"""
    task_id = params.get("task_id")
    task_title = params.get("task_title")
    
    # Find by ID or title
    query = {}
    if task_id:
        query["id"] = task_id
    elif task_title:
        query["title"] = {"$regex": task_title, "$options": "i"}
    else:
        return {"success": False, "error": "ID ou titre de tâche requis"}
    
    task = await db.tasks.find_one(query)
    if not task:
        return {"success": False, "error": "Tâche non trouvée"}
    
    await db.tasks.update_one(
        {"id": task["id"]},
        {"$set": {
            "status": "done",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {
        "success": True,
        "message": f"✅ Tâche terminée: {task['title']}",
        "task_id": task["id"]
    }


async def update_contact_action(params: dict) -> dict:
    """Update a contact"""
    contact_id = params.get("contact_id")
    contact_name = params.get("contact_name")
    updates = params.get("updates", {})
    
    if not updates:
        return {"success": False, "error": "Aucune mise à jour spécifiée"}
    
    # Find by ID or name
    query = {}
    if contact_id:
        query["id"] = contact_id
    elif contact_name:
        # Search by first_name or last_name
        query["$or"] = [
            {"first_name": {"$regex": contact_name, "$options": "i"}},
            {"last_name": {"$regex": contact_name, "$options": "i"}},
            {"company": {"$regex": contact_name, "$options": "i"}}
        ]
    else:
        return {"success": False, "error": "ID ou nom du contact requis"}
    
    contact = await db.contacts.find_one(query)
    if not contact:
        return {"success": False, "error": "Contact non trouvé"}
    
    # Champs autorisés à la mise à jour (le modèle contact utilise "note", pas "notes")
    allowed_fields = ["phone", "email", "company", "note", "notes", "status", "score", "score_value",
                      "poste", "budget", "project_type", "city", "tags", "favorite", "besoin",
                      "decision_level", "delai", "canal_rappel", "comment_connu"]
    safe_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    if "notes" in safe_updates:  # alias -> note
        safe_updates["note"] = safe_updates.pop("notes")
    safe_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.contacts.update_one({"id": contact["id"]}, {"$set": safe_updates})
    
    return {
        "success": True,
        "message": f"✅ Contact mis à jour: {contact.get('first_name', '')} {contact.get('last_name', '')}",
        "contact_id": contact["id"],
        "updates": safe_updates
    }


async def _find_contact(params: dict):
    """Trouve un contact par id ou par nom/entreprise/email (tokenisé)."""
    contact_id = params.get("contact_id")
    contact_name = params.get("contact_name") or params.get("name")
    if contact_id:
        return await db.contacts.find_one({"id": contact_id})
    if contact_name:
        tokens = [t for t in re.split(r"\s+", str(contact_name).strip()) if len(t) >= 2]
        ors = []
        for field in ("first_name", "last_name", "company", "email"):
            ors.append({field: {"$regex": re.escape(str(contact_name)), "$options": "i"}})
            for t in tokens:
                ors.append({field: {"$regex": re.escape(t), "$options": "i"}})
        return await db.contacts.find_one({"$or": ors}) if ors else None
    return None


def _contact_name(c: dict) -> str:
    return f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or c.get("company", "Contact")


# Libellés naturels -> statut CRM
_STATUS_MAP = {
    "gagné": "client", "gagne": "client", "gagnée": "client", "gagner": "client",
    "signé": "client", "signe": "client", "client": "client",
    "perdu": "perdu", "perdue": "perdu", "perte": "perdu", "abandonné": "perdu", "abandonne": "perdu",
    "en cours": "en_discussion", "en discussion": "en_discussion", "discussion": "en_discussion",
    "qualifié": "qualifie", "qualifie": "qualifie", "qualifié(e)": "qualifie",
    "prospect": "prospect", "nouveau": "nouveau", "vip": "vip", "inactif": "inactif",
}
_VALID_STATUS = {"nouveau", "prospect", "qualifie", "en_discussion", "client", "vip", "inactif", "perdu"}


async def set_contact_status_action(params: dict) -> dict:
    """Passe un contact dans un statut (gagné/perdu/en cours...)."""
    contact = await _find_contact(params)
    if not contact:
        return {"success": False, "error": "Contact non trouvé"}
    raw = (params.get("status") or params.get("value") or "").strip().lower()
    status = _STATUS_MAP.get(raw) or (raw if raw in _VALID_STATUS else None)
    if not status:
        return {"success": False, "error": f"Statut non reconnu: {params.get('status')}"}
    await db.contacts.update_one({"id": contact["id"]},
                                 {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "message": f"✅ {_contact_name(contact)} → statut « {status} »", "contact_id": contact["id"]}


async def add_contact_note_action(params: dict) -> dict:
    """Ajoute une note horodatée à une fiche (sans écraser l'existant)."""
    contact = await _find_contact(params)
    if not contact:
        return {"success": False, "error": "Contact non trouvé"}
    note = (params.get("note") or params.get("text") or "").strip()
    if not note:
        return {"success": False, "error": "Note vide"}
    existing = (contact.get("note") or "").strip()
    stamp = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    combined = (existing + "\n\n" if existing else "") + f"[{stamp}] {note}"
    await db.contacts.update_one({"id": contact["id"]},
                                 {"$set": {"note": combined, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "message": f"📝 Note ajoutée à {_contact_name(contact)}", "contact_id": contact["id"]}


async def schedule_followup_action(params: dict, user_id: str) -> dict:
    """Programme une relance = une tâche catégorie 'relance' avec échéance."""
    contact = await _find_contact(params) if (params.get("contact_id") or params.get("contact_name") or params.get("name")) else None
    due = params.get("due_date")
    label = params.get("label") or params.get("title") or (
        f"Relancer {_contact_name(contact)}" if contact else "Relance à faire")
    task = {
        "id": str(uuid.uuid4()),
        "title": label,
        "description": params.get("description", ""),
        "status": "todo",
        "priority": params.get("priority", "high"),
        "category": "relance",
        "due_date": due,
        "contact_id": contact["id"] if contact else params.get("contact_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
    }
    await db.tasks.insert_one(task)
    when = f" pour le {due}" if due else ""
    return {"success": True, "message": f"⏰ Relance programmée : {label}{when}", "task_id": task["id"]}


async def merge_contacts_action(params: dict) -> dict:
    """Fusionne deux fiches en doublon : garde la principale, déplace les liens, supprime le doublon."""
    primary = await _find_contact({"contact_id": params.get("primary_id"),
                                   "contact_name": params.get("primary_name") or params.get("keep")})
    duplicate = await _find_contact({"contact_id": params.get("duplicate_id"),
                                     "contact_name": params.get("duplicate_name") or params.get("remove")})
    if not primary or not duplicate:
        return {"success": False, "error": "Impossible d'identifier les deux fiches à fusionner."}
    if primary["id"] == duplicate["id"]:
        return {"success": False, "error": "Les deux fiches désignées sont la même."}
    # Complète les champs vides de la principale avec ceux du doublon
    fill = {}
    for k, v in duplicate.items():
        if k in ("_id", "id", "created_at", "email"):
            continue
        if v and not primary.get(k):
            fill[k] = v
    notes = [n for n in [primary.get("note"), duplicate.get("note")] if n]
    if len(notes) > 1:
        fill["note"] = "\n\n".join(notes)
    fill["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.contacts.update_one({"id": primary["id"]}, {"$set": fill})
    # Réaffecte les objets liés au doublon vers la principale
    moved = {}
    for coll in ("invoices", "tasks", "opportunities", "appointments", "quotes"):
        try:
            r = await db[coll].update_many({"contact_id": duplicate["id"]},
                                           {"$set": {"contact_id": primary["id"]}})
            if getattr(r, "modified_count", 0):
                moved[coll] = r.modified_count
        except Exception as e:
            logger.warning(f"merge_contacts: réaffectation {coll} échouée: {e}")
    await db.contacts.delete_one({"id": duplicate["id"]})
    detail = (" (" + ", ".join(f"{n} {c}" for c, n in moved.items()) + " déplacés)") if moved else ""
    return {"success": True, "message": f"🔗 Fiches fusionnées dans « {_contact_name(primary)} »{detail}.",
            "contact_id": primary["id"], "moved": moved}


async def create_quote_action(params: dict, user_id: str) -> dict:
    """Create a new quote/devis"""
    quote_id = str(uuid.uuid4())
    
    # Calculate totals
    services = params.get("services", [])
    subtotal = sum(
        s.get("quantity", 1) * s.get("unit_price", 0) * (1 - s.get("discount", 0) / 100)
        for s in services
    )
    tva_rate = 8.5  # Guadeloupe TVA
    tva_amount = subtotal * tva_rate / 100
    total = subtotal + tva_amount
    
    # Generate quote number
    count = await db.quotes.count_documents({})
    quote_number = f"DEV-{datetime.now().year}-{str(count + 1).zfill(4)}"
    
    quote = {
        "id": quote_id,
        "number": quote_number,
        "client_name": params.get("client_name", "Client"),
        "client_email": params.get("client_email", ""),
        "client_address": params.get("client_address", ""),
        "services": services,
        "subtotal": subtotal,
        "tva_rate": tva_rate,
        "tva_amount": tva_amount,
        "total": total,
        "notes": params.get("notes", ""),
        "status": "brouillon",
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id
    }
    
    await db.quotes.insert_one(quote)
    
    return {
        "success": True,
        "message": f"✅ Devis créé: {quote_number} pour {quote['client_name']} - Total: {total:.2f}€",
        "quote_id": quote_id,
        "quote_number": quote_number,
        "total": total
    }


async def get_document_action(params: dict) -> dict:
    """Get document details and content preview"""
    doc_id = params.get("document_id")
    doc_name = params.get("document_name")
    
    # Find by ID or name
    query = {}
    if doc_id:
        query["id"] = doc_id
    elif doc_name:
        query["name"] = {"$regex": doc_name, "$options": "i"}
    else:
        return {"success": False, "error": "ID ou nom du document requis"}
    
    document = await db.documents.find_one(query, {"_id": 0})
    if not document:
        return {"success": False, "error": "Document non trouvé"}
    
    # Get folder name if applicable
    folder_name = "Racine"
    if document.get("folder_id"):
        folder = await db.folders.find_one({"id": document["folder_id"]})
        if folder:
            folder_name = folder.get("name", "Inconnu")
    
    return {
        "success": True,
        "message": f"📄 Document trouvé: {document.get('name')}",
        "document": {
            "id": document.get("id"),
            "name": document.get("name"),
            "file_type": document.get("file_type"),
            "size": document.get("size_formatted"),
            "folder": folder_name,
            "url": document.get("url"),
            "content_type": document.get("content_type"),
            "created_at": document.get("created_at"),
            "tags": document.get("tags", [])
        }
    }


async def list_documents_action(params: dict) -> dict:
    """List documents with optional filters"""
    folder_name = params.get("folder_name")
    file_type = params.get("file_type")
    search = params.get("search")
    
    query = {}
    
    # Filter by folder
    if folder_name:
        folder = await db.folders.find_one({"name": {"$regex": folder_name, "$options": "i"}})
        if folder:
            query["folder_id"] = folder["id"]
    
    # Filter by type
    if file_type:
        query["file_type"] = file_type
    
    # Search by name
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    documents = await db.documents.find(query, {"_id": 0, "id": 1, "name": 1, "file_type": 1, "size_formatted": 1, "created_at": 1}).to_list(20)
    
    if not documents:
        return {
            "success": True,
            "message": "Aucun document trouvé avec ces critères",
            "documents": []
        }
    
    docs_list = "\n".join([f"• {d.get('name')} ({d.get('file_type')}, {d.get('size_formatted')})" for d in documents])
    
    return {
        "success": True,
        "message": f"📁 {len(documents)} document(s) trouvé(s):\n{docs_list}",
        "documents": documents
    }


# ==================== CONTEXT HELPERS ====================

async def get_app_context() -> str:
    """
    Fetch relevant data from the application to provide context to the AI.
    Returns a formatted string with current data summary.
    """
    context_parts = []
    today = datetime.now(timezone.utc)
    _JDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    context_parts.append(
        f"📅 AUJOURD'HUI : {_JDAYS[today.weekday()]} {today.strftime('%d/%m/%Y')} "
        f"(date ISO {today.strftime('%Y-%m-%d')}). Utilise-la pour résoudre les échéances relatives (demain, vendredi...).")

    def is_past_due(date_val):
        """Check if a date is in the past, handling various formats"""
        if not date_val:
            return False
        try:
            if isinstance(date_val, datetime):
                dt = date_val if date_val.tzinfo else date_val.replace(tzinfo=timezone.utc)
            elif isinstance(date_val, str):
                # Clean up the string
                date_str = date_val.replace("Z", "+00:00")
                if "+" not in date_str and "-" in date_str and "T" in date_str:
                    date_str = date_str + "+00:00"
                elif "T" not in date_str:
                    # Just a date without time
                    date_str = date_str + "T00:00:00+00:00"
                dt = datetime.fromisoformat(date_str)
            else:
                return False
            return dt < today
        except Exception:
            return False
    
    try:
        # 1. Invoices Summary
        invoices = await db.invoices.find({}, {"_id": 0, "id": 1, "number": 1, "status": 1, "total": 1, "client_name": 1, "due_date": 1}).to_list(100)
        if invoices:
            pending_invoices = [i for i in invoices if i.get("status") in ["pending", "sent"]]
            overdue_invoices = []
            for i in invoices:
                if i.get("status") == "overdue" or (is_past_due(i.get("due_date")) and i.get("status") not in ["paid", "cancelled"]):
                    overdue_invoices.append(i)
            paid_invoices = [i for i in invoices if i.get("status") == "paid"]
            
            total_pending = sum(i.get("total", 0) for i in pending_invoices)
            total_overdue = sum(i.get("total", 0) for i in overdue_invoices)
            total_paid = sum(i.get("total", 0) for i in paid_invoices)
            
            context_parts.append(f"""📄 FACTURES:
- {len(pending_invoices)} factures en attente (total: {total_pending:.2f}€)
- {len(overdue_invoices)} factures en retard (total: {total_overdue:.2f}€)
- {len(paid_invoices)} factures payées (total: {total_paid:.2f}€)""")
            
            if overdue_invoices:
                overdue_list = "\n".join([f"  • {i.get('number', 'N/A')} - {i.get('client_name', 'N/A')}: {i.get('total', 0):.2f}€" for i in overdue_invoices[:5]])
                context_parts.append(f"Factures en retard:\n{overdue_list}")
        
        # 2. Contacts Summary
        contacts = await db.contacts.find({}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "company": 1, "type": 1, "email": 1}).to_list(200)
        if contacts:
            leads = [c for c in contacts if c.get("type") == "lead"]
            clients = [c for c in contacts if c.get("type") == "client"]
            prospects = [c for c in contacts if c.get("type") == "prospect"]
            
            context_parts.append(f"""👥 CONTACTS:
- {len(leads)} leads
- {len(prospects)} prospects
- {len(clients)} clients
- Total: {len(contacts)} contacts""")
            
            if leads:
                recent_leads = leads[:5]
                leads_list = "\n".join([f"  • {l.get('first_name', '')} {l.get('last_name', '')} ({l.get('company', 'N/A')})" for l in recent_leads])
                context_parts.append(f"Leads récents:\n{leads_list}")
        
        # 3. Tasks Summary
        tasks = await db.tasks.find({}, {"_id": 0, "id": 1, "title": 1, "status": 1, "priority": 1, "due_date": 1}).to_list(100)
        if tasks:
            todo_tasks = [t for t in tasks if t.get("status") == "todo"]
            in_progress = [t for t in tasks if t.get("status") == "in_progress"]
            overdue_tasks = []
            for t in tasks:
                if is_past_due(t.get("due_date")) and t.get("status") not in ["done", "cancelled"]:
                    overdue_tasks.append(t)
            urgent_tasks = [t for t in tasks if t.get("priority") == "urgent" and t.get("status") not in ["done", "cancelled"]]
            
            context_parts.append(f"""✅ TÂCHES:
- {len(todo_tasks)} à faire
- {len(in_progress)} en cours
- {len(overdue_tasks)} en retard
- {len(urgent_tasks)} urgentes""")
            
            if urgent_tasks or overdue_tasks:
                priority_tasks = (urgent_tasks + overdue_tasks)[:5]
                tasks_list = "\n".join([f"  • {t.get('title', 'N/A')} (Priorité: {t.get('priority', 'N/A')})" for t in priority_tasks])
                context_parts.append(f"Tâches prioritaires:\n{tasks_list}")
        
        # 4. Pipeline/Opportunities Summary
        opportunities = await db.opportunities.find({}, {"_id": 0, "id": 1, "title": 1, "stage": 1, "value": 1, "contact_name": 1}).to_list(100)
        if opportunities:
            by_stage = {}
            for opp in opportunities:
                stage = opp.get("stage", "unknown")
                if stage not in by_stage:
                    by_stage[stage] = {"count": 0, "value": 0}
                by_stage[stage]["count"] += 1
                by_stage[stage]["value"] += opp.get("value", 0)
            
            total_pipeline = sum(opp.get("value", 0) for opp in opportunities)
            context_parts.append(f"""🎯 PIPELINE:
- Valeur totale: {total_pipeline:.2f}€
- {len(opportunities)} opportunités""")
            
            for stage, data in by_stage.items():
                context_parts.append(f"  • {stage}: {data['count']} ({data['value']:.2f}€)")
        
        # 5. Budget Summary (current month)
        current_month = today.strftime("%Y-%m")
        budget_entries = await db.budget.find({"month": {"$regex": f"^{current_month[:7]}"}}, {"_id": 0}).to_list(200)
        if budget_entries:
            income = sum(e.get("amount", 0) for e in budget_entries if e.get("type") == "income")
            expense = sum(e.get("amount", 0) for e in budget_entries if e.get("type") == "expense")
            balance = income - expense
            
            context_parts.append(f"""💰 BUDGET (ce mois):
- Revenus: {income:.2f}€
- Dépenses: {expense:.2f}€
- Solde: {balance:.2f}€""")
        
        # 6. Quotes Summary
        quotes = await db.quotes.find({}, {"_id": 0, "id": 1, "number": 1, "status": 1, "total": 1, "client_name": 1}).to_list(50)
        if quotes:
            pending_quotes = [q for q in quotes if q.get("status") in ["pending", "sent", "brouillon"]]
            accepted_quotes = [q for q in quotes if q.get("status") == "accepted"]
            
            context_parts.append(f"""📋 DEVIS:
- {len(pending_quotes)} devis en attente
- {len(accepted_quotes)} devis acceptés""")
            
            if pending_quotes:
                quotes_list = "\n".join([f"  • {q.get('number', 'N/A')} - {q.get('client_name', 'N/A')}: {q.get('total', 0):.2f}€" for q in pending_quotes[:5]])
                context_parts.append(f"Devis en cours:\n{quotes_list}")
        
        # 7. Documents Summary (File Manager)
        documents = await db.documents.find({}, {"_id": 0, "id": 1, "name": 1, "file_type": 1, "size_formatted": 1, "folder_id": 1, "created_at": 1}).to_list(100)
        folders = await db.folders.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
        
        if documents or folders:
            # Group documents by type
            by_type = {}
            for doc in documents:
                ft = doc.get("file_type", "other")
                if ft not in by_type:
                    by_type[ft] = []
                by_type[ft].append(doc)
            
            context_parts.append(f"""📁 DOCUMENTS:
- {len(documents)} fichiers au total
- {len(folders)} dossiers
- Types: {', '.join([f'{t} ({len(docs)})' for t, docs in by_type.items()])}""")
            
            # List recent documents
            recent_docs = sorted(documents, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
            if recent_docs:
                docs_list = "\n".join([f"  • {d.get('name', 'N/A')} ({d.get('file_type', 'N/A')}, {d.get('size_formatted', 'N/A')})" for d in recent_docs])
                context_parts.append(f"Fichiers récents:\n{docs_list}")
            
            # List folders
            if folders:
                folders_list = ", ".join([f.get("name", "N/A") for f in folders[:10]])
                context_parts.append(f"Dossiers: {folders_list}")
        
        # 8. Qonto Bank Data (if available)
        qonto_accounts = await db.qonto_accounts.find({}, {"_id": 0}).to_list(10)
        if qonto_accounts:
            total_balance = sum(acc.get("balance", 0) for acc in qonto_accounts)
            context_parts.append(f"""🏦 COMPTES QONTO:
- {len(qonto_accounts)} compte(s) bancaire(s)
- Solde total: {total_balance:.2f}€""")
            
            for acc in qonto_accounts[:3]:
                context_parts.append(f"  • {acc.get('name', acc.get('slug', 'Compte'))}: {acc.get('balance', 0):.2f}€ (IBAN: {acc.get('iban', 'N/A')[-4:]})")
        
        # Recent Qonto transactions
        qonto_txs = await db.qonto_transactions.find({}, {"_id": 0}).sort("settled_at", -1).to_list(10)
        if qonto_txs:
            credits = sum(tx.get("amount", 0) for tx in qonto_txs if tx.get("side") == "credit")
            debits = sum(tx.get("amount", 0) for tx in qonto_txs if tx.get("side") == "debit")
            context_parts.append(f"""💳 TRANSACTIONS RÉCENTES (Qonto):
- {len(qonto_txs)} transactions récentes
- Crédits: +{credits:.2f}€ / Débits: -{debits:.2f}€""")
            
            tx_list = []
            for tx in qonto_txs[:5]:
                label = tx.get("label", tx.get("note", "Transaction"))[:30]
                amount = tx.get("amount", 0)
                side = "+" if tx.get("side") == "credit" else "-"
                tx_list.append(f"  • {side}{abs(amount):.2f}€ - {label}")
            if tx_list:
                context_parts.append("\n".join(tx_list))
        
    except Exception as e:
        logger.error(f"Error fetching context: {str(e)}")
        context_parts.append(f"(Erreur lors de la récupération de certaines données: {str(e)})")
    
    if not context_parts:
        return "Aucune donnée disponible dans l'application."
    
    return "\n\n".join(context_parts)


# ==================== HELPERS ====================

async def check_daily_limit(user_id: str) -> tuple:
    """Check if user has reached daily limit"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = await db.ai_usage.find_one({"user_id": user_id, "date": today})
    calls_today = usage["calls"] if usage else 0
    return calls_today < AI_DAILY_LIMIT, AI_DAILY_LIMIT - calls_today

async def increment_usage(user_id: str):
    """Increment daily usage counter"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.ai_usage.update_one(
        {"user_id": user_id, "date": today},
        {"$inc": {"calls": 1}},
        upsert=True
    )


# ==================== ROUTES ====================

@router.get("/status")
async def get_enhanced_status(current_user: dict = Depends(get_current_user)):
    """Get enhanced AI assistant status"""
    user_id = current_user.get("user_id") or current_user.get("id")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    usage = await db.ai_usage.find_one({"user_id": user_id, "date": today})
    calls_today = usage["calls"] if usage else 0
    
    return {
        "enabled": EMERGENT_AVAILABLE and bool(EMERGENT_LLM_KEY),
        "calls_today": calls_today,
        "daily_limit": AI_DAILY_LIMIT,
        "remaining": max(0, AI_DAILY_LIMIT - calls_today),
        "features": {
            "chat": True,
            "image_analysis": EMERGENT_AVAILABLE,
            "image_generation": EMERGENT_AVAILABLE,
            "context_aware": True  # NEW: AI can access app data
        },
        "available_models": {
            "chat": ["gpt-4o", "gemini-3-flash-preview"],
            "image_analysis": ["gpt-4o", "gemini-3-flash-preview"],
            "image_generation": ["gemini-3-pro-image-preview"]
        }
    }


@router.get("/context")
async def get_context(current_user: dict = Depends(get_current_user)):
    """Get current app context that the AI has access to"""
    try:
        context = await get_app_context()
        return {
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


# ==================== Briefing du matin (cf. Assistant-Admin-Ameliorations §2) ====================
def _to_dt(val):
    """Parse une date (ISO/str/datetime) -> datetime aware UTC, ou None. Ne lève jamais."""
    if not val:
        return None
    try:
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        s = str(val).strip().replace("Z", "+00:00")
        if "T" not in s:
            s += "T00:00:00+00:00"
        dt = datetime.fromisoformat(s)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def _compute_briefing() -> dict:
    """Priorités du jour, calcul déterministe (sans LLM). Robuste : chaque section est isolée."""
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    items = []

    # --- Contacts / leads ---
    try:
        contacts = await db.contacts.find(
            {}, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "company": 1,
                 "status": 1, "score": 1, "score_value": 1, "source": 1, "created_at": 1}).to_list(1000)
    except Exception:
        contacts = []

    def _is_hot(c):
        sv = c.get("score_value")
        if isinstance(sv, (int, float)):
            return sv >= 70
        return c.get("score") in ("chaud", "chaude")

    new_leads = [c for c in contacts if (_to_dt(c.get("created_at")) and _to_dt(c.get("created_at")) >= day_ago)]
    hot_untreated = [c for c in contacts if c.get("status") == "nouveau" and _is_hot(c)]
    silent_hot = []
    for c in hot_untreated:
        dt = _to_dt(c.get("created_at"))
        if dt and (now - dt).days >= 3:
            silent_hot.append((c, (now - dt).days))

    if new_leads:
        items.append({"key": "new_leads", "severity": "info", "count": len(new_leads),
                      "label": f"{len(new_leads)} nouveau(x) lead(s) depuis hier",
                      "detail": ", ".join(_contact_name(c) for c in new_leads[:4])})
    if hot_untreated:
        items.append({"key": "hot_leads", "severity": "danger", "count": len(hot_untreated),
                      "label": f"{len(hot_untreated)} lead(s) chaud(s) à traiter",
                      "detail": ", ".join(_contact_name(c) for c in hot_untreated[:4])})
    for c, days in silent_hot[:3]:
        items.append({"key": "silent_hot", "severity": "danger", "count": 1,
                      "label": f"{_contact_name(c)} : lead chaud jamais rappelé depuis {days} jours",
                      "contact_id": c.get("id")})

    # --- Factures & devis ---
    try:
        invoices = await db.invoices.find(
            {}, {"_id": 0, "id": 1, "invoice_number": 1, "number": 1, "document_type": 1, "status": 1,
                 "total": 1, "client_name": 1, "contact_id": 1, "due_date": 1, "created_at": 1}).to_list(1000)
    except Exception:
        invoices = []
    PAID = ("payée", "payee", "payé", "paye", "annulée", "annulee", "annulé")
    stale_quotes, overdue_inv = [], []
    for inv in invoices:
        status = (inv.get("status") or "").lower()
        if inv.get("document_type", "facture") == "devis":
            cdt = _to_dt(inv.get("created_at"))
            if status == "brouillon" and cdt and cdt <= day_ago:
                stale_quotes.append(inv)
        else:
            if status in PAID or status == "brouillon":
                continue
            due = _to_dt(inv.get("due_date"))
            if status == "en_retard" or (due and due < now):
                overdue_inv.append(inv)
    if stale_quotes:
        items.append({"key": "stale_quotes", "severity": "warning", "count": len(stale_quotes),
                      "label": f"{len(stale_quotes)} devis attendent ta validation (plus de 24h)"})
    if overdue_inv:
        tot = sum((i.get("total") or 0) for i in overdue_inv)
        items.append({"key": "overdue_invoices", "severity": "danger", "count": len(overdue_inv),
                      "label": f"{len(overdue_inv)} facture(s) en retard ({tot:.0f}€)"})

    # --- Tâches ---
    try:
        tasks = await db.tasks.find(
            {}, {"_id": 0, "id": 1, "title": 1, "status": 1, "category": 1, "due_date": 1}).to_list(1000)
    except Exception:
        tasks = []
    overdue_tasks = []
    for t in tasks:
        if (t.get("status") or "") in ("done", "cancelled", "annulée"):
            continue
        due = _to_dt(t.get("due_date"))
        if due and due < now:
            overdue_tasks.append(t)
    if overdue_tasks:
        relances = [t for t in overdue_tasks if t.get("category") == "relance"]
        lbl = f"{len(overdue_tasks)} tâche(s) en retard"
        if relances:
            lbl += f" (dont {len(relances)} relance(s))"
        items.append({"key": "overdue_tasks", "severity": "warning", "count": len(overdue_tasks), "label": lbl})

    # --- Rendez-vous du jour ---
    try:
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        appts = await db.appointments.find(
            {}, {"_id": 0, "id": 1, "title": 1, "start_datetime": 1, "contact_name": 1}).to_list(500)
        today_appts = [a for a in appts if (_to_dt(a.get("start_datetime")) and start <= _to_dt(a.get("start_datetime")) < end)]
        if today_appts:
            items.append({"key": "appointments", "severity": "info", "count": len(today_appts),
                          "label": f"{len(today_appts)} rendez-vous aujourd'hui",
                          "detail": ", ".join(a.get("title") or a.get("contact_name") or "RDV" for a in today_appts[:3])})
    except Exception:
        pass

    return {"items": items, "generated_at": now.isoformat()}


@router.get("/briefing")
async def get_briefing(current_user: dict = Depends(get_current_user)):
    """Briefing du matin : priorités du jour (déterministe) + résumé en langage naturel (Gemini, repli sûr)."""
    data = await _compute_briefing()
    items = data["items"]
    brief = ""
    if items and GEMINI_AVAILABLE and _gemini_client:
        try:
            lines = "\n".join("- " + it["label"] + (f" ({it['detail']})" if it.get("detail") else "") for it in items)
            system = ("Tu es l'assistant d'Alpha Agency (agence de communication, Guadeloupe). "
                      "Rédige le BRIEFING DU MATIN de l'équipe en 2 à 4 phrases courtes, en français, ton direct et "
                      "actionnable, sans liste à puces ni salutation pompeuse. Mets en avant l'urgent (leads chauds, "
                      "retards) et dis par quoi commencer. Si rien n'est urgent, rassure en une phrase.")
            user = "Priorités détectées aujourd'hui :\n" + lines + "\n\nRédige mon briefing du matin."
            brief = await _gemini_generate(system, [ChatMessage(role="user", content=user)], "gemini-2.5-flash")
        except Exception as e:
            logger.warning(f"briefing NL échoué: {e}")
    if not brief:
        brief = ("À traiter aujourd'hui : " + " ; ".join(it["label"] for it in items) + "."
                 if items else "Tout est sous contrôle : aucune urgence détectée pour le moment.")
    return {"brief": brief, "items": items, "generated_at": data["generated_at"]}


@router.post("/execute-action")
async def execute_action_endpoint(request: ActionRequest, current_user: dict = Depends(get_current_user)):
    """Execute an action directly (without AI)"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    result = await execute_action(request.action_type, request.params, user_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Action échouée"))
    
    return result


@router.post("/chat")
async def enhanced_chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Chat with AI - supports text and image attachments. Now context-aware!"""
    # Prefer direct Gemini when a gemini model is requested and the key is set.
    use_gemini = (request.model or "").startswith("gemini") and GEMINI_AVAILABLE
    if not use_gemini:
        if not EMERGENT_AVAILABLE:
            raise HTTPException(status_code=503, detail="Module IA non disponible")
        if not EMERGENT_LLM_KEY:
            raise HTTPException(status_code=503, detail="Clé API non configurée (ni Gemini ni Emergent)")

    user_id = current_user.get("user_id") or current_user.get("id")
    can_proceed, remaining = await check_daily_limit(user_id)
    if not can_proceed:
        raise HTTPException(status_code=429, detail=f"Limite quotidienne atteinte ({AI_DAILY_LIMIT}/jour)")
    
    try:
        # Create conversation if needed
        conversation_id = request.conversation_id or str(uuid.uuid4())
        session_id = f"alpha-{user_id}-{conversation_id}"
        
        # Build context-aware system message with actions capability
        base_system_message = """Tu es l'assistant IA d'Alpha Agency, une agence de communication digitale en Guadeloupe.
Tu aides l'équipe avec leurs tâches quotidiennes: analyse de données, rédaction, conseils marketing, etc.
Tu peux analyser des images si l'utilisateur en envoie.
Réponds toujours en français, de manière professionnelle mais amicale.

IMPORTANT: Tu as accès aux données en temps réel de l'application CRM. Utilise ces informations pour répondre aux questions sur les factures, contacts, tâches, pipeline, budget, etc.
Quand on te pose des questions comme "quelles factures sont impayées?" ou "quel contact attend une proposition?", consulte les données ci-dessous pour répondre de manière précise."""

        # Add action capabilities if enabled
        action_instructions = ""
        if request.enable_actions:
            action_instructions = """

🔧 CAPACITÉS D'ACTION:
Tu peux effectuer des actions dans le CRM si l'utilisateur te le demande. Quand tu détectes une demande d'action, inclus un bloc JSON d'action à la FIN de ta réponse dans ce format exact:

[ACTION]
{"action_type": "type", "params": {...}}
[/ACTION]

Actions disponibles:
1. create_task - Créer une tâche
   Params: title (requis), description, priority (low/medium/high/urgent), due_date (YYYY-MM-DD), contact_id
   
2. mark_task_done - Marquer une tâche comme terminée
   Params: task_title OU task_id
   
3. update_contact - Modifier un contact (champs divers)
   Params: contact_name OU contact_id, updates: {phone, email, company, note, status, score, poste, budget, project_type, city, tags}

4. set_contact_status - Changer le statut d'un contact en langage naturel
   Params: contact_name OU contact_id, status (ex: "gagné", "perdu", "en cours", "client", "qualifié")

5. add_contact_note - Ajouter une note horodatée à une fiche (sans rien écraser)
   Params: contact_name OU contact_id, note (texte)

6. schedule_followup - Programmer une relance (crée une tâche catégorie "relance")
   Params: contact_name OU contact_id (optionnel), due_date (YYYY-MM-DD), label (optionnel)

7. merge_contacts - Fusionner deux fiches en doublon (garde la principale, déplace les liens, supprime le doublon)
   Params: keep (nom/entreprise de la fiche à garder), remove (nom/entreprise du doublon) — OU primary_id / duplicate_id

8. create_quote - Créer un devis
   Params: client_name (requis), client_email, services: [{title, description, quantity, unit_price}], notes

9. get_document - Obtenir les détails d'un document uploadé
   Params: document_name OU document_id

10. list_documents - Lister les documents avec filtres
   Params: folder_name (optionnel), file_type (optionnel: image, document, spreadsheet, video, audio, archive), search (optionnel)

Exemples:
- "Crée une tâche pour rappeler Jean demain" → [ACTION]{"action_type": "create_task", "params": {"title": "Rappeler Jean", "due_date": "2026-06-03", "priority": "medium"}}[/ACTION]
- "Passe ce lead en gagné" / "Marque Dupont comme client" → [ACTION]{"action_type": "set_contact_status", "params": {"contact_name": "Dupont", "status": "gagné"}}[/ACTION]
- "Programme une relance pour vendredi pour Martin" → [ACTION]{"action_type": "schedule_followup", "params": {"contact_name": "Martin", "due_date": "2026-06-05"}}[/ACTION]
- "Ajoute une note : a déjà travaillé avec une agence, déçu du délai" → [ACTION]{"action_type": "add_contact_note", "params": {"contact_name": "...", "note": "A déjà travaillé avec une agence, déçu du délai"}}[/ACTION]
- "Fusionne les deux fiches Sophie Bernard en doublon" → [ACTION]{"action_type": "merge_contacts", "params": {"keep": "Sophie Bernard", "remove": "Sophie Bernard"}}[/ACTION]
- "Marque la tâche 'Appeler client' comme terminée" → [ACTION]{"action_type": "mark_task_done", "params": {"task_title": "Appeler client"}}[/ACTION]
- "Montre-moi les documents PDF" → [ACTION]{"action_type": "list_documents", "params": {"file_type": "document"}}[/ACTION]

RÈGLES D'ACTION : la date du jour t'est donnée dans le contexte (utilise-la pour résoudre "demain", "vendredi"). N'exécute une action QUE si l'utilisateur le demande clairement. Pour les actions irréversibles (merge_contacts notamment) ou si un détail manque, reformule ce que tu vas faire et demande confirmation AVANT d'émettre le bloc [ACTION]."""
        
        # Fetch app context if enabled
        context_data = ""
        if request.include_context:
            context_data = await get_app_context()
            system_message = f"""{base_system_message}{action_instructions}

═══════════════════════════════════════════════
📊 DONNÉES ACTUELLES DE L'APPLICATION (mis à jour en temps réel):
═══════════════════════════════════════════════

{context_data}

═══════════════════════════════════════════════
Utilise ces données pour répondre aux questions de l'utilisateur. Si l'utilisateur demande des informations non disponibles dans le contexte, indique-le clairement."""
        else:
            system_message = base_system_message + action_instructions
        
        model = request.model or "gpt-4o"

        # Get the last user message
        last_msg = request.messages[-1] if request.messages else None
        if not last_msg or last_msg.role != "user":
            raise HTTPException(status_code=400, detail="Message utilisateur requis")

        if use_gemini:
            # Direct Gemini with the full conversation (text). Images fall back to Emergent.
            if last_msg.image_url and last_msg.image_url.startswith("data:") and EMERGENT_AVAILABLE and EMERGENT_LLM_KEY:
                chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message)
                chat.with_model("gemini", model)
                base64_data = last_msg.image_url.split(",")[1] if "," in last_msg.image_url else last_msg.image_url
                response = await chat.send_message(UserMessage(text=last_msg.content, file_contents=[ImageContent(image_base64=base64_data)]))
            else:
                response = await _gemini_generate(system_message, request.messages, model)
        else:
            # Emergent fallback (OpenAI / Gemini via Emergent universal key)
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system_message)
            if model.startswith("gemini"):
                chat.with_model("gemini", model)
            else:
                chat.with_model("openai", model)
            if last_msg.image_url and last_msg.image_url.startswith("data:"):
                base64_data = last_msg.image_url.split(",")[1] if "," in last_msg.image_url else last_msg.image_url
                user_message = UserMessage(text=last_msg.content, file_contents=[ImageContent(image_base64=base64_data)])
            else:
                user_message = UserMessage(text=last_msg.content)
            response = await chat.send_message(user_message)

        # Check for actions in response
        action_result = None
        clean_response = response
        if request.enable_actions and "[ACTION]" in response:
            import re
            action_match = re.search(r'\[ACTION\](.*?)\[/ACTION\]', response, re.DOTALL)
            if action_match:
                try:
                    action_json = action_match.group(1).strip()
                    action_data = json.loads(action_json)
                    action_result = await execute_action(
                        action_data.get("action_type"),
                        action_data.get("params", {}),
                        user_id
                    )
                    # Remove action block from displayed response
                    clean_response = response.replace(action_match.group(0), "").strip()
                    if action_result.get("success"):
                        clean_response += f"\n\n{action_result.get('message', '')}"
                    else:
                        clean_response += f"\n\n⚠️ Erreur d'action: {action_result.get('error', 'Erreur inconnue')}"
                except json.JSONDecodeError as je:
                    logger.error(f"Action JSON parse error: {je}")
                except Exception as ae:
                    logger.error(f"Action execution error: {ae}")
        
        # Increment usage
        await increment_usage(user_id)
        
        # Save conversation
        await db.ai_conversations.update_one(
            {"id": conversation_id, "user_id": user_id},
            {
                "$set": {
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "model": model
                },
                "$push": {
                    "messages": {
                        "$each": [
                            {"role": "user", "content": last_msg.content, "timestamp": datetime.now(timezone.utc).isoformat()},
                            {"role": "assistant", "content": clean_response, "timestamp": datetime.now(timezone.utc).isoformat()}
                        ]
                    }
                },
                "$setOnInsert": {
                    "id": conversation_id,
                    "user_id": user_id,
                    "title": last_msg.content[:50] + "..." if len(last_msg.content) > 50 else last_msg.content,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {
            "message": clean_response,
            "conversation_id": conversation_id,
            "action_executed": action_result,
            "usage": {
                "calls_today": (await db.ai_usage.find_one({"user_id": user_id, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}))["calls"],
                "remaining": remaining - 1
            }
        }
        
    except Exception as e:
        logger.error(f"Enhanced chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    prompt: str = Form("Décris cette image en détail"),
    model: str = Form("gpt-4o"),
    current_user: dict = Depends(get_current_user)
):
    """Analyze an uploaded image"""
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Module IA non disponible")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="Clé API non configurée")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    can_proceed, remaining = await check_daily_limit(user_id)
    if not can_proceed:
        raise HTTPException(status_code=429, detail="Limite quotidienne atteinte")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez JPEG, PNG ou WebP")
    
    try:
        # Read and encode image
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Image trop volumineuse (max 10MB)")
        
        image_base64 = base64.b64encode(content).decode('utf-8')
        
        # Initialize chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analyze-{user_id}-{uuid.uuid4()}",
            system_message="Tu es un expert en analyse d'images. Décris et analyse les images de manière détaillée en français."
        )
        
        if model.startswith("gemini"):
            chat.with_model("gemini", model)
        else:
            chat.with_model("openai", model)
        
        # Send message with image
        user_message = UserMessage(
            text=prompt,
            file_contents=[ImageContent(image_base64=image_base64)]
        )
        
        response = await chat.send_message(user_message)
        await increment_usage(user_id)
        
        return {
            "analysis": response,
            "model": model,
            "usage": {"remaining": remaining - 1}
        }
        
    except Exception as e:
        logger.error(f"Image analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse: {str(e)}")


@router.post("/generate-image")
async def generate_image(request: ImageGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate an image from a text prompt using Gemini Nano Banana"""
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Module IA non disponible")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="Clé API non configurée")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    can_proceed, remaining = await check_daily_limit(user_id)
    if not can_proceed:
        raise HTTPException(status_code=429, detail="Limite quotidienne atteinte")
    
    try:
        # Initialize chat for image generation
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"generate-{user_id}-{uuid.uuid4()}",
            system_message="Tu es un générateur d'images créatif."
        )
        
        # Use Gemini for image generation
        chat.with_model("gemini", request.model or "gemini-3-pro-image-preview")
        chat.with_params(modalities=["image", "text"])
        
        # Generate image
        user_message = UserMessage(text=request.prompt)
        text, images = await chat.send_message_multimodal_response(user_message)
        
        await increment_usage(user_id)
        
        if images and len(images) > 0:
            # Return first generated image
            image_data = images[0]
            return {
                "success": True,
                "image": {
                    "data": image_data.get("data", ""),  # base64 encoded
                    "mime_type": image_data.get("mime_type", "image/png")
                },
                "text_response": text,
                "usage": {"remaining": remaining - 1}
            }
        else:
            return {
                "success": False,
                "message": text or "Aucune image générée",
                "usage": {"remaining": remaining - 1}
            }
        
    except Exception as e:
        logger.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de génération: {str(e)}")


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get user's AI conversations"""
    user_id = current_user.get("user_id") or current_user.get("id")
    conversations = await db.ai_conversations.find(
        {"user_id": user_id},
        {"_id": 0, "messages": 0}
    ).sort("updated_at", -1).to_list(50)
    return conversations


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific conversation"""
    user_id = current_user.get("user_id") or current_user.get("id")
    conversation = await db.ai_conversations.find_one(
        {"id": conversation_id, "user_id": user_id},
        {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    return conversation


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a conversation"""
    user_id = current_user.get("user_id") or current_user.get("id")
    result = await db.ai_conversations.delete_one({"id": conversation_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    return {"message": "Conversation supprimée"}
