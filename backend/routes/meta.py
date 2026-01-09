"""
Meta API Integration Routes - Facebook & Instagram
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx
import uuid
import asyncio
import os
import logging

from .database import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

META_APP_ID = os.environ.get('META_APP_ID', '')
META_APP_SECRET = os.environ.get('META_APP_SECRET', '')
META_API_VERSION = "v20.0"
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


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


@router.get("/auth-url", response_model=dict)
async def get_meta_auth_url(current_user: dict = Depends(get_current_user)):
    """Get Meta OAuth authorization URL"""
    if not META_APP_ID:
        raise HTTPException(status_code=503, detail="Meta App ID non configuré")
    
    redirect_uri = f"{FRONTEND_URL}/admin/social?meta_callback=true"
    scope = "pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish,business_management"
    state = str(uuid.uuid4())
    
    await db.meta_oauth_states.insert_one({
        "state": state,
        "user_id": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    auth_url = f"https://www.facebook.com/{META_API_VERSION}/dialog/oauth?" \
               f"client_id={META_APP_ID}&" \
               f"redirect_uri={redirect_uri}&" \
               f"scope={scope}&" \
               f"state={state}&" \
               f"response_type=code"
    
    return {"auth_url": auth_url, "state": state}


@router.post("/exchange-token", response_model=dict)
async def exchange_meta_token(data: MetaTokenExchange, current_user: dict = Depends(get_current_user)):
    """Exchange authorization code for access token"""
    if not META_APP_ID or not META_APP_SECRET:
        raise HTTPException(status_code=503, detail="Configuration Meta incomplète")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Exchange code for short-lived token
            token_response = await client.get(
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
                raise HTTPException(status_code=400, detail=f"Erreur Meta: {error_data.get('error', {}).get('message', 'Unknown error')}")
            
            token_data = token_response.json()
            short_lived_token = token_data.get("access_token")
            
            # Exchange for long-lived token
            long_token_response = await client.get(
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
                access_token = long_token_data.get("access_token", short_lived_token)
                expires_in = long_token_data.get("expires_in", 5184000)
            else:
                access_token = short_lived_token
                expires_in = 3600
            
            # Get user info
            me_response = await client.get(
                f"https://graph.facebook.com/{META_API_VERSION}/me",
                params={
                    "fields": "id,name,email",
                    "access_token": access_token
                }
            )
            
            if me_response.status_code == 200:
                me_data = me_response.json()
            else:
                me_data = {"id": "unknown", "name": "Unknown"}
            
            meta_account = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["user_id"],
                "platform": "meta",
                "meta_user_id": me_data.get("id"),
                "account_name": me_data.get("name", "Meta Account"),
                "access_token": access_token,
                "token_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.social_accounts.update_one(
                {"user_id": current_user["user_id"], "platform": "meta"},
                {"$set": meta_account},
                upsert=True
            )
            
            return {
                "success": True,
                "message": "Compte Meta connecté avec succès",
                "account_name": meta_account["account_name"],
                "expires_in_days": expires_in // 86400
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Erreur de communication avec Meta: {str(e)}")


@router.get("/pages", response_model=List[dict])
async def get_meta_pages(current_user: dict = Depends(get_current_user)):
    """Get user's Facebook Pages"""
    meta_account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "meta",
        "is_active": True
    })
    
    if not meta_account:
        raise HTTPException(status_code=404, detail="Aucun compte Meta connecté")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://graph.facebook.com/{META_API_VERSION}/me/accounts",
                params={
                    "fields": "id,name,category,access_token,picture,instagram_business_account",
                    "access_token": meta_account["access_token"]
                }
            )
            
            if response.status_code != 200:
                error_data = response.json()
                raise HTTPException(status_code=400, detail=f"Erreur Meta: {error_data.get('error', {}).get('message', 'Unknown error')}")
            
            pages_data = response.json().get("data", [])
            
            pages = []
            for page in pages_data:
                page_obj = {
                    "page_id": page["id"],
                    "page_name": page["name"],
                    "category": page.get("category", ""),
                    "access_token": page.get("access_token"),
                    "picture_url": page.get("picture", {}).get("data", {}).get("url"),
                    "has_instagram": page.get("instagram_business_account") is not None,
                    "instagram_id": page.get("instagram_business_account", {}).get("id") if page.get("instagram_business_account") else None
                }
                pages.append(page_obj)
            
            await db.social_accounts.update_one(
                {"_id": meta_account["_id"]},
                {"$set": {"pages": pages, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            return pages
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@router.post("/publish/facebook", response_model=dict)
async def publish_to_facebook(post: MetaPublishPost, current_user: dict = Depends(get_current_user)):
    """Publish a post to a Facebook Page"""
    meta_account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "meta",
        "is_active": True
    })
    
    if not meta_account:
        raise HTTPException(status_code=404, detail="Aucun compte Meta connecté")
    
    page = next((p for p in meta_account.get("pages", []) if p["page_id"] == post.page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée. Veuillez rafraîchir vos pages.")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
                "message": post.content,
                "access_token": page["access_token"]
            }
            
            if post.media_urls and len(post.media_urls) > 0:
                if len(post.media_urls) == 1:
                    payload["url"] = post.media_urls[0]
                    endpoint = f"https://graph.facebook.com/{META_API_VERSION}/{post.page_id}/photos"
                else:
                    endpoint = f"https://graph.facebook.com/{META_API_VERSION}/{post.page_id}/feed"
            else:
                endpoint = f"https://graph.facebook.com/{META_API_VERSION}/{post.page_id}/feed"
            
            if post.link_url:
                payload["link"] = post.link_url
            
            response = await client.post(endpoint, data=payload)
            
            if response.status_code not in [200, 201]:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', 'Erreur inconnue')
                raise HTTPException(status_code=400, detail=f"Erreur publication: {error_msg}")
            
            result = response.json()
            
            published_post = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["user_id"],
                "platform": "facebook",
                "platform_post_id": result.get("id") or result.get("post_id"),
                "page_id": post.page_id,
                "page_name": page["page_name"],
                "content": post.content,
                "media_urls": post.media_urls,
                "status": "published",
                "published_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.published_posts.insert_one(published_post)
            
            return {
                "success": True,
                "message": "Post publié sur Facebook avec succès",
                "post_id": published_post["id"],
                "platform_post_id": result.get("id") or result.get("post_id")
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Erreur de communication: {str(e)}")


@router.post("/publish/instagram", response_model=dict)
async def publish_to_instagram(post: InstagramPublishPost, current_user: dict = Depends(get_current_user)):
    """Publish a post to Instagram Business Account"""
    meta_account = await db.social_accounts.find_one({
        "user_id": current_user["user_id"],
        "platform": "meta",
        "is_active": True
    })
    
    if not meta_account:
        raise HTTPException(status_code=404, detail="Aucun compte Meta connecté")
    
    page = next((p for p in meta_account.get("pages", []) if p.get("instagram_id") == post.ig_account_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Compte Instagram non trouvé")
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Create media container
            container_response = await client.post(
                f"https://graph.facebook.com/{META_API_VERSION}/{post.ig_account_id}/media",
                data={
                    "image_url": post.image_url,
                    "caption": post.caption,
                    "access_token": page["access_token"]
                }
            )
            
            if container_response.status_code != 200:
                error_data = container_response.json()
                raise HTTPException(status_code=400, detail=f"Erreur création container: {error_data.get('error', {}).get('message', 'Unknown')}")
            
            container_id = container_response.json().get("id")
            
            # Wait for media to be ready
            for _ in range(30):
                status_response = await client.get(
                    f"https://graph.facebook.com/{META_API_VERSION}/{container_id}",
                    params={
                        "fields": "status_code",
                        "access_token": page["access_token"]
                    }
                )
                
                if status_response.status_code == 200:
                    status = status_response.json().get("status_code")
                    if status == "FINISHED":
                        break
                    elif status == "ERROR":
                        raise HTTPException(status_code=400, detail="Erreur lors du traitement de l'image")
                
                await asyncio.sleep(2)
            
            # Publish the media
            publish_response = await client.post(
                f"https://graph.facebook.com/{META_API_VERSION}/{post.ig_account_id}/media_publish",
                data={
                    "creation_id": container_id,
                    "access_token": page["access_token"]
                }
            )
            
            if publish_response.status_code != 200:
                error_data = publish_response.json()
                raise HTTPException(status_code=400, detail=f"Erreur publication: {error_data.get('error', {}).get('message', 'Unknown')}")
            
            result = publish_response.json()
            
            published_post = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["user_id"],
                "platform": "instagram",
                "platform_post_id": result.get("id"),
                "ig_account_id": post.ig_account_id,
                "caption": post.caption,
                "image_url": post.image_url,
                "status": "published",
                "published_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.published_posts.insert_one(published_post)
            
            return {
                "success": True,
                "message": "Post publié sur Instagram avec succès",
                "post_id": published_post["id"],
                "platform_post_id": result.get("id")
            }
            
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Erreur de communication: {str(e)}")


@router.get("/published-posts", response_model=List[dict])
async def get_published_posts(
    platform: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get list of published posts"""
    query = {"user_id": current_user["user_id"]}
    if platform:
        query["platform"] = platform
    
    posts = await db.published_posts.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return posts


@router.delete("/disconnect", response_model=dict)
async def disconnect_meta_account(current_user: dict = Depends(get_current_user)):
    """Disconnect Meta account"""
    result = await db.social_accounts.delete_one({
        "user_id": current_user["user_id"],
        "platform": "meta"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aucun compte Meta connecté")
    
    return {"message": "Compte Meta déconnecté"}
