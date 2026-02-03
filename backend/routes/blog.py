"""
Blog routes - Articles CRUD with rich content
Supports automation via API key for n8n/external workflows
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone
import httpx
import os
import re

from .database import db, get_current_user, get_optional_user, security

router = APIRouter(prefix="/blog", tags=["Blog"])

# API Key for external automation (n8n, Zapier, etc.)
BLOG_API_KEY = os.environ.get('BLOG_API_KEY', 'blog-auto-publish-key-2024')


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
    status: Optional[str] = "draft"  # draft, published, scheduled
    published_at: Optional[str] = None
    publish_at: Optional[str] = None  # For scheduled publishing (ISO format)
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    # For AI automation - store source payload for audit/replay
    source_ia: Optional[dict] = None
    # Alternative: raw content that will be converted to blocks
    content_html: Optional[str] = None
    content_markdown: Optional[str] = None


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
    publish_at: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    source_ia: Optional[dict] = None
    content_html: Optional[str] = None
    content_markdown: Optional[str] = None


class AutoPublishArticle(BaseModel):
    """Model for automated article creation via n8n/external workflow"""
    title: str
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    featured_image_url: Optional[str] = None  # URL to download image from
    content: Optional[str] = None  # Can be HTML or Markdown - will be auto-converted (optional if content_blocks provided)
    content_format: Optional[str] = "markdown"  # 'markdown', 'html', 'text'
    content_blocks: Optional[List[ContentBlock]] = None  # Direct content blocks with images support
    tags: Optional[List[str]] = []
    category: Optional[str] = None
    status: Optional[str] = "published"  # draft, published, scheduled
    publish_at: Optional[str] = None  # ISO datetime for scheduled publish
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    author_name: Optional[str] = "Alpha Agency"
    # Source tracking for audit
    source_ia: Optional[dict] = None  # Store raw AI payload


# ==================== HELPERS ====================

def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from title"""
    slug = title.lower()
    # Remove accents
    accents = {'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a', 'ä': 'a',
               'ù': 'u', 'û': 'u', 'ü': 'u', 'ô': 'o', 'ö': 'o', 'î': 'i', 'ï': 'i',
               'ç': 'c', 'ñ': 'n', 'œ': 'oe', 'æ': 'ae'}
    for accent, replacement in accents.items():
        slug = slug.replace(accent, replacement)
    # Replace spaces and special chars
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug


def markdown_to_blocks(markdown_content: str) -> List[dict]:
    """Convert Markdown content to content blocks"""
    blocks = []
    lines = markdown_content.split('\n')
    current_text = []
    
    for line in lines:
        stripped = line.strip()
        
        # Heading H1
        if stripped.startswith('# ') and not stripped.startswith('## '):
            if current_text:
                blocks.append({
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "content": '\n'.join(current_text)
                })
                current_text = []
            blocks.append({
                "id": str(uuid.uuid4()),
                "type": "heading",
                "content": stripped[2:],
                "level": 1
            })
        # Heading H2
        elif stripped.startswith('## ') and not stripped.startswith('### '):
            if current_text:
                blocks.append({
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "content": '\n'.join(current_text)
                })
                current_text = []
            blocks.append({
                "id": str(uuid.uuid4()),
                "type": "heading",
                "content": stripped[3:],
                "level": 2
            })
        # Heading H3
        elif stripped.startswith('### '):
            if current_text:
                blocks.append({
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "content": '\n'.join(current_text)
                })
                current_text = []
            blocks.append({
                "id": str(uuid.uuid4()),
                "type": "heading",
                "content": stripped[4:],
                "level": 3
            })
        # Image
        elif stripped.startswith('![') and '](' in stripped:
            if current_text:
                blocks.append({
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "content": '\n'.join(current_text)
                })
                current_text = []
            # Extract alt and url
            alt_match = re.match(r'!\[(.*?)\]\((.*?)\)', stripped)
            if alt_match:
                blocks.append({
                    "id": str(uuid.uuid4()),
                    "type": "image",
                    "url": alt_match.group(2),
                    "caption": alt_match.group(1)
                })
        # Quote
        elif stripped.startswith('> '):
            if current_text:
                blocks.append({
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "content": '\n'.join(current_text)
                })
                current_text = []
            blocks.append({
                "id": str(uuid.uuid4()),
                "type": "quote",
                "content": stripped[2:]
            })
        # Empty line - paragraph break
        elif not stripped:
            if current_text:
                blocks.append({
                    "id": str(uuid.uuid4()),
                    "type": "text",
                    "content": '\n'.join(current_text)
                })
                current_text = []
        else:
            current_text.append(line)
    
    # Don't forget remaining text
    if current_text:
        blocks.append({
            "id": str(uuid.uuid4()),
            "type": "text",
            "content": '\n'.join(current_text)
        })
    
    return blocks


