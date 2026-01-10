"""
Documents Management Routes - File manager with folders
Supports all file types: PDF, Word, Excel, Images, ZIP, etc.
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import uuid
import os
import base64
from datetime import datetime, timezone
import logging
import mimetypes
import io

from .database import db, get_current_user

router = APIRouter(prefix="/documents", tags=["Documents"])
logger = logging.getLogger(__name__)

# Storage configuration - using Cloudinary or local storage
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

USE_CLOUDINARY = all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET])

if USE_CLOUDINARY:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET
    )


# ==================== MODELS ====================

class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None  # None = root folder

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[str] = None
    tags: Optional[List[str]] = None


# ==================== HELPER FUNCTIONS ====================

def get_file_type(filename: str, content_type: str) -> str:
    """Determine file type category"""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    
    image_exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp']
    doc_exts = ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt']
    spreadsheet_exts = ['xls', 'xlsx', 'csv', 'ods']
    presentation_exts = ['ppt', 'pptx', 'odp']
    archive_exts = ['zip', 'rar', '7z', 'tar', 'gz']
    video_exts = ['mp4', 'avi', 'mov', 'mkv', 'webm']
    audio_exts = ['mp3', 'wav', 'ogg', 'flac', 'aac']
    
    if ext in image_exts or 'image' in content_type:
        return 'image'
    elif ext in doc_exts or 'pdf' in content_type or 'document' in content_type:
        return 'document'
    elif ext in spreadsheet_exts or 'spreadsheet' in content_type or 'excel' in content_type:
        return 'spreadsheet'
    elif ext in presentation_exts or 'presentation' in content_type:
        return 'presentation'
    elif ext in archive_exts or 'zip' in content_type or 'archive' in content_type:
        return 'archive'
    elif ext in video_exts or 'video' in content_type:
        return 'video'
    elif ext in audio_exts or 'audio' in content_type:
        return 'audio'
    else:
        return 'other'


def format_file_size(size_bytes: int) -> str:
    """Format file size to human readable"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


async def get_folder_path(folder_id: str) -> str:
    """Get full folder path"""
    path_parts = []
    current_id = folder_id
    
    while current_id:
        folder = await db.folders.find_one({"id": current_id})
        if not folder:
            break
        path_parts.insert(0, folder.get("name", ""))
        current_id = folder.get("parent_id")
    
    return "/" + "/".join(path_parts) if path_parts else "/"


# ==================== FOLDER ROUTES ====================

