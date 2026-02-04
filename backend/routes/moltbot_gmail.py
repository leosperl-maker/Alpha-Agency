"""
MoltBot Gmail Integration
Full Gmail access for intelligent email management

Features:
- OAuth 2.0 authentication with full Gmail scope
- Email listing, reading, archiving
- Newsletter detection and unsubscription
- Smart categorization with AI
- Safe mode (label + archive, never delete)
- Action logging for audit/rollback
"""

import os
import re
import base64
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import httpx
from bs4 import BeautifulSoup

from .database import db, get_current_user
from .token_encryption import encrypt_token, decrypt_token

logger = logging.getLogger("moltbot_gmail")
router = APIRouter()

# ===========================================
# CONFIGURATION
# ===========================================

# Gmail scopes - keep minimal to avoid scope change errors
GMAIL_SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]
GOOGLE_CLIENT_ID = os.environ.get('GMAIL_CLIENT_ID', '61051497688-5uih5ogf70mkvb771fdv75sjbta77anj.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GMAIL_CLIENT_SECRET', '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')
GOOGLE_REDIRECT_URI = os.environ.get('GMAIL_REDIRECT_URI', 'https://alphagency.fr/api/moltbot/gmail/callback')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://alphagency.fr')

# Liste blanche - Ne jamais supprimer/désabonner ces emails
WHITELIST_DOMAINS = [
    'stripe.com', 'paypal.com', 'apple.com', 'google.com', 'meta.com', 'facebook.com',
    'gov.fr', 'impots.gouv.fr', 'urssaf.fr', 'ameli.fr', 'caf.fr', 'pole-emploi.fr',
    'banque', 'bank', 'credit', 'assurance', 'mutuelle',
]

WHITELIST_KEYWORDS = [
    'facture', 'invoice', 'paiement', 'payment', 'contrat', 'contract',
    'client', 'devis', 'quote', 'rdv', 'rendez-vous', 'appointment',
    'confirmation', 'commande', 'order', 'reçu', 'receipt',
    'important', 'urgent', 'action requise', 'action required',
]

# Labels MoltBot
MOLTBOT_LABEL_CLEANED = "MoltBot/Cleaned"
MOLTBOT_LABEL_NEWSLETTER = "MoltBot/Newsletter"
MOLTBOT_LABEL_UNSUBSCRIBED = "MoltBot/Unsubscribed"
MOLTBOT_LABEL_IMPORTANT = "MoltBot/Important"

# ===========================================
# MODELS
# ===========================================

class GmailAuthResponse(BaseModel):
    authorization_url: str
    state: str

class GmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    messages_total: Optional[int] = None
    last_sync: Optional[str] = None

class EmailPreview(BaseModel):
    id: str
    thread_id: str
    from_address: str
    subject: str
    snippet: str
    date: str
    labels: List[str]
    has_unsubscribe: bool
    is_newsletter: bool
    is_whitelisted: bool

class CleanRequest(BaseModel):
    mode: str = "soft"  # soft, medium, hard
    max_emails: int = 50
    query: Optional[str] = None

class UnsubscribeRequest(BaseModel):
    message_ids: List[str]

class ReplyRequest(BaseModel):
    to: str
    subject: str
    body: str
    in_reply_to: Optional[str] = None

# ===========================================
# HELPER FUNCTIONS
# ===========================================

def get_user_id(user: dict) -> str:
    return user.get("user_id") or user.get("id") or str(user.get("_id", ""))

def get_oauth_flow(state: Optional[str] = None) -> Flow:
    """Create OAuth flow object"""
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uris": [GOOGLE_REDIRECT_URI],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token"
        }
    }
    
    flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, state=state)
    flow.redirect_uri = GOOGLE_REDIRECT_URI
    return flow

def is_whitelisted(email_from: str, subject: str) -> bool:
    """Check if email should be protected from deletion/unsubscribe"""
    email_lower = email_from.lower()
    subject_lower = subject.lower()
    
    # Check domain whitelist
    for domain in WHITELIST_DOMAINS:
        if domain in email_lower:
            return True
    
    # Check keyword whitelist
    for keyword in WHITELIST_KEYWORDS:
        if keyword in subject_lower or keyword in email_lower:
            return True
    
    return False