def html_to_blocks(html_content: str) -> List[dict]:
    """Convert HTML content to content blocks (basic conversion)"""
    blocks = []
    
    # Simple regex-based conversion
    # H1
    for match in re.finditer(r'<h1[^>]*>(.*?)</h1>', html_content, re.DOTALL | re.IGNORECASE):
        blocks.append({
            "id": str(uuid.uuid4()),
            "type": "heading",
            "content": re.sub(r'<[^>]+>', '', match.group(1)).strip(),
            "level": 1
        })
    
    # H2
    for match in re.finditer(r'<h2[^>]*>(.*?)</h2>', html_content, re.DOTALL | re.IGNORECASE):
        blocks.append({
            "id": str(uuid.uuid4()),
            "type": "heading",
            "content": re.sub(r'<[^>]+>', '', match.group(1)).strip(),
            "level": 2
        })
    
    # H3
    for match in re.finditer(r'<h3[^>]*>(.*?)</h3>', html_content, re.DOTALL | re.IGNORECASE):
        blocks.append({
            "id": str(uuid.uuid4()),
            "type": "heading",
            "content": re.sub(r'<[^>]+>', '', match.group(1)).strip(),
            "level": 3
        })
    
    # Paragraphs
    for match in re.finditer(r'<p[^>]*>(.*?)</p>', html_content, re.DOTALL | re.IGNORECASE):
        content = re.sub(r'<[^>]+>', '', match.group(1)).strip()
        if content:
            blocks.append({
                "id": str(uuid.uuid4()),
                "type": "text",
                "content": content
            })
    
    # Images
    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html_content, re.IGNORECASE):
        blocks.append({
            "id": str(uuid.uuid4()),
            "type": "image",
            "url": match.group(1)
        })
    
    # If no blocks found, treat as plain text
    if not blocks:
        clean_text = re.sub(r'<[^>]+>', '', html_content).strip()
        if clean_text:
            blocks.append({
                "id": str(uuid.uuid4()),
                "type": "text",
                "content": clean_text
            })
    
    return blocks


