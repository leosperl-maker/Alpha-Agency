"""
WhatsApp Business Cloud API Integration
Official Meta API - Alternative to Baileys

This module provides the official WhatsApp Business API integration.
Users can choose between Baileys (unofficial, free) and Cloud API (official, paid after 1000 msgs/month).

Required credentials:
- WHATSAPP_BUSINESS_ACCOUNT_ID (WABA ID)
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_ACCESS_TOKEN (permanent token from Meta)
- WHATSAPP_WEBHOOK_VERIFY_TOKEN (for webhook validation)
"""

import os
import hmac
import hashlib
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Header, BackgroundTasks
from pydantic import BaseModel

from .database import db, get_current_user
from .token_encryption import encrypt_token, decrypt_token

logger = logging.getLogger("whatsapp_cloud")

router = APIRouter()

# WhatsApp Cloud API Configuration
WHATSAPP_API_URL = "https://graph.facebook.com"
WHATSAPP_API_VERSION = "v18.0"

# ==================== MODELS ====================

class WhatsAppCloudConfig(BaseModel):
    """Configuration for WhatsApp Business Cloud API"""
    business_account_id: str
    phone_number_id: str
    phone_number: str
    access_token: str
    webhook_verify_token: Optional[str] = None

class CloudTextMessage(BaseModel):
    """Send a text message"""
    to: str  # Phone number with country code
    message: str

class CloudTemplateMessage(BaseModel):
    """Send a template message"""
    to: str
    template_name: str
    language_code: str = "fr"
    parameters: Optional[List[str]] = None

class CloudMediaMessage(BaseModel):
    """Send a media message (image, document, audio, video)"""
    to: str
    media_type: str  # image, document, audio, video
    media_url: str
    caption: Optional[str] = None
    filename: Optional[str] = None  # For documents

# ==================== HELPER FUNCTIONS ====================

async def get_cloud_config(user_id: str) -> Optional[Dict]:
    """Get WhatsApp Cloud API configuration for a user"""
    config = await db.whatsapp_cloud_config.find_one({
        "user_id": user_id,
        "is_active": True
    })
    return config

async def decrypt_access_token(config: Dict) -> str:
    """Decrypt the stored access token"""
    encrypted = config.get("access_token_encrypted")
    if encrypted:
        return decrypt_token(encrypted)
    return config.get("access_token", "")

def verify_webhook_signature(payload: bytes, signature: str, verify_token: str) -> bool:
    """Verify webhook signature using HMAC-SHA256"""
    if not signature.startswith("sha256="):
        return False
    
    expected = hmac.new(
        verify_token.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature[7:], expected)

# ==================== CONFIGURATION ENDPOINTS ====================

@router.post("/config")
async def save_cloud_config(
    config: WhatsAppCloudConfig,
    current_user: dict = None
):
    """
    Save WhatsApp Business Cloud API configuration.
    Validates credentials before saving.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Validate credentials with WhatsApp API
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{WHATSAPP_API_URL}/{WHATSAPP_API_VERSION}/{config.phone_number_id}",
                headers={"Authorization": f"Bearer {config.access_token}"}
            )
            
            if response.status_code != 200:
                error = response.json().get("error", {})
                raise HTTPException(
                    status_code=400,
                    detail=f"Credentials invalides: {error.get('message', 'Unknown error')}"
                )
            
            phone_data = response.json()
            
        except httpx.RequestError as e:
            logger.error(f"WhatsApp API validation error: {e}")
            raise HTTPException(status_code=400, detail="Impossible de valider les credentials")
    
    # Store configuration (encrypt access token)
    config_doc = {
        "user_id": user_id,
        "business_account_id": config.business_account_id,
        "phone_number_id": config.phone_number_id,
        "phone_number": config.phone_number,
        "display_phone_number": phone_data.get("display_phone_number", config.phone_number),
        "verified_name": phone_data.get("verified_name", ""),
        "access_token_encrypted": encrypt_token(config.access_token),
        "webhook_verify_token": config.webhook_verify_token or f"moltbot_cloud_{user_id[:8]}",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert configuration
    await db.whatsapp_cloud_config.update_one(
        {"user_id": user_id},
        {"$set": config_doc},
        upsert=True
    )
    
    logger.info(f"WhatsApp Cloud config saved for user {user_id}")
    
    return {
        "success": True,
        "message": "Configuration WhatsApp Business Cloud sauvegardée",
        "phone_number": config_doc["display_phone_number"],
        "verified_name": config_doc["verified_name"]
    }

@router.get("/config")
async def get_cloud_config_endpoint(current_user: dict = None):
    """Get current WhatsApp Cloud API configuration (without access token)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    
    config = await db.whatsapp_cloud_config.find_one(
        {"user_id": user_id, "is_active": True},
        {"_id": 0, "access_token_encrypted": 0}
    )
    
    if not config:
        return {"configured": False}
    
    return {
        "configured": True,
        **config
    }

