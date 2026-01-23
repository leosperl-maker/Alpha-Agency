"""
LinkedIn OAuth2 Integration
Allows connecting LinkedIn profiles and company pages for social media management
"""

import os
import httpx
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/linkedin", tags=["LinkedIn"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Import auth dependency after db setup
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# LinkedIn OAuth2 Configuration
LINKEDIN_CLIENT_ID = os.environ.get("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.environ.get("LINKEDIN_CLIENT_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://alphagency.fr")
REDIRECT_URI = f"{FRONTEND_URL}/admin/social-media?linkedin_callback=true"

# LinkedIn API endpoints
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
LINKEDIN_ME_URL = "https://api.linkedin.com/v2/me"

# Required scopes for posting
LINKEDIN_SCOPES = [
    "openid",
    "profile", 
    "email",
    "w_member_social",  # Post on behalf of user
]


class LinkedInTokenExchange(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class LinkedInPostRequest(BaseModel):
    content: str
    visibility: str = "PUBLIC"  # PUBLIC, CONNECTIONS
    media_urls: List[str] = []


# Auth dependency - imported from server
def get_current_user_from_token(token: str):
    """Simplified token verification"""
    import jwt
    JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return get_current_user_from_token(credentials.credentials)


@router.get("/auth-url")
async def get_linkedin_auth_url(
    redirect_uri: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate LinkedIn OAuth2 authorization URL"""
    if not LINKEDIN_CLIENT_ID:
        raise HTTPException(status_code=500, detail="LinkedIn Client ID not configured")
    
    state = str(uuid.uuid4())
    
    # Use provided redirect_uri or default
    if not redirect_uri:
        redirect_uri = REDIRECT_URI
    
    # Store state in database for verification
    await db.oauth_states.insert_one({
        "state": state,
        "platform": "linkedin",
        "user_id": current_user["user_id"],
        "redirect_uri": redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    scope = "%20".join(LINKEDIN_SCOPES)
    
    auth_url = (
        f"{LINKEDIN_AUTH_URL}"
        f"?response_type=code"
        f"&client_id={LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )
    
    return {"auth_url": auth_url}


@router.post("/exchange-token")
async def exchange_linkedin_token(
    data: LinkedInTokenExchange,
    current_user: dict = Depends(get_current_user)
):
    """Exchange authorization code for access token"""
    if not LINKEDIN_CLIENT_ID or not LINKEDIN_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="LinkedIn credentials not configured")
    
    redirect_uri = data.redirect_uri or REDIRECT_URI
    
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": data.code,
                "redirect_uri": redirect_uri,
                "client_id": LINKEDIN_CLIENT_ID,
                "client_secret": LINKEDIN_CLIENT_SECRET
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
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 5184000)  # Default 60 days
        
        # Get user profile info
        profile_response = await client.get(
            LINKEDIN_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if profile_response.status_code != 200:
            # Try legacy endpoint
            profile_response = await client.get(
                LINKEDIN_ME_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )
        
        profile_data = profile_response.json()
        
        # Extract profile info
        linkedin_id = profile_data.get("sub") or profile_data.get("id")
        name = profile_data.get("name") or f"{profile_data.get('localizedFirstName', '')} {profile_data.get('localizedLastName', '')}".strip()
        picture = profile_data.get("picture")
        email = profile_data.get("email")
        
        # Calculate expiration
        expires_at = datetime.now(timezone.utc).timestamp() + expires_in
        expires_at_iso = datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat()
        
        # Store or update LinkedIn account
        existing_account = await db.social_accounts.find_one({
            "user_id": current_user["user_id"],
            "platform": "linkedin"
        })
        
        account_data = {
            "platform": "linkedin",
            "account_type": "profile",
            "external_id": linkedin_id,
            "display_name": name,
            "username": email or linkedin_id,
            "profile_picture_url": picture,
            "access_token": access_token,
            "token_expires_at": expires_at_iso,
            "status": "active",
            "is_active": True,
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
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            await db.social_accounts.insert_one(account_data)
        
        return {
            "success": True,
            "message": f"LinkedIn account '{name}' connected successfully",
            "account": {
                "id": account_id,
                "platform": "linkedin",
                "display_name": name,
                "profile_picture_url": picture
            }
        }


@router.get("/profile")
async def get_linkedin_profile(current_user: dict = Depends(get_current_user)):
    """Get connected LinkedIn profile"""
    account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "linkedin",
        "is_active": True
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="No LinkedIn account connected")
    
    return {
        "id": account.get("id"),
        "display_name": account.get("display_name"),
        "username": account.get("username"),
        "profile_picture_url": account.get("profile_picture_url"),
        "status": account.get("status"),
        "token_expires_at": account.get("token_expires_at")
    }


@router.post("/post")
async def create_linkedin_post(
    post_data: LinkedInPostRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a post on LinkedIn"""
    account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "linkedin",
        "is_active": True
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="No LinkedIn account connected")
    
    access_token = account.get("access_token")
    linkedin_id = account.get("external_id")
    
    # Build the post payload
    post_payload = {
        "author": f"urn:li:person:{linkedin_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": post_data.content
                },
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": post_data.visibility
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.linkedin.com/v2/ugcPosts",
            json=post_payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
        )
        
        if response.status_code not in [200, 201]:
            error_detail = response.text
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to create LinkedIn post: {error_detail}"
            )
        
        result = response.json()
        
        return {
            "success": True,
            "message": "Post published to LinkedIn",
            "post_id": result.get("id")
        }


@router.delete("/disconnect")
async def disconnect_linkedin(current_user: dict = Depends(get_current_user)):
    """Disconnect LinkedIn account"""
    result = await db.social_accounts.delete_one({
        "user_id": current_user["user_id"],
        "platform": "linkedin"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No LinkedIn account found")
    
    return {"message": "LinkedIn account disconnected"}
