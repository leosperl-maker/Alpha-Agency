"""
Google Drive Integration for MoltBot CRM
- Connect Google Drive via OAuth
- List files from Drive
- Import files to CRM with auto-classification
- WhatsApp integration for importing documents
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import logging
import uuid
import base64
import httpx

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest

from .database import db
from .auth import get_current_user

router = APIRouter(prefix="/drive", tags=["Google Drive"])
logger = logging.getLogger(__name__)

# Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_DRIVE_REDIRECT_URI = os.environ.get('GOOGLE_DRIVE_REDIRECT_URI', 
    os.environ.get('FRONTEND_URL', 'https://alphagency.fr') + '/api/drive/callback')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://alphagency.fr')

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# ==================== MODELS ====================

class DriveFile(BaseModel):
    id: str
    name: str
    mimeType: str
    size: Optional[int] = None
    modifiedTime: Optional[str] = None
    webViewLink: Optional[str] = None

class ImportRequest(BaseModel):
    file_ids: List[str]
    folder_id: Optional[str] = None
    auto_classify: bool = True

class ImportResult(BaseModel):
    success: bool
    imported_count: int
    files: List[dict]
    errors: List[str] = []

# ==================== HELPER FUNCTIONS ====================

def get_flow():
    """Create OAuth flow for Google Drive"""
    return Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [GOOGLE_DRIVE_REDIRECT_URI]
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_DRIVE_REDIRECT_URI
    )

async def get_drive_credentials(user_id: str) -> Optional[Credentials]:
    """Get stored Drive credentials for a user"""
    creds_doc = await db.drive_credentials.find_one({"user_id": user_id})
    if not creds_doc:
        return None
    
    creds = Credentials(
        token=creds_doc["access_token"],
        refresh_token=creds_doc.get("refresh_token"),
        token_uri=creds_doc.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=creds_doc.get("client_id", GOOGLE_CLIENT_ID),
        client_secret=creds_doc.get("client_secret", GOOGLE_CLIENT_SECRET),
        scopes=creds_doc.get("scopes", SCOPES)
    )
    
    # Auto-refresh if expired
    if creds.expired and creds.refresh_token:
        try:
            logger.info(f"Refreshing expired Drive token for user {user_id}")
            creds.refresh(GoogleRequest())
            
            # Update in database
            await db.drive_credentials.update_one(
                {"user_id": user_id},
                {"$set": {
                    "access_token": creds.token,
                    "expiry": creds.expiry.isoformat() if creds.expiry else None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        except Exception as e:
            logger.error(f"Failed to refresh Drive token: {e}")
            return None
    
    return creds

async def get_drive_service(user_id: str):
    """Get Google Drive API service for a user"""
    creds = await get_drive_credentials(user_id)
    if not creds:
        raise HTTPException(
            status_code=400,
            detail="Google Drive non connecté. Connectez d'abord votre Drive."
        )
    
    return build('drive', 'v3', credentials=creds)

async def analyze_and_classify_file(file_bytes: bytes, filename: str, mime_type: str) -> dict:
    """
    Use AI to analyze file content and suggest classification.
    Returns: {title, category, client_name, description}
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    import fitz  # PyMuPDF for PDF
    
    EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
    
    extracted_text = ""
    image_base64 = None
    
    try:
        # Extract content based on file type
        if 'pdf' in mime_type.lower():
            try:
                pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                for page_num in range(min(pdf_doc.page_count, 3)):
                    page = pdf_doc[page_num]
                    extracted_text += page.get_text() + "\n"
                pdf_doc.close()
            except Exception as e:
                logger.error(f"PDF extraction error: {e}")
        
        elif any(x in mime_type.lower() for x in ['image', 'png', 'jpg', 'jpeg']):
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        elif any(x in mime_type.lower() for x in ['text', 'plain', 'json', 'xml']):
            try:
                extracted_text = file_bytes.decode('utf-8')[:5000]
            except:
                pass
        
        # Use AI to classify
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"classify_{uuid.uuid4().hex[:8]}",
            system_message="""Tu es un assistant de classification de documents CRM.
Analyse le document et retourne UNIQUEMENT un JSON valide:
{
    "title": "Titre descriptif du document",
    "category": "facture|devis|contrat|kbis|visuel|presentation|rapport|autre",
    "client_name": "Nom du client si visible, sinon null",
    "company": "Nom de l'entreprise si visible, sinon null",
    "description": "Brève description du contenu (max 100 caractères)"
}"""
        )
        
        if image_base64:
            msg = UserMessage(
                text=f"Classifie ce document (nom original: {filename})",
                file_contents=[ImageContent(image_base64)]
            )
        else:
            msg = UserMessage(
                text=f"""Classifie ce document:
Nom original: {filename}
Type MIME: {mime_type}
Contenu extrait:
{extracted_text[:3000]}"""
            )
        
        response = await chat.send_message(msg)
        
        # Parse JSON response
        import json
        json_str = response.strip()
        if json_str.startswith("```"):
            json_str = json_str.split("```")[1]
            if json_str.startswith("json"):
                json_str = json_str[4:]
        
        result = json.loads(json_str.strip())
        return result
        
    except Exception as e:
        logger.error(f"Classification error: {e}")
        # Return default classification
        return {
            "title": filename,
            "category": "autre",
            "client_name": None,
            "company": None,
            "description": "Document importé depuis Google Drive"
        }

