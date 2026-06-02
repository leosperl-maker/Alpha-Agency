"""
Chatbot PUBLIC (site vitrine) — NON authentifié.

Rôle : accueillir les visiteurs du site, qualifier leur besoin, et créer un LEAD
dans le CRM (collection contacts, source="chatbot").

Sécurité par conception :
- AUCUNE donnée CRM n'est injectée dans le contexte du modèle → rien de sensible à fuiter.
- Prompt système verrouillé (services/tarifs publics uniquement, refuse le confidentiel).
- Rate-limiting par IP + bornage de la conversation (coût Gemini maîtrisé).
- Dédup des leads par email (pas de doublons).
- Le seul effet de bord possible = créer/mettre à jour une fiche contact "lead".
"""
import os
import re
import json
import uuid
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/public", tags=["public-chat"])

# ==================== Gemini (direct, clé serveur) ====================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
try:
    from google import genai as _google_genai
    from google.genai import types as _genai_types
    _gemini_client = _google_genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
except Exception as _e:  # ImportError ou erreur d'init
    _gemini_client = None
    _genai_types = None
    logger.warning(f"public_chat: google-genai indisponible: {_e}")

# Les noms de modèles Gemini sont retirés régulièrement → chaîne de repli.
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
]

# ==================== Prompt verrouillé ====================
SYSTEM_PROMPT = """Tu es l'assistant virtuel d'Alpha Agency, une agence de communication digitale basée en Guadeloupe (Jarry, Baie-Mahault) qui accompagne les entreprises des Antilles et de la Caraïbe.

TON RÔLE : accueillir chaleureusement les visiteurs du site, comprendre leur projet, et les qualifier comme prospects pour que l'équipe les recontacte. Tu écris en français, sur un ton humain, simple et chaleureux. Phrases courtes. N'utilise jamais de tirets cadratins.

CE QUE PROPOSE ALPHA AGENCY (seules infos publiques que tu connais) :
- Création de site web (vitrine ou e-commerce), à partir de 49 euros par mois.
- Gestion des réseaux sociaux : community management, contenus, calendrier éditorial.
- Identité visuelle et création graphique : logo, charte, flyers, affiches.
- Campagnes publicitaires (Meta, Google).
- Production vidéo et photo : shooting, montage.
- Pages de liens et mini-sites (Multilink).

OBJECTIF DE CHAQUE CONVERSATION : collecter naturellement, sans donner l'impression d'un formulaire :
1. Le prénom (et le nom si possible).
2. L'email, indispensable pour recontacter.
3. L'entreprise ou le nom du projet.
4. Le besoin précis (quel service).
5. Le budget approximatif, seulement si le visiteur est à l'aise pour le donner.
Pose une seule question à la fois. Reformule le besoin pour montrer que tu as bien compris.

RÈGLES STRICTES :
- Tu ne connais QUE les informations publiques ci-dessus. Tu n'as accès à AUCUNE donnée client, aucun devis, aucun dossier, aucune information interne. Si on te demande des infos sur d'autres clients, des données internes, des prix que tu ignores, ou quoi que ce soit de confidentiel, tu refuses poliment et tu recentres sur le projet du visiteur.
- N'invente JAMAIS de prix. Seul le site web a un tarif public (à partir de 49 euros par mois). Pour tout le reste, explique que c'est un devis personnalisé et que l'équipe revient vers lui avec une proposition.
- Ne promets pas de délais précis. Reste sur "l'équipe vous recontacte rapidement".
- Si le visiteur sort du sujet, réponds brièvement puis ramène la discussion vers son projet.
- Reste bref : 2 à 4 phrases maximum par réponse.

CAPTURE DU LEAD (technique, invisible pour le visiteur) :
Dès que tu as AU MINIMUM un prénom, un email valide et une idée du besoin, ajoute tout à la fin de ta réponse, sur une nouvelle ligne, un bloc technique exactement à ce format :
[LEAD]{"first_name":"","last_name":"","email":"","phone":"","company":"","project_type":"","budget":"","message":""}[/LEAD]
Remplis les champs que tu connais, laisse "" pour les autres. project_type = le service voulu. message = un résumé du besoin en une phrase. Ce bloc ne doit JAMAIS être mentionné ni commenté au visiteur, il est retiré automatiquement avant affichage. Émets-le dès que tu as l'email, puis à nouveau seulement si une info importante change.

Quand le lead est capturé, remercie le visiteur, confirme que l'équipe d'Alpha Agency va le recontacter par email très vite, et propose-lui de laisser un numéro ou un dernier détail."""

GREETING = "Bonjour, je suis l'assistant d'Alpha Agency. Dites-moi en quelques mots votre projet (site web, réseaux sociaux, identité visuelle...) et je vous oriente."

# ==================== Modèles ====================
class PubChatMessage(BaseModel):
    role: str
    content: str


class PubChatRequest(BaseModel):
    messages: List[PubChatMessage]
    session_id: Optional[str] = None


