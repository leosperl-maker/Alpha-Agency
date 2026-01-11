"""
File Transfer Module - WeTransfer-like functionality
Upload large files (up to 2GB+), generate unique download links, send via email
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import os
import base64
from datetime import datetime, timezone, timedelta
import logging
import mimetypes
import io
import hashlib
import requests
import json

from .database import db, get_current_user

router = APIRouter(prefix="/transfers", tags=["File Transfers"])
logger = logging.getLogger(__name__)

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME', '')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY', '')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET', '')

# Brevo configuration
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')
BREVO_SENDER_EMAIL = os.environ.get('BREVO_SENDER_EMAIL', 'leo.sperl@alphagency.fr')
BREVO_SENDER_NAME = os.environ.get('BREVO_SENDER_NAME', 'Alpha Agency')

# Company info for branding
COMPANY_NAME = "ALPHAGENCY"
COMPANY_LOGO = "https://customer-assets.emergentagent.com/job_46adb236-f8e1-4856-a9f0-1ea29ce009cd/artifacts/kpvir23o_LOGO%20DEVIS%20FACTURES.png"
COMPANY_WEBSITE = "https://alphagency.fr"
ALPHAGENCY_URL = os.environ.get('ALPHAGENCY_URL', 'https://alphagency.fr')

USE_CLOUDINARY = all([CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET])

if USE_CLOUDINARY:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET
    )


# ==================== MODELS ====================

class TransferCreate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    recipient_emails: List[EmailStr]
    expires_in_days: int = 7  # Default 7 days

class TransferResponse(BaseModel):
    id: str
    title: str
    message: Optional[str]
    files: List[dict]
    total_size: int
    total_size_formatted: str
    download_link: str
    expires_at: str
    created_at: str
    download_count: int
    recipient_emails: List[str]

class PublicTransferResponse(BaseModel):
    id: str
    title: str
    message: Optional[str]
    files: List[dict]
    total_size: int
    total_size_formatted: str
    expires_at: str
    is_expired: bool
    download_count: int


# ==================== HELPER FUNCTIONS ====================

def format_file_size(size_bytes: int) -> str:
    """Format file size to human readable"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def get_file_extension(filename: str) -> str:
    """Get file extension"""
    return filename.lower().split('.')[-1] if '.' in filename else ''


def generate_transfer_id() -> str:
    """Generate a unique, URL-safe transfer ID"""
    return str(uuid.uuid4())[:8] + "-" + str(uuid.uuid4())[:4]