async def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verify API key for automated access"""
    if not x_api_key:
        return None
    if x_api_key == BLOG_API_KEY:
        return {"type": "api_key", "name": "automation"}
    return None


# ==================== PUBLIC ROUTES ====================

@router.get("/api-info", response_model=dict)
async def get_api_info():
    """
    📚 Documentation de l'API Blog pour l'automatisation
    
    Retourne les informations sur l'endpoint d'automatisation.
    """
    return {
        "endpoint": "/api/blog/auto-publish",
        "method": "POST",
        "authentication": "Header X-API-Key",
        "description": "Crée et publie automatiquement un article de blog",
        "fields": {
            "title": {"type": "string", "required": True, "description": "Titre de l'article"},
            "slug": {"type": "string", "required": False, "description": "URL personnalisée (auto-générée si absent)"},
            "excerpt": {"type": "string", "required": False, "description": "Résumé/extrait de l'article"},
            "content": {"type": "string", "required": True, "description": "Contenu de l'article (Markdown, HTML ou texte)"},
            "content_format": {"type": "string", "required": False, "default": "markdown", "options": ["markdown", "html", "text"]},
            "featured_image_url": {"type": "string", "required": False, "description": "URL de l'image à la une"},
            "tags": {"type": "array", "required": False, "description": "Liste des tags"},
            "category": {"type": "string", "required": False, "description": "Catégorie de l'article"},
            "status": {"type": "string", "required": False, "default": "published", "options": ["draft", "published", "scheduled"]},
            "publish_at": {"type": "string", "required": False, "description": "Date de publication programmée (ISO 8601)"},
            "seo_title": {"type": "string", "required": False, "description": "Titre SEO (utilise le titre si absent)"},
            "seo_description": {"type": "string", "required": False, "description": "Description SEO (utilise l'extrait si absent)"},
            "author_name": {"type": "string", "required": False, "default": "Alpha Agency"},
            "source_ia": {"type": "object", "required": False, "description": "Payload source pour audit (modèle, prompt, etc.)"}
        },
        "example_request": {
            "title": "Les tendances marketing digital 2024",
            "excerpt": "Découvrez les principales tendances qui vont façonner le marketing digital cette année.",
            "content": "## Introduction\n\nLe marketing digital évolue constamment...\n\n## 1. L'IA générative\n\nL'intelligence artificielle...",
            "content_format": "markdown",
            "featured_image_url": "https://example.com/image.jpg",
            "tags": ["marketing", "digital", "tendances"],
            "category": "Marketing",
            "status": "published",
            "seo_title": "Tendances Marketing Digital 2024 | Alpha Agency",
            "seo_description": "Guide complet des tendances marketing digital 2024. IA, personnalisation, vidéo courte...",
            "source_ia": {
                "model": "claude-sonnet-4.5",
                "image_model": "dall-e-3",
                "generated_at": "2024-01-15T10:30:00Z"
            }
        }
    }


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


@router.get("/article/{slug}", response_model=dict)
async def get_blog_post(slug: str):
    """Get a single blog article by slug or ID"""
    post = await db.blog_posts.find_one({"$or": [{"slug": slug}, {"id": slug}]}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return post


# ==================== AUTHENTICATED ROUTES ====================

@router.post("", response_model=dict)
async def create_blog_article(article: BlogArticleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new blog article with rich content (requires login)"""
    article_id = str(uuid.uuid4())
    slug = article.slug or generate_slug(article.title)
    
    # Make slug unique
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{article_id[:8]}"
    
    # Convert content if provided
    content_blocks = []
    if article.content_blocks:
        content_blocks = [b.model_dump() for b in article.content_blocks]
    elif article.content_markdown:
        content_blocks = markdown_to_blocks(article.content_markdown)
    elif article.content_html:
        content_blocks = html_to_blocks(article.content_html)
    
    article_doc = {
        "id": article_id,
        "slug": slug,
        "title": article.title,
        "excerpt": article.excerpt,
        "featured_image": article.featured_image,
        "content_blocks": content_blocks,
        "tags": article.tags or [],
        "category": article.category,
        "status": article.status or "draft",
        "published_at": article.published_at or (datetime.now(timezone.utc).isoformat() if article.status == "published" else None),
        "publish_at": article.publish_at,
        "seo_title": article.seo_title or article.title,
        "seo_description": article.seo_description or article.excerpt,
        "source_ia": article.source_ia,
        "author_id": current_user.get("user_id") or current_user.get("id"),
        "author_name": current_user.get("name", "Admin"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blog_posts.insert_one(article_doc)
    return {"id": article_id, "slug": slug, "message": "Article créé"}


@router.put("/{article_id}", response_model=dict)
async def update_blog_article(article_id: str, article: BlogArticleUpdate, current_user: dict = Depends(get_current_user)):
    """Update a blog article"""
    existing = await db.blog_posts.find_one({"$or": [{"id": article_id}, {"slug": article_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    update_data = {k: v for k, v in article.model_dump().items() if v is not None}
    
    # Convert content if provided
    if "content_markdown" in update_data:
        update_data["content_blocks"] = markdown_to_blocks(update_data.pop("content_markdown"))
    elif "content_html" in update_data:
        update_data["content_blocks"] = html_to_blocks(update_data.pop("content_html"))
    elif "content_blocks" in update_data:
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


# ==================== AUTOMATION API (for n8n/external workflows) ====================

@router.post("/auto-publish", response_model=dict)
async def auto_publish_article(
    article: AutoPublishArticle,
    x_api_key: Optional[str] = Header(None)
):
    """
    🤖 ENDPOINT POUR AUTOMATISATION (n8n, Zapier, Make, etc.)
    
    Crée et publie automatiquement un article de blog.
    Authentification par clé API (header X-API-Key).
    
    Exemple d'appel depuis n8n:
    POST /api/blog/auto-publish
    Headers:
        X-API-Key: votre-cle-api
        Content-Type: application/json
    Body:
    {
        "title": "Mon article généré par IA",
        "excerpt": "Résumé de l'article...",
        "content": "## Introduction\\n\\nContenu en Markdown...",
        "content_format": "markdown",
        "featured_image_url": "https://example.com/image.jpg",
        "tags": ["ia", "automatisation"],
        "category": "Tech",
        "status": "published",
        "seo_title": "Titre SEO optimisé",
        "seo_description": "Description SEO...",
        "source_ia": {
            "model": "claude-sonnet-4.5",
            "prompt": "...",
            "generated_at": "2024-01-01T00:00:00Z"
        }
    }
    """
    # Verify API key
    if x_api_key != BLOG_API_KEY:
        raise HTTPException(status_code=401, detail="Clé API invalide. Utilisez le header X-API-Key.")
    
    # Validate that either content or content_blocks is provided
    if not article.content and not article.content_blocks:
        raise HTTPException(status_code=400, detail="Vous devez fournir soit 'content' soit 'content_blocks'.")
    
    article_id = str(uuid.uuid4())
    slug = article.slug or generate_slug(article.title)
    
    # Make slug unique
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{article_id[:8]}"
    
    # Convert content to blocks - prioritize content_blocks if provided
    content_blocks = []
    if article.content_blocks:
        # Use provided content_blocks directly (supports images inline)
        content_blocks = [block.model_dump() if hasattr(block, 'model_dump') else block for block in article.content_blocks]
    elif article.content:
        if article.content_format == "markdown":
            content_blocks = markdown_to_blocks(article.content)
        elif article.content_format == "html":
            content_blocks = html_to_blocks(article.content)
        else:
            # Plain text
            content_blocks = [{
                "id": str(uuid.uuid4()),
                "type": "text",
                "content": article.content
            }]
    
    # Handle featured image URL (store directly, or could download/upload to Cloudinary)
    featured_image = article.featured_image_url
    
    # Determine publication status and date
    now = datetime.now(timezone.utc)
    status = article.status or "published"
    published_at = None
    
    if status == "published":
        published_at = now.isoformat()
    elif status == "scheduled" and article.publish_at:
        # Will be published later
        published_at = None
    
    article_doc = {
        "id": article_id,
        "slug": slug,
        "title": article.title,
        "excerpt": article.excerpt,
        "featured_image": featured_image,
        "content_blocks": content_blocks,
        "tags": article.tags or [],
        "category": article.category,
        "status": status,
        "published_at": published_at,
        "publish_at": article.publish_at,  # For scheduled publishing
        "seo_title": article.seo_title or article.title,
        "seo_description": article.seo_description or article.excerpt,
        "source_ia": article.source_ia,  # Store AI source for audit
        "author_id": "automation",
        "author_name": article.author_name or "Alpha Agency",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": "api_automation"
    }
    
    await db.blog_posts.insert_one(article_doc)
    
    return {
        "success": True,
        "id": article_id,
        "slug": slug,
        "status": status,
        "published_at": published_at,
        "url": f"/blog/{slug}",
        "message": f"Article '{article.title}' créé avec succès (statut: {status})"
    }


@router.post("/publish-scheduled", response_model=dict)
async def publish_scheduled_articles(x_api_key: Optional[str] = Header(None)):
    """
    ⏰ Publie tous les articles programmés dont la date est passée.
    
    Peut être appelé par un CRON job externe ou n8n.
    """
    if x_api_key != BLOG_API_KEY:
        raise HTTPException(status_code=401, detail="Clé API invalide")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Find scheduled articles ready to publish
    result = await db.blog_posts.update_many(
        {
            "status": "scheduled",
            "publish_at": {"$lte": now}
        },
        {
            "$set": {
                "status": "published",
                "published_at": now,
                "updated_at": now
            }
        }
    )
    
    return {
        "success": True,
        "published_count": result.modified_count,
        "message": f"{result.modified_count} article(s) publié(s)"
    }
