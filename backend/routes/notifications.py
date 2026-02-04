"""
MoltBot Notifications System
Real-time notifications for CRM events via WebSocket and push notifications
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import asyncio
import json
import uuid
import logging

from .database import db

router = APIRouter(prefix="/notifications", tags=["Notifications"])
logger = logging.getLogger(__name__)

# ==================== CONNECTION MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}  # user_id -> [websockets]
        self.notification_queue: Dict[str, List[Dict]] = {}  # user_id -> [notifications]
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}")
        
        # Send any queued notifications
        if user_id in self.notification_queue:
            for notif in self.notification_queue[user_id]:
                await websocket.send_json(notif)
            self.notification_queue[user_id] = []
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_notification(self, user_id: str, notification: Dict):
        """Send notification to user via WebSocket or queue if offline"""
        if user_id in self.active_connections:
            dead_sockets = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(notification)
                except Exception as e:
                    logger.error(f"WebSocket send error: {e}")
                    dead_sockets.append(ws)
            
            # Clean up dead connections
            for ws in dead_sockets:
                self.active_connections[user_id].remove(ws)
        else:
            # Queue for later
            if user_id not in self.notification_queue:
                self.notification_queue[user_id] = []
            self.notification_queue[user_id].append(notification)
            # Keep max 50 queued notifications
            if len(self.notification_queue[user_id]) > 50:
                self.notification_queue[user_id] = self.notification_queue[user_id][-50:]
    
    async def broadcast(self, notification: Dict, exclude_user: str = None):
        """Send notification to all connected users"""
        for user_id in list(self.active_connections.keys()):
            if user_id != exclude_user:
                await self.send_notification(user_id, notification)

manager = ConnectionManager()

# ==================== MODELS ====================

class NotificationCreate(BaseModel):
    type: str  # lead_new, payment_received, task_due, email_processed, voice_crm, churn_alert, etc.
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    priority: Optional[str] = "normal"  # low, normal, high, urgent
    target_users: Optional[List[str]] = None  # None = all admins

class NotificationPreferences(BaseModel):
    new_leads: bool = True
    payments: bool = True
    task_reminders: bool = True
    email_processed: bool = True
    voice_crm: bool = True
    churn_alerts: bool = True
    daily_digest: bool = True
    sound: bool = True

# ==================== WEBSOCKET ENDPOINT ====================

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket connection for real-time notifications"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive, listen for any messages
            data = await websocket.receive_text()
            
            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
            
            # Handle acknowledgment
            elif data.startswith("ack:"):
                notif_id = data.split(":")[1]
                await mark_notification_read(notif_id, user_id)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_id)

# ==================== REST ENDPOINTS ====================

@router.get("/")
async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    """Get notifications for a user"""
    if not user_id:
        user_id = "admin"  # Default to admin
    
    query = {"target_users": {"$in": [user_id, "all"]}}
    if unread_only:
        query["read_by"] = {"$ne": user_id}
    
    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unread_count = await db.notifications.count_documents({
        "target_users": {"$in": [user_id, "all"]},
        "read_by": {"$ne": user_id}
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@router.post("/")
async def create_notification(data: NotificationCreate):
    """Create and send a new notification"""
    notification = {
        "id": str(uuid.uuid4()),
        "type": data.type,
        "title": data.title,
        "message": data.message,
        "data": data.data or {},
        "priority": data.priority,
        "target_users": data.target_users or ["all"],
        "read_by": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save to database
    await db.notifications.insert_one(notification)
    
    # Send via WebSocket
    if data.target_users:
        for user_id in data.target_users:
            await manager.send_notification(user_id, notification)
    else:
        await manager.broadcast(notification)
    
    return {"success": True, "notification_id": notification["id"]}

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    """Mark a notification as read"""
    if not user_id:
        user_id = "admin"
    
    await db.notifications.update_one(
        {"id": notification_id},
        {"$addToSet": {"read_by": user_id}}
    )
    
    return {"success": True}

@router.put("/read-all")
async def mark_all_read(user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Mark all notifications as read for a user"""
    if not user_id:
        user_id = "admin"
    
    await db.notifications.update_many(
        {"target_users": {"$in": [user_id, "all"]}},
        {"$addToSet": {"read_by": user_id}}
    )
    
    return {"success": True}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification"""
    await db.notifications.delete_one({"id": notification_id})
    return {"success": True}

@router.get("/preferences")
async def get_preferences(user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Get notification preferences for a user"""
    if not user_id:
        user_id = "admin"
    
    prefs = await db.notification_preferences.find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    
    if not prefs:
        prefs = {
            "user_id": user_id,
            "new_leads": True,
            "payments": True,
            "task_reminders": True,
            "email_processed": True,
            "voice_crm": True,
            "churn_alerts": True,
            "daily_digest": True,
            "sound": True
        }
    
    return prefs

