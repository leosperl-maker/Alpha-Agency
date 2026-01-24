"""
TikTok OAuth2 Integration with Sandbox Mode
Supports both real TikTok API and sandbox simulation for app review.

Sandbox mode allows recording a demo video for TikTok app review
without needing actual API approval.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import uuid
import asyncio
import logging

# Database connection - imported from server
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'test_database')]

# Auth dependency - imported from server
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tiktok", tags=["tiktok"])

# ==================== CONFIGURATION ====================

# TikTok API Configuration
TIKTOK_CLIENT_KEY = os.environ.get("TIKTOK_CLIENT_KEY")
TIKTOK_CLIENT_SECRET = os.environ.get("TIKTOK_CLIENT_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://alphagency.fr")
REDIRECT_URI = f"{FRONTEND_URL}/admin/social-media?tiktok_callback=true"

# SANDBOX MODE FLAG
TIKTOK_SANDBOX = os.environ.get("TIKTOK_SANDBOX", "false").lower() == "true"

# TikTok OAuth URLs
TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"

# Required scopes - Basic scopes for sandbox
TIKTOK_SCOPES = [
    "user.info.basic",
    "user.info.profile",
]

# ==================== API LOGS ====================

# In-memory API logs for sandbox demo
sandbox_api_logs = []

def log_sandbox_api(method: str, endpoint: str, status: int, message: str):
    """Log a simulated API call for sandbox mode"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "method": method,
        "endpoint": endpoint,
        "status": status,
        "message": message,
        "is_sandbox": True
    }
    sandbox_api_logs.insert(0, log_entry)
    # Keep only last 50 logs
    if len(sandbox_api_logs) > 50:
        sandbox_api_logs.pop()
    logger.info(f"[SANDBOX] {method} {endpoint} -> {status} {message}")
    return log_entry

# ==================== MODELS ====================

class TikTokTokenExchange(BaseModel):
    code: str
    redirect_uri: str

class TikTokSandboxAuth(BaseModel):
    authorize: bool = True

class TikTokPublishRequest(BaseModel):
    caption: str
    video_url: Optional[str] = None
    scheduled_at: Optional[str] = None
    account_id: str

# ==================== AUTH DEPENDENCY ====================

import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ==================== SANDBOX STATUS ====================

@router.get("/sandbox-status")
async def get_sandbox_status():
    """Get TikTok sandbox mode status"""
    return {
        "sandbox_mode": TIKTOK_SANDBOX,
        "message": "TikTok Sandbox Mode is ACTIVE - All API calls are simulated" if TIKTOK_SANDBOX else "TikTok Production Mode",
        "info": "This mode allows recording a demo video for TikTok app review without real API calls." if TIKTOK_SANDBOX else None
    }

@router.get("/api-logs")
async def get_api_logs(limit: int = 20):
    """Get sandbox API logs for demo purposes"""
    return {
        "sandbox_mode": TIKTOK_SANDBOX,
        "logs": sandbox_api_logs[:limit],
        "total": len(sandbox_api_logs)
    }

@router.delete("/api-logs")
async def clear_api_logs(current_user: dict = Depends(get_current_user)):
    """Clear sandbox API logs"""
    sandbox_api_logs.clear()
    return {"message": "API logs cleared"}

# ==================== OAUTH ENDPOINTS ====================

