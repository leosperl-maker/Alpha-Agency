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
    media_base64: Optional[str] = None  # Base64 encoded media (image, document, audio, video)
    media_type: Optional[str] = None  # MIME type of the media
    file_name: Optional[str] = None  # Original filename for documents

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

async def is_admin(phone: str) -> bool:
    """Check if phone number is admin - checks both env, config, and LID mapping"""
    clean_phone = phone.replace('+', '').replace(' ', '').replace('-', '').replace('@lid', '').replace('@s.whatsapp.net', '')
    
    logger.info(f"Checking admin for phone: {clean_phone}")
    
    # Check LID mapping first (for WhatsApp Business accounts)
    lid_mapping = await db.settings.find_one({"key": "whatsapp_lid_mapping"})
    if lid_mapping and lid_mapping.get("value"):
        mapped_phone = lid_mapping["value"].get(clean_phone)
        if mapped_phone:
            logger.info(f"Found LID mapping: {clean_phone} -> {mapped_phone}")
            clean_phone = mapped_phone.replace('+', '').replace(' ', '').replace('-', '')
    
    # Check env variable
    for admin in ADMIN_PHONES:
        if admin and clean_phone.endswith(admin.replace('+', '').replace(' ', '')[-9:]):
            logger.info(f"Admin match via env: {clean_phone}")
            return True
    
    # Check MongoDB config
    config = await db.settings.find_one({"key": "whatsapp_config"})
    if config and config.get("value"):
        admin_phone = config["value"].get("admin_phone", "")
        if admin_phone:
            clean_admin = admin_phone.replace('+', '').replace(' ', '').replace('-', '')
            if clean_phone.endswith(clean_admin[-9:]):
                logger.info(f"Admin match via config: {clean_phone} matches {clean_admin}")
                return True
            # Also check if the incoming phone contains admin digits
            if clean_admin[-9:] in clean_phone or clean_phone in clean_admin:
                logger.info(f"Admin partial match: {clean_phone} ~ {clean_admin}")
                return True
    
    # If phone looks like a LID (long number), auto-register as admin on first message
    if len(clean_phone) > 12 and clean_phone.isdigit():
        # Check if any admin is configured
        if config and config.get("value", {}).get("admin_phone"):
            # Store LID mapping
            admin_phone = config["value"]["admin_phone"]
            await db.settings.update_one(
                {"key": "whatsapp_lid_mapping"},
                {"$set": {f"value.{clean_phone}": admin_phone}},
                upsert=True
            )
            logger.info(f"Auto-registered LID {clean_phone} as admin {admin_phone}")
            return True
    
    logger.info(f"Not admin: {clean_phone}")
    return False

async def process_admin_command(phone: str, message: str) -> dict:
    """
    Process all messages from admin via WhatsApp using AI as the main brain.
    Returns dict with 'text' and optionally 'document_url' for PDF attachments.
    """
    original_msg = message.strip()
    
    try:
        # Use AI to understand intent and execute actions
        result = await intelligent_assistant(original_msg, phone)
        return result
        
    except Exception as e:
        logger.error(f"Error processing command: {e}")
        return {"text": "Désolé, une erreur est survenue. Réessayez ou tapez 'aide'."}


async def intelligent_assistant(message: str, phone: str) -> dict:
    """
    MoltBot AI Assistant - Truly intelligent CRM assistant.
    - Uses pre-registered services with full descriptions and prices
    - Asks questions for missing info (email, phone, SIRET...)
    - Searches documents intelligently by content
    - Uses real CRM settings (TVA rate, etc.)
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import re
    
    EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
    
    # Get full CRM context
    stats = await get_crm_stats()
    
    # Get CRM settings (TVA rate, etc.)
    invoice_settings = await db.settings.find_one({"key": "invoice_settings"})
    tva_rate = 8.5  # Default for Martinique/Guadeloupe
    if invoice_settings and invoice_settings.get("value"):
        tva_rate = float(invoice_settings["value"].get("tva_rate", 8.5))
    
    # Get ALL pre-registered services
    services = await db.services.find().to_list(100)
    services_text = ""
    if services:
        services_text = "## SERVICES PRÉENREGISTRÉS (utilise-les pour les devis/factures):\n"
        for s in services:
            services_text += f"""
### {s.get('title', 'Service')}
- ID: {s.get('id', '')}
- Prix: {s.get('price', 0)}€
- Description: {s.get('description', '')[:500]}...
"""
    
    # Recent tasks
    tasks = await db.tasks.find({"status": {"$ne": "done"}}).sort("created_at", -1).limit(10).to_list(10)
    tasks_text = "\n".join([f"- [{t.get('status','?')}] {t.get('title', 'Sans titre')} (ID: {str(t.get('_id',''))[-6:]})" for t in tasks]) if tasks else "Aucune tâche"
    
    # Get contacts with full details
    contacts = await db.contacts.find().sort("created_at", -1).limit(20).to_list(20)
    contacts_text = ""
    for c in contacts:
        contacts_text += f"- {c.get('first_name', '')} {c.get('last_name', '')} | {c.get('company', 'N/A')} | {c.get('email', 'N/A')} | {c.get('phone', 'N/A')} | SIRET: {c.get('siret', 'N/A')}\n"
    if not contacts_text:
        contacts_text = "Aucun contact"
    
    # Recent quotes and invoices
    quotes = await db.quotes.find().sort("created_at", -1).limit(5).to_list(5)
    invoices_db = await db.invoices.find().sort("created_at", -1).limit(10).to_list(10)
    
    quotes_text = "\n".join([f"- Devis #{q.get('quote_number', '?')}: {q.get('total', 0)}€ pour {q.get('client_name', '?')} - {q.get('status', '?')}" for q in quotes]) if quotes else "Aucun devis"
    invoices_text = "\n".join([f"- {i.get('number', '?')}: {i.get('total', 0)}€ pour {i.get('client_name', '?')} - {i.get('status', '?')}" for i in invoices_db]) if invoices_db else "Aucune facture"
    
    # Documents AND files in CRM (for intelligent search)
    documents = await db.documents.find().sort("created_at", -1).limit(30).to_list(30)
    files = await db.files.find().sort("created_at", -1).limit(30).to_list(30) if await db.files.count_documents({}) > 0 else []
    
    docs_text = "## DOCUMENTS ET FICHIERS DISPONIBLES:\n"
    for d in documents:
        docs_text += f"- [{d.get('type', 'doc')}] {d.get('internal_name', d.get('name', 'Sans nom'))} | Client: {d.get('client_name', 'N/A')} | URL: {d.get('url', d.get('pdf_url', 'N/A'))}\n"
    for f in files:
        docs_text += f"- [fichier] {f.get('name', f.get('filename', 'Sans nom'))} | Type: {f.get('type', f.get('mimetype', '?'))} | URL: {f.get('url', 'N/A')}\n"
    
    if not documents and not files:
        docs_text = "Aucun document ou fichier"
    
    # Conversation history for this user (for multi-turn)
    recent_messages = await db.whatsapp_messages.find(
        {"phone_number": {"$regex": phone[-9:]}}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    conversation_context = ""
    if recent_messages:
        conversation_context = "\n## CONVERSATION RÉCENTE:\n"
        for msg in reversed(recent_messages[-5:]):
            direction = "👤 Vous" if msg.get("direction") == "incoming" else "🤖 MoltBot"
            conversation_context += f"{direction}: {msg.get('message', '')[:200]}\n"
    
    system_prompt = f"""Tu es MoltBot, l'assistant IA ULTRA-INTELLIGENT du CRM Alpha Agency. Tu parles en français.
Tu as accès COMPLET au CRM et tu peux EXÉCUTER des actions.

