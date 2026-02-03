"""
MoltBot Document Intelligence - AI-powered document analysis and classification
Uses Gemini for OCR, content analysis, and automatic categorization
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import uuid
import tempfile
import logging
import json
import base64
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from dotenv import load_dotenv
from .database import db

load_dotenv()

router = APIRouter(prefix="/moltbot/documents", tags=["MoltBot Document Intelligence"])
logger = logging.getLogger(__name__)

# API Key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# JWT Config for authentication
JWT_SECRET = os.environ.get('JWT_SECRET', 'alpha-agency-secret-key-2024')
JWT_ALGORITHM = "HS256"

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer(auto_error=False)

async def get_current_user_for_docs(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

# Document categories for classification
DOCUMENT_CATEGORIES = {
    "facture": "Factures",
    "devis": "Devis",
    "contrat": "Contrats",
    "bon_commande": "Bons de commande",
    "releve": "Relevés bancaires",
    "attestation": "Attestations",
    "identite": "Pièces d'identité",
    "courrier": "Courriers",
    "rapport": "Rapports",
    "presentation": "Présentations",
    "photo": "Photos",
    "marketing": "Marketing",
    "technique": "Documents techniques",
    "rh": "Ressources humaines",
    "juridique": "Documents juridiques",
    "autre": "Autres"
}

class DocumentAnalysisResult(BaseModel):
    success: bool
    document_type: Optional[str] = None
    document_category: Optional[str] = None
    suggested_name: Optional[str] = None
    suggested_folder: Optional[str] = None
    extracted_info: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    summary: Optional[str] = None
    error: Optional[str] = None

class BatchAnalysisRequest(BaseModel):
    document_ids: List[str]

class AutoClassifyRequest(BaseModel):
    document_id: str
    apply_changes: bool = False

class ClassificationSuggestion(BaseModel):
    document_id: str
    original_name: str
    suggested_name: str
    suggested_folder: str
    document_type: str
    confidence: float
    summary: str

async def analyze_document_with_ai(file_path: str, filename: str, mime_type: str) -> DocumentAnalysisResult:
    """
    Analyze a document using Gemini AI for OCR and classification
    """
    if not EMERGENT_LLM_KEY:
        return DocumentAnalysisResult(
            success=False,
            error="Clé API non configurée"
        )
    
    try:
        # Initialize chat with Gemini (supports file analysis)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"doc-analysis-{uuid.uuid4()}",
            system_message="""Tu es MoltBot, un assistant intelligent spécialisé dans l'analyse de documents.
            
Ton rôle est d'analyser les documents fournis et de retourner un JSON structuré avec:
1. Le type de document (facture, devis, contrat, photo, etc.)
2. Un nom de fichier suggéré basé sur le contenu (format: Type_NomEntité_Date.ext)
3. Le dossier de classement approprié
4. Les informations clés extraites
5. Un bref résumé du contenu

IMPORTANT: Retourne UNIQUEMENT un JSON valide, sans texte avant ou après."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Create file content for analysis
        file_content = FileContentWithMimeType(
            file_path=file_path,
            mime_type=mime_type
        )
        
        # Build analysis prompt
        analysis_prompt = f"""Analyse ce document nommé "{filename}" et retourne un JSON avec cette structure exacte:

{{
    "document_type": "facture|devis|contrat|bon_commande|releve|attestation|identite|courrier|rapport|presentation|photo|marketing|technique|rh|juridique|autre",
    "suggested_name": "NomSuggéré_Entité_Date.extension",
    "suggested_folder": "Factures|Devis|Contrats|Photos|Marketing|...",
    "confidence": 0.0 à 1.0,
    "extracted_info": {{
        "entite": "nom de l'entreprise/personne si visible",
        "date": "date du document si visible (YYYY-MM-DD)",
        "montant": "montant si applicable",
        "numero": "numéro de document si applicable",
        "objet": "objet/sujet principal"
    }},
    "summary": "Résumé bref du document en 1-2 phrases"
}}

Règles pour le nom suggéré:
- Format: Type_Entité_Date.extension (ex: Facture_Apple_2024-01.pdf)
- Si pas de date visible, utilise la date du jour
- Si pas d'entité visible, utilise "Inconnu"
- Garde l'extension originale du fichier

Retourne UNIQUEMENT le JSON, sans markdown ni texte supplémentaire."""

        # Send message with file
        response = await chat.send_message(UserMessage(
            text=analysis_prompt,
            file_contents=[file_content]
        ))
        
        # Parse JSON response
        try:
            # Clean response if needed (remove markdown code blocks)
            cleaned_response = response.strip()
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response.split("```")[1]
                if cleaned_response.startswith("json"):
                    cleaned_response = cleaned_response[4:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            
            result = json.loads(cleaned_response.strip())
            
            return DocumentAnalysisResult(
                success=True,
                document_type=result.get("document_type", "autre"),
                document_category=DOCUMENT_CATEGORIES.get(result.get("document_type", "autre"), "Autres"),
                suggested_name=result.get("suggested_name"),
                suggested_folder=result.get("suggested_folder"),
                extracted_info=result.get("extracted_info"),
                confidence=result.get("confidence", 0.5),
                summary=result.get("summary")
            )
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}, response: {response[:500]}")
            return DocumentAnalysisResult(
                success=False,
                error=f"Erreur d'analyse du résultat: {str(e)}"
            )
            
    except Exception as e:
        logger.error(f"Document analysis error: {str(e)}")
        return DocumentAnalysisResult(
            success=False,
            error=str(e)
        )


