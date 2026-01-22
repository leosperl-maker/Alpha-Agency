"""
Editorial Calendar routes - Social Media Content Planning
Multi-calendar system linked to contacts with posts management
"""

import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone
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
        time_str = post.get("scheduled_time", "09:00")
        
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
