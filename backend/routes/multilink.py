"""
Multilink Module - Linktree-style link pages
Allows creating and managing bio link pages accessible at /lien-bio/{slug}
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from pydantic import BaseModel

from .database import db, get_current_user

logger = logging.getLogger("multilink")

router = APIRouter()


# ==================== MODELS ====================

class LinkCreate(BaseModel):
    label: str
    url: str
    icon: Optional[str] = None  # Icon name or URL
    icon_type: Optional[str] = "lucide"  # lucide, social, custom
    is_active: bool = True
    order: Optional[int] = 0

class LinkUpdate(BaseModel):
    label: Optional[str] = None
    url: Optional[str] = None
    icon: Optional[str] = None
    icon_type: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

class PageCreate(BaseModel):
    slug: str
    title: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    theme: Optional[str] = "minimal"  # minimal, dark, gradient, colorful, custom
    custom_colors: Optional[dict] = None  # {background, text, button_bg, button_text, accent}
    custom_font: Optional[str] = None
    is_active: bool = True

class PageUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    theme: Optional[str] = None
    custom_colors: Optional[dict] = None
    custom_font: Optional[str] = None
    is_active: Optional[bool] = None

class LinksReorder(BaseModel):
    link_ids: List[str]  # Ordered list of link IDs


# ==================== THEME PRESETS ====================

THEME_PRESETS = {
    "minimal": {
        "name": "Minimal",
        "background": "#ffffff",
        "text": "#1a1a1a",
        "button_bg": "#f3f4f6",
        "button_text": "#1a1a1a",
        "button_hover": "#e5e7eb",
        "accent": "#6366f1"
    },
    "dark": {
        "name": "Dark",
        "background": "#0f0f1a",
        "text": "#ffffff",
        "button_bg": "#1e1e2e",
        "button_text": "#ffffff",
        "button_hover": "#2e2e3e",
        "accent": "#8b5cf6"
    },
    "gradient": {
        "name": "Gradient",
        "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "text": "#ffffff",
        "button_bg": "rgba(255,255,255,0.2)",
        "button_text": "#ffffff",
        "button_hover": "rgba(255,255,255,0.3)",
        "accent": "#ffffff"
    },
    "ocean": {
        "name": "Ocean",
        "background": "linear-gradient(135deg, #0077b6 0%, #00b4d8 100%)",
        "text": "#ffffff",
        "button_bg": "rgba(255,255,255,0.15)",
        "button_text": "#ffffff",
        "button_hover": "rgba(255,255,255,0.25)",
        "accent": "#90e0ef"
    },
    "sunset": {
        "name": "Sunset",
        "background": "linear-gradient(135deg, #f72585 0%, #7209b7 100%)",
        "text": "#ffffff",
        "button_bg": "rgba(255,255,255,0.2)",
        "button_text": "#ffffff",
        "button_hover": "rgba(255,255,255,0.3)",
        "accent": "#f72585"
    },
    "nature": {
        "name": "Nature",
        "background": "#f0fdf4",
        "text": "#166534",
        "button_bg": "#dcfce7",
        "button_text": "#166534",
        "button_hover": "#bbf7d0",
        "accent": "#22c55e"
    },
    "custom": {
        "name": "Personnalisé",
        "background": "#ffffff",
        "text": "#1a1a1a",
        "button_bg": "#f3f4f6",
        "button_text": "#1a1a1a",
        "button_hover": "#e5e7eb",
        "accent": "#6366f1"
    }
}

# Social icons mapping
SOCIAL_ICONS = {
    "instagram": "Instagram",
    "facebook": "Facebook",
    "twitter": "Twitter",
    "tiktok": "TikTok",
    "youtube": "Youtube",
    "linkedin": "Linkedin",
    "whatsapp": "MessageCircle",
    "telegram": "Send",
    "email": "Mail",
    "website": "Globe",
    "shop": "ShoppingBag",
    "calendar": "Calendar",
    "phone": "Phone",
    "location": "MapPin",
    "link": "Link",
    "download": "Download",
    "play": "Play",
    "music": "Music",
    "podcast": "Mic",
    "blog": "BookOpen"
}


# ==================== HELPER FUNCTIONS ====================

def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    import re
    slug = title.lower()
    slug = re.sub(r'[àáâãäå]', 'a', slug)
    slug = re.sub(r'[èéêë]', 'e', slug)
    slug = re.sub(r'[ìíîï]', 'i', slug)
    slug = re.sub(r'[òóôõö]', 'o', slug)
    slug = re.sub(r'[ùúûü]', 'u', slug)
    slug = re.sub(r'[ç]', 'c', slug)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug[:50]


async def record_page_view(page_id: str, request: Request):
    """Record a page view"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Get client info
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")[:200]
    referer = request.headers.get("referer", "")[:200]
    
    # Update daily stats
    await db.multilink_stats.update_one(
        {"page_id": page_id, "date": today, "type": "view"},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {"page_id": page_id, "date": today, "type": "view"}
        },
        upsert=True
    )
    
    # Record detailed view (for analytics)
    await db.multilink_views.insert_one({
        "id": str(uuid.uuid4()),
        "page_id": page_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_hash": hash(client_ip) % 10000000,  # Anonymized
        "user_agent": user_agent,
        "referer": referer
    })