def is_newsletter(headers: Dict[str, str], subject: str) -> bool:
    """Detect if email is a newsletter/promotional"""
    # Check for list-unsubscribe header
    if headers.get('List-Unsubscribe'):
        return True
    
    # Check for common newsletter indicators
    newsletter_indicators = [
        'newsletter', 'digest', 'weekly', 'daily', 'monthly',
        'unsubscribe', 'désabonner', 'promotions', 'offre',
        'nouveautés', 'actualités', 'news', 'update'
    ]
    
    subject_lower = subject.lower()
    for indicator in newsletter_indicators:
        if indicator in subject_lower:
            return True
    
    return False

def parse_unsubscribe_header(list_unsubscribe: str) -> tuple[Optional[str], Optional[str]]:
    """Parse List-Unsubscribe header to extract URL and mailto"""
    if not list_unsubscribe:
        return None, None
    
    # Extract URL
    url_match = re.search(r'<(https?://[^>]+)>', list_unsubscribe)
    unsubscribe_url = url_match.group(1) if url_match else None
    
    # Extract mailto
    mailto_match = re.search(r'<mailto:([^>]+)>', list_unsubscribe)
    unsubscribe_email = mailto_match.group(1) if mailto_match else None
    
    return unsubscribe_url, unsubscribe_email

async def get_gmail_service(user_id: str) -> Optional[Any]:
    """Get authenticated Gmail service for a user"""
    gmail_creds = await db.gmail_credentials.find_one({"user_id": user_id})
    if not gmail_creds:
        logger.warning(f"No Gmail credentials found for user {user_id}")
        return None
    
    access_token = decrypt_token(gmail_creds.get("access_token_encrypted", ""))
    refresh_token = decrypt_token(gmail_creds.get("refresh_token_encrypted", ""))
    token_expiry = gmail_creds.get("token_expiry")
    
    if not access_token or not refresh_token:
        logger.warning(f"Empty tokens for user {user_id}")
        return None
    
    # Check if token needs refresh (refresh 5 minutes before expiry for safety)
    should_refresh = False
    if token_expiry:
        try:
            # Parse expiry datetime - handle various formats
            expiry_str = str(token_expiry).replace('Z', '+00:00')
            expiry_dt = datetime.fromisoformat(expiry_str)
            
            # Ensure expiry_dt is timezone-aware
            if expiry_dt.tzinfo is None:
                expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
            
            # Compare with current UTC time
            now_utc = datetime.now(timezone.utc)
            
            # Refresh 5 minutes before actual expiry
            if expiry_dt < (now_utc + timedelta(minutes=5)):
                should_refresh = True
        except Exception as e:
            logger.warning(f"Could not parse token expiry '{token_expiry}': {e}")
            should_refresh = True
    else:
        # No expiry stored, try to refresh anyway
        should_refresh = True
    
    if should_refresh:
        logger.info(f"Attempting to refresh Gmail token for user {user_id}")
        new_tokens = await refresh_gmail_token(refresh_token)
        if new_tokens:
            access_token = new_tokens["access_token"]
            # Update stored token
            await db.gmail_credentials.update_one(
                {"user_id": user_id},
                {"$set": {
                    "access_token_encrypted": encrypt_token(access_token),
                    "token_expiry": new_tokens["token_expiry"]
                }}
            )
            logger.info(f"Gmail token refreshed successfully for user {user_id}")
        else:
            logger.warning(f"Token refresh failed for user {user_id}, using existing token")
    
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )
    
    return build('gmail', 'v1', credentials=credentials)