@router.delete("/config")
async def delete_cloud_config(current_user: dict = None):
    """Deactivate WhatsApp Cloud API configuration"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    
    await db.whatsapp_cloud_config.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Configuration désactivée"}

# ==================== MESSAGING ENDPOINTS ====================

@router.post("/send/text")
async def send_text_message(
    message: CloudTextMessage,
    current_user: dict = None
):
    """Send a text message via WhatsApp Cloud API"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    config = await get_cloud_config(user_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration WhatsApp Cloud non trouvée")
    
    access_token = await decrypt_access_token(config)
    
    # Prepare API request
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_API_VERSION}/{config['phone_number_id']}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": message.to.replace("+", "").replace(" ", ""),
        "type": "text",
        "text": {"body": message.message}
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            result = response.json()
            
            if response.status_code != 200:
                error = result.get("error", {})
                raise HTTPException(
                    status_code=400,
                    detail=f"Erreur WhatsApp: {error.get('message', 'Unknown')}"
                )
            
            # Store message in database
            msg_doc = {
                "config_id": str(config["_id"]) if "_id" in config else user_id,
                "user_id": user_id,
                "whatsapp_message_id": result.get("messages", [{}])[0].get("id"),
                "direction": "outbound",
                "phone_number": message.to,
                "message_type": "text",
                "content": {"text": message.message},
                "status": "sent",
                "provider": "cloud_api",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.whatsapp_cloud_messages.insert_one(msg_doc)
            
            return {
                "success": True,
                "message_id": result.get("messages", [{}])[0].get("id"),
                "message": "Message envoyé via WhatsApp Cloud API"
            }
            
        except httpx.RequestError as e:
            logger.error(f"WhatsApp Cloud API error: {e}")
            raise HTTPException(status_code=500, detail="Erreur de connexion à WhatsApp")

@router.post("/send/media")
async def send_media_message(
    message: CloudMediaMessage,
    current_user: dict = None
):
    """Send a media message (image, document, audio, video)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    config = await get_cloud_config(user_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration WhatsApp Cloud non trouvée")
    
    if message.media_type not in ["image", "document", "audio", "video"]:
        raise HTTPException(status_code=400, detail="Type de média invalide")
    
    access_token = await decrypt_access_token(config)
    
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_API_VERSION}/{config['phone_number_id']}/messages"
    
    # Build media object
    media_object = {"link": message.media_url}
    
    if message.caption and message.media_type in ["image", "document", "video"]:
        media_object["caption"] = message.caption
    
    if message.filename and message.media_type == "document":
        media_object["filename"] = message.filename
    
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": message.to.replace("+", "").replace(" ", ""),
        "type": message.media_type,
        message.media_type: media_object
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            result = response.json()
            
            if response.status_code != 200:
                error = result.get("error", {})
                raise HTTPException(
                    status_code=400,
                    detail=f"Erreur WhatsApp: {error.get('message', 'Unknown')}"
                )
            
            # Store message
            msg_doc = {
                "config_id": str(config["_id"]) if "_id" in config else user_id,
                "user_id": user_id,
                "whatsapp_message_id": result.get("messages", [{}])[0].get("id"),
                "direction": "outbound",
                "phone_number": message.to,
                "message_type": message.media_type,
                "content": {
                    "media_url": message.media_url,
                    "caption": message.caption,
                    "filename": message.filename
                },
                "status": "sent",
                "provider": "cloud_api",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.whatsapp_cloud_messages.insert_one(msg_doc)
            
            return {
                "success": True,
                "message_id": result.get("messages", [{}])[0].get("id"),
                "message": f"{message.media_type.capitalize()} envoyé"
            }
            
        except httpx.RequestError as e:
            logger.error(f"WhatsApp Cloud API error: {e}")
            raise HTTPException(status_code=500, detail="Erreur de connexion à WhatsApp")

@router.post("/send/template")
async def send_template_message(
    message: CloudTemplateMessage,
    current_user: dict = None
):
    """Send a pre-approved template message"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    config = await get_cloud_config(user_id)
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration WhatsApp Cloud non trouvée")
    
    access_token = await decrypt_access_token(config)
    
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_API_VERSION}/{config['phone_number_id']}/messages"
    
    template_payload = {
        "name": message.template_name,
        "language": {"code": message.language_code}
    }
    
    if message.parameters:
        template_payload["components"] = [{
            "type": "body",
            "parameters": [{"type": "text", "text": p} for p in message.parameters]
        }]
    
    payload = {
        "messaging_product": "whatsapp",
        "to": message.to.replace("+", "").replace(" ", ""),
        "type": "template",
        "template": template_payload
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            result = response.json()
            
            if response.status_code != 200:
                error = result.get("error", {})
                raise HTTPException(
                    status_code=400,
                    detail=f"Erreur WhatsApp: {error.get('message', 'Unknown')}"
                )
            
            return {
                "success": True,
                "message_id": result.get("messages", [{}])[0].get("id"),
                "message": "Template envoyé"
            }
            
        except httpx.RequestError as e:
            logger.error(f"WhatsApp Cloud API error: {e}")
            raise HTTPException(status_code=500, detail="Erreur de connexion à WhatsApp")

# ==================== WEBHOOK ENDPOINTS ====================

@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Webhook verification endpoint for WhatsApp Cloud API.
    WhatsApp sends a challenge to verify ownership.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    if mode == "subscribe":
        # Find config with matching verify token
        config = await db.whatsapp_cloud_config.find_one({
            "webhook_verify_token": token,
            "is_active": True
        })
        
        if config:
            logger.info("Webhook verified successfully")
            return int(challenge)
        else:
            logger.warning(f"Webhook verification failed: invalid token")
            raise HTTPException(status_code=403, detail="Invalid verify token")
    
    raise HTTPException(status_code=400, detail="Invalid request")

@router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Receive incoming messages and status updates from WhatsApp.
    Must respond with 200 OK within 5 seconds.
    """
    body = await request.body()
    
    try:
        payload = await request.json()
    except:
        return {"status": "ok"}
    
    # Get signature for validation
    signature = request.headers.get("X-Hub-Signature-256", "")
    
    # Process in background to respond quickly
    background_tasks.add_task(process_webhook_event, payload, body, signature)
    
    return {"status": "ok"}

async def process_webhook_event(payload: dict, body: bytes, signature: str):
    """Process webhook event in background"""
    try:
        # Store raw event
        await db.whatsapp_cloud_events.insert_one({
            "payload": payload,
            "signature": signature,
            "processed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Process entries
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                # Handle incoming messages
                for msg in value.get("messages", []):
                    await handle_incoming_cloud_message(msg, value)
                
                # Handle status updates
                for status in value.get("statuses", []):
                    await handle_message_status(status)
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")

async def handle_incoming_cloud_message(message: dict, context: dict):
    """Process incoming message from WhatsApp Cloud API"""
    message_id = message.get("id")
    from_number = message.get("from")
    message_type = message.get("type")
    timestamp = message.get("timestamp")
    
    # Extract content based on type
    content = {}
    text_content = ""
    
    if message_type == "text":
        content = message.get("text", {})
        text_content = content.get("body", "")
    elif message_type == "image":
        content = message.get("image", {})
    elif message_type == "document":
        content = message.get("document", {})
    elif message_type == "audio":
        content = message.get("audio", {})
    elif message_type == "video":
        content = message.get("video", {})
    
    # Store message
    msg_doc = {
        "whatsapp_message_id": message_id,
        "direction": "inbound",
        "phone_number": from_number,
        "message_type": message_type,
        "content": content,
        "text": text_content,
        "status": "received",
        "provider": "cloud_api",
        "timestamp": timestamp,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.whatsapp_cloud_messages.insert_one(msg_doc)
    logger.info(f"Stored incoming cloud message: {message_id} from {from_number}")

async def handle_message_status(status: dict):
    """Process message delivery status update"""
    message_id = status.get("id")
    status_value = status.get("status")
    timestamp = status.get("timestamp")
    
    await db.whatsapp_cloud_messages.update_one(
        {"whatsapp_message_id": message_id},
        {"$set": {
            "status": status_value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Updated message status: {message_id} -> {status_value}")

# ==================== STATUS & MESSAGES ====================

@router.get("/status")
async def get_cloud_status(current_user: dict = None):
    """Get WhatsApp Cloud API connection status"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    config = await get_cloud_config(user_id)
    
    if not config:
        return {"configured": False, "connected": False}
    
    # Test API connection
    access_token = await decrypt_access_token(config)
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{WHATSAPP_API_URL}/{WHATSAPP_API_VERSION}/{config['phone_number_id']}",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "configured": True,
                    "connected": True,
                    "phone_number": data.get("display_phone_number"),
                    "verified_name": data.get("verified_name"),
                    "quality_rating": data.get("quality_rating"),
                    "provider": "cloud_api"
                }
            else:
                return {"configured": True, "connected": False, "error": "Token invalide"}
                
        except Exception as e:
            return {"configured": True, "connected": False, "error": str(e)}

@router.get("/messages")
async def get_cloud_messages(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = None
):
    """Get message history"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    user_id = current_user.get("user_id") or current_user.get("id")
    
    messages = await db.whatsapp_cloud_messages.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return {"messages": messages, "count": len(messages)}
