"""
Appointments / Agenda routes - Google Calendar integration with Meet links
SMS/Email reminders via Brevo
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import requests

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["Appointments"])

# ==================== CONFIG ====================

# Fallback to env vars if not in database
GOOGLE_CLIENT_ID_DEFAULT = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET_DEFAULT = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI_DEFAULT = os.environ.get('GOOGLE_REDIRECT_URI', '')
FRONTEND_URL_DEFAULT = os.environ.get('FRONTEND_URL', '')

BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')
BREVO_SMS_SENDER = "AlphaAgency"  # Max 11 chars for alphanumeric sender
BREVO_SENDER_EMAIL = os.environ.get('BREVO_SENDER_EMAIL', 'noreply@alphagency.fr')
BREVO_SENDER_NAME = os.environ.get('BREVO_SENDER_NAME', 'Alpha Agency')

GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

async def get_google_config():
    """Get Google OAuth config from database, fallback to env vars"""
    settings = await db.settings.find_one({"type": "integrations"})
    if settings:
        return {
            "client_id": settings.get("google_client_id") or GOOGLE_CLIENT_ID_DEFAULT,
            "client_secret": settings.get("google_client_secret") or GOOGLE_CLIENT_SECRET_DEFAULT,
            "redirect_uri": settings.get("google_redirect_uri") or GOOGLE_REDIRECT_URI_DEFAULT,
            "frontend_url": settings.get("frontend_url") or FRONTEND_URL_DEFAULT
        }
    return {
        "client_id": GOOGLE_CLIENT_ID_DEFAULT,
        "client_secret": GOOGLE_CLIENT_SECRET_DEFAULT,
        "redirect_uri": GOOGLE_REDIRECT_URI_DEFAULT,
        "frontend_url": FRONTEND_URL_DEFAULT
    }

# ==================== MODELS ====================

class AppointmentCreate(BaseModel):
    contact_id: str
    title: str
    description: Optional[str] = ""
    start_datetime: str  # ISO format
    duration_minutes: int = 60
    invoice_id: Optional[str] = None  # Linked invoice/quote
    document_id: Optional[str] = None  # Attached document
    reminders: Optional[List[dict]] = None  # [{type: "email"|"sms", delay_minutes: 180}]

class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[str] = None
    duration_minutes: Optional[int] = None
    invoice_id: Optional[str] = None
    document_id: Optional[str] = None
    reminders: Optional[List[dict]] = None

class ReminderSettings(BaseModel):
    reminders: List[dict]  # [{name: "J-3", delay_minutes: 4320, email: true, sms: true}]

# ==================== GOOGLE AUTH ====================

@router.get("/auth/status")
async def get_google_auth_status(current_user: dict = Depends(get_current_user)):
    """Check if Google Calendar is connected"""
    settings = await db.settings.find_one({"type": "google_calendar_tokens"})
    if settings and settings.get('access_token'):
        return {
            "connected": True,
            "email": settings.get('google_email', 'Compte connecté')
        }
    return {"connected": False, "email": None}

@router.get("/auth/login")
async def google_auth_login(current_user: dict = Depends(get_current_user)):
    """Start Google OAuth flow"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth non configuré. Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env")
    
    # Build authorization URL
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent"
    }
    
    url = f"{auth_url}?" + "&".join([f"{k}={requests.utils.quote(str(v))}" for k, v in params.items()])
    return {"authorization_url": url}