async def refresh_gmail_token(refresh_token: str) -> Optional[Dict]:
    """Refresh Gmail access token"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "access_token": data["access_token"],
                    "token_expiry": (datetime.now(timezone.utc) + timedelta(seconds=data["expires_in"])).isoformat()
                }
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
    
    return None

async def log_gmail_action(user_id: str, action: str, message_id: str, details: Dict = None):
    """Log MoltBot Gmail action for audit"""
    log_entry = {
        "user_id": user_id,
        "action": action,
        "message_id": message_id,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gmail_action_logs.insert_one(log_entry)

# ===========================================
# AUTH ENDPOINTS
# ===========================================

@router.get("/auth")
async def initiate_gmail_auth(current_user: dict = Depends(get_current_user)):
    """Start Gmail OAuth flow"""
    user_id = get_user_id(current_user)
    
    # First, delete any existing credentials to force fresh auth
    await db.gmail_credentials.delete_one({"user_id": user_id})
    
    flow = get_oauth_flow()
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'  # Force consent screen to get fresh scopes
    )
    
    # Store state for verification
    await db.gmail_oauth_states.update_one(
        {"user_id": user_id},
        {"$set": {
            "state": state,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"authorization_url": authorization_url, "state": state}

@router.get("/callback")
async def gmail_oauth_callback(
    code: str = Query(...),
    state: str = Query(...)
):
    """Handle OAuth callback from Google"""
    try:
        flow = get_oauth_flow(state)
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Get user profile from Gmail
        service = build('gmail', 'v1', credentials=credentials)
        profile = service.users().getProfile(userId='me').execute()
        email = profile.get('emailAddress')
        
        # Find user by email or state
        state_doc = await db.gmail_oauth_states.find_one({"state": state})
        if not state_doc:
            raise HTTPException(status_code=400, detail="Invalid OAuth state")
        
        user_id = state_doc["user_id"]
        
        # Store credentials
        await db.gmail_credentials.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "email": email,
                "access_token_encrypted": encrypt_token(credentials.token),
                "refresh_token_encrypted": encrypt_token(credentials.refresh_token),
                "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        # Create MoltBot labels if they don't exist
        await ensure_moltbot_labels(service)
        
        # Clean up state
        await db.gmail_oauth_states.delete_one({"state": state})
        
        # Redirect to frontend
        return RedirectResponse(url=f"{FRONTEND_URL}/admin/moltbot?gmail=connected")
    
    except Exception as e:
        logger.error(f"Gmail OAuth callback error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/admin/moltbot?gmail=error&message={str(e)}")

async def ensure_moltbot_labels(service):
    """Create MoltBot labels if they don't exist"""
    try:
        existing = service.users().labels().list(userId='me').execute()
        existing_names = [l['name'] for l in existing.get('labels', [])]
        
        for label_name in [MOLTBOT_LABEL_CLEANED, MOLTBOT_LABEL_NEWSLETTER, MOLTBOT_LABEL_UNSUBSCRIBED, MOLTBOT_LABEL_IMPORTANT]:
            if label_name not in existing_names:
                service.users().labels().create(
                    userId='me',
                    body={'name': label_name, 'labelListVisibility': 'labelShow', 'messageListVisibility': 'show'}
                ).execute()
    except Exception as e:
        logger.warning(f"Could not create labels: {e}")

# ===========================================
# STATUS & INFO ENDPOINTS
# ===========================================

@router.get("/status")
async def get_gmail_status(current_user: dict = Depends(get_current_user)):
    """Get Gmail connection status"""
    user_id = get_user_id(current_user)
    
    gmail_creds = await db.gmail_credentials.find_one({"user_id": user_id})
    
    if not gmail_creds:
        return {"connected": False}
    
    # Try to get profile info
    try:
        service = await get_gmail_service(user_id)
        if service:
            profile = service.users().getProfile(userId='me').execute()
            return {
                "connected": True,
                "email": gmail_creds.get("email"),
                "messages_total": profile.get("messagesTotal"),
                "threads_total": profile.get("threadsTotal"),
                "connected_at": gmail_creds.get("connected_at")
            }
    except HttpError as e:
        logger.error(f"Gmail API error: {e.status_code} - {e.reason}")
        # If 401 or 403, token is invalid - need reauth
        if e.status_code in [401, 403]:
            return {
                "connected": True,
                "email": gmail_creds.get("email"),
                "needs_reauth": True,
                "error": f"Token invalide: {e.reason}"
            }
    except Exception as e:
        logger.error(f"Gmail status check failed: {e}")
        # Try to determine if it's a token issue
        error_str = str(e).lower()
        if "invalid_grant" in error_str or "token" in error_str:
            return {
                "connected": True,
                "email": gmail_creds.get("email"),
                "needs_reauth": True,
                "error": str(e)
            }
    
    # If we get here, credentials exist but we couldn't verify - assume OK for now
    return {
        "connected": True,
        "email": gmail_creds.get("email"),
        "messages_total": None,
        "connected_at": gmail_creds.get("connected_at")
    }

@router.delete("/disconnect")
async def disconnect_gmail(current_user: dict = Depends(get_current_user)):
    """Disconnect Gmail account"""
    user_id = get_user_id(current_user)
    
    await db.gmail_credentials.delete_one({"user_id": user_id})
    
    return {"success": True, "message": "Gmail déconnecté"}

