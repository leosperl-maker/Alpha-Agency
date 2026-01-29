"""
Multilink Module - Linktree/Zaap.bio style link pages
Allows creating and managing bio link pages accessible at /lien-bio/{slug}
Unified BLOCKS system - links, images, videos, text are all blocks
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


# ==================== UNIFIED BLOCK MODEL ====================

class BlockCreate(BaseModel):
    """Unified block model - replaces separate links and sections"""
    block_type: str  # link, link_image, button, carousel, text, image, video, youtube, header, divider
    
    # For link blocks
    label: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None  # Image for link_image type
    icon: Optional[str] = None
    
    # For text/header blocks
    content: Optional[str] = None
    
    # For carousel blocks
    items: Optional[List[dict]] = None  # [{image, title, subtitle, url}]
    
    # For image/video blocks
    media_url: Optional[str] = None  # Cloudinary URL
    media_type: Optional[str] = None  # image or video
    
    # For youtube blocks
    youtube_url: Optional[str] = None
    
    # Display settings
    settings: Optional[dict] = None  # {aspect_ratio, rounded, columns, etc.}
    # aspect_ratio: "1:1", "4:5", "16:9", "9:16"
    # rounded: true/false or "none", "sm", "md", "lg", "full"
    # columns: 1, 2, 3 for image galleries
    
    is_active: bool = True
    order: Optional[int] = 0

class BlockUpdate(BaseModel):
    block_type: Optional[str] = None
    label: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    icon: Optional[str] = None
    content: Optional[str] = None
    items: Optional[List[dict]] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    youtube_url: Optional[str] = None
    settings: Optional[dict] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

class BlocksReorder(BaseModel):
    block_ids: List[str]


# Legacy models for backward compatibility
class LinkCreate(BaseModel):
    label: str
    url: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    icon: Optional[str] = None
    icon_type: Optional[str] = "lucide"
    link_type: Optional[str] = "link"
    is_active: bool = True
    order: Optional[int] = 0

class LinkUpdate(BaseModel):
    label: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    icon: Optional[str] = None
    icon_type: Optional[str] = None
    link_type: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


# Section models for zaap.bio style sections
class SectionCreate(BaseModel):
    section_type: str  # carousel, text, image, divider, header
    title: Optional[str] = None
    content: Optional[str] = None  # Text content for text sections
    items: Optional[List[dict]] = None  # Items for carousel: [{image, title, subtitle, url}]
    images: Optional[List[str]] = None  # Image URLs for image sections
    settings: Optional[dict] = None  # {columns, gap, rounded, etc.}
    is_active: bool = True
    order: Optional[int] = 0

class SectionUpdate(BaseModel):
    section_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    items: Optional[List[dict]] = None
    images: Optional[List[str]] = None
    settings: Optional[dict] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


class PageCreate(BaseModel):
    slug: str
    title: str
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    banner_image: Optional[str] = None  # Featured image
    theme: Optional[str] = "dark"  # minimal, dark, gradient, ocean, sunset, nature, custom
    custom_colors: Optional[dict] = None  # {background, text, button_bg, button_text, accent}
    design_settings: Optional[dict] = None  # {button_style, background_type, gradient, background_image}
    seo_settings: Optional[dict] = None  # {title, description, keywords, og_image, indexable}
    social_links: Optional[List[dict]] = None  # [{platform, url, is_active}]
    custom_font: Optional[str] = None
    verified: bool = False
    is_active: bool = True

class PageUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    banner_image: Optional[str] = None
    theme: Optional[str] = None
    custom_colors: Optional[dict] = None
    design_settings: Optional[dict] = None
    seo_settings: Optional[dict] = None
    social_links: Optional[List[dict]] = None
    custom_font: Optional[str] = None
    verified: Optional[bool] = None
    is_active: Optional[bool] = None

class LinksReorder(BaseModel):
    link_ids: List[str]  # Ordered list of link IDs

class SectionsReorder(BaseModel):
    section_ids: List[str]  # Ordered list of section IDs


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


async def record_link_click(page_id: str, link_id: str, request: Request, block_id: str = None):
    """Record a link or block click"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Build the query for the stats record
    query = {"page_id": page_id, "date": today, "type": "click"}
    if block_id:
        query["block_id"] = block_id
    else:
        query["link_id"] = link_id
    
    # Update daily stats
    await db.multilink_stats.update_one(
        query,
        {
            "$inc": {"count": 1},
            "$setOnInsert": query
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
    theme_colors = THEME_PRESETS.get(page.theme, THEME_PRESETS["dark"])
    if page.theme == "custom" and page.custom_colors:
        theme_colors = {**theme_colors, **page.custom_colors}
    
    # Default design settings
    design_settings = page.design_settings or {
        "button_style": "rounded",  # rounded, pill, square, soft, outline
        "background_type": "solid",  # solid, gradient, image
        "gradient": None,
        "background_image": None
    }
    
    # Default SEO settings
    seo_settings = page.seo_settings or {
        "title": page.title,
        "description": page.bio or "",
        "keywords": "",
        "og_image": page.profile_image,
        "indexable": True
    }
    
    page_doc = {
        "id": page_id,
        "user_id": user_id,
        "slug": slug,
        "title": page.title,
        "bio": page.bio,
        "profile_image": page.profile_image,
        "banner_image": page.banner_image,
        "theme": page.theme,
        "theme_colors": theme_colors,
        "custom_colors": page.custom_colors,
        "design_settings": design_settings,
        "seo_settings": seo_settings,
        "social_links": page.social_links or [],
        "custom_font": page.custom_font,
        "verified": page.verified,
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
    """Get a single multilink page with its blocks (unified system)"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    page = await db.multilink_pages.find_one(
        {"id": page_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Get unified blocks (new system)
    blocks = await db.multilink_blocks.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("order", 1).to_list(200)
    
    page["blocks"] = blocks
    
    # Legacy: Get links (for backward compatibility)
    links = await db.multilink_links.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    page["links"] = links
    
    # Legacy: Get sections (for backward compatibility)
    sections = await db.multilink_sections.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    page["sections"] = sections
    
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
    
    # Update theme colors if theme changed or if custom_colors changed for custom theme
    current_theme = update_data.get("theme", existing.get("theme"))
    if "theme" in update_data or ("custom_colors" in update_data and current_theme == "custom"):
        theme_colors = THEME_PRESETS.get(current_theme, THEME_PRESETS["minimal"]).copy()
        # For custom theme, merge custom_colors
        if current_theme == "custom":
            custom_colors = update_data.get("custom_colors") or existing.get("custom_colors") or {}
            theme_colors = {**theme_colors, **custom_colors}
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
    
    # Delete all sections
    await db.multilink_sections.delete_many({"page_id": page_id})
    
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
        "description": link.description,
        "thumbnail": link.thumbnail,
        "icon": link.icon,
        "icon_type": link.icon_type,
        "link_type": link.link_type,
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


# ==================== ADMIN ROUTES - UNIFIED BLOCKS ====================
# This is the NEW unified system where links and sections are all "blocks"

@router.get("/pages/{page_id}/blocks", response_model=list)
async def get_blocks(page_id: str, current_user: dict = Depends(get_current_user)):
    """Get all blocks for a page (unified links + sections)"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    blocks = await db.multilink_blocks.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("order", 1).to_list(200)
    
    return blocks


@router.post("/pages/{page_id}/blocks", response_model=dict)
async def create_block(page_id: str, block: BlockCreate, current_user: dict = Depends(get_current_user)):
    """Create a new block"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Get max order
    max_order_doc = await db.multilink_blocks.find_one(
        {"page_id": page_id},
        sort=[("order", -1)]
    )
    max_order = max_order_doc.get("order", 0) if max_order_doc else 0
    
    block_id = str(uuid.uuid4())
    
    # Default settings based on block type
    default_settings = {
        "link": {"rounded": "md"},
        "link_image": {"aspect_ratio": "auto", "rounded": "lg"},
        "button": {"rounded": "full", "style": "primary"},
        "carousel": {"autoplay": False, "show_arrows": True},
        "text": {"align": "left", "size": "base"},
        "image": {"aspect_ratio": "auto", "rounded": "lg", "columns": 1},
        "video": {"aspect_ratio": "16:9", "rounded": "lg", "autoplay": False},
        "youtube": {"aspect_ratio": "16:9", "rounded": "lg"},
        "header": {"size": "lg", "align": "center"},
        "divider": {"style": "line", "spacing": "md"}
    }
    
    block_doc = {
        "id": block_id,
        "page_id": page_id,
        "block_type": block.block_type,
        "label": block.label,
        "url": block.url,
        "description": block.description,
        "thumbnail": block.thumbnail,
        "icon": block.icon,
        "content": block.content,
        "items": block.items or [],
        "media_url": block.media_url,
        "media_type": block.media_type,
        "youtube_url": block.youtube_url,
        "settings": block.settings or default_settings.get(block.block_type, {}),
        "is_active": block.is_active,
        "order": block.order if block.order else max_order + 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.multilink_blocks.insert_one(block_doc)
    
    return {"id": block_id, "message": "Bloc ajouté"}


@router.put("/pages/{page_id}/blocks/reorder", response_model=dict)
async def reorder_blocks(page_id: str, data: BlocksReorder, current_user: dict = Depends(get_current_user)):
    """Reorder blocks"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    for index, block_id in enumerate(data.block_ids):
        await db.multilink_blocks.update_one(
            {"id": block_id, "page_id": page_id},
            {"$set": {"order": index}}
        )
    
    return {"message": "Ordre mis à jour"}


@router.put("/pages/{page_id}/blocks/{block_id}", response_model=dict)
async def update_block(page_id: str, block_id: str, block: BlockUpdate, current_user: dict = Depends(get_current_user)):
    """Update a block"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    existing = await db.multilink_blocks.find_one({"id": block_id, "page_id": page_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Bloc non trouvé")
    
    update_data = block.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.multilink_blocks.update_one(
        {"id": block_id},
        {"$set": update_data}
    )
    
    return {"message": "Bloc mis à jour"}


@router.delete("/pages/{page_id}/blocks/{block_id}", response_model=dict)
async def delete_block(page_id: str, block_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a block"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    result = await db.multilink_blocks.delete_one({"id": block_id, "page_id": page_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bloc non trouvé")
    
    return {"message": "Bloc supprimé"}


# ==================== MEDIA UPLOAD FOR BLOCKS ====================

@router.post("/upload-media", response_model=dict)
async def upload_block_media(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload image or video for Multilink blocks via Cloudinary"""
    import cloudinary
    import cloudinary.uploader
    import io
    
    # Check Cloudinary credentials
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
    api_key = os.environ.get('CLOUDINARY_API_KEY')
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
    
    if not all([cloud_name, api_key, api_secret]):
        raise HTTPException(status_code=500, detail="Cloudinary non configuré")
    
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )
    
    # Validate file type
    content_type = file.content_type or ""
    is_image = content_type.startswith('image/')
    is_video = content_type.startswith('video/')
    
    if not is_image and not is_video:
        raise HTTPException(status_code=400, detail="Format non supporté. Images et vidéos uniquement.")
    
    # Read file
    contents = await file.read()
    file_size = len(contents)
    
    # Size limits
    max_size = 100 * 1024 * 1024 if is_video else 10 * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux (max {max_size // (1024*1024)}MB)")
    
    try:
        # Upload to Cloudinary
        unique_id = str(uuid.uuid4())[:8]
        result = cloudinary.uploader.upload(
            io.BytesIO(contents),
            folder="multilink_blocks",
            public_id=f"block_{unique_id}_{file.filename.split('.')[0]}",
            resource_type="video" if is_video else "image",
            overwrite=True
        )
        
        return {
            "success": True,
            "url": result.get('secure_url'),
            "public_id": result.get('public_id'),
            "media_type": "video" if is_video else "image",
            "width": result.get('width'),
            "height": result.get('height'),
            "format": result.get('format'),
            "duration": result.get('duration') if is_video else None
        }
        
    except Exception as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")


# ==================== ADMIN ROUTES - SECTIONS ====================

@router.get("/pages/{page_id}/sections", response_model=list)
async def get_sections(page_id: str, current_user: dict = Depends(get_current_user)):
    """Get all sections for a page"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    sections = await db.multilink_sections.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    return sections


@router.post("/pages/{page_id}/sections", response_model=dict)
async def create_section(page_id: str, section: SectionCreate, current_user: dict = Depends(get_current_user)):
    """Add a section to a page"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Get max order
    max_order_doc = await db.multilink_sections.find_one(
        {"page_id": page_id},
        sort=[("order", -1)]
    )
    max_order = max_order_doc.get("order", 0) if max_order_doc else 0
    
    section_id = str(uuid.uuid4())
    
    # Default settings based on section type
    default_settings = {
        "carousel": {"autoplay": False, "show_arrows": True, "card_style": "rounded"},
        "text": {"align": "left", "size": "base"},
        "image": {"columns": 2, "gap": 2, "rounded": True},
        "divider": {"style": "line", "spacing": "md"},
        "header": {"size": "lg", "align": "center"}
    }
    
    section_doc = {
        "id": section_id,
        "page_id": page_id,
        "section_type": section.section_type,
        "title": section.title,
        "content": section.content,
        "items": section.items or [],
        "images": section.images or [],
        "settings": section.settings or default_settings.get(section.section_type, {}),
        "is_active": section.is_active,
        "order": section.order if section.order else max_order + 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.multilink_sections.insert_one(section_doc)
    
    return {"id": section_id, "message": "Section ajoutée"}


@router.put("/pages/{page_id}/sections/reorder", response_model=dict)
async def reorder_sections(page_id: str, data: SectionsReorder, current_user: dict = Depends(get_current_user)):
    """Reorder sections"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    # Update order for each section
    for index, section_id in enumerate(data.section_ids):
        await db.multilink_sections.update_one(
            {"id": section_id, "page_id": page_id},
            {"$set": {"order": index}}
        )
    
    return {"message": "Ordre des sections mis à jour"}


@router.put("/pages/{page_id}/sections/{section_id}", response_model=dict)
async def update_section(page_id: str, section_id: str, section: SectionUpdate, current_user: dict = Depends(get_current_user)):
    """Update a section"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    existing = await db.multilink_sections.find_one({"id": section_id, "page_id": page_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    
    update_data = section.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.multilink_sections.update_one(
        {"id": section_id},
        {"$set": update_data}
    )
    
    return {"message": "Section mise à jour"}


@router.delete("/pages/{page_id}/sections/{section_id}", response_model=dict)
async def delete_section(page_id: str, section_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a section"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Verify page ownership
    page = await db.multilink_pages.find_one({"id": page_id, "user_id": user_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    result = await db.multilink_sections.delete_one({"id": section_id, "page_id": page_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    
    return {"message": "Section supprimée"}


# ==================== ADMIN ROUTES - STATS ====================

@router.get("/pages/{page_id}/stats", response_model=dict)
async def get_page_stats(
    page_id: str, 
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed stats for a page including block-level analytics"""
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
    
    # Get daily clicks (all links/blocks)
    clicks_pipeline = [
        {"$match": {"page_id": page_id, "type": "click", "date": {"$gte": start_str}}},
        {"$group": {"_id": "$date", "count": {"$sum": "$count"}}},
        {"$sort": {"_id": 1}}
    ]
    clicks_by_day = await db.multilink_stats.aggregate(clicks_pipeline).to_list(100)
    
    # Get clicks per link (legacy)
    link_clicks_pipeline = [
        {"$match": {"page_id": page_id, "type": "click", "link_id": {"$exists": True}}},
        {"$group": {"_id": "$link_id", "total": {"$sum": "$count"}}}
    ]
    link_clicks = await db.multilink_stats.aggregate(link_clicks_pipeline).to_list(100)
    
    # Get clicks per block (new unified system)
    block_clicks_pipeline = [
        {"$match": {"page_id": page_id, "type": "click", "block_id": {"$exists": True}}},
        {"$group": {"_id": "$block_id", "total": {"$sum": "$count"}}}
    ]
    block_clicks = await db.multilink_stats.aggregate(block_clicks_pipeline).to_list(100)
    
    # Map link clicks to link labels
    links = await db.multilink_links.find({"page_id": page_id}, {"_id": 0}).to_list(100)
    link_map = {link["id"]: link["label"] for link in links}
    
    # Map block clicks to block labels
    blocks = await db.multilink_blocks.find({"page_id": page_id}, {"_id": 0}).to_list(200)
    block_map = {block["id"]: {
        "label": block.get("label") or block.get("content", "")[:50] or f"Block ({block.get('block_type', 'unknown')})",
        "type": block.get("block_type", "unknown"),
        "thumbnail": block.get("thumbnail") or block.get("media_url"),
        "url": block.get("url")
    } for block in blocks}
    
    link_stats = []
    for lc in link_clicks:
        link_id = lc["_id"]
        link_stats.append({
            "link_id": link_id,
            "label": link_map.get(link_id, "Lien supprimé"),
            "clicks": lc["total"]
        })
    
    block_stats = []
    for bc in block_clicks:
        block_id = bc["_id"]
        block_info = block_map.get(block_id, {"label": "Bloc supprimé", "type": "unknown"})
        block_stats.append({
            "block_id": block_id,
            "label": block_info["label"],
            "type": block_info["type"],
            "thumbnail": block_info.get("thumbnail"),
            "url": block_info.get("url"),
            "clicks": bc["total"]
        })
    
    # Sort by clicks descending
    link_stats.sort(key=lambda x: x["clicks"], reverse=True)
    block_stats.sort(key=lambda x: x["clicks"], reverse=True)
    
    # Total stats
    total_views = sum(v.get("count", 0) for v in views_by_day)
    total_clicks = sum(c.get("count", 0) for c in clicks_by_day)
    
    # CTR
    ctr = round((total_clicks / total_views * 100), 2) if total_views > 0 else 0
    
    # Previous period comparison
    prev_start = start_date - timedelta(days=days)
    prev_end = start_date
    prev_start_str = prev_start.strftime("%Y-%m-%d")
    prev_end_str = prev_end.strftime("%Y-%m-%d")
    
    prev_views_pipeline = [
        {"$match": {"page_id": page_id, "type": "view", "date": {"$gte": prev_start_str, "$lt": prev_end_str}}},
        {"$group": {"_id": None, "total": {"$sum": "$count"}}}
    ]
    prev_views_result = await db.multilink_stats.aggregate(prev_views_pipeline).to_list(1)
    prev_total_views = prev_views_result[0]["total"] if prev_views_result else 0
    
    prev_clicks_pipeline = [
        {"$match": {"page_id": page_id, "type": "click", "date": {"$gte": prev_start_str, "$lt": prev_end_str}}},
        {"$group": {"_id": None, "total": {"$sum": "$count"}}}
    ]
    prev_clicks_result = await db.multilink_stats.aggregate(prev_clicks_pipeline).to_list(1)
    prev_total_clicks = prev_clicks_result[0]["total"] if prev_clicks_result else 0
    
    # Calculate growth
    views_growth = round(((total_views - prev_total_views) / prev_total_views * 100), 1) if prev_total_views > 0 else 0
    clicks_growth = round(((total_clicks - prev_total_clicks) / prev_total_clicks * 100), 1) if prev_total_clicks > 0 else 0
    
    return {
        "page_id": page_id,
        "period_days": days,
        "total_views": total_views,
        "total_clicks": total_clicks,
        "ctr": ctr,
        "views_growth": views_growth,
        "clicks_growth": clicks_growth,
        "prev_total_views": prev_total_views,
        "prev_total_clicks": prev_total_clicks,
        "views_by_day": [{"date": v["date"], "count": v["count"]} for v in views_by_day],
        "clicks_by_day": [{"date": c["_id"], "count": c["count"]} for c in clicks_by_day],
        "link_stats": link_stats,
        "block_stats": block_stats
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
    
    # Get active blocks (new unified system)
    blocks = await db.multilink_blocks.find(
        {"page_id": page["id"], "is_active": True},
        {"_id": 0, "page_id": 0}
    ).sort("order", 1).to_list(200)
    
    page["blocks"] = blocks
    
    # Legacy: Get active links (backward compatibility)
    links = await db.multilink_links.find(
        {"page_id": page["id"], "is_active": True},
        {"_id": 0, "page_id": 0}
    ).sort("order", 1).to_list(100)
    
    page["links"] = links
    
    # Legacy: Get active sections (backward compatibility)
    sections = await db.multilink_sections.find(
        {"page_id": page["id"], "is_active": True},
        {"_id": 0, "page_id": 0}
    ).sort("order", 1).to_list(100)
    
    page["sections"] = sections
    
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


@router.post("/public/{slug}/block-click/{block_id}", response_model=dict)
async def record_block_click(slug: str, block_id: str, request: Request):
    """Record a block click (no auth required)"""
    page = await db.multilink_pages.find_one({"slug": slug, "is_active": True})
    
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvée")
    
    block = await db.multilink_blocks.find_one({"id": block_id, "page_id": page["id"]})
    
    if not block:
        raise HTTPException(status_code=404, detail="Bloc non trouvé")
    
    # Record click
    await record_link_click(page["id"], None, request, block_id=block_id)
    
    return {"message": "Click recorded", "url": block.get("url")}


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
