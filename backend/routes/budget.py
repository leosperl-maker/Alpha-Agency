"""
Budget routes - Budget entries and statistics
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone

from .database import db, get_current_user

router = APIRouter(prefix="/budget", tags=["Budget"])


# ==================== MODELS ====================

class BudgetEntryCreate(BaseModel):
    type: str  # "revenue" or "expense"
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    recurring: Optional[bool] = False
    recurring_frequency: Optional[str] = None  # monthly, quarterly, yearly

class BudgetEntryUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    recurring: Optional[bool] = None
    recurring_frequency: Optional[str] = None


# ==================== ROUTES ====================

@router.get("", response_model=List[dict])
async def get_budget_entries(
    current_user: dict = Depends(get_current_user),
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get all budget entries with optional filters"""
    query = {}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    entries = await db.budget.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return entries


@router.post("", response_model=dict)
async def create_budget_entry(entry: BudgetEntryCreate, current_user: dict = Depends(get_current_user)):
    """Create a new budget entry"""
    entry_id = str(uuid.uuid4())
    entry_doc = {
        "id": entry_id,
        **entry.model_dump(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.budget.insert_one(entry_doc)
    return {"id": entry_id, "message": "Entrée budgétaire créée"}


@router.get("/{entry_id}", response_model=dict)
async def get_budget_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single budget entry"""
    entry = await db.budget.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entrée budgétaire non trouvée")
    return entry


@router.put("/{entry_id}", response_model=dict)
async def update_budget_entry(entry_id: str, update: BudgetEntryUpdate, current_user: dict = Depends(get_current_user)):
    """Update a budget entry"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.budget.update_one({"id": entry_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entrée budgétaire non trouvée")
    return {"message": "Entrée budgétaire mise à jour"}


@router.delete("/{entry_id}", response_model=dict)
async def delete_budget_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a budget entry"""
    result = await db.budget.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrée budgétaire non trouvée")
    return {"message": "Entrée budgétaire supprimée"}


@router.get("/stats/summary", response_model=dict)
async def get_budget_summary(
    current_user: dict = Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get budget summary statistics"""
    query = {}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    # Get total revenues
    revenue_pipeline = [
        {"$match": {**query, "type": "revenue"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.budget.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Get total expenses
    expense_pipeline = [
        {"$match": {**query, "type": "expense"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    expense_result = await db.budget.aggregate(expense_pipeline).to_list(1)
    total_expense = expense_result[0]["total"] if expense_result else 0
    
    # Get revenue by category
    revenue_by_category = await db.budget.aggregate([
        {"$match": {**query, "type": "revenue"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}}
    ]).to_list(100)
    
    # Get expenses by category
    expense_by_category = await db.budget.aggregate([
        {"$match": {**query, "type": "expense"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}}
    ]).to_list(100)
    
    return {
        "total_revenue": total_revenue,
        "total_expense": total_expense,
        "net_balance": total_revenue - total_expense,
        "revenue_by_category": [{"category": r["_id"], "amount": r["total"]} for r in revenue_by_category],
        "expense_by_category": [{"category": e["_id"], "amount": e["total"]} for e in expense_by_category]
    }


@router.get("/categories/list", response_model=dict)
async def get_budget_categories(current_user: dict = Depends(get_current_user)):
    """Get all unique budget categories"""
    revenue_categories = await db.budget.distinct("category", {"type": "revenue"})
    expense_categories = await db.budget.distinct("category", {"type": "expense"})
    
    return {
        "revenue_categories": revenue_categories,
        "expense_categories": expense_categories
    }
