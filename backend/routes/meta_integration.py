"""
Meta (Facebook/Instagram) Integration Module
Handles OAuth, Publishing, and Inbox synchronization

IMPORTANT: This module uses Page Access Tokens for all operations.
Never use User Access Tokens for publishing or inbox access.
"""

import os
import uuid
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from routes.token_encryption import encrypt_token, decrypt_token

# Setup logging
logger = logging.getLogger("meta_integration")

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Meta API Configuration
META_API_VERSION = "v20.0"
META_APP_ID = os.environ.get("META_APP_ID", "859300267084667")
META_APP_SECRET = os.environ.get("META_APP_SECRET", "d0bd4996ef6e94324c9c9c938391ecde")
META_WEBHOOK_VERIFY_TOKEN = os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "alphagency_webhook_token")

router = APIRouter(prefix="/meta", tags=["Meta Integration"])

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

# ==================== HELPER FUNCTIONS ====================

def get_user_id(current_user: dict) -> str:
    """Extract user_id from current_user dict"""
    return current_user.get("user_id") or current_user.get("id") or current_user.get("sub")

async def get_page_access_token(page_id: str, user_id: str) -> Optional[str]:
    """
    Get the Page Access Token for a specific page.
    This is the CORRECT token to use for publishing and inbox access.
    """
    account = await db.meta_pages.find_one({
        "page_id": page_id,
        "user_id": user_id,
        "is_active": True
    })
    
    if not account:
        logger.warning(f"No page found for page_id={page_id}, user_id={user_id}")
        return None
    
    # Check if token is expired
    expires_at = account.get("token_expires_at")
    if expires_at:
        try:
            exp_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if exp_dt < datetime.now(timezone.utc):
                logger.warning(f"Page token expired for page_id={page_id}")
                # Mark as needing refresh
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
    
    # Fallback to plain token (shouldn't happen in production)
    return account.get("page_access_token")

