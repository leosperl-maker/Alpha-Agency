"""
WhatsApp Integration for MoltBot
Handles WhatsApp Business communication for CRM automation
Supports: Sending messages, receiving webhooks, QR code auth
"""
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx
import logging
import json

from .database import db

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])
logger = logging.getLogger(__name__)

# Configuration
WHATSAPP_SERVICE_URL = os.environ.get('WHATSAPP_SERVICE_URL', 'http://localhost:3001')
MOLTBOT_SECRET = os.environ.get('MOLTBOT_SECRET', 'moltbot-alpha-secret-2024')

# Admin phone numbers for full access
ADMIN_PHONES = os.environ.get('MOLTBOT_ADMIN_PHONES', '').split(',')

# ==================== MODELS ====================

class WhatsAppConfig(BaseModel):
    admin_phone: str
    morning_briefing: bool = True
    morning_time: str = "08:00"
    evening_recap: bool = True
    evening_time: str = "18:00"
    notify_new_leads: bool = True
    notify_payments: bool = True
    notify_overdue: bool = True

class IncomingMessage(BaseModel):
    phone_number: str
    message: str = ""
    message_id: Optional[str] = None
    timestamp: Optional[int] = None
    message_type: str = "text"  # text, audio, image, video, document
    audio_url: Optional[str] = None
    audio_path: Optional[str] = None  # Local path for downloaded audio
    media_url: Optional[str] = None

class OutgoingMessage(BaseModel):
    phone_number: str
    message: str
    message_type: str = "text"  # text, image, document

class WhatsAppStatus(BaseModel):
    connected: bool
    phone_number: Optional[str] = None
    name: Optional[str] = None
    qr_code: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def is_admin(phone: str) -> bool:
    """Check if phone number is admin"""
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '')
    for admin in ADMIN_PHONES:
        if admin and clean_phone.endswith(admin.replace('+', '').replace(' ', '')[-9:]):
            return True
    return False

async def process_admin_command(phone: str, message: str) -> str:
    """Process commands from admin via WhatsApp"""
    msg = message.lower().strip()
    
    try:
        # Stats commands
        if any(x in msg for x in ['ca', 'chiffre', 'stats', 'revenue']):
            stats = await get_crm_stats()
            return f"""📊 *Stats du mois*

💰 CA: {stats['revenue']}€
👥 Nouveaux contacts: {stats['new_contacts']}
📋 Tâches en cours: {stats['pending_tasks']}
📅 RDV à venir: {stats['upcoming_appointments']}"""

        # Briefing
        elif any(x in msg for x in ['briefing', 'journée', 'aujourd']):
            briefing = await get_daily_briefing()
            return briefing

        # Recap
        elif any(x in msg for x in ['recap', 'récap', 'bilan']):
            recap = await get_daily_recap()
            return recap

        # Tasks
        elif 'tâche' in msg or 'task' in msg:
            if 'crée' in msg or 'ajoute' in msg:
                # Extract task title
                parts = msg.split(':')
                if len(parts) > 1:
                    title = parts[1].strip()
                    task_id = await create_task(title)
                    return f"✅ Tâche créée: {title}"
                return "Pour créer une tâche: 'Crée tâche: titre de la tâche'"
            elif 'terminé' in msg or 'fait' in msg:
                return "✅ Tâche marquée comme terminée"
            else:
                tasks = await get_pending_tasks()
                return tasks

        # Contacts
        elif 'contact' in msg or 'client' in msg:
            if 'cherche' in msg or 'trouve' in msg:
                search_term = msg.split('cherche')[-1].split('trouve')[-1].strip()
                result = await search_contact(search_term)
                return result
            else:
                return "Utilisez: 'Cherche contact: nom'"

        # Devis
        elif 'devis' in msg:
            if 'crée' in msg:
                return "Pour créer un devis: 'Crée devis 2000€ pour Client, description'"
            return await get_recent_quotes()

        # Help
        elif any(x in msg for x in ['aide', 'help', 'commande']):
            return """🤖 *Commandes MoltBot*

📊 Stats: "CA du mois", "Stats"
☀️ Briefing: "Briefing", "Ma journée"
🌙 Récap: "Récap", "Bilan"
📋 Tâches: "Mes tâches", "Crée tâche: ..."
👥 Contacts: "Cherche contact: nom"
📄 Devis: "Mes devis", "Crée devis..."

Tapez une commande pour commencer !"""

        else:
            return """Je n'ai pas compris. Tapez "aide" pour voir les commandes disponibles.

Exemples rapides:
• "CA du mois"
• "Mes tâches"  
• "Briefing"
• "Crée tâche: appeler client" """

    except Exception as e:
        logger.error(f"Error processing command: {e}")
        return "Erreur lors du traitement. Réessayez ou tapez 'aide'."

