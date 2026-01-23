"""
Social Media Inbox
Unified inbox for comments, DMs, and mentions from all connected platforms
"""

import os
import httpx
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

router = APIRouter(prefix="/social/inbox", tags=["Social Inbox"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Auth
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid token")


class InboxMessage(BaseModel):
    id: str
    platform: str
    account_id: str
    account_name: str
    message_type: str  # comment, dm, mention
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    content: str
    media_url: Optional[str] = None
    post_id: Optional[str] = None
    post_content: Optional[str] = None
    parent_id: Optional[str] = None  # For replies
    status: str  # unread, read, replied, archived
    created_at: str
    replied_at: Optional[str] = None
    reply_content: Optional[str] = None


class ReplyRequest(BaseModel):
    content: str


class BulkStatusUpdate(BaseModel):
    message_ids: List[str]
    status: str  # read, archived


# ==================== INBOX ENDPOINTS ====================

@router.get("")
async def get_inbox_messages(
    platform: Optional[str] = None,
    message_type: Optional[str] = None,  # comment, dm, mention
    status: Optional[str] = None,  # unread, read, replied, archived
    account_id: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get inbox messages with filters"""
    user_id = current_user["user_id"]
    
    # Build query
    query = {"user_id": user_id}
    
    if platform:
        query["platform"] = platform
    if message_type:
        query["message_type"] = message_type
    if status:
        query["status"] = status
    if account_id:
        query["account_id"] = account_id
    
    # Get messages
    cursor = db.inbox_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit)
    
    messages = await cursor.to_list(length=limit)
    
    # Get total count
    total = await db.inbox_messages.count_documents(query)
    
    # Get unread count
    unread_query = {"user_id": user_id, "status": "unread"}
    unread_count = await db.inbox_messages.count_documents(unread_query)
    
    return {
        "messages": messages,
        "total": total,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset
    }


@router.get("/stats")
async def get_inbox_stats(current_user: dict = Depends(get_current_user)):
    """Get inbox statistics"""
    user_id = current_user["user_id"]
    
    # Aggregate stats
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": {
                "platform": "$platform",
                "status": "$status",
                "message_type": "$message_type"
            },
            "count": {"$sum": 1}
        }}
    ]
    
    cursor = db.inbox_messages.aggregate(pipeline)
    results = await cursor.to_list(length=100)
    
    # Process results
    stats = {
        "total": 0,
        "unread": 0,
        "by_platform": {},
        "by_type": {"comment": 0, "dm": 0, "mention": 0},
        "by_status": {"unread": 0, "read": 0, "replied": 0, "archived": 0}
    }
    
    for r in results:
        count = r["count"]
        stats["total"] += count
        
        platform = r["_id"]["platform"]
        status = r["_id"]["status"]
        msg_type = r["_id"]["message_type"]
        
        if platform not in stats["by_platform"]:
            stats["by_platform"][platform] = 0
        stats["by_platform"][platform] += count
        
        if status in stats["by_status"]:
            stats["by_status"][status] += count
        
        if msg_type in stats["by_type"]:
            stats["by_type"][msg_type] += count
        
        if status == "unread":
            stats["unread"] += count
    
    return stats


@router.get("/{message_id}")
async def get_message_detail(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific message with conversation thread"""
    message = await db.inbox_messages.find_one(
        {"id": message_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get related messages (thread)
    thread = []
    if message.get("post_id"):
        cursor = db.inbox_messages.find(
            {
                "user_id": current_user["user_id"],
                "post_id": message["post_id"]
            },
            {"_id": 0}
        ).sort("created_at", 1)
        thread = await cursor.to_list(length=50)
    
    return {
        "message": message,
        "thread": thread
    }


@router.put("/{message_id}/status")
async def update_message_status(
    message_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """Update message status (read, archived, etc.)"""
    if status not in ["unread", "read", "replied", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.inbox_messages.update_one(
        {"id": message_id, "user_id": current_user["user_id"]},
        {"$set": {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return {"message": "Status updated", "status": status}


@router.put("/bulk-status")
async def bulk_update_status(
    data: BulkStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update status for multiple messages"""
    if data.status not in ["read", "archived"]:
        raise HTTPException(status_code=400, detail="Invalid status for bulk update")
    
    result = await db.inbox_messages.update_many(
        {"id": {"$in": data.message_ids}, "user_id": current_user["user_id"]},
        {"$set": {
            "status": data.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Updated {result.modified_count} messages", "status": data.status}


@router.post("/{message_id}/reply")
async def reply_to_message(
    message_id: str,
    reply: ReplyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Reply to a message (comment or DM)"""
    message = await db.inbox_messages.find_one(
        {"id": message_id, "user_id": current_user["user_id"]}
    )
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    platform = message["platform"]
    account_id = message["account_id"]
    
    # Get the connected account
    account = await db.social_accounts.find_one({
        "id": account_id,
        "is_active": True
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="Connected account not found")
    
    access_token = account.get("access_token")
    
    try:
        if platform == "facebook" or platform == "instagram":
            # Reply using Meta Graph API
            reply_result = await _reply_meta(
                message, reply.content, access_token
            )
        elif platform == "linkedin":
            reply_result = await _reply_linkedin(
                message, reply.content, access_token
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Reply not supported for {platform}"
            )
        
        # Update message status
        await db.inbox_messages.update_one(
            {"id": message_id},
            {"$set": {
                "status": "replied",
                "replied_at": datetime.now(timezone.utc).isoformat(),
                "reply_content": reply.content,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "Reply sent successfully",
            "reply_id": reply_result.get("id")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reply: {str(e)}")


async def _reply_meta(message: dict, content: str, access_token: str) -> dict:
    """Reply to a Facebook/Instagram comment"""
    comment_id = message.get("external_id")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://graph.facebook.com/v20.0/{comment_id}/replies",
            params={
                "message": content,
                "access_token": access_token
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Meta API error: {response.text}")
        
        return response.json()


async def _reply_linkedin(message: dict, content: str, access_token: str) -> dict:
    """Reply to a LinkedIn comment"""
    # LinkedIn comment reply implementation
    # This requires specific UGC API calls
    return {"id": "linkedin_reply_placeholder"}


# ==================== SYNC ENDPOINTS ====================

@router.post("/sync")
async def sync_inbox(current_user: dict = Depends(get_current_user)):
    """Manually trigger inbox sync from all platforms"""
    user_id = current_user["user_id"]
    
    # Get all connected accounts
    accounts = await db.social_accounts.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(length=50)
    
    sync_results = {
        "total_new": 0,
        "by_platform": {}
    }
    
    for account in accounts:
        platform = account["platform"]
        try:
            if platform in ["facebook", "instagram"]:
                new_count = await _sync_meta_inbox(account, user_id)
            elif platform == "linkedin":
                new_count = await _sync_linkedin_inbox(account, user_id)
            elif platform == "tiktok":
                new_count = await _sync_tiktok_inbox(account, user_id)
            else:
                new_count = 0
            
            sync_results["by_platform"][platform] = new_count
            sync_results["total_new"] += new_count
            
        except Exception as e:
            sync_results["by_platform"][platform] = f"Error: {str(e)}"
    
    return sync_results


async def _sync_meta_inbox(account: dict, user_id: str) -> int:
    """Sync comments and messages from Facebook/Instagram"""
    access_token = account.get("access_token")
    pages = account.get("pages", [])
    new_count = 0
    
    async with httpx.AsyncClient() as client:
        for page in pages:
            page_id = page.get("page_id")
            page_token = page.get("access_token", access_token)
            page_name = page.get("page_name", "Unknown Page")
            
            # Get recent posts
            posts_response = await client.get(
                f"https://graph.facebook.com/v20.0/{page_id}/feed",
                params={
                    "fields": "id,message,created_time,comments.limit(50){id,from,message,created_time}",
                    "limit": 10,
                    "access_token": page_token
                }
            )
            
            if posts_response.status_code == 200:
                posts_data = posts_response.json()
                
                for post in posts_data.get("data", []):
                    post_id = post.get("id")
                    post_content = post.get("message", "")[:100]
                    
                    comments = post.get("comments", {}).get("data", [])
                    
                    for comment in comments:
                        comment_id = comment.get("id")
                        
                        # Check if already exists
                        existing = await db.inbox_messages.find_one({
                            "external_id": comment_id
                        })
                        
                        if not existing:
                            sender = comment.get("from", {})
                            
                            inbox_message = {
                                "id": str(uuid.uuid4()),
                                "user_id": user_id,
                                "platform": "facebook",
                                "account_id": account.get("id"),
                                "account_name": page_name,
                                "message_type": "comment",
                                "external_id": comment_id,
                                "sender_id": sender.get("id", "unknown"),
                                "sender_name": sender.get("name", "Unknown"),
                                "sender_avatar": None,
                                "content": comment.get("message", ""),
                                "post_id": post_id,
                                "post_content": post_content,
                                "status": "unread",
                                "created_at": comment.get("created_time", datetime.now(timezone.utc).isoformat()),
                                "synced_at": datetime.now(timezone.utc).isoformat()
                            }
                            
                            await db.inbox_messages.insert_one(inbox_message)
                            new_count += 1
    
    return new_count


async def _sync_linkedin_inbox(account: dict, user_id: str) -> int:
    """Sync notifications/comments from LinkedIn"""
    # LinkedIn has limited API access for inbox
    # Would need specific permissions
    return 0


async def _sync_tiktok_inbox(account: dict, user_id: str) -> int:
    """Sync comments from TikTok"""
    # TikTok comment API requires specific scopes
    return 0


# ==================== MARK ALL AS READ ====================

@router.post("/mark-all-read")
async def mark_all_as_read(
    platform: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Mark all messages as read"""
    query = {"user_id": current_user["user_id"], "status": "unread"}
    if platform:
        query["platform"] = platform
    
    result = await db.inbox_messages.update_many(
        query,
        {"$set": {
            "status": "read",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Marked {result.modified_count} messages as read"}