async def get_instagram_account(page_id: str, user_id: str) -> Optional[Dict]:
    """
    Get Instagram Business Account info linked to a Facebook Page.
    Returns ig_business_id and uses the page's access token.
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

@router.get("/auth-url")
async def get_meta_auth_url(
    redirect_uri: Optional[str] = None,
    current_user: dict = Depends(lambda: {"user_id": "test"})  # Will be replaced with actual dependency
):
    """
    Generate Meta OAuth URL.
    Requests permissions for:
    - pages_manage_posts: Publish to Facebook Pages
    - pages_read_engagement: Read comments/messages
    - instagram_basic: Basic Instagram access
    - instagram_content_publish: Publish to Instagram
    - instagram_manage_comments: Read/reply to comments
    - instagram_manage_messages: Access Instagram DMs
    - pages_messaging: Access Facebook Messenger
    """
    if not redirect_uri:
        frontend_url = os.environ.get('FRONTEND_URL', 'https://alphagency.fr')
        redirect_uri = f"{frontend_url}/admin/social-media?meta_callback=true"
    
    # Comprehensive scopes for publishing AND inbox
    scopes = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "pages_manage_metadata",
        "pages_messaging",
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "business_management"
    ]
    
    state = str(uuid.uuid4())
    
    # Store state for validation
    await db.meta_oauth_states.insert_one({
        "state": state,
        "user_id": get_user_id(current_user),
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


@router.post("/exchange-token")
async def exchange_meta_token(data: MetaOAuthCallback, current_user: dict = Depends(lambda: {"user_id": "test"})):
    """
    Exchange authorization code for tokens.
    
    Flow:
    1. Exchange code for short-lived User Access Token
    2. Exchange for Long-Lived User Access Token (60 days)
    3. Fetch all Pages with their Page Access Tokens
    4. For each Page, get Instagram Business Account if linked
    5. Store Page Access Tokens (NOT user token) for publishing/inbox
    """
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
            raise HTTPException(status_code=400, detail=f"Meta OAuth error: {error_msg}")
        
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
            raise HTTPException(status_code=400, detail="Failed to fetch Facebook Pages")
        
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
            
            # Calculate token expiry (Page tokens from long-lived user tokens don't expire)
            # But we track it anyway for safety
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
            
            # Store/Update Page in database
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
                "status": "ready",  # ready, token_expired, permissions_missing
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
            
            # Also sync to social_accounts for backward compatibility
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
                "meta_page_id": page_id,  # Link to meta_pages collection
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
                        "requires_media": True,  # Instagram requires media
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
        
        logger.info(f"Synced {len(synced_pages)} pages and {len(synced_instagram)} Instagram accounts")
        
        return {
            "success": True,
            "user": {
                "id": meta_user_id,
                "name": meta_user_name
            },
            "pages": synced_pages,
            "instagram_accounts": synced_instagram,
            "message": f"Connected {len(synced_pages)} Facebook Pages and {len(synced_instagram)} Instagram accounts"
        }


# ==================== PUBLISHING - FACEBOOK ====================

@router.post("/publish/facebook")
async def publish_to_facebook(
    request: PublishPostRequest,
    current_user: dict = Depends(lambda: {"user_id": "test"})
):
    """
    Publish content to a Facebook Page.
    Uses Page Access Token (NOT user token).
    
    Endpoint: POST /{page_id}/feed
    Authorization: Bearer {page_access_token}
    """
    user_id = get_user_id(current_user)
    page_id = request.page_id
    
    # Get the Page Access Token
    page_token = await get_page_access_token(page_id, user_id)
    
    if not page_token:
        raise HTTPException(
            status_code=400, 
            detail="No valid Page Access Token. Please reconnect your Facebook Page."
        )
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        try:
            if request.media_urls and len(request.media_urls) > 0:
                # Post with photo
                response = await http_client.post(
                    f"https://graph.facebook.com/{META_API_VERSION}/{page_id}/photos",
                    params={
                        "url": request.media_urls[0],
                        "message": request.content,
                        "access_token": page_token
                    }
                )
            elif request.link:
                # Post with link
                response = await http_client.post(
                    f"https://graph.facebook.com/{META_API_VERSION}/{page_id}/feed",
                    params={
                        "message": request.content,
                        "link": request.link,
                        "access_token": page_token
                    }
                )
            else:
                # Text-only post
                response = await http_client.post(
                    f"https://graph.facebook.com/{META_API_VERSION}/{page_id}/feed",
                    params={
                        "message": request.content,
                        "access_token": page_token
                    }
                )
            
            if response.status_code != 200:
                error_data = response.json()
                error_msg = error_data.get("error", {}).get("message", "Publishing failed")
                logger.error(f"Facebook publish error: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Facebook error: {error_msg}")
            
            result = response.json()
            post_id = result.get("id") or result.get("post_id")
            
            logger.info(f"Published to Facebook page {page_id}: post_id={post_id}")
            
            return {
                "success": True,
                "platform": "facebook",
                "post_id": post_id,
                "url": f"https://facebook.com/{post_id}" if post_id else None
            }
            
        except httpx.RequestError as e:
            logger.error(f"Network error publishing to Facebook: {e}")
            raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")


# ==================== PUBLISHING - INSTAGRAM ====================

@router.post("/publish/instagram")
async def publish_to_instagram(
    request: InstagramPublishRequest,
    current_user: dict = Depends(lambda: {"user_id": "test"})
):
    """
    Publish content to Instagram Business Account.
    Uses Page Access Token (NOT user token).
    
    Flow:
    1. Create media container: POST /{ig_business_id}/media
    2. Publish container: POST /{ig_business_id}/media_publish
    
    ⚠️ Instagram ALWAYS requires an image or video.
    """
    user_id = get_user_id(current_user)
    page_id = request.page_id
    ig_business_id = request.ig_business_id
    
    if not request.image_url:
        raise HTTPException(
            status_code=400,
            detail="Instagram requires an image URL for publishing"
        )
    
    # Get the Page Access Token (used for Instagram API too)
    page_token = await get_page_access_token(page_id, user_id)
    
    if not page_token:
        raise HTTPException(
            status_code=400,
            detail="No valid Page Access Token. Please reconnect your Facebook Page."
        )
    
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        try:
            # Step 1: Create media container
            logger.info(f"Creating Instagram media container for {ig_business_id}...")
            container_response = await http_client.post(
                f"https://graph.facebook.com/{META_API_VERSION}/{ig_business_id}/media",
                params={
                    "image_url": request.image_url,
                    "caption": request.caption,
                    "access_token": page_token
                }
            )
            
            if container_response.status_code != 200:
                error_data = container_response.json()
                error_msg = error_data.get("error", {}).get("message", "Container creation failed")
                logger.error(f"Instagram container error: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Instagram error: {error_msg}")
            
            container_id = container_response.json().get("id")
            
            # Step 2: Wait briefly for processing
            import asyncio
            await asyncio.sleep(2)
            
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
                error_msg = error_data.get("error", {}).get("message", "Publishing failed")
                logger.error(f"Instagram publish error: {error_msg}")
                raise HTTPException(status_code=400, detail=f"Instagram error: {error_msg}")
            
            result = publish_response.json()
            media_id = result.get("id")
            
            logger.info(f"Published to Instagram {ig_business_id}: media_id={media_id}")
            
            return {
                "success": True,
                "platform": "instagram",
                "media_id": media_id,
                "url": f"https://instagram.com"
            }
            
        except httpx.RequestError as e:
            logger.error(f"Network error publishing to Instagram: {e}")
            raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")


# ==================== INBOX - SYNC ====================

@router.post("/inbox/sync")
async def sync_meta_inbox(
    page_id: Optional[str] = None,
    current_user: dict = Depends(lambda: {"user_id": "test"})
):
    """
    Sync inbox (messages + comments) from Facebook/Instagram.
    Uses Page Access Token.
    
    Endpoints:
    - Facebook: GET /{page_id}/conversations
    - Instagram: GET /{ig_business_id}/conversations
    - Comments: GET /{page_id}/feed?fields=comments
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
    
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        for page in pages:
            p_id = page.get("page_id")
            page_token_encrypted = page.get("page_access_token_encrypted")
            
            if not page_token_encrypted:
                results["errors"].append(f"No token for page {p_id}")
                continue
            
            page_token = decrypt_token(page_token_encrypted)
            if not page_token:
                results["errors"].append(f"Failed to decrypt token for page {p_id}")
                continue
            
            # Sync Facebook Messenger conversations
            try:
                conv_response = await http_client.get(
                    f"https://graph.facebook.com/{META_API_VERSION}/{p_id}/conversations",
                    params={
                        "fields": "id,participants,messages{id,message,from,created_time,attachments}",
                        "access_token": page_token
                    }
                )
                
                if conv_response.status_code == 200:
                    conversations = conv_response.json().get("data", [])
                    for conv in conversations:
                        conv_id = conv.get("id")
                        messages = conv.get("messages", {}).get("data", [])
                        
                        for msg in messages:
                            msg_id = msg.get("id")
                            
                            # Check if already exists
                            existing = await db.meta_inbox.find_one({"external_id": msg_id})
                            if existing:
                                continue
                            
                            sender = msg.get("from", {})
                            
                            inbox_doc = {
                                "id": str(uuid.uuid4()),
                                "external_id": msg_id,
                                "user_id": user_id,
                                "platform": "facebook",
                                "message_type": "messenger",
                                "page_id": p_id,
                                "conversation_id": conv_id,
                                "sender_id": sender.get("id"),
                                "sender_name": sender.get("name", "Unknown"),
                                "content": msg.get("message", ""),
                                "attachments": msg.get("attachments", {}).get("data", []),
                                "timestamp": msg.get("created_time"),
                                "status": "unread",
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }
                            
                            await db.meta_inbox.insert_one(inbox_doc)
                            results["facebook_messages"] += 1
                else:
                    error = conv_response.json().get("error", {}).get("message", "Unknown error")
                    results["errors"].append(f"FB Messages error for {p_id}: {error}")
                    
            except Exception as e:
                results["errors"].append(f"FB Messages exception for {p_id}: {str(e)}")
            
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
                            
            except Exception as e:
                results["errors"].append(f"FB Comments exception for {p_id}: {str(e)}")
            
            # Sync Instagram messages if available
            ig_id = page.get("instagram_business_id")
            if ig_id:
                try:
                    ig_conv_response = await http_client.get(
                        f"https://graph.facebook.com/{META_API_VERSION}/{ig_id}/conversations",
                        params={
                            "fields": "id,participants,messages{id,message,from,timestamp}",
                            "platform": "instagram",
                            "access_token": page_token
                        }
                    )
                    
                    if ig_conv_response.status_code == 200:
                        ig_conversations = ig_conv_response.json().get("data", [])
                        for conv in ig_conversations:
                            conv_id = conv.get("id")
                            messages = conv.get("messages", {}).get("data", [])
                            
                            for msg in messages:
                                msg_id = msg.get("id")
                                
                                existing = await db.meta_inbox.find_one({"external_id": msg_id})
                                if existing:
                                    continue
                                
                                sender = msg.get("from", {})
                                
                                inbox_doc = {
                                    "id": str(uuid.uuid4()),
                                    "external_id": msg_id,
                                    "user_id": user_id,
                                    "platform": "instagram",
                                    "message_type": "dm",
                                    "page_id": p_id,
                                    "ig_business_id": ig_id,
                                    "conversation_id": conv_id,
                                    "sender_id": sender.get("id"),
                                    "sender_name": sender.get("username", "Unknown"),
                                    "content": msg.get("message", ""),
                                    "timestamp": msg.get("timestamp"),
                                    "status": "unread",
                                    "created_at": datetime.now(timezone.utc).isoformat()
                                }
                                
                                await db.meta_inbox.insert_one(inbox_doc)
                                results["instagram_messages"] += 1
                    else:
                        # Instagram DM API may require additional permissions
                        pass
                        
                except Exception as e:
                    results["errors"].append(f"IG Messages exception for {ig_id}: {str(e)}")
    
    return results


