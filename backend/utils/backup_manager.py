"""
Backup Manager for Alpha Agency
Handles MongoDB backups, email sending, and Dropbox uploads
"""

import os
import json
import zipfile
import tempfile
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from io import BytesIO

import dropbox
from dropbox.files import WriteMode
from dropbox.exceptions import ApiError
from motor.motor_asyncio import AsyncIOMotorDatabase
import resend

logger = logging.getLogger(__name__)

# Configuration
BACKUP_CONFIG = {
    "retention_days": 30,
    "email_recipient": "leo.sperl@alphagency.fr",
    "email_subject_prefix": "[Alpha Agency] Backup",
    "dropbox_folder": "/AlphaAgency_Backups",
    "collections_to_backup": [
        "users", "contacts", "opportunities", "quotes", "invoices",
        "subscriptions", "documents", "portfolio", "services",
        "settings", "counters", "tasks", "budgets"
    ]
}


class BackupManager:
    """Manages database backups with email and Dropbox support"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.dropbox_token = os.environ.get("DROPBOX_ACCESS_TOKEN")
        self.resend_api_key = os.environ.get("RESEND_API_KEY")
        self.backup_history: List[Dict[str, Any]] = []
        
    async def create_backup(self, manual: bool = False) -> Dict[str, Any]:
        """Create a full backup of the database"""
        backup_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_alphagency_{backup_id}"
        start_time = datetime.now(timezone.utc)
        
        result = {
            "backup_id": backup_id,
            "backup_name": backup_name,
            "manual": manual,
            "started_at": start_time.isoformat(),
            "status": "in_progress",
            "collections": {},
            "email_sent": False,
            "dropbox_uploaded": False,
            "errors": []
        }
        
        try:
            # Step 1: Export collections to JSON
            logger.info(f"Starting backup {backup_name}")
            backup_data = {}
            
            for collection_name in BACKUP_CONFIG["collections_to_backup"]:
                try:
                    collection = self.db[collection_name]
                    documents = await collection.find({}, {"_id": 0}).to_list(length=None)
                    backup_data[collection_name] = documents
                    result["collections"][collection_name] = len(documents)
                    logger.info(f"Backed up {len(documents)} documents from {collection_name}")
                except Exception as e:
                    logger.warning(f"Could not backup {collection_name}: {e}")
                    result["collections"][collection_name] = 0
            
            # Step 2: Create ZIP file
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add each collection as a JSON file
                for coll_name, documents in backup_data.items():
                    json_content = json.dumps(documents, indent=2, default=str, ensure_ascii=False)
                    zip_file.writestr(f"{coll_name}.json", json_content)
                
                # Add metadata
                metadata = {
                    "backup_id": backup_id,
                    "created_at": start_time.isoformat(),
                    "manual": manual,
                    "collections": result["collections"],
                    "total_documents": sum(result["collections"].values())
                }
                zip_file.writestr("_metadata.json", json.dumps(metadata, indent=2))
            
            zip_buffer.seek(0)
            zip_content = zip_buffer.getvalue()
            result["file_size"] = len(zip_content)
            
            # Step 3: Upload to Dropbox
            if self.dropbox_token:
                try:
                    result["dropbox_uploaded"] = await self._upload_to_dropbox(
                        zip_content, f"{backup_name}.zip"
                    )
                except Exception as e:
                    logger.error(f"Dropbox upload failed: {e}")
                    result["errors"].append(f"Dropbox: {str(e)}")
            else:
                result["errors"].append("Dropbox token not configured")
            
            # Step 4: Send email
            if self.resend_api_key:
                try:
                    result["email_sent"] = await self._send_backup_email(
                        zip_content, backup_name, result
                    )
                except Exception as e:
                    logger.error(f"Email sending failed: {e}")
                    result["errors"].append(f"Email: {str(e)}")
            else:
                result["errors"].append("Resend API key not configured")
            
            result["status"] = "completed"
            result["completed_at"] = datetime.now(timezone.utc).isoformat()
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            result["status"] = "failed"
            result["errors"].append(str(e))
        
        # Save to history
        self.backup_history.append(result)
        if len(self.backup_history) > 100:
            self.backup_history = self.backup_history[-100:]
        
        # Save backup record to database
        await self._save_backup_record(result)
        
        return result
    
    async def _upload_to_dropbox(self, content: bytes, filename: str) -> bool:
        """Upload backup file to Dropbox"""
        try:
            dbx = dropbox.Dropbox(self.dropbox_token)
            
            # Check/create folder
            folder_path = BACKUP_CONFIG["dropbox_folder"]
            try:
                dbx.files_get_metadata(folder_path)
            except ApiError:
                dbx.files_create_folder_v2(folder_path)
            
            # Upload file
            file_path = f"{folder_path}/{filename}"
            dbx.files_upload(content, file_path, mode=WriteMode('overwrite'))
            logger.info(f"Uploaded to Dropbox: {file_path}")
            
            # Clean old backups
            await self._cleanup_old_dropbox_backups(dbx)
            
            return True
        except Exception as e:
            logger.error(f"Dropbox upload error: {e}")
            raise
    
    async def _cleanup_old_dropbox_backups(self, dbx: dropbox.Dropbox):
        """Remove backups older than retention period"""
        try:
            folder_path = BACKUP_CONFIG["dropbox_folder"]
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=BACKUP_CONFIG["retention_days"])
            
            result = dbx.files_list_folder(folder_path)
            for entry in result.entries:
                if hasattr(entry, 'client_modified'):
                    if entry.client_modified < cutoff_date.replace(tzinfo=None):
                        dbx.files_delete_v2(entry.path_display)
                        logger.info(f"Deleted old backup: {entry.name}")
        except Exception as e:
            logger.warning(f"Could not cleanup old backups: {e}")
    
    async def _send_backup_email(self, content: bytes, backup_name: str, result: Dict) -> bool:
        """Send backup via email"""
        try:
            import base64
            resend.api_key = self.resend_api_key
            
            # Create email content
            total_docs = sum(result["collections"].values())
            file_size_kb = result.get("file_size", 0) / 1024
            
            html_content = f"""
            <h2>🔒 Sauvegarde Alpha Agency</h2>
            <p><strong>Date:</strong> {datetime.now().strftime('%d/%m/%Y à %H:%M')}</p>
            <p><strong>Type:</strong> {'Manuel' if result['manual'] else 'Automatique'}</p>
            <p><strong>Taille:</strong> {file_size_kb:.2f} KB</p>
            <p><strong>Documents sauvegardés:</strong> {total_docs}</p>
            
            <h3>Collections:</h3>
            <ul>
            {''.join(f"<li>{name}: {count} documents</li>" for name, count in result['collections'].items() if count > 0)}
            </ul>
            
            <p><strong>Dropbox:</strong> {'✅ Uploadé' if result['dropbox_uploaded'] else '❌ Non uploadé'}</p>
            
            <hr>
            <p><em>Ce backup est conservé pendant {BACKUP_CONFIG['retention_days']} jours.</em></p>
            """
            
            # Send email with attachment
            response = resend.Emails.send({
                "from": "Alpha Agency <noreply@alphagency.fr>",
                "to": [BACKUP_CONFIG["email_recipient"]],
                "subject": f"{BACKUP_CONFIG['email_subject_prefix']} - {backup_name}",
                "html": html_content,
                "attachments": [{
                    "filename": f"{backup_name}.zip",
                    "content": base64.b64encode(content).decode('utf-8')
                }]
            })
            
            logger.info(f"Backup email sent to {BACKUP_CONFIG['email_recipient']}")
            return True
        except Exception as e:
            logger.error(f"Email sending error: {e}")
            raise
    
    async def _save_backup_record(self, result: Dict):
        """Save backup record to database"""
        try:
            await self.db.backup_history.insert_one({
                **result,
                "_id": result["backup_id"]
            })
        except Exception as e:
            logger.warning(f"Could not save backup record: {e}")
    
    async def get_backup_status(self) -> Dict[str, Any]:
        """Get current backup system status"""
        # Get recent backups from database
        recent_backups = await self.db.backup_history.find(
            {}, {"_id": 0}
        ).sort("started_at", -1).limit(10).to_list(10)
        
        last_backup = recent_backups[0] if recent_backups else None
        
        return {
            "system_active": True,
            "dropbox_configured": bool(self.dropbox_token),
            "email_configured": bool(self.resend_api_key),
            "retention_days": BACKUP_CONFIG["retention_days"],
            "schedule": "Toutes les 6 heures (00h, 06h, 12h, 18h)",
            "email_recipient": BACKUP_CONFIG["email_recipient"],
            "last_backup": last_backup,
            "recent_backups": recent_backups,
            "total_backups": await self.db.backup_history.count_documents({})
        }
    
    async def get_backup_history(self, limit: int = 20) -> List[Dict]:
        """Get backup history"""
        backups = await self.db.backup_history.find(
            {}, {"_id": 0}
        ).sort("started_at", -1).limit(limit).to_list(limit)
        return backups
