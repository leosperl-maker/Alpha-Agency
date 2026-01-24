"""
TikTok OAuth2 Integration
Allows connecting TikTok accounts for social media management
Note: TikTok API has strict review requirements for content posting
"""

import os
import httpx
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

router = APIRouter(prefix="/tiktok", tags=["TikTok"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# TikTok OAuth2 Configuration
TIKTOK_CLIENT_KEY = os.environ.get("TIKTOK_CLIENT_KEY")
TIKTOK_CLIENT_SECRET = os.environ.get("TIKTOK_CLIENT_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://alphagency.fr")
REDIRECT_URI = f"{FRONTEND_URL}/admin/social-media?tiktok_callback=true"

# TikTok API endpoints
TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/"

# Required scopes
TIKTOK_SCOPES = [
    "user.info.basic",
    "user.info.profile",
    "user.info.stats",
    "video.list",
    "video.upload",  # Requires app review
    "video.publish",  # Requires app review
]

# Auth
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")


class TikTokTokenExchange(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class TikTokVideoUpload(BaseModel):
    video_url: str
    title: str
    description: Optional[str] = ""
    privacy_level: str = "PUBLIC_TO_EVERYONE"  # PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, SELF_ONLY


@router.get("/auth-url")
async def get_tiktok_auth_url(
    redirect_uri: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate TikTok OAuth2 authorization URL"""
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
    
    return {"auth_url": auth_url}


@router.post("/exchange-token")
async def exchange_tiktok_token(
    data: TikTokTokenExchange,
    current_user: dict = Depends(get_current_user)
):
    """Exchange authorization code for access token"""
    if not TIKTOK_CLIENT_KEY or not TIKTOK_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="TikTok credentials not configured")
    
    redirect_uri = data.redirect_uri or REDIRECT_URI
    
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
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
        
        if token_response.status_code != 200:
            error_detail = token_response.text
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to exchange token: {error_detail}"
            )
        
        token_data = token_response.json()
        
        if "error" in token_data:
            raise HTTPException(
                status_code=400,
                detail=f"TikTok error: {token_data.get('error_description', token_data.get('error'))}"
            )
        
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 86400)
        open_id = token_data.get("open_id")
        
        # Get user profile info
        profile_response = await client.get(
            TIKTOK_USERINFO_URL,
            params={"fields": "open_id,union_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count"},
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        profile_data = {}
        if profile_response.status_code == 200:
            response_json = profile_response.json()
            if response_json.get("data") and response_json["data"].get("user"):
                profile_data = response_json["data"]["user"]
        
        # Extract profile info
        tiktok_id = open_id or profile_data.get("open_id")
        display_name = profile_data.get("display_name", "TikTok User")
        username = profile_data.get("username", tiktok_id)
        avatar_url = profile_data.get("avatar_url")
        
        # Calculate expiration
        expires_at = datetime.now(timezone.utc).timestamp() + expires_in
        expires_at_iso = datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat()
        
        # Store or update TikTok account
        existing_account = await db.social_accounts.find_one({
            "user_id": current_user["user_id"],
            "platform": "tiktok"
        })
        
        account_data = {
            "platform": "tiktok",
            "account_type": "creator",
            "external_id": tiktok_id,
            "display_name": display_name,
            "username": username,
            "profile_picture_url": avatar_url,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expires_at": expires_at_iso,
            "status": "active",
            "is_active": True,
            "metadata": {
                "follower_count": profile_data.get("follower_count"),
                "following_count": profile_data.get("following_count"),
                "likes_count": profile_data.get("likes_count"),
                "video_count": profile_data.get("video_count")
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
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
            "message": f"TikTok account '@{username}' connected successfully",
            "account": {
                "id": account_id,
                "platform": "tiktok",
                "display_name": display_name,
                "username": username,
                "profile_picture_url": avatar_url
            }
        }


@router.get("/profile")
async def get_tiktok_profile(current_user: dict = Depends(get_current_user)):
    """Get connected TikTok profile"""
    account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "tiktok",
        "is_active": True
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="No TikTok account connected")
    
    return {
        "id": account.get("id"),
        "display_name": account.get("display_name"),
        "username": account.get("username"),
        "profile_picture_url": account.get("profile_picture_url"),
        "status": account.get("status"),
        "token_expires_at": account.get("token_expires_at"),
        "metadata": account.get("metadata", {})
    }


@router.post("/refresh-token")
async def refresh_tiktok_token(current_user: dict = Depends(get_current_user)):
    """Refresh TikTok access token"""
    account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "tiktok",
        "is_active": True
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="No TikTok account connected")
    
    refresh_token = account.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token available")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            TIKTOK_TOKEN_URL,
            data={
                "client_key": TIKTOK_CLIENT_KEY,
                "client_secret": TIKTOK_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to refresh token")
        
        token_data = response.json()
        new_access_token = token_data.get("access_token")
        new_refresh_token = token_data.get("refresh_token", refresh_token)
        expires_in = token_data.get("expires_in", 86400)
        
        expires_at = datetime.now(timezone.utc).timestamp() + expires_in
        expires_at_iso = datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat()
        
        await db.social_accounts.update_one(
            {"_id": account["_id"]},
            {"$set": {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "token_expires_at": expires_at_iso,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"success": True, "message": "Token refreshed successfully"}


@router.post("/video/init-upload")
async def init_video_upload(
    video_data: TikTokVideoUpload,
    current_user: dict = Depends(get_current_user)
):
    """
    Initialize video upload to TikTok
    Note: This requires video.upload scope which needs TikTok app review
    """
    account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "tiktok",
        "is_active": True
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="No TikTok account connected")
    
    access_token = account.get("access_token")
    
    # Check if we have publish permissions
    # TikTok requires app review for video.publish scope
    
    async with httpx.AsyncClient() as client:
        # Step 1: Initialize upload
        init_response = await client.post(
            "https://open.tiktokapis.com/v2/post/publish/video/init/",
            json={
                "post_info": {
                    "title": video_data.title,
                    "description": video_data.description,
                    "privacy_level": video_data.privacy_level,
                    "disable_comment": False,
                    "disable_duet": False,
                    "disable_stitch": False
                },
                "source_info": {
                    "source": "PULL_FROM_URL",
                    "video_url": video_data.video_url
                }
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        if init_response.status_code != 200:
            error_detail = init_response.text
            # Check if it's a permission error
            if "scope" in error_detail.lower() or "permission" in error_detail.lower():
                raise HTTPException(
                    status_code=403,
                    detail="TikTok video publishing requires app review. Please contact TikTok to enable video.publish scope."
                )
            raise HTTPException(
                status_code=init_response.status_code,
                detail=f"Failed to initialize upload: {error_detail}"
            )
        
        result = init_response.json()
        
        return {
            "success": True,
            "message": "Video upload initiated",
            "publish_id": result.get("data", {}).get("publish_id")
        }


@router.delete("/disconnect")
async def disconnect_tiktok(current_user: dict = Depends(get_current_user)):
    """Disconnect TikTok account"""
    result = await db.social_accounts.delete_one({
        "user_id": current_user["user_id"],
        "platform": "tiktok"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No TikTok account found")
    
    return {"message": "TikTok account disconnected"}
