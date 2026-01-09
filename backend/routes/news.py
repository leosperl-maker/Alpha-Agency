"""
News/Actualités Routes - NewsAPI.org Integration (Style Perplexity Discover)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import httpx
import uuid
import logging
import os

from .database import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

NEWSAPI_KEY = os.environ.get('NEWSAPI_KEY', '')

# Categories available - News + Marketing categories
NEWS_CATEGORIES = [
    # General news categories
    {"id": "general", "label": "Général", "icon": "Newspaper", "color": "#6B7280"},
    {"id": "business", "label": "Business", "icon": "Briefcase", "color": "#3B82F6"},
    {"id": "technology", "label": "Tech", "icon": "Cpu", "color": "#8B5CF6"},
    {"id": "science", "label": "Science", "icon": "FlaskConical", "color": "#10B981"},
    {"id": "health", "label": "Santé", "icon": "Heart", "color": "#EF4444"},
    {"id": "sports", "label": "Sports", "icon": "Trophy", "color": "#F59E0B"},
    {"id": "entertainment", "label": "Divertissement", "icon": "Film", "color": "#EC4899"},
    # Marketing categories
    {"id": "ads", "label": "Publicité en ligne", "icon": "Megaphone", "color": "#F97316"},
    {"id": "social", "label": "Réseaux sociaux", "icon": "Share2", "color": "#06B6D4"},
    {"id": "growth", "label": "Growth & Funnels", "icon": "TrendingUp", "color": "#84CC16"},
    {"id": "crm", "label": "CRM & Vente", "icon": "Users", "color": "#A855F7"},
    {"id": "local", "label": "Business Local", "icon": "Store", "color": "#22C55E"},
    {"id": "design", "label": "Design & Branding", "icon": "Palette", "color": "#E11D48"},
]

# Regional filters - DOM-TOM prioritized + France + International
NEWS_REGIONS = [
    # DOM-TOM (prioritized)
    {"id": "guadeloupe", "label": "Guadeloupe", "icon": "MapPin", "priority": 1},
    {"id": "martinique", "label": "Martinique", "icon": "MapPin", "priority": 2},
    {"id": "saint-martin", "label": "Saint-Martin", "icon": "MapPin", "priority": 3},
    {"id": "saint-barth", "label": "Saint-Barthélemy", "icon": "MapPin", "priority": 4},
    {"id": "guyane", "label": "Guyane", "icon": "MapPin", "priority": 5},
    # France + International
    {"id": "fr", "label": "France", "icon": "Flag", "priority": 6},
    {"id": "us", "label": "États-Unis", "icon": "Globe", "priority": 7},
    {"id": "gb", "label": "Royaume-Uni", "icon": "Globe", "priority": 8},
    {"id": "de", "label": "Allemagne", "icon": "Globe", "priority": 9},
]

class NewsArticleModel(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    source_url: str
    source_name: str
    published_at: str
    category: str
    region: str
    created_at: str


@router.get("/categories", response_model=List[dict])
async def get_news_categories(current_user: dict = Depends(get_current_user)):
    """Get available news categories"""
    return NEWS_CATEGORIES


@router.get("/regions", response_model=List[dict])
async def get_news_regions(current_user: dict = Depends(get_current_user)):
    """Get available news regions"""
    return NEWS_REGIONS


@router.get("/topics", response_model=List[dict])
async def get_news_topics(current_user: dict = Depends(get_current_user)):
    """Get available news categories (legacy endpoint)"""
    return NEWS_CATEGORIES


@router.get("", response_model=List[dict])
async def get_news(
    category: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get news articles from database with filtering"""
    query = {}
    if category and category != "all":
        query["category"] = category
    if region and region != "all":
        query["region"] = region
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    articles = await db.news_articles.find(query, {"_id": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    return articles


@router.get("/{article_id}", response_model=dict)
async def get_news_article(article_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single news article by ID"""
    article = await db.news_articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return article


@router.post("/refresh", response_model=dict)
async def refresh_news(
    category: Optional[str] = None,
    region: Optional[str] = "guadeloupe",
    current_user: dict = Depends(get_current_user)
):
    """Refresh news using NewsAPI.org"""
    if not NEWSAPI_KEY:
        raise HTTPException(status_code=503, detail="Clé API NewsAPI non configurée")
    
    # Only fetch standard NewsAPI categories, marketing categories use custom queries
    standard_categories = ["general", "business", "technology", "science", "health", "sports", "entertainment"]
    marketing_categories = ["ads", "social", "growth", "crm", "local", "design"]
    
    if category:
        categories_to_fetch = [category]
    else:
        categories_to_fetch = standard_categories + marketing_categories
    
    region_code = region if region else "guadeloupe"
    
    articles_created = 0
    errors = []
    
    # Category to search query mapping
    category_queries = {
        "general": "actualités",
        "business": "économie entreprise business",
        "technology": "technologie numérique innovation tech",
        "science": "science recherche découverte",
        "health": "santé médecine",
        "sports": "sport football rugby",
        "entertainment": "cinéma musique culture",
        "ads": "Meta Ads Google Ads TikTok Ads publicité en ligne",
        "social": "réseaux sociaux community management Instagram Facebook",
        "growth": "growth hacking acquisition funnels marketing",
        "crm": "CRM vente prospection commercial",
        "local": "TPE PME business local commerce",
        "design": "design branding identité visuelle logo"
    }
    
    # Region to search query suffix mapping
    region_queries = {
        "guadeloupe": "(Guadeloupe OR Antilles OR Caraïbes OR Outre-mer)",
        "martinique": "(Martinique OR Antilles OR Caraïbes OR Outre-mer)",
        "saint-martin": "(Saint-Martin OR Antilles OR Caraïbes OR Outre-mer)",
        "saint-barth": "(Saint-Barthélemy OR Antilles OR Caraïbes OR Outre-mer)",
        "guyane": "(Guyane OR Amazonie OR Outre-mer OR Cayenne)",
        "fr": "France",
        "us": "",
        "gb": "",
        "de": ""
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for cat in categories_to_fetch:
            try:
                if region_code in ["guadeloupe", "martinique", "saint-martin", "saint-barth", "guyane", "fr"]:
                    url = "https://newsapi.org/v2/everything"
                    base_query = category_queries.get(cat, "actualités")
                    region_suffix = region_queries.get(region_code, "")
                    search_query = f"{base_query} {region_suffix}".strip()
                    
                    params = {
                        "apiKey": NEWSAPI_KEY,
                        "q": search_query,
                        "language": "fr",
                        "sortBy": "publishedAt",
                        "pageSize": 15
                    }
                else:
                    if cat in marketing_categories:
                        url = "https://newsapi.org/v2/everything"
                        params = {
                            "apiKey": NEWSAPI_KEY,
                            "q": category_queries.get(cat, "marketing"),
                            "language": "en" if region_code in ["us", "gb"] else "de",
                            "sortBy": "publishedAt",
                            "pageSize": 8
                        }
                    else:
                        url = "https://newsapi.org/v2/top-headlines"
                        params = {
                            "apiKey": NEWSAPI_KEY,
                            "category": cat,
                            "country": region_code,
                            "pageSize": 8
                        }
                
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("status") == "ok":
                        for article in data.get("articles", []):
                            if not article.get("title") or article.get("title") == "[Removed]":
                                continue
                            
                            existing = await db.news_articles.find_one({"source_url": article.get("url")})
                            if existing:
                                continue
                            
                            article_doc = {
                                "id": str(uuid.uuid4()),
                                "title": article.get("title", ""),
                                "description": article.get("description", ""),
                                "content": article.get("content", ""),
                                "image_url": article.get("urlToImage"),
                                "source_url": article.get("url", ""),
                                "source_name": article.get("source", {}).get("name", ""),
                                "published_at": article.get("publishedAt", datetime.now(timezone.utc).isoformat()),
                                "category": cat,
                                "region": region_code,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }
                            
                            await db.news_articles.insert_one(article_doc)
                            articles_created += 1
                    else:
                        error_msg = data.get('message', 'Unknown error')
                        if "too many requests" in error_msg.lower() or "rate" in error_msg.lower():
                            errors.append(f"RATE_LIMIT: {error_msg}")
                        else:
                            errors.append(f"NewsAPI error for {cat}: {error_msg}")
                elif response.status_code == 429:
                    errors.append("RATE_LIMIT: Trop de requêtes, veuillez réessayer plus tard")
                else:
                    errors.append(f"HTTP {response.status_code} for {cat}")
                    
            except Exception as e:
                logger.error(f"Error fetching news for category {cat}: {str(e)}")
                errors.append(f"Exception for {cat}: {str(e)}")
                continue
    
    rate_limit_hit = any("RATE_LIMIT" in err for err in errors) if errors else False
    
    if rate_limit_hit and articles_created == 0:
        return {
            "message": "⚠️ Limite NewsAPI atteinte (100 requêtes/24h). Réessayez dans quelques heures.",
            "categories_processed": len(categories_to_fetch),
            "region": region_code,
            "errors": errors,
            "rate_limited": True
        }
    
    return {
        "message": f"{articles_created} nouveaux articles récupérés",
        "categories_processed": len(categories_to_fetch),
        "region": region_code,
        "errors": errors if errors else None,
        "rate_limited": rate_limit_hit
    }


@router.get("/related/{article_id}", response_model=List[dict])
async def get_related_news(article_id: str, limit: int = 4, current_user: dict = Depends(get_current_user)):
    """Get related articles based on category"""
    article = await db.news_articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    related = await db.news_articles.find(
        {"category": article.get("category"), "id": {"$ne": article_id}},
        {"_id": 0}
    ).sort("published_at", -1).limit(limit).to_list(limit)
    
    return related


@router.delete("/{article_id}", response_model=dict)
async def delete_news_article(article_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a news article"""
    result = await db.news_articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return {"message": "Article supprimé"}


@router.delete("/clear/{category}", response_model=dict)
async def clear_news_category(category: str, current_user: dict = Depends(get_current_user)):
    """Clear all news for a category"""
    result = await db.news_articles.delete_many({"category": category})
    return {"message": f"{result.deleted_count} articles supprimés"}
