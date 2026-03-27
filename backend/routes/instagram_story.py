"""
Instagram Story Editor - Create and publish Instagram Stories

IMPORTANT: This feature uses browser automation which is against Instagram's ToS.
Use at your own risk. The official Instagram Graph API does not support Story posting.

Features:
- Create story with image/video
- Add polls, questions, countdowns
- Schedule story publication
- Preview before posting
"""

import os
import uuid
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from pydantic import BaseModel

from .database import db, get_current_user

logger = logging.getLogger("instagram_story")

router = APIRouter()
import os

# === BRIDGE BLUESTACKS (ngrok) ===
BRIDGE_URL = os.environ.get("STORIES_BRIDGE_URL", "https://subrotund-punchiest-marylouise.ngrok-free.dev")

async def publish_via_bridge(draft: dict, account: dict) -> dict:
    """
    Publie une story via le bridge BlueStacks (ngrok → localhost:4567).
    Le bridge gère : téléchargement image/vidéo, ADB push, Appium automation.
    """
    elements = draft.get("elements", {})
    
    # Déterminer le type de sticker et ses paramètres
    sticker_type = None
    sticker_params = {}
    
    if elements.get("poll"):
        sticker_type = "poll"
        sticker_params = {
            "question": elements["poll"].get("question", ""),
            "options": elements["poll"].get("options", ["Oui", "Non"])
        }
    elif elements.get("link"):
        sticker_type = "link"
        sticker_params = {"url": elements["link"].get("url", "https://alphagency.fr")}
    elif elements.get("question"):
        sticker_type = "faq"
        sticker_params = {"question": elements["question"].get("question", "")}
    elif elements.get("mention"):
        sticker_type = "mention"
        sticker_params = {"username": elements["mention"].get("username", "")}
    elif elements.get("hashtag"):
        sticker_type = "hashtag"
        sticker_params = {"hashtag": elements["hashtag"].get("tag", "")}
    elif elements.get("countdown"):
        sticker_type = "countdown"
        sticker_params = {"target_date": elements["countdown"].get("end_time", "")}
    elif elements.get("slider"):
        sticker_type = "slider"
        sticker_params = {"question": elements["slider"].get("question", "")}
    else:
        # Fallback : lien alphagency si aucun sticker défini
        sticker_type = "link"
        sticker_params = {"url": "https://alphagency.fr"}
    
    payload = {
        "sticker": sticker_type,
        **sticker_params,
        "account_username": account.get("username", ""),
        "media_type": draft.get("media_type", "image"),
        "sticker_position": elements.get("sticker_position", {"x": 0.5, "y": 0.5}),
    }
    
    # Ajouter l'URL du média (image ou vidéo)
    media_url = draft.get("media_url")
    if media_url:
        if draft.get("media_type") == "video":
            payload["video_url"] = media_url
        else:
            payload["image_url"] = media_url
    
    # Ajouter le texte natif Instagram si configuré
    text_overlay = elements.get("text_overlay_config")
    if text_overlay:
        payload["text_overlay"] = text_overlay
    elif elements.get("text_overlay"):
        # Format simple : juste le texte, police par défaut
        payload["text_overlay"] = {
            "text": elements["text_overlay"],
            "font": elements.get("text_font", "classique"),
            "color": elements.get("text_color", "#FFFFFF"),
            "x": elements.get("text_position", {}).get("x", 0.5),
            "y": elements.get("text_position", {}).get("y", 0.3),
        }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(f"{BRIDGE_URL}/api/stories/publish", json=payload)
            result = res.json()
            logger.info(f"Bridge response: {result}")
            return result
    except Exception as e:
        logger.error(f"Erreur bridge: {e}")
        return {"success": False, "error": str(e)}

