"""
Tasks routes - CRUD and statistics (Notion-style)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime, timezone

from .database import db, get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ==================== MODELS ====================

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "todo"  # todo, in_progress, done
    priority: Optional[str] = "medium"  # low, medium, high, urgent
    category: Optional[str] = "general"
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None  # Optional link to a contact

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[str] = None
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None
    completed_at: Optional[str] = None


# ==================== ROUTES ====================

@router.get("", response_model=List[dict])
async def get_tasks(
    status: Optional[str] = None, 
    priority: Optional[str] = None, 
    contact_id: Optional[str] = None, 
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if contact_id:
        query["contact_id"] = contact_id
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tasks


@router.post("", response_model=dict)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        **task.model_dump(),
        "created_by": current_user.get('user_id') or current_user.get('id'),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    await db.tasks.insert_one(task_doc)
    return {"id": task_id, "message": "Tâche créée"}


@router.get("/stats/summary", response_model=dict)
async def get_tasks_stats(current_user: dict = Depends(get_current_user)):
    """Get task statistics"""
    total = await db.tasks.count_documents({})
    todo = await db.tasks.count_documents({"status": "todo"})
    in_progress = await db.tasks.count_documents({"status": "in_progress"})
    done = await db.tasks.count_documents({"status": "done"})
    
    # Overdue tasks
    now = datetime.now(timezone.utc).isoformat()
    overdue = await db.tasks.count_documents({
        "status": {"$ne": "done"},
        "due_date": {"$lt": now, "$nin": [None, ""]}
    })
    
    return {
        "total": total,
        "todo": todo,
        "in_progress": in_progress,
        "done": done,
        "overdue": overdue,
        "completion_rate": round((done / total * 100) if total > 0 else 0, 1)
    }


@router.get("/{task_id}", response_model=dict)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single task"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return task


@router.put("/{task_id}", response_model=dict)
async def update_task(task_id: str, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    existing = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Set completed_at when status changes to done
    if update_data.get("status") == "done" and existing.get("status") != "done":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif update_data.get("status") and update_data.get("status") != "done":
        update_data["completed_at"] = None
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    return {"message": "Tâche mise à jour"}


@router.delete("/{task_id}", response_model=dict)
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return {"message": "Tâche supprimée"}
