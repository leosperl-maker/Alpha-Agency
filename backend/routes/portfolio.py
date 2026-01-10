"""
Portfolio routes - Projects CRUD with rich content blocks
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone

from .database import db, get_current_user

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


# ==================== MODELS ====================

class ContentBlock(BaseModel):
    id: Optional[str] = None
    type: str  # 'text', 'heading', 'image', 'gallery', 'video', 'quote', etc.
    content: Optional[str] = None
    level: Optional[int] = None
    url: Optional[str] = None
    urls: Optional[List[str]] = None
    caption: Optional[str] = None
    alignment: Optional[str] = "center"
    rounded: Optional[bool] = True
    size: Optional[str] = "medium"
    images: Optional[List[dict]] = None
    items: Optional[List[dict]] = None
    columns: Optional[int] = None
    layout: Optional[str] = None
    ordered: Optional[bool] = None
    author: Optional[str] = None
    role: Optional[str] = None
    style: Optional[str] = None
    color: Optional[str] = None
    backgroundColor: Optional[str] = None
    textColor: Optional[str] = None
    padding: Optional[str] = None
    height: Optional[str] = None
    text: Optional[str] = None
    shadow: Optional[bool] = None
    before: Optional[str] = None
    after: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    blocks: Optional[List[dict]] = None

class PortfolioItemCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    subtitle: Optional[str] = None
    category: str
    tags: Optional[List[str]] = []
    featured_image: Optional[str] = None
    gallery_images: Optional[List[str]] = []
    content_blocks: Optional[List[ContentBlock]] = []
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    status: Optional[str] = "draft"
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    client_name: Optional[str] = None
    project_date: Optional[str] = None
    project_url: Optional[str] = None

class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    subtitle: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    featured_image: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    content_blocks: Optional[List[ContentBlock]] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    status: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    client_name: Optional[str] = None
    project_date: Optional[str] = None
    project_url: Optional[str] = None


# ==================== ROUTES ====================

@router.get("", response_model=List[dict])
async def get_portfolio(category: Optional[str] = None, tag: Optional[str] = None, status: Optional[str] = None):
    """Get all portfolio items"""
    query = {}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    if status:
        query["status"] = status
    items = await db.portfolio.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@router.post("", response_model=dict)
async def create_portfolio_item(item: PortfolioItemCreate, current_user: dict = Depends(get_current_user)):
    """Create a portfolio item with rich content"""
    item_id = str(uuid.uuid4())
    slug = item.slug or item.title.lower().replace(" ", "-").replace("'", "")
    
    # Make slug unique
    existing = await db.portfolio.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{item_id[:8]}"
    
    item_doc = {
        "id": item_id,
        "slug": slug,
        "title": item.title,
        "subtitle": item.subtitle,
        "category": item.category,
        "tags": item.tags or [],
        "featured_image": item.featured_image,
        "gallery_images": item.gallery_images or [],
        "content_blocks": [b.model_dump() if hasattr(b, 'model_dump') else b for b in item.content_blocks] if item.content_blocks else [],
        "audio_url": item.audio_url,
        "video_url": item.video_url,
        "status": item.status or "draft",
        "seo_title": item.seo_title or item.title,
        "seo_description": item.seo_description or item.subtitle,
        "client_name": item.client_name,
        "project_date": item.project_date,
        "project_url": item.project_url,
        "created_by": current_user.get("user_id") or current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.portfolio.insert_one(item_doc)
    return {"id": item_id, "slug": slug, "message": "Réalisation ajoutée"}


@router.get("/by-slug/{slug}", response_model=dict)
async def get_portfolio_item_by_slug(slug: str):
    """Get a single portfolio item by slug"""
    item = await db.portfolio.find_one({"slug": slug}, {"_id": 0})
    if not item:
        item = await db.portfolio.find_one({"id": slug}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Réalisation non trouvée")
    return item


@router.get("/{item_id}", response_model=dict)
async def get_portfolio_item(item_id: str):
    """Get a single portfolio item by ID or slug"""
    item = await db.portfolio.find_one({"$or": [{"id": item_id}, {"slug": item_id}]}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Réalisation non trouvée")
    return item


@router.put("/{item_id}", response_model=dict)
async def update_portfolio_item(item_id: str, item: PortfolioItemUpdate, current_user: dict = Depends(get_current_user)):
    """Update a portfolio item"""
    existing = await db.portfolio.find_one({"$or": [{"id": item_id}, {"slug": item_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Réalisation non trouvée")
    
    update_data = {k: v for k, v in item.model_dump().items() if v is not None}
    if "content_blocks" in update_data:
        update_data["content_blocks"] = [b if isinstance(b, dict) else b.model_dump() for b in update_data["content_blocks"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.portfolio.update_one({"id": existing["id"]}, {"$set": update_data})
    return {"message": "Réalisation mise à jour"}


@router.delete("/{item_id}", response_model=dict)
async def delete_portfolio_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a portfolio item"""
    result = await db.portfolio.delete_one({"$or": [{"id": item_id}, {"slug": item_id}]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Réalisation non trouvée")
    return {"message": "Réalisation supprimée"}