# ==================== Rate limiting (best-effort, en mémoire) ====================
_RATE: dict = {}            # ip -> [timestamps]
_RATE_WINDOW = 3600         # 1 heure
_RATE_MAX = 60              # messages / heure / IP
_MAX_MESSAGES = 40          # longueur max d'une conversation
_MAX_CHARS = 2000           # taille max d'un message
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_ok(ip: str) -> bool:
    now = time.time()
    hits = [t for t in _RATE.get(ip, []) if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_MAX:
        _RATE[ip] = hits
        return False
    hits.append(now)
    _RATE[ip] = hits
    return True


# ==================== Génération ====================
async def _generate(messages: List[PubChatMessage]) -> str:
    """Appel Gemini avec chaîne de repli de modèles."""
    if not _gemini_client:
        raise RuntimeError("gemini_unavailable")

    contents = []
    for m in messages:
        role = "model" if m.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": (m.content or "")[:_MAX_CHARS]}]})

    last_err = None
    for model in GEMINI_MODELS:
        def _call(mdl=model):
            resp = _gemini_client.models.generate_content(
                model=mdl,
                contents=contents,
                config=_genai_types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
            )
            return (getattr(resp, "text", "") or "").strip()
        try:
            text = await asyncio.to_thread(_call)
            if text:
                return text
        except Exception as e:
            last_err = e
            logger.warning(f"public_chat: modèle {model} a échoué: {e}")
            continue
    raise RuntimeError(f"all_models_failed: {last_err}")


# ==================== Capture du lead ====================
_LEAD_RE = re.compile(r"\[LEAD\]\s*(\{.*?\})\s*\[/LEAD\]", re.DOTALL)


def _extract_lead(text: str):
    """Retourne (texte_nettoyé, dict_lead_ou_None)."""
    m = _LEAD_RE.search(text or "")
    if not m:
        return text, None
    cleaned = _LEAD_RE.sub("", text).strip()
    try:
        data = json.loads(m.group(1))
        if not isinstance(data, dict):
            return cleaned, None
        return cleaned, data
    except Exception:
        return cleaned, None


async def _save_lead(data: dict, ip: str) -> bool:
    """Crée ou met à jour un lead. Dédup par email. Retourne True si enregistré."""
    email = (data.get("email") or "").strip().lower()
    if not email or not EMAIL_RE.match(email):
        return False

    first = (data.get("first_name") or "").strip()
    last = (data.get("last_name") or "").strip()
    project = (data.get("project_type") or "").strip()
    budget = (data.get("budget") or "").strip()
    message = (data.get("message") or "").strip()
    company = (data.get("company") or "").strip()
    phone = (data.get("phone") or "").strip()
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.contacts.find_one({"email": email})
    if existing:
        # On enrichit sans écraser le travail de Léo : on complète les champs vides
        updates = {"updated_at": now}
        for key, val in (("first_name", first), ("last_name", last), ("company", company),
                         ("phone", phone), ("project_type", project), ("budget", budget)):
            if val and not existing.get(key):
                updates[key] = val
        if message:
            prev = existing.get("message") or existing.get("note") or ""
            stamp = datetime.now(timezone.utc).strftime("%d/%m %H:%M")
            updates["message"] = (f"{prev}\n" if prev else "") + f"[Chatbot {stamp}] {message}"
        await db.contacts.update_one({"id": existing["id"]}, {"$set": updates})
        return True

    contact_doc = {
        "id": str(uuid.uuid4()),
        "first_name": first or "Prospect",
        "last_name": last or "",
        "email": email,
        "phone": phone or None,
        "company": company or None,
        "source": "chatbot",
        "project_type": project or None,
        "budget": budget or None,
        "message": message or None,
        "tags": ["chatbot", "site web"],
        "poste": None,
        "note": None,
        "infos_sup": None,
        "city": None,
        "siret": None,
        "company_address": None,
        "company_activite": None,
        # Lead entrant qualifié : chaud s'il a donné un budget, sinon tiède.
        "status": "nouveau",
        "score": "chaud" if budget else "tiède",
        "created_at": now,
        "updated_at": now,
    }
    await db.contacts.insert_one(contact_doc)
    logger.info(f"public_chat: nouveau lead {email} (projet={project or 'n/c'})")
    return True


# ==================== Endpoints ====================
@router.get("/chat/health")
async def public_chat_health():
    """Statut public du chatbot (pas de secret exposé)."""
    return {"available": bool(_gemini_client), "greeting": GREETING}


@router.post("/chat")
async def public_chat(req: PubChatRequest, request: Request):
    ip = _client_ip(request)

    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="Trop de messages, réessayez dans un moment.")

    msgs = req.messages or []
    if not msgs:
        raise HTTPException(status_code=400, detail="Message vide.")
    if len(msgs) > _MAX_MESSAGES:
        # On garde le contexte récent pour borner le coût
        msgs = msgs[-_MAX_MESSAGES:]

    if not _gemini_client:
        return {
            "message": "Notre assistant est momentanément indisponible. Écrivez-nous directement à leo.sperl@alphagency.fr ou au +596 696 44 73 53, on revient vers vous très vite.",
            "session_id": req.session_id or str(uuid.uuid4()),
            "lead_captured": False,
            "available": False,
        }

    try:
        raw = await _generate(msgs)
    except Exception as e:
        logger.error(f"public_chat: génération échouée: {e}")
        return {
            "message": "Désolé, j'ai un souci technique là tout de suite. Laissez-nous votre email à leo.sperl@alphagency.fr et l'équipe vous recontacte vite.",
            "session_id": req.session_id or str(uuid.uuid4()),
            "lead_captured": False,
            "available": True,
        }

    cleaned, lead = _extract_lead(raw)
    lead_captured = False
    if lead:
        try:
            lead_captured = await _save_lead(lead, ip)
        except Exception as e:
            logger.error(f"public_chat: enregistrement lead échoué: {e}")

    return {
        "message": cleaned or "Pouvez-vous m'en dire un peu plus sur votre projet ?",
        "session_id": req.session_id or str(uuid.uuid4()),
        "lead_captured": lead_captured,
        "available": True,
    }