async def get_crm_stats() -> Dict:
    """Get CRM stats for WhatsApp response"""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    new_contacts = await db.contacts.count_documents({"created_at": {"$gte": month_start}})
    pending_tasks = await db.tasks.count_documents({"status": "todo"})
    
    invoices = await db.invoices.find(
        {"type": "facture", "status": "paid", "paid_at": {"$gte": month_start}},
        {"total": 1}
    ).to_list(1000)
    revenue = sum(inv.get("total", 0) for inv in invoices)
    
    upcoming_rdv = await db.appointments.count_documents({
        "start_time": {"$gte": now.isoformat()}
    })
    
    return {
        "revenue": f"{revenue:,.0f}".replace(",", " "),
        "new_contacts": new_contacts,
        "pending_tasks": pending_tasks,
        "upcoming_appointments": upcoming_rdv
    }

async def get_daily_briefing() -> str:
    """Generate daily briefing message"""
    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    now = datetime.now(timezone.utc)
    
    # Tasks
    tasks = await db.tasks.find(
        {"status": "todo"},
        {"_id": 0, "title": 1, "priority": 1}
    ).limit(5).to_list(5)
    
    # Appointments
    appointments = await db.appointments.find(
        {"start_time": {"$regex": f"^{today_str}"}},
        {"_id": 0, "title": 1, "start_time": 1}
    ).to_list(10)
    
    # New leads (last 24h)
    yesterday = (now - timedelta(days=1)).isoformat()
    new_leads = await db.contacts.count_documents({"created_at": {"$gte": yesterday}})
    
    # Build message
    msg = f"☀️ *Briefing du {today.strftime('%d/%m/%Y')}*\n\n"
    
    # Tasks section
    msg += f"📋 *Tâches:* {len(tasks)}\n"
    for t in tasks[:3]:
        priority = "🔴" if t.get("priority") == "urgent" else "🟠" if t.get("priority") == "high" else "🟢"
        msg += f"  {priority} {t['title']}\n"
    if len(tasks) > 3:
        msg += f"  ... et {len(tasks)-3} autres\n"
    
    # Appointments section
    msg += f"\n📅 *RDV:* {len(appointments)}\n"
    for rdv in appointments[:3]:
        time = datetime.fromisoformat(rdv['start_time'].replace('Z', '+00:00'))
        msg += f"  • {time.strftime('%H:%M')} - {rdv['title']}\n"
    
    # Alerts
    if new_leads:
        msg += f"\n🆕 *{new_leads} nouveau(x) lead(s)*"
    
    msg += "\n\nBonne journée ! 💪"
    return msg