@router.post("/analyze")
async def analyze_uploaded_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_for_docs)
) -> DocumentAnalysisResult:
    """
    Analyze an uploaded document with AI
    Returns classification suggestions, extracted info, and recommended file name
    """
    # Save file temporarily
    temp_path = None
    try:
        # Determine mime type
        content_type = file.content_type or "application/octet-stream"
        
        # Check if file type is supported
        supported_types = [
            "application/pdf",
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
            "text/plain", "text/csv",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ]
        
        # Create temp file
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".tmp"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Analyze document
        result = await analyze_document_with_ai(
            file_path=temp_path,
            filename=file.filename or "document",
            mime_type=content_type
        )
        
        return result
        
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@router.post("/analyze/{document_id}")
async def analyze_existing_document(
    document_id: str,
    current_user: dict = Depends(get_current_user_for_docs)
) -> DocumentAnalysisResult:
    """
    Analyze an existing document from the file manager
    """
    # Get document from database
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Get file URL
    url = document.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Document sans URL")
    
    temp_path = None
    try:
        import httpx
        
        # Download file to temp location
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Impossible de télécharger le document")
            
            suffix = os.path.splitext(document.get("name", ""))[1] or ".tmp"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(response.content)
                temp_path = temp_file.name
        
        # Analyze
        result = await analyze_document_with_ai(
            file_path=temp_path,
            filename=document.get("name", "document"),
            mime_type=document.get("content_type", "application/octet-stream")
        )
        
        # Store analysis result in document
        if result.success:
            await db.documents.update_one(
                {"id": document_id},
                {"$set": {
                    "ai_analysis": {
                        "document_type": result.document_type,
                        "suggested_name": result.suggested_name,
                        "suggested_folder": result.suggested_folder,
                        "extracted_info": result.extracted_info,
                        "confidence": result.confidence,
                        "summary": result.summary,
                        "analyzed_at": datetime.now(timezone.utc).isoformat()
                    }
                }}
            )
        
        return result
        
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@router.post("/batch-analyze")
async def batch_analyze_documents(
    request: BatchAnalysisRequest,
    current_user: dict = Depends(get_current_user_for_docs)
) -> Dict[str, Any]:
    """
    Analyze multiple documents in batch
    """
    results = []
    
    for doc_id in request.document_ids[:10]:  # Limit to 10 documents
        try:
            result = await analyze_existing_document(doc_id, current_user)
            results.append({
                "document_id": doc_id,
                "success": result.success,
                "suggested_name": result.suggested_name,
                "suggested_folder": result.suggested_folder,
                "document_type": result.document_type,
                "confidence": result.confidence,
                "error": result.error
            })
        except Exception as e:
            results.append({
                "document_id": doc_id,
                "success": False,
                "error": str(e)
            })
    
    return {
        "analyzed": len(results),
        "results": results
    }


