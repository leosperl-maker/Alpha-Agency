"""
News/Actualités Routes - NewsAPI.org Integration (Style Perplexity Discover)
Multi-API Key Support for better coverage
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import httpx
import uuid
import logging
import os
import random

from .database import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Multiple NewsAPI keys for better rate limit distribution
NEWSAPI_KEYS = [
    os.environ.get('NEWSAPI_KEY', ''),
    '667902bcf7be4181a61b2836c3f09685',
    '0f54d162b8ad409caea021a4fe481a81',
    'af790e1e76ff48a3ae24180f77951d4b'
]
# Filter out empty keys
NEWSAPI_KEYS = [k for k in NEWSAPI_KEYS if k]

def get_random_api_key():
    """Get a random API key to distribute load"""
    if not NEWSAPI_KEYS:
        return None
    return random.choice(NEWSAPI_KEYS)

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
    """Refresh news using NewsAPI.org with multiple API keys - LOCAL NEWS FOCUS"""
    if not NEWSAPI_KEYS:
        raise HTTPException(status_code=503, detail="Aucune clé API NewsAPI configurée")
    
    region_code = region if region else "guadeloupe"
    
    articles_created = 0
    errors = []
    keys_exhausted = set()
    
    # LOCAL SEARCH QUERIES - Very specific to each region
    # These queries search for the exact location name to get truly local news
    local_search_queries = {
        "guadeloupe": [
            '"Guadeloupe"',  # Exact match
            '"Pointe-à-Pitre"',
            '"Basse-Terre" Guadeloupe',
            '"Les Abymes"',
            '"Sainte-Anne" Guadeloupe',
            '"France-Antilles" Guadeloupe',
            '"Guadeloupe La 1ère"',
            'cyclone Guadeloupe',
            'préfet Guadeloupe',
            'CHU Guadeloupe',
            '"région Guadeloupe"',
        ],
        "martinique": [
            '"Martinique"',
            '"Fort-de-France"',
            '"Le Lamentin" Martinique',
            '"Sainte-Anne" Martinique',
            '"France-Antilles" Martinique',
            '"Martinique La 1ère"',
            'préfet Martinique',
            'montagne Pelée',
            '"collectivité territoriale" Martinique',
        ],
        "saint-martin": [
            '"Saint-Martin" île',
            '"Marigot" Saint-Martin',
            '"Grand Case"',
            '"Sint Maarten"',
            'préfète Saint-Martin',
            '"collectivité de Saint-Martin"',
        ],
        "saint-barth": [
            '"Saint-Barthélemy"',
            '"Gustavia"',
            '"Saint-Barth"',
            'collectivité Saint-Barthélemy',
        ],
        "guyane": [
            '"Guyane française"',
            '"Cayenne"',
            '"Kourou"',
            '"Saint-Laurent-du-Maroni"',
            'Centre spatial Guyane',
            'Ariane Kourou',
            '"Guyane La 1ère"',
            'préfet Guyane',
            'forêt amazonienne Guyane',
        ],
        "fr": [
            'France actualité',
            'gouvernement français',
            'Assemblée nationale',
            'économie France',
        ],
        "us": [
            'United States news',
            'US economy',
            'Washington DC',
        ],
        "gb": [
            'United Kingdom news',
            'UK economy',
            'London news',
        ],
        "de": [
            'Deutschland Nachrichten',
            'German economy',
            'Berlin news',
        ],
    }
    
    # Get search queries for the selected region
    search_queries = local_search_queries.get(region_code, [f'"{region_code}"'])
    
    # Also add category-specific local searches if a category is selected
    if category and category not in ["general", "all"]:
        category_terms = {
            "business": ["économie", "entreprise", "commerce", "emploi"],
            "technology": ["numérique", "tech", "startup", "innovation"],
            "science": ["science", "recherche", "université"],
            "health": ["santé", "hôpital", "médecin", "CHU"],
            "sports": ["sport", "football", "handball", "athlétisme"],
            "entertainment": ["culture", "musique", "festival", "concert"],
        }
        
        terms = category_terms.get(category, [])
        if terms and region_code in ["guadeloupe", "martinique", "guyane", "saint-martin", "saint-barth"]:
            region_name = region_code.replace("-", " ").title()
            for term in terms[:2]:  # Add 2 category-specific queries
                search_queries.append(f'{term} "{region_name}"')
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for search_query in search_queries:
            # Try with different API keys if one is rate limited
            api_key = None
            for key in NEWSAPI_KEYS:
                if key not in keys_exhausted:
                    api_key = key
                    break
            
            if not api_key:
                errors.append("Toutes les clés API sont épuisées")
                break
            
            try:
                # Use 'everything' endpoint with exact search
                url = "https://newsapi.org/v2/everything"
                params = {
                    "apiKey": api_key,
                    "q": search_query,
                    "language": "fr",
                    "sortBy": "publishedAt",
                    "pageSize": 10  # Smaller batches for more queries
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("status") == "ok":
                        for article in data.get("articles", []):
                            if not article.get("title") or article.get("title") == "[Removed]":
                                continue
                            
                            # FILTER: Only accept articles that mention the region in title or description
                            title = (article.get("title") or "").lower()
                            desc = (article.get("description") or "").lower()
                            content_check = title + " " + desc
                            
                            # Check if article is really about this region
                            region_keywords = {
                                "guadeloupe": ["guadeloupe", "pointe-à-pitre", "basse-terre", "les abymes", "antilles"],
                                "martinique": ["martinique", "fort-de-france", "lamentin", "antilles"],
                                "saint-martin": ["saint-martin", "marigot", "sint maarten"],
                                "saint-barth": ["saint-barth", "gustavia"],
                                "guyane": ["guyane", "cayenne", "kourou", "maroni"],
                                "fr": ["france", "français", "paris", "gouvernement"],
                                "us": ["united states", "us ", "america"],
                                "gb": ["uk ", "britain", "london", "england"],
                                "de": ["germany", "german", "deutschland"],
                            }
                            
                            keywords = region_keywords.get(region_code, [region_code])
                            is_relevant = any(kw in content_check for kw in keywords)
                            
                            if not is_relevant:
                                continue  # Skip non-relevant articles
                            
                            # Check if article already exists (by URL)
                            existing = await db.news_articles.find_one({"source_url": article.get("url")})
                            if existing:
                                continue
                            
                            # Determine category based on content
                            article_category = "general"
                            if category and category != "all":
                                article_category = category
                            else:
                                # Auto-detect category from content
                                if any(w in content_check for w in ["économie", "entreprise", "commerce", "emploi", "business"]):
                                    article_category = "business"
                                elif any(w in content_check for w in ["tech", "numérique", "startup", "digital"]):
                                    article_category = "technology"
                                elif any(w in content_check for w in ["sport", "football", "rugby", "match"]):
                                    article_category = "sports"
                                elif any(w in content_check for w in ["santé", "hôpital", "médecin", "covid"]):
                                    article_category = "health"
                                elif any(w in content_check for w in ["culture", "musique", "festival", "art"]):
                                    article_category = "entertainment"
                            
                            article_doc = {
                                "id": str(uuid.uuid4()),
                                "title": article.get("title", ""),
                                "description": article.get("description", ""),
                                "content": article.get("content", ""),
                                "image_url": article.get("urlToImage"),
                                "source_url": article.get("url", ""),
                                "source_name": article.get("source", {}).get("name", ""),
                                "published_at": article.get("publishedAt", datetime.now(timezone.utc).isoformat()),
                                "category": article_category,
                                "region": region_code,
                                "search_query": search_query,  # Track which query found this
                                "created_at": datetime.now(timezone.utc).isoformat()
                            }
                            
                            await db.news_articles.insert_one(article_doc)
                            articles_created += 1
                    else:
                        error_msg = data.get('message', 'Unknown error')
                        if "too many requests" in error_msg.lower() or "rate" in error_msg.lower():
                            keys_exhausted.add(api_key)
                        else:
                            errors.append(f"NewsAPI error: {error_msg[:50]}")
                elif response.status_code == 429:
                    keys_exhausted.add(api_key)
                else:
                    errors.append(f"HTTP {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Error fetching news for query '{search_query}': {str(e)}")
                continue
    
    all_keys_exhausted = len(keys_exhausted) >= len(NEWSAPI_KEYS)
    
    if all_keys_exhausted and articles_created == 0:
        return {
            "message": f"⚠️ Limite API atteinte. {len(NEWSAPI_KEYS)} clés utilisées.",
            "region": region_code,
            "queries_tried": len(search_queries),
            "errors": errors[:3],
            "rate_limited": True
        }
    
    return {
        "message": f"✅ {articles_created} articles locaux récupérés pour {region_code.replace('-', ' ').title()}",
        "region": region_code,
        "queries_tried": len(search_queries),
        "errors": errors[:3] if errors else None,
        "rate_limited": all_keys_exhausted
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


@router.delete("/clear-region/{region}", response_model=dict)
async def clear_news_region(region: str, current_user: dict = Depends(get_current_user)):
    """Clear all news for a region - useful for refreshing local content"""
    result = await db.news_articles.delete_many({"region": region})
    return {"message": f"{result.deleted_count} articles supprimés pour {region}"}


@router.post("/refresh-local/{region}", response_model=dict)
async def refresh_local_news(region: str, current_user: dict = Depends(get_current_user)):
    """Clear and refresh news for a specific region - gets truly local content"""
    # First clear existing articles for this region
    await db.news_articles.delete_many({"region": region})
    
    # Then fetch fresh local content
    return await refresh_news(category=None, region=region, current_user=current_user)