async def record_link_click(page_id: str, link_id: str, request: Request):
    """Record a link click"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Update daily stats
    await db.multilink_stats.update_one(
        {"page_id": page_id, "link_id": link_id, "date": today, "type": "click"},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {"page_id": page_id, "link_id": link_id, "date": today, "type": "click"}
        },
        upsert=True
    )


# ==================== ADMIN ROUTES - PAGES ====================

@router.get("/pages", response_model=List[dict])
async def list_pages(current_user: dict = Depends(get_current_user)):
    """List all multilink pages"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    pages = await db.multilink_pages.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Add link count and stats summary for each page
    for page in pages:
        page_id = page.get("id")
        
        # Count links
        link_count = await db.multilink_links.count_documents({"page_id": page_id})
        page["link_count"] = link_count
        
        # Get total views
        views_pipeline = [
            {"$match": {"page_id": page_id, "type": "view"}},
            {"$group": {"_id": None, "total": {"$sum": "$count"}}}
        ]
        views_result = await db.multilink_stats.aggregate(views_pipeline).to_list(1)
        page["total_views"] = views_result[0]["total"] if views_result else 0
        
        # Get total clicks
        clicks_pipeline = [
            {"$match": {"page_id": page_id, "type": "click"}},
            {"$group": {"_id": None, "total": {"$sum": "$count"}}}
        ]
        clicks_result = await db.multilink_stats.aggregate(clicks_pipeline).to_list(1)
        page["total_clicks"] = clicks_result[0]["total"] if clicks_result else 0
    
    return pages


@router.post("/pages", response_model=dict)
async def create_page(page: PageCreate, current_user: dict = Depends(get_current_user)):
    """Create a new multilink page"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Generate slug if empty
    slug = page.slug.strip() if page.slug else generate_slug(page.title)
    
    # Check slug uniqueness
    existing = await db.multilink_pages.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=400, detail=f"Le slug '{slug}' est déjà utilisé")
    
    page_id = str(uuid.uuid4())
    
    # Get theme colors
    theme_colors = THEME_PRESETS.get(page.theme, THEME_PRESETS["minimal"])
    if page.theme == "custom" and page.custom_colors:
        theme_colors = {**theme_colors, **page.custom_colors}
    
    page_doc = {
        "id": page_id,
        "user_id": user_id,
        "slug": slug,
        "title": page.title,
        "bio": page.bio,
        "profile_image": page.profile_image,
        "theme": page.theme,
        "theme_colors": theme_colors,
        "custom_colors": page.custom_colors,
        "custom_font": page.custom_font,
        "is_active": page.is_active,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.multilink_pages.insert_one(page_doc)
    
    logger.info(f"Created multilink page: {slug}")
    
    return {
        "id": page_id,
        "slug": slug,
        "url": f"/lien-bio/{slug}",
        "message": "Page créée avec succès"
    }


@router.get("/pages/{page_id}", response_model=dict)
async def get_page(page_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single multilink page with its links"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    page = await db.multilink_pages.find_one(
        {"id": page_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Get links
    links = await db.multilink_links.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    page["links"] = links
    
    return page


@router.put("/pages/{page_id}", response_model=dict)
async def update_page(page_id: str, page: PageUpdate, current_user: dict = Depends(get_current_user)):
    """Update a multilink page"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    existing = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    update_data = page.model_dump(exclude_unset=True)
    
    # Check slug uniqueness if changing
    if "slug" in update_data and update_data["slug"] != existing.get("slug"):
        slug_exists = await db.multilink_pages.find_one({"slug": update_data["slug"], "id": {"$ne": page_id}})
        if slug_exists:
            raise HTTPException(status_code=400, detail=f"Le slug '{update_data['slug']}' est déjà utilisé")
    
    # Update theme colors if theme changed
    if "theme" in update_data:
        theme_colors = THEME_PRESETS.get(update_data["theme"], THEME_PRESETS["minimal"])
        if update_data["theme"] == "custom" and update_data.get("custom_colors"):
            theme_colors = {**theme_colors, **update_data["custom_colors"]}
        update_data["theme_colors"] = theme_colors
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.multilink_pages.update_one(
        {"id": page_id},
        {"$set": update_data}
    )
    
    return {"message": "Page mise à jour", "slug": update_data.get("slug", existing.get("slug"))}