@router.post("/auto-classify/{document_id}")
async def auto_classify_document(
    document_id: str,
    apply_changes: bool = False,
    current_user: dict = Depends(get_current_user_for_docs)
) -> Dict[str, Any]:
    """
    Automatically classify and optionally rename/move a document
    """
    # Get document
    document = await db.documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Check if already analyzed
    analysis = document.get("ai_analysis")
    if not analysis:
        # Analyze first
        result = await analyze_existing_document(document_id, current_user)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error or "Échec de l'analyse")
        analysis = {
            "suggested_name": result.suggested_name,
            "suggested_folder": result.suggested_folder,
            "document_type": result.document_type,
            "confidence": result.confidence
        }
    
    response = {
        "document_id": document_id,
        "original_name": document.get("name"),
        "suggested_name": analysis.get("suggested_name"),
        "suggested_folder": analysis.get("suggested_folder"),
        "document_type": analysis.get("document_type"),
        "confidence": analysis.get("confidence"),
        "changes_applied": False
    }
    
    if apply_changes:
        # Find or create target folder
        target_folder_name = analysis.get("suggested_folder", "Autres")
        target_folder = await db.folders.find_one({"name": target_folder_name}, {"_id": 0})
        
        if not target_folder:
            # Create folder
            folder_id = str(uuid.uuid4())
            await db.folders.insert_one({
                "id": folder_id,
                "name": target_folder_name,
                "parent_id": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.get("email")
            })
            target_folder = {"id": folder_id, "name": target_folder_name}
        
        # Update document
        updates = {
            "folder_id": target_folder.get("id"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Only rename if suggested name is different
        if analysis.get("suggested_name") and analysis.get("suggested_name") != document.get("name"):
            updates["name"] = analysis.get("suggested_name")
        
        await db.documents.update_one(
            {"id": document_id},
            {"$set": updates}
        )
        
        response["changes_applied"] = True
        response["new_name"] = updates.get("name", document.get("name"))
        response["new_folder_id"] = target_folder.get("id")
        response["new_folder_name"] = target_folder.get("name")
    
    return response


@router.get("/suggestions")
async def get_classification_suggestions(
    current_user: dict = Depends(get_current_user_for_docs)
) -> Dict[str, Any]:
    """
    Get classification suggestions for unclassified documents
    """
    # Find documents without AI analysis or in root folder
    unclassified = await db.documents.find(
        {"$or": [
            {"ai_analysis": {"$exists": False}},
            {"folder_id": None}
        ]},
        {"_id": 0}
    ).limit(20).to_list(20)
    
    suggestions = []
    for doc in unclassified:
        analysis = doc.get("ai_analysis")
        if analysis:
            suggestions.append({
                "document_id": doc.get("id"),
                "original_name": doc.get("name"),
                "suggested_name": analysis.get("suggested_name"),
                "suggested_folder": analysis.get("suggested_folder"),
                "document_type": analysis.get("document_type"),
                "confidence": analysis.get("confidence", 0),
                "summary": analysis.get("summary")
            })
        else:
            suggestions.append({
                "document_id": doc.get("id"),
                "original_name": doc.get("name"),
                "needs_analysis": True
            })
    
    return {
        "count": len(suggestions),
        "suggestions": suggestions
    }


@router.post("/apply-suggestions")
async def apply_classification_suggestions(
    document_ids: List[str],
    current_user: dict = Depends(get_current_user_for_docs)
) -> Dict[str, Any]:
    """
    Apply classification suggestions to multiple documents
    """
    applied = []
    errors = []
    
    for doc_id in document_ids[:20]:
        try:
            result = await auto_classify_document(doc_id, apply_changes=True, current_user=current_user)
            if result.get("changes_applied"):
                applied.append({
                    "document_id": doc_id,
                    "new_name": result.get("new_name"),
                    "new_folder": result.get("new_folder_name")
                })
        except Exception as e:
            errors.append({
                "document_id": doc_id,
                "error": str(e)
            })
    
    return {
        "applied": len(applied),
        "errors": len(errors),
        "results": applied,
        "error_details": errors
    }


@router.get("/categories")
async def get_document_categories(
    current_user: dict = Depends(get_current_user_for_docs)
) -> Dict[str, Any]:
    """
    Get available document categories
    """
    return {
        "categories": DOCUMENT_CATEGORIES,
        "count": len(DOCUMENT_CATEGORIES)
    }