@router.get("/auth-url")
async def get_tiktok_auth_url(
    redirect_uri: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate TikTok OAuth2 authorization URL"""
    
    if TIKTOK_SANDBOX:
        # In sandbox mode, redirect to our sandbox auth page
        log_sandbox_api("GET", "/tiktok/auth-url", 200, "Sandbox OAuth URL generated")
        
        state = str(uuid.uuid4())
        
        # Store state for sandbox
        await db.oauth_states.insert_one({
            "state": state,
            "platform": "tiktok",
            "user_id": current_user["user_id"],
            "redirect_uri": redirect_uri or REDIRECT_URI,
            "is_sandbox": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Return URL to sandbox auth page
        sandbox_auth_url = f"{redirect_uri or REDIRECT_URI}&sandbox=true&state={state}"
        
        return {
            "auth_url": sandbox_auth_url,
            "is_sandbox": True,
            "message": "Sandbox mode - OAuth will be simulated"
        }
    
    # Real TikTok OAuth
    if not TIKTOK_CLIENT_KEY:
        raise HTTPException(status_code=500, detail="TikTok Client Key not configured")
    
    state = str(uuid.uuid4())
    
    # Use provided redirect_uri or default
    if not redirect_uri:
        redirect_uri = REDIRECT_URI
    
    # Store state in database for verification
    await db.oauth_states.insert_one({
        "state": state,
        "platform": "tiktok",
        "user_id": current_user["user_id"],
        "redirect_uri": redirect_uri,
        "is_sandbox": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    scope = ",".join(TIKTOK_SCOPES)
    
    auth_url = (
        f"{TIKTOK_AUTH_URL}"
        f"?client_key={TIKTOK_CLIENT_KEY}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&redirect_uri={redirect_uri}"
        f"&state={state}"
    )
    
    return {"auth_url": auth_url, "is_sandbox": False}

@router.post("/sandbox-authorize")
async def sandbox_authorize(
    data: TikTokSandboxAuth,
    current_user: dict = Depends(get_current_user)
):
    """Simulate TikTok OAuth authorization in sandbox mode"""
    
    if not TIKTOK_SANDBOX:
        raise HTTPException(status_code=400, detail="Sandbox mode is not enabled")
    
    log_sandbox_api("POST", "/tiktok/oauth/authorize", 200, "User authorized (sandbox)")
    
    # Generate sandbox tokens
    sandbox_token = f"sandbox_tiktok_token_{uuid.uuid4().hex[:12]}"
    sandbox_refresh = f"sandbox_refresh_{uuid.uuid4().hex[:12]}"
    sandbox_account_id = f"sandbox_account_{uuid.uuid4().hex[:8]}"
    
    # Create sandbox account data
    account_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "workspace_id": current_user.get("workspace_id", current_user["user_id"]),
        "platform": "tiktok",
        "account_type": "creator",
        "external_id": sandbox_account_id,
        "display_name": "Sandbox TikTok Account",
        "username": "sandbox_creator",
        "profile_picture_url": "https://p16-sign-va.tiktokcdn.com/musically-maliva-obj/1645136815763462~c5_720x720.jpeg",
        "access_token": sandbox_token,
        "refresh_token": sandbox_refresh,
        "token_expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "status": "active",
        "is_sandbox": True,
        "metadata": {
            "follower_count": 15420,
            "following_count": 328,
            "video_count": 47,
            "bio": "Demo TikTok Account for App Review"
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check for existing sandbox account
    existing = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "tiktok",
        "is_sandbox": True
    })
    
    if existing:
        await db.social_accounts.update_one(
            {"_id": existing["_id"]},
            {"$set": account_data}
        )
        account_data["id"] = existing.get("id", account_data["id"])
    else:
        await db.social_accounts.insert_one(account_data)
    
    log_sandbox_api("POST", "/tiktok/oauth/token", 200, f"Access token generated: {sandbox_token[:20]}...")
    log_sandbox_api("GET", "/tiktok/user/info", 200, "User profile retrieved (sandbox)")
    
    return {
        "success": True,
        "message": "TikTok account connected (Sandbox Mode)",
        "is_sandbox": True,
        "account": {
            "id": account_data["id"],
            "display_name": account_data["display_name"],
            "username": account_data["username"],
            "profile_picture_url": account_data["profile_picture_url"]
        }
    }

@router.post("/exchange-token")
async def exchange_tiktok_token(
    data: TikTokTokenExchange,
    current_user: dict = Depends(get_current_user)
):
    """Exchange authorization code for access token"""
    
    # Check if this is a sandbox callback
    if TIKTOK_SANDBOX or "sandbox" in data.code.lower():
        return await sandbox_authorize(TikTokSandboxAuth(authorize=True), current_user)
    
    # Real TikTok token exchange
    import httpx
    
    redirect_uri = data.redirect_uri
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                TIKTOK_TOKEN_URL,
                data={
                    "client_key": TIKTOK_CLIENT_KEY,
                    "client_secret": TIKTOK_CLIENT_SECRET,
                    "code": data.code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(
                    status_code=400, 
                    detail=f"TikTok error: {error_data.get('error_description', error_data.get('error', 'Unknown error'))}"
                )
            
            token_data = response.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 86400)
            open_id = token_data.get("open_id")
            
            # Get user profile
            profile_response = await client.get(
                TIKTOK_USER_INFO_URL,
                params={"fields": "open_id,union_id,avatar_url,display_name"},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            profile_data = {}
            if profile_response.status_code == 200:
                profile_data = profile_response.json().get("data", {}).get("user", {})
            
            display_name = profile_data.get("display_name", "TikTok User")
            avatar_url = profile_data.get("avatar_url")
            
            # Store account
            account_data = {
                "platform": "tiktok",
                "account_type": "creator",
                "external_id": open_id,
                "display_name": display_name,
                "username": display_name.lower().replace(" ", "_"),
                "profile_picture_url": avatar_url,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
                "status": "active",
                "is_sandbox": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            existing_account = await db.social_accounts.find_one({
                "user_id": current_user["user_id"],
                "platform": "tiktok",
                "external_id": open_id
            })
            
            if existing_account:
                await db.social_accounts.update_one(
                    {"_id": existing_account["_id"]},
                    {"$set": account_data}
                )
                account_id = existing_account.get("id")
            else:
                account_id = str(uuid.uuid4())
                account_data.update({
                    "id": account_id,
                    "user_id": current_user["user_id"],
                    "workspace_id": current_user.get("workspace_id", current_user["user_id"]),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                await db.social_accounts.insert_one(account_data)
            
            return {
                "success": True,
                "message": "TikTok account connected!",
                "is_sandbox": False,
                "account": {
                    "id": account_id,
                    "display_name": display_name,
                    "profile_picture_url": avatar_url
                }
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

# ==================== PUBLISH ENDPOINTS ====================

@router.post("/publish")
async def publish_to_tiktok(
    data: TikTokPublishRequest,
    current_user: dict = Depends(get_current_user)
):
    """Publish or schedule a video to TikTok"""
    
    # Get TikTok account
    account = await db.social_accounts.find_one({
        "id": data.account_id,
        "platform": "tiktok"
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="TikTok account not found")
    
    is_sandbox = account.get("is_sandbox", False) or TIKTOK_SANDBOX
    
    # Create post record
    post_id = str(uuid.uuid4())
    platform_post_id = f"sandbox_post_{uuid.uuid4().hex[:12]}" if is_sandbox else None
    
    is_scheduled = data.scheduled_at is not None
    initial_status = "scheduled" if is_scheduled else "publishing"
    
    post_data = {
        "id": post_id,
        "user_id": current_user["user_id"],
        "workspace_id": current_user.get("workspace_id", current_user["user_id"]),
        "platform": "tiktok",
        "account_id": data.account_id,
        "content": data.caption,
        "media_urls": [data.video_url] if data.video_url else [],
        "platform_post_id": platform_post_id,
        "status": initial_status,
        "scheduled_at": data.scheduled_at,
        "is_sandbox": is_sandbox,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.social_posts.insert_one(post_data)
    
    if is_sandbox:
        log_sandbox_api("POST", "/tiktok/content/post/init", 200, f"Post created: {post_id[:8]}...")
        
        if is_scheduled:
            log_sandbox_api("POST", "/tiktok/content/post/schedule", 200, f"Post scheduled for {data.scheduled_at}")
        else:
            # Simulate publishing process in background
            asyncio.create_task(simulate_publish_process(post_id))
    
    return {
        "success": True,
        "post_id": post_id,
        "platform_post_id": platform_post_id,
        "status": initial_status,
        "is_sandbox": is_sandbox,
        "message": f"Post {'scheduled' if is_scheduled else 'publishing'} (Sandbox)" if is_sandbox else f"Post {'scheduled' if is_scheduled else 'publishing'}"
    }

async def simulate_publish_process(post_id: str):
    """Simulate the TikTok publishing process for sandbox mode"""
    
    # Wait 5 seconds, update to "publishing"
    await asyncio.sleep(5)
    
    post = await db.social_posts.find_one({"id": post_id})
    if post and post.get("status") == "publishing":
        log_sandbox_api("GET", "/tiktok/content/post/status", 200, "Status: processing video...")
    
    # Wait another 5 seconds, update to "published"
    await asyncio.sleep(5)
    
    await db.social_posts.update_one(
        {"id": post_id},
        {"$set": {
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    log_sandbox_api("GET", "/tiktok/content/post/status", 200, "Status: published (sandbox)")
    log_sandbox_api("POST", "/tiktok/content/post/complete", 200, f"Post {post_id[:8]}... published successfully")

@router.post("/simulate-scheduled-publish/{post_id}")
async def simulate_scheduled_publish(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger publishing for a scheduled post (sandbox only)"""
    
    post = await db.social_posts.find_one({
        "id": post_id,
        "user_id": current_user["user_id"]
    })
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not post.get("is_sandbox"):
        raise HTTPException(status_code=400, detail="This action is only available for sandbox posts")
    
    # Update to publishing
    await db.social_posts.update_one(
        {"id": post_id},
        {"$set": {
            "status": "publishing",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    log_sandbox_api("POST", "/tiktok/content/post/publish", 200, f"Publishing post {post_id[:8]}...")
    
    # Start simulation
    asyncio.create_task(simulate_publish_process(post_id))
    
    return {
        "success": True,
        "message": "Publishing started (Sandbox)",
        "post_id": post_id
    }

# ==================== ACCOUNT MANAGEMENT ====================

@router.get("/accounts")
async def get_tiktok_accounts(current_user: dict = Depends(get_current_user)):
    """Get all connected TikTok accounts"""
    
    accounts = await db.social_accounts.find({
        "user_id": current_user["user_id"],
        "platform": "tiktok"
    }, {"_id": 0, "access_token": 0, "refresh_token": 0}).to_list(100)
    
    return {
        "accounts": accounts,
        "sandbox_mode": TIKTOK_SANDBOX
    }

@router.delete("/accounts/{account_id}")
async def disconnect_tiktok_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Disconnect a TikTok account"""
    
    account = await db.social_accounts.find_one({
        "id": account_id,
        "user_id": current_user["user_id"],
        "platform": "tiktok"
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await db.social_accounts.delete_one({"id": account_id})
    
    if account.get("is_sandbox"):
        log_sandbox_api("DELETE", "/tiktok/oauth/revoke", 200, "Account disconnected (sandbox)")
    
    return {"message": "TikTok account disconnected"}

# ==================== POSTS MANAGEMENT ====================

@router.get("/posts")
async def get_tiktok_posts(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get TikTok posts"""
    
    query = {
        "user_id": current_user["user_id"],
        "platform": "tiktok"
    }
    
    if status:
        query["status"] = status
    
    posts = await db.social_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {
        "posts": posts,
        "sandbox_mode": TIKTOK_SANDBOX
    }

@router.get("/posts/{post_id}")
async def get_tiktok_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific TikTok post"""
    
    post = await db.social_posts.find_one({
        "id": post_id,
        "user_id": current_user["user_id"]
    }, {"_id": 0})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.get("is_sandbox"):
        log_sandbox_api("GET", f"/tiktok/content/post/{post_id[:8]}", 200, f"Status: {post.get('status')}")
    
    return post
