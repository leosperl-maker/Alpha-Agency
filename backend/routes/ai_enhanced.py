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
from datetime import datetime, timezone, timedelta
import logging
import json

from .database import db, get_current_user

router = APIRouter(prefix="/ai-enhanced", tags=["AI Enhanced"])
logger = logging.getLogger(__name__)

# Environment variables
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
AI_DAILY_LIMIT = 200

# Check if emergentintegrations is available
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("emergentintegrations not installed - AI features will be limited")


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
    
    # Only allow certain fields to be updated
    allowed_fields = ["phone", "email", "company", "notes", "type", "tags"]
    safe_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    safe_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.contacts.update_one({"id": contact["id"]}, {"$set": safe_updates})
    
    return {
        "success": True,
        "message": f"✅ Contact mis à jour: {contact.get('first_name', '')} {contact.get('last_name', '')}",
        "contact_id": contact["id"],
        "updates": safe_updates
    }


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


# ==================== CONTEXT HELPERS ====================

async def get_app_context() -> str:
    """
    Fetch relevant data from the application to provide context to the AI.
    Returns a formatted string with current data summary.
    """
    context_parts = []
    today = datetime.now(timezone.utc)
    
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
    if not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Module IA non disponible")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="Clé API non configurée")
    
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
   
3. update_contact - Modifier un contact
   Params: contact_name OU contact_id, updates: {phone, email, company, notes, type, tags}
   
4. create_quote - Créer un devis
   Params: client_name (requis), client_email, services: [{title, description, quantity, unit_price}], notes

Exemples:
- "Crée une tâche pour rappeler Jean demain" → Inclure [ACTION]{"action_type": "create_task", "params": {"title": "Rappeler Jean", "due_date": "2026-01-12", "priority": "medium"}}[/ACTION]
- "Marque la tâche 'Appeler client' comme terminée" → [ACTION]{"action_type": "mark_task_done", "params": {"task_title": "Appeler client"}}[/ACTION]

IMPORTANT: N'exécute une action que si l'utilisateur le demande explicitement. Demande confirmation pour les actions irréversibles."""
        
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
        
        # Initialize chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message
        )
        
        # Set model
        model = request.model or "gpt-4o"
        if model.startswith("gemini"):
            chat.with_model("gemini", model)
        else:
            chat.with_model("openai", model)
        
        # Get the last user message
        last_msg = request.messages[-1] if request.messages else None
        if not last_msg or last_msg.role != "user":
            raise HTTPException(status_code=400, detail="Message utilisateur requis")
        
        # Build message with optional image
        if last_msg.image_url and last_msg.image_url.startswith("data:"):
            # Extract base64 from data URL
            base64_data = last_msg.image_url.split(",")[1] if "," in last_msg.image_url else last_msg.image_url
            user_message = UserMessage(
                text=last_msg.content,
                file_contents=[ImageContent(image_base64=base64_data)]
            )
        else:
            user_message = UserMessage(text=last_msg.content)
        
        # Send message
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