async def get_daily_recap() -> str:
    """Generate daily recap message"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Completed tasks
    completed = await db.tasks.count_documents({
        "status": "done",
        "completed_at": {"$gte": today_start}
    })
    
    # Remaining tasks
    remaining = await db.tasks.count_documents({"status": "todo"})
    
    # New contacts today
    new_contacts = await db.contacts.count_documents({"created_at": {"$gte": today_start}})
    
    msg = f"🌙 *Récap de la journée*\n\n"
    msg += f"✅ Tâches terminées: {completed}\n"
    msg += f"⏳ Tâches restantes: {remaining}\n"
    msg += f"👥 Nouveaux contacts: {new_contacts}\n"
    msg += "\nBonne soirée ! 🌟"
    
    return msg

async def get_pending_tasks() -> str:
    """Get pending tasks formatted for WhatsApp"""
    tasks = await db.tasks.find(
        {"status": "todo"},
        {"_id": 0, "title": 1, "priority": 1}
    ).limit(10).to_list(10)
    
    if not tasks:
        return "✅ Aucune tâche en cours !"
    
    msg = "📋 *Vos tâches:*\n\n"
    for i, t in enumerate(tasks, 1):
        priority = "🔴" if t.get("priority") == "urgent" else "🟠" if t.get("priority") == "high" else "🟢"
        msg += f"{i}. {priority} {t['title']}\n"
    
    return msg

async def create_task(title: str) -> str:
    """Create a task from WhatsApp"""
    task_id = str(uuid.uuid4())
    task = {
        "id": task_id,
        "title": title,
        "status": "todo",
        "priority": "medium",
        "source": "whatsapp",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tasks.insert_one(task)
    return task_id

async def search_contact(name: str) -> str:
    """Search contact by name"""
    contact = await db.contacts.find_one(
        {"$or": [
            {"first_name": {"$regex": name, "$options": "i"}},
            {"last_name": {"$regex": name, "$options": "i"}},
            {"company": {"$regex": name, "$options": "i"}}
        ]},
        {"_id": 0}
    )
    
    if not contact:
        return f"❌ Aucun contact trouvé pour '{name}'"
    
    return f"""👤 *{contact.get('first_name', '')} {contact.get('last_name', '')}*

📧 {contact.get('email', 'N/A')}
📱 {contact.get('phone', 'N/A')}
🏢 {contact.get('company', 'N/A')}
🏷️ {contact.get('status', 'N/A')}"""

async def get_recent_quotes() -> str:
    """Get recent quotes"""
    quotes = await db.invoices.find(
        {"type": "devis"},
        {"_id": 0, "number": 1, "client_name": 1, "total": 1, "status": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    if not quotes:
        return "📄 Aucun devis récent"
    
    msg = "📄 *Derniers devis:*\n\n"
    for q in quotes:
        status = "✅" if q.get("status") == "paid" else "📤" if q.get("status") == "sent" else "📝"
        msg += f"{status} {q['number']} - {q['client_name']} - {q.get('total', 0)}€\n"
    
    return msg

# ==================== API ENDPOINTS ====================

@router.get("/status")
async def get_whatsapp_status():
    """Get WhatsApp connection status"""
    # Check if connected to WhatsApp service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status")
            if response.status_code == 200:
                return response.json()
    except:
        pass
    
    # Return disconnected status with setup instructions
    return {
        "connected": False,
        "message": "WhatsApp non connecté",
        "setup_required": True,
        "instructions": "Lancez le service WhatsApp et scannez le QR code"
    }

@router.get("/qr")
async def get_qr_code():
    """Get QR code for WhatsApp authentication"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/qr")
            return response.json()
    except:
        return {"qr": None, "message": "Service WhatsApp non disponible"}

