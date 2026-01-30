"""
Meta (Facebook/Instagram) Integration Module - REFACTORED
Handles OAuth, Publishing, and Inbox synchronization

CRITICAL: This module uses Page Access Tokens for all operations.
Never use User Access Tokens for publishing or inbox access.

Page Access Tokens are obtained via the /me/accounts endpoint after OAuth.
They don't expire when derived from a long-lived user token.
"""

import os
import uuid
import httpx
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from pydantic import BaseModel

from .database import db, get_current_user
from .token_encryption import encrypt_token, decrypt_token

# Setup logging
logger = logging.getLogger("meta_integration")

# Meta API Configuration
META_API_VERSION = "v20.0"
META_APP_ID = os.environ.get("META_APP_ID", "")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "")
META_WEBHOOK_VERIFY_TOKEN = os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "alphagency_webhook_token")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://alphagency.fr")

router = APIRouter()

# ==================== MODELS ====================

class MetaOAuthCallback(BaseModel):
    code: str
    redirect_uri: str
    state: Optional[str] = None

class PublishPostRequest(BaseModel):
    page_id: str
    content: str
    media_urls: Optional[List[str]] = None
    link: Optional[str] = None

class InstagramPublishRequest(BaseModel):
    ig_business_id: str
    page_id: str  # Need page_id for the page access token
    caption: str
    image_url: str  # Instagram requires media

# Legacy models for backward compatibility
class MetaTokenExchange(BaseModel):
    code: str
    redirect_uri: str

class MetaPublishPost(BaseModel):
    page_id: str
    content: str
    media_urls: Optional[List[str]] = []
    link_url: Optional[str] = None
    scheduled_at: Optional[str] = None

class InstagramPublishPost(BaseModel):
    ig_account_id: str
    caption: str
    image_url: str
    location_id: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def get_user_id(current_user: dict) -> str:
    """Extract user_id from current_user dict"""
    return current_user.get("user_id") or current_user.get("id") or current_user.get("sub")

async def get_page_access_token(page_id: str, user_id: str) -> Optional[str]:
    """
    Get the Page Access Token for a specific page.
    This is the CORRECT token to use for publishing and inbox access.
    """
    # First, check meta_pages collection (new architecture)
    account = await db.meta_pages.find_one({
        "page_id": page_id,
        "user_id": user_id,
        "is_active": True
    })
    
    if account:
        # Check if token is expired
        expires_at = account.get("token_expires_at")
        if expires_at:
            try:
                exp_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if exp_dt < datetime.now(timezone.utc):
                    logger.warning(f"Page token expired for page_id={page_id}")
                    await db.meta_pages.update_one(
                        {"page_id": page_id, "user_id": user_id},
                        {"$set": {"status": "token_expired"}}
                    )
                    return None
            except Exception as e:
                logger.error(f"Error parsing token expiry: {e}")
        
        # Decrypt and return the page access token
        encrypted_token = account.get("page_access_token_encrypted")
        if encrypted_token:
            token = decrypt_token(encrypted_token)
            if token:
                return token
        
        # Fallback to plain token
        return account.get("page_access_token")
    
    # Fallback: check social_accounts collection for backward compatibility
    social_account = await db.social_accounts.find_one({
        "$or": [
            {"external_id": page_id, "user_id": user_id},
            {"meta_page_id": page_id, "user_id": user_id}
        ],
        "is_active": True
    })
    
    if social_account:
        encrypted_token = social_account.get("access_token_encrypted")
        if encrypted_token:
            token = decrypt_token(encrypted_token)
            if token:
                return token
        return social_account.get("access_token")
    
    logger.warning(f"No page found for page_id={page_id}, user_id={user_id}")
    return None

async def get_instagram_account(page_id: str, user_id: str) -> Optional[Dict]:
    """
    Get Instagram Business Account info linked to a Facebook Page.
    """
    page = await db.meta_pages.find_one({
        "page_id": page_id,
        "user_id": user_id,
        "is_active": True
    })
    
    if not page:
        return None
    
    ig_id = page.get("instagram_business_id")
    if not ig_id:
        return None
    
    return {
        "ig_business_id": ig_id,
        "ig_username": page.get("instagram_username"),
        "page_id": page_id,
        "page_name": page.get("page_name")
    }

# ==================== OAUTH ENDPOINTS ====================

