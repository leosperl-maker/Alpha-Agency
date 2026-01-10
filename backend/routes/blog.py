"""
Blog routes - Articles CRUD with rich content
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone

from .database import db, get_current_user

router = APIRouter(prefix="/blog", tags=["Blog"])


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

class BlogArticleCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    content_blocks: Optional[List[ContentBlock]] = []
    tags: Optional[List[str]] = []
    category: Optional[str] = None
    status: Optional[str] = "draft"
    published_at: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

class BlogArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    content_blocks: Optional[List[ContentBlock]] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    status: Optional[str] = None
    published_at: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


# ==================== ROUTES ====================

@router.get("", response_model=List[dict])
async def get_blog_posts(published_only: bool = True, tag: Optional[str] = None, category: Optional[str] = None):
    """Get all blog articles"""
    query = {}
    if published_only:
        query["status"] = "published"
    if tag:
        query["tags"] = tag
    if category:
        query["category"] = category
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("published_at", -1).to_list(100)
    return posts


@router.post("", response_model=dict)
async def create_blog_article(article: BlogArticleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new blog article with rich content"""
    article_id = str(uuid.uuid4())
    slug = article.slug or article.title.lower().replace(" ", "-").replace("'", "")
    
    # Make slug unique
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{article_id[:8]}"
    
    article_doc = {
        "id": article_id,
        "slug": slug,
        "title": article.title,
        "excerpt": article.excerpt,
        "featured_image": article.featured_image,
        "content_blocks": [b.model_dump() for b in article.content_blocks] if article.content_blocks else [],
        "tags": article.tags or [],
        "category": article.category,
        "status": article.status or "draft",
        "published_at": article.published_at or (datetime.now(timezone.utc).isoformat() if article.status == "published" else None),
        "seo_title": article.seo_title or article.title,
        "seo_description": article.seo_description or article.excerpt,
        "author_id": current_user.get("user_id") or current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blog_posts.insert_one(article_doc)
    return {"id": article_id, "slug": slug, "message": "Article créé"}


@router.get("/{slug}", response_model=dict)
async def get_blog_post(slug: str):
    """Get a single blog article by slug or ID"""
    post = await db.blog_posts.find_one({"$or": [{"slug": slug}, {"id": slug}]}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return post


@router.put("/{article_id}", response_model=dict)
async def update_blog_article(article_id: str, article: BlogArticleUpdate, current_user: dict = Depends(get_current_user)):
    """Update a blog article"""
    existing = await db.blog_posts.find_one({"$or": [{"id": article_id}, {"slug": article_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    update_data = {k: v for k, v in article.model_dump().items() if v is not None}
    if "content_blocks" in update_data:
        update_data["content_blocks"] = [b if isinstance(b, dict) else b.model_dump() for b in update_data["content_blocks"]]
    
    # Handle publishing
    if article.status == "published" and existing.get("status") != "published":
        update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.blog_posts.update_one({"id": existing["id"]}, {"$set": update_data})
    return {"message": "Article mis à jour"}


@router.delete("/{article_id}", response_model=dict)
async def delete_blog_article(article_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a blog article"""
    result = await db.blog_posts.delete_one({"$or": [{"id": article_id}, {"slug": article_id}]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return {"message": "Article supprimé"}