## RÈGLES IMPORTANTES:
1. **TVA**: Le taux de TVA est de {tva_rate}% (pas 20%)
2. **Services préenregistrés**: Quand on te demande un devis/facture, CHERCHE d'abord dans les services ci-dessous. Utilise le prix et la description COMPLÈTE du service.
3. **Contacts**: Si tu dois créer un contact, DEMANDE les infos manquantes (email, téléphone, société, SIRET) AVANT de créer. Si l'utilisateur dit qu'il n'a pas l'info, crée quand même avec ce qui est disponible.
4. **Documents**: Quand on te demande un fichier/document, cherche par titre ET par contenu décrit. Si tu trouves, ENVOIE-LE.
5. **Conversation naturelle**: Tu peux poser des questions de suivi. Mémorise le contexte de la conversation.

## CONTEXTE CRM ACTUEL:
- CA du mois: {stats['revenue']}€
- Nouveaux contacts: {stats['new_contacts']}
- Tâches en attente: {stats['pending_tasks']}
- RDV à venir: {stats['upcoming_appointments']}
- Taux TVA: {tva_rate}%

{services_text}

## CONTACTS EXISTANTS:
{contacts_text}

## DEVIS RÉCENTS:
{quotes_text}

## FACTURES RÉCENTES:
{invoices_text}

{docs_text}

## TÂCHES EN COURS:
{tasks_text}

{conversation_context}

## ACTIONS DISPONIBLES:
Quand tu veux exécuter une action, inclus un tag [ACTION:...] dans ta réponse:

1. **Créer devis avec services préenregistrés**:
   [ACTION:CREATE_QUOTE_WITH_SERVICES:client_name:company:service_ids_comma_separated:discounts_comma_separated:global_discount]
   Exemple: [ACTION:CREATE_QUOTE_WITH_SERVICES:Jean Dupont:Dupont SARL:74087002-a632-4c3c-92d6-794dcb5dc333,321de865-62c0-4250-bd46-c368c0cd44ad:100,50:0]