@router.put("/preferences")
async def update_preferences(
    data: NotificationPreferences,
    user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    """Update notification preferences"""
    if not user_id:
        user_id = "admin"
    
    prefs = {
        "user_id": user_id,
        **data.dict(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notification_preferences.update_one(
        {"user_id": user_id},
        {"$set": prefs},
        upsert=True
    )
    
    return {"success": True, "preferences": prefs}

# ==================== NOTIFICATION TRIGGERS ====================
# These functions are called by other parts of the system

async def notify_new_lead(contact_data: Dict):
    """Send notification when a new lead is created"""
    notification = NotificationCreate(
        type="lead_new",
        title="🎯 Nouveau lead !",
        message=f"{contact_data.get('first_name', '')} {contact_data.get('last_name', '')} de {contact_data.get('company', 'N/A')}",
        data={"contact_id": contact_data.get("id")},
        priority="high"
    )
    await create_notification(notification)

async def notify_payment_received(invoice_data: Dict):
    """Send notification when a payment is received"""
    notification = NotificationCreate(
        type="payment_received",
        title="💰 Paiement reçu !",
        message=f"{invoice_data.get('number')} - {invoice_data.get('total', 0):.2f}€ de {invoice_data.get('client_name')}",
        data={"invoice_id": invoice_data.get("id")},
        priority="high"
    )
    await create_notification(notification)

async def notify_email_processed(action: str, count: int, details: str = ""):
    """Send notification when MoltBot processes emails"""
    actions_labels = {
        "clean": "📧 Emails nettoyés",
        "unsubscribe": "📬 Désabonnements effectués",
        "send": "✉️ Email envoyé"
    }
    notification = NotificationCreate(
        type="email_processed",
        title=actions_labels.get(action, "📧 Action Gmail"),
        message=f"{count} email(s) traité(s). {details}",
        data={"action": action, "count": count},
        priority="normal"
    )
    await create_notification(notification)

async def notify_voice_crm_created(action: str, details: Dict):
    """Send notification when Voice-to-CRM creates an entry"""
    action_labels = {
        "contact": "👤 Contact créé",
        "task": "✅ Tâche créée",
        "note": "📝 Note ajoutée",
        "appointment": "📅 RDV créé",
        "invoice": "📄 Devis créé"
    }
    notification = NotificationCreate(
        type="voice_crm",
        title=action_labels.get(action, "🎤 Voice CRM"),
        message=details.get("message", "Entrée créée via commande vocale"),
        data=details,
        priority="normal"
    )
    await create_notification(notification)

async def notify_churn_alert(client_data: Dict, risk_score: float):
    """Send notification for churn risk alert"""
    notification = NotificationCreate(
        type="churn_alert",
        title="⚠️ Alerte Churn",
        message=f"{client_data.get('first_name', '')} {client_data.get('last_name', '')} - Risque: {risk_score:.0%}",
        data={"contact_id": client_data.get("id"), "risk_score": risk_score},
        priority="urgent"
    )
    await create_notification(notification)

async def notify_task_due(task_data: Dict):
    """Send notification when a task is due"""
    notification = NotificationCreate(
        type="task_due",
        title="⏰ Tâche échue",
        message=task_data.get("title", "Tâche sans titre"),
        data={"task_id": task_data.get("id")},
        priority="high"
    )
    await create_notification(notification)
