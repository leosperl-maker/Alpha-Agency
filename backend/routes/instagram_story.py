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
    instagram_account_id: str
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
    schedule_time: Optional[str] = None  # ISO format, None = immediate

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

async def get_meta_instagram_account(account_id: str, user_id: str) -> Optional[Dict]:
    """Get Instagram account details from stored Meta pages"""
    page = await db.meta_pages.find_one({
        "user_id": user_id,
        "instagram_business_id": account_id,
        "is_active": True
    })
    return page

async def upload_media_for_story(media_url: str, media_type: str) -> Optional[str]:
    """
    Upload media to a temporary storage for story creation.
    Returns a URL that can be used for the story.
    """
    # For now, we assume the media_url is already accessible
    # In production, you'd want to upload to your own CDN
    return media_url

# ==================== DRAFT MANAGEMENT ====================

@router.post("/drafts")
async def create_story_draft(
    request: CreateStoryRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a story draft. This saves the story configuration
    without publishing it yet.
    """
    user_id = get_user_id(current_user)
    
    # Verify Instagram account access
    account = await get_instagram_account(request.instagram_account_id, user_id)
    if not account:
        raise HTTPException(status_code=404, detail="Compte Instagram non trouvé")
    
    # Create draft
    draft_id = str(uuid.uuid4())
    draft = {
        "id": draft_id,
        "user_id": user_id,
        "instagram_account_id": request.instagram_account_id,
        "instagram_username": account.get("instagram_username", ""),
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
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """List all story drafts for the user"""
    user_id = get_user_id(current_user)
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    drafts = await db.instagram_story_drafts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"drafts": drafts, "count": len(drafts)}

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
    Publish a story immediately.
    
    WARNING: This uses browser automation and is against Instagram's Terms of Service.
    The official API does not support Story posting.
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
    
    # Check if Instagram credentials are stored
    from .instagram_automation import get_instagram_credentials, post_instagram_story
    
    creds = await get_instagram_credentials(user_id)
    if not creds:
        raise HTTPException(
            status_code=400, 
            detail="Credentials Instagram non configurés. Ajoutez vos identifiants dans les paramètres."
        )
    
    # Update status to publishing
    await db.instagram_story_drafts.update_one(
        {"id": draft_id},
        {"$set": {"status": "publishing"}}
    )
    
    # Post story using browser automation
    result = await post_instagram_story(
        user_id=user_id,
        media_url=draft.get("media_url"),
        text=draft.get("elements", {}).get("text_overlay"),
        poll=draft.get("elements", {}).get("poll")
    )
    
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
            "message": "Story publiée avec succès !",
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
    
    # Create account
    account_id = str(uuid.uuid4())
    account_doc = {
        "id": account_id,
        "user_id": user_id,
        "username": account.username,
        "password_encrypted": encrypt_token(account.password),
        "login_success": False,
        "last_login_attempt": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.instagram_accounts.insert_one(account_doc)
    
    # Test login
    from .instagram_automation import test_account_login
    result = await test_account_login(account_id, account.username, account.password)
    
    # Update login status
    await db.instagram_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "login_success": result.get("success", False),
            "last_login_attempt": datetime.now(timezone.utc).isoformat(),
            "login_error": result.get("error")
        }}
    )
    
    return {
        "success": result.get("success", False),
        "account_id": account_id,
        "username": account.username,
        "error": result.get("error") if not result.get("success") else None,
        "message": f"Compte @{account.username} ajouté" + (" et connecté !" if result.get("success") else " (connexion échouée)")
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

