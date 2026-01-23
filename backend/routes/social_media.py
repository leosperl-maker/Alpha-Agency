"""
Social Media Management - Multi-Entity, Multi-Account System
Inspired by Agorapulse architecture
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
import httpx
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

from .database import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/social", tags=["Social Media"])

# Helper to get user_id from current_user dict
def get_user_id(current_user: dict) -> str:
    return current_user.get("id", current_user.get("user_id", "unknown"))

def get_workspace_id(current_user: dict) -> str:
    return current_user.get("workspace_id", "default")

# ==================== ENCRYPTION ====================
# Generate key: Fernet.generate_key()
ENCRYPTION_KEY = os.environ.get('SOCIAL_ENCRYPTION_KEY', Fernet.generate_key())
if isinstance(ENCRYPTION_KEY, str):
    ENCRYPTION_KEY = ENCRYPTION_KEY.encode()
fernet = Fernet(ENCRYPTION_KEY)

def encrypt_token(token: str) -> str:
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()

# ==================== ENUMS ====================

class Platform(str, Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    TWITTER = "twitter"
    YOUTUBE = "youtube"

class AccountType(str, Enum):
    PAGE = "page"
    PROFILE = "profile"
    BUSINESS = "business"
    CREATOR = "creator"

class AccountStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    ERROR = "error"
    DISCONNECTED = "disconnected"

class PostStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"

class PostType(str, Enum):
    FEED = "feed"
    REEL = "reel"
    STORY = "story"
    CAROUSEL = "carousel"

class InboxItemType(str, Enum):
    COMMENT = "comment"
    MESSAGE = "message"
    MENTION = "mention"
    REVIEW = "review"

# ==================== CAPABILITY MATRIX ====================

PLATFORM_CAPABILITIES = {
    Platform.FACEBOOK: {
        "page": {
            "canPublishFeed": True,
            "canPublishReel": True,
            "canPublishStory": False,  # Limited API support
            "canSchedule": True,
            "canReadComments": True,
            "canReplyComments": True,
            "canReadDM": False,  # Requires special permissions
            "canReadInsights": True,
            "canReadEngagement": True,
            "maxMediaPerPost": 10,
            "maxCaptionLength": 63206,
            "supportedMediaTypes": ["image", "video", "link"],
        }
    },
    Platform.INSTAGRAM: {
        "business": {
            "canPublishFeed": True,
            "canPublishReel": True,
            "canPublishStory": True,  # Limited - no interactive stickers
            "canSchedule": True,
            "canReadComments": True,
            "canReplyComments": True,
            "canReadDM": False,  # Very limited API
            "canReadInsights": True,
            "canReadEngagement": True,
            "maxMediaPerPost": 10,
            "maxCaptionLength": 2200,
            "maxHashtags": 30,
            "supportedMediaTypes": ["image", "video"],
            "storyLimitations": "No interactive stickers via API (polls, questions, etc.)"
        },
        "creator": {
            "canPublishFeed": True,
            "canPublishReel": True,
            "canPublishStory": True,
            "canSchedule": True,
            "canReadComments": True,
            "canReplyComments": True,
            "canReadDM": False,
            "canReadInsights": True,
            "canReadEngagement": True,
            "maxMediaPerPost": 10,
            "maxCaptionLength": 2200,
            "maxHashtags": 30,
            "supportedMediaTypes": ["image", "video"],
        }
    },
    Platform.LINKEDIN: {
        "page": {
            "canPublishFeed": True,
            "canPublishReel": False,
            "canPublishStory": False,
            "canSchedule": False,  # Not via API
            "canReadComments": True,
            "canReplyComments": True,
            "canReadDM": False,
            "canReadInsights": True,
            "canReadEngagement": True,
            "maxMediaPerPost": 20,
            "maxCaptionLength": 3000,
            "supportedMediaTypes": ["image", "video", "document", "link"],
        },
        "profile": {
            "canPublishFeed": True,
            "canPublishReel": False,
            "canPublishStory": False,
            "canSchedule": False,
            "canReadComments": False,
            "canReplyComments": False,
            "canReadDM": False,
            "canReadInsights": False,
            "canReadEngagement": False,
            "maxMediaPerPost": 20,
            "maxCaptionLength": 3000,
            "supportedMediaTypes": ["image", "video", "document", "link"],
        }
    },
    Platform.TIKTOK: {
        "business": {
            "canPublishFeed": True,
            "canPublishReel": False,  # TikTok = video native
            "canPublishStory": False,
            "canSchedule": False,  # Limited API
            "canReadComments": True,
            "canReplyComments": False,
            "canReadDM": False,
            "canReadInsights": True,
            "canReadEngagement": True,
            "maxMediaPerPost": 1,
            "maxCaptionLength": 2200,
            "supportedMediaTypes": ["video"],
        }
    }
}

def get_capabilities(platform: str, account_type: str) -> Dict[str, Any]:
    """Get capabilities for a platform/account_type combination"""
    platform_caps = PLATFORM_CAPABILITIES.get(platform, {})
    return platform_caps.get(account_type, {})

# ==================== PYDANTIC MODELS ====================

class EntityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6366f1")
    logo_url: Optional[str] = None
    description: Optional[str] = None

class EntityUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

class SocialAccountCreate(BaseModel):
    platform: Platform
    account_type: AccountType
    external_id: str
    display_name: str
    username: Optional[str] = None
    profile_picture_url: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[str] = None
    scopes: List[str] = []
    metadata: Dict[str, Any] = {}

class EntityAccountLink(BaseModel):
    entity_id: str
    social_account_id: str

class SocialPostCreate(BaseModel):
    entity_id: str
    account_ids: List[str]  # Multi-account support
    post_type: PostType = PostType.FEED
    content: str
    media_urls: List[str] = []
    link_url: Optional[str] = None
    hashtags: List[str] = []
    location: Optional[str] = None
    scheduled_at: Optional[str] = None  # ISO format
    is_draft: bool = False
    platform_variations: Dict[str, Dict[str, Any]] = {}  # Per-platform customizations

class SocialPostUpdate(BaseModel):
    content: Optional[str] = None
    media_urls: Optional[List[str]] = None
    link_url: Optional[str] = None
    hashtags: Optional[List[str]] = None
    location: Optional[str] = None
    scheduled_at: Optional[str] = None
    is_draft: Optional[bool] = None
    platform_variations: Optional[Dict[str, Dict[str, Any]]] = None

class PostTemplateCreate(BaseModel):
    entity_id: str
    name: str
    content: str
    hashtags: List[str] = []
    media_urls: List[str] = []
    platforms: List[str] = []

# ==================== ENTITIES ENDPOINTS ====================

@router.get("/entities")
async def get_entities(current_user: dict = Depends(get_current_user)):
    """Get all entities for the workspace"""
    entities = await db.social_entities.find(
        {"workspace_id": get_workspace_id(current_user)},
        {"_id": 0}
    ).to_list(100)
    
    # Add account count for each entity
    for entity in entities:
        links = await db.entity_social_accounts.find(
            {"entity_id": entity["id"]},
            {"_id": 0}
        ).to_list(100)
        entity["account_count"] = len(links)
        entity["account_ids"] = [l["social_account_id"] for l in links]
    
    return entities

@router.post("/entities")
async def create_entity(data: EntityCreate, current_user: dict = Depends(get_current_user)):
    """Create a new entity"""
    entity_id = str(uuid.uuid4())
    entity = {
        "id": entity_id,
        "workspace_id": get_workspace_id(current_user),
        "name": data.name,
        "color": data.color,
        "logo_url": data.logo_url,
        "description": data.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": get_user_id(current_user)
    }
    
    await db.social_entities.insert_one(entity)
    return {**entity, "account_count": 0, "account_ids": []}

@router.put("/entities/{entity_id}")
async def update_entity(
    entity_id: str, 
    data: EntityUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update an entity"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.social_entities.update_one(
        {"id": entity_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    entity = await db.social_entities.find_one({"id": entity_id}, {"_id": 0})
    return entity

@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an entity and its account links"""
    # Remove account links
    await db.entity_social_accounts.delete_many({"entity_id": entity_id})
    
    # Delete entity
    result = await db.social_entities.delete_one({"id": entity_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    return {"message": "Entity deleted"}

# ==================== SOCIAL ACCOUNTS ENDPOINTS ====================

@router.get("/accounts")
async def get_social_accounts(
    entity_id: Optional[str] = None,
    platform: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all connected social accounts"""
    query = {"workspace_id": get_workspace_id(current_user)}
    
    if platform:
        query["platform"] = platform
    
    accounts = await db.social_accounts.find(query, {"_id": 0}).to_list(100)
    
    # Don't expose tokens
    for acc in accounts:
        acc.pop("access_token_encrypted", None)
        acc.pop("refresh_token_encrypted", None)
        
        # Add capabilities
        acc["capabilities"] = get_capabilities(acc.get("platform"), acc.get("account_type"))
        
        # Get linked entities
        links = await db.entity_social_accounts.find(
            {"social_account_id": acc["id"]},
            {"_id": 0}
        ).to_list(100)
        acc["entity_ids"] = [l["entity_id"] for l in links]
    
    # Filter by entity if specified
    if entity_id:
        entity_links = await db.entity_social_accounts.find(
            {"entity_id": entity_id},
            {"_id": 0}
        ).to_list(100)
        linked_account_ids = {l["social_account_id"] for l in entity_links}
        accounts = [a for a in accounts if a["id"] in linked_account_ids]
    
    return accounts

@router.get("/accounts/{account_id}")
async def get_social_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific social account"""
    account = await db.social_accounts.find_one({"id": account_id}, {"_id": 0})
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Don't expose tokens
    account.pop("access_token_encrypted", None)
    account.pop("refresh_token_encrypted", None)
    
    # Add capabilities
    account["capabilities"] = get_capabilities(account.get("platform"), account.get("account_type"))
    
    return account

@router.post("/accounts")
async def create_social_account(
    data: SocialAccountCreate, 
    current_user: dict = Depends(get_current_user)
):
    """Register a new social account (after OAuth)"""
    # Check if account already exists
    existing = await db.social_accounts.find_one({
        "platform": data.platform,
        "external_id": data.external_id,
        "workspace_id": get_workspace_id(current_user)
    })
    
    if existing:
        # Update existing account
        await db.social_accounts.update_one(
            {"id": existing["id"]},
            {"$set": {
                "access_token_encrypted": encrypt_token(data.access_token),
                "refresh_token_encrypted": encrypt_token(data.refresh_token) if data.refresh_token else None,
                "token_expires_at": data.token_expires_at,
                "scopes": data.scopes,
                "status": AccountStatus.ACTIVE,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"id": existing["id"], "message": "Account updated"}
    
    account_id = str(uuid.uuid4())
    account = {
        "id": account_id,
        "workspace_id": get_workspace_id(current_user),
        "platform": data.platform,
        "account_type": data.account_type,
        "external_id": data.external_id,
        "display_name": data.display_name,
        "username": data.username,
        "profile_picture_url": data.profile_picture_url,
        "access_token_encrypted": encrypt_token(data.access_token),
        "refresh_token_encrypted": encrypt_token(data.refresh_token) if data.refresh_token else None,
        "token_expires_at": data.token_expires_at,
        "scopes": data.scopes,
        "metadata": data.metadata,
        "status": AccountStatus.ACTIVE,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": get_user_id(current_user)
    }
    
    await db.social_accounts.insert_one(account)
    
    # Return without sensitive data
    account.pop("access_token_encrypted")
    account.pop("refresh_token_encrypted", None)
    account["capabilities"] = get_capabilities(data.platform, data.account_type)
    
    return account

@router.delete("/accounts/{account_id}")
async def delete_social_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Disconnect a social account"""
    # Remove from all entities
    await db.entity_social_accounts.delete_many({"social_account_id": account_id})
    
    # Delete account
    result = await db.social_accounts.delete_one({"id": account_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"message": "Account disconnected"}

# ==================== ENTITY-ACCOUNT LINKS ====================

@router.post("/entities/{entity_id}/accounts/{account_id}")
async def link_account_to_entity(
    entity_id: str, 
    account_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Link a social account to an entity"""
    # Verify entity exists
    entity = await db.social_entities.find_one({"id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Verify account exists
    account = await db.social_accounts.find_one({"id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Check if link already exists
    existing = await db.entity_social_accounts.find_one({
        "entity_id": entity_id,
        "social_account_id": account_id
    })
    
    if existing:
        return {"message": "Link already exists"}
    
    # Create link
    await db.entity_social_accounts.insert_one({
        "id": str(uuid.uuid4()),
        "entity_id": entity_id,
        "social_account_id": account_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Account linked to entity"}

@router.delete("/entities/{entity_id}/accounts/{account_id}")
async def unlink_account_from_entity(
    entity_id: str, 
    account_id: str, 
    current_user: dict = Depends(get_current_user)
):
    """Unlink a social account from an entity"""
    result = await db.entity_social_accounts.delete_one({
        "entity_id": entity_id,
        "social_account_id": account_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {"message": "Account unlinked from entity"}

# ==================== CAPABILITIES ENDPOINT ====================

@router.get("/capabilities")
async def get_all_capabilities():
    """Get the full capability matrix for all platforms"""
    return PLATFORM_CAPABILITIES

@router.get("/capabilities/{platform}/{account_type}")
async def get_platform_capabilities(platform: str, account_type: str):
    """Get capabilities for a specific platform and account type"""
    caps = get_capabilities(platform, account_type)
    if not caps:
        raise HTTPException(status_code=404, detail="Platform/account type not found")
    return caps

# ==================== POSTS ENDPOINTS ====================

@router.get("/posts")
async def get_posts(
    entity_id: Optional[str] = None,
    account_id: Optional[str] = None,
    status: Optional[str] = None,
    post_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get posts with filters"""
    query = {"workspace_id": get_workspace_id(current_user)}
    
    if entity_id:
        query["entity_id"] = entity_id
    if account_id:
        query["account_ids"] = account_id
    if status:
        query["status"] = status
    if post_type:
        query["post_type"] = post_type
    if start_date:
        query["scheduled_at"] = {"$gte": start_date}
    if end_date:
        if "scheduled_at" in query:
            query["scheduled_at"]["$lte"] = end_date
        else:
            query["scheduled_at"] = {"$lte": end_date}
    
    posts = await db.social_posts.find(
        query, 
        {"_id": 0}
    ).sort("scheduled_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.social_posts.count_documents(query)
    
    return {
        "posts": posts,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.post("/posts")
async def create_post(data: SocialPostCreate, current_user: dict = Depends(get_current_user)):
    """Create a new social media post"""
    # Validate entity
    entity = await db.social_entities.find_one({"id": data.entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Validate accounts belong to entity
    for acc_id in data.account_ids:
        link = await db.entity_social_accounts.find_one({
            "entity_id": data.entity_id,
            "social_account_id": acc_id
        })
        if not link:
            raise HTTPException(
                status_code=400, 
                detail=f"Account {acc_id} is not linked to entity {data.entity_id}"
            )
    
    post_id = str(uuid.uuid4())
    
    # Determine status
    if data.is_draft:
        status = PostStatus.DRAFT
    elif data.scheduled_at:
        status = PostStatus.SCHEDULED
    else:
        status = PostStatus.DRAFT  # Must schedule or publish explicitly
    
    post = {
        "id": post_id,
        "workspace_id": get_workspace_id(current_user),
        "entity_id": data.entity_id,
        "account_ids": data.account_ids,
        "post_type": data.post_type,
        "content": data.content,
        "media_urls": data.media_urls,
        "link_url": data.link_url,
        "hashtags": data.hashtags,
        "location": data.location,
        "scheduled_at": data.scheduled_at,
        "status": status,
        "platform_variations": data.platform_variations,
        "publish_results": {},  # Will store result per account
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": get_user_id(current_user)
    }
    
    await db.social_posts.insert_one(post)
    return post

@router.put("/posts/{post_id}")
async def update_post(
    post_id: str, 
    data: SocialPostUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update a post"""
    post = await db.social_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Can only update draft or scheduled posts
    if post["status"] not in [PostStatus.DRAFT, PostStatus.SCHEDULED]:
        raise HTTPException(status_code=400, detail="Cannot update published or failed posts")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    # Update status based on changes
    if "is_draft" in update_data:
        if update_data["is_draft"]:
            update_data["status"] = PostStatus.DRAFT
        elif update_data.get("scheduled_at") or post.get("scheduled_at"):
            update_data["status"] = PostStatus.SCHEDULED
        update_data.pop("is_draft")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.social_posts.update_one({"id": post_id}, {"$set": update_data})
    
    updated = await db.social_posts.find_one({"id": post_id}, {"_id": 0})
    return updated

@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a post"""
    result = await db.social_posts.delete_one({"id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post deleted"}

# ==================== POST TEMPLATES ====================

@router.get("/templates")
async def get_templates(
    entity_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get post templates"""
    query = {"workspace_id": get_workspace_id(current_user)}
    if entity_id:
        query["entity_id"] = entity_id
    
    templates = await db.social_templates.find(query, {"_id": 0}).to_list(100)
    return templates

@router.post("/templates")
async def create_template(data: PostTemplateCreate, current_user: dict = Depends(get_current_user)):
    """Create a post template"""
    template_id = str(uuid.uuid4())
    template = {
        "id": template_id,
        "workspace_id": get_workspace_id(current_user),
        "entity_id": data.entity_id,
        "name": data.name,
        "content": data.content,
        "hashtags": data.hashtags,
        "media_urls": data.media_urls,
        "platforms": data.platforms,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": get_user_id(current_user)
    }
    
    await db.social_templates.insert_one(template)
    return template

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a template"""
    result = await db.social_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# ==================== QUEUE ENDPOINTS ====================

@router.get("/queue")
async def get_queue(
    entity_id: Optional[str] = None,
    status: str = "scheduled",
    current_user: dict = Depends(get_current_user)
):
    """Get posts queue (scheduled, drafts, failed, published)"""
    query = {
        "workspace_id": get_workspace_id(current_user),
        "status": status
    }
    
    if entity_id:
        query["entity_id"] = entity_id
    
    sort_order = 1 if status == "scheduled" else -1  # Ascending for scheduled, descending for others
    
    posts = await db.social_posts.find(
        query, 
        {"_id": 0}
    ).sort("scheduled_at", sort_order).to_list(200)
    
    return posts

# ==================== CALENDAR VIEW ====================

@router.get("/calendar")
async def get_calendar_posts(
    entity_id: Optional[str] = None,
    account_ids: Optional[str] = None,  # Comma-separated
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Get posts for calendar view"""
    query = {
        "workspace_id": get_workspace_id(current_user),
        "scheduled_at": {"$gte": start_date, "$lte": end_date}
    }
    
    if entity_id:
        query["entity_id"] = entity_id
    
    if account_ids:
        acc_list = [a.strip() for a in account_ids.split(",")]
        query["account_ids"] = {"$in": acc_list}
    
    posts = await db.social_posts.find(query, {"_id": 0}).to_list(500)
    
    # Group by date
    calendar_data = {}
    for post in posts:
        date = post.get("scheduled_at", "")[:10]  # Get just the date part
        if date not in calendar_data:
            calendar_data[date] = []
        calendar_data[date].append(post)
    
    return calendar_data

# ==================== STATS / REPORTS ====================

@router.get("/stats/overview")
async def get_stats_overview(
    entity_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get overview statistics"""
    query = {"workspace_id": get_workspace_id(current_user)}
    
    if entity_id:
        query["entity_id"] = entity_id
    
    # Posts stats
    posts_query = query.copy()
    if start_date:
        posts_query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in posts_query:
            posts_query["created_at"]["$lte"] = end_date
        else:
            posts_query["created_at"] = {"$lte": end_date}
    
    total_posts = await db.social_posts.count_documents(posts_query)
    
    # By status
    published = await db.social_posts.count_documents({**posts_query, "status": "published"})
    scheduled = await db.social_posts.count_documents({**posts_query, "status": "scheduled"})
    drafts = await db.social_posts.count_documents({**posts_query, "status": "draft"})
    failed = await db.social_posts.count_documents({**posts_query, "status": "failed"})
    
    # Entities count
    entities_count = await db.social_entities.count_documents(
        {"workspace_id": get_workspace_id(current_user)}
    )
    
    # Accounts count
    accounts_count = await db.social_accounts.count_documents(
        {"workspace_id": get_workspace_id(current_user), "status": "active"}
    )
    
    return {
        "total_posts": total_posts,
        "published": published,
        "scheduled": scheduled,
        "drafts": drafts,
        "failed": failed,
        "entities_count": entities_count,
        "accounts_count": accounts_count,
        "period": {"start_date": start_date, "end_date": end_date}
    }

@router.get("/stats/per-entity")
async def get_stats_per_entity(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics grouped by entity"""
    entities = await db.social_entities.find(
        {"workspace_id": get_workspace_id(current_user)},
        {"_id": 0}
    ).to_list(100)
    
    stats = []
    for entity in entities:
        query = {"entity_id": entity["id"]}
        if start_date:
            query["created_at"] = {"$gte": start_date}
        if end_date:
            if "created_at" in query:
                query["created_at"]["$lte"] = end_date
            else:
                query["created_at"] = {"$lte": end_date}
        
        total = await db.social_posts.count_documents(query)
        published = await db.social_posts.count_documents({**query, "status": "published"})
        
        stats.append({
            "entity_id": entity["id"],
            "entity_name": entity["name"],
            "entity_color": entity.get("color", "#6366f1"),
            "total_posts": total,
            "published_posts": published
        })
    
    return stats

# ==================== SEED INITIAL ENTITIES ====================

@router.post("/seed-entities")
async def seed_initial_entities(current_user: dict = Depends(get_current_user)):
    """Seed initial entities - run once"""
    workspace_id = get_workspace_id(current_user)
    user_id = current_user.get("id", get_user_id(current_user))
    
    # Check if entities already exist
    existing = await db.social_entities.count_documents({"workspace_id": workspace_id})
    if existing > 0:
        return {"message": f"{existing} entities already exist", "seeded": False}
    
    initial_entities = [
        {"name": "West Witch", "color": "#8B5CF6", "description": "West Witch brand"},
        {"name": "Alpha Agency", "color": "#6366F1", "description": "Alpha Agency main"},
        {"name": "Antilla", "color": "#10B981", "description": "Antilla brand"}
    ]
    
    created = []
    for entity_data in initial_entities:
        entity_id = str(uuid.uuid4())
        entity = {
            "id": entity_id,
            "workspace_id": workspace_id,
            "name": entity_data["name"],
            "color": entity_data["color"],
            "description": entity_data["description"],
            "logo_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user_id
        }
        await db.social_entities.insert_one(entity)
        created.append(entity)
    
    return {"message": f"Created {len(created)} entities", "entities": created, "seeded": True}
