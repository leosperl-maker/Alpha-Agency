"""
Editorial Calendar routes - Social Media Content Planning
Multi-calendar system linked to contacts with posts management
"""

import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/editorial", tags=["Editorial Calendar"])

# ==================== LLM CONFIG ====================

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ==================== CLOUDINARY CONFIG ====================

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

# ==================== MODELS ====================

# Available niches for key dates generation
AVAILABLE_NICHES = [
    {"id": "restaurant", "name": "Restaurant / Bar", "icon": "🍽️"},
    {"id": "automobile", "name": "Automobile", "icon": "🚗"},
    {"id": "retail", "name": "Retail / Commerce", "icon": "🛍️"},
    {"id": "immobilier", "name": "Immobilier", "icon": "🏠"},
    {"id": "beaute", "name": "Beauté / Bien-être", "icon": "💄"},
    {"id": "fitness", "name": "Fitness / Sport", "icon": "💪"},
    {"id": "media", "name": "Médias / Entertainment", "icon": "🎬"},
    {"id": "tech", "name": "Tech / Startup", "icon": "💻"},
    {"id": "mode", "name": "Mode / Fashion", "icon": "👗"},
    {"id": "tourisme", "name": "Tourisme / Hôtellerie", "icon": "✈️"},
    {"id": "sante", "name": "Santé / Médical", "icon": "🏥"},
    {"id": "education", "name": "Éducation / Formation", "icon": "📚"},
    {"id": "artisanat", "name": "Artisanat / Local", "icon": "🎨"},
    {"id": "bnb", "name": "B2B / Services", "icon": "🤝"},
    {"id": "general", "name": "Généraliste", "icon": "📱"},
]

AVAILABLE_COUNTRIES = [
    {"id": "FR", "name": "France", "flag": "🇫🇷"},
    {"id": "GP", "name": "Guadeloupe", "flag": "🇬🇵"},
    {"id": "MQ", "name": "Martinique", "flag": "🇲🇶"},
    {"id": "BE", "name": "Belgique", "flag": "🇧🇪"},
    {"id": "CH", "name": "Suisse", "flag": "🇨🇭"},
    {"id": "CA", "name": "Canada", "flag": "🇨🇦"},
]

class CalendarCreate(BaseModel):
    title: str
    contact_id: Optional[str] = None
    description: Optional[str] = ""
    color: Optional[str] = "#6366f1"
    country: Optional[str] = "FR"  # Country code
    niche: Optional[str] = "general"  # Niche for key dates
    generate_key_dates: Optional[bool] = True  # Auto-generate key dates

class CalendarUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    archived: Optional[bool] = None
    country: Optional[str] = None
    niche: Optional[str] = None

class PostCreate(BaseModel):
    calendar_id: str
    title: str
    caption: Optional[str] = ""
    scheduled_date: Optional[str] = None  # ISO format
    scheduled_time: Optional[str] = None  # HH:MM
    networks: List[str] = []  # ["instagram", "facebook", "linkedin", "tiktok", "youtube"]
    format_type: str = "post"  # post, carrousel, reel, video, story, short
    content_pillar: Optional[str] = ""  # education, social_proof, offer, behind_scenes
    objective: Optional[str] = ""  # visibility, engagement, leads, sales
    cta: Optional[str] = ""
    status: str = "idea"  # idea, draft, in_progress, to_validate, validated, scheduled, published
    assigned_to: Optional[str] = None
    external_links: Optional[str] = ""
    notes: Optional[str] = ""

class PostUpdate(BaseModel):
    title: Optional[str] = None
    caption: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    networks: Optional[List[str]] = None
    format_type: Optional[str] = None
    content_pillar: Optional[str] = None
    objective: Optional[str] = None
    cta: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    external_links: Optional[str] = None
    notes: Optional[str] = None

class MediaReorder(BaseModel):
    media_ids: List[str]

# ==================== DEFAULT LISTS ====================

DEFAULT_NETWORKS = [
    {"id": "instagram", "name": "Instagram", "color": "#E4405F", "icon": "instagram"},
    {"id": "facebook", "name": "Facebook", "color": "#1877F2", "icon": "facebook"},
    {"id": "linkedin", "name": "LinkedIn", "color": "#0A66C2", "icon": "linkedin"},
    {"id": "tiktok", "name": "TikTok", "color": "#000000", "icon": "music"},
    {"id": "youtube", "name": "YouTube", "color": "#FF0000", "icon": "youtube"},
]

DEFAULT_FORMATS = [
    {"id": "post", "name": "Post simple", "icon": "image"},
    {"id": "carrousel", "name": "Carrousel", "icon": "images"},
    {"id": "reel", "name": "Reel / Short", "icon": "film"},
    {"id": "video", "name": "Vidéo", "icon": "video"},
    {"id": "story", "name": "Story", "icon": "circle"},
]

DEFAULT_STATUSES = [
    {"id": "idea", "name": "Idée", "color": "#9CA3AF"},
    {"id": "draft", "name": "À rédiger", "color": "#F59E0B"},
    {"id": "in_progress", "name": "En cours", "color": "#3B82F6"},
    {"id": "to_validate", "name": "À valider", "color": "#8B5CF6"},
    {"id": "validated", "name": "Validé", "color": "#10B981"},
    {"id": "scheduled", "name": "Programmé", "color": "#06B6D4"},
    {"id": "published", "name": "Publié", "color": "#22C55E"},
]

DEFAULT_PILLARS = [
    {"id": "education", "name": "Éducation", "color": "#3B82F6"},
    {"id": "social_proof", "name": "Preuve sociale", "color": "#10B981"},
    {"id": "offer", "name": "Offre / Promo", "color": "#F59E0B"},
    {"id": "behind_scenes", "name": "Coulisses", "color": "#8B5CF6"},
    {"id": "entertainment", "name": "Divertissement", "color": "#EC4899"},
    {"id": "inspiration", "name": "Inspiration", "color": "#06B6D4"},
]

DEFAULT_OBJECTIVES = [
    {"id": "visibility", "name": "Visibilité"},
    {"id": "engagement", "name": "Engagement"},
    {"id": "leads", "name": "Génération de leads"},
    {"id": "sales", "name": "Ventes"},
    {"id": "recruitment", "name": "Recrutement"},
    {"id": "branding", "name": "Image de marque"},
]

# Key Date model
class KeyDateCreate(BaseModel):
    date: str  # YYYY-MM-DD
    title: str
    category: str  # "generic" or "niche"
    niche_specific: Optional[str] = None  # Which niche this is for
    content_angle: Optional[str] = ""  # AI suggestion
    enabled: bool = True
    icon: Optional[str] = None

# ==================== SETTINGS ENDPOINTS ====================

@router.get("/niches")
async def get_available_niches(current_user: dict = Depends(get_current_user)):
    """Get available niches for calendar creation"""
    return {
        "niches": AVAILABLE_NICHES,
        "countries": AVAILABLE_COUNTRIES
    }

