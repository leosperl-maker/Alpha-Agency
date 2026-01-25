"""
Social Media Publication Worker
Handles scheduled post publishing across all platforms
"""

import os
import asyncio
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from cryptography.fernet import Fernet

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("publication_worker")

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Meta API configuration
META_APP_ID = os.environ.get("META_APP_ID")
META_APP_SECRET = os.environ.get("META_APP_SECRET")

# Import shared encryption module
from routes.token_encryption import decrypt_token, get_account_access_token


class PublicationWorker:
    """Worker that publishes scheduled posts"""
    
    def __init__(self, check_interval: int = 60):
        self.check_interval = check_interval  # seconds
        self.running = False
    
    async def start(self):
        """Start the worker loop"""
        self.running = True
        logger.info("Publication worker started")
        
        while self.running:
            try:
                await self.process_scheduled_posts()
            except Exception as e:
                logger.error(f"Worker error: {e}")
            
            await asyncio.sleep(self.check_interval)
    
    def stop(self):
        """Stop the worker"""
        self.running = False
        logger.info("Publication worker stopped")
    
    async def process_scheduled_posts(self):
        """Find and publish posts that are due"""
        now = datetime.now(timezone.utc)
        
        # Find posts that should be published:
        # 1. scheduled posts that are due (scheduled_at <= now AND status == 'scheduled')
        # 2. immediate publish posts (status == 'publishing')
        cursor = db.scheduled_posts.find({
            "$or": [
                {
                    "status": "scheduled",
                    "scheduled_at": {"$lte": now.isoformat()}
                },
                {
                    "status": "publishing"
                }
            ]
        })
        
        posts = await cursor.to_list(length=50)
        
        if posts:
            logger.info(f"Found {len(posts)} posts to publish")
        
        for post in posts:
            await self.publish_post(post)
    
    async def publish_post(self, post: dict):
        """Publish a single post to all selected platforms"""
        post_id = post.get("id")
        platforms = post.get("platforms", [])
        account_ids = post.get("account_ids", [])
        content = post.get("content", "")
        media_urls = post.get("media_urls", [])
        
        logger.info(f"Publishing post {post_id} to accounts: {account_ids}")
        
        results = []
        errors = []
        
        # Check if any accounts are selected
        if not account_ids:
            errors.append("Aucun compte sélectionné pour la publication")
            logger.warning(f"Post {post_id} has no accounts selected")
        
        # Get accounts
        for account_id in account_ids:
            account = await db.social_accounts.find_one({"id": account_id})
            if not account:
                # Try finding by page_id for backward compatibility
                account = await db.social_accounts.find_one({
                    "pages.page_id": account_id
                })
            
            if not account:
                errors.append(f"Account {account_id} not found")
                continue
            
            platform = account.get("platform")
            
            try:
                if platform == "meta" or platform == "facebook":
                    result = await self.publish_to_facebook(account, account_id, content, media_urls)
                elif platform == "instagram":
                    result = await self.publish_to_instagram(account, content, media_urls)
                elif platform == "linkedin":
                    result = await self.publish_to_linkedin(account, content, media_urls)
                elif platform == "tiktok":
                    result = await self.publish_to_tiktok(account, content, media_urls)
                else:
                    result = {"error": f"Platform {platform} not supported"}
                
                if "error" in result:
                    errors.append(f"{platform}: {result['error']}")
                else:
                    results.append({
                        "platform": platform,
                        "post_id": result.get("id"),
                        "url": result.get("url")
                    })
                    
            except Exception as e:
                errors.append(f"{platform}: {str(e)}")
                logger.error(f"Error publishing to {platform}: {e}")
        
        # Update post status
        if errors and not results:
            # All failed
            new_status = "failed"
            error_message = "; ".join(errors)
        elif errors and results:
            # Partial success
            new_status = "partial"
            error_message = "; ".join(errors)
        else:
            # All succeeded
            new_status = "published"
            error_message = None
        
        await db.scheduled_posts.update_one(
            {"id": post_id},
            {"$set": {
                "status": new_status,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "publish_results": results,
                "error_message": error_message,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Post {post_id} status: {new_status}")
    
    async def publish_to_facebook(
        self, 
        account: dict, 
        account_id: str,
        content: str, 
        media_urls: list
    ) -> dict:
        """Publish to Facebook page"""
        # Get decrypted access token
        access_token = get_account_access_token(account)
        page_id = account.get("external_id")
        
        if not access_token:
            return {"error": "No access token for page"}
        
        if not page_id:
            return {"error": "No page ID found"}
        
        logger.info(f"Publishing to Facebook page {page_id}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                if media_urls:
                    # Post with media
                    photo_url = media_urls[0]
                    response = await client.post(
                        f"https://graph.facebook.com/v20.0/{page_id}/photos",
                        params={
                            "url": photo_url,
                            "message": content,
                            "access_token": access_token
                        }
                    )
                else:
                    # Text only post
                    response = await client.post(
                        f"https://graph.facebook.com/v20.0/{page_id}/feed",
                        params={
                            "message": content,
                            "access_token": access_token
                        }
                    )
                
                if response.status_code != 200:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", response.text)
                    logger.error(f"Facebook API error: {error_msg}")
                    return {"error": error_msg}
                
                result = response.json()
                return {
                    "id": result.get("id") or result.get("post_id"),
                    "url": f"https://facebook.com/{result.get('id', '')}"
                }
            except Exception as e:
                logger.error(f"Facebook publish error: {e}")
                return {"error": str(e)}
    
    async def publish_to_instagram(
        self, 
        account: dict, 
        content: str, 
        media_urls: list
    ) -> dict:
        """Publish to Instagram (requires media)"""
        if not media_urls:
            return {"error": "Instagram requires media for publishing"}
        
        # In new architecture, Instagram accounts are stored separately
        # with account_type = "instagram_business"
        ig_id = account.get("external_id")
        access_token = get_account_access_token(account)
        
        if not ig_id:
            return {"error": "No Instagram account ID found"}
        
        if not access_token:
            return {"error": "No access token for Instagram"}
        
        logger.info(f"Publishing to Instagram account {ig_id}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # Step 1: Create media container
                container_response = await client.post(
                    f"https://graph.facebook.com/v20.0/{ig_id}/media",
                    params={
                        "image_url": media_urls[0],
                        "caption": content,
                        "access_token": access_token
                    }
                )
                
                if container_response.status_code != 200:
                    error_data = container_response.json()
                    error_msg = error_data.get("error", {}).get("message", container_response.text)
                    return {"error": f"Container creation failed: {error_msg}"}
                
                container_id = container_response.json().get("id")
                
                # Step 2: Publish the container
                publish_response = await client.post(
                    f"https://graph.facebook.com/v20.0/{ig_id}/media_publish",
                    params={
                        "creation_id": container_id,
                        "access_token": access_token
                    }
                )
                
                if publish_response.status_code != 200:
                    error_data = publish_response.json()
                    error_msg = error_data.get("error", {}).get("message", publish_response.text)
                    return {"error": f"Publishing failed: {error_msg}"}
                
                result = publish_response.json()
                return {
                    "id": result.get("id"),
                    "url": f"https://instagram.com"
                }
            except Exception as e:
                logger.error(f"Instagram publish error: {e}")
                return {"error": str(e)}
    
    async def publish_to_linkedin(
        self, 
        account: dict, 
        content: str, 
        media_urls: list
    ) -> dict:
        """Publish to LinkedIn"""
        access_token = get_account_access_token(account)
        linkedin_id = account.get("external_id")
        
        if not access_token:
            return {"error": "No LinkedIn access token"}
        
        if not linkedin_id:
            return {"error": "No LinkedIn user ID"}
        
        logger.info(f"Publishing to LinkedIn user {linkedin_id}")
        
        post_payload = {
            "author": f"urn:li:person:{linkedin_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": content
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
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
                    error_text = response.text
                    logger.error(f"LinkedIn API error: {error_text}")
                    return {"error": f"LinkedIn API error: {error_text[:200]}"}
                
                result = response.json()
                return {
                    "id": result.get("id"),
                    "url": "https://linkedin.com"
                }
            except Exception as e:
                logger.error(f"LinkedIn publish error: {e}")
                return {"error": str(e)}
    
    async def publish_to_tiktok(
        self, 
        account: dict, 
        content: str, 
        media_urls: list
    ) -> dict:
        """Publish to TikTok (video only)"""
        if not media_urls:
            return {"error": "TikTok requires a video URL"}
        
        # TikTok requires video.publish scope which needs app review
        return {
            "error": "TikTok publishing requires app review. Please publish manually or wait for approval."
        }


# FastAPI endpoints for worker management
from fastapi import APIRouter, BackgroundTasks

worker_router = APIRouter(prefix="/social/worker", tags=["Publication Worker"])

# Global worker instance
_worker: Optional[PublicationWorker] = None


@worker_router.post("/start")
async def start_worker(background_tasks: BackgroundTasks):
    """Start the publication worker"""
    global _worker
    
    if _worker and _worker.running:
        return {"message": "Worker already running"}
    
    _worker = PublicationWorker(check_interval=60)
    background_tasks.add_task(_worker.start)
    
    return {"message": "Worker started", "check_interval": 60}


@worker_router.post("/stop")
async def stop_worker():
    """Stop the publication worker"""
    global _worker
    
    if not _worker or not _worker.running:
        return {"message": "Worker not running"}
    
    _worker.stop()
    return {"message": "Worker stopped"}


@worker_router.get("/status")
async def get_worker_status():
    """Get worker status"""
    global _worker
    
    return {
        "running": _worker.running if _worker else False,
        "check_interval": _worker.check_interval if _worker else None
    }


@worker_router.post("/process-now")
async def process_now():
    """Manually trigger post processing"""
    worker = PublicationWorker()
    await worker.process_scheduled_posts()
    return {"message": "Processing completed"}


@worker_router.get("/queue")
async def get_publication_queue():
    """Get posts waiting to be published"""
    now = datetime.now(timezone.utc)
    
    # Scheduled posts
    cursor = db.scheduled_posts.find(
        {"status": "scheduled"},
        {"_id": 0}
    ).sort("scheduled_at", 1).limit(50)
    
    scheduled = await cursor.to_list(length=50)
    
    # Recently published
    cursor = db.scheduled_posts.find(
        {"status": {"$in": ["published", "failed", "partial"]}},
        {"_id": 0}
    ).sort("published_at", -1).limit(20)
    
    recent = await cursor.to_list(length=20)
    
    return {
        "scheduled": scheduled,
        "recent": recent,
        "current_time": now.isoformat()
    }


@worker_router.get("/errors")
async def get_publication_errors():
    """Get posts with publication errors"""
    
    # Posts with errors
    cursor = db.scheduled_posts.find(
        {"$or": [
            {"status": "failed"},
            {"status": "partial"},
            {"error_message": {"$ne": None}}
        ]},
        {"_id": 0}
    ).sort("updated_at", -1).limit(50)
    
    error_posts = await cursor.to_list(length=50)
    
    return {
        "error_posts": error_posts,
        "total": len(error_posts)
    }


@worker_router.post("/retry/{post_id}")
async def retry_publication(post_id: str):
    """Retry publishing a failed post"""
    
    post = await db.scheduled_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.get("status") not in ["failed", "partial", "publishing"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Post is not in a retryable state")
    
    # Reset status and retry
    await db.scheduled_posts.update_one(
        {"id": post_id},
        {"$set": {
            "status": "publishing",
            "error_message": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Publish immediately
    worker = PublicationWorker()
    updated_post = await db.scheduled_posts.find_one({"id": post_id}, {"_id": 0})
    await worker.publish_post(updated_post)
    
    # Get updated status
    final_post = await db.scheduled_posts.find_one({"id": post_id}, {"_id": 0})
    
    return {
        "message": "Retry completed",
        "post": final_post
    }

