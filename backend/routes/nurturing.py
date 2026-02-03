"""
Email Nurturing Automation System
Automated email sequences for lead nurturing

Features:
- Create and manage email sequences
- Automated triggers based on lead score, actions, time
- Personalized email templates with variables
- Analytics and performance tracking
- Integration with Brevo (SendinBlue) for email delivery
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import logging
import os
import asyncio
import re

from .database import db, get_current_user

router = APIRouter(prefix="/nurturing", tags=["Nurturing"])
logger = logging.getLogger(__name__)

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "contact@alphagency.fr")
SENDER_NAME = os.environ.get("SENDER_NAME", "Alpha Agency")

# ===========================================
# MODELS
# ===========================================

class TriggerType(str, Enum):
    LEAD_CREATED = "lead_created"
    LEAD_SCORE_ABOVE = "lead_score_above"
    LEAD_SCORE_BELOW = "lead_score_below"
    NO_ACTIVITY = "no_activity"
    QUOTE_SENT = "quote_sent"
    QUOTE_VIEWED = "quote_viewed"
    QUOTE_REJECTED = "quote_rejected"
    MANUAL = "manual"
    SCHEDULED = "scheduled"

class SequenceStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

class EmailStep(BaseModel):
    id: Optional[str] = None
    delay_days: int = 0
    delay_hours: int = 0
    subject: str
    body_html: str
    body_text: Optional[str] = None
    order: int = 0

class SequenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: TriggerType
    trigger_value: Optional[str] = None  # e.g., "70" for score threshold
    steps: List[EmailStep]
    filter_tags: Optional[List[str]] = []  # Only apply to contacts with these tags
    exclude_tags: Optional[List[str]] = []  # Exclude contacts with these tags

class SequenceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[SequenceStatus] = None
    trigger_type: Optional[TriggerType] = None
    trigger_value: Optional[str] = None
    steps: Optional[List[EmailStep]] = None
    filter_tags: Optional[List[str]] = None
    exclude_tags: Optional[List[str]] = None

class EnrollContact(BaseModel):
    contact_id: str
    sequence_id: str
    start_immediately: bool = True

# ===========================================
# HELPER FUNCTIONS
# ===========================================

def get_user_id(user: dict) -> str:
    return user.get("user_id") or user.get("id") or str(user.get("_id", ""))

def personalize_content(content: str, contact: dict) -> str:
    """Replace variables in content with contact data"""
    replacements = {
        "{{first_name}}": contact.get("first_name", ""),
        "{{last_name}}": contact.get("last_name", ""),
        "{{full_name}}": f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
        "{{email}}": contact.get("email", ""),
        "{{company}}": contact.get("company", ""),
        "{{phone}}": contact.get("phone", ""),
        "{{titre}}": contact.get("title", ""),
    }
    
    for var, value in replacements.items():
        content = content.replace(var, value or "")
    
    # Clean up any remaining variables
    content = re.sub(r'\{\{[^}]+\}\}', '', content)
    
    return content

async def send_nurturing_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """Send email via Brevo API"""
    import httpx
    
    if not BREVO_API_KEY:
        logger.warning("No Brevo API key configured")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": BREVO_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
                    "to": [{"email": to_email, "name": to_name}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "textContent": text_content or "",
                    "tags": ["nurturing"]
                }
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Nurturing email sent to {to_email}")
                return True
            else:
                logger.error(f"Email send failed: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return False

async def process_enrollment_step(enrollment_id: str):
    """Process the next step in an enrollment"""
    enrollment = await db.nurturing_enrollments.find_one({"id": enrollment_id})
    if not enrollment or enrollment.get("status") != "active":
        return
    
    sequence = await db.nurturing_sequences.find_one({"id": enrollment["sequence_id"]})
    if not sequence or sequence.get("status") != "active":
        return
    
    contact = await db.contacts.find_one({"id": enrollment["contact_id"]})
    if not contact or not contact.get("email"):
        await db.nurturing_enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {"status": "failed", "error": "Contact sans email"}}
        )
        return
    
    current_step = enrollment.get("current_step", 0)
    steps = sequence.get("steps", [])
    
    if current_step >= len(steps):
        # Sequence completed
        await db.nurturing_enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return
    
    step = steps[current_step]
    
    # Personalize content
    subject = personalize_content(step["subject"], contact)
    body_html = personalize_content(step["body_html"], contact)
    body_text = personalize_content(step.get("body_text", ""), contact) if step.get("body_text") else None
    
    # Send email
    contact_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    success = await send_nurturing_email(
        to_email=contact["email"],
        to_name=contact_name or "Client",
        subject=subject,
        html_content=body_html,
        text_content=body_text
    )
    
    # Log the email
    await db.nurturing_emails_sent.insert_one({
        "id": str(uuid.uuid4()),
        "enrollment_id": enrollment_id,
        "sequence_id": enrollment["sequence_id"],
        "contact_id": enrollment["contact_id"],
        "step_index": current_step,
        "subject": subject,
        "success": success,
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    if success:
        # Move to next step
        next_step = current_step + 1
        
        if next_step >= len(steps):
            # Completed
            await db.nurturing_enrollments.update_one(
                {"id": enrollment_id},
                {"$set": {
                    "current_step": next_step,
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            # Schedule next step
            next_step_data = steps[next_step]
            delay_seconds = (next_step_data.get("delay_days", 0) * 86400 + 
                           next_step_data.get("delay_hours", 0) * 3600)
            next_send = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
            
            await db.nurturing_enrollments.update_one(
                {"id": enrollment_id},
                {"$set": {
                    "current_step": next_step,
                    "next_send_at": next_send.isoformat(),
                    "last_email_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    else:
        # Mark as failed
        await db.nurturing_enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {
                "status": "failed",
                "error": "Email delivery failed"
            }}
        )

# ===========================================
# SEQUENCE CRUD
# ===========================================

@router.post("/sequences")
async def create_sequence(
    sequence: SequenceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new nurturing sequence"""
    user_id = get_user_id(current_user)
    
    # Add IDs to steps
    steps_with_ids = []
    for i, step in enumerate(sequence.steps):
        step_dict = step.dict()
        step_dict["id"] = str(uuid.uuid4())
        step_dict["order"] = i
        steps_with_ids.append(step_dict)
    
    seq_data = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": sequence.name,
        "description": sequence.description,
        "trigger_type": sequence.trigger_type.value,
        "trigger_value": sequence.trigger_value,
        "steps": steps_with_ids,
        "filter_tags": sequence.filter_tags or [],
        "exclude_tags": sequence.exclude_tags or [],
        "status": "draft",
        "stats": {
            "enrolled": 0,
            "completed": 0,
            "emails_sent": 0,
            "opens": 0,
            "clicks": 0
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.nurturing_sequences.insert_one(seq_data)
    
    return {"success": True, "sequence": {**seq_data, "_id": None}}

@router.get("/sequences")
async def list_sequences(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all nurturing sequences"""
    user_id = get_user_id(current_user)
    
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    sequences = await db.nurturing_sequences.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"sequences": sequences, "count": len(sequences)}

@router.get("/sequences/{sequence_id}")
async def get_sequence(
    sequence_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get sequence details"""
    user_id = get_user_id(current_user)
    
    sequence = await db.nurturing_sequences.find_one(
        {"id": sequence_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Séquence non trouvée")
    
    # Get enrollment stats
    enrollments = await db.nurturing_enrollments.find(
        {"sequence_id": sequence_id}
    ).to_list(1000)
    
    stats = {
        "enrolled": len(enrollments),
        "active": len([e for e in enrollments if e.get("status") == "active"]),
        "completed": len([e for e in enrollments if e.get("status") == "completed"]),
        "failed": len([e for e in enrollments if e.get("status") == "failed"])
    }
    
    return {**sequence, "stats": stats}

@router.put("/sequences/{sequence_id}")
async def update_sequence(
    sequence_id: str,
    update: SequenceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a sequence"""
    user_id = get_user_id(current_user)
    
    sequence = await db.nurturing_sequences.find_one(
        {"id": sequence_id, "user_id": user_id}
    )
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Séquence non trouvée")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if "steps" in update_data:
        # Add IDs to new steps
        steps_with_ids = []
        for i, step in enumerate(update_data["steps"]):
            if isinstance(step, dict):
                step["id"] = step.get("id") or str(uuid.uuid4())
                step["order"] = i
                steps_with_ids.append(step)
        update_data["steps"] = steps_with_ids
    
    if "trigger_type" in update_data:
        update_data["trigger_type"] = update_data["trigger_type"].value if hasattr(update_data["trigger_type"], 'value') else update_data["trigger_type"]
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], 'value') else update_data["status"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.nurturing_sequences.update_one(
        {"id": sequence_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Séquence mise à jour"}

@router.delete("/sequences/{sequence_id}")
async def delete_sequence(
    sequence_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a sequence"""
    user_id = get_user_id(current_user)
    
    result = await db.nurturing_sequences.delete_one(
        {"id": sequence_id, "user_id": user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Séquence non trouvée")
    
    # Cancel active enrollments
    await db.nurturing_enrollments.update_many(
        {"sequence_id": sequence_id, "status": "active"},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"success": True, "message": "Séquence supprimée"}

@router.post("/sequences/{sequence_id}/activate")
async def activate_sequence(
    sequence_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Activate a sequence"""
    user_id = get_user_id(current_user)
    
    result = await db.nurturing_sequences.update_one(
        {"id": sequence_id, "user_id": user_id},
        {"$set": {"status": "active", "activated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Séquence non trouvée")
    
    return {"success": True, "message": "Séquence activée"}

@router.post("/sequences/{sequence_id}/pause")
async def pause_sequence(
    sequence_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Pause a sequence"""
    user_id = get_user_id(current_user)
    
    result = await db.nurturing_sequences.update_one(
        {"id": sequence_id, "user_id": user_id},
        {"$set": {"status": "paused"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Séquence non trouvée")
    
    return {"success": True, "message": "Séquence en pause"}

# ===========================================
# ENROLLMENTS
# ===========================================

@router.post("/enroll")
async def enroll_contact(
    enrollment: EnrollContact,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Enroll a contact in a nurturing sequence"""
    user_id = get_user_id(current_user)
    
    # Verify sequence exists and is active
    sequence = await db.nurturing_sequences.find_one(
        {"id": enrollment.sequence_id, "user_id": user_id}
    )
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Séquence non trouvée")
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": enrollment.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    
    if not contact.get("email"):
        raise HTTPException(status_code=400, detail="Le contact n'a pas d'email")
    
    # Check if already enrolled
    existing = await db.nurturing_enrollments.find_one({
        "contact_id": enrollment.contact_id,
        "sequence_id": enrollment.sequence_id,
        "status": "active"
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Contact déjà inscrit à cette séquence")
    
    # Create enrollment
    enrollment_id = str(uuid.uuid4())
    enrollment_data = {
        "id": enrollment_id,
        "contact_id": enrollment.contact_id,
        "sequence_id": enrollment.sequence_id,
        "user_id": user_id,
        "status": "active",
        "current_step": 0,
        "enrolled_at": datetime.now(timezone.utc).isoformat(),
        "next_send_at": datetime.now(timezone.utc).isoformat() if enrollment.start_immediately else None
    }
    
    await db.nurturing_enrollments.insert_one(enrollment_data)
    
    # Update sequence stats
    await db.nurturing_sequences.update_one(
        {"id": enrollment.sequence_id},
        {"$inc": {"stats.enrolled": 1}}
    )
    
    # Process first step if starting immediately
    if enrollment.start_immediately:
        background_tasks.add_task(process_enrollment_step, enrollment_id)
    
    return {
        "success": True,
        "enrollment_id": enrollment_id,
        "message": f"Contact inscrit à la séquence '{sequence['name']}'"
    }

@router.get("/enrollments")
async def list_enrollments(
    sequence_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """List all enrollments"""
    user_id = get_user_id(current_user)
    
    query = {"user_id": user_id}
    if sequence_id:
        query["sequence_id"] = sequence_id
    if status:
        query["status"] = status
    
    enrollments = await db.nurturing_enrollments.find(
        query,
        {"_id": 0}
    ).sort("enrolled_at", -1).limit(limit).to_list(limit)
    
    # Enrich with contact and sequence info
    for enrollment in enrollments:
        contact = await db.contacts.find_one({"id": enrollment["contact_id"]}, {"_id": 0, "first_name": 1, "last_name": 1, "email": 1})
        enrollment["contact"] = contact
        
        sequence = await db.nurturing_sequences.find_one({"id": enrollment["sequence_id"]}, {"_id": 0, "name": 1})
        enrollment["sequence_name"] = sequence.get("name") if sequence else "Inconnue"
    
    return {"enrollments": enrollments, "count": len(enrollments)}

@router.post("/enrollments/{enrollment_id}/cancel")
async def cancel_enrollment(
    enrollment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel an enrollment"""
    user_id = get_user_id(current_user)
    
    result = await db.nurturing_enrollments.update_one(
        {"id": enrollment_id, "user_id": user_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inscription non trouvée")
    
    return {"success": True, "message": "Inscription annulée"}

# ===========================================
# EMAIL TEMPLATES
# ===========================================

@router.get("/templates")
async def get_email_templates(
    current_user: dict = Depends(get_current_user)
):
    """Get pre-built email templates"""
    templates = [
        {
            "id": "welcome",
            "name": "Email de bienvenue",
            "category": "Onboarding",
            "subject": "Bienvenue {{first_name}} ! 🎉",
            "body_html": """
<h2>Bonjour {{first_name}},</h2>
<p>Bienvenue chez Alpha Agency !</p>
<p>Nous sommes ravis de vous compter parmi nos contacts. N'hésitez pas à nous contacter si vous avez des questions.</p>
<p>À très bientôt,<br>L'équipe Alpha Agency</p>
"""
        },
        {
            "id": "followup_quote",
            "name": "Suivi devis",
            "category": "Commercial",
            "subject": "Avez-vous des questions sur notre proposition ?",
            "body_html": """
<h2>Bonjour {{first_name}},</h2>
<p>Je me permets de revenir vers vous suite à notre proposition.</p>
<p>Avez-vous eu le temps de l'examiner ? Je reste à votre disposition pour répondre à toutes vos questions.</p>
<p>Cordialement,<br>Alpha Agency</p>
"""
        },
        {
            "id": "reengagement",
            "name": "Réengagement",
            "category": "Rétention",
            "subject": "{{first_name}}, vous nous manquez !",
            "body_html": """
<h2>Bonjour {{first_name}},</h2>
<p>Cela fait un moment que nous n'avons pas eu de vos nouvelles.</p>
<p>Comment pouvons-nous vous aider ? Nous serions ravis de reprendre contact avec vous.</p>
<p>À bientôt,<br>L'équipe Alpha Agency</p>
"""
        },
        {
            "id": "thank_you",
            "name": "Remerciement client",
            "category": "Fidélisation",
            "subject": "Merci pour votre confiance {{first_name}} !",
            "body_html": """
<h2>Bonjour {{first_name}},</h2>
<p>Nous tenions à vous remercier sincèrement pour votre confiance.</p>
<p>Votre satisfaction est notre priorité. N'hésitez pas à nous faire part de vos retours.</p>
<p>Cordialement,<br>Alpha Agency</p>
"""
        }
    ]
    
    return {"templates": templates}

# ===========================================
# ANALYTICS
# ===========================================

@router.get("/analytics")
async def get_nurturing_analytics(
    period: str = "month",
    current_user: dict = Depends(get_current_user)
):
    """Get nurturing analytics"""
    user_id = get_user_id(current_user)
    
    # Get period start
    now = datetime.now(timezone.utc)
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    elif period == "quarter":
        start = now - timedelta(days=90)
    else:
        start = now - timedelta(days=30)
    
    start_iso = start.isoformat()
    
    # Count emails sent
    emails_sent = await db.nurturing_emails_sent.count_documents({
        "sent_at": {"$gte": start_iso}
    })
    
    # Success rate
    successful = await db.nurturing_emails_sent.count_documents({
        "sent_at": {"$gte": start_iso},
        "success": True
    })
    
    # Active sequences
    active_sequences = await db.nurturing_sequences.count_documents({
        "user_id": user_id,
        "status": "active"
    })
    
    # Active enrollments
    active_enrollments = await db.nurturing_enrollments.count_documents({
        "user_id": user_id,
        "status": "active"
    })
    
    # Completed enrollments
    completed = await db.nurturing_enrollments.count_documents({
        "user_id": user_id,
        "status": "completed",
        "completed_at": {"$gte": start_iso}
    })
    
    return {
        "period": period,
        "emails_sent": emails_sent,
        "delivery_rate": (successful / emails_sent * 100) if emails_sent > 0 else 0,
        "active_sequences": active_sequences,
        "active_enrollments": active_enrollments,
        "completed_this_period": completed
    }

# ===========================================
# SCHEDULER (called by background task)
# ===========================================

async def process_pending_enrollments():
    """Process all pending enrollment steps - called periodically"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find enrollments ready to send
    pending = await db.nurturing_enrollments.find({
        "status": "active",
        "next_send_at": {"$lte": now}
    }).to_list(100)
    
    for enrollment in pending:
        try:
            await process_enrollment_step(enrollment["id"])
        except Exception as e:
            logger.error(f"Error processing enrollment {enrollment['id']}: {e}")
    
    return len(pending)