async def send_transfer_email(
    to_email: str,
    transfer_title: str,
    sender_name: str,
    message: str,
    download_link: str,
    files_info: List[dict],
    total_size: str,
    expires_at: str
):
    """Send transfer notification email via Brevo"""
    if not BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not configured, skipping email")
        return False
    
    try:
        # Build file list HTML
        files_html = ""
        for f in files_info[:5]:  # Show max 5 files
            files_html += f"""
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #eee;">
                    <span style="color: #333; font-weight: 500;">{f['name']}</span>
                </td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #eee; text-align: right; color: #666;">
                    {f['size_formatted']}
                </td>
            </tr>
            """
        
        if len(files_info) > 5:
            files_html += f"""
            <tr>
                <td colspan="2" style="padding: 12px 16px; color: #666; font-style: italic;">
                    ... et {len(files_info) - 5} autres fichiers
                </td>
            </tr>
            """
        
        # Beautiful email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                            <!-- Header with gradient -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 30px; text-align: center;">
                                    <img src="{COMPANY_LOGO}" alt="{COMPANY_NAME}" style="height: 50px; margin-bottom: 20px;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                                        Vous avez reçu des fichiers !
                                    </h1>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <!-- Sender info -->
                                    <div style="background: #f8f9fc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                        <p style="margin: 0; color: #666; font-size: 14px;">
                                            <strong style="color: #333;">{sender_name}</strong> vous a envoyé des fichiers
                                        </p>
                                        {f'<p style="margin: 12px 0 0; color: #444; font-size: 14px; line-height: 1.5;">{message}</p>' if message else ''}
                                    </div>
                                    
                                    <!-- Transfer info -->
                                    <h2 style="color: #333; font-size: 18px; margin: 0 0 16px; font-weight: 600;">
                                        {transfer_title}
                                    </h2>
                                    
                                    <!-- Files table -->
                                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                                        <thead>
                                            <tr style="background: #f8f9fc;">
                                                <th style="padding: 12px 16px; text-align: left; color: #666; font-weight: 500; font-size: 13px;">Fichier</th>
                                                <th style="padding: 12px 16px; text-align: right; color: #666; font-weight: 500; font-size: 13px;">Taille</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {files_html}
                                        </tbody>
                                        <tfoot>
                                            <tr style="background: #f8f9fc;">
                                                <td style="padding: 12px 16px; font-weight: 600; color: #333;">Total</td>
                                                <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #6366f1;">{total_size}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    
                                    <!-- Download button -->
                                    <div style="text-align: center; margin: 32px 0;">
                                        <a href="{download_link}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                                            Télécharger les fichiers
                                        </a>
                                    </div>
                                    
                                    <!-- Expiry notice -->
                                    <p style="text-align: center; color: #999; font-size: 13px; margin: 24px 0 0;">
                                        ⏰ Ce lien expire le <strong style="color: #666;">{expires_at}</strong>
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="background: #f8f9fc; padding: 24px 40px; text-align: center; border-top: 1px solid #eee;">
                                    <p style="margin: 0; color: #999; font-size: 12px;">
                                        Envoyé via <a href="{COMPANY_WEBSITE}" style="color: #6366f1; text-decoration: none;">{COMPANY_NAME}</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        # Send via Brevo API
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": BREVO_API_KEY
        }
        
        payload = {
            "sender": {
                "name": f"{sender_name} via {COMPANY_NAME}",
                "email": BREVO_SENDER_EMAIL
            },
            "to": [{"email": to_email}],
            "subject": f"📁 {sender_name} vous a envoyé des fichiers - {transfer_title}",
            "htmlContent": html_content
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code in [200, 201]:
            logger.info(f"Transfer email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"Brevo API error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send transfer email: {e}")
        return False


# ==================== ROUTES ====================

@router.post("/upload")
async def upload_transfer_file(
    file: UploadFile = File(...),
    transfer_id: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Upload a single file for a transfer (supports large files via chunked upload)"""
    if not USE_CLOUDINARY:
        raise HTTPException(status_code=500, detail="Cloud storage not configured")
    
    try:
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Generate unique filename
        ext = get_file_extension(file.filename)
        unique_filename = f"transfers/{transfer_id or 'temp'}/{uuid.uuid4().hex[:8]}_{file.filename}"
        
        # Determine resource type for Cloudinary
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'
        
        # For non-image files, use raw resource type
        if content_type.startswith('image/'):
            resource_type = 'image'
        elif content_type.startswith('video/'):
            resource_type = 'video'
        else:
            resource_type = 'raw'
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            content,
            public_id=unique_filename,
            resource_type=resource_type,
            use_filename=True,
            unique_filename=False,
            overwrite=True,
            chunk_size=6000000  # 6MB chunks for large files
        )
        
        return {
            "success": True,
            "file": {
                "name": file.filename,
                "size": file_size,
                "size_formatted": format_file_size(file_size),
                "type": content_type,
                "url": result.get('secure_url'),
                "public_id": result.get('public_id'),
                "resource_type": resource_type
            }
        }
        
    except Exception as e:
        logger.error(f"Error uploading transfer file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_transfer(
    background_tasks: BackgroundTasks,
    title: str = Form(None),
    message: str = Form(None),
    recipient_emails: str = Form(...),  # Comma-separated emails
    expires_in_days: int = Form(7),
    files_json: str = Form(...),  # JSON array of uploaded files
    current_user: dict = Depends(get_current_user)
):
    """Create a new file transfer and send notification emails"""
    try:
        # Parse files JSON
        files = json.loads(files_json)
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        # Parse recipient emails
        emails = [e.strip() for e in recipient_emails.split(',') if e.strip()]
        if not emails:
            raise HTTPException(status_code=400, detail="No recipient emails provided")
        
        # Generate transfer ID and calculate total size
        transfer_id = generate_transfer_id()
        total_size = sum(f.get('size', 0) for f in files)
        
        # Auto-generate title if not provided
        if not title:
            if len(files) == 1:
                title = files[0].get('name', 'Fichier')
            else:
                title = f"{len(files)} fichiers"
        
        # Calculate expiry (0 = never expires)
        if expires_in_days == 0:
            expires_at = None
            expires_formatted = "Jamais"
        else:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
            expires_formatted = expires_at.strftime("%d/%m/%Y à %H:%M")
        
        # Get sender info
        sender_name = current_user.get('name') or current_user.get('email', 'Quelqu\'un')
        
        # Create transfer document
        transfer_doc = {
            "id": transfer_id,
            "title": title,
            "message": message,
            "files": files,
            "total_size": total_size,
            "total_size_formatted": format_file_size(total_size),
            "recipient_emails": emails,
            "sender_id": current_user.get("id"),
            "sender_name": sender_name,
            "sender_email": current_user.get("email"),
            "expires_at": expires_at.isoformat() if expires_at else None,
            "never_expires": expires_in_days == 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "download_count": 0,
            "comments": [],  # For user comments/notes
            "status": "active"
        }
        
        # Save to database
        await db.transfers.insert_one(transfer_doc)
        
        # Generate download link using alphagency.fr domain
        download_link = f"{ALPHAGENCY_URL}/transfer/{transfer_id}"
        
        # Send emails in background (only if emails provided)
        for email in emails:
            background_tasks.add_task(
                send_transfer_email,
                to_email=email,
                transfer_title=title,
                sender_name=sender_name,
                message=message,
                download_link=download_link,
                files_info=files,
                total_size=format_file_size(total_size),
                expires_at=expires_formatted
            )
        
        return {
            "success": True,
            "transfer": {
                "id": transfer_id,
                "title": title,
                "download_link": download_link,
                "expires_at": expires_at.isoformat(),
                "recipient_count": len(emails)
            }
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid files JSON")
    except Exception as e:
        logger.error(f"Error creating transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mine")
async def get_my_transfers(
    current_user: dict = Depends(get_current_user)
):
    """Get all transfers created by current user"""
    try:
        transfers = await db.transfers.find(
            {"sender_id": current_user.get("id")},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Add download link and expiry status using alphagency.fr domain
        now = datetime.now(timezone.utc)
        
        for t in transfers:
            t["download_link"] = f"{ALPHAGENCY_URL}/transfer/{t['id']}"
            # Handle never-expiring transfers
            if t.get("never_expires") or not t.get("expires_at"):
                t["is_expired"] = False
            else:
                expires_at = datetime.fromisoformat(t["expires_at"].replace('Z', '+00:00'))
                t["is_expired"] = now > expires_at
        
        return {"data": transfers}
        
    except Exception as e:
        logger.error(f"Error fetching transfers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public/{transfer_id}")
async def get_public_transfer(transfer_id: str):
    """Get transfer details for public download page (no auth required)"""
    try:
        transfer = await db.transfers.find_one(
            {"id": transfer_id},
            {"_id": 0, "sender_id": 0, "sender_email": 0, "recipient_emails": 0}
        )
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        # Check expiry (handle never-expiring transfers)
        now = datetime.now(timezone.utc)
        if transfer.get("never_expires") or not transfer.get("expires_at"):
            is_expired = False
        else:
            expires_at = datetime.fromisoformat(transfer["expires_at"].replace('Z', '+00:00'))
            is_expired = now > expires_at
        
        return {
            "id": transfer["id"],
            "title": transfer["title"],
            "message": transfer.get("message"),
            "files": transfer["files"],
            "total_size": transfer["total_size"],
            "total_size_formatted": transfer["total_size_formatted"],
            "sender_name": transfer.get("sender_name", "Quelqu'un"),
            "expires_at": transfer.get("expires_at"),
            "never_expires": transfer.get("never_expires", False),
            "is_expired": is_expired,
            "download_count": transfer.get("download_count", 0),
            "comments": transfer.get("comments", []),
            "created_at": transfer["created_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching public transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/public/{transfer_id}/download")
async def record_download(transfer_id: str):
    """Record a download event and increment counter"""
    try:
        result = await db.transfers.update_one(
            {"id": transfer_id},
            {"$inc": {"download_count": 1}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording download: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{transfer_id}")
async def delete_transfer(
    transfer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a transfer"""
    try:
        # Find the transfer
        transfer = await db.transfers.find_one({
            "id": transfer_id,
            "sender_id": current_user.get("id")
        })
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        # Delete files from Cloudinary
        for f in transfer.get("files", []):
            public_id = f.get("public_id")
            resource_type = f.get("resource_type", "raw")
            if public_id:
                try:
                    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
                except Exception as e:
                    logger.warning(f"Failed to delete file from Cloudinary: {e}")
        
        # Delete from database
        await db.transfers.delete_one({"id": transfer_id})
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_transfer_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get transfer statistics for current user"""
    try:
        now = datetime.now(timezone.utc)
        
        # Count transfers
        total = await db.transfers.count_documents({"sender_id": current_user.get("id")})
        active = await db.transfers.count_documents({
            "sender_id": current_user.get("id"),
            "expires_at": {"$gt": now.isoformat()}
        })
        
        # Sum downloads
        pipeline = [
            {"$match": {"sender_id": current_user.get("id")}},
            {"$group": {"_id": None, "total_downloads": {"$sum": "$download_count"}}}
        ]
        downloads_result = await db.transfers.aggregate(pipeline).to_list(1)
        total_downloads = downloads_result[0]["total_downloads"] if downloads_result else 0
        
        return {
            "total_transfers": total,
            "active_transfers": active,
            "expired_transfers": total - active,
            "total_downloads": total_downloads
        }
        
    except Exception as e:
        logger.error(f"Error fetching transfer stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