@router.delete("/pages/{page_id}", response_model=dict)
async def delete_page(page_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a multilink page and all its links"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    existing = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Delete page
    await db.multilink_pages.delete_one({"id": page_id})
    
    # Delete all links
    await db.multilink_links.delete_many({"page_id": page_id})
    
    # Delete stats
    await db.multilink_stats.delete_many({"page_id": page_id})
    await db.multilink_views.delete_many({"page_id": page_id})
    
    return {"message": "Page supprimée"}


# ==================== ADMIN ROUTES - LINKS ====================

@router.post("/pages/{page_id}/links", response_model=dict)
async def create_link(page_id: str, link: LinkCreate, current_user: dict = Depends(get_current_user)):
    """Add a link to a page"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Get max order
    max_order_doc = await db.multilink_links.find_one(
        {"page_id": page_id},
        sort=[("order", -1)]
    )
    max_order = max_order_doc.get("order", 0) if max_order_doc else 0
    
    link_id = str(uuid.uuid4())
    
    link_doc = {
        "id": link_id,
        "page_id": page_id,
        "label": link.label,
        "url": link.url,
        "icon": link.icon,
        "icon_type": link.icon_type,
        "is_active": link.is_active,
        "order": link.order if link.order else max_order + 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.multilink_links.insert_one(link_doc)
    
    return {"id": link_id, "message": "Lien ajouté"}


# IMPORTANT: Reorder route must be defined BEFORE routes with {link_id} parameter
# to avoid FastAPI matching "reorder" as a link_id
@router.put("/pages/{page_id}/links/reorder", response_model=dict)
async def reorder_links(page_id: str, data: LinksReorder, current_user: dict = Depends(get_current_user)):
    """Reorder links"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Update order for each link
    for index, link_id in enumerate(data.link_ids):
        await db.multilink_links.update_one(
            {"id": link_id, "page_id": page_id},
            {"$set": {"order": index}}
        )
    
    return {"message": "Ordre mis à jour"}


@router.put("/pages/{page_id}/links/{link_id}", response_model=dict)
async def update_link(page_id: str, link_id: str, link: LinkUpdate, current_user: dict = Depends(get_current_user)):
    """Update a link"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    existing = await db.multilink_links.find_one({"id": link_id, "page_id": page_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lien non trouvé")
    
    update_data = link.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.multilink_links.update_one(
        {"id": link_id},
        {"$set": update_data}
    )
    
    return {"message": "Lien mis à jour"}


@router.delete("/pages/{page_id}/links/{link_id}", response_model=dict)
async def delete_link(page_id: str, link_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a link"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    result = await db.multilink_links.delete_one({"id": link_id, "page_id": page_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lien non trouvé")
    
    # Delete link stats
    await db.multilink_stats.delete_many({"link_id": link_id})
    
    return {"message": "Lien supprimé"}


# ==================== ADMIN ROUTES - STATS ====================

@router.get("/pages/{page_id}/stats", response_model=dict)
async def get_page_stats(
    page_id: str, 
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed stats for a page"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    start_str = start_date.strftime("%Y-%m-%d")
    
    # Get daily views
    views_pipeline = [
        {"$match": {"page_id": page_id, "type": "view", "date": {"$gte": start_str}}},
        {"$sort": {"date": 1}}
    ]
    views_by_day = await db.multilink_stats.aggregate(views_pipeline).to_list(100)
    
    # Get daily clicks (all links)
    clicks_pipeline = [
        {"$match": {"page_id": page_id, "type": "click", "date": {"$gte": start_str}}},
        {"$group": {"_id": "$date", "count": {"$sum": "$count"}}},
        {"$sort": {"_id": 1}}
    ]
    clicks_by_day = await db.multilink_stats.aggregate(clicks_pipeline).to_list(100)
    
    # Get clicks per link
    link_clicks_pipeline = [
        {"$match": {"page_id": page_id, "type": "click"}},
        {"$group": {"_id": "$link_id", "total": {"$sum": "$count"}}}
    ]
    link_clicks = await db.multilink_stats.aggregate(link_clicks_pipeline).to_list(100)
    
    # Map link clicks to link labels
    links = await db.multilink_links.find({"page_id": page_id}, {"_id": 0}).to_list(100)
    link_map = {link["id"]: link["label"] for link in links}
    
    link_stats = []
    for lc in link_clicks:
        link_id = lc["_id"]
        link_stats.append({
            "link_id": link_id,
            "label": link_map.get(link_id, "Lien supprimé"),
            "clicks": lc["total"]
        })
    
    # Sort by clicks descending
    link_stats.sort(key=lambda x: x["clicks"], reverse=True)
    
    # Total stats
    total_views = sum(v.get("count", 0) for v in views_by_day)
    total_clicks = sum(c.get("count", 0) for c in clicks_by_day)
    
    # CTR
    ctr = round((total_clicks / total_views * 100), 2) if total_views > 0 else 0
    
    return {
        "page_id": page_id,
        "period_days": days,
        "total_views": total_views,
        "total_clicks": total_clicks,
        "ctr": ctr,
        "views_by_day": [{"date": v["date"], "count": v["count"]} for v in views_by_day],
        "clicks_by_day": [{"date": c["_id"], "count": c["count"]} for c in clicks_by_day],
        "link_stats": link_stats
    }


# ==================== PUBLIC ROUTES ====================

@router.get("/public/{slug}", response_model=dict)
async def get_public_page(slug: str, request: Request):
    """Get a public multilink page (no auth required)"""
    page = await db.multilink_pages.find_one(
        {"slug": slug, "is_active": True},
        {"_id": 0, "user_id": 0}
    )
    
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Get active links
    links = await db.multilink_links.find(
        {"page_id": page["id"], "is_active": True},
        {"_id": 0, "page_id": 0}
    ).sort("order", 1).to_list(100)
    
    page["links"] = links
    
    # Record view (async, don't wait)
    try:
        await record_page_view(page["id"], request)
    except Exception as e:
        logger.error(f"Failed to record view: {e}")
    
    return page


@router.post("/public/{slug}/click/{link_id}", response_model=dict)
async def record_click(slug: str, link_id: str, request: Request):
    """Record a link click (no auth required)"""
    page = await db.multilink_pages.find_one({"slug": slug, "is_active": True})
    
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    link = await db.multilink_links.find_one({"id": link_id, "page_id": page["id"]})
    
    if not link:
        raise HTTPException(status_code=404, detail="Lien non trouvé")
    
    # Record click
    await record_link_click(page["id"], link_id, request)
    
    return {"message": "Click recorded", "url": link.get("url")}


# ==================== UTILITY ROUTES ====================

@router.get("/themes", response_model=dict)
async def get_themes():
    """Get available theme presets"""
    return {"themes": THEME_PRESETS, "social_icons": SOCIAL_ICONS}


@router.post("/upload-image", response_model=dict)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload profile image for multilink page"""
    import cloudinary
    import cloudinary.uploader
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    contents = await file.read()
    
    # Check size (max 5MB)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="L'image ne doit pas dépasser 5MB")
    
    # Configure Cloudinary
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET')
    )
    
    try:
        user_id = current_user.get("user_id", "unknown")[:8]
        
        result = cloudinary.uploader.upload(
            contents,
            folder="multilink_profiles",
            public_id=f"profile_{user_id}_{str(uuid.uuid4())[:8]}",
            resource_type="image",
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"}
            ]
        )
        
        return {
            "success": True,
            "url": result.get('secure_url'),
            "message": "Image uploadée"
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur d'upload: {str(e)}")
