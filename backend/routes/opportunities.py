"""
Opportunities (Pipeline) routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone

from .database import db, get_current_user

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


# ==================== MODELS ====================

class OpportunityCreate(BaseModel):
    title: str
    contact_id: Optional[str] = None
    amount: Optional[float] = 0
    stage: Optional[str] = "nouveau"
    probability: Optional[int] = 10
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    assigned_to: Optional[str] = None

class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[str] = None
    amount: Optional[float] = None
    stage: Optional[str] = None
    probability: Optional[int] = None
    expected_close_date: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    assigned_to: Optional[str] = None
    archived: Optional[bool] = None


# ==================== ROUTES ====================

@router.post("", response_model=dict)
async def create_opportunity(opp: OpportunityCreate, current_user: dict = Depends(get_current_user)):
    """Create a new opportunity"""
    opp_id = str(uuid.uuid4())
    opp_doc = {
        "id": opp_id,
        **opp.model_dump(),
        "archived": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.opportunities.insert_one(opp_doc)
    return {"id": opp_id, "message": "Opportunité créée"}


@router.get("", response_model=List[dict])
async def get_opportunities(current_user: dict = Depends(get_current_user), include_archived: bool = False):
    """Get all opportunities"""
    query = {} if include_archived else {"archived": {"$ne": True}}
    opps = await db.opportunities.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return opps


@router.put("/{opp_id}", response_model=dict)
async def update_opportunity(opp_id: str, update: OpportunityUpdate, current_user: dict = Depends(get_current_user)):
    """Update an opportunity"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.opportunities.update_one({"id": opp_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    return {"message": "Opportunité mise à jour"}


@router.delete("/{opp_id}", response_model=dict)
async def delete_opportunity(opp_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an opportunity"""
    result = await db.opportunities.delete_one({"id": opp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    return {"message": "Opportunité supprimée"}


# ==================== PIPELINE CONFIG ====================

@router.get("/pipeline/config", response_model=dict)
async def get_pipeline_config(current_user: dict = Depends(get_current_user)):
    """Get pipeline configuration (stages)"""
    config = await db.settings.find_one({"type": "pipeline_config"}, {"_id": 0})
    if not config:
        # Default config
        config = {
            "type": "pipeline_config",
            "stages": [
                {"id": "nouveau", "label": "Nouveau", "color": "#3B82F6", "probability": 10},
                {"id": "qualification", "label": "Qualification", "color": "#8B5CF6", "probability": 20},
                {"id": "proposition", "label": "Proposition envoyée", "color": "#F59E0B", "probability": 40},
                {"id": "negociation", "label": "Négociation", "color": "#EC4899", "probability": 60},
                {"id": "closing", "label": "Closing", "color": "#10B981", "probability": 80},
                {"id": "gagne", "label": "Gagné", "color": "#22C55E", "probability": 100},
                {"id": "perdu", "label": "Perdu", "color": "#EF4444", "probability": 0}
            ]
        }
        await db.settings.insert_one(config)
    return config


@router.put("/pipeline/config", response_model=dict)
async def update_pipeline_config(stages: List[dict], current_user: dict = Depends(get_current_user)):
    """Update pipeline configuration"""
    await db.settings.update_one(
        {"type": "pipeline_config"},
        {"$set": {"stages": stages}},
        upsert=True
    )
    return {"message": "Configuration du pipeline mise à jour"}
