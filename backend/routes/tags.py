"""
Tags routes - CRUD and AI suggestions for portfolio/blog tags
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone
import requests
import json
import re
import logging

from .database import db, get_current_user, PERPLEXITY_API_KEY

router = APIRouter(prefix="/tags", tags=["Tags"])
logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class TagCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    type: str = "portfolio"  # portfolio, blog
    color: Optional[str] = "#CE0202"

class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class TagSuggestionRequest(BaseModel):
    content: str
    title: Optional[str] = None
    type: str = "portfolio"


# ==================== ROUTES ====================

@router.get("", response_model=List[dict])
async def get_tags(type: Optional[str] = None):
    """Get all tags, optionally filtered by type (portfolio, blog)"""
    query = {}
    if type:
        query["type"] = type
    tags = await db.tags.find(query, {"_id": 0}).sort("name", 1).to_list(200)
    return tags


@router.post("", response_model=dict)
async def create_tag(tag: TagCreate, current_user: dict = Depends(get_current_user)):
    """Create a new tag"""
    tag_id = str(uuid.uuid4())
    slug = tag.slug or tag.name.lower().replace(" ", "-")
    
    # Check if tag already exists
    existing = await db.tags.find_one({"slug": slug, "type": tag.type})
    if existing:
        raise HTTPException(status_code=400, detail="Ce tag existe déjà")
    
    tag_doc = {
        "id": tag_id,
        "name": tag.name,
        "slug": slug,
        "type": tag.type,
        "color": tag.color,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tags.insert_one(tag_doc)
    return {"id": tag_id, "message": "Tag créé"}


@router.put("/{tag_id}", response_model=dict)
async def update_tag(tag_id: str, update: TagUpdate, current_user: dict = Depends(get_current_user)):
    """Update a tag"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.name:
        update_data["name"] = update.name
        update_data["slug"] = update.name.lower().replace(" ", "-")
    if update.color:
        update_data["color"] = update.color
    
    result = await db.tags.update_one({"id": tag_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tag non trouvé")
    return {"message": "Tag mis à jour"}


@router.delete("/{tag_id}", response_model=dict)
async def delete_tag(tag_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a tag"""
    result = await db.tags.delete_one({"id": tag_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tag non trouvé")
    return {"message": "Tag supprimé"}


@router.post("/suggest", response_model=dict)
async def suggest_tags(request: TagSuggestionRequest, current_user: dict = Depends(get_current_user)):
    """Suggest tags for content using AI (Perplexity)"""
    if not PERPLEXITY_API_KEY:
        raise HTTPException(status_code=503, detail="Service IA non disponible")
    
    # Get existing tags for the type
    existing_tags = await db.tags.find({"type": request.type}, {"_id": 0, "name": 1}).to_list(100)
    existing_tag_names = [t["name"] for t in existing_tags]
    
    # Build prompt
    content_preview = request.content[:1000] if request.content else ""
    title = request.title or ""
    
    system_prompt = f"""Tu es un assistant expert en classification de contenu. 
Tu dois suggérer des tags pertinents pour du contenu {'de portfolio/réalisations' if request.type == 'portfolio' else 'de blog/articles'}.

Tags existants dans le système: {', '.join(existing_tag_names) if existing_tag_names else 'Aucun tag existant'}

Règles:
1. Suggère entre 2 et 5 tags maximum
2. Privilégie les tags existants s'ils sont pertinents
3. Tu peux suggérer de nouveaux tags si nécessaire
4. Les tags doivent être courts (1-2 mots) et en français
5. Réponds UNIQUEMENT avec un JSON: {{"suggested_tags": ["tag1", "tag2", ...], "new_tags": ["nouveaux tags suggérés"]}}"""

    user_prompt = f"""Analyse ce contenu et suggère des tags pertinents:

Titre: {title}

Contenu:
{content_preview}"""

    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "sonar",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 500
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"]
            
            # Parse JSON from response
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                try:
                    suggestions = json.loads(json_match.group())
                    suggested_tags = suggestions.get("suggested_tags", [])
                    new_tags = suggestions.get("new_tags", [])
                    
                    # Separate existing and new tags
                    existing_suggested = [t for t in suggested_tags if t in existing_tag_names]
                    truly_new = [t for t in suggested_tags if t not in existing_tag_names] + new_tags
                    
                    return {
                        "suggested_tags": existing_suggested,
                        "new_tags": list(set(truly_new))[:3],
                        "all_suggestions": suggested_tags
                    }
                except json.JSONDecodeError:
                    pass
            
            return {
                "suggested_tags": [],
                "new_tags": [],
                "raw_response": ai_response
            }
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la suggestion de tags")
            
    except requests.RequestException as e:
        logger.error(f"Error suggesting tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur de communication avec l'IA")
