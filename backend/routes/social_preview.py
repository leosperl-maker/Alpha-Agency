"""
Multi-Platform Post Preview
Preview how a post will look on different social platforms

Features:
- Generate mockup previews for Facebook, Instagram, LinkedIn, Twitter
- Validate content length and media requirements
- AI-powered hashtag and content suggestions
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
import os
import re

from .database import db, get_current_user

router = APIRouter(prefix="/social", tags=["Social Media"])
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# ===========================================
# PLATFORM CONFIGS
# ===========================================

PLATFORM_LIMITS = {
    "twitter": {
        "name": "Twitter/X",
        "char_limit": 280,
        "image_formats": ["jpg", "jpeg", "png", "gif", "webp"],
        "video_max_duration": 140,  # seconds
        "hashtag_limit": 5,
        "best_times": ["9:00", "12:00", "15:00", "18:00"],
        "icon": "🐦"
    },
    "facebook": {
        "name": "Facebook",
        "char_limit": 63206,
        "optimal_length": 80,  # for engagement
        "image_formats": ["jpg", "jpeg", "png", "gif", "bmp"],
        "video_max_duration": 240 * 60,  # 4 hours in seconds
        "hashtag_limit": 3,
        "best_times": ["13:00", "16:00", "20:00"],
        "icon": "📘"
    },
    "instagram": {
        "name": "Instagram",
        "char_limit": 2200,
        "image_formats": ["jpg", "jpeg", "png"],
        "video_max_duration": 60,  # Feed videos
        "reel_max_duration": 90,
        "story_duration": 15,
        "hashtag_limit": 30,
        "optimal_hashtags": 11,
        "best_times": ["11:00", "13:00", "19:00"],
        "icon": "📸"
    },
    "linkedin": {
        "name": "LinkedIn",
        "char_limit": 3000,
        "optimal_length": 150,
        "image_formats": ["jpg", "jpeg", "png", "gif"],
        "video_max_duration": 10 * 60,  # 10 minutes
        "hashtag_limit": 5,
        "best_times": ["8:00", "12:00", "17:00"],
        "icon": "💼"
    },
    "tiktok": {
        "name": "TikTok",
        "char_limit": 2200,
        "video_only": True,
        "video_max_duration": 180,  # 3 minutes
        "hashtag_limit": 5,
        "best_times": ["12:00", "15:00", "19:00", "21:00"],
        "icon": "🎵"
    }
}

# ===========================================
# MODELS
# ===========================================

class PostContent(BaseModel):
    text: str
    media_url: Optional[str] = None
    media_type: Optional[str] = "image"  # image, video
    link: Optional[str] = None
    hashtags: Optional[List[str]] = []

class PreviewRequest(BaseModel):
    content: PostContent
    platforms: List[str] = ["facebook", "instagram", "linkedin", "twitter"]

class PlatformPreview(BaseModel):
    platform: str
    name: str
    icon: str
    preview_text: str
    char_count: int
    char_limit: int
    is_valid: bool
    warnings: List[str]
    recommendations: List[str]
    optimal_posting_times: List[str]
    hashtag_count: int
    hashtag_limit: int

# ===========================================
# HELPER FUNCTIONS
# ===========================================

def get_user_id(user: dict) -> str:
    return user.get("user_id") or user.get("id") or str(user.get("_id", ""))

def count_hashtags(text: str) -> int:
    """Count hashtags in text"""
    return len(re.findall(r'#\w+', text))

def validate_for_platform(content: PostContent, platform: str) -> Dict[str, Any]:
    """Validate content for a specific platform"""
    config = PLATFORM_LIMITS.get(platform, {})
    warnings = []
    recommendations = []
    
    # Full text with hashtags
    full_text = content.text
    if content.hashtags:
        full_text += " " + " ".join([f"#{h}" if not h.startswith('#') else h for h in content.hashtags])
    
    char_count = len(full_text)
    char_limit = config.get("char_limit", 2000)
    
    # Check character limit
    is_valid = char_count <= char_limit
    
    if char_count > char_limit:
        warnings.append(f"⚠️ Texte trop long ({char_count}/{char_limit} caractères)")
    
    # Check optimal length
    optimal = config.get("optimal_length")
    if optimal and char_count > optimal:
        recommendations.append(f"💡 Pour un meilleur engagement, limitez à {optimal} caractères")
    
    # Check hashtags
    hashtag_count = count_hashtags(full_text)
    hashtag_limit = config.get("hashtag_limit", 10)
    
    if hashtag_count > hashtag_limit:
        warnings.append(f"⚠️ Trop de hashtags ({hashtag_count}/{hashtag_limit})")
    
    optimal_hashtags = config.get("optimal_hashtags")
    if optimal_hashtags and hashtag_count < optimal_hashtags and platform == "instagram":
        recommendations.append(f"💡 Instagram fonctionne mieux avec ~{optimal_hashtags} hashtags")
    
    # Platform-specific checks
    if platform == "tiktok":
        if content.media_type != "video":
            warnings.append("⚠️ TikTok ne supporte que les vidéos")
            is_valid = False
    
    if platform == "linkedin":
        # Professional tone check
        casual_words = ["lol", "mdr", "haha", "🤣", "😂"]
        if any(word in content.text.lower() for word in casual_words):
            recommendations.append("💡 Adoptez un ton plus professionnel pour LinkedIn")
    
    if platform == "twitter":
        if char_count > 250:
            recommendations.append("💡 Les tweets courts (< 100 car.) performent mieux")
    
    # Media checks
    if content.media_url:
        if content.media_type == "video":
            max_duration = config.get("video_max_duration", 60)
            recommendations.append(f"📹 Durée max vidéo: {max_duration // 60}min {max_duration % 60}s")
    else:
        if platform == "instagram":
            recommendations.append("📸 Ajoutez une image/vidéo pour Instagram")
    
    # Truncate preview text if needed
    preview_text = full_text
    if char_count > char_limit:
        preview_text = full_text[:char_limit-3] + "..."
    
    return {
        "preview_text": preview_text,
        "char_count": char_count,
        "char_limit": char_limit,
        "is_valid": is_valid,
        "warnings": warnings,
        "recommendations": recommendations,
        "hashtag_count": hashtag_count,
        "hashtag_limit": hashtag_limit,
        "optimal_posting_times": config.get("best_times", [])
    }

async def generate_hashtag_suggestions(text: str, platform: str) -> List[str]:
    """Use AI to suggest relevant hashtags"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        config = PLATFORM_LIMITS.get(platform, {})
        optimal = config.get("optimal_hashtags", 5)
        
        prompt = f"""Génère {optimal} hashtags pertinents pour ce post {platform}:

"{text}"

Règles:
- Hashtags en français et anglais mélangés
- Inclure 2-3 hashtags populaires et 2-3 hashtags de niche
- Format: retourne UNIQUEMENT les hashtags séparés par des espaces, sans #
- Exemple: marketing digital entreprise business socialmedia

Hashtags:"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"hashtag-{platform}",
            system_message="Tu es un expert en marketing digital et réseaux sociaux."
        )
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse response
        hashtags = re.findall(r'\w+', response.strip())
        return hashtags[:optimal]
    
    except Exception as e:
        logger.error(f"Hashtag generation error: {e}")
        return []

# ===========================================
# API ENDPOINTS
# ===========================================

@router.post("/preview")
async def generate_previews(
    request: PreviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate previews for multiple platforms"""
    previews = []
    
    for platform in request.platforms:
        if platform not in PLATFORM_LIMITS:
            continue
        
        config = PLATFORM_LIMITS[platform]
        validation = validate_for_platform(request.content, platform)
        
        previews.append({
            "platform": platform,
            "name": config["name"],
            "icon": config["icon"],
            **validation
        })
    
    # Log preview generation
    await db.post_previews.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": get_user_id(current_user),
        "platforms": request.platforms,
        "text_length": len(request.content.text),
        "has_media": bool(request.content.media_url),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "previews": previews,
        "original_content": {
            "text": request.content.text,
            "hashtags": request.content.hashtags,
            "media_type": request.content.media_type
        }
    }

