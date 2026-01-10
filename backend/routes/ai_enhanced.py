"""
AI Assistant Routes - Enhanced with image analysis and generation
Uses Emergent LLM Key for GPT-4o Vision, GPT Image 1, and Gemini Nano Banana
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import uuid
import base64
import os
from datetime import datetime, timezone
import logging

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
    
class ImageGenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = "gemini-3-pro-image-preview"  # gemini-3-pro-image-preview, gpt-image-1
    size: Optional[str] = "1024x1024"


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
            "image_generation": EMERGENT_AVAILABLE
        },
        "available_models": {
            "chat": ["gpt-4o", "gemini-3-flash-preview"],
            "image_analysis": ["gpt-4o", "gemini-3-flash-preview"],
            "image_generation": ["gemini-3-pro-image-preview"]
        }
    }


@router.post("/chat")
async def enhanced_chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Chat with AI - supports text and image attachments"""
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
        
        # Initialize chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message="""Tu es l'assistant IA d'Alpha Agency, une agence de communication digitale en Guadeloupe.
Tu aides l'équipe avec leurs tâches quotidiennes: analyse de données, rédaction, conseils marketing, etc.
Tu peux analyser des images si l'utilisateur en envoie.
Réponds toujours en français, de manière professionnelle mais amicale."""
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
                            {"role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()}
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
            "message": response,
            "conversation_id": conversation_id,
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