@router.get("/folders")
async def get_folders(
    parent_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all folders, optionally filtered by parent"""
    query = {}
    if parent_id:
        query["parent_id"] = parent_id
    else:
        query["parent_id"] = None  # Root folders only
    
    folders = await db.folders.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    
    # Add item counts
    for folder in folders:
        folder["file_count"] = await db.documents.count_documents({"folder_id": folder["id"]})
        folder["subfolder_count"] = await db.folders.count_documents({"parent_id": folder["id"]})
    
    return folders


@router.get("/folders/tree")
async def get_folder_tree(current_user: dict = Depends(get_current_user)):
    """Get complete folder tree structure"""
    all_folders = await db.folders.find({}, {"_id": 0}).to_list(500)
    
    def build_tree(parent_id=None):
        children = [f for f in all_folders if f.get("parent_id") == parent_id]
        for child in children:
            child["children"] = build_tree(child["id"])
        return children
    
    return build_tree(None)


@router.post("/folders")
async def create_folder(
    folder: FolderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new folder"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Check if parent exists
    if folder.parent_id:
        parent = await db.folders.find_one({"id": folder.parent_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Dossier parent non trouvé")
    
    # Check for duplicate name in same parent
    existing = await db.folders.find_one({
        "name": folder.name,
        "parent_id": folder.parent_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Un dossier avec ce nom existe déjà")
    
    folder_id = str(uuid.uuid4())
    folder_data = {
        "id": folder_id,
        "name": folder.name,
        "parent_id": folder.parent_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
        "color": "#6366f1"  # Default indigo color
    }
    
    await db.folders.insert_one(folder_data)
    
    return {k: v for k, v in folder_data.items() if k != "_id"}


@router.put("/folders/{folder_id}")
async def update_folder(
    folder_id: str,
    folder: FolderUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a folder"""
    existing = await db.folders.find_one({"id": folder_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Dossier non trouvé")
    
    updates = {}
    if folder.name:
        updates["name"] = folder.name
    if folder.parent_id is not None:
        # Prevent moving folder into itself or its children
        if folder.parent_id == folder_id:
            raise HTTPException(status_code=400, detail="Impossible de déplacer un dossier dans lui-même")
        updates["parent_id"] = folder.parent_id if folder.parent_id else None
    
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.folders.update_one({"id": folder_id}, {"$set": updates})
    
    updated = await db.folders.find_one({"id": folder_id}, {"_id": 0})
    return updated


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    force: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Delete a folder (and optionally its contents)"""
    existing = await db.folders.find_one({"id": folder_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Dossier non trouvé")
    
    # Check for contents
    file_count = await db.documents.count_documents({"folder_id": folder_id})
    subfolder_count = await db.folders.count_documents({"parent_id": folder_id})
    
    if (file_count > 0 or subfolder_count > 0) and not force:
        raise HTTPException(
            status_code=400, 
            detail=f"Le dossier contient {file_count} fichier(s) et {subfolder_count} sous-dossier(s). Utilisez force=true pour supprimer."
        )
    
    # Delete contents recursively if force
    if force:
        await delete_folder_contents(folder_id)
    
    await db.folders.delete_one({"id": folder_id})
    
    return {"message": "Dossier supprimé", "id": folder_id}


async def delete_folder_contents(folder_id: str):
    """Recursively delete folder contents"""
    # Delete files in folder
    await db.documents.delete_many({"folder_id": folder_id})
    
    # Delete subfolders recursively
    subfolders = await db.folders.find({"parent_id": folder_id}).to_list(500)
    for subfolder in subfolders:
        await delete_folder_contents(subfolder["id"])
        await db.folders.delete_one({"id": subfolder["id"]})


# ==================== DOCUMENT ROUTES ====================

@router.get("")
async def get_documents(
    folder_id: Optional[str] = None,
    file_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all documents with optional filters"""
    query = {}
    
    if folder_id:
        query["folder_id"] = folder_id
    elif folder_id is None and not search:
        # Only root documents if no folder specified and no search
        query["folder_id"] = None
    
    if file_type:
        query["file_type"] = file_type
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    documents = await db.documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    return documents


@router.get("/stats")
async def get_documents_stats(current_user: dict = Depends(get_current_user)):
    """Get storage statistics"""
    total_docs = await db.documents.count_documents({})
    total_folders = await db.folders.count_documents({})
    
    # Get size by type
    pipeline = [
        {"$group": {
            "_id": "$file_type",
            "count": {"$sum": 1},
            "size": {"$sum": "$size"}
        }}
    ]
    by_type = await db.documents.aggregate(pipeline).to_list(20)
    
    total_size = sum(t.get("size", 0) for t in by_type)
    
    return {
        "total_documents": total_docs,
        "total_folders": total_folders,
        "total_size": total_size,
        "total_size_formatted": format_file_size(total_size),
        "by_type": {t["_id"]: {"count": t["count"], "size": t["size"]} for t in by_type}
    }


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document"""
    user_id = current_user.get("user_id") or current_user.get("id")
    
    # Validate folder exists
    if folder_id:
        folder = await db.folders.find_one({"id": folder_id})
        if not folder:
            raise HTTPException(status_code=404, detail="Dossier non trouvé")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Determine file type
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    file_type = get_file_type(file.filename, content_type)
    
    # Upload to storage
    doc_id = str(uuid.uuid4())
    url = None
    
    if USE_CLOUDINARY:
        try:
            # Use raw resource type for non-images
            resource_type = "image" if file_type == "image" else "raw"
            result = cloudinary.uploader.upload(
                content,
                public_id=f"documents/{doc_id}",
                resource_type=resource_type,
                folder="alpha-agency"
            )
            url = result.get("secure_url")
        except Exception as e:
            logger.error(f"Cloudinary upload error: {str(e)}")
            # Fallback to base64 storage for small files
            if file_size < 5 * 1024 * 1024:  # 5MB limit
                url = f"data:{content_type};base64,{base64.b64encode(content).decode()}"
            else:
                raise HTTPException(status_code=500, detail="Erreur lors de l'upload")
    else:
        # Base64 storage fallback
        if file_size < 10 * 1024 * 1024:  # 10MB limit
            url = f"data:{content_type};base64,{base64.b64encode(content).decode()}"
        else:
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB sans Cloudinary)")
    
    # Parse tags
    tag_list = []
    if tags:
        tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    
    # Save document metadata
    document = {
        "id": doc_id,
        "name": file.filename,
        "url": url,
        "content_type": content_type,
        "file_type": file_type,
        "size": file_size,
        "size_formatted": format_file_size(file_size),
        "folder_id": folder_id,
        "tags": tag_list,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id
    }
    
    await db.documents.insert_one(document)
    
    return {k: v for k, v in document.items() if k != "_id"}


@router.get("/{doc_id}")
async def get_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get document details"""
    document = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Add folder path
    if document.get("folder_id"):
        document["folder_path"] = await get_folder_path(document["folder_id"])
    else:
        document["folder_path"] = "/"
    
    return document


@router.put("/{doc_id}")
async def update_document(
    doc_id: str,
    update: DocumentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update document metadata"""
    existing = await db.documents.find_one({"id": doc_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    updates = {}
    if update.name:
        updates["name"] = update.name
    if update.folder_id is not None:
        if update.folder_id:
            folder = await db.folders.find_one({"id": update.folder_id})
            if not folder:
                raise HTTPException(status_code=404, detail="Dossier non trouvé")
        updates["folder_id"] = update.folder_id if update.folder_id else None
    if update.tags is not None:
        updates["tags"] = update.tags
    
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.documents.update_one({"id": doc_id}, {"$set": updates})
    
    updated = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    return updated


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    existing = await db.documents.find_one({"id": doc_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Delete from Cloudinary if applicable
    if USE_CLOUDINARY and existing.get("url") and "cloudinary" in existing.get("url", ""):
        try:
            public_id = f"alpha-agency/documents/{doc_id}"
            cloudinary.uploader.destroy(public_id)
        except Exception as e:
            logger.error(f"Cloudinary delete error: {str(e)}")
    
    await db.documents.delete_one({"id": doc_id})
    
    return {"message": "Document supprimé", "id": doc_id}


@router.post("/bulk-delete")
async def bulk_delete_documents(
    doc_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Delete multiple documents"""
    deleted = 0
    for doc_id in doc_ids:
        result = await db.documents.delete_one({"id": doc_id})
        deleted += result.deleted_count
    
    return {"message": f"{deleted} document(s) supprimé(s)", "deleted": deleted}


@router.post("/move")
async def move_documents(
    doc_ids: List[str] = Form(...),
    folder_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Move documents to a folder"""
    # Validate folder
    if folder_id:
        folder = await db.folders.find_one({"id": folder_id})
        if not folder:
            raise HTTPException(status_code=404, detail="Dossier non trouvé")
    
    result = await db.documents.update_many(
        {"id": {"$in": doc_ids}},
        {"$set": {
            "folder_id": folder_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"{result.modified_count} document(s) déplacé(s)", "moved": result.modified_count}