@router.get("/settings")
async def get_editorial_settings(current_user: dict = Depends(get_current_user)):
    """Get editorial calendar settings (networks, formats, statuses, etc.)"""
    settings = await db.settings.find_one({"type": "editorial_settings"})
    
    if not settings:
        # Initialize with defaults
        settings = {
            "type": "editorial_settings",
            "networks": DEFAULT_NETWORKS,
            "formats": DEFAULT_FORMATS,
            "statuses": DEFAULT_STATUSES,
            "pillars": DEFAULT_PILLARS,
            "objectives": DEFAULT_OBJECTIVES,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.settings.insert_one(settings)
    
    return {
        "networks": settings.get("networks", DEFAULT_NETWORKS),
        "formats": settings.get("formats", DEFAULT_FORMATS),
        "statuses": settings.get("statuses", DEFAULT_STATUSES),
        "pillars": settings.get("pillars", DEFAULT_PILLARS),
        "objectives": settings.get("objectives", DEFAULT_OBJECTIVES)
    }

@router.put("/settings")
async def update_editorial_settings(
    settings_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update editorial calendar settings"""
    update_data = {k: v for k, v in settings_data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"type": "editorial_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Paramètres mis à jour"}

# ==================== CALENDARS CRUD ====================

@router.get("/calendars")
async def list_calendars(
    contact_id: Optional[str] = None,
    include_archived: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """List all editorial calendars"""
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if not include_archived:
        query["archived"] = {"$ne": True}
    
    calendars = await db.editorial_calendars.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add post count for each calendar
    for cal in calendars:
        post_count = await db.editorial_posts.count_documents({"calendar_id": cal["id"]})
        cal["post_count"] = post_count
        
        # Get contact info if linked
        if cal.get("contact_id"):
            contact = await db.contacts.find_one({"id": cal["contact_id"]}, {"_id": 0, "id": 1, "name": 1, "company": 1})
            cal["contact"] = contact
    
    return calendars

@router.get("/calendars/{calendar_id}")
async def get_calendar(calendar_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single calendar"""
    calendar = await db.editorial_calendars.find_one({"id": calendar_id}, {"_id": 0})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    # Get contact info
    if calendar.get("contact_id"):
        contact = await db.contacts.find_one({"id": calendar["contact_id"]}, {"_id": 0, "id": 1, "name": 1, "company": 1})
        calendar["contact"] = contact
    
    return calendar

@router.post("/calendars")
async def create_calendar(calendar: CalendarCreate, current_user: dict = Depends(get_current_user)):
    """Create a new editorial calendar"""
    calendar_id = str(uuid.uuid4())
    
    calendar_data = {
        "id": calendar_id,
        "title": calendar.title,
        "contact_id": calendar.contact_id,
        "description": calendar.description,
        "color": calendar.color,
        "country": calendar.country or "FR",
        "niche": calendar.niche or "general",
        "key_dates": [],  # Will be populated by AI
        "archived": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.editorial_calendars.insert_one(calendar_data)
    
    # Generate key dates if requested
    if calendar.generate_key_dates:
        try:
            key_dates = await generate_key_dates_for_calendar(
                calendar_id=calendar_id,
                country=calendar.country or "FR",
                niche=calendar.niche or "general"
            )
            calendar_data["key_dates"] = key_dates
        except Exception as e:
            logger.warning(f"Failed to generate key dates: {e}")
            # Calendar is still created, just without key dates
    
    # Remove _id for response
    calendar_data.pop("_id", None)
    return calendar_data

@router.put("/calendars/{calendar_id}")
async def update_calendar(
    calendar_id: str,
    calendar: CalendarUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a calendar"""
    existing = await db.editorial_calendars.find_one({"id": calendar_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    update_data = {k: v for k, v in calendar.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.editorial_calendars.update_one(
        {"id": calendar_id},
        {"$set": update_data}
    )
    
    updated = await db.editorial_calendars.find_one({"id": calendar_id}, {"_id": 0})
    return updated

@router.delete("/calendars/{calendar_id}")
async def delete_calendar(calendar_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a calendar and all its posts"""
    existing = await db.editorial_calendars.find_one({"id": calendar_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    # Delete all posts in this calendar
    await db.editorial_posts.delete_many({"calendar_id": calendar_id})
    
    # Delete the calendar
    await db.editorial_calendars.delete_one({"id": calendar_id})
    
    return {"message": "Calendrier et posts supprimés"}

@router.post("/calendars/{calendar_id}/duplicate")
async def duplicate_calendar(calendar_id: str, current_user: dict = Depends(get_current_user)):
    """Duplicate a calendar with all its posts"""
    existing = await db.editorial_calendars.find_one({"id": calendar_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    new_calendar_id = str(uuid.uuid4())
    new_calendar = {
        **existing,
        "id": new_calendar_id,
        "title": f"{existing['title']} (copie)",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.editorial_calendars.insert_one(new_calendar)
    
    # Duplicate all posts
    posts = await db.editorial_posts.find({"calendar_id": calendar_id}, {"_id": 0}).to_list(1000)
    for post in posts:
        new_post = {
            **post,
            "id": str(uuid.uuid4()),
            "calendar_id": new_calendar_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.editorial_posts.insert_one(new_post)
    
    new_calendar.pop("_id", None)
    return new_calendar

# ==================== POSTS CRUD ====================

@router.get("/posts")
async def list_posts(
    calendar_id: Optional[str] = None,
    status: Optional[str] = None,
    network: Optional[str] = None,
    format_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List posts with filters"""
    query = {}
    
    if calendar_id:
        query["calendar_id"] = calendar_id
    if status:
        query["status"] = status
    if network:
        query["networks"] = network
    if format_type:
        query["format_type"] = format_type
    if start_date:
        query["scheduled_date"] = {"$gte": start_date}
    if end_date:
        if "scheduled_date" in query:
            query["scheduled_date"]["$lte"] = end_date
        else:
            query["scheduled_date"] = {"$lte": end_date}
    
    posts = await db.editorial_posts.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(500)
    
    # Add calendar info to each post
    calendar_ids = list(set(p.get("calendar_id") for p in posts if p.get("calendar_id")))
    calendars = {}
    if calendar_ids:
        cals = await db.editorial_calendars.find({"id": {"$in": calendar_ids}}, {"_id": 0}).to_list(100)
        calendars = {c["id"]: c for c in cals}
    
    for post in posts:
        post["calendar"] = calendars.get(post.get("calendar_id"))
    
    return posts

@router.get("/posts/{post_id}")
async def get_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single post"""
    post = await db.editorial_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    
    # Get calendar info
    if post.get("calendar_id"):
        calendar = await db.editorial_calendars.find_one({"id": post["calendar_id"]}, {"_id": 0})
        post["calendar"] = calendar
    
    return post

@router.post("/posts")
async def create_post(post: PostCreate, current_user: dict = Depends(get_current_user)):
    """Create a new post"""
    # Verify calendar exists
    calendar = await db.editorial_calendars.find_one({"id": post.calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    post_data = {
        "id": str(uuid.uuid4()),
        "calendar_id": post.calendar_id,
        "title": post.title,
        "caption": post.caption,
        "scheduled_date": post.scheduled_date,
        "scheduled_time": post.scheduled_time,
        "networks": post.networks,
        "format_type": post.format_type,
        "content_pillar": post.content_pillar,
        "objective": post.objective,
        "cta": post.cta,
        "status": post.status,
        "assigned_to": post.assigned_to,
        "external_links": post.external_links,
        "notes": post.notes,
        "medias": [],  # Will be populated via upload endpoint
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.editorial_posts.insert_one(post_data)
    
    post_data.pop("_id", None)
    return post_data

@router.put("/posts/{post_id}")
async def update_post(
    post_id: str,
    post: PostUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a post"""
    existing = await db.editorial_posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    
    update_data = {k: v for k, v in post.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.editorial_posts.update_one(
        {"id": post_id},
        {"$set": update_data}
    )
    
    updated = await db.editorial_posts.find_one({"id": post_id}, {"_id": 0})
    return updated

@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a post"""
    existing = await db.editorial_posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    
    # Delete medias from Cloudinary
    for media in existing.get("medias", []):
        try:
            if media.get("public_id"):
                cloudinary.uploader.destroy(media["public_id"])
        except Exception as e:
            logger.warning(f"Failed to delete media from Cloudinary: {e}")
    
    await db.editorial_posts.delete_one({"id": post_id})
    return {"message": "Post supprimé"}

@router.put("/posts/{post_id}/move")
async def move_post(
    post_id: str,
    scheduled_date: str,
    scheduled_time: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Move a post to a new date (drag & drop)"""
    existing = await db.editorial_posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    
    update_data = {
        "scheduled_date": scheduled_date,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if scheduled_time:
        update_data["scheduled_time"] = scheduled_time
    
    await db.editorial_posts.update_one(
        {"id": post_id},
        {"$set": update_data}
    )
    
    updated = await db.editorial_posts.find_one({"id": post_id}, {"_id": 0})
    return updated

# ==================== MEDIA MANAGEMENT ====================

@router.post("/posts/{post_id}/media")
async def upload_media(
    post_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload media (image or video) to a post"""
    existing = await db.editorial_posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    
    # Determine resource type
    content_type = file.content_type or ""
    if content_type.startswith("video/"):
        resource_type = "video"
    else:
        resource_type = "image"
    
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file.file,
            folder=f"editorial/{post_id}",
            resource_type=resource_type,
            transformation={"quality": "auto:good"} if resource_type == "image" else None
        )
        
        media_data = {
            "id": str(uuid.uuid4()),
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "type": resource_type,
            "width": result.get("width"),
            "height": result.get("height"),
            "format": result.get("format"),
            "size": result.get("bytes"),
            "duration": result.get("duration"),  # For videos
            "order": len(existing.get("medias", [])),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add to post's medias array
        await db.editorial_posts.update_one(
            {"id": post_id},
            {
                "$push": {"medias": media_data},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return media_data
        
    except Exception as e:
        logger.error(f"Media upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")

@router.delete("/posts/{post_id}/media/{media_id}")
async def delete_media(
    post_id: str,
    media_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a media from a post"""
    existing = await db.editorial_posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    
    # Find the media
    media = None
    for m in existing.get("medias", []):
        if m["id"] == media_id:
            media = m
            break
    
    if not media:
        raise HTTPException(status_code=404, detail="Média non trouvé")
    
    # Delete from Cloudinary
    try:
        if media.get("public_id"):
            resource_type = media.get("type", "image")
            cloudinary.uploader.destroy(media["public_id"], resource_type=resource_type)
    except Exception as e:
        logger.warning(f"Failed to delete from Cloudinary: {e}")
    
    # Remove from post
    await db.editorial_posts.update_one(
        {"id": post_id},
        {
            "$pull": {"medias": {"id": media_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Média supprimé"}

@router.put("/posts/{post_id}/media/reorder")
async def reorder_media(
    post_id: str,
    reorder: MediaReorder,
    current_user: dict = Depends(get_current_user)
):
    """Reorder medias in a post (for carousel order)"""
    existing = await db.editorial_posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    
    # Create a map of media by id
    media_map = {m["id"]: m for m in existing.get("medias", [])}
    
    # Reorder based on the provided order
    reordered = []
    for idx, media_id in enumerate(reorder.media_ids):
        if media_id in media_map:
            media = media_map[media_id]
            media["order"] = idx
            reordered.append(media)
    
    # Update post with reordered medias
    await db.editorial_posts.update_one(
        {"id": post_id},
        {
            "$set": {
                "medias": reordered,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Ordre des médias mis à jour", "medias": reordered}


# ==================== KEY DATES GENERATION ====================

async def generate_key_dates_for_calendar(calendar_id: str, country: str, niche: str) -> list:
    """
    Generate key dates for a calendar based on country and niche using AI
    Returns a list of key dates with titles, categories, and content angles
    """
    if not EMERGENT_LLM_KEY:
        logger.warning("No LLM key configured, skipping key dates generation")
        return []
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json
        
        # Get niche name
        niche_info = next((n for n in AVAILABLE_NICHES if n["id"] == niche), {"name": "Généraliste"})
        country_info = next((c for c in AVAILABLE_COUNTRIES if c["id"] == country), {"name": "France"})
        
        system_message = """Tu es un expert en marketing et community management.
Tu génères des listes de dates fortes (marronniers) pour les calendriers éditoriaux social media.

IMPORTANT:
- Génère UNIQUEMENT des dates pour l'année 2026
- Format de date OBLIGATOIRE: YYYY-MM-DD (ex: 2026-01-15)
- Sois précis sur les dates (pas de "début janvier", mais "2026-01-05")
- Inclus à la fois des dates génériques et des dates spécifiques au secteur

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après."""

        user_prompt = f"""Génère une liste de dates fortes 2026 pour un calendrier éditorial.

PARAMÈTRES:
- Pays/Marché: {country_info['name']}
- Secteur/Niche: {niche_info['name']}

GÉNÈRE:
1. Dates GÉNÉRIQUES (10-15 dates):
   - Jours fériés du pays
   - Événements marketing majeurs (soldes, Black Friday, etc.)
   - Journées mondiales importantes
   - Grands événements sportifs/culturels

2. Dates SPÉCIFIQUES au secteur "{niche_info['name']}" (8-12 dates):
   - Événements clés du secteur
   - Périodes fortes commerciales
   - Journées thématiques liées
   - Salons/événements professionnels

FORMAT JSON ATTENDU:
{{
    "key_dates": [
        {{
            "date": "2026-01-01",
            "title": "Nouvel An",
            "category": "generic",
            "icon": "🎉",
            "content_angle": "Voeux, rétrospective 2025, objectifs 2026"
        }},
        {{
            "date": "2026-02-14",
            "title": "Saint-Valentin",
            "category": "niche",
            "icon": "❤️",
            "content_angle": "Menu spécial couple, ambiance romantique"
        }}
    ]
}}

Génère la liste complète (20-25 dates au total)."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"keydates-{calendar_id}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        # Clean and parse response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        result = json.loads(response_text)
        key_dates = result.get("key_dates", [])
        
        # Add IDs and enabled flag to each date
        for date in key_dates:
            date["id"] = str(uuid.uuid4())
            date["enabled"] = True
            date["niche_specific"] = niche if date.get("category") == "niche" else None
        
        # Save to calendar
        await db.editorial_calendars.update_one(
            {"id": calendar_id},
            {"$set": {"key_dates": key_dates}}
        )
        
        logger.info(f"Generated {len(key_dates)} key dates for calendar {calendar_id}")
        return key_dates
        
    except Exception as e:
        logger.error(f"Error generating key dates: {e}")
        return []

@router.get("/calendars/{calendar_id}/key-dates")
async def get_calendar_key_dates(
    calendar_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get key dates for a calendar"""
    calendar = await db.editorial_calendars.find_one({"id": calendar_id}, {"_id": 0})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    return {
        "calendar_id": calendar_id,
        "country": calendar.get("country", "FR"),
        "niche": calendar.get("niche", "general"),
        "key_dates": calendar.get("key_dates", [])
    }

@router.post("/calendars/{calendar_id}/key-dates/regenerate")
async def regenerate_key_dates(
    calendar_id: str,
    niche: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Regenerate key dates for a calendar (optionally with a new niche)"""
    calendar = await db.editorial_calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    # Use new niche if provided, otherwise keep existing
    target_niche = niche or calendar.get("niche", "general")
    country = calendar.get("country", "FR")
    
    # Update niche if changed
    if niche and niche != calendar.get("niche"):
        await db.editorial_calendars.update_one(
            {"id": calendar_id},
            {"$set": {"niche": niche, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Generate new key dates
    key_dates = await generate_key_dates_for_calendar(calendar_id, country, target_niche)
    
    return {
        "message": f"Dates fortes régénérées pour la niche '{target_niche}'",
        "key_dates_count": len(key_dates),
        "key_dates": key_dates
    }

@router.put("/calendars/{calendar_id}/key-dates/{date_id}")
async def update_key_date(
    calendar_id: str,
    date_id: str,
    enabled: Optional[bool] = None,
    title: Optional[str] = None,
    content_angle: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update a specific key date (enable/disable, edit title or angle)"""
    calendar = await db.editorial_calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    key_dates = calendar.get("key_dates", [])
    
    for date in key_dates:
        if date.get("id") == date_id:
            if enabled is not None:
                date["enabled"] = enabled
            if title is not None:
                date["title"] = title
            if content_angle is not None:
                date["content_angle"] = content_angle
            break
    
    await db.editorial_calendars.update_one(
        {"id": calendar_id},
        {"$set": {"key_dates": key_dates, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Date mise à jour", "key_dates": key_dates}

@router.delete("/calendars/{calendar_id}/key-dates/{date_id}")
async def delete_key_date(
    calendar_id: str,
    date_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific key date"""
    calendar = await db.editorial_calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    key_dates = [d for d in calendar.get("key_dates", []) if d.get("id") != date_id]
    
    await db.editorial_calendars.update_one(
        {"id": calendar_id},
        {"$set": {"key_dates": key_dates, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Date supprimée"}

@router.post("/calendars/{calendar_id}/key-dates/{date_id}/create-post")
async def create_post_from_key_date(
    calendar_id: str,
    date_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Create a pre-filled post from a key date"""
    calendar = await db.editorial_calendars.find_one({"id": calendar_id})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    # Find the key date
    key_date = None
    for d in calendar.get("key_dates", []):
        if d.get("id") == date_id:
            key_date = d
            break
    
    if not key_date:
        raise HTTPException(status_code=404, detail="Date non trouvée")
    
    # Create post with pre-filled data
    post_data = {
        "id": str(uuid.uuid4()),
        "calendar_id": calendar_id,
        "title": key_date.get("title", "Nouveau post"),
        "caption": f"{key_date.get('icon', '📅')} {key_date.get('title', '')}\n\n{key_date.get('content_angle', '')}",
        "scheduled_date": key_date.get("date"),
        "scheduled_time": "10:00",
        "networks": [],
        "format_type": "post",
        "content_pillar": "",
        "objective": "engagement",
        "cta": "",
        "status": "idea",
        "assigned_to": None,
        "external_links": "",
        "notes": f"Créé depuis la date forte: {key_date.get('title')}",
        "medias": [],
        "key_date_id": date_id,  # Reference to the key date
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.editorial_posts.insert_one(post_data)
    post_data.pop("_id", None)
    
    return post_data


# ==================== AI ASSISTANCE ====================

class AIAssistRequest(BaseModel):
    topic: str  # Sujet ou thème du post
    networks: List[str] = []  # Réseaux sociaux ciblés
    format_type: str = "post"  # Type de format
    content_pillar: Optional[str] = ""  # Pilier de contenu
    objective: Optional[str] = ""  # Objectif
    client_context: Optional[str] = ""  # Contexte client/niche
    language: str = "fr"  # Langue

@router.post("/ai/assist")
async def ai_writing_assist(
    request: AIAssistRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    AI Writing Assistant - Generates social media content ideas
    Returns: post angles, captions, hooks, and hashtags
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé API LLM non configurée")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Build network-specific instructions
        network_names = {
            "instagram": "Instagram (visuel, émojis, hashtags importants, 2200 chars max)",
            "facebook": "Facebook (plus long, engageant, appel à l'action)",
            "linkedin": "LinkedIn (professionnel, valeur ajoutée, moins d'émojis)",
            "tiktok": "TikTok (court, tendance, hooks accrocheurs)",
            "youtube": "YouTube (description, mots-clés, appel à s'abonner)"
        }
        
        networks_str = ", ".join([network_names.get(n, n) for n in request.networks]) if request.networks else "réseaux sociaux en général"
        
        # Build objective context
        objective_context = ""
        if request.objective:
            objectives = {
                "visibility": "augmenter la visibilité et la portée",
                "engagement": "maximiser l'engagement (likes, commentaires, partages)",
                "leads": "générer des leads et des contacts qualifiés",
                "sales": "convertir et vendre",
                "branding": "renforcer l'image de marque"
            }
            objective_context = f"Objectif principal: {objectives.get(request.objective, request.objective)}"
        
        # Build pillar context
        pillar_context = ""
        if request.content_pillar:
            pillars = {
                "education": "contenu éducatif et informatif",
                "social_proof": "preuve sociale et témoignages",
                "offer": "offre promotionnelle ou commerciale",
                "behind_scenes": "coulisses et authenticité",
                "entertainment": "divertissement et humour",
                "inspiration": "inspiration et motivation"
            }
            pillar_context = f"Type de contenu: {pillars.get(request.content_pillar, request.content_pillar)}"
        
        # System prompt for social media expert
        system_message = """Tu es un expert en stratégie social media et copywriting pour les réseaux sociaux.
Tu aides les community managers à créer du contenu engageant et performant.

Tes réponses doivent être:
- Pratiques et directement utilisables
- Adaptées au ton de chaque réseau social
- Créatives et originales
- En français sauf si spécifié autrement

Format de réponse en JSON strict:
{
    "angles": ["angle 1", "angle 2", "angle 3"],
    "caption": "Légende complète adaptée au réseau principal",
    "hooks": ["hook 1", "hook 2", "hook 3"],
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
    "cta": "Appel à l'action suggéré"
}"""

        # User prompt
        user_prompt = f"""Génère du contenu pour un post social media avec ces paramètres:

📌 SUJET/THÈME: {request.topic}
📱 RÉSEAUX CIBLÉS: {networks_str}
📝 FORMAT: {request.format_type}
{pillar_context}
{objective_context}
{f"🏢 CONTEXTE CLIENT: {request.client_context}" if request.client_context else ""}

Génère:
1. 3 angles/idées différentes pour aborder ce sujet
2. Une légende complète et engageante (adaptée au réseau principal)
3. 3 hooks accrocheurs (premières phrases pour capter l'attention)
4. 5 hashtags pertinents et populaires
5. Un appel à l'action efficace

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""

        # Initialize chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"editorial-ai-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        # Send message
        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        
        # Clean response if needed
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw response
            result = {
                "angles": [],
                "caption": response_text,
                "hooks": [],
                "hashtags": [],
                "cta": "",
                "raw_response": response_text
            }
        
        return {
            "success": True,
            "data": result,
            "request": {
                "topic": request.topic,
                "networks": request.networks,
                "format_type": request.format_type
            }
        }
        
    except Exception as e:
        logger.error(f"AI assist error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")

@router.post("/ai/improve-caption")
async def ai_improve_caption(
    caption: str,
    network: str = "instagram",
    current_user: dict = Depends(get_current_user)
):
    """Improve an existing caption for a specific network"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé API LLM non configurée")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        network_tips = {
            "instagram": "Optimise pour Instagram: émojis stratégiques, structure aérée, hashtags pertinents, max 2200 caractères",
            "facebook": "Optimise pour Facebook: plus conversationnel, question engageante, appel à l'action clair",
            "linkedin": "Optimise pour LinkedIn: ton professionnel, valeur ajoutée, crédibilité, moins d'émojis",
            "tiktok": "Optimise pour TikTok: très court, tendance, hashtags viraux",
            "youtube": "Optimise pour YouTube: mots-clés SEO, description complète, timestamps si pertinent"
        }
        
        system_message = """Tu es un expert en copywriting social media.
Tu améliores les légendes pour les rendre plus engageantes et performantes.
Réponds uniquement avec la légende améliorée, sans explication."""

        user_prompt = f"""{network_tips.get(network, "Optimise cette légende")}

LÉGENDE ORIGINALE:
{caption}

Améliore cette légende en gardant le message principal mais en la rendant plus engageante et adaptée à {network}."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"improve-caption-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "improved_caption": response.strip(),
            "original_caption": caption,
            "network": network
        }
        
    except Exception as e:
        logger.error(f"AI improve caption error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")


class PostIdeasRequest(BaseModel):
    calendar_id: Optional[str] = None
    niche: Optional[str] = None
    count: int = 5
    themes: Optional[List[str]] = None


@router.post("/ai/generate-ideas")
async def generate_post_ideas(
    request: PostIdeasRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate AI-powered post ideas based on niche, trends, and calendar context.
    Returns ready-to-use post suggestions with titles, captions, and recommended times.
    """
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé API LLM non configurée")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json
        
        # Get calendar context if provided
        calendar_context = ""
        niche_context = request.niche or "général"
        
        if request.calendar_id:
            calendar = await db.editorial_calendars.find_one(
                {"id": request.calendar_id, "user_id": current_user["user_id"]},
                {"_id": 0}
            )
            if calendar:
                niche_context = calendar.get("niche", niche_context)
                calendar_context = f"Pour le calendrier: {calendar.get('title', 'Client')}"
                
                # Get recent posts to avoid repetition
                recent_posts = await db.editorial_posts.find(
                    {"calendar_id": request.calendar_id},
                    {"_id": 0, "title": 1, "caption": 1}
                ).sort("created_at", -1).limit(5).to_list(5)
                
                if recent_posts:
                    recent_titles = [p.get("title", "") for p in recent_posts if p.get("title")]
                    calendar_context += f"\nPosts récents (éviter la répétition): {', '.join(recent_titles[:3])}"
        
        # Niche descriptions
        niche_descriptions = {
            "restaurant": "restaurant, bar, gastronomie, food, cuisine",
            "automobile": "concession auto, garage, véhicules, mobilité",
            "retail": "commerce, boutique, vente au détail, shopping",
            "immobilier": "agence immobilière, biens, locations, ventes",
            "beaute": "salon de beauté, coiffure, esthétique, bien-être, spa",
            "fitness": "salle de sport, coaching, nutrition, musculation",
            "media": "médias, divertissement, événements, spectacles",
            "tech": "technologie, startup, innovation, digital",
            "mode": "mode, fashion, vêtements, accessoires, tendances",
            "agence": "agence de communication, marketing, publicité, branding",
            "general": "entreprise généraliste"
        }
        
        niche_desc = niche_descriptions.get(niche_context, niche_context)
        
        # Get current month events/themes
        now = datetime.now()
        month_themes = {
            1: "Nouvelle année, bonnes résolutions, soldes d'hiver",
            2: "Saint-Valentin, Carnaval, fin des soldes",
            3: "Printemps, Journée de la femme, renouveau",
            4: "Pâques, giboulées, jardinage",
            5: "Fête des mères, ponts de mai, préparation été",
            6: "Fête des pères, début été, Fête de la musique",
            7: "Vacances d'été, soldes d'été, 14 juillet",
            8: "Rentrée approche, fin vacances, derniers jours d'été",
            9: "Rentrée, reprise, nouveaux projets",
            10: "Halloween, automne, changement d'heure",
            11: "Black Friday, Beaujolais, préparation fêtes",
            12: "Noël, fêtes de fin d'année, rétrospective"
        }
        
        current_themes = month_themes.get(now.month, "tendances actuelles")
        
        # Add custom themes if provided
        if request.themes:
            current_themes += ", " + ", ".join(request.themes)
        
        system_message = """Tu es un expert en stratégie social media et content marketing.
Tu génères des idées de posts créatives, engageantes et adaptées au secteur d'activité.

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
    "ideas": [
        {
            "title": "Titre court et accrocheur",
            "caption": "Légende complète avec émojis et hashtags",
            "format": "post|carrousel|reel|story",
            "networks": ["instagram", "facebook"],
            "best_time": "Mardi 10h",
            "pillar": "education|social_proof|offer|behind_scenes|entertainment|inspiration",
            "hook": "Phrase d'accroche pour commencer"
        }
    ]
}"""

        user_prompt = f"""Génère {request.count} idées de posts social media pour:

SECTEUR: {niche_desc}
{calendar_context}

CONTEXTE DU MOMENT: {current_themes}

Critères:
- Idées variées (pas que des promotions)
- Mix de formats (posts, carrousels, reels, stories)
- Contenu engageant et authentique
- Adapté aux codes de chaque réseau
- Hashtags pertinents inclus dans les légendes

Génère {request.count} idées différentes et créatives."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"post-ideas-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        try:
            result = json.loads(response_text)
            ideas = result.get("ideas", [])
        except json.JSONDecodeError:
            # Fallback
            ideas = []
            logger.warning(f"Failed to parse AI response: {response_text[:200]}")
        
        return {
            "success": True,
            "ideas": ideas,
            "context": {
                "niche": niche_context,
                "month_themes": current_themes,
                "count": len(ideas)
            }
        }
        
    except Exception as e:
        logger.error(f"AI generate ideas error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")


# ==================== BEST TIME TO POST ====================

# Optimal posting times by network (based on industry research)
OPTIMAL_TIMES = {
    "instagram": {
        "best_days": ["mardi", "mercredi", "jeudi"],
        "best_hours": ["11:00", "13:00", "19:00"],
        "avoid": ["dimanche matin", "lundi tôt"],
        "peak_engagement": {
            "weekday": {"start": 11, "end": 14},
            "evening": {"start": 18, "end": 21}
        }
    },
    "facebook": {
        "best_days": ["mercredi", "jeudi", "vendredi"],
        "best_hours": ["09:00", "13:00", "16:00"],
        "avoid": ["samedi", "dimanche"],
        "peak_engagement": {
            "morning": {"start": 9, "end": 12},
            "afternoon": {"start": 13, "end": 16}
        }
    },
    "linkedin": {
        "best_days": ["mardi", "mercredi", "jeudi"],
        "best_hours": ["08:00", "10:00", "12:00"],
        "avoid": ["weekend", "après 18h"],
        "peak_engagement": {
            "morning": {"start": 8, "end": 10},
            "lunch": {"start": 12, "end": 13}
        }
    },
    "twitter": {
        "best_days": ["mercredi", "jeudi"],
        "best_hours": ["09:00", "12:00", "17:00"],
        "avoid": ["weekend après-midi"],
        "peak_engagement": {
            "morning": {"start": 9, "end": 11},
            "evening": {"start": 17, "end": 19}
        }
    },
    "tiktok": {
        "best_days": ["mardi", "jeudi", "vendredi"],
        "best_hours": ["19:00", "21:00", "22:00"],
        "avoid": ["matin tôt", "après-midi semaine"],
        "peak_engagement": {
            "evening": {"start": 19, "end": 23}
        }
    },
    "youtube": {
        "best_days": ["jeudi", "vendredi", "samedi"],
        "best_hours": ["12:00", "15:00", "21:00"],
        "avoid": ["lundi", "mardi matin"],
        "peak_engagement": {
            "afternoon": {"start": 14, "end": 17},
            "evening": {"start": 20, "end": 22}
        }
    }
}

# Niche-specific adjustments
NICHE_TIME_ADJUSTMENTS = {
    "restaurant": {
        "instagram": {"best_hours": ["11:30", "18:30", "20:00"]},  # Before meals
        "facebook": {"best_hours": ["11:00", "17:00"]}
    },
    "fitness": {
        "instagram": {"best_hours": ["06:00", "12:00", "18:00"]},  # Workout times
        "tiktok": {"best_hours": ["06:30", "18:00", "21:00"]}
    },
    "beaute": {
        "instagram": {"best_hours": ["10:00", "14:00", "20:00"]},
        "tiktok": {"best_hours": ["12:00", "19:00", "21:00"]}
    },
    "retail": {
        "instagram": {"best_hours": ["12:00", "18:00", "21:00"]},
        "facebook": {"best_hours": ["10:00", "13:00", "19:00"]}
    },
    "tech": {
        "linkedin": {"best_hours": ["08:30", "12:00", "17:00"]},
        "twitter": {"best_hours": ["09:00", "14:00", "17:00"]}
    }
}


class BestTimeRequest(BaseModel):
    networks: List[str]
    niche: Optional[str] = "general"
    date: Optional[str] = None  # YYYY-MM-DD


@router.post("/ai/best-time")
async def get_best_posting_time(
    request: BestTimeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get optimal posting times for specified networks and niche"""
    results = {}
    
    for network in request.networks:
        network_lower = network.lower()
        if network_lower not in OPTIMAL_TIMES:
            continue
            
        base_times = OPTIMAL_TIMES[network_lower].copy()
        
        # Apply niche adjustments if available
        if request.niche and request.niche in NICHE_TIME_ADJUSTMENTS:
            niche_adj = NICHE_TIME_ADJUSTMENTS[request.niche].get(network_lower, {})
            base_times.update(niche_adj)
        
        # Get day of week if date provided
        day_recommendation = None
        if request.date:
            try:
                date_obj = datetime.strptime(request.date, "%Y-%m-%d")
                day_names = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
                day_name = day_names[date_obj.weekday()]
                
                is_best_day = day_name in base_times.get("best_days", [])
                day_recommendation = {
                    "day": day_name,
                    "is_optimal": is_best_day,
                    "message": f"{'✅ Jour optimal' if is_best_day else '⚠️ Pas le meilleur jour'} pour {network}"
                }
            except ValueError:
                pass
        
        results[network_lower] = {
            "best_hours": base_times.get("best_hours", []),
            "best_days": base_times.get("best_days", []),
            "avoid": base_times.get("avoid", []),
            "peak_engagement": base_times.get("peak_engagement", {}),
            "day_recommendation": day_recommendation,
            "tip": f"Pour {network}, publiez de préférence le {', '.join(base_times.get('best_days', [])[:2])} vers {base_times.get('best_hours', ['12:00'])[0]}"
        }
    
    return {
        "success": True,
        "recommendations": results,
        "niche": request.niche,
        "general_tip": "Ces recommandations sont basées sur les études d'engagement. Ajustez selon les retours de votre audience."
    }


# ==================== HASHTAG SUGGESTIONS ====================

class HashtagRequest(BaseModel):
    topic: str
    niche: Optional[str] = "general"
    network: Optional[str] = "instagram"
    count: int = 15
    include_trending: bool = True


@router.post("/ai/hashtags")
async def generate_hashtags(
    request: HashtagRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate AI-powered hashtag suggestions for a topic"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé API LLM non configurée")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json
        
        # Network-specific hashtag rules
        network_rules = {
            "instagram": "Maximum 30 hashtags, mix populaires et niche. Inclure des hashtags français et anglais si pertinent.",
            "tiktok": "Maximum 5-7 hashtags courts et tendance. Privilégier les hashtags viraux.",
            "linkedin": "Maximum 3-5 hashtags professionnels. Éviter les hashtags trop génériques.",
            "twitter": "Maximum 2-3 hashtags pertinents. Court et percutant.",
            "facebook": "Maximum 2-3 hashtags ou aucun. Les hashtags sont moins importants sur Facebook.",
            "youtube": "Tags plutôt que hashtags. Mots-clés descriptifs pour le SEO."
        }
        
        rules = network_rules.get(request.network.lower(), network_rules["instagram"])
        
        system_message = """Tu es un expert en stratégie de hashtags et SEO social media.
Tu génères des hashtags pertinents, un mix de populaires et de niche, optimisés pour l'engagement.

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
    "hashtags": {
        "high_volume": ["#hashtag1", "#hashtag2"],
        "medium_volume": ["#hashtag3", "#hashtag4"],
        "niche": ["#hashtag5", "#hashtag6"],
        "trending": ["#hashtag7"]
    },
    "recommended_set": ["#top1", "#top2", "#top3", "#top4", "#top5"],
    "caption_placement": "Placer les hashtags dans le premier commentaire pour Instagram",
    "tips": ["Conseil 1", "Conseil 2"]
}"""

        user_prompt = f"""Génère des hashtags pour:

SUJET: {request.topic}
SECTEUR: {request.niche}
RÉSEAU: {request.network}
NOMBRE DEMANDÉ: {request.count}

RÈGLES POUR {request.network.upper()}:
{rules}

Critères:
- Mix de hashtags populaires (large audience) et niche (engagement ciblé)
- Hashtags en rapport direct avec le sujet
- Inclure des hashtags en français et anglais si pertinent
{"- Inclure 2-3 hashtags tendance actuels" if request.include_trending else ""}
- Éviter les hashtags bannis ou spam

Génère une liste optimisée de hashtags."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"hashtags-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=user_prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback - try to extract hashtags from text
            import re
            hashtags = re.findall(r'#\w+', response_text)
            result = {
                "hashtags": {
                    "recommended": hashtags[:request.count]
                },
                "recommended_set": hashtags[:5],
                "tips": []
            }
        
        return {
            "success": True,
            "topic": request.topic,
            "network": request.network,
            "niche": request.niche,
            **result
        }
        
    except Exception as e:
        logger.error(f"AI hashtags error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur IA: {str(e)}")


# ==================== CALENDAR VIEW HELPERS ====================

@router.get("/calendar-view")
async def get_calendar_view(
    start_date: str,
    end_date: str,
    calendar_ids: Optional[str] = None,  # Comma-separated
    current_user: dict = Depends(get_current_user)
):
    """Get posts formatted for calendar view"""
    query = {
        "scheduled_date": {"$gte": start_date, "$lte": end_date}
    }
    
    if calendar_ids:
        cal_list = [c.strip() for c in calendar_ids.split(",")]
        query["calendar_id"] = {"$in": cal_list}
    
    posts = await db.editorial_posts.find(query, {"_id": 0}).to_list(500)
    
    # Get calendars for colors
    calendar_ids_set = list(set(p.get("calendar_id") for p in posts if p.get("calendar_id")))
    calendars = {}
    if calendar_ids_set:
        cals = await db.editorial_calendars.find({"id": {"$in": calendar_ids_set}}, {"_id": 0}).to_list(100)
        calendars = {c["id"]: c for c in cals}
    
    # Format for calendar
    events = []
    for post in posts:
        cal = calendars.get(post.get("calendar_id"), {})
        
        # Build datetime
        date_str = post.get("scheduled_date", "")
        time_str = post.get("scheduled_time") or "09:00"
        
        events.append({
            "id": post["id"],
            "title": post.get("title", "Sans titre"),
            "start": f"{date_str}T{time_str}:00" if date_str else None,
            "backgroundColor": cal.get("color", "#6366f1"),
            "borderColor": cal.get("color", "#6366f1"),
            "extendedProps": {
                "post": post,
                "calendar": cal
            }
        })
    
    return events

@router.get("/contact/{contact_id}/calendars")
async def get_contact_calendars(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Get all calendars linked to a contact"""
    calendars = await db.editorial_calendars.find(
        {"contact_id": contact_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    for cal in calendars:
        post_count = await db.editorial_posts.count_documents({"calendar_id": cal["id"]})
        cal["post_count"] = post_count
    
    return calendars



# ==================== STATISTICS ====================

@router.get("/calendars/{calendar_id}/stats")
async def get_calendar_statistics(
    calendar_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get statistics for a calendar
    Returns: post counts by status, network, format, and timeline
    """
    calendar = await db.editorial_calendars.find_one({"id": calendar_id}, {"_id": 0})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    # Build query
    query = {"calendar_id": calendar_id}
    if start_date:
        query["scheduled_date"] = {"$gte": start_date}
    if end_date:
        if "scheduled_date" in query:
            query["scheduled_date"]["$lte"] = end_date
        else:
            query["scheduled_date"] = {"$lte": end_date}
    
    # Get all posts for this calendar
    posts = await db.editorial_posts.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate statistics
    total_posts = len(posts)
    
    # Posts by status
    status_counts = {}
    for post in posts:
        status = post.get("status", "idea")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Posts by network
    network_counts = {}
    for post in posts:
        for network in post.get("networks", []):
            network_counts[network] = network_counts.get(network, 0) + 1
    
    # Posts by format
    format_counts = {}
    for post in posts:
        fmt = post.get("format_type", "post")
        format_counts[fmt] = format_counts.get(fmt, 0) + 1
    
    # Posts by content pillar
    pillar_counts = {}
    for post in posts:
        pillar = post.get("content_pillar", "")
        if pillar:
            pillar_counts[pillar] = pillar_counts.get(pillar, 0) + 1
    
    # Posts by week (for timeline chart)
    weekly_posts = {}
    for post in posts:
        date_str = post.get("scheduled_date", "")
        if date_str:
            try:
                date = datetime.fromisoformat(date_str)
                week_start = date - timedelta(days=date.weekday())
                week_key = week_start.strftime("%Y-%m-%d")
                weekly_posts[week_key] = weekly_posts.get(week_key, 0) + 1
            except:
                pass
    
    # Calculate completion rate
    completed_statuses = ["scheduled", "published"]
    completed_count = sum(status_counts.get(s, 0) for s in completed_statuses)
    completion_rate = round((completed_count / total_posts * 100), 1) if total_posts > 0 else 0
    
    # Calculate posts with media
    posts_with_media = sum(1 for p in posts if p.get("medias") and len(p.get("medias", [])) > 0)
    media_rate = round((posts_with_media / total_posts * 100), 1) if total_posts > 0 else 0
    
    return {
        "calendar_id": calendar_id,
        "calendar_title": calendar.get("title", ""),
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "summary": {
            "total_posts": total_posts,
            "completion_rate": completion_rate,
            "posts_with_media": posts_with_media,
            "media_rate": media_rate,
            "key_dates_count": len(calendar.get("key_dates", []))
        },
        "by_status": status_counts,
        "by_network": network_counts,
        "by_format": format_counts,
        "by_pillar": pillar_counts,
        "timeline": weekly_posts,
        "status_breakdown": [
            {"status": k, "count": v, "percentage": round(v/total_posts*100, 1) if total_posts > 0 else 0}
            for k, v in sorted(status_counts.items(), key=lambda x: -x[1])
        ],
        "network_breakdown": [
            {"network": k, "count": v}
            for k, v in sorted(network_counts.items(), key=lambda x: -x[1])
        ]
    }

@router.get("/stats/global")
async def get_global_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get global statistics across all calendars
    """
    # Build query
    query = {}
    if start_date:
        query["scheduled_date"] = {"$gte": start_date}
    if end_date:
        if "scheduled_date" in query:
            query["scheduled_date"]["$lte"] = end_date
        else:
            query["scheduled_date"] = {"$lte": end_date}
    
    # Get all posts
    posts = await db.editorial_posts.find(query, {"_id": 0}).to_list(5000)
    calendars = await db.editorial_calendars.find({"archived": {"$ne": True}}, {"_id": 0}).to_list(100)
    
    total_posts = len(posts)
    total_calendars = len(calendars)
    
    # Posts by status
    status_counts = {}
    for post in posts:
        status = post.get("status", "idea")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Posts by calendar
    calendar_counts = {}
    for post in posts:
        cal_id = post.get("calendar_id", "")
        calendar_counts[cal_id] = calendar_counts.get(cal_id, 0) + 1
    
    # Get calendar names
    calendar_map = {c["id"]: c.get("title", "Sans nom") for c in calendars}
    
    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "summary": {
            "total_calendars": total_calendars,
            "total_posts": total_posts,
            "avg_posts_per_calendar": round(total_posts / total_calendars, 1) if total_calendars > 0 else 0
        },
        "by_status": status_counts,
        "by_calendar": [
            {"calendar_id": k, "calendar_name": calendar_map.get(k, k), "count": v}
            for k, v in sorted(calendar_counts.items(), key=lambda x: -x[1])
        ]
    }

# ==================== PDF EXPORT ====================

@router.get("/calendars/{calendar_id}/export/pdf")
async def export_calendar_pdf(
    calendar_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Export calendar planning to PDF
    Returns a downloadable PDF file
    """
    from fastapi.responses import Response
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm, mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from io import BytesIO
    
    calendar = await db.editorial_calendars.find_one({"id": calendar_id}, {"_id": 0})
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendrier non trouvé")
    
    # Get posts
    query = {"calendar_id": calendar_id}
    if start_date:
        query["scheduled_date"] = {"$gte": start_date}
    if end_date:
        if "scheduled_date" in query:
            query["scheduled_date"]["$lte"] = end_date
        else:
            query["scheduled_date"] = {"$lte": end_date}
    
    posts = await db.editorial_posts.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(500)
    
    # Get settings for status/network names
    settings = await db.settings.find_one({"type": "editorial_settings"})
    status_names = {s["id"]: s["name"] for s in (settings or {}).get("statuses", DEFAULT_STATUSES)}
    network_names = {n["id"]: n["name"] for n in (settings or {}).get("networks", DEFAULT_NETWORKS)}
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a1a2e'),
        spaceAfter=20
    )
    
    # Header
    period_text = ""
    if start_date or end_date:
        period_text = f" ({start_date or '...'} - {end_date or '...'})"
    
    elements.append(Paragraph(f"📅 Planning Éditorial - {calendar.get('title', 'Calendrier')}{period_text}", title_style))
    elements.append(Spacer(1, 10))
    
    # Statistics summary
    stats_text = f"Total: {len(posts)} posts"
    if calendar.get("niche"):
        niche_info = next((n for n in AVAILABLE_NICHES if n["id"] == calendar.get("niche")), {})
        stats_text += f" | Secteur: {niche_info.get('name', calendar.get('niche'))}"
    
    elements.append(Paragraph(stats_text, styles['Normal']))
    elements.append(Spacer(1, 15))
    
    if posts:
        # Table headers
        headers = ['Date', 'Heure', 'Titre', 'Réseaux', 'Format', 'Statut', 'Légende (extrait)']
        
        # Table data
        data = [headers]
        for post in posts:
            # Format date
            date_str = post.get("scheduled_date", "-")
            if date_str and date_str != "-":
                try:
                    dt = datetime.fromisoformat(date_str)
                    date_str = dt.strftime("%d/%m/%Y")
                except:
                    pass
            
            # Format networks
            networks = post.get("networks", [])
            networks_str = ", ".join([network_names.get(n, n) for n in networks[:3]])
            if len(networks) > 3:
                networks_str += f" +{len(networks)-3}"
            
            # Format caption (truncate)
            caption = post.get("caption", "")
            if len(caption) > 80:
                caption = caption[:77] + "..."
            caption = caption.replace('\n', ' ')
            
            row = [
                date_str,
                post.get("scheduled_time", "-"),
                Paragraph(post.get("title", "Sans titre")[:40], styles['Normal']),
                networks_str,
                post.get("format_type", "post"),
                status_names.get(post.get("status"), post.get("status", "-")),
                Paragraph(caption, styles['Normal'])
            ]
            data.append(row)
        
        # Create table
        col_widths = [2.2*cm, 1.5*cm, 4*cm, 3*cm, 2*cm, 2.5*cm, 8*cm]
        table = Table(data, colWidths=col_widths, repeatRows=1)
        
        # Table style
        table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Body
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 1), (1, -1), 'CENTER'),  # Date & Time centered
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            
            # Alternating rows
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        
        elements.append(table)
    else:
        elements.append(Paragraph("Aucun post trouvé pour cette période.", styles['Normal']))
    
    # Footer
    elements.append(Spacer(1, 20))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey
    )
    elements.append(Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - Alpha Agency CRM", footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Return PDF
    buffer.seek(0)
    filename = f"planning_{calendar.get('title', 'calendar').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/export/pdf")
async def export_all_calendars_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    calendar_ids: Optional[str] = None,  # Comma-separated
    current_user: dict = Depends(get_current_user)
):
    """
    Export multiple calendars planning to PDF
    """
    from fastapi.responses import Response
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from io import BytesIO
    
    # Get calendars
    query = {"archived": {"$ne": True}}
    if calendar_ids:
        cal_list = [c.strip() for c in calendar_ids.split(",")]
        query["id"] = {"$in": cal_list}
    
    calendars = await db.editorial_calendars.find(query, {"_id": 0}).to_list(100)
    
    if not calendars:
        raise HTTPException(status_code=404, detail="Aucun calendrier trouvé")
    
    # Get settings
    settings = await db.settings.find_one({"type": "editorial_settings"})
    status_names = {s["id"]: s["name"] for s in (settings or {}).get("statuses", DEFAULT_STATUSES)}
    network_names = {n["id"]: n["name"] for n in (settings or {}).get("networks", DEFAULT_NETWORKS)}
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=1*cm,
        leftMargin=1*cm,
        topMargin=1*cm,
        bottomMargin=1*cm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1a1a2e'),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=10
    )
    
    # Main title
    period_text = ""
    if start_date or end_date:
        period_text = f" ({start_date or '...'} - {end_date or '...'})"
    
    elements.append(Paragraph(f"📅 Planning Éditorial Global{period_text}", title_style))
    elements.append(Spacer(1, 10))
    
    for cal_idx, calendar in enumerate(calendars):
        if cal_idx > 0:
            elements.append(PageBreak())
        
        # Calendar header
        elements.append(Paragraph(f"📁 {calendar.get('title', 'Calendrier')}", subtitle_style))
        
        # Get posts
        post_query = {"calendar_id": calendar["id"]}
        if start_date:
            post_query["scheduled_date"] = {"$gte": start_date}
        if end_date:
            if "scheduled_date" in post_query:
                post_query["scheduled_date"]["$lte"] = end_date
            else:
                post_query["scheduled_date"] = {"$lte": end_date}
        
        posts = await db.editorial_posts.find(post_query, {"_id": 0}).sort("scheduled_date", 1).to_list(200)
        
        if posts:
            # Table
            headers = ['Date', 'Titre', 'Réseaux', 'Format', 'Statut']
            data = [headers]
            
            for post in posts:
                date_str = post.get("scheduled_date", "-")
                if date_str and date_str != "-":
                    try:
                        dt = datetime.fromisoformat(date_str)
                        date_str = dt.strftime("%d/%m")
                    except:
                        pass
                
                networks = post.get("networks", [])
                networks_str = ", ".join([network_names.get(n, n)[:3] for n in networks[:2]])
                
                row = [
                    date_str,
                    post.get("title", "Sans titre")[:35],
                    networks_str,
                    post.get("format_type", "-"),
                    status_names.get(post.get("status"), post.get("status", "-"))
                ]
                data.append(row)
            
            col_widths = [2*cm, 8*cm, 4*cm, 3*cm, 3*cm]
            table = Table(data, colWidths=col_widths, repeatRows=1)
            
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            elements.append(table)
            elements.append(Paragraph(f"{len(posts)} posts", styles['Normal']))
        else:
            elements.append(Paragraph("Aucun post.", styles['Normal']))
        
        elements.append(Spacer(1, 15))
    
    # Footer
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} - Alpha Agency CRM", footer_style))
    
    doc.build(elements)
    
    buffer.seek(0)
    filename = f"planning_global_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
