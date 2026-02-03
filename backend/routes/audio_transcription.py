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

from emergentintegrations.llm.openai import OpenAISpeechToText
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
    """
    if not EMERGENT_LLM_KEY:
        return TranscriptionResult(
            success=False,
            error="Clé API non configurée"
        )
    
    try:
        # Initialize STT
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        
        # Open and transcribe file
        with open(file_path, "rb") as audio_file:
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