@router.get("/auth/callback")
async def google_auth_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback"""
    # Construire l'URL de base pour les redirections
    redirect_base = FRONTEND_URL if FRONTEND_URL else ""
    
    if error:
        return RedirectResponse(f"{redirect_base}/admin/agenda?error={error}")
    
    if not code:
        return RedirectResponse(f"{redirect_base}/admin/agenda?error=no_code")
    
    try:
        # Exchange code for tokens
        token_resp = requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': GOOGLE_REDIRECT_URI,
            'grant_type': 'authorization_code'
        }).json()
        
        if 'error' in token_resp:
            logger.error(f"Token exchange error: {token_resp}")
            return RedirectResponse(f"{redirect_base}/admin/agenda?error={token_resp.get('error_description', token_resp['error'])}")
        
        # Get user info
        user_info = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {token_resp["access_token"]}'}
        ).json()
        
        # Save tokens
        await db.settings.update_one(
            {"type": "google_calendar_tokens"},
            {"$set": {
                "type": "google_calendar_tokens",
                "access_token": token_resp.get('access_token'),
                "refresh_token": token_resp.get('refresh_token'),
                "token_uri": "https://oauth2.googleapis.com/token",
                "google_email": user_info.get('email'),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        logger.info(f"Google Calendar connected for: {user_info.get('email')}")
        return RedirectResponse(f"{redirect_base}/admin/agenda?success=connected")
        
    except Exception as e:
        logger.error(f"Google auth callback error: {e}")
        return RedirectResponse(f"{redirect_base}/admin/agenda?error={str(e)}")

@router.post("/auth/disconnect")
async def google_auth_disconnect(current_user: dict = Depends(get_current_user)):
    """Disconnect Google Calendar"""
    await db.settings.delete_one({"type": "google_calendar_tokens"})
    return {"message": "Google Calendar déconnecté"}

async def get_google_credentials():
    """Get valid Google credentials, refreshing if needed"""
    settings = await db.settings.find_one({"type": "google_calendar_tokens"})
    if not settings or not settings.get('access_token'):
        logger.warning("No Google credentials found")
        return None
    
    creds = Credentials(
        token=settings['access_token'],
        refresh_token=settings.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET
    )
    
    # Try to refresh if we have a refresh token
    if settings.get('refresh_token'):
        try:
            creds.refresh(GoogleRequest())
            await db.settings.update_one(
                {"type": "google_calendar_tokens"},
                {"$set": {"access_token": creds.token}}
            )
            logger.info("Google credentials refreshed successfully")
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            # Continue with existing token, it might still work
    
    return creds

# ==================== APPOINTMENTS CRUD ====================

@router.get("")
async def list_appointments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List appointments from database"""
    query = {}
    
    if start_date:
        query["start_datetime"] = {"$gte": start_date}
    if end_date:
        if "start_datetime" in query:
            query["start_datetime"]["$lte"] = end_date
        else:
            query["start_datetime"] = {"$lte": end_date}
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("start_datetime", 1).to_list(500)
    
    # Enrich with contact info
    for apt in appointments:
        if apt.get('contact_id'):
            contact = await db.contacts.find_one({"id": apt['contact_id']}, {"_id": 0, "first_name": 1, "last_name": 1, "email": 1, "phone": 1})
            apt['contact'] = contact
        if apt.get('invoice_id'):
            invoice = await db.invoices.find_one({"id": apt['invoice_id']}, {"_id": 0, "invoice_number": 1, "quote_number": 1, "document_type": 1})
            apt['invoice'] = invoice
    
    return appointments