2. **Créer contact (demande les infos d'abord!)**:
   [ACTION:CREATE_CONTACT:first_name:last_name:company:email:phone:siret]

3. **Chercher et envoyer document**:
   [ACTION:SEND_DOCUMENT:search_term]

4. **Créer tâche**:
   [ACTION:CREATE_TASK:title:description]

5. **Générer image**:
   [ACTION:GENERATE_IMAGE:prompt]

## EXEMPLE DE CONVERSATION:
Utilisateur: "Crée un devis pour Martin avec community management"
Toi: "Je vais créer un devis avec le service Community Management (600€/mois). Avant de finaliser:
- Quelle est la société de M. Martin ?
- Avez-vous son email ou téléphone ?
- Souhaitez-vous appliquer une remise ?"

Utilisateur: "Société Test, pas d'email, remise de 50€"
Toi: "Parfait ! [ACTION:CREATE_QUOTE_WITH_SERVICES:Martin:Société Test:321de865-62c0-4250-bd46-c368c0cd44ad:50:0]
✅ Devis créé pour Martin (Société Test):
- Community Management: 600€ - 50€ = 550€
- TVA {tva_rate}%: {550 * tva_rate / 100:.2f}€
- Total TTC: {550 * (1 + tva_rate/100):.2f}€"

## STYLE:
- Sois naturel et conversationnel
- Pose des questions quand il manque des infos
- Utilise les emojis avec modération
- Limite tes réponses à 1000 caractères max"""

    try:
        # First, detect intent and execute actions BEFORE AI response
        action_result = await detect_and_execute_action(message, phone)
        
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"whatsapp_{phone}_{datetime.now().strftime('%Y%m%d')}",
            system_message=system_prompt
        )
        
        # Add action context if an action was executed
        enhanced_message = message
        if action_result.get("action_executed"):
            enhanced_message = f"{message}\n\n[SYSTÈME: Action exécutée avec succès: {action_result.get('action_description')}]"
        
        user_msg = UserMessage(text=enhanced_message)
        ai_response = await chat.send_message(user_msg)
        
        # Process any action tags in the AI response
        ai_response, extra_result = await process_ai_action_tags(ai_response, phone)
        
        result = {"text": ai_response}
        
        # Add document if one was generated (from detect_and_execute or AI tags)
        if action_result.get("document_url"):
            result["document_url"] = action_result["document_url"]
        elif extra_result.get("document_url"):
            result["document_url"] = extra_result["document_url"]
        
        return result
        
    except Exception as e:
        logger.error(f"AI assistant error: {e}")
        # Fallback to basic response
        return {"text": f"Je suis MoltBot. Comment puis-je vous aider?\n\n📊 Stats: {stats['revenue']}€ CA\n📋 {stats['pending_tasks']} tâches en cours\n\nTapez votre demande en langage naturel !"}


async def parse_complex_quote_with_ai(message: str) -> dict:
    """
    Use AI to parse complex quote requests with multiple lines, discounts, contacts.
    Returns structured data for quote creation.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json
    
    EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"quote_parser_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message="""Tu es un parser JSON pour les demandes de devis CRM. 
Analyse la demande et retourne UNIQUEMENT un JSON valide (sans markdown, sans explication).

Format attendu:
{
  "client": {
    "name": "Nom complet ou entreprise",
    "company": "Nom entreprise si mentionné",
    "is_new_contact": true/false
  },
  "items": [
    {
      "description": "Description du service",
      "unit_price": 0,
      "quantity": 1,
      "discount": 0
    }
  ],
  "global_discount": 0,
  "notes": "Notes additionnelles"
}

Règles:
- Si le prix n'est pas mentionné, mets unit_price à 0 (sera défini plus tard)
- discount est le montant de remise en euros sur la ligne
- is_new_contact = true si "nouveau contact" ou "nouveau client" mentionné
- Extrais TOUTES les lignes de service mentionnées"""
        )
        
        msg = UserMessage(text=f"Parse cette demande de devis:\n{message}")
        response = await chat.send_message(msg)
        
        # Clean response and parse JSON
        json_str = response.strip()
        if json_str.startswith("```"):
            json_str = json_str.split("```")[1]
            if json_str.startswith("json"):
                json_str = json_str[4:]
        json_str = json_str.strip()
        
        return json.loads(json_str)
        
    except Exception as e:
        logger.error(f"AI quote parsing error: {e}")
        return None


async def detect_and_execute_action(message: str, phone: str) -> dict:
    """Detect intent from message and execute CRM actions."""
    import re
    
    msg_lower = message.lower()
    result = {"action_executed": False}
    
    # Detect COMPLEX QUOTE creation (multiple lines, discounts, new contact)
    is_complex_quote = any(x in msg_lower for x in ["crée un devis", "créer un devis", "faire un devis", "devis pour"]) and \
                       any(x in msg_lower for x in ["remise", "ligne", "services", "et la", "et le", "nouveau contact", "ajoute"])
    
    if is_complex_quote:
        # Use AI to parse complex quote
        parsed = await parse_complex_quote_with_ai(message)
        
        if parsed:
            # Create contact if needed
            contact_id = None
            client_name = parsed.get("client", {}).get("name", "Client")
            company = parsed.get("client", {}).get("company", "")
            
            if parsed.get("client", {}).get("is_new_contact"):
                # Create new contact
                contact_data = {
                    "id": str(uuid.uuid4()),
                    "first_name": client_name.split()[0] if client_name else "Nouveau",
                    "last_name": " ".join(client_name.split()[1:]) if len(client_name.split()) > 1 else "Contact",
                    "company": company,
                    "created_at": datetime.now(timezone.utc),
                    "source": "whatsapp_moltbot"
                }
                await db.contacts.insert_one(contact_data)
                contact_id = contact_data["id"]
                logger.info(f"Created contact: {client_name}")
            
            # Build quote items
            items = []
            subtotal = 0
            total_discount = 0
            
            for item in parsed.get("items", []):
                unit_price = float(item.get("unit_price", 0))
                quantity = int(item.get("quantity", 1))
                discount = float(item.get("discount", 0))
                line_total = (unit_price * quantity) - discount
                
                items.append({
                    "description": item.get("description", "Service"),
                    "unit_price": unit_price,
                    "quantity": quantity,
                    "discount": discount,
                    "total": line_total
                })
                subtotal += unit_price * quantity
                total_discount += discount
            
            global_discount = float(parsed.get("global_discount", 0))
            total_discount += global_discount
            
            # Get next quote number - check both collections
            next_num = 1
            
            # Check quotes collection
            last_quote = await db.quotes.find_one(sort=[("quote_number", -1)])
            if last_quote:
                qn = last_quote.get("quote_number", 0)
                if isinstance(qn, int):
                    next_num = max(next_num, qn + 1)
                elif isinstance(qn, str) and qn.isdigit():
                    next_num = max(next_num, int(qn) + 1)
            
            # Check invoices collection for DEV numbers
            last_inv_quote = await db.invoices.find_one({"type": "devis"}, sort=[("created_at", -1)])
            if last_inv_quote:
                num_str = last_inv_quote.get("number", "")
                if "DEV-" in num_str:
                    try:
                        # Extract number from DEV-2026-XXX
                        parts = num_str.split("-")
                        if len(parts) >= 3:
                            next_num = max(next_num, int(parts[-1]) + 1)
                    except:
                        pass
            
            year = datetime.now().year
            quote_number_str = f"DEV-{year}-{str(next_num).zfill(3)}"
            
            # Create quote
            quote_data = {
                "id": str(uuid.uuid4()),
                "quote_number": next_num,
                "number": quote_number_str,
                "type": "devis",
                "client_name": f"{client_name}" + (f" ({company})" if company else ""),
                "contact_id": contact_id,
                "items": items,
                "subtotal": subtotal,
                "discount": total_discount,
                "tax": (subtotal - total_discount) * 0.20,
                "total": (subtotal - total_discount) * 1.20,
                "status": "draft",
                "notes": parsed.get("notes", f"Créé via WhatsApp MoltBot"),
                "created_at": datetime.now(timezone.utc),
                "source": "whatsapp_moltbot"
            }
            
            await db.invoices.insert_one(quote_data)
            logger.info(f"Created complex quote {quote_number_str} for {client_name}")
            
            # Build response
            items_desc = "\n".join([f"  • {it['description']}" + (f" (-{it['discount']}€)" if it['discount'] > 0 else "") for it in items])
            
            result["action_executed"] = True
            result["action_description"] = f"""Devis {quote_number_str} créé !
👤 Client: {client_name}{' (NOUVEAU CONTACT)' if contact_id else ''}
🏢 Entreprise: {company if company else 'N/A'}

📋 Services:
{items_desc}

💰 Sous-total: {subtotal:.2f}€
🏷️ Remises: -{total_discount:.2f}€
📊 Total HT: {subtotal - total_discount:.2f}€
💶 Total TTC: {quote_data['total']:.2f}€"""
            
            return result
    
    # Detect SIMPLE QUOTE creation
    if any(x in msg_lower for x in ["crée un devis", "créer un devis", "faire un devis", "devis de", "devis pour"]):
        # Extract amount
        amount_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:€|euros?|eur)', msg_lower)
        amount = float(amount_match.group(1).replace(',', '.')) if amount_match else 0
        
        # Extract client name - look for "pour [Client]"
        client_match = re.search(r'pour\s+(?:la\s+)?(?:société\s+)?(?:l\'entreprise\s+)?([A-Za-zÀ-ÿ\s]+?)(?:\s+pour|\s+d\'un|\s*$|,)', message, re.IGNORECASE)
        client_name = client_match.group(1).strip() if client_match else "Client"
        
        # Extract description - everything after the client name
        desc_match = re.search(r'pour\s+(?:la\s+)?(?:création|refonte|développement|réalisation|conception|une?)\s+(.+?)(?:\.|$)', message, re.IGNORECASE)
        description = desc_match.group(1).strip() if desc_match else "Services"
        
        # Create the quote
        last_quote = await db.quotes.find_one(sort=[("quote_number", -1)])
        next_num = 1
        if last_quote:
            try:
                next_num = int(last_quote.get("quote_number", 0)) + 1
            except:
                next_num = 1
        
        quote_data = {
            "quote_number": next_num,
            "client_name": client_name,
            "total": amount,
            "description": description,
            "status": "draft",
            "created_at": datetime.now(timezone.utc),
            "source": "whatsapp_moltbot"
        }
        await db.quotes.insert_one(quote_data)
        logger.info(f"Created quote #{next_num} for {client_name} - {amount}€")
        
        result["action_executed"] = True
        result["action_description"] = f"Devis #{next_num} créé: {amount}€ pour {client_name} - {description}"
        
    # Detect INVOICE creation
    elif any(x in msg_lower for x in ["crée une facture", "créer une facture", "faire une facture", "facture de", "facture pour"]):
        amount_match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:€|euros?|eur)', msg_lower)
        amount = float(amount_match.group(1).replace(',', '.')) if amount_match else 0
        
        client_match = re.search(r'pour\s+(?:la\s+)?(?:société\s+)?([A-Za-zÀ-ÿ\s]+?)(?:\s+pour|\s+d\'un|\s*$|,)', message, re.IGNORECASE)
        client_name = client_match.group(1).strip() if client_match else "Client"
        
        desc_match = re.search(r'pour\s+(?:la\s+)?(?:prestation|service|travaux)\s+(.+?)(?:\.|$)', message, re.IGNORECASE)
        description = desc_match.group(1).strip() if desc_match else "Services"
        
        last_inv = await db.invoices.find_one(sort=[("invoice_number", -1)])
        next_num = 1
        if last_inv:
            try:
                next_num = int(last_inv.get("invoice_number", 0)) + 1
            except:
                next_num = 1
        
        invoice_data = {
            "invoice_number": next_num,
            "client_name": client_name,
            "total": amount,
            "description": description,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "source": "whatsapp_moltbot"
        }
        await db.invoices.insert_one(invoice_data)
        logger.info(f"Created invoice #{next_num} for {client_name} - {amount}€")
        
        result["action_executed"] = True
        result["action_description"] = f"Facture #{next_num} créée: {amount}€ pour {client_name}"
        
    # Detect CONTACT creation
    elif any(x in msg_lower for x in ["crée un contact", "créer un contact", "ajoute un contact", "nouveau contact"]):
        # Extract name
        name_match = re.search(r'(?:pour|contact)\s+([A-Za-zÀ-ÿ]+)\s+([A-Za-zÀ-ÿ]+)', message, re.IGNORECASE)
        first_name = name_match.group(1) if name_match else "Nouveau"
        last_name = name_match.group(2) if name_match else "Contact"
        
        # Extract email
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', message)
        email = email_match.group(0) if email_match else ""
        
        # Extract phone
        phone_match = re.search(r'(?:tel|téléphone|tél|0)\s*:?\s*([\d\s\-\.]+)', message, re.IGNORECASE)
        contact_phone = phone_match.group(1).strip() if phone_match else ""
        
        contact_data = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": contact_phone,
            "created_at": datetime.now(timezone.utc),
            "source": "whatsapp_moltbot"
        }
        await db.contacts.insert_one(contact_data)
        logger.info(f"Created contact: {first_name} {last_name}")
        
        result["action_executed"] = True
        result["action_description"] = f"Contact créé: {first_name} {last_name}"
        
    # Detect TASK creation
    elif any(x in msg_lower for x in ["crée une tâche", "créer une tâche", "ajoute une tâche", "nouvelle tâche", "rappelle-moi"]):
        # Extract task title - everything after "tâche" or "rappelle-moi"
        task_match = re.search(r'(?:tâche|rappelle-moi)\s*:?\s*(.+?)(?:\.|$)', message, re.IGNORECASE)
        title = task_match.group(1).strip() if task_match else message[:50]
        
        task_data = {
            "title": title,
            "description": "",
            "status": "todo",
            "priority": "medium",
            "created_at": datetime.now(timezone.utc),
            "source": "whatsapp_moltbot"
        }
        await db.tasks.insert_one(task_data)
        logger.info(f"Created task: {title}")
        
        result["action_executed"] = True
        result["action_description"] = f"Tâche créée: {title}"
    
    # Detect IMAGE GENERATION request
    elif any(x in msg_lower for x in ["génère une image", "crée une image", "dessine", "génère moi", "image de", "photo de", "illustration"]):
        # Extract the image description
        desc_match = re.search(r'(?:image|photo|illustration|dessine|génère)\s+(?:de\s+|d\')?(.+?)(?:\.|$)', message, re.IGNORECASE)
        image_prompt = desc_match.group(1).strip() if desc_match else message
        
        # Generate image using Nano Banana
        image_url = await generate_image_nano_banana(image_prompt)
        
        if image_url:
            result["action_executed"] = True
            result["action_description"] = f"Image générée: {image_prompt[:50]}"
            result["document_url"] = image_url
            result["is_image"] = True
        else:
            result["action_executed"] = True
            result["action_description"] = "Erreur lors de la génération de l'image"
    
    # Detect FILE/DOCUMENT request from CRM
    elif any(x in msg_lower for x in ["envoie-moi le fichier", "envoie le document", "donne-moi le fichier", "récupère le fichier", "cherche le fichier", "trouve le document", "envoie-moi le pdf", "envoie le pdf"]):
        # Extract file name or search term
        file_match = re.search(r'(?:fichier|document|pdf)\s+(?:de\s+|d\'|intitulé\s+|nommé\s+|appelé\s+)?["\']?([^"\'\.]+)["\']?', message, re.IGNORECASE)
        search_term = file_match.group(1).strip() if file_match else ""
        
        if search_term:
            # Search in documents collection
            doc = await db.documents.find_one({
                "$or": [
                    {"name": {"$regex": search_term, "$options": "i"}},
                    {"title": {"$regex": search_term, "$options": "i"}},
                    {"filename": {"$regex": search_term, "$options": "i"}}
                ]
            })
            
            if doc and doc.get("url"):
                result["action_executed"] = True
                result["action_description"] = f"Document trouvé: {doc.get('name', doc.get('filename', 'Document'))}"
                result["document_url"] = doc["url"]
            else:
                # Try files collection
                file_doc = await db.files.find_one({
                    "$or": [
                        {"name": {"$regex": search_term, "$options": "i"}},
                        {"filename": {"$regex": search_term, "$options": "i"}}
                    ]
                })
                
                if file_doc and file_doc.get("url"):
                    result["action_executed"] = True
                    result["action_description"] = f"Fichier trouvé: {file_doc.get('name', file_doc.get('filename', 'Fichier'))}"
                    result["document_url"] = file_doc["url"]
                else:
                    result["action_executed"] = True
                    result["action_description"] = f"Fichier '{search_term}' non trouvé dans le CRM"
    
    # Detect request to LIST files
    elif any(x in msg_lower for x in ["liste mes fichiers", "mes documents", "quels fichiers", "liste des fichiers", "tous mes fichiers"]):
        files = await db.documents.find().sort("created_at", -1).limit(10).to_list(10)
        files2 = await db.files.find().sort("created_at", -1).limit(10).to_list(10)
        
        all_files = files + files2
        if all_files:
            file_list = "\n".join([f"📄 {f.get('name', f.get('filename', 'Sans nom'))} ({f.get('type', 'N/A')})" for f in all_files[:15]])
            result["action_executed"] = True
            result["action_description"] = f"Fichiers trouvés:\n{file_list}"
        else:
            result["action_executed"] = True
            result["action_description"] = "Aucun fichier dans le CRM"
    
    return result


async def generate_image_nano_banana(prompt: str) -> str:
    """Generate an image using Gemini Nano Banana and return the URL."""
    try:
        import base64
        import uuid
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import cloudinary
        import cloudinary.uploader
        
        EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
        
        # Configure cloudinary for upload
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET')
        )
        
        # Initialize chat for image generation
        chat = LlmChat(
            api_key=EMERGENT_KEY, 
            session_id=f"image_gen_{uuid.uuid4()}", 
            system_message="You are an image generation assistant"
        )
        
        # Configure for Nano Banana image generation
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        # Generate image
        msg = UserMessage(text=prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        
        logger.info(f"Image generation response - text: {text[:50] if text else 'None'}, images: {len(images) if images else 0}")
        
        if images and len(images) > 0:
            # Get first image and decode from base64
            img_data = images[0]
            image_bytes = base64.b64decode(img_data['data'])
            
            # Upload to Cloudinary
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            data_uri = f"data:image/png;base64,{image_base64}"
            
            result = cloudinary.uploader.upload(
                data_uri,
                public_id=f"moltbot/generated_{uuid.uuid4().hex[:8]}",
                folder="moltbot_images"
            )
            
            image_url = result.get('secure_url', '')
            logger.info(f"Image uploaded to Cloudinary: {image_url[:50]}...")
            return image_url
        
        logger.warning("No images generated by Nano Banana")
        return None
        
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return None


async def generate_image_with_reference(prompt: str, reference_image_base64: str) -> str:
    """Generate/edit an image using a reference image with Nano Banana."""
    try:
        import base64
        import uuid
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        import cloudinary
        import cloudinary.uploader
        
        EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
        
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET')
        )
        
        chat = LlmChat(
            api_key=EMERGENT_KEY, 
            session_id=f"image_edit_{uuid.uuid4()}", 
            system_message="You are an image editing assistant"
        )
        
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        # Create message with reference image
        msg = UserMessage(
            text=prompt,
            file_contents=[ImageContent(reference_image_base64)]
        )
        
        text, images = await chat.send_message_multimodal_response(msg)
        
        logger.info(f"Image edit response - images: {len(images) if images else 0}")
        
        if images and len(images) > 0:
            img_data = images[0]
            image_bytes = base64.b64decode(img_data['data'])
            
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            data_uri = f"data:image/png;base64,{image_base64}"
            
            result = cloudinary.uploader.upload(
                data_uri,
                public_id=f"moltbot/edited_{uuid.uuid4().hex[:8]}",
                folder="moltbot_images"
            )
            
            return result.get('secure_url', '')
        
        return None
        
    except Exception as e:
        logger.error(f"Image edit error: {e}")
        return None


async def generate_image_gpt(prompt: str, reference_image_base64: str = None) -> str:
    """Generate an image using GPT Image 1 (OpenAI) as fallback."""
    try:
        import base64
        import uuid
        from emergentintegrations.llm.openai import OpenAIImageGenerator
        import cloudinary
        import cloudinary.uploader
        
        EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
        
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET')
        )
        
        generator = OpenAIImageGenerator(api_key=EMERGENT_KEY)
        
        # Generate image
        if reference_image_base64:
            # Edit existing image
            result = await generator.edit_image(
                prompt=prompt,
                image_base64=reference_image_base64,
                size="1024x1024"
            )
        else:
            # Generate new image
            result = await generator.generate_image(
                prompt=prompt,
                size="1024x1024",
                quality="standard"
            )
        
        if result and result.get("url"):
            return result["url"]
        elif result and result.get("data"):
            # Upload base64 to Cloudinary
            image_bytes = base64.b64decode(result["data"])
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            data_uri = f"data:image/png;base64,{image_base64}"
            
            upload_result = cloudinary.uploader.upload(
                data_uri,
                public_id=f"moltbot/gpt_{uuid.uuid4().hex[:8]}",
                folder="moltbot_images"
            )
            return upload_result.get('secure_url', '')
        
        return None
        
    except Exception as e:
        logger.error(f"GPT image generation error: {e}")
        return None


async def analyze_image(image_base64: str, prompt: str = "Décris cette image en détail") -> str:
    """Analyze an image using Gemini Vision."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
        
        chat = LlmChat(
            api_key=EMERGENT_KEY, 
            session_id=f"vision_{datetime.now().strftime('%Y%m%d%H%M%S')}", 
            system_message="Tu es un assistant qui analyse les images en détail. Réponds en français."
        )
        
        msg = UserMessage(
            text=prompt,
            file_contents=[ImageContent(image_base64)]
        )
        
        response = await chat.send_message(msg)
        return response
        
    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        return f"Désolé, je n'ai pas pu analyser cette image: {str(e)}"


async def analyze_document(doc_base64: str, mime_type: str, file_name: str, prompt: str = "Analyse ce document") -> str:
    """Analyze a document (PDF, images, etc.) using AI Vision."""
    try:
        import base64
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
        doc_bytes = base64.b64decode(doc_base64)
        doc_size = len(doc_bytes)
        
        # For PDFs, convert pages to images for vision analysis
        if 'pdf' in mime_type.lower():
            try:
                import fitz  # PyMuPDF
                import io
                
                pdf_doc = fitz.open(stream=doc_bytes, filetype="pdf")
                num_pages = min(pdf_doc.page_count, 5)  # Limit to first 5 pages
                
                extracted_text = []
                images_base64 = []
                
                for page_num in range(num_pages):
                    page = pdf_doc[page_num]
                    # Extract text
                    text = page.get_text()
                    if text.strip():
                        extracted_text.append(f"--- Page {page_num + 1} ---\n{text}")
                    
                    # Convert page to image for vision
                    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
                    img_bytes = pix.tobytes("png")
                    img_b64 = base64.b64encode(img_bytes).decode('utf-8')
                    images_base64.append(img_b64)
                
                pdf_doc.close()
                
                # If we have text, use text-based analysis
                if extracted_text:
                    full_text = "\n".join(extracted_text)
                    chat = LlmChat(
                        api_key=EMERGENT_KEY, 
                        session_id=f"doc_{datetime.now().strftime('%Y%m%d%H%M%S')}", 
                        system_message="Tu es un assistant expert en analyse de documents. Réponds en français de manière concise."
                    )
                    
                    analysis_prompt = f"""Analyse ce document PDF ({file_name}, {num_pages} pages, {doc_size} bytes):

CONTENU EXTRAIT:
{full_text[:8000]}

Question de l'utilisateur: {prompt}

Fournis une analyse claire et utile."""
                    
                    msg = UserMessage(text=analysis_prompt)
                    response = await chat.send_message(msg)
                    return response
                
                # If no text (scanned PDF), use vision on first page
                elif images_base64:
                    chat = LlmChat(
                        api_key=EMERGENT_KEY, 
                        session_id=f"doc_vision_{datetime.now().strftime('%Y%m%d%H%M%S')}", 
                        system_message="Tu es un assistant qui analyse les documents scannés. Réponds en français."
                    )
                    
                    msg = UserMessage(
                        text=f"Analyse cette page du document '{file_name}'. {prompt}",
                        file_contents=[ImageContent(images_base64[0])]
                    )
                    response = await chat.send_message(msg)
                    return response
                    
            except ImportError:
                logger.warning("PyMuPDF not available, falling back to basic analysis")
            except Exception as pdf_err:
                logger.error(f"PDF processing error: {pdf_err}")
        
        # For images in documents, use vision
        if any(x in mime_type.lower() for x in ['image', 'png', 'jpg', 'jpeg', 'webp']):
            return await analyze_image(doc_base64, prompt)
        
        # Fallback for other document types
        chat = LlmChat(
            api_key=EMERGENT_KEY, 
            session_id=f"doc_{datetime.now().strftime('%Y%m%d%H%M%S')}", 
            system_message="Tu es un assistant qui aide avec les documents. Réponds en français."
        )
        
        analysis_prompt = f"""L'utilisateur a envoyé un document:
- Nom: {file_name}
- Type: {mime_type}
- Taille: {doc_size} bytes

Question: {prompt}

Je ne peux pas lire ce format directement. Suggère des alternatives ou aide avec des questions générales."""
        
        msg = UserMessage(text=analysis_prompt)
        response = await chat.send_message(msg)
        return response
        
    except Exception as e:
        logger.error(f"Document analysis error: {e}")
        return f"Désolé, je n'ai pas pu analyser ce document: {str(e)}"


async def process_ai_actions(ai_response: str, phone: str) -> dict:
    """Process any action codes in the AI response and execute them."""
    import re
    
    result = {"text": ai_response}
    document_url = None
    
    # Find and process action codes
    action_pattern = r'\[ACTION:(\w+):([^\]]+)\]'
    matches = re.findall(action_pattern, ai_response)
    
    for action_type, params in matches:
        try:
            parts = params.split(':')
            
            if action_type == "CREATE_CONTACT" and len(parts) >= 2:
                contact_data = {
                    "first_name": parts[0].strip(),
                    "last_name": parts[1].strip() if len(parts) > 1 else "",
                    "email": parts[2].strip() if len(parts) > 2 else "",
                    "phone": parts[3].strip() if len(parts) > 3 else "",
                    "created_at": datetime.now(timezone.utc),
                    "source": "whatsapp_moltbot"
                }
                await db.contacts.insert_one(contact_data)
                logger.info(f"Created contact: {contact_data['first_name']} {contact_data['last_name']}")
                
            elif action_type == "CREATE_TASK" and len(parts) >= 1:
                task_data = {
                    "title": parts[0].strip(),
                    "description": parts[1].strip() if len(parts) > 1 else "",
                    "status": "todo",
                    "priority": "medium",
                    "created_at": datetime.now(timezone.utc),
                    "source": "whatsapp_moltbot"
                }
                await db.tasks.insert_one(task_data)
                logger.info(f"Created task: {task_data['title']}")
                
            elif action_type == "CREATE_QUOTE" and len(parts) >= 2:
                # Get next quote number
                last_quote = await db.quotes.find_one(sort=[("quote_number", -1)])
                if last_quote and last_quote.get("quote_number"):
                    try:
                        next_num = int(last_quote.get("quote_number", 0)) + 1
                    except:
                        next_num = 1
                else:
                    next_num = 1
                
                # Parse amount - extract numbers only
                amount_str = parts[1].strip() if len(parts) > 1 else "0"
                try:
                    amount = float(re.sub(r'[^\d.]', '', amount_str)) if amount_str else 0
                except:
                    amount = 0
                
                quote_data = {
                    "quote_number": next_num,
                    "client_name": parts[0].strip(),
                    "total": amount,
                    "description": parts[2].strip() if len(parts) > 2 else "Services",
                    "status": "draft",
                    "created_at": datetime.now(timezone.utc),
                    "source": "whatsapp_moltbot"
                }
                inserted = await db.quotes.insert_one(quote_data)
                logger.info(f"Created quote #{next_num} for {quote_data['client_name']} - {amount}€")
                
                # Generate PDF URL if available
                pdf_url = await generate_quote_pdf(str(inserted.inserted_id))
                if pdf_url:
                    document_url = pdf_url
                    
            elif action_type == "CREATE_INVOICE" and len(parts) >= 2:
                last_inv = await db.invoices.find_one(sort=[("invoice_number", -1)])
                if last_inv and last_inv.get("invoice_number"):
                    try:
                        next_num = int(last_inv.get("invoice_number", 0)) + 1
                    except:
                        next_num = 1
                else:
                    next_num = 1
                
                # Parse amount
                amount_str = parts[1].strip() if len(parts) > 1 else "0"
                try:
                    amount = float(re.sub(r'[^\d.]', '', amount_str)) if amount_str else 0
                except:
                    amount = 0
                
                invoice_data = {
                    "invoice_number": next_num,
                    "client_name": parts[0].strip(),
                    "total": amount,
                    "description": parts[2].strip() if len(parts) > 2 else "Services",
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc),
                    "source": "whatsapp_moltbot"
                }
                inserted = await db.invoices.insert_one(invoice_data)
                logger.info(f"Created invoice #{next_num}")
                
                pdf_url = await generate_invoice_pdf(str(inserted.inserted_id))
                if pdf_url:
                    document_url = pdf_url
                    
            elif action_type == "SEND_DOCUMENT" and len(parts) >= 1:
                doc_url = parts[0].strip()
                if doc_url.startswith('http'):
                    document_url = doc_url
                    
            elif action_type == "SEARCH_CONTACT" and len(parts) >= 1:
                search_term = parts[0].strip().lower()
                found = await db.contacts.find({
                    "$or": [
                        {"first_name": {"$regex": search_term, "$options": "i"}},
                        {"last_name": {"$regex": search_term, "$options": "i"}},
                        {"email": {"$regex": search_term, "$options": "i"}}
                    ]
                }).limit(5).to_list(5)
                
                if found:
                    contacts_info = "\n".join([f"📞 {c.get('first_name','')} {c.get('last_name','')}: {c.get('phone', 'N/A')} - {c.get('email', 'N/A')}" for c in found])
                    result["text"] = ai_response.replace(f"[ACTION:SEARCH_CONTACT:{params}]", "") + f"\n\n{contacts_info}"
                    
        except Exception as e:
            logger.error(f"Error executing action {action_type}: {e}")
    
    # Clean action codes from response
    clean_response = re.sub(action_pattern, '', result["text"]).strip()
    result["text"] = clean_response
    
    if document_url:
        result["document_url"] = document_url
        
    return result