# ==================== OAUTH ENDPOINTS ====================

@router.get("/connect")
async def connect_drive(current_user: dict = Depends(get_current_user)):
    """Initiate Google Drive OAuth flow"""
    try:
        flow = get_flow()
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=current_user["id"]
        )
        
        # Store state for verification
        await db.drive_oauth_states.insert_one({
            "state": state,
            "user_id": current_user["id"],
            "created_at": datetime.now(timezone.utc)
        })
        
        logger.info(f"Drive OAuth initiated for user {current_user['id']}")
        return {"authorization_url": authorization_url}
        
    except Exception as e:
        logger.error(f"Drive OAuth initiation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur OAuth: {str(e)}")

@router.get("/callback")
async def drive_callback(code: str = Query(...), state: str = Query(...)):
    """Handle Google Drive OAuth callback"""
    try:
        # Verify state
        state_doc = await db.drive_oauth_states.find_one({"state": state})
        if not state_doc:
            raise HTTPException(status_code=400, detail="État OAuth invalide")
        
        user_id = state_doc["user_id"]
        
        # Exchange code for credentials
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_DRIVE_REDIRECT_URI]
                }
            },
            scopes=None,  # Accept all granted scopes
            redirect_uri=GOOGLE_DRIVE_REDIRECT_URI
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        logger.info(f"Drive credentials obtained for user {user_id}")
        
        # Store credentials
        await db.drive_credentials.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": list(credentials.scopes) if credentials.scopes else SCOPES,
                "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        # Cleanup state
        await db.drive_oauth_states.delete_one({"state": state})
        
        # Redirect to frontend
        return RedirectResponse(url=f"{FRONTEND_URL}/admin/moltbot?drive_connected=true")
        
    except Exception as e:
        logger.error(f"Drive OAuth callback failed: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/admin/moltbot?drive_error={str(e)}")

@router.get("/status")
async def drive_status(current_user: dict = Depends(get_current_user)):
    """Check Google Drive connection status"""
    creds = await get_drive_credentials(current_user["id"])
    
    if creds:
        return {
            "connected": True,
            "message": "Google Drive connecté"
        }
    
    return {
        "connected": False,
        "message": "Google Drive non connecté"
    }

@router.post("/disconnect")
async def disconnect_drive(current_user: dict = Depends(get_current_user)):
    """Disconnect Google Drive"""
    await db.drive_credentials.delete_one({"user_id": current_user["id"]})
    return {"success": True, "message": "Google Drive déconnecté"}

# ==================== FILE OPERATIONS ====================