@router.get("/auth-url", response_model=dict)
async def get_meta_auth_url(
    redirect_uri: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate Meta OAuth URL.
    Requests comprehensive permissions for publishing AND inbox.
    """
    if not META_APP_ID:
        raise HTTPException(status_code=503, detail="Meta App ID non configuré")
    
    if not redirect_uri:
        redirect_uri = f"{FRONTEND_URL}/admin/social-media?meta_callback=true"
    
    # Scopes for publishing - messaging scopes require App Review approval
    # Basic scopes that work without special approval:
    scopes = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "pages_manage_metadata",
        # "pages_messaging",  # Requires App Review - uncomment after approval
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_comments",
        # "instagram_manage_messages",  # Requires App Review - uncomment after approval
        "business_management"
    ]
    
    state = str(uuid.uuid4())
    user_id = get_user_id(current_user)
    
    # Store state for validation
    await db.meta_oauth_states.insert_one({
        "state": state,
        "user_id": user_id,
        "redirect_uri": redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    auth_url = (
        f"https://www.facebook.com/{META_API_VERSION}/dialog/oauth?"
        f"client_id={META_APP_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={','.join(scopes)}&"
        f"state={state}&"
        f"response_type=code"
    )
    
    return {"auth_url": auth_url, "state": state}


@router.post("/exchange-token", response_model=dict)
async def exchange_meta_token(data: MetaTokenExchange, current_user: dict = Depends(get_current_user)):
    """
    Exchange authorization code for tokens.
    
    CRITICAL FLOW:
    1. Exchange code for short-lived User Access Token
    2. Exchange for Long-Lived User Access Token (60 days)
    3. Fetch all Pages with their PAGE Access Tokens
    4. For each Page, get Instagram Business Account if linked
    5. Store PAGE Access Tokens (NOT user token) for publishing/inbox
    """
    if not META_APP_ID or not META_APP_SECRET:
        raise HTTPException(status_code=503, detail="Configuration Meta incomplète")
    
    user_id = get_user_id(current_user)
    
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        # Step 1: Exchange code for short-lived token
        logger.info("Exchanging code for short-lived token...")
        token_response = await http_client.get(
            f"https://graph.facebook.com/{META_API_VERSION}/oauth/access_token",
            params={
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "redirect_uri": data.redirect_uri,
                "code": data.code
            }
        )
        
        if token_response.status_code != 200:
            error_data = token_response.json()
            error_msg = error_data.get("error", {}).get("message", "Token exchange failed")
            logger.error(f"Token exchange failed: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Erreur Meta: {error_msg}")
        
        token_data = token_response.json()
        short_lived_token = token_data.get("access_token")
        
        # Step 2: Exchange for long-lived token
        logger.info("Exchanging for long-lived token...")
        long_token_response = await http_client.get(
            f"https://graph.facebook.com/{META_API_VERSION}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "fb_exchange_token": short_lived_token
            }
        )
        
        if long_token_response.status_code == 200:
            long_token_data = long_token_response.json()
            user_access_token = long_token_data.get("access_token", short_lived_token)
            token_expires_in = long_token_data.get("expires_in", 5184000)  # Default 60 days
        else:
            user_access_token = short_lived_token
            token_expires_in = 3600
        
        # Step 3: Get user info
        logger.info("Fetching user info...")
        me_response = await http_client.get(
            f"https://graph.facebook.com/{META_API_VERSION}/me",
            params={
                "fields": "id,name,email",
                "access_token": user_access_token
            }
        )
        
        me_data = me_response.json() if me_response.status_code == 200 else {"id": "unknown", "name": "Unknown"}
        meta_user_id = me_data.get("id")
        meta_user_name = me_data.get("name")
        
        # Step 4: Fetch all Pages WITH their Page Access Tokens
        # CRITICAL: Each page has its own access_token field!
        logger.info("Fetching pages with Page Access Tokens...")
        pages_response = await http_client.get(
            f"https://graph.facebook.com/{META_API_VERSION}/me/accounts",
            params={
                "fields": "id,name,category,access_token,picture{url},instagram_business_account{id,username,profile_picture_url,followers_count}",
                "access_token": user_access_token
            }
        )
        
        if pages_response.status_code != 200:
            error_data = pages_response.json()
            logger.error(f"Failed to fetch pages: {error_data}")
            raise HTTPException(status_code=400, detail="Impossible de récupérer vos Pages Facebook")
        
        pages_data = pages_response.json().get("data", [])
        
        if not pages_data:
            logger.warning("No Facebook Pages found for this user")
        
        # Step 5: Store each Page with its Page Access Token
        synced_pages = []
        synced_instagram = []
        
        for page in pages_data:
            page_id = page.get("id")
            page_name = page.get("name")
            page_access_token = page.get("access_token")  # THIS is the Page Access Token!
            category = page.get("category", "")
            picture_url = page.get("picture", {}).get("url")
            
            # Page tokens from long-lived user tokens don't expire
            token_expires_at = (datetime.now(timezone.utc) + timedelta(days=60)).isoformat()
            
            # Get Instagram Business Account if linked
            ig_business = page.get("instagram_business_account")
            ig_business_id = None
            ig_username = None
            ig_profile_pic = None
            ig_followers = 0
            
            if ig_business:
                ig_business_id = ig_business.get("id")
                ig_username = ig_business.get("username")
                ig_profile_pic = ig_business.get("profile_picture_url")
                ig_followers = ig_business.get("followers_count", 0)
            
            # Store/Update Page in meta_pages collection
            page_doc = {
                "page_id": page_id,
                "user_id": user_id,
                "meta_user_id": meta_user_id,
                "page_name": page_name,
                "category": category,
                "picture_url": picture_url,
                "page_access_token_encrypted": encrypt_token(page_access_token),
                "token_expires_at": token_expires_at,
                "instagram_business_id": ig_business_id,
                "instagram_username": ig_username,
                "instagram_profile_picture": ig_profile_pic,
                "instagram_followers": ig_followers,
                "is_active": True,
                "status": "ready",
                "permissions": {
                    "can_publish": True,
                    "can_read_inbox": True,
                    "can_publish_instagram": ig_business_id is not None
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Upsert page
            await db.meta_pages.update_one(
                {"page_id": page_id, "user_id": user_id},
                {"$set": page_doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True
            )
            
            synced_pages.append({
                "page_id": page_id,
                "page_name": page_name,
                "category": category,
                "has_instagram": ig_business_id is not None
            })
            
            # ALSO sync to social_accounts for backward compatibility with existing frontend
            account_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "platform": "facebook",
                "account_type": "page",
                "external_id": page_id,
                "display_name": page_name,
                "username": page_name,
                "profile_picture_url": picture_url,
                "access_token_encrypted": encrypt_token(page_access_token),
                "token_expires_at": token_expires_at,
                "status": "active",
                "is_active": True,
                "meta_page_id": page_id,
                "capabilities": {
                    "can_publish": True,
                    "can_schedule": True,
                    "can_read_inbox": True
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Check if exists
            existing = await db.social_accounts.find_one({
                "user_id": user_id,
                "platform": "facebook",
                "external_id": page_id
            })
            
            if existing:
                await db.social_accounts.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {
                        "access_token_encrypted": encrypt_token(page_access_token),
                        "token_expires_at": token_expires_at,
                        "status": "active",
                        "is_active": True,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            else:
                account_doc["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.social_accounts.insert_one(account_doc)
            
            # If Instagram is linked, also create Instagram account
            if ig_business_id:
                ig_account_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "platform": "instagram",
                    "account_type": "instagram_business",
                    "external_id": ig_business_id,
                    "display_name": ig_username or f"Instagram ({page_name})",
                    "username": ig_username,
                    "profile_picture_url": ig_profile_pic,
                    "access_token_encrypted": encrypt_token(page_access_token),  # Uses Page token!
                    "token_expires_at": token_expires_at,
                    "status": "active",
                    "is_active": True,
                    "linked_facebook_page_id": page_id,
                    "meta_page_id": page_id,
                    "capabilities": {
                        "can_publish": True,
                        "can_schedule": True,
                        "requires_media": True,
                        "can_read_inbox": True
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                existing_ig = await db.social_accounts.find_one({
                    "user_id": user_id,
                    "platform": "instagram",
                    "external_id": ig_business_id
                })
                
                if existing_ig:
                    await db.social_accounts.update_one(
                        {"_id": existing_ig["_id"]},
                        {"$set": {
                            "access_token_encrypted": encrypt_token(page_access_token),
                            "token_expires_at": token_expires_at,
                            "linked_facebook_page_id": page_id,
                            "status": "active",
                            "is_active": True,
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                else:
                    ig_account_doc["created_at"] = datetime.now(timezone.utc).isoformat()
                    await db.social_accounts.insert_one(ig_account_doc)
                
                synced_instagram.append({
                    "ig_business_id": ig_business_id,
                    "username": ig_username,
                    "linked_page": page_name
                })
        
        # Also store/update the parent Meta account for reference
        meta_account = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "platform": "meta",
            "meta_user_id": meta_user_id,
            "account_name": meta_user_name,
            "display_name": meta_user_name,
            "is_active": True,
            "pages": synced_pages,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.social_accounts.update_one(
            {"user_id": user_id, "platform": "meta"},
            {"$set": meta_account},
            upsert=True
        )
        
        logger.info(f"Synced {len(synced_pages)} pages and {len(synced_instagram)} Instagram accounts")
        
        return {
            "success": True,
            "message": f"Connecté {len(synced_pages)} Page(s) Facebook et {len(synced_instagram)} compte(s) Instagram",
            "user": {
                "id": meta_user_id,
                "name": meta_user_name
            },
            "pages": synced_pages,
            "instagram_accounts": synced_instagram,
            "expires_in_days": token_expires_in // 86400
        }


# ==================== PAGES LISTING ====================

@router.get("/pages", response_model=List[dict])
async def get_meta_pages(current_user: dict = Depends(get_current_user)):
    """
    Get all connected Facebook Pages with their status.
    """
    user_id = get_user_id(current_user)
    
    # Try new meta_pages collection first
    pages = await db.meta_pages.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0, "page_access_token_encrypted": 0}
    ).to_list(100)
    
    if pages:
        result = []
        for page in pages:
            # Check token validity
            token_status = "valid"
            expires_at = page.get("token_expires_at")
            if expires_at:
                try:
                    exp_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    if exp_dt < datetime.now(timezone.utc):
                        token_status = "expired"
                    elif exp_dt < datetime.now(timezone.utc) + timedelta(days=7):
                        token_status = "expiring_soon"
                except Exception:
                    pass
            
            result.append({
                "page_id": page.get("page_id"),
                "page_name": page.get("page_name"),
                "category": page.get("category"),
                "picture_url": page.get("picture_url"),
                "access_token": "[ENCRYPTED]",  # Never expose
                "token_status": token_status,
                "has_instagram": page.get("instagram_business_id") is not None,
                "instagram_id": page.get("instagram_business_id"),
                "instagram_username": page.get("instagram_username"),
                "permissions": page.get("permissions", {}),
                "status": page.get("status", "unknown")
            })
        return result
    
    # Fallback: check legacy meta account
    meta_account = await db.social_accounts.find_one({
        "user_id": user_id,
        "platform": "meta",
        "is_active": True
    })
    
    if not meta_account:
        raise HTTPException(status_code=404, detail="Aucun compte Meta connecté")
    
    return meta_account.get("pages", [])


# ==================== PUBLISHING - FACEBOOK ====================

@router.post("/publish/facebook", response_model=dict)
async def publish_to_facebook(
    post: MetaPublishPost,
    current_user: dict = Depends(get_current_user)
):
    """
    Publish content to a Facebook Page.
    Uses Page Access Token (NOT user token).
    """
    user_id = get_user_id(current_user)
    page_id = post.page_id
    
    # Get the Page Access Token
    page_token = await get_page_access_token(page_id, user_id)
    
    if not page_token:
        raise HTTPException(
            status_code=400, 
            detail="Token de page invalide. Veuillez reconnecter votre Page Facebook."
        )
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        try:
            if post.media_urls and len(post.media_urls) > 0:
                # Post with photo
                response = await http_client.post(
                    f"https://graph.facebook.com/{META_API_VERSION}/{page_id}/photos",
                    params={
                        "url": post.media_urls[0],
                        "message": post.content,
                        "access_token": page_token
                    }
                )
            elif post.link_url:
                # Post with link
                response = await http_client.post(
                    f"https://graph.facebook.com/{META_API_VERSION}/{page_id}/feed",
                    params={
                        "message": post.content,
                        "link": post.link_url,
                        "access_token": page_token
                    }
                )
            else:
                # Text-only post
                response = await http_client.post(
                    f"https://graph.facebook.com/{META_API_VERSION}/{page_id}/feed",
                    params={
                        "message": post.content,
                        "access_token": page_token
                    }
                )
            
            if response.status_code != 200:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", "Publication échouée")
                logger.error(f"Facebook publish error: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Erreur Facebook: {error_msg}")
            
            result = response.json()
            post_id = result.get("id") or result.get("post_id")
            
            # Get page name
            page = await db.meta_pages.find_one({"page_id": page_id, "user_id": user_id})
            page_name = page.get("page_name") if page else "Facebook Page"
            
            # Store in published_posts
            published_post = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "platform": "facebook",
                "platform_post_id": post_id,
                "page_id": page_id,
                "page_name": page_name,
                "content": post.content,
                "media_urls": post.media_urls or [],
                "status": "published",
                "published_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.published_posts.insert_one(published_post)
            
            logger.info(f"Published to Facebook page {page_id}: post_id={post_id}")
            
            return {
                "success": True,
                "message": "Post publié sur Facebook avec succès",
                "platform": "facebook",
                "post_id": post_id,
                "url": f"https://facebook.com/{post_id}" if post_id else None
            }
            
        except httpx.RequestError as e:
            logger.error(f"Network error publishing to Facebook: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur réseau: {str(e)}")


# ==================== PUBLISHING - INSTAGRAM ====================

@router.post("/publish/instagram", response_model=dict)
async def publish_to_instagram(
    post: InstagramPublishPost,
    current_user: dict = Depends(get_current_user)
):
    """
    Publish content to Instagram Business Account.
    Uses Page Access Token (NOT user token).
    
    IMPORTANT: Instagram ALWAYS requires an image or video.
    """
    user_id = get_user_id(current_user)
    
    if not post.image_url:
        raise HTTPException(
            status_code=400,
            detail="Instagram nécessite une image pour publier"
        )
    
    # Find the page that has this Instagram account
    page = await db.meta_pages.find_one({
        "instagram_business_id": post.ig_account_id,
        "user_id": user_id,
        "is_active": True
    })
    
    if not page:
        # Fallback: check social_accounts
        ig_account = await db.social_accounts.find_one({
            "external_id": post.ig_account_id,
            "user_id": user_id,
            "platform": "instagram"
        })
        if ig_account:
            page_id = ig_account.get("linked_facebook_page_id") or ig_account.get("meta_page_id")
            page = await db.meta_pages.find_one({"page_id": page_id, "user_id": user_id})
    
    if not page:
        raise HTTPException(status_code=404, detail="Compte Instagram non trouvé")
    
    # Get the Page Access Token (used for Instagram API too)
    page_token = await get_page_access_token(page.get("page_id"), user_id)
    
    if not page_token:
        raise HTTPException(
            status_code=400,
            detail="Token de page invalide. Veuillez reconnecter votre compte."
        )
    
    ig_business_id = post.ig_account_id
    
    async with httpx.AsyncClient(timeout=120.0) as http_client:
        try:
            # Step 1: Create media container
            logger.info(f"Creating Instagram media container for {ig_business_id}...")
            container_response = await http_client.post(
                f"https://graph.facebook.com/{META_API_VERSION}/{ig_business_id}/media",
                params={
                    "image_url": post.image_url,
                    "caption": post.caption,
                    "access_token": page_token
                }
            )
            
            if container_response.status_code != 200:
                error_data = container_response.json()
                error_msg = error_data.get("error", {}).get("message", "Création container échouée")
                logger.error(f"Instagram container error: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Erreur Instagram: {error_msg}")
            
            container_id = container_response.json().get("id")
            
            # Step 2: Wait for media processing
            await asyncio.sleep(3)
            
            # Step 3: Publish the container
            logger.info(f"Publishing Instagram container {container_id}...")
            publish_response = await http_client.post(
                f"https://graph.facebook.com/{META_API_VERSION}/{ig_business_id}/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": page_token
                }
            )
            
            if publish_response.status_code != 200:
                error_data = publish_response.json()
                error_msg = error_data.get("error", {}).get("message", "Publication échouée")
                logger.error(f"Instagram publish error: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Erreur Instagram: {error_msg}")
            
            result = publish_response.json()
            media_id = result.get("id")
            
            # Store in published_posts
            published_post = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "platform": "instagram",
                "platform_post_id": media_id,
                "ig_account_id": ig_business_id,
                "caption": post.caption,
                "image_url": post.image_url,
                "status": "published",
                "published_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.published_posts.insert_one(published_post)
            
            logger.info(f"Published to Instagram {ig_business_id}: media_id={media_id}")
            
            return {
                "success": True,
                "message": "Post publié sur Instagram avec succès",
                "platform": "instagram",
                "post_id": media_id,
                "platform_post_id": media_id,
                "url": "https://instagram.com"
            }
            
        except httpx.RequestError as e:
            logger.error(f"Network error publishing to Instagram: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur réseau: {str(e)}")


# ==================== INBOX - SYNC ====================

@router.post("/inbox/sync", response_model=dict)
async def sync_meta_inbox(
    page_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync inbox (messages + comments) from Facebook/Instagram.
    Uses Page Access Token.
    """
    user_id = get_user_id(current_user)
    results = {
        "facebook_messages": 0,
        "instagram_messages": 0,
        "comments": 0,
        "errors": []
    }
    
    # Get all pages for this user (or specific page)
    query = {"user_id": user_id, "is_active": True}
    if page_id:
        query["page_id"] = page_id
    
    pages = await db.meta_pages.find(query).to_list(100)
    
    if not pages:
        # Fallback to social_accounts
        return {"message": "Aucune page Meta connectée", **results}
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        for page in pages:
            p_id = page.get("page_id")
            page_token_encrypted = page.get("page_access_token_encrypted")
            
            if not page_token_encrypted:
                results["errors"].append(f"Pas de token pour {page.get('page_name', p_id)}")
                continue
            
            page_token = decrypt_token(page_token_encrypted)
            if not page_token:
                results["errors"].append(f"Token invalide pour {page.get('page_name', p_id)}")
                continue
            
            # Sync Facebook comments
            try:
                feed_response = await http_client.get(
                    f"https://graph.facebook.com/{META_API_VERSION}/{p_id}/feed",
                    params={
                        "fields": "id,message,comments{id,message,from,created_time}",
                        "limit": 25,
                        "access_token": page_token
                    }
                )
                
                if feed_response.status_code == 200:
                    posts = feed_response.json().get("data", [])
                    for post in posts:
                        post_id = post.get("id")
                        comments = post.get("comments", {}).get("data", [])
                        
                        for comment in comments:
                            comment_id = comment.get("id")
                            
                            existing = await db.meta_inbox.find_one({"external_id": comment_id})
                            if existing:
                                continue
                            
                            commenter = comment.get("from", {})
                            
                            inbox_doc = {
                                "id": str(uuid.uuid4()),
                                "external_id": comment_id,
                                "user_id": user_id,
                                "platform": "facebook",
                                "message_type": "comment",
                                "page_id": p_id,
                                "page_name": page.get("page_name"),
                                "post_id": post_id,
                                "sender_id": commenter.get("id"),
                                "sender_name": commenter.get("name", "Unknown"),
                                "content": comment.get("message", ""),
                                "timestamp": comment.get("created_time"),
                                "status": "unread",
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }
                            
                            await db.meta_inbox.insert_one(inbox_doc)
                            results["comments"] += 1
                else:
                    error = feed_response.json().get("error", {}).get("message", "Erreur inconnue")
                    results["errors"].append(f"Commentaires FB {page.get('page_name', p_id)}: {error}")
                            
            except Exception as e:
                results["errors"].append(f"Erreur commentaires {page.get('page_name', p_id)}: {str(e)}")
    
    return results


@router.get("/inbox", response_model=dict)
async def get_meta_inbox(
    platform: Optional[str] = None,
    message_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get inbox messages/comments"""
    user_id = get_user_id(current_user)
    
    query = {"user_id": user_id}
    if platform:
        query["platform"] = platform
    if message_type:
        query["message_type"] = message_type
    if status:
        query["status"] = status
    
    messages = await db.meta_inbox.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    return {
        "messages": messages,
        "total": len(messages)
    }


# ==================== PUBLISHED POSTS ====================

@router.get("/published-posts", response_model=List[dict])
async def get_published_posts(
    platform: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get list of published posts"""
    query = {"user_id": get_user_id(current_user)}
    if platform:
        query["platform"] = platform
    
    posts = await db.published_posts.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return posts


# ==================== DISCONNECT ====================

@router.delete("/disconnect", response_model=dict)
async def disconnect_meta_account(current_user: dict = Depends(get_current_user)):
    """Disconnect Meta account and all associated pages"""
    user_id = get_user_id(current_user)
    
    # Delete from meta_pages
    await db.meta_pages.delete_many({"user_id": user_id})
    
    # Delete from social_accounts (meta, facebook, instagram)
    await db.social_accounts.delete_many({
        "user_id": user_id,
        "platform": {"$in": ["meta", "facebook", "instagram"]}
    })
    
    return {"message": "Compte Meta déconnecté avec succès"}


# ==================== DIAGNOSTICS ====================

@router.get("/status", response_model=dict)
async def get_meta_status(current_user: dict = Depends(get_current_user)):
    """Get detailed status of Meta integration"""
    user_id = get_user_id(current_user)
    
    # Check meta_pages
    pages = await db.meta_pages.find(
        {"user_id": user_id},
        {"_id": 0, "page_access_token_encrypted": 0}
    ).to_list(100)
    
    # Check social_accounts
    accounts = await db.social_accounts.find(
        {"user_id": user_id, "platform": {"$in": ["meta", "facebook", "instagram"]}},
        {"_id": 0, "access_token_encrypted": 0, "access_token": 0}
    ).to_list(100)
    
    active_pages = [p for p in pages if p.get("is_active")]
    expired_pages = [p for p in pages if p.get("status") == "token_expired"]
    
    return {
        "connected": len(active_pages) > 0,
        "total_pages": len(pages),
        "active_pages": len(active_pages),
        "expired_pages": len(expired_pages),
        "pages": pages,
        "social_accounts": len(accounts),
        "instagram_accounts": len([a for a in accounts if a.get("platform") == "instagram"]),
        "note": "Si les tokens sont expirés, veuillez vous reconnecter via OAuth."
    }


# ==================== WEBHOOKS ====================

@router.get("/webhooks")
async def verify_webhook(request: Request):
    """
    Meta Webhook verification endpoint.
    Called by Meta to verify your webhook URL.
    """
    params = dict(request.query_params)
    
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    if mode == "subscribe" and token == META_WEBHOOK_VERIFY_TOKEN:
        logger.info("Webhook verification successful")
        return int(challenge)
    
    logger.warning(f"Webhook verification failed: mode={mode}, token_match={token == META_WEBHOOK_VERIFY_TOKEN}")
    raise HTTPException(status_code=403, detail="Vérification échouée")


@router.post("/webhooks")
async def handle_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Handle incoming webhook events from Meta.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    object_type = body.get("object")
    logger.info(f"Received webhook: object_type={object_type}")
    
    if object_type == "page":
        # Facebook Page events
        for entry in body.get("entry", []):
            page_id = entry.get("id")
            
            # Feed changes (comments)
            for change in entry.get("changes", []):
                if change.get("field") == "feed":
                    value = change.get("value", {})
                    if value.get("item") == "comment":
                        background_tasks.add_task(
                            process_facebook_comment,
                            page_id=page_id,
                            comment_id=value.get("comment_id"),
                            post_id=value.get("post_id"),
                            sender_id=value.get("from", {}).get("id"),
                            sender_name=value.get("from", {}).get("name"),
                            text=value.get("message", ""),
                            timestamp=value.get("created_time")
                        )
    
    return {"status": "ok"}


async def process_facebook_comment(
    page_id: str,
    comment_id: str,
    post_id: str,
    sender_id: str,
    sender_name: str,
    text: str,
    timestamp: str
):
    """Process incoming Facebook comment from webhook"""
    page = await db.meta_pages.find_one({"page_id": page_id})
    if not page:
        logger.warning(f"Unknown page_id in webhook: {page_id}")
        return
    
    user_id = page.get("user_id")
    
    existing = await db.meta_inbox.find_one({"external_id": comment_id})
    if existing:
        return
    
    inbox_doc = {
        "id": str(uuid.uuid4()),
        "external_id": comment_id,
        "user_id": user_id,
        "platform": "facebook",
        "message_type": "comment",
        "page_id": page_id,
        "page_name": page.get("page_name"),
        "post_id": post_id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "content": text,
        "timestamp": timestamp,
        "status": "unread",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.meta_inbox.insert_one(inbox_doc)
    logger.info(f"Stored Facebook comment {comment_id} from webhook")


# ==================== META SANDBOX MODE ====================
"""
MODE SANDBOX META - Documentation

Ce mode permet de tester les fonctionnalités de messagerie et commentaires
Facebook/Instagram sans toucher aux données réelles des utilisateurs.

ENDPOINTS IMPACTÉS:
- GET /meta/inbox -> Retourne des messages de test
- POST /meta/inbox/{id}/reply -> Simule l'envoi (ne fait rien en réalité)
- GET /meta/comments -> Retourne des commentaires de test

COMPTES TEST UTILISÉS:
- Page Facebook Test: "Alpha Agency Demo" (ID: demo_page_123)
- Compte Instagram Test: @alphagency_demo (ID: demo_ig_123)

SCÉNARIOS DE TEST:
1. Message DM Instagram - Client intéressé par un produit
2. Message Messenger - Demande de devis
3. Commentaire Facebook - Question sur un post
4. Commentaire Instagram - Feedback positif

POUR AJOUTER UN SCÉNARIO:
Modifier la constante SANDBOX_META_DATA ci-dessous et ajouter vos messages/commentaires.
"""

# Données de test pour le mode sandbox Meta
SANDBOX_META_CONVERSATIONS = [
    {
        "id": "sandbox_conv_1",
        "external_id": "sandbox_dm_ig_001",
        "platform": "instagram",
        "message_type": "dm",
        "page_id": "demo_page_123",
        "page_name": "Alpha Agency Demo",
        "sender_id": "user_marie_001",
        "sender_name": "Marie Dupont",
        "sender_profile_pic": "https://ui-avatars.com/api/?name=Marie+Dupont&background=E4405F&color=fff",
        "content": "Bonjour ! Je suis intéressée par vos services de marketing digital. Pouvez-vous me donner plus d'informations sur vos tarifs ?",
        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
        "status": "unread",
        "is_sandbox": True
    },
    {
        "id": "sandbox_conv_2",
        "external_id": "sandbox_dm_fb_001",
        "platform": "facebook",
        "message_type": "dm",
        "page_id": "demo_page_123",
        "page_name": "Alpha Agency Demo",
        "sender_id": "user_thomas_001",
        "sender_name": "Thomas Martin",
        "sender_profile_pic": "https://ui-avatars.com/api/?name=Thomas+Martin&background=1877F2&color=fff",
        "content": "Salut ! J'aimerais obtenir un devis pour la gestion de mes réseaux sociaux. Mon entreprise est dans le secteur de la restauration.",
        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
        "status": "unread",
        "is_sandbox": True
    },
    {
        "id": "sandbox_conv_3",
        "external_id": "sandbox_comment_fb_001",
        "platform": "facebook",
        "message_type": "comment",
        "page_id": "demo_page_123",
        "page_name": "Alpha Agency Demo",
        "post_id": "demo_post_001",
        "sender_id": "user_julie_001",
        "sender_name": "Julie Bernard",
        "sender_profile_pic": "https://ui-avatars.com/api/?name=Julie+Bernard&background=1877F2&color=fff",
        "content": "Super article ! J'ai une question : est-ce que vous proposez aussi des formations en marketing digital ?",
        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        "status": "unread",
        "is_sandbox": True
    },
    {
        "id": "sandbox_conv_4",
        "external_id": "sandbox_comment_ig_001",
        "platform": "instagram",
        "message_type": "comment",
        "page_id": "demo_page_123",
        "page_name": "Alpha Agency Demo",
        "post_id": "demo_post_002",
        "sender_id": "user_alex_001",
        "sender_name": "Alexandre Petit",
        "sender_profile_pic": "https://ui-avatars.com/api/?name=Alexandre+Petit&background=E4405F&color=fff",
        "content": "🔥 Excellent travail ! Vos designs sont vraiment incroyables. Bravo à toute l'équipe !",
        "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),
        "status": "read",
        "is_sandbox": True
    },
    {
        "id": "sandbox_conv_5",
        "external_id": "sandbox_dm_ig_002",
        "platform": "instagram",
        "message_type": "dm",
        "page_id": "demo_page_123",
        "page_name": "Alpha Agency Demo",
        "sender_id": "user_sophie_001",
        "sender_name": "Sophie Leroy",
        "sender_profile_pic": "https://ui-avatars.com/api/?name=Sophie+Leroy&background=C13584&color=fff",
        "content": "Bonjour ! J'ai vu votre portfolio et je suis impressionnée. Je cherche une agence pour gérer ma marque de cosmétiques bio. Disponibles pour un appel cette semaine ?",
        "timestamp": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "status": "unread",
        "is_sandbox": True
    }
]

# Variable globale pour le mode sandbox (par utilisateur en production, ici simplifié)
META_SANDBOX_USERS = set()

@router.get("/sandbox-status", response_model=dict)
async def get_meta_sandbox_status(current_user: dict = Depends(get_current_user)):
    """
    Vérifie si le mode sandbox Meta est activé pour l'utilisateur.
    """
    user_id = get_user_id(current_user)
    is_sandbox = user_id in META_SANDBOX_USERS
    
    # Also check database for persistence
    user_settings = await db.user_settings.find_one({"user_id": user_id})
    if user_settings:
        is_sandbox = user_settings.get("meta_sandbox_mode", False)
    
    return {
        "sandbox_mode": is_sandbox,
        "message": "Mode sandbox Meta " + ("activé" if is_sandbox else "désactivé")
    }

@router.post("/sandbox-toggle", response_model=dict)
async def toggle_meta_sandbox(current_user: dict = Depends(get_current_user)):
    """
    Active ou désactive le mode sandbox Meta pour l'utilisateur.
    
    Quand activé:
    - Les endpoints inbox retournent des données de test
    - Les réponses aux messages sont simulées (non envoyées)
    - Aucune donnée réelle n'est touchée
    """
    user_id = get_user_id(current_user)
    
    # Toggle in database for persistence
    user_settings = await db.user_settings.find_one({"user_id": user_id})
    current_status = False
    
    if user_settings:
        current_status = user_settings.get("meta_sandbox_mode", False)
    
    new_status = not current_status
    
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": {"meta_sandbox_mode": new_status}},
        upsert=True
    )
    
    # Update in-memory set
    if new_status:
        META_SANDBOX_USERS.add(user_id)
    else:
        META_SANDBOX_USERS.discard(user_id)
    
    logger.info(f"Meta sandbox mode {'enabled' if new_status else 'disabled'} for user {user_id}")
    
    return {
        "sandbox_mode": new_status,
        "message": "Mode sandbox Meta " + ("activé" if new_status else "désactivé")
    }

@router.get("/sandbox-inbox", response_model=dict)
async def get_sandbox_inbox(current_user: dict = Depends(get_current_user)):
    """
    Retourne les conversations sandbox Meta (messages DM + commentaires).
    Utilisé quand le mode sandbox est activé.
    """
    # Return sandbox test data
    return {
        "conversations": SANDBOX_META_CONVERSATIONS,
        "total": len(SANDBOX_META_CONVERSATIONS),
        "unread": sum(1 for c in SANDBOX_META_CONVERSATIONS if c.get("status") == "unread"),
        "is_sandbox": True
    }

@router.post("/sandbox-reply/{conversation_id}", response_model=dict)
async def send_sandbox_reply(
    conversation_id: str,
    reply: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Simule l'envoi d'une réponse en mode sandbox.
    Ne fait rien de réel - juste pour tester l'interface.
    """
    user_id = get_user_id(current_user)
    message = reply.get("message", "")
    
    logger.info(f"[SANDBOX] User {user_id} sent reply to {conversation_id}: {message[:50]}...")
    
    # Find the conversation in sandbox data
    conversation = next((c for c in SANDBOX_META_CONVERSATIONS if c["id"] == conversation_id), None)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation sandbox non trouvée")
    
    # Simulate response
    return {
        "success": True,
        "message": "Réponse simulée envoyée (mode sandbox)",
        "conversation_id": conversation_id,
        "reply_content": message,
        "is_sandbox": True
    }

async def is_meta_sandbox_enabled(user_id: str) -> bool:
    """
    Vérifie si le mode sandbox Meta est activé pour un utilisateur.
    """
    if user_id in META_SANDBOX_USERS:
        return True
    
    user_settings = await db.user_settings.find_one({"user_id": user_id})
    if user_settings and user_settings.get("meta_sandbox_mode", False):
        META_SANDBOX_USERS.add(user_id)
        return True
    
    return False