@router.get("/{appointment_id}")
async def get_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Get single appointment"""
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="RDV non trouvé")
    
    # Enrich
    if apt.get('contact_id'):
        apt['contact'] = await db.contacts.find_one({"id": apt['contact_id']}, {"_id": 0})
    if apt.get('invoice_id'):
        apt['invoice'] = await db.invoices.find_one({"id": apt['invoice_id']}, {"_id": 0})
    if apt.get('document_id'):
        apt['document'] = await db.documents.find_one({"id": apt['document_id']}, {"_id": 0})
    
    return apt

@router.post("")
async def create_appointment(
    data: AppointmentCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create appointment with Google Calendar event and Meet link"""
    
    # Get contact info
    contact = await db.contacts.find_one({"id": data.contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact non trouvé")
    
    # Parse datetime
    try:
        start_dt = datetime.fromisoformat(data.start_datetime.replace('Z', '+00:00'))
    except:
        raise HTTPException(status_code=400, detail="Format de date invalide")
    
    end_dt = start_dt + timedelta(minutes=data.duration_minutes)
    
    # Create appointment in DB first
    appointment_id = str(uuid.uuid4())
    appointment = {
        "id": appointment_id,
        "contact_id": data.contact_id,
        "title": data.title,
        "description": data.description or "",
        "start_datetime": start_dt.isoformat(),
        "end_datetime": end_dt.isoformat(),
        "duration_minutes": data.duration_minutes,
        "invoice_id": data.invoice_id,
        "document_id": data.document_id,
        "reminders": data.reminders or [],
        "google_event_id": None,
        "google_meet_link": None,
        "email_sent": False,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Try to create Google Calendar event with Meet
    creds = await get_google_credentials()
    logger.info(f"Google credentials available: {creds is not None}")
    
    if creds:
        try:
            service = build('calendar', 'v3', credentials=creds)
            logger.info("Google Calendar service built successfully")
            
            # Build event with Google Meet
            event_body = {
                'summary': data.title,
                'description': data.description or "",
                'start': {
                    'dateTime': start_dt.isoformat(),
                    'timeZone': 'Europe/Paris'
                },
                'end': {
                    'dateTime': end_dt.isoformat(),
                    'timeZone': 'Europe/Paris'
                },
                'attendees': [
                    {'email': contact.get('email')} if contact.get('email') else None
                ],
                'conferenceData': {
                    'createRequest': {
                        'requestId': appointment_id,
                        'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                    }
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': []
                }
            }
            
            # Remove None attendees
            event_body['attendees'] = [a for a in event_body['attendees'] if a]
            
            # Create event with Meet
            event = service.events().insert(
                calendarId='primary',
                body=event_body,
                conferenceDataVersion=1
            ).execute()
            
            appointment['google_event_id'] = event.get('id')
            appointment['google_meet_link'] = event.get('hangoutLink')
            
            logger.info(f"Created Google Calendar event: {event.get('id')} with Meet: {event.get('hangoutLink')}")
            
        except Exception as e:
            logger.error(f"Failed to create Google Calendar event: {e}")
            # Continue without Google Calendar - appointment still created locally
    
    await db.appointments.insert_one(appointment)
    
    # Schedule reminders in background
    if data.reminders:
        background_tasks.add_task(schedule_reminders, appointment_id, data.reminders)
    
    # Send confirmation email to admin
    background_tasks.add_task(send_admin_confirmation_email, appointment, contact)
    
    # Return without _id
    appointment.pop('_id', None)
    return appointment

async def send_admin_confirmation_email(appointment: dict, contact: dict):
    """Send confirmation email to admin when appointment is created"""
    try:
        # Get admin email - use leo.sperl@alphagency.fr or from Google auth
        settings = await db.settings.find_one({"type": "google_calendar_tokens"})
        admin_email = settings.get('google_email', 'leo.sperl@alphagency.fr') if settings else 'leo.sperl@alphagency.fr'
        
        # Format date
        start_dt = datetime.fromisoformat(appointment['start_datetime'].replace('Z', '+00:00'))
        date_str = start_dt.strftime('%d/%m/%Y')
        time_str = start_dt.strftime('%H:%M')
        day_name = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][start_dt.weekday()]
        
        client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
        meet_link = appointment.get('google_meet_link', '')
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">✅ Nouveau RDV créé</h2>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <h3 style="margin-top: 0; color: #333;">{appointment['title']}</h3>
                <p><strong>📆 Date :</strong> {day_name} {date_str}</p>
                <p><strong>🕐 Heure :</strong> {time_str}</p>
                <p><strong>⏱️ Durée :</strong> {appointment['duration_minutes']} minutes</p>
                <p><strong>👤 Client :</strong> {client_name}</p>
                {f'<p><strong>📧 Email client :</strong> {contact.get("email", "-")}</p>' if contact.get('email') else ''}
                {f'<p><strong>📱 Tél client :</strong> {contact.get("phone", "-")}</p>' if contact.get('phone') else ''}
            </div>
            
            {f'<p><strong>🎥 Lien Google Meet :</strong> <a href="{meet_link}">{meet_link}</a></p>' if meet_link else '<p style="color: #666;">⚠️ Pas de lien Meet généré</p>'}
            
            {f'<p><strong>📝 Description :</strong> {appointment.get("description", "-")}</p>' if appointment.get('description') else ''}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
                Ce RDV a été ajouté à votre Google Calendar.<br>
                Connectez-vous au CRM pour envoyer l'invitation au client.
            </p>
        </div>
        """
        
        response = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers={
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'sender': {'name': BREVO_SENDER_NAME, 'email': BREVO_SENDER_EMAIL},
                'to': [{'email': admin_email, 'name': 'Admin Alpha Agency'}],
                'subject': f"✅ RDV créé - {appointment['title']} - {day_name} {date_str} à {time_str} avec {client_name}",
                'htmlContent': html_content
            }
        )
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Admin confirmation email sent to {admin_email} for appointment {appointment['id']}")
        else:
            logger.error(f"Failed to send admin confirmation email: {response.text}")
            
    except Exception as e:
        logger.error(f"Error sending admin confirmation email: {e}")

@router.put("/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update appointment"""
    apt = await db.appointments.find_one({"id": appointment_id})
    if not apt:
        raise HTTPException(status_code=404, detail="RDV non trouvé")
    
    update_data = data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate end time if start or duration changed
    if 'start_datetime' in update_data or 'duration_minutes' in update_data:
        start = update_data.get('start_datetime', apt['start_datetime'])
        duration = update_data.get('duration_minutes', apt['duration_minutes'])
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        end_dt = start_dt + timedelta(minutes=duration)
        update_data['end_datetime'] = end_dt.isoformat()
    
    # Update Google Calendar if connected
    if apt.get('google_event_id'):
        creds = await get_google_credentials()
        if creds:
            try:
                service = build('calendar', 'v3', credentials=creds)
                
                event_update = {}
                if 'title' in update_data:
                    event_update['summary'] = update_data['title']
                if 'description' in update_data:
                    event_update['description'] = update_data['description']
                if 'start_datetime' in update_data:
                    event_update['start'] = {
                        'dateTime': update_data['start_datetime'],
                        'timeZone': 'Europe/Paris'
                    }
                if 'end_datetime' in update_data:
                    event_update['end'] = {
                        'dateTime': update_data['end_datetime'],
                        'timeZone': 'Europe/Paris'
                    }
                
                if event_update:
                    service.events().patch(
                        calendarId='primary',
                        eventId=apt['google_event_id'],
                        body=event_update
                    ).execute()
                    
            except Exception as e:
                logger.error(f"Failed to update Google Calendar event: {e}")
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    updated = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return updated

@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete appointment"""
    apt = await db.appointments.find_one({"id": appointment_id})
    if not apt:
        raise HTTPException(status_code=404, detail="RDV non trouvé")
    
    # Delete from Google Calendar
    if apt.get('google_event_id'):
        creds = await get_google_credentials()
        if creds:
            try:
                service = build('calendar', 'v3', credentials=creds)
                service.events().delete(
                    calendarId='primary',
                    eventId=apt['google_event_id']
                ).execute()
            except Exception as e:
                logger.error(f"Failed to delete Google Calendar event: {e}")
    
    # Delete scheduled reminders
    await db.scheduled_reminders.delete_many({"appointment_id": appointment_id})
    
    await db.appointments.delete_one({"id": appointment_id})
    return {"message": "RDV supprimé"}

# ==================== EMAIL INVITATION ====================

def generate_ics_content(apt: dict, contact: dict, organizer_email: str = "noreply@alphagency.fr") -> str:
    """Generate ICS calendar file content"""
    import base64
    
    # Parse dates
    start_dt = datetime.fromisoformat(apt['start_datetime'].replace('Z', '+00:00'))
    end_dt = datetime.fromisoformat(apt['end_datetime'].replace('Z', '+00:00'))
    
    # Format for ICS (YYYYMMDDTHHMMSSZ)
    start_ics = start_dt.strftime('%Y%m%dT%H%M%S')
    end_ics = end_dt.strftime('%Y%m%dT%H%M%S')
    now_ics = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    client_email = contact.get('email', '')
    
    # Build description
    description = apt.get('description', '')
    if apt.get('google_meet_link'):
        description += f"\\n\\nLien Google Meet: {apt['google_meet_link']}"
    
    # Escape special characters for ICS
    description = description.replace('\n', '\\n').replace(',', '\\,').replace(';', '\\;')
    title = apt['title'].replace(',', '\\,').replace(';', '\\;')
    
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Alpha Agency//CRM//FR
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{apt['id']}@alphagency.fr
DTSTAMP:{now_ics}
DTSTART;TZID=Europe/Paris:{start_ics}
DTEND;TZID=Europe/Paris:{end_ics}
SUMMARY:{title}
DESCRIPTION:{description}
ORGANIZER;CN=Alpha Agency:mailto:{organizer_email}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN={client_name}:mailto:{client_email}
{f'LOCATION:{apt["google_meet_link"]}' if apt.get('google_meet_link') else ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR"""
    
    return ics_content

@router.post("/{appointment_id}/send-invitation")
async def send_invitation_email(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Send invitation email to contact with ICS calendar attachment"""
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="RDV non trouvé")
    
    contact = await db.contacts.find_one({"id": apt['contact_id']}, {"_id": 0})
    if not contact or not contact.get('email'):
        raise HTTPException(status_code=400, detail="Contact sans email")
    
    # Get linked invoice/quote info
    invoice_info = ""
    if apt.get('invoice_id'):
        invoice = await db.invoices.find_one({"id": apt['invoice_id']}, {"_id": 0})
        if invoice:
            doc_num = invoice.get('invoice_number') or invoice.get('quote_number', '')
            invoice_info = f"<p><strong>Document associé :</strong> {doc_num}</p>"
    
    # Get document link
    document_info = ""
    if apt.get('document_id'):
        doc = await db.documents.find_one({"id": apt['document_id']}, {"_id": 0})
        if doc and doc.get('url'):
            document_info = f'<p><strong>Document joint :</strong> <a href="{doc["url"]}">{doc.get("name", "Document")}</a></p>'
    
    # Format date
    start_dt = datetime.fromisoformat(apt['start_datetime'].replace('Z', '+00:00'))
    date_str = start_dt.strftime('%d/%m/%Y')
    time_str = start_dt.strftime('%H:%M')
    day_name = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][start_dt.weekday()]
    
    # Meet link
    meet_link = apt.get('google_meet_link', '')
    meet_section = f'<p><strong>🎥 Lien Google Meet :</strong> <a href="{meet_link}">{meet_link}</a></p>' if meet_link else ""
    
    # Build email
    client_name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    
    # Generate ICS content
    ics_content = generate_ics_content(apt, contact, BREVO_SENDER_EMAIL)
    import base64
    ics_base64 = base64.b64encode(ics_content.encode('utf-8')).decode('utf-8')
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #CE0202;">📅 Invitation à un rendez-vous</h2>
        
        <p>Bonjour {client_name},</p>
        
        <p>Vous êtes invité(e) à un rendez-vous avec Alpha Agency.</p>
        
        <div style="background-color: #FFF0F5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">{apt['title']}</h3>
            <p><strong>📆 Date :</strong> {day_name} {date_str}</p>
            <p><strong>🕐 Heure :</strong> {time_str}</p>
            <p><strong>⏱️ Durée :</strong> {apt['duration_minutes']} minutes</p>
            {meet_section}
        </div>
        
        {f'<p>{apt["description"]}</p>' if apt.get('description') else ''}
        
        {invoice_info}
        {document_info}
        
        <p style="margin-top: 20px;">
            <strong>📎 Un fichier .ics est joint à cet email.</strong><br>
            <span style="color: #666;">Ouvrez-le pour ajouter ce rendez-vous à votre agenda (Google Calendar, Outlook, Apple Calendar...)</span>
        </p>
        
        <p>À très bientôt !</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
            Alpha Agency<br>
            {BREVO_SENDER_EMAIL}
        </p>
    </div>
    """
    
    # Send via Brevo with ICS attachment
    try:
        response = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers={
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'sender': {'name': BREVO_SENDER_NAME, 'email': BREVO_SENDER_EMAIL},
                'to': [{'email': contact['email'], 'name': client_name}],
                'subject': f"📅 RDV - {apt['title']} - {day_name} {date_str} à {time_str}",
                'htmlContent': html_content,
                'attachment': [
                    {
                        'content': ics_base64,
                        'name': f"rdv_{date_str.replace('/', '-')}.ics"
                    }
                ]
            }
        )
        
        if response.status_code in [200, 201, 202]:
            await db.appointments.update_one(
                {"id": appointment_id},
                {"$set": {"email_sent": True, "email_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"message": f"Invitation envoyée à {contact['email']} avec fichier calendrier"}
        else:
            logger.error(f"Brevo email error: {response.text}")
            raise HTTPException(status_code=500, detail=f"Erreur envoi email: {response.text}")
            
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SMS REMINDERS ====================

async def send_sms(phone: str, message: str):
    """Send SMS via Brevo"""
    if not phone:
        return False
    
    # Format phone number
    phone = phone.replace(' ', '').replace('.', '').replace('-', '')
    
    # Detect French overseas territories (DOM-TOM)
    # 0690, 0691 = Guadeloupe (+590)
    # 0694 = Martinique (+596)
    # 0693 = Guyane (+594)
    # 0692 = Réunion (+262)
    # 0639 = Mayotte (+262)
    
    if phone.startswith('0'):
        prefix = phone[:4]
        if prefix in ['0690', '0691']:
            # Guadeloupe
            phone = '+590' + phone[1:]
        elif prefix == '0694':
            # Martinique
            phone = '+596' + phone[1:]
        elif prefix == '0693':
            # Guyane
            phone = '+594' + phone[1:]
        elif prefix in ['0692', '0693']:
            # Réunion
            phone = '+262' + phone[1:]
        elif prefix == '0639':
            # Mayotte
            phone = '+262' + phone[1:]
        else:
            # France métropolitaine
            phone = '+33' + phone[1:]
    elif not phone.startswith('+'):
        phone = '+33' + phone
    
    logger.info(f"Sending SMS to: {phone}")
    
    try:
        response = requests.post(
            'https://api.brevo.com/v3/transactionalSMS/sms',
            headers={
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'sender': BREVO_SMS_SENDER,
                'recipient': phone,
                'content': message,
                'type': 'transactional'
            }
        )
        
        result = response.json()
        logger.info(f"SMS response: {result}")
        
        if response.status_code in [200, 201, 202] and result.get('usedCredits', 0) > 0:
            logger.info(f"SMS sent successfully to {phone}")
            return True
        else:
            logger.error(f"Brevo SMS error: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"SMS send error: {e}")
        return False

@router.post("/{appointment_id}/send-sms-reminder")
async def send_sms_reminder_manual(appointment_id: str, current_user: dict = Depends(get_current_user)):
    """Manually send SMS reminder"""
    apt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not apt:
        raise HTTPException(status_code=404, detail="RDV non trouvé")
    
    contact = await db.contacts.find_one({"id": apt['contact_id']}, {"_id": 0})
    if not contact or not contact.get('phone'):
        raise HTTPException(status_code=400, detail="Contact sans téléphone")
    
    # Format date
    start_dt = datetime.fromisoformat(apt['start_datetime'].replace('Z', '+00:00'))
    date_str = start_dt.strftime('%d/%m/%Y')
    time_str = start_dt.strftime('%H:%M')
    
    message = f"Rappel RDV Alpha Agency: {apt['title']} le {date_str} à {time_str}."
    if apt.get('google_meet_link'):
        message += f" Meet: {apt['google_meet_link']}"
    
    success = await send_sms(contact['phone'], message)
    
    if success:
        return {"message": f"SMS envoyé à {contact['phone']}"}
    else:
        raise HTTPException(status_code=500, detail="Erreur envoi SMS")

# ==================== REMINDER SCHEDULING ====================

async def schedule_reminders(appointment_id: str, reminders: List[dict]):
    """Schedule reminders for an appointment"""
    apt = await db.appointments.find_one({"id": appointment_id})
    if not apt:
        return
    
    start_str = apt['start_datetime']
    # Ensure timezone awareness
    if 'Z' in start_str:
        start_dt = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
    elif '+' in start_str or start_str.endswith('00'):
        start_dt = datetime.fromisoformat(start_str)
    else:
        # Assume UTC if no timezone
        start_dt = datetime.fromisoformat(start_str).replace(tzinfo=timezone.utc)
    
    now = datetime.now(timezone.utc)
    
    for reminder in reminders:
        delay_minutes = reminder.get('delay_minutes', 60)
        remind_at = start_dt - timedelta(minutes=delay_minutes)
        
        # Ensure remind_at is timezone aware for comparison
        if remind_at.tzinfo is None:
            remind_at = remind_at.replace(tzinfo=timezone.utc)
        
        # Don't schedule if in the past
        if remind_at < now:
            logger.info(f"Skipping past reminder for {appointment_id}: {remind_at}")
            continue
        
        reminder_doc = {
            "id": str(uuid.uuid4()),
            "appointment_id": appointment_id,
            "remind_at": remind_at.isoformat(),
            "send_email": reminder.get('email', False),
            "send_sms": reminder.get('sms', False),
            "sent": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.scheduled_reminders.insert_one(reminder_doc)
        logger.info(f"Scheduled reminder for {appointment_id} at {remind_at}")

@router.get("/reminders/pending")
async def get_pending_reminders(current_user: dict = Depends(get_current_user)):
    """Get pending reminders (for cron job or manual processing)"""
    now = datetime.now(timezone.utc).isoformat()
    
    reminders = await db.scheduled_reminders.find({
        "sent": False,
        "remind_at": {"$lte": now}
    }, {"_id": 0}).to_list(100)
    
    return reminders

@router.post("/reminders/process")
async def process_pending_reminders(current_user: dict = Depends(get_current_user)):
    """Process and send pending reminders"""
    now = datetime.now(timezone.utc).isoformat()
    
    reminders = await db.scheduled_reminders.find({
        "sent": False,
        "remind_at": {"$lte": now}
    }).to_list(100)
    
    results = []
    
    for reminder in reminders:
        apt = await db.appointments.find_one({"id": reminder['appointment_id']}, {"_id": 0})
        if not apt:
            continue
        
        contact = await db.contacts.find_one({"id": apt['contact_id']}, {"_id": 0})
        if not contact:
            continue
        
        # Send SMS if configured
        if reminder.get('send_sms') and contact.get('phone'):
            start_dt = datetime.fromisoformat(apt['start_datetime'].replace('Z', '+00:00'))
            message = f"Rappel: RDV {apt['title']} le {start_dt.strftime('%d/%m/%Y')} à {start_dt.strftime('%H:%M')}. Alpha Agency"
            await send_sms(contact['phone'], message)
            results.append({"type": "sms", "to": contact['phone']})
        
        # Mark as sent
        await db.scheduled_reminders.update_one(
            {"id": reminder['id']},
            {"$set": {"sent": True, "sent_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"processed": len(results), "results": results}

# ==================== REMINDER SETTINGS ====================

@router.get("/settings/reminders")
async def get_reminder_settings(current_user: dict = Depends(get_current_user)):
    """Get default reminder settings"""
    settings = await db.settings.find_one({"type": "appointment_reminders"}, {"_id": 0})
    if not settings:
        # Default settings
        return {
            "reminders": [
                {"name": "J-3", "delay_minutes": 4320, "email": True, "sms": False},
                {"name": "J-1", "delay_minutes": 1440, "email": True, "sms": True},
                {"name": "H-2", "delay_minutes": 120, "email": False, "sms": True},
                {"name": "H-0", "delay_minutes": 0, "email": False, "sms": True}
            ]
        }
    return settings

@router.put("/settings/reminders")
async def update_reminder_settings(data: ReminderSettings, current_user: dict = Depends(get_current_user)):
    """Update default reminder settings"""
    await db.settings.update_one(
        {"type": "appointment_reminders"},
        {"$set": {
            "type": "appointment_reminders",
            "reminders": data.reminders,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Paramètres de relance mis à jour"}

# ==================== SYNC WITH GOOGLE CALENDAR ====================

@router.post("/sync")
async def sync_with_google_calendar(current_user: dict = Depends(get_current_user)):
    """Sync appointments with Google Calendar"""
    creds = await get_google_credentials()
    if not creds:
        raise HTTPException(status_code=400, detail="Google Calendar non connecté")
    
    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Get events from Google Calendar
        now = datetime.now(timezone.utc).isoformat()
        events_result = service.events().list(
            calendarId='primary',
            timeMin=now,
            maxResults=100,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        return {
            "message": f"Synchronisé {len(events)} événements",
            "events": [{
                "id": e.get('id'),
                "title": e.get('summary'),
                "start": e.get('start', {}).get('dateTime'),
                "end": e.get('end', {}).get('dateTime'),
                "meet_link": e.get('hangoutLink')
            } for e in events]
        }
        
    except Exception as e:
        logger.error(f"Google Calendar sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