@router.post("/webhook")
async def whatsapp_webhook(message: IncomingMessage):
    """
    Webhook for incoming WhatsApp messages
    Processes messages from admin users for CRM control
    Supports text and audio messages
    """
    logger.info(f"WhatsApp message from {message.phone_number}: type={message.message_type}, text={message.message[:50] if message.message else 'audio/media'}")
    
    # Process text from message
    text_content = message.message
    was_transcribed = False
    
    # If audio message, transcribe it first
    if message.message_type == "audio":
        from routes.audio_transcription import transcribe_for_moltbot
        
        transcribed_text = None
        
        # Try local file path first (from Node service)
        if message.audio_path:
            logger.info(f"Transcribing audio from local path: {message.audio_path}")
            transcribed_text = await transcribe_for_moltbot(file_path=message.audio_path)
            
            # Clean up temp file after transcription
            try:
                import os
                if os.path.exists(message.audio_path):
                    os.unlink(message.audio_path)
            except Exception as e:
                logger.warning(f"Could not delete temp audio file: {e}")
        
        # Fall back to URL if available
        elif message.audio_url:
            logger.info(f"Transcribing audio from URL: {message.audio_url}")
            transcribed_text = await transcribe_for_moltbot(url=message.audio_url)
        
        if transcribed_text:
            text_content = transcribed_text
            was_transcribed = True
            logger.info(f"Transcribed: {transcribed_text[:100]}")
        else:
            text_content = "[Audio non reconnu]"
    
    # Store message
    await db.whatsapp_messages.insert_one({
        "phone_number": message.phone_number,
        "message": text_content,
        "original_message": message.message,
        "message_type": message.message_type,
        "direction": "incoming",
        "message_id": message.message_id,
        "timestamp": message.timestamp or datetime.now(timezone.utc).timestamp(),
        "audio_url": message.audio_url,
        "transcribed": was_transcribed,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Check if admin
    if is_admin(message.phone_number):
        # Process command
        reply = await process_admin_command(message.phone_number, text_content)
        return {"reply": reply, "is_admin": True, "transcribed": was_transcribed}
    else:
        # Public response - limited
        return {
            "reply": "Bonjour ! Je suis l'assistant Alpha Agency. Pour plus d'informations, visitez notre site web ou contactez-nous au 0691 266 003.",
            "is_admin": False
        }

@router.post("/send")
async def send_whatsapp_message(
    message: OutgoingMessage,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """Send a WhatsApp message"""
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={
                    "phone_number": message.phone_number,
                    "message": message.message
                }
            )
            
            # Store outgoing message
            await db.whatsapp_messages.insert_one({
                "phone_number": message.phone_number,
                "message": message.message,
                "direction": "outgoing",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return response.json()
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-briefing")
async def send_morning_briefing(
    phone_number: str,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """Send morning briefing to admin"""
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    briefing = await get_daily_briefing()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={"phone_number": phone_number, "message": briefing}
            )
            return {"success": True, "message": "Briefing envoyé"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/send-recap")
async def send_evening_recap(
    phone_number: str,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """Send evening recap to admin"""
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    recap = await get_daily_recap()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={"phone_number": phone_number, "message": recap}
            )
            return {"success": True, "message": "Récap envoyé"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/config")
async def get_whatsapp_config():
    """Get WhatsApp configuration"""
    config = await db.settings.find_one({"key": "whatsapp_config"})
    if config:
        return config.get("value", {})
    return {
        "admin_phone": "",
        "morning_briefing": True,
        "morning_time": "08:00",
        "evening_recap": True,
        "evening_time": "18:00"
    }

@router.post("/config")
async def save_whatsapp_config(
    config: WhatsAppConfig,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """Save WhatsApp configuration"""
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    await db.settings.update_one(
        {"key": "whatsapp_config"},
        {"$set": {"value": config.dict()}},
        upsert=True
    )
    
    # Update admin phones env-like storage
    if config.admin_phone:
        await db.settings.update_one(
            {"key": "admin_phones"},
            {"$addToSet": {"phones": config.admin_phone}},
            upsert=True
        )
    
    return {"success": True, "message": "Configuration sauvegardée"}

@router.get("/messages")
async def get_message_history(
    phone_number: Optional[str] = None,
    limit: int = 50,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """Get WhatsApp message history"""
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    query = {}
    if phone_number:
        query["phone_number"] = phone_number
    
    messages = await db.whatsapp_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"messages": messages, "count": len(messages)}


@router.post("/test-briefing")
async def test_send_briefing(
    briefing_type: str = "morning",
    phone_number: Optional[str] = None,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """
    Test endpoint to manually trigger a briefing or recap
    briefing_type: 'morning' or 'evening'
    """
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get phone number from config if not provided
    if not phone_number:
        config = await db.settings.find_one({"key": "whatsapp_config"})
        if config and config.get("value"):
            phone_number = config["value"].get("admin_phone")
    
    if not phone_number:
        raise HTTPException(status_code=400, detail="Aucun numéro admin configuré")
    
    # Generate message
    if briefing_type == "morning":
        message = await get_daily_briefing()
    else:
        message = await get_daily_recap()
    
    # Send via WhatsApp service
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={"phone_number": phone_number, "message": message}
            )
            
            if response.status_code == 200:
                # Log the test
                await db.whatsapp_messages.insert_one({
                    "phone_number": phone_number,
                    "message": message,
                    "direction": "outgoing",
                    "message_type": f"test_{briefing_type}",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                
                return {
                    "success": True, 
                    "message": f"Briefing {briefing_type} envoyé à {phone_number}",
                    "preview": message[:200] + "..."
                }
            else:
                return {"success": False, "error": response.text}
    except Exception as e:
        return {"success": False, "error": str(e)}