@router.get("/files")
async def list_drive_files(
    folder_id: Optional[str] = None,
    page_token: Optional[str] = None,
    page_size: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """List files from Google Drive"""
    service = await get_drive_service(current_user["id"])
    
    try:
        # Build query
        query = "trashed = false"
        if folder_id:
            query += f" and '{folder_id}' in parents"
        
        results = service.files().list(
            q=query,
            pageSize=page_size,
            pageToken=page_token,
            fields="nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink)",
            orderBy="modifiedTime desc"
        ).execute()
        
        files = results.get('files', [])
        next_page_token = results.get('nextPageToken')
        
        return {
            "files": files,
            "nextPageToken": next_page_token
        }
        
    except Exception as e:
        logger.error(f"Failed to list Drive files: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.get("/folders")
async def list_drive_folders(current_user: dict = Depends(get_current_user)):
    """List folders from Google Drive"""
    service = await get_drive_service(current_user["id"])
    
    try:
        results = service.files().list(
            q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            pageSize=50,
            fields="files(id, name)",
            orderBy="name"
        ).execute()
        
        return {"folders": results.get('files', [])}
        
    except Exception as e:
        logger.error(f"Failed to list Drive folders: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@router.post("/import")
async def import_files(
    request: ImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """Import files from Google Drive to CRM with auto-classification"""
    import cloudinary
    import cloudinary.uploader
    import io
    
    service = await get_drive_service(current_user["id"])
    
    # Configure Cloudinary
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET')
    )
    
    imported_files = []
    errors = []
    
    for file_id in request.file_ids:
        try:
            # Get file metadata
            file_meta = service.files().get(
                fileId=file_id,
                fields="id, name, mimeType, size"
            ).execute()
            
            filename = file_meta['name']
            mime_type = file_meta['mimeType']
            
            logger.info(f"Importing file: {filename} ({mime_type})")
            
            # Download file
            if mime_type.startswith('application/vnd.google-apps'):
                # Google Docs/Sheets/Slides - export as PDF
                export_mime = 'application/pdf'
                request_download = service.files().export_media(fileId=file_id, mimeType=export_mime)
                filename = filename + '.pdf'
                mime_type = 'application/pdf'
            else:
                request_download = service.files().get_media(fileId=file_id)
            
            file_buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(file_buffer, request_download)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            file_bytes = file_buffer.getvalue()
            
            # Auto-classify if requested
            classification = {"title": filename, "category": "autre", "client_name": None, "description": ""}
            if request.auto_classify:
                classification = await analyze_and_classify_file(file_bytes, filename, mime_type)
            
            # Upload to Cloudinary
            file_base64 = base64.b64encode(file_bytes).decode('utf-8')
            
            if 'image' in mime_type:
                data_uri = f"data:{mime_type};base64,{file_base64}"
                upload_result = cloudinary.uploader.upload(
                    data_uri,
                    public_id=f"crm_files/{uuid.uuid4().hex[:8]}_{filename}",
                    resource_type="image"
                )
            else:
                data_uri = f"data:{mime_type};base64,{file_base64}"
                upload_result = cloudinary.uploader.upload(
                    data_uri,
                    public_id=f"crm_files/{uuid.uuid4().hex[:8]}_{filename}",
                    resource_type="raw"
                )
            
            file_url = upload_result.get('secure_url', '')
            
            # Save to CRM database
            file_doc = {
                "id": str(uuid.uuid4()),
                "name": classification.get("title", filename),
                "original_name": filename,
                "url": file_url,
                "type": mime_type,
                "size": len(file_bytes),
                "category": classification.get("category", "autre"),
                "client_name": classification.get("client_name"),
                "company": classification.get("company"),
                "description": classification.get("description", ""),
                "folder_id": request.folder_id,
                "source": "google_drive",
                "drive_file_id": file_id,
                "imported_by": current_user["id"],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await db.files.insert_one(file_doc)
            
            imported_files.append({
                "id": file_doc["id"],
                "name": file_doc["name"],
                "category": file_doc["category"],
                "url": file_url
            })
            
            logger.info(f"Imported: {filename} -> {classification.get('title')} ({classification.get('category')})")
            
        except Exception as e:
            logger.error(f"Failed to import file {file_id}: {e}")
            errors.append(f"Erreur pour {file_id}: {str(e)}")
    
    return ImportResult(
        success=len(imported_files) > 0,
        imported_count=len(imported_files),
        files=imported_files,
        errors=errors
    )

# ==================== WHATSAPP INTEGRATION ====================

async def import_drive_files_for_whatsapp(user_id: str, search_term: str = None, count: int = 5) -> dict:
    """
    Import recent files from Drive for WhatsApp command.
    Returns dict with imported files info.
    """
    try:
        creds = await get_drive_credentials(user_id)
        if not creds:
            return {"success": False, "error": "Google Drive non connecté"}
        
        service = build('drive', 'v3', credentials=creds)
        
        # Build query
        query = "trashed = false"
        if search_term:
            query += f" and name contains '{search_term}'"
        
        results = service.files().list(
            q=query,
            pageSize=count,
            fields="files(id, name, mimeType)",
            orderBy="modifiedTime desc"
        ).execute()
        
        files = results.get('files', [])
        
        if not files:
            return {"success": False, "error": "Aucun fichier trouvé"}
        
        # Import files
        import cloudinary
        import cloudinary.uploader
        import io
        
        cloudinary.config(
            cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
            api_key=os.environ.get('CLOUDINARY_API_KEY'),
            api_secret=os.environ.get('CLOUDINARY_API_SECRET')
        )
        
        imported = []
        
        for file_meta in files[:count]:
            try:
                file_id = file_meta['id']
                filename = file_meta['name']
                mime_type = file_meta['mimeType']
                
                # Download
                if mime_type.startswith('application/vnd.google-apps'):
                    request_download = service.files().export_media(fileId=file_id, mimeType='application/pdf')
                    filename = filename + '.pdf'
                    mime_type = 'application/pdf'
                else:
                    request_download = service.files().get_media(fileId=file_id)
                
                file_buffer = io.BytesIO()
                downloader = MediaIoBaseDownload(file_buffer, request_download)
                
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                
                file_bytes = file_buffer.getvalue()
                
                # Classify
                classification = await analyze_and_classify_file(file_bytes, filename, mime_type)
                
                # Upload to Cloudinary
                file_base64 = base64.b64encode(file_bytes).decode('utf-8')
                resource_type = "image" if 'image' in mime_type else "raw"
                
                upload_result = cloudinary.uploader.upload(
                    f"data:{mime_type};base64,{file_base64}",
                    public_id=f"crm_files/{uuid.uuid4().hex[:8]}",
                    resource_type=resource_type
                )
                
                file_url = upload_result.get('secure_url', '')
                
                # Save to DB
                file_doc = {
                    "id": str(uuid.uuid4()),
                    "name": classification.get("title", filename),
                    "original_name": filename,
                    "url": file_url,
                    "type": mime_type,
                    "size": len(file_bytes),
                    "category": classification.get("category", "autre"),
                    "client_name": classification.get("client_name"),
                    "company": classification.get("company"),
                    "description": classification.get("description", ""),
                    "source": "google_drive_whatsapp",
                    "drive_file_id": file_id,
                    "imported_by": user_id,
                    "created_at": datetime.now(timezone.utc)
                }
                
                await db.files.insert_one(file_doc)
                
                imported.append({
                    "name": file_doc["name"],
                    "category": file_doc["category"],
                    "client": classification.get("client_name", "N/A")
                })
                
            except Exception as e:
                logger.error(f"Failed to import {filename}: {e}")
        
        return {
            "success": True,
            "imported_count": len(imported),
            "files": imported
        }
        
    except Exception as e:
        logger.error(f"Drive import error: {e}")
        return {"success": False, "error": str(e)}
