"""
MoltBot Audio Transcription - Speech-to-Text using OpenAI Whisper
Supports audio/video transcription for WhatsApp voice messages and uploaded files
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import uuid
import tempfile
import logging
import httpx
from datetime import datetime, timezone

try:
    from emergentintegrations.llm.openai import OpenAISpeechToText
    EMERGENT_AVAILABLE = True
except ImportError:
    OpenAISpeechToText = None
    EMERGENT_AVAILABLE = False
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/audio", tags=["Audio Transcription"])
logger = logging.getLogger(__name__)

# API Key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# JWT Config for authentication
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')
JWT_ALGORITHM = "HS256"

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from routes.database import db

security = HTTPBearer(auto_error=False)

async def get_current_user_for_audio(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


class TranscriptionResult(BaseModel):
    success: bool
    text: Optional[str] = None
    duration: Optional[float] = None
    language: Optional[str] = None
    error: Optional[str] = None


class TranscribeURLRequest(BaseModel):
    url: str
    language: Optional[str] = "fr"


# Supported audio formats
SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'opus']


def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    if not filename:
        return ""
    return filename.split(".")[-1].lower() if "." in filename else ""


async def transcribe_audio_file(file_path: str, language: str = "fr") -> TranscriptionResult:
    """
    Transcribe an audio file using OpenAI Whisper
    Automatically converts unsupported formats (ogg/opus) to mp3
    """
    if not EMERGENT_LLM_KEY:
        return TranscriptionResult(
            success=False,
            error="Clé API non configurée"
        )
    
    converted_path = None
    try:
        # Check if format needs conversion (ogg/opus from WhatsApp)
        actual_path = file_path
        if file_path.endswith('.ogg') or file_path.endswith('.opus'):
            import subprocess
            converted_path = file_path.replace('.ogg', '.mp3').replace('.opus', '.mp3')
            if converted_path == file_path:
                converted_path = file_path + '.mp3'
            
            # Convert using ffmpeg
            result = subprocess.run(
                ['ffmpeg', '-y', '-i', file_path, '-acodec', 'libmp3lame', '-q:a', '2', converted_path],
                capture_output=True,
                timeout=30
            )
            
            if result.returncode == 0 and os.path.exists(converted_path):
                actual_path = converted_path
                logger.info(f"Converted audio from OGG to MP3: {converted_path}")
            else:
                logger.warning(f"FFmpeg conversion failed: {result.stderr.decode()}")
        
        # Initialize STT
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        # Open and transcribe file
        with open(actual_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="verbose_json",
                language=language,
                temperature=0.0
            )
        
        # Extract results
        text = response.text if hasattr(response, 'text') else str(response)
        duration = response.duration if hasattr(response, 'duration') else None
        detected_language = response.language if hasattr(response, 'language') else language
        
        return TranscriptionResult(
            success=True,
            text=text.strip(),
            duration=duration,
            language=detected_language
        )
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return TranscriptionResult(
            success=False,
            error=str(e)
        )
    finally:
        # Cleanup converted file
        if converted_path and os.path.exists(converted_path):
            try:
                os.unlink(converted_path)
            except:
                pass


@router.post("/transcribe")
async def transcribe_uploaded_audio(
    file: UploadFile = File(...),
    language: str = "fr",
    current_user: dict = Depends(get_current_user_for_audio)
) -> TranscriptionResult:
    """
    Transcribe an uploaded audio file
    Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
    Max file size: 25MB
    """
    temp_path = None
    try:
        # Check file extension
        ext = get_file_extension(file.filename or "audio.mp3")
        if ext not in SUPPORTED_FORMATS:
            raise HTTPException(
                status_code=400, 
                detail=f"Format non supporté. Formats acceptés: {', '.join(SUPPORTED_FORMATS)}"
            )
        
        # Check file size (25MB limit)
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 25MB)")
        
        # Save to temp file
        suffix = f".{ext}" if ext else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Transcribe
        result = await transcribe_audio_file(temp_path, language)
        
        # Log transcription
        if result.success:
            await db.transcriptions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": current_user.get("id"),
                "text": result.text,
                "duration": result.duration,
                "language": result.language,
                "source": "upload",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        return result
        
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@router.post("/transcribe-url")
async def transcribe_audio_from_url(
    request: TranscribeURLRequest,
    current_user: dict = Depends(get_current_user_for_audio)
) -> TranscriptionResult:
    """
    Transcribe audio from a URL (useful for WhatsApp voice messages)
    """
    temp_path = None
    try:
        # Download file
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(request.url)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Impossible de télécharger le fichier audio")
            
            content = response.content
            
            # Check file size
            if len(content) > 25 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 25MB)")
        
        # Determine file extension from URL or content type
        content_type = response.headers.get("content-type", "")
        if "ogg" in content_type or "opus" in content_type:
            ext = "ogg"
        elif "mp3" in content_type or "mpeg" in content_type:
            ext = "mp3"
        elif "wav" in content_type:
            ext = "wav"
        elif "m4a" in content_type or "mp4" in content_type:
            ext = "m4a"
        else:
            # Try to get from URL
            ext = get_file_extension(request.url) or "ogg"
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Transcribe
        result = await transcribe_audio_file(temp_path, request.language or "fr")
        
        # Log transcription
        if result.success:
            await db.transcriptions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": current_user.get("id"),
                "text": result.text,
                "duration": result.duration,
                "language": result.language,
                "source": "url",
                "source_url": request.url,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        return result
        
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@router.get("/history")
async def get_transcription_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user_for_audio)
) -> Dict[str, Any]:
    """
    Get transcription history for the current user
    """
    transcriptions = await db.transcriptions.find(
        {"user_id": current_user.get("id")},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "count": len(transcriptions),
        "transcriptions": transcriptions
    }


# Internal function for MoltBot to use
async def transcribe_for_moltbot(file_path: str = None, url: str = None, language: str = "fr") -> str:
    """
    Internal function for MoltBot to transcribe audio
    Returns just the text or empty string on failure
    """
    temp_path = None
    try:
        if url:
            # Download file
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return ""
                
                content = response.content
                content_type = response.headers.get("content-type", "")
                
                if "ogg" in content_type or "opus" in content_type:
                    ext = "ogg"
                else:
                    ext = "mp3"
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
                    temp_file.write(content)
                    temp_path = temp_file.name
                    file_path = temp_path
        
        if not file_path:
            return ""
        
        result = await transcribe_audio_file(file_path, language)
        return result.text if result.success else ""
        
    except Exception as e:
        logger.error(f"MoltBot transcription error: {str(e)}")
        return ""
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


# ===========================================
# VOICE-TO-CRM - Intelligent Entry Creation
# ===========================================

class VoiceToCRMRequest(BaseModel):
    audio_text: Optional[str] = None  # Pre-transcribed text
    language: Optional[str] = "fr"

class VoiceToCRMResult(BaseModel):
    success: bool
    action: Optional[str] = None  # contact, task, note, appointment, invoice
    entity_id: Optional[str] = None
    message: str
    transcription: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

async def analyze_voice_command(text: str) -> Dict[str, Any]:
    """
    Use AI to analyze voice command and determine what CRM entry to create.
    Returns: {action, data}
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        prompt = f"""Analyse cette commande vocale et détermine quelle action CRM effectuer.

Commande: "{text}"

Réponds UNIQUEMENT avec un JSON valide sans markdown, format:
{{
    "action": "contact" | "task" | "note" | "appointment" | "invoice" | "unknown",
    "confidence": 0.0 à 1.0,
    "data": {{
        // Pour contact: first_name, last_name, email, phone, company, notes
        // Pour task: title, priority (low/medium/high/urgent), due_date (ISO format ou null)
        // Pour note: title, content, tags (array)
        // Pour appointment: title, date (ISO), duration_minutes, attendees
        // Pour invoice: client_name, amount, description, type (devis/facture)
    }},
    "summary": "Description courte de l'action"
}}

Exemples:
- "Rappeler Jean Dupont demain" → task avec title "Rappeler Jean Dupont", due_date = demain
- "Nouveau contact Marie Martin de Acme Corp téléphone 0601020304" → contact
- "Note importante: le client veut une réduction de 10%" → note
- "RDV vendredi 15h avec le client Dupont" → appointment
- "Créer un devis de 2000€ pour Entreprise X" → invoice type devis

Analyse maintenant:"""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id="voice-to-crm",
            system_message="Tu es un assistant CRM intelligent qui analyse les commandes vocales."
        )
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON response
        import json
        import re
        
        # Clean response
        response_text = response.strip()
        if response_text.startswith("```"):
            response_text = re.sub(r'^```json?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)
        
        return json.loads(response_text)
    
    except Exception as e:
        logger.error(f"Voice analysis error: {e}")
        return {"action": "unknown", "confidence": 0, "data": {}, "summary": str(e)}


@router.post("/voice-to-crm")
async def voice_to_crm(
    request: VoiceToCRMRequest,
    current_user: dict = Depends(get_current_user_for_audio)
) -> VoiceToCRMResult:
    """
    Voice-to-CRM: Analyze text and intelligently create CRM entry.
    Supports: contacts, tasks, notes, appointments, invoices
    """
    user_id = current_user.get("id", "")
    
    # Get text from request body
    transcribed_text = request.audio_text
    language = request.language or "fr"
    
    if not transcribed_text:
        return VoiceToCRMResult(
            success=False,
            message="Aucun texte à analyser. Fournissez du texte via audio_text."
        )
    
    # Analyze command with AI
    analysis = await analyze_voice_command(transcribed_text)
    
    action = analysis.get("action", "unknown")
    data = analysis.get("data", {})
    summary = analysis.get("summary", "")
    confidence = analysis.get("confidence", 0)
    
    if action == "unknown" or confidence < 0.5:
        return VoiceToCRMResult(
            success=False,
            action="unknown",
            message=f"Commande non reconnue: {summary}",
            transcription=transcribed_text,
            details=analysis
        )
    
    # Step 3: Create CRM entry based on action
    entity_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    try:
        if action == "contact":
            contact = {
                "id": entity_id,
                "first_name": data.get("first_name", ""),
                "last_name": data.get("last_name", ""),
                "email": data.get("email", ""),
                "phone": data.get("phone", ""),
                "company": data.get("company", ""),
                "notes": data.get("notes", f"Créé par commande vocale: {transcribed_text}"),
                "status": "lead",
                "source": "voice_command",
                "created_at": now,
                "updated_at": now
            }
            await db.contacts.insert_one(contact)
            message = f"✅ Contact créé: {data.get('first_name', '')} {data.get('last_name', '')}"
        
        elif action == "task":
            task = {
                "id": entity_id,
                "title": data.get("title", transcribed_text[:100]),
                "description": f"Créé par commande vocale: {transcribed_text}",
                "status": "todo",
                "priority": data.get("priority", "medium"),
                "due_date": data.get("due_date"),
                "user_id": user_id,
                "source": "voice_command",
                "created_at": now,
                "updated_at": now
            }
            await db.tasks.insert_one(task)
            message = f"✅ Tâche créée: {task['title']}"
        
        elif action == "note":
            note = {
                "id": entity_id,
                "title": data.get("title", "Note vocale"),
                "content": data.get("content", transcribed_text),
                "tags": data.get("tags", ["vocal"]),
                "user_id": user_id,
                "source": "voice_command",
                "created_at": now
            }
            await db.notes.insert_one(note)
            message = f"✅ Note créée: {note['title']}"
        
        elif action == "appointment":
            appointment = {
                "id": entity_id,
                "title": data.get("title", "RDV"),
                "start_time": data.get("date", now),
                "duration_minutes": data.get("duration_minutes", 60),
                "attendees": data.get("attendees", []),
                "description": f"Créé par commande vocale: {transcribed_text}",
                "user_id": user_id,
                "source": "voice_command",
                "created_at": now
            }
            await db.appointments.insert_one(appointment)
            message = f"✅ RDV créé: {appointment['title']}"
        
        elif action == "invoice":
            inv_type = data.get("type", "devis")
            count = await db.invoices.count_documents({"type": inv_type})
            year = datetime.now().year
            prefix = "DEV" if inv_type == "devis" else "FAC"
            number = f"{prefix}-{year}-{str(count + 1).zfill(3)}"
            
            amount = float(data.get("amount", 0))
            invoice = {
                "id": entity_id,
                "number": number,
                "type": inv_type,
                "client_name": data.get("client_name", "Client"),
                "items": [{"description": data.get("description", "Prestation"), "quantity": 1, "unit_price": amount}],
                "subtotal": amount,
                "tax": amount * 0.20,
                "total": amount * 1.20,
                "status": "draft",
                "notes": f"Créé par commande vocale: {transcribed_text}",
                "source": "voice_command",
                "created_at": now,
                "updated_at": now
            }
            await db.invoices.insert_one(invoice)
            message = f"✅ {inv_type.capitalize()} créé: {number} - {amount}€"
        
        else:
            return VoiceToCRMResult(
                success=False,
                action=action,
                message=f"Action '{action}' non implémentée",
                transcription=transcribed_text,
                details=analysis
            )
        
        # Log the voice command
        await db.voice_commands.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "transcription": transcribed_text,
            "action": action,
            "entity_id": entity_id,
            "confidence": confidence,
            "created_at": now
        })
        
        return VoiceToCRMResult(
            success=True,
            action=action,
            entity_id=entity_id,
            message=message,
            transcription=transcribed_text,
            details={"summary": summary, "confidence": confidence, "data": data}
        )
    
    except Exception as e:
        logger.error(f"Voice-to-CRM error: {e}")
        return VoiceToCRMResult(
            success=False,
            action=action,
            message=f"Erreur: {str(e)}",
            transcription=transcribed_text,
            details=analysis
        )


@router.get("/voice-commands")
async def get_voice_command_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user_for_audio)
) -> Dict[str, Any]:
    """Get voice command history"""
    commands = await db.voice_commands.find(
        {"user_id": current_user.get("id")},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"count": len(commands), "commands": commands}