async def generate_quote_pdf(quote_id: str) -> str:
    """Generate PDF for a quote and return URL."""
    try:
        from bson import ObjectId
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
        if not quote:
            return None
            
        # Check if PDF already exists
        if quote.get("pdf_url"):
            return quote["pdf_url"]
            
        # For now, return None - PDF generation would be added here
        # This would integrate with a PDF service or generate locally
        return None
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        return None


async def generate_invoice_pdf(invoice_id: str) -> str:
    """Generate PDF for an invoice and return URL."""
    try:
        from bson import ObjectId
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        if not invoice:
            return None
            
        if invoice.get("pdf_url"):
            return invoice["pdf_url"]
            
        return None
    except Exception as e:
        logger.error(f"Invoice PDF error: {e}")
        return None

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

async def get_recent_invoices() -> str:
    """Get recent invoices"""
    invoices = await db.invoices.find(
        {"type": "facture"},
        {"_id": 0, "number": 1, "client_name": 1, "total": 1, "status": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    if not invoices:
        return "📄 Aucune facture récente"
    
    msg = "📄 *Dernières factures:*\n\n"
    for inv in invoices:
        status = "✅" if inv.get("status") == "paid" else "📤" if inv.get("status") == "sent" else "📝"
        msg += f"{status} {inv['number']} - {inv['client_name']} - {inv.get('total', 0)}€\n"
    
    return msg

async def create_quote_from_message(message: str, phone: str) -> str:
    """
    Create a quote from a WhatsApp message.
    Format: "Crée devis 2000€ pour Client, description du service"
    """
    import re
    
    try:
        # Extract amount
        amount_match = re.search(r'(\d+(?:[.,]\d+)?)\s*€', message)
        if not amount_match:
            return "❌ Montant non trouvé. Format: 'Crée devis 2000€ pour Client, description'"
        
        amount = float(amount_match.group(1).replace(',', '.'))
        
        # Extract client name and description
        # Pattern: "pour Client, description" or "pour Client description"
        pour_match = re.search(r'pour\s+([^,]+)(?:,\s*(.+))?$', message, re.IGNORECASE)
        
        if not pour_match:
            return "❌ Client non trouvé. Format: 'Crée devis 2000€ pour Client, description'"
        
        client_name = pour_match.group(1).strip()
        description = pour_match.group(2).strip() if pour_match.group(2) else "Prestation de service"
        
        # Generate quote number
        count = await db.invoices.count_documents({"type": "devis"})
        year = datetime.now().year
        number = f"DEV-{year}-{str(count + 1).zfill(3)}"
        
        # Create quote
        quote_id = str(uuid.uuid4())
        quote = {
            "id": quote_id,
            "number": number,
            "type": "devis",
            "client_name": client_name,
            "client_email": "",
            "items": [{"description": description, "quantity": 1, "unit_price": amount}],
            "subtotal": amount,
            "tax": amount * 0.20,
            "total": amount * 1.20,
            "status": "draft",
            "notes": f"Créé via WhatsApp par {phone}",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "source": "whatsapp"
        }
        
        await db.invoices.insert_one(quote)
        
        return f"""✅ *Devis créé !*

📄 Numéro: {number}
👤 Client: {client_name}
💶 Montant HT: {amount:.2f}€
💰 Total TTC: {amount * 1.20:.2f}€

Pour envoyer le PDF: 
"Envoie devis {number} à email@client.com" """
        
    except Exception as e:
        logger.error(f"Error creating quote from WhatsApp: {e}")
        return f"❌ Erreur lors de la création du devis: {str(e)}"

async def create_invoice_from_message(message: str, phone: str) -> str:
    """
    Create an invoice from a WhatsApp message.
    Format: "Crée facture 500€ pour Client, description du service"
    """
    import re
    
    try:
        # Extract amount
        amount_match = re.search(r'(\d+(?:[.,]\d+)?)\s*€', message)
        if not amount_match:
            return "❌ Montant non trouvé. Format: 'Crée facture 500€ pour Client, description'"
        
        amount = float(amount_match.group(1).replace(',', '.'))
        
        # Extract client name and description
        pour_match = re.search(r'pour\s+([^,]+)(?:,\s*(.+))?$', message, re.IGNORECASE)
        
        if not pour_match:
            return "❌ Client non trouvé. Format: 'Crée facture 500€ pour Client, description'"
        
        client_name = pour_match.group(1).strip()
        description = pour_match.group(2).strip() if pour_match.group(2) else "Prestation de service"
        
        # Generate invoice number
        count = await db.invoices.count_documents({"type": "facture"})
        year = datetime.now().year
        number = f"FAC-{year}-{str(count + 1).zfill(3)}"
        
        # Create invoice
        invoice_id = str(uuid.uuid4())
        invoice = {
            "id": invoice_id,
            "number": number,
            "type": "facture",
            "client_name": client_name,
            "client_email": "",
            "items": [{"description": description, "quantity": 1, "unit_price": amount}],
            "subtotal": amount,
            "tax": amount * 0.20,
            "total": amount * 1.20,
            "status": "draft",
            "notes": f"Créée via WhatsApp par {phone}",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "source": "whatsapp"
        }
        
        await db.invoices.insert_one(invoice)
        
        return f"""✅ *Facture créée !*

📄 Numéro: {number}
👤 Client: {client_name}
💶 Montant HT: {amount:.2f}€
💰 Total TTC: {amount * 1.20:.2f}€

Pour envoyer le PDF: 
"Envoie facture {number} à email@client.com" """
        
    except Exception as e:
        logger.error(f"Error creating invoice from WhatsApp: {e}")
        return f"❌ Erreur lors de la création de la facture: {str(e)}"

async def send_quote_pdf(message: str, phone: str) -> str:
    """
    Send a quote/invoice PDF via WhatsApp.
    Format: "Envoie devis DEV-2024-001 à email@client.com" or just "Envoie devis DEV-2024-001"
    Also supports: "Envoie facture FAC-2024-001"
    """
    import re
    from .invoices import generate_professional_pdf
    import cloudinary
    import cloudinary.uploader
    import base64
    import os
    
    try:
        # Extract document number
        doc_match = re.search(r'(DEV|FAC)-\d{4}-\d{3}', message, re.IGNORECASE)
        if not doc_match:
            return "❌ Numéro de document non trouvé. Format: 'Envoie devis DEV-2024-001'"
        
        doc_number = doc_match.group(0).upper()
        
        # Find the document
        doc = await db.invoices.find_one({"number": doc_number})
        if not doc:
            return f"❌ Document {doc_number} non trouvé"
        
        # Get contact info if available
        contact = {}
        if doc.get("contact_id"):
            contact = await db.contacts.find_one({"id": doc["contact_id"]}) or {}
        
        # Get invoice settings
        settings = await db.settings.find_one({"key": "invoice_settings"})
        invoice_settings = settings.get("value") if settings else {}
        
        # Generate PDF
        doc_type = "devis" if doc["type"] == "devis" else "facture"
        pdf_buffer = generate_professional_pdf(doc, contact, doc_type, invoice_settings)
        
        # Upload to Cloudinary for WhatsApp sharing
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET')
        )
        
        pdf_bytes = pdf_buffer.getvalue()
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        data_uri = f"data:application/pdf;base64,{pdf_base64}"
        
        result = cloudinary.uploader.upload(
            data_uri,
            resource_type="raw",
            public_id=f"moltbot/{doc_number}",
            format="pdf"
        )
        
        pdf_url = result.get('secure_url', '')
        
        # Update document status
        await db.invoices.update_one(
            {"number": doc_number},
            {"$set": {
                "status": "sent", 
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "pdf_url": pdf_url
            }}
        )
        
        # Send PDF via WhatsApp
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Send document message via WhatsApp service
                response = await client.post(
                    f"{WHATSAPP_SERVICE_URL}/send-document",
                    json={
                        "phone_number": phone,
                        "document_url": pdf_url,
                        "filename": f"{doc_number}.pdf",
                        "caption": f"📄 {doc_type.capitalize()} {doc_number} - {doc['client_name']} - {doc['total']:.2f}€ TTC"
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"PDF sent via WhatsApp: {doc_number}")
                else:
                    logger.warning(f"WhatsApp document send failed: {response.text}")
        except Exception as wa_err:
            logger.warning(f"Could not send via WhatsApp service: {wa_err}")
        
        # Check for email sending
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', message)
        email_response = ""
        
        if email_match:
            recipient_email = email_match.group(0)
            # Send email with PDF
            try:
                from .invoices import send_invoice_email
                await send_invoice_email(doc, contact, recipient_email, pdf_bytes, doc_type)
                email_response = f"\n📧 Email envoyé à {recipient_email}"
            except Exception as email_err:
                email_response = f"\n⚠️ Email non envoyé: {str(email_err)}"
        
        return f"""✅ *{doc_type.capitalize()} {doc_number} envoyé !*

👤 Client: {doc['client_name']}
💰 Total: {doc['total']:.2f}€ TTC
🔗 PDF: {pdf_url}{email_response}

Le document est en cours d'envoi sur cette conversation."""
        
    except Exception as e:
        logger.error(f"Error sending PDF: {e}")
        return f"❌ Erreur lors de la génération du PDF: {str(e)}"

# ==================== API ENDPOINTS ====================

@router.get("/status")
async def get_whatsapp_status():
    """Get WhatsApp connection status"""
    # Check if connected to WhatsApp service
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status")
            if response.status_code == 200:
                return response.json()
    except httpx.ConnectError:
        return {
            "connected": False,
            "error": "service_not_running",
            "message": "Le service WhatsApp n'est pas démarré sur le serveur.",
            "setup_required": True,
            "instructions": "Contactez l'administrateur pour démarrer le service WhatsApp (Node.js sur port 3001)."
        }
    except httpx.TimeoutException:
        return {
            "connected": False,
            "error": "timeout",
            "message": "Le service WhatsApp ne répond pas (timeout).",
            "setup_required": True
        }
    except Exception as e:
        logger.error(f"WhatsApp status error: {e}")
    
    # Return disconnected status with setup instructions
    return {
        "connected": False,
        "error": "unknown",
        "message": "WhatsApp non connecté",
        "setup_required": True,
        "instructions": "Lancez le service WhatsApp et scannez le QR code"
    }

@router.get("/qr")
async def get_qr_code():
    """Get QR code for WhatsApp authentication"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/qr")
            return response.json()
    except httpx.ConnectError:
        return {
            "qr": None, 
            "error": "service_not_running",
            "message": "Service WhatsApp non démarré. Le service Node.js doit être lancé sur le serveur."
        }
    except Exception as e:
        logger.error(f"QR code error: {e}")
        return {"qr": None, "message": "Service WhatsApp non disponible"}

@router.post("/webhook")
async def whatsapp_webhook(message: IncomingMessage):
    """
    Webhook for incoming WhatsApp messages
    Processes messages from admin users for CRM control
    Supports text, audio, images, and documents
    """
    logger.info(f"WhatsApp message from {message.phone_number}: type={message.message_type}, text={message.message[:50] if message.message else 'media'}, has_media={bool(message.media_base64)}")
    
    # Process text from message
    text_content = message.message
    was_transcribed = False
    media_analysis = None
    
    # If audio message with base64 data, transcribe it
    if message.message_type == "audio" and message.media_base64:
        from routes.audio_transcription import transcribe_for_moltbot
        import tempfile
        import base64
        
        try:
            # Save base64 audio to temp file
            audio_bytes = base64.b64decode(message.media_base64)
            ext = "ogg" if "ogg" in (message.media_type or "") else "mp3"
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
            
            transcribed_text = await transcribe_for_moltbot(file_path=temp_path)
            
            # Clean up temp file
            try:
                import os
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except:
                pass
            
            if transcribed_text:
                text_content = transcribed_text
                was_transcribed = True
                logger.info(f"Transcribed: {transcribed_text[:100]}")
            else:
                text_content = "[Audio non reconnu]"
        except Exception as e:
            logger.error(f"Audio transcription error: {e}")
            text_content = "[Erreur transcription audio]"
    
    # If audio message without base64, try URL methods
    elif message.message_type == "audio":
        from routes.audio_transcription import transcribe_for_moltbot
        
        transcribed_text = None
        
        if message.audio_path:
            logger.info(f"Transcribing audio from local path: {message.audio_path}")
            transcribed_text = await transcribe_for_moltbot(file_path=message.audio_path)
            try:
                import os
                if os.path.exists(message.audio_path):
                    os.unlink(message.audio_path)
            except:
                pass
        elif message.audio_url:
            logger.info(f"Transcribing audio from URL: {message.audio_url}")
            transcribed_text = await transcribe_for_moltbot(url=message.audio_url)
        
        if transcribed_text:
            text_content = transcribed_text
            was_transcribed = True
            logger.info(f"Transcribed: {transcribed_text[:100]}")
        else:
            text_content = "[Audio non reconnu]"
    
    # If image message, analyze it
    elif message.message_type == "image" and message.media_base64:
        prompt = message.message if message.message else "Décris cette image en détail et dis-moi ce que tu vois"
        
        # Check if user wants to generate a new image based on this reference
        msg_lower = (message.message or "").lower()
        if any(x in msg_lower for x in ["modifie", "transforme", "change", "génère", "crée", "édite", "refais"]):
            # User wants to edit/transform the image
            logger.info(f"Image edit request with reference: {prompt}")
            media_analysis = f"[IMAGE_EDIT_REQUEST:{message.media_base64}:{prompt}]"
            text_content = prompt or "Transforme cette image"
        else:
            # User wants analysis
            logger.info(f"Analyzing image with prompt: {prompt}")
            media_analysis = await analyze_image(message.media_base64, prompt)
            text_content = f"[Image reçue] {message.message}" if message.message else "[Image reçue - analyse demandée]"
    
    # If document message, analyze it
    elif message.message_type == "document" and message.media_base64:
        prompt = message.message if message.message else "Analyse ce document"
        logger.info(f"Analyzing document: {message.file_name}")
        media_analysis = await analyze_document(
            message.media_base64, 
            message.media_type or "application/octet-stream",
            message.file_name or "document",
            prompt
        )
        text_content = f"[Document reçu: {message.file_name}] {message.message}" if message.message else f"[Document reçu: {message.file_name}]"
    
    # If video message, extract frame and analyze
    elif message.message_type == "video" and message.media_base64:
        prompt = message.message if message.message else "Décris cette vidéo"
        logger.info(f"Analyzing video")
        
        try:
            import base64
            import tempfile
            import subprocess
            
            # Save video to temp file
            video_bytes = base64.b64decode(message.media_base64)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
                temp_video.write(video_bytes)
                video_path = temp_video.name
            
            # Extract first frame using ffmpeg
            frame_path = video_path.replace(".mp4", "_frame.jpg")
            subprocess.run([
                'ffmpeg', '-i', video_path, '-vf', 'select=eq(n\\,0)', 
                '-vframes', '1', '-y', frame_path
            ], capture_output=True, timeout=30)
            
            # Read frame and analyze
            if os.path.exists(frame_path):
                with open(frame_path, 'rb') as f:
                    frame_base64 = base64.b64encode(f.read()).decode('utf-8')
                media_analysis = await analyze_image(frame_base64, f"Cette image est la première frame d'une vidéo. {prompt}")
                os.unlink(frame_path)
            else:
                media_analysis = "Impossible d'extraire une image de la vidéo."
            
            # Cleanup
            if os.path.exists(video_path):
                os.unlink(video_path)
                
        except Exception as vid_err:
            logger.error(f"Video analysis error: {vid_err}")
            media_analysis = f"Erreur lors de l'analyse de la vidéo: {str(vid_err)}"
        
        text_content = f"[Vidéo reçue] {message.message}" if message.message else "[Vidéo reçue - analyse demandée]"
    
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
        "has_media": bool(message.media_base64),
        "media_type": message.media_type,
        "file_name": message.file_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Check if admin
    if await is_admin(message.phone_number):
        # Check if this is an image edit request
        if media_analysis and media_analysis.startswith("[IMAGE_EDIT_REQUEST:"):
            # Extract image and prompt
            import re
            match = re.match(r'\[IMAGE_EDIT_REQUEST:(.+):(.+)\]', media_analysis)
            if match:
                ref_image = match.group(1)
                edit_prompt = match.group(2)
                
                # Try Nano Banana first, then GPT Image
                logger.info(f"Processing image edit request: {edit_prompt[:50]}")
                image_url = await generate_image_with_reference(edit_prompt, ref_image)
                
                if not image_url:
                    logger.info("Nano Banana failed, trying GPT Image...")
                    image_url = await generate_image_gpt(edit_prompt, ref_image)
                
                if image_url:
                    # Send the generated image
                    try:
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            await client.post(
                                f"{WHATSAPP_SERVICE_URL}/send-image",
                                json={
                                    "phone_number": message.phone_number,
                                    "image_url": image_url,
                                    "caption": f"🖼️ Image générée: {edit_prompt[:50]}..."
                                }
                            )
                        return {"reply": "✨ Voici l'image générée à partir de ta référence !", "is_admin": True, "document_sent": True}
                    except Exception as e:
                        logger.error(f"Error sending generated image: {e}")
                        return {"reply": f"Image générée mais erreur d'envoi. URL: {image_url}", "is_admin": True}
                else:
                    return {"reply": "Désolé, je n'ai pas pu générer l'image. Essaie avec une description différente.", "is_admin": True}
        
        # If media analysis available, include it in context
        if media_analysis and not media_analysis.startswith("[IMAGE_EDIT_REQUEST:"):
            text_content = f"{text_content}\n\n[Analyse du média]: {media_analysis}"
        
        # Process command with AI
        result = await process_admin_command(message.phone_number, text_content)
        
        # Handle both old string format and new dict format
        if isinstance(result, str):
            reply_text = result
            document_url = None
        else:
            reply_text = result.get("text", "")
            document_url = result.get("document_url")
        
        # If there's a document to send, send it via WhatsApp
        if document_url:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    # Check if it's an image or a document
                    is_image = result.get("is_image", False) or any(ext in document_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp'])
                    
                    if is_image:
                        # Send as image
                        await client.post(
                            f"{WHATSAPP_SERVICE_URL}/send-image",
                            json={
                                "phone_number": message.phone_number,
                                "image_url": document_url,
                                "caption": "🖼️ Image générée par MoltBot"
                            }
                        )
                        logger.info(f"Image sent to {message.phone_number}: {document_url}")
                    else:
                        # Send as document
                        # Determine filename based on URL
                        filename = document_url.split('/')[-1] if '/' in document_url else "document"
                        if not any(filename.endswith(ext) for ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.json', '.txt']):
                            filename = "document.pdf"
                        
                        await client.post(
                            f"{WHATSAPP_SERVICE_URL}/send-document",
                            json={
                                "phone_number": message.phone_number,
                                "document_url": document_url,
                                "filename": filename,
                                "caption": "📄 Document demandé"
                            }
                        )
                        logger.info(f"Document sent to {message.phone_number}: {document_url}")
            except Exception as e:
                logger.error(f"Error sending document/image: {e}")
                reply_text += f"\n\n📎 Fichier: {document_url}"
        
        return {"reply": reply_text, "is_admin": True, "transcribed": was_transcribed, "document_sent": bool(document_url)}
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


@router.get("/profile")
async def get_whatsapp_profile():
    """Get WhatsApp profile info (name, picture)"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/profile")
            return response.json()
    except Exception as e:
        return {"connected": False, "error": str(e)}

@router.post("/profile/name")
async def update_whatsapp_name(
    name: str,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """Update WhatsApp profile name"""
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/profile/name",
                json={"name": name}
            )
            return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

class ProfilePictureRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None

@router.post("/profile/picture")
async def update_whatsapp_picture(
    request: ProfilePictureRequest,
    secret: str = Header(None, alias="X-MoltBot-Secret")
):
    """Update WhatsApp profile picture"""
    if secret != MOLTBOT_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if not request.image_url and not request.image_base64:
        raise HTTPException(status_code=400, detail="image_url or image_base64 required")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/profile/picture",
                json={"image_url": request.image_url, "image_base64": request.image_base64}
            )
            return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}