async def schedule_via_bridge(draft: dict, account: dict, schedule_time: str) -> dict:
    """Programme une story via le bridge BlueStacks."""
    elements = draft.get("elements", {})
    
    # Réutiliser la logique de publish_via_bridge pour construire le payload
    result = {"sticker": "link", "url": "https://alphagency.fr"}
    if elements.get("poll"):
        result = {"sticker": "poll", "question": elements["poll"].get("question",""),
                  "options": elements["poll"].get("options", ["Oui","Non"])}
    elif elements.get("link"):
        result = {"sticker": "link", "url": elements["link"].get("url","")}
    elif elements.get("question"):
        result = {"sticker": "faq", "question": elements["question"].get("question","")}
    
    payload = {
        **result,
        "account_username": account.get("username", ""),
        "media_type": draft.get("media_type", "image"),
        "sticker_position": elements.get("sticker_position", {"x": 0.5, "y": 0.5}),
        "schedule": schedule_time,
    }
    if draft.get("media_url"):
        payload["image_url" if draft.get("media_type") != "video" else "video_url"] = draft["media_url"]
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(f"{BRIDGE_URL}/api/stories/schedule", json=payload)
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e)}



def get_user_id(user: dict) -> str:
    """Extract user ID from current_user dict"""
    return user.get("user_id") or user.get("id") or str(user.get("_id", ""))

# ==================== MODELS ====================

class StoryPoll(BaseModel):
    question: str
    options: List[str]  # Max 2 for polls

class StoryQuestion(BaseModel):
    question: str
    
class StoryCountdown(BaseModel):
    title: str
    end_time: str  # ISO format

class StoryMention(BaseModel):
    username: str
    position: Dict[str, float] = {"x": 0.5, "y": 0.5}

class StoryLink(BaseModel):
    url: str
    text: Optional[str] = "En savoir plus"

class CreateStoryRequest(BaseModel):
    """Request to create a story draft"""
    account_id: str  # Multi-account support
    media_url: Optional[str] = None  # Image or video URL
    media_type: str = "image"  # image or video
    background_color: Optional[str] = "#000000"
    text_overlay: Optional[str] = None
    text_position: Dict[str, float] = {"x": 0.5, "y": 0.5}
    text_color: Optional[str] = "#FFFFFF"
    poll: Optional[StoryPoll] = None
    question: Optional[StoryQuestion] = None
    countdown: Optional[StoryCountdown] = None
    mentions: Optional[List[StoryMention]] = None
    link: Optional[StoryLink] = None
    schedule_time: Optional[str] = None  # ISO format for scheduling

class StoryDraft(BaseModel):
    """A saved story draft"""
    id: str
    instagram_account_id: str
    instagram_username: str
    media_url: Optional[str]
    media_type: str
    elements: Dict  # All story elements (poll, question, etc.)
    status: str  # draft, scheduled, published, failed
    schedule_time: Optional[str]
    created_at: str
    published_at: Optional[str]
    error_message: Optional[str]

# ==================== HELPER FUNCTIONS ====================

# ==================== DRAFT MANAGEMENT ====================