@router.post("/suggest-hashtags")
async def suggest_hashtags(
    text: str,
    platform: str = "instagram",
    current_user: dict = Depends(get_current_user)
):
    """Get AI-suggested hashtags for content"""
    hashtags = await generate_hashtag_suggestions(text, platform)
    
    config = PLATFORM_LIMITS.get(platform, {})
    
    return {
        "hashtags": hashtags,
        "platform": platform,
        "optimal_count": config.get("optimal_hashtags", 5),
        "limit": config.get("hashtag_limit", 30)
    }

@router.get("/platform-info")
async def get_platform_info(
    platform: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get platform requirements and best practices"""
    if platform:
        if platform not in PLATFORM_LIMITS:
            raise HTTPException(status_code=404, detail="Plateforme non supportée")
        return {platform: PLATFORM_LIMITS[platform]}
    
    return {"platforms": PLATFORM_LIMITS}

@router.post("/optimize-content")
async def optimize_content(
    content: PostContent,
    target_platform: str = "instagram",
    current_user: dict = Depends(get_current_user)
):
    """AI-powered content optimization for a platform"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    config = PLATFORM_LIMITS.get(target_platform, {})
    
    try:
        prompt = f"""Optimise ce contenu pour {config.get('name', target_platform)}:

Texte original: "{content.text}"

Contraintes {target_platform}:
- Limite: {config.get('char_limit', 2000)} caractères
- Longueur optimale: {config.get('optimal_length', 100)} caractères
- Hashtags recommandés: {config.get('optimal_hashtags', 5)}

Réponds en JSON:
{{
    "optimized_text": "texte optimisé",
    "suggested_hashtags": ["hashtag1", "hashtag2"],
    "improvements": ["amélioration 1", "amélioration 2"],
    "engagement_tips": ["conseil 1"]
}}"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"optimize-{target_platform}",
            system_message="Tu es un expert en marketing digital et optimisation de contenu pour les réseaux sociaux."
        )
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON
        import json
        result = response.strip()
        if result.startswith("```"):
            result = re.sub(r'^```json?\s*', '', result)
            result = re.sub(r'\s*```$', '', result)
        
        optimized = json.loads(result)
        
        return {
            "platform": target_platform,
            "original": content.text,
            "optimized": optimized.get("optimized_text", content.text),
            "suggested_hashtags": optimized.get("suggested_hashtags", []),
            "improvements": optimized.get("improvements", []),
            "engagement_tips": optimized.get("engagement_tips", [])
        }
    
    except Exception as e:
        logger.error(f"Content optimization error: {e}")
        return {
            "platform": target_platform,
            "original": content.text,
            "error": str(e),
            "suggestions": [
                f"Limitez à {config.get('optimal_length', 100)} caractères",
                f"Ajoutez {config.get('optimal_hashtags', 5)} hashtags"
            ]
        }
