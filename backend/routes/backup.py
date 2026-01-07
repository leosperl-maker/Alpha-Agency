"""
Backup API Routes for Alpha Agency
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backup", tags=["Backup"])

# These will be set from server.py
backup_manager = None
backup_scheduler = None
get_current_user = None

def setup_backup_routes(manager, scheduler, auth_dependency):
    """Initialize backup routes with dependencies"""
    global backup_manager, backup_scheduler, get_current_user
    backup_manager = manager
    backup_scheduler = scheduler
    get_current_user = auth_dependency


@router.post("/manual", response_model=Dict[str, Any])
async def trigger_manual_backup(background_tasks: BackgroundTasks, current_user: dict = Depends(lambda: get_current_user)):
    """Trigger a manual backup"""
    if not backup_manager:
        raise HTTPException(status_code=500, detail="Backup system not initialized")
    
    try:
        result = await backup_manager.create_backup(manual=True)
        return {
            "message": "Backup completed",
            "backup": result
        }
    except Exception as e:
        logger.error(f"Manual backup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=Dict[str, Any])
async def get_backup_status(current_user: dict = Depends(lambda: get_current_user)):
    """Get backup system status"""
    if not backup_manager or not backup_scheduler:
        raise HTTPException(status_code=500, detail="Backup system not initialized")
    
    try:
        status = await backup_manager.get_backup_status()
        status["scheduler"] = backup_scheduler.get_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get backup status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=list)
async def get_backup_history(limit: int = 20, current_user: dict = Depends(lambda: get_current_user)):
    """Get backup history"""
    if not backup_manager:
        raise HTTPException(status_code=500, detail="Backup system not initialized")
    
    try:
        return await backup_manager.get_backup_history(limit)
    except Exception as e:
        logger.error(f"Failed to get backup history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