@router.post("/drafts")
async def create_story_draft(
    request: CreateStoryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a story draft. This saves the story configuration
    without publishing it yet. Supports scheduling.
    """
    user_id = get_user_id(current_user)
    
    # Get account from multi-account system
    account = await db.instagram_accounts.find_one({
        "id": request.account_id,
        "user_id": user_id
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="Compte Instagram non trouvé")
    
    # Create draft
    draft_id = str(uuid.uuid4())
    draft = {
        "id": draft_id,
        "user_id": user_id,
        "account_id": request.account_id,
        "instagram_username": account.get("username", ""),
        "media_url": request.media_url,
        "media_type": request.media_type,
        "background_color": request.background_color,
        "elements": {
            "text_overlay": request.text_overlay,
            "text_position": request.text_position,
            "text_color": request.text_color,
            "poll": request.poll.dict() if request.poll else None,
            "question": request.question.dict() if request.question else None,
            "countdown": request.countdown.dict() if request.countdown else None,
            "mentions": [m.dict() for m in request.mentions] if request.mentions else [],
            "link": request.link.dict() if request.link else None
        },
        "status": "scheduled" if request.schedule_time else "draft",
        "schedule_time": request.schedule_time,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": None,
        "error_message": None
    }
    
    await db.instagram_story_drafts.insert_one(draft)
    
    logger.info(f"Story draft created: {draft_id} for @{account.get('instagram_username')}")
    
    return {
        "success": True,
        "draft_id": draft_id,
        "status": draft["status"],
        "message": "Brouillon de story créé" + (" et programmé" if request.schedule_time else "")
    }

@router.get("/drafts")
async def list_story_drafts(
    status: Optional[str] = None,
    account_id: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """List all story drafts for the user, optionally filtered by account"""
    user_id = get_user_id(current_user)
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    if account_id:
        query["account_id"] = account_id
    
    drafts = await db.instagram_story_drafts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"drafts": drafts, "count": len(drafts)}

@router.get("/accounts/{account_id}/history")
async def get_account_history(
    account_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get story history for a specific Instagram account"""
    user_id = get_user_id(current_user)
    
    # Verify account belongs to user
    account = await db.instagram_accounts.find_one({
        "id": account_id,
        "user_id": user_id
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    # Get all stories for this account
    stories = await db.instagram_story_drafts.find(
        {"user_id": user_id, "account_id": account_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Count stats
    total = len(stories)
    published = len([s for s in stories if s.get("status") == "published"])
    scheduled = len([s for s in stories if s.get("status") == "scheduled"])
    drafts = len([s for s in stories if s.get("status") == "draft"])
    failed = len([s for s in stories if s.get("status") == "failed"])
    
    return {
        "account": {
            "id": account_id,
            "username": account.get("username"),
            "login_success": account.get("login_success")
        },
        "stories": stories,
        "stats": {
            "total": total,
            "published": published,
            "scheduled": scheduled,
            "drafts": drafts,
            "failed": failed
        }
    }

@router.get("/drafts/{draft_id}")
async def get_story_draft(
    draft_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific story draft"""
    user_id = get_user_id(current_user)
    
    draft = await db.instagram_story_drafts.find_one(
        {"id": draft_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not draft:
        raise HTTPException(status_code=404, detail="Brouillon non trouvé")
    
    return draft

@router.delete("/drafts/{draft_id}")
async def delete_story_draft(
    draft_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a story draft"""
    user_id = get_user_id(current_user)
    
    result = await db.instagram_story_drafts.delete_one({
        "id": draft_id,
        "user_id": user_id,
        "status": {"$in": ["draft", "scheduled", "failed"]}  # Can't delete published
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Brouillon non trouvé ou déjà publié")
    
    return {"success": True, "message": "Brouillon supprimé"}

# ==================== PUBLISHING ====================

@router.post("/drafts/{draft_id}/publish")
async def publish_story(
    draft_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Publish a story immediately using browser automation.
    Supports multi-account system.
    
    WARNING: This uses browser automation and is against Instagram's Terms of Service.
    """
    user_id = get_user_id(current_user)
    
    draft = await db.instagram_story_drafts.find_one({
        "id": draft_id,
        "user_id": user_id
    })
    
    if not draft:
        raise HTTPException(status_code=404, detail="Brouillon non trouvé")
    
    if draft["status"] == "published":
        raise HTTPException(status_code=400, detail="Story déjà publiée")
    
    # Get account from multi-account system
    account_id = draft.get("account_id")
    account = await db.instagram_accounts.find_one({
        "id": account_id,
        "user_id": user_id
    })
    
    if not account:
        raise HTTPException(
            status_code=400, 
            detail="Compte Instagram non trouvé. Recréez le brouillon avec un compte valide."
        )
    
    # Update status to publishing
    await db.instagram_story_drafts.update_one(
        {"id": draft_id},
        {"$set": {"status": "publishing"}}
    )
    
    # === APPEL DU BRIDGE BLUESTACKS ===
    result = await publish_via_bridge(draft, account)
    
    # Update draft status
    if result.get("success"):
        await db.instagram_story_drafts.update_one(
            {"id": draft_id},
            {"$set": {
                "status": "published",
                "published_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "message": f"Story publiée sur @{account['username']} !",
            "draft_id": draft_id
        }
    else:
        await db.instagram_story_drafts.update_one(
            {"id": draft_id},
            {"$set": {
                "status": "failed",
                "error_message": result.get("error")
            }}
        )
        return {
            "success": False,
            "error": result.get("error"),
            "draft_id": draft_id
        }

# ==================== STORY ELEMENTS INFO ====================

@router.get("/elements")
async def get_available_elements():
    """Get list of available story elements and their configurations"""
    return {
        "elements": [
            {
                "type": "poll",
                "name": "Sondage",
                "description": "Posez une question avec 2 options",
                "config": {
                    "question": "string (max 100 chars)",
                    "options": ["Option A", "Option B"]
                }
            },
            {
                "type": "question",
                "name": "Question",
                "description": "Posez une question ouverte à votre audience",
                "config": {
                    "question": "string (max 100 chars)"
                }
            },
            {
                "type": "countdown",
                "name": "Compte à rebours",
                "description": "Ajoutez un compte à rebours vers un événement",
                "config": {
                    "title": "string",
                    "end_time": "ISO date"
                }
            },
            {
                "type": "mention",
                "name": "Mention",
                "description": "Mentionnez un autre compte",
                "config": {
                    "username": "@username",
                    "position": {"x": 0.5, "y": 0.5}
                }
            },
            {
                "type": "link",
                "name": "Lien",
                "description": "Ajoutez un lien swipe-up (nécessite 10k abonnés)",
                "config": {
                    "url": "https://...",
                    "text": "En savoir plus"
                }
            },
            {
                "type": "text",
                "name": "Texte",
                "description": "Ajoutez du texte sur la story",
                "config": {
                    "text": "string",
                    "position": {"x": 0.5, "y": 0.5},
                    "color": "#FFFFFF",
                    "font": "default"
                }
            }
        ],
        "limitations": {
            "note": "L'API officielle Instagram Graph ne supporte PAS la publication de Stories.",
            "alternatives": [
                "Publication manuelle via l'app Instagram",
                "Meta Business Suite (pour comptes business)",
                "Automatisation browser (contre les CGU, risque de ban)"
            ]
        }
    }

# ==================== ANALYTICS ====================


@router.get("/accounts/bluestacks")
async def get_bluestacks_accounts(
    current_user: dict = Depends(get_current_user)
):
    """Retourne les comptes Instagram disponibles sur BlueStacks (via bridge)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(f"{BRIDGE_URL}/api/stories/accounts")
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e), "devices": []}

@router.get("/queue")
async def get_stories_queue(
    current_user: dict = Depends(get_current_user)
):
    """Retourne la file d'attente des stories programmées (depuis bridge)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(f"{BRIDGE_URL}/api/stories/queue")
            return res.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/analytics")
async def get_story_analytics(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """
    Get story analytics. 
    Note: This requires Instagram Insights API access.
    """
    user_id = get_user_id(current_user)
    
    # Get published stories
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    stories = await db.instagram_story_drafts.find({
        "user_id": user_id,
        "status": "published",
        "published_at": {"$gte": since}
    }, {"_id": 0}).to_list(100)
    
    return {
        "period_days": days,
        "total_stories": len(stories),
        "stories": stories,
        "note": "Pour les métriques détaillées (vues, réponses, swipe-ups), utilisez l'API Instagram Insights via le endpoint Meta."
    }

# ==================== MULTI-ACCOUNT MANAGEMENT ====================

class InstagramAccountCreate(BaseModel):
    username: str
    password: str

@router.get("/accounts")
async def list_instagram_accounts(
    current_user: dict = Depends(get_current_user)
):
    """List all Instagram accounts for the user"""
    user_id = get_user_id(current_user)
    
    accounts = await db.instagram_accounts.find(
        {"user_id": user_id},
        {"_id": 0, "password_encrypted": 0}
    ).to_list(50)
    
    return {"accounts": accounts, "count": len(accounts)}

@router.post("/accounts")
async def add_instagram_account(
    account: InstagramAccountCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a new Instagram account for story automation.
    Supports multiple accounts.
    """
    user_id = get_user_id(current_user)
    
    from .token_encryption import encrypt_token
    
    # Check if account already exists
    existing = await db.instagram_accounts.find_one({
        "user_id": user_id,
        "username": account.username
    })
    
    if existing:
        return {"success": False, "error": "Ce compte est déjà ajouté"}
    
    # Create account (without testing login automatically)
    account_id = str(uuid.uuid4())
    account_doc = {
        "id": account_id,
        "user_id": user_id,
        "username": account.username,
        "password_encrypted": encrypt_token(account.password),
        "login_success": None,  # Not tested yet
        "last_login_attempt": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.instagram_accounts.insert_one(account_doc)
    
    return {
        "success": True,
        "account_id": account_id,
        "username": account.username,
        "message": f"Compte @{account.username} ajouté ! Cliquez sur 'Tester' pour vérifier la connexion."
    }

@router.get("/accounts/{account_id}")
async def get_instagram_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific Instagram account"""
    user_id = get_user_id(current_user)
    
    account = await db.instagram_accounts.find_one(
        {"id": account_id, "user_id": user_id},
        {"_id": 0, "password_encrypted": 0}
    )
    
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    return account

@router.delete("/accounts/{account_id}")
async def delete_instagram_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an Instagram account"""
    user_id = get_user_id(current_user)
    
    result = await db.instagram_accounts.delete_one({
        "id": account_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    return {"success": True, "message": "Compte supprimé"}

@router.post("/accounts/{account_id}/test")
async def test_instagram_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Test login for a specific Instagram account"""
    user_id = get_user_id(current_user)
    
    account = await db.instagram_accounts.find_one({
        "id": account_id,
        "user_id": user_id
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    from .token_encryption import decrypt_token
    from .instagram_automation import test_account_login
    
    password = decrypt_token(account.get("password_encrypted", ""))
    result = await test_account_login(account_id, account["username"], password)
    
    # Update login status
    await db.instagram_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "login_success": result.get("success", False),
            "last_login_attempt": datetime.now(timezone.utc).isoformat(),
            "login_error": result.get("error")
        }}
    )
    
    return result

# ==================== LEGACY SINGLE CREDENTIALS (Backward compatibility) ====================

class InstagramCredentials(BaseModel):
    username: str
    password: str

@router.post("/credentials")
async def save_instagram_credentials(
    credentials: InstagramCredentials,
    current_user: dict = Depends(get_current_user)
):
    """
    Save Instagram credentials (legacy - use /accounts for multi-account).
    """
    # Redirect to multi-account system
    return await add_instagram_account(
        InstagramAccountCreate(username=credentials.username, password=credentials.password),
        current_user
    )

@router.get("/credentials")
async def get_instagram_credentials_status(
    current_user: dict = Depends(get_current_user)
):
    """Check if Instagram credentials are configured (legacy)"""
    user_id = get_user_id(current_user)
    
    # Check multi-account system
    account = await db.instagram_accounts.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_encrypted": 0}
    )
    
    if not account:
        return {"configured": False}
    
    return {
        "configured": True,
        "username": account.get("username"),
        "last_login": account.get("last_login_attempt"),
        "login_success": account.get("login_success", False)
    }

@router.delete("/credentials")
async def delete_instagram_credentials(
    current_user: dict = Depends(get_current_user)
):
    """Delete stored Instagram credentials (deletes first account)"""
    user_id = get_user_id(current_user)
    
    await db.instagram_accounts.delete_one({"user_id": user_id})
    
    return {"success": True, "message": "Credentials Instagram supprimés"}

@router.post("/test-login")
async def test_instagram_login_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Test Instagram login with stored credentials (first account)"""
    user_id = get_user_id(current_user)
    
    account = await db.instagram_accounts.find_one({"user_id": user_id})
    
    if not account:
        return {"success": False, "error": "Aucun compte configuré"}
    
    return await test_instagram_account(account["id"], current_user)