@router.get("/inbox")
async def get_meta_inbox(
    platform: Optional[str] = None,
    message_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(lambda: {"user_id": "test"})
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
    
    logger.warning(f"Webhook verification failed: mode={mode}, token={token}")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhooks")
async def handle_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Handle incoming webhook events from Meta.
    
    Events we handle:
    - messages: Facebook Messenger messages
    - messaging_postbacks: Button clicks in Messenger
    - feed: Page feed updates (comments, etc.)
    - instagram_messages: Instagram DMs
    - instagram_comments: Instagram post comments
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    object_type = body.get("object")
    
    if object_type == "page":
        # Facebook Page events
        for entry in body.get("entry", []):
            page_id = entry.get("id")
            
            # Messaging events
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                recipient_id = messaging.get("recipient", {}).get("id")
                timestamp = messaging.get("timestamp")
                message = messaging.get("message", {})
                
                if message:
                    background_tasks.add_task(
                        process_facebook_message,
                        page_id=page_id,
                        sender_id=sender_id,
                        message_id=message.get("mid"),
                        text=message.get("text", ""),
                        attachments=message.get("attachments", []),
                        timestamp=timestamp
                    )
            
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
    
    elif object_type == "instagram":
        # Instagram events
        for entry in body.get("entry", []):
            ig_id = entry.get("id")
            
            # Instagram messages
            for messaging in entry.get("messaging", []):
                sender_id = messaging.get("sender", {}).get("id")
                message = messaging.get("message", {})
                timestamp = messaging.get("timestamp")
                
                if message:
                    background_tasks.add_task(
                        process_instagram_message,
                        ig_business_id=ig_id,
                        sender_id=sender_id,
                        message_id=message.get("mid"),
                        text=message.get("text", ""),
                        timestamp=timestamp
                    )
            
            # Instagram comments
            for change in entry.get("changes", []):
                if change.get("field") == "comments":
                    value = change.get("value", {})
                    background_tasks.add_task(
                        process_instagram_comment,
                        ig_business_id=ig_id,
                        comment_id=value.get("id"),
                        media_id=value.get("media", {}).get("id"),
                        sender_id=value.get("from", {}).get("id"),
                        sender_username=value.get("from", {}).get("username"),
                        text=value.get("text", ""),
                        timestamp=value.get("timestamp")
                    )
    
    return {"status": "ok"}


# ==================== WEBHOOK PROCESSORS ====================

async def process_facebook_message(
    page_id: str,
    sender_id: str,
    message_id: str,
    text: str,
    attachments: list,
    timestamp: int
):
    """Process incoming Facebook Messenger message"""
    # Find user_id from page_id
    page = await db.meta_pages.find_one({"page_id": page_id})
    if not page:
        logger.warning(f"Unknown page_id in webhook: {page_id}")
        return
    
    user_id = page.get("user_id")
    
    # Check if message exists
    existing = await db.meta_inbox.find_one({"external_id": message_id})
    if existing:
        return
    
    inbox_doc = {
        "id": str(uuid.uuid4()),
        "external_id": message_id,
        "user_id": user_id,
        "platform": "facebook",
        "message_type": "messenger",
        "page_id": page_id,
        "sender_id": sender_id,
        "content": text,
        "attachments": attachments,
        "timestamp": datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).isoformat() if timestamp else None,
        "status": "unread",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.meta_inbox.insert_one(inbox_doc)
    logger.info(f"Stored Facebook message {message_id}")


async def process_facebook_comment(
    page_id: str,
    comment_id: str,
    post_id: str,
    sender_id: str,
    sender_name: str,
    text: str,
    timestamp: str
):
    """Process incoming Facebook comment"""
    page = await db.meta_pages.find_one({"page_id": page_id})
    if not page:
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
        "post_id": post_id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "content": text,
        "timestamp": timestamp,
        "status": "unread",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.meta_inbox.insert_one(inbox_doc)
    logger.info(f"Stored Facebook comment {comment_id}")


async def process_instagram_message(
    ig_business_id: str,
    sender_id: str,
    message_id: str,
    text: str,
    timestamp: int
):
    """Process incoming Instagram DM"""
    page = await db.meta_pages.find_one({"instagram_business_id": ig_business_id})
    if not page:
        return
    
    user_id = page.get("user_id")
    
    existing = await db.meta_inbox.find_one({"external_id": message_id})
    if existing:
        return
    
    inbox_doc = {
        "id": str(uuid.uuid4()),
        "external_id": message_id,
        "user_id": user_id,
        "platform": "instagram",
        "message_type": "dm",
        "ig_business_id": ig_business_id,
        "page_id": page.get("page_id"),
        "sender_id": sender_id,
        "content": text,
        "timestamp": datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).isoformat() if timestamp else None,
        "status": "unread",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.meta_inbox.insert_one(inbox_doc)
    logger.info(f"Stored Instagram DM {message_id}")


async def process_instagram_comment(
    ig_business_id: str,
    comment_id: str,
    media_id: str,
    sender_id: str,
    sender_username: str,
    text: str,
    timestamp: str
):
    """Process incoming Instagram comment"""
    page = await db.meta_pages.find_one({"instagram_business_id": ig_business_id})
    if not page:
        return
    
    user_id = page.get("user_id")
    
    existing = await db.meta_inbox.find_one({"external_id": comment_id})
    if existing:
        return
    
    inbox_doc = {
        "id": str(uuid.uuid4()),
        "external_id": comment_id,
        "user_id": user_id,
        "platform": "instagram",
        "message_type": "comment",
        "ig_business_id": ig_business_id,
        "page_id": page.get("page_id"),
        "media_id": media_id,
        "sender_id": sender_id,
        "sender_name": sender_username,
        "content": text,
        "timestamp": timestamp,
        "status": "unread",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.meta_inbox.insert_one(inbox_doc)
    logger.info(f"Stored Instagram comment {comment_id}")


# ==================== STATUS / DIAGNOSTICS ====================

@router.get("/pages")
async def get_connected_pages(current_user: dict = Depends(lambda: {"user_id": "test"})):
    """
    Get all connected Facebook Pages with their status.
    Shows:
    - Token validity
    - Instagram linking status
    - Publishing capabilities
    """
    user_id = get_user_id(current_user)
    
    pages = await db.meta_pages.find(
        {"user_id": user_id},
        {"_id": 0, "page_access_token_encrypted": 0}
    ).to_list(100)
    
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
            except:
                pass
        
        result.append({
            "page_id": page.get("page_id"),
            "page_name": page.get("page_name"),
            "category": page.get("category"),
            "picture_url": page.get("picture_url"),
            "token_status": token_status,
            "token_expires_at": expires_at,
            "instagram_linked": page.get("instagram_business_id") is not None,
            "instagram_business_id": page.get("instagram_business_id"),
            "instagram_username": page.get("instagram_username"),
            "permissions": page.get("permissions", {}),
            "status": page.get("status", "unknown"),
            "can_publish_facebook": token_status == "valid",
            "can_publish_instagram": token_status == "valid" and page.get("instagram_business_id") is not None
        })
    
    return {"pages": result, "total": len(result)}


@router.post("/pages/{page_id}/refresh-token")
async def refresh_page_token(
    page_id: str,
    current_user: dict = Depends(lambda: {"user_id": "test"})
):
    """
    Attempt to refresh a Page Access Token.
    Note: Long-lived Page tokens don't expire, but we can verify validity.
    """
    user_id = get_user_id(current_user)
    
    page = await db.meta_pages.find_one({"page_id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    page_token = decrypt_token(page.get("page_access_token_encrypted", ""))
    if not page_token:
        raise HTTPException(status_code=400, detail="No token to refresh - please reconnect")
    
    # Verify token with Meta
    async with httpx.AsyncClient(timeout=30.0) as http_client:
        debug_response = await http_client.get(
            f"https://graph.facebook.com/{META_API_VERSION}/debug_token",
            params={
                "input_token": page_token,
                "access_token": f"{META_APP_ID}|{META_APP_SECRET}"
            }
        )
        
        if debug_response.status_code == 200:
            debug_data = debug_response.json().get("data", {})
            is_valid = debug_data.get("is_valid", False)
            expires_at = debug_data.get("expires_at", 0)
            
            if is_valid:
                # Update status
                new_expires = datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat() if expires_at else None
                await db.meta_pages.update_one(
                    {"page_id": page_id, "user_id": user_id},
                    {"$set": {
                        "status": "ready",
                        "token_expires_at": new_expires,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                return {
                    "success": True,
                    "token_valid": True,
                    "expires_at": new_expires
                }
            else:
                await db.meta_pages.update_one(
                    {"page_id": page_id, "user_id": user_id},
                    {"$set": {"status": "token_expired"}}
                )
                return {
                    "success": False,
                    "token_valid": False,
                    "message": "Token is invalid - please reconnect your Facebook account"
                }
        else:
            return {
                "success": False,
                "error": "Could not verify token"
            }