# ===========================================
# EMAIL LISTING & READING
# ===========================================

@router.get("/emails")
async def list_emails(
    query: str = Query("", description="Gmail search query"),
    max_results: int = Query(20, ge=1, le=100),
    page_token: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List emails with optional filtering"""
    user_id = get_user_id(current_user)
    
    service = await get_gmail_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Gmail non connecté")
    
    try:
        # Get messages
        results = service.users().messages().list(
            userId='me',
            q=query or "in:inbox",
            maxResults=max_results,
            pageToken=page_token
        ).execute()
        
        messages = []
        for msg in results.get('messages', []):
            msg_detail = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='metadata',
                metadataHeaders=['From', 'Subject', 'Date', 'List-Unsubscribe']
            ).execute()
            
            headers = {h['name']: h['value'] for h in msg_detail['payload'].get('headers', [])}
            
            from_addr = headers.get('From', '')
            subject = headers.get('Subject', '')
            is_nl = is_newsletter(headers, subject)
            is_wl = is_whitelisted(from_addr, subject)
            
            messages.append({
                "id": msg['id'],
                "thread_id": msg_detail['threadId'],
                "from_address": from_addr,
                "subject": subject,
                "snippet": msg_detail.get('snippet', '')[:100],
                "date": headers.get('Date', ''),
                "labels": msg_detail.get('labelIds', []),
                "has_unsubscribe": bool(headers.get('List-Unsubscribe')),
                "is_newsletter": is_nl,
                "is_whitelisted": is_wl
            })
        
        return {
            "messages": messages,
            "next_page_token": results.get("nextPageToken"),
            "result_size_estimate": results.get("resultSizeEstimate")
        }
    
    except HttpError as e:
        logger.error(f"Gmail API error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Gmail API: {str(e)}")

@router.get("/emails/{message_id}")
async def get_email_details(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get full email details"""
    user_id = get_user_id(current_user)
    
    service = await get_gmail_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Gmail non connecté")
    
    try:
        msg = service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()
        
        headers = {h['name']: h['value'] for h in msg['payload'].get('headers', [])}
        
        # Extract body
        body = ""
        if 'parts' in msg['payload']:
            for part in msg['payload']['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part.get('body', {}).get('data', '')
                    if data:
                        body = base64.urlsafe_b64decode(data).decode()
                        break
                elif part['mimeType'] == 'text/html' and not body:
                    data = part.get('body', {}).get('data', '')
                    if data:
                        html = base64.urlsafe_b64decode(data).decode()
                        soup = BeautifulSoup(html, 'html.parser')
                        body = soup.get_text()
        elif 'body' in msg['payload']:
            data = msg['payload']['body'].get('data', '')
            if data:
                body = base64.urlsafe_b64decode(data).decode()
        
        # Parse unsubscribe
        unsub_url, unsub_email = parse_unsubscribe_header(headers.get('List-Unsubscribe', ''))
        
        return {
            "id": message_id,
            "thread_id": msg['threadId'],
            "from_address": headers.get('From', ''),
            "to_address": headers.get('To', ''),
            "subject": headers.get('Subject', ''),
            "date": headers.get('Date', ''),
            "body": body[:5000],
            "labels": msg.get('labelIds', []),
            "unsubscribe_url": unsub_url,
            "unsubscribe_email": unsub_email,
            "is_newsletter": is_newsletter(headers, headers.get('Subject', '')),
            "is_whitelisted": is_whitelisted(headers.get('From', ''), headers.get('Subject', ''))
        }
    
    except HttpError as e:
        raise HTTPException(status_code=500, detail=f"Erreur Gmail API: {str(e)}")

# ===========================================
# CLEANING & MANAGEMENT
# ===========================================

@router.post("/clean")
async def clean_inbox(
    request: CleanRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Clean inbox based on mode:
    - soft: label + archive only (default, safest)
    - medium: label + archive + mark for deletion after 30 days
    - hard: label + archive + immediate delete (risky!)
    """
    user_id = get_user_id(current_user)
    
    service = await get_gmail_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Gmail non connecté")
    
    # Start cleaning in background
    background_tasks.add_task(
        clean_inbox_task,
        user_id,
        service,
        request.mode,
        request.max_emails,
        request.query
    )
    
    return {
        "success": True,
        "message": f"Nettoyage lancé en mode '{request.mode}' sur {request.max_emails} emails",
        "mode": request.mode
    }

async def clean_inbox_task(user_id: str, service, mode: str, max_emails: int, query: Optional[str]):
    """Background task for inbox cleaning"""
    try:
        # Get labels
        labels = service.users().labels().list(userId='me').execute()
        label_map = {l['name']: l['id'] for l in labels.get('labels', [])}
        
        cleaned_label_id = label_map.get(MOLTBOT_LABEL_CLEANED)
        newsletter_label_id = label_map.get(MOLTBOT_LABEL_NEWSLETTER)
        
        # Search for newsletters in inbox
        search_query = query or "in:inbox (category:promotions OR has:unsubscribe)"
        
        results = service.users().messages().list(
            userId='me',
            q=search_query,
            maxResults=max_emails
        ).execute()
        
        stats = {"processed": 0, "cleaned": 0, "skipped_whitelist": 0, "errors": 0}
        
        for msg in results.get('messages', []):
            try:
                msg_detail = service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='metadata',
                    metadataHeaders=['From', 'Subject', 'List-Unsubscribe']
                ).execute()
                
                headers = {h['name']: h['value'] for h in msg_detail['payload'].get('headers', [])}
                from_addr = headers.get('From', '')
                subject = headers.get('Subject', '')
                
                stats["processed"] += 1
                
                # Skip whitelisted emails
                if is_whitelisted(from_addr, subject):
                    stats["skipped_whitelist"] += 1
                    continue
                
                # Apply cleaning based on mode
                if mode in ["soft", "medium", "hard"]:
                    # Add labels
                    labels_to_add = []
                    if cleaned_label_id:
                        labels_to_add.append(cleaned_label_id)
                    if newsletter_label_id and is_newsletter(headers, subject):
                        labels_to_add.append(newsletter_label_id)
                    
                    if labels_to_add:
                        service.users().messages().modify(
                            userId='me',
                            id=msg['id'],
                            body={'addLabelIds': labels_to_add}
                        ).execute()
                    
                    # Archive (remove from INBOX)
                    service.users().messages().modify(
                        userId='me',
                        id=msg['id'],
                        body={'removeLabelIds': ['INBOX']}
                    ).execute()
                    
                    # Log action
                    await log_gmail_action(user_id, "clean", msg['id'], {
                        "mode": mode,
                        "from": from_addr,
                        "subject": subject
                    })
                    
                    stats["cleaned"] += 1
                
                # Small delay to avoid rate limits
                await asyncio.sleep(0.1)
            
            except Exception as e:
                logger.error(f"Error cleaning message {msg['id']}: {e}")
                stats["errors"] += 1
        
        # Save stats
        await db.gmail_clean_runs.insert_one({
            "user_id": user_id,
            "mode": mode,
            "stats": stats,
            "completed_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Gmail clean completed for {user_id}: {stats}")
    
    except Exception as e:
        logger.error(f"Gmail clean task failed: {e}")

@router.post("/unsubscribe")
async def unsubscribe_newsletters(
    request: UnsubscribeRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Unsubscribe from newsletters"""
    user_id = get_user_id(current_user)
    
    service = await get_gmail_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Gmail non connecté")
    
    background_tasks.add_task(
        unsubscribe_task,
        user_id,
        service,
        request.message_ids
    )
    
    return {
        "success": True,
        "message": f"Désabonnement lancé pour {len(request.message_ids)} emails"
    }

async def unsubscribe_task(user_id: str, service, message_ids: List[str]):
    """Background task for unsubscription"""
    results = {"success": 0, "failed": 0, "skipped": 0}
    
    for msg_id in message_ids:
        try:
            msg = service.users().messages().get(
                userId='me',
                id=msg_id,
                format='metadata',
                metadataHeaders=['From', 'Subject', 'List-Unsubscribe', 'List-Unsubscribe-Post']
            ).execute()
            
            headers = {h['name']: h['value'] for h in msg['payload'].get('headers', [])}
            
            # Check whitelist
            if is_whitelisted(headers.get('From', ''), headers.get('Subject', '')):
                results["skipped"] += 1
                continue
            
            unsub_url, unsub_email = parse_unsubscribe_header(headers.get('List-Unsubscribe', ''))
            
            if unsub_url:
                # Try URL unsubscribe
                try:
                    async with httpx.AsyncClient() as client:
                        # Check if POST is preferred
                        list_unsub_post = headers.get('List-Unsubscribe-Post', '')
                        if 'List-Unsubscribe=One-Click' in list_unsub_post:
                            await client.post(unsub_url, data={'List-Unsubscribe': 'One-Click'})
                        else:
                            await client.get(unsub_url)
                    
                    results["success"] += 1
                    await log_gmail_action(user_id, "unsubscribe", msg_id, {
                        "method": "url",
                        "url": unsub_url
                    })
                except Exception as e:
                    logger.warning(f"URL unsubscribe failed for {msg_id}: {e}")
                    results["failed"] += 1
            
            elif unsub_email:
                # Send unsubscribe email
                try:
                    message = MIMEText("Unsubscribe")
                    message['to'] = unsub_email
                    message['subject'] = "Unsubscribe"
                    
                    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
                    service.users().messages().send(
                        userId='me',
                        body={'raw': raw}
                    ).execute()
                    
                    results["success"] += 1
                    await log_gmail_action(user_id, "unsubscribe", msg_id, {
                        "method": "email",
                        "email": unsub_email
                    })
                except Exception as e:
                    logger.warning(f"Email unsubscribe failed for {msg_id}: {e}")
                    results["failed"] += 1
            else:
                results["skipped"] += 1
            
            await asyncio.sleep(0.5)  # Rate limit
        
        except Exception as e:
            logger.error(f"Unsubscribe error for {msg_id}: {e}")
            results["failed"] += 1
    
    await db.gmail_unsubscribe_runs.insert_one({
        "user_id": user_id,
        "results": results,
        "completed_at": datetime.now(timezone.utc).isoformat()
    })

# ===========================================
# REPLY & SEND
# ===========================================

@router.post("/reply")
async def send_reply(
    request: ReplyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send an email reply"""
    user_id = get_user_id(current_user)
    
    service = await get_gmail_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Gmail non connecté")
    
    try:
        message = MIMEMultipart()
        message['to'] = request.to
        message['subject'] = request.subject
        message.attach(MIMEText(request.body, 'html'))
        
        if request.in_reply_to:
            message['In-Reply-To'] = request.in_reply_to
            message['References'] = request.in_reply_to
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        sent = service.users().messages().send(
            userId='me',
            body={'raw': raw}
        ).execute()
        
        await log_gmail_action(user_id, "send", sent['id'], {
            "to": request.to,
            "subject": request.subject
        })
        
        return {"success": True, "message_id": sent['id']}
    
    except HttpError as e:
        raise HTTPException(status_code=500, detail=f"Erreur envoi: {str(e)}")

@router.post("/draft")
async def create_draft(
    request: ReplyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create email draft (if not confident enough to send)"""
    user_id = get_user_id(current_user)
    
    service = await get_gmail_service(user_id)
    if not service:
        raise HTTPException(status_code=401, detail="Gmail non connecté")
    
    try:
        message = MIMEMultipart()
        message['to'] = request.to
        message['subject'] = request.subject
        message.attach(MIMEText(request.body, 'html'))
        
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        draft = service.users().drafts().create(
            userId='me',
            body={'message': {'raw': raw}}
        ).execute()
        
        return {"success": True, "draft_id": draft['id']}
    
    except HttpError as e:
        raise HTTPException(status_code=500, detail=f"Erreur brouillon: {str(e)}")

# ===========================================
# LOGS & HISTORY
# ===========================================

@router.get("/logs")
async def get_action_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get MoltBot action logs for audit"""
    user_id = get_user_id(current_user)
    
    query = {"user_id": user_id}
    if action:
        query["action"] = action
    
    logs = await db.gmail_action_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"logs": logs, "count": len(logs)}

@router.get("/stats")
async def get_cleaning_stats(current_user: dict = Depends(get_current_user)):
    """Get cleaning statistics"""
    user_id = get_user_id(current_user)
    
    # Get last clean run
    last_clean = await db.gmail_clean_runs.find_one(
        {"user_id": user_id},
        sort=[("completed_at", -1)]
    )
    
    # Get total actions
    total_actions = await db.gmail_action_logs.count_documents({"user_id": user_id})
    
    # Get action breakdown
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}}
    ]
    action_breakdown = await db.gmail_action_logs.aggregate(pipeline).to_list(10)
    
    return {
        "last_clean": last_clean,
        "total_actions": total_actions,
        "action_breakdown": {a["_id"]: a["count"] for a in action_breakdown}
    }
