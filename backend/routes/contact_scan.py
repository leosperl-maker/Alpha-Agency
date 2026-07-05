"""
Scan de carte de visite / flyer / capture d'écran → fiche contact (Lot photo→contact).

POST /contacts/scan-card : reçoit une image (ou un PDF) en base64, la fait lire
par Gemini (vision) avec une extraction STRICTEMENT structurée, détecte les
doublons (email/téléphone), et — seulement si demandé — crée la fiche.

Par défaut on N'ÉCRIT RIEN : le front préremplit le formulaire contact avec les
champs extraits et Léo valide. (Leçon permanente : l'humain confirme.)
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import base64
import json
import uuid
import asyncio
import logging
import re

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contacts", tags=["Contact Scan"])

_PROMPT = """Tu lis une carte de visite, un flyer, une capture d'écran de fiche contact ou tout
document contenant les coordonnées d'UNE personne/entreprise. Extrais UNIQUEMENT ce qui est
écrit (n'invente jamais rien) et réponds en JSON STRICT, rien d'autre :
{"first_name": "", "last_name": "", "company": "", "poste": "", "email": "", "phone": "",
 "city": "", "website": "", "siret": "", "notes": ""}
Règles : téléphone au format international si l'indicatif est visible (Guadeloupe : +590…),
sinon tel quel. "notes" = les infos utiles restantes (services proposés, horaires, slogan…),
en une phrase. Champs absents = chaîne vide."""

_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"}


class ScanRequest(BaseModel):
    image_base64: str            # dataURL accepté ("data:image/jpeg;base64,....") ou base64 nu
    mime_type: Optional[str] = None
    create: bool = False         # true = créer directement la fiche (après anti-doublon)


def _decode_payload(req: ScanRequest) -> tuple[bytes, str]:
    raw = (req.image_base64 or "").strip()
    mime = (req.mime_type or "").strip().lower()
    m = re.match(r"^data:([\w/+.-]+);base64,(.*)$", raw, re.S)
    if m:
        mime = mime or m.group(1).lower()
        raw = m.group(2)
    try:
        blob = base64.b64decode(raw, validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Image illisible (base64 invalide).")
    if not blob or len(blob) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image vide ou trop lourde (max 15 Mo).")
    if mime not in _ALLOWED_MIME:
        mime = "application/pdf" if blob[:4] == b"%PDF" else "image/jpeg"
    return blob, mime


async def _extract_with_gemini(blob: bytes, mime: str) -> dict:
    """Extraction vision via la passerelle Gemini de Néo (chaîne de repli incluse)."""
    from . import neo_assistant as na
    if na._client is None or na._t is None:
        raise HTTPException(status_code=503, detail="Vision indisponible (GEMINI_API_KEY absente).")
    contents = [na._t.Content(role="user", parts=[
        na._t.Part.from_bytes(data=blob, mime_type=mime),
        na._t.Part.from_text(text=_PROMPT),
    ])]
    last_err = None
    for mdl in na.NEO_MODELS:
        def _call(_m=mdl):
            cfg = na._t.GenerateContentConfig(response_mime_type="application/json")
            return na._client.models.generate_content(model=_m, contents=contents, config=cfg)
        try:
            resp = await asyncio.to_thread(_call)
            text = (resp.text or "").strip()
            if text:
                data = json.loads(text)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            last_err = e
            continue
    raise HTTPException(status_code=502, detail=f"Extraction impossible : {str(last_err)[:120]}")


def _clean(fields: dict) -> dict:
    """Ne garde que les champs attendus, en chaînes propres."""
    keys = ("first_name", "last_name", "company", "poste", "email", "phone",
            "city", "website", "siret", "notes")
    out = {}
    for k in keys:
        v = fields.get(k)
        out[k] = str(v).strip() if v is not None else ""
    out["email"] = out["email"].lower()
    return out


async def _find_duplicate(fields: dict) -> dict | None:
    """Doublon = même email OU même téléphone (à chiffres identiques)."""
    email = fields.get("email")
    if email:
        doc = await db.contacts.find_one({"email": email}, {"_id": 0, "id": 1, "first_name": 1,
                                                            "last_name": 1, "company": 1})
        if doc:
            return doc
    phone_digits = re.sub(r"\D", "", fields.get("phone") or "")
    if len(phone_digits) >= 9:
        candidates = await db.contacts.find({"phone": {"$ne": None}},
                                            {"_id": 0, "id": 1, "first_name": 1, "last_name": 1,
                                             "company": 1, "phone": 1}).to_list(2000)
        for c in candidates:
            if re.sub(r"\D", "", c.get("phone") or "").endswith(phone_digits[-9:]):
                return {k: c.get(k) for k in ("id", "first_name", "last_name", "company")}
    return None


@router.post("/scan-card")
async def scan_card(req: ScanRequest, current_user: dict = Depends(get_current_user)):
    """Photo/scan → champs contact structurés (+ création optionnelle, anti-doublon)."""
    blob, mime = _decode_payload(req)
    fields = _clean(await _extract_with_gemini(blob, mime))

    if not any(fields[k] for k in ("first_name", "last_name", "company", "email", "phone")):
        return {"success": False, "fields": fields,
                "error": "Aucune coordonnée lisible sur ce document."}

    duplicate = await _find_duplicate(fields)
    created = None
    if req.create and not duplicate:
        now = datetime.now(timezone.utc).isoformat()
        doc = {"id": str(uuid.uuid4()),
               **{k: v for k, v in fields.items() if v and k != "notes"},
               "note": fields.get("notes") or "",
               "status": "nouveau", "source": "scan_carte",
               "created_at": now, "updated_at": now,
               "created_by": current_user.get("id") or current_user.get("email")}
        await db.contacts.insert_one(doc)
        created = doc["id"]
        try:
            from .neo_assistant import _log
            await _log("scan_card_created", {"contact_id": created, "company": fields.get("company")})
        except Exception:
            pass

    return {"success": True, "fields": fields, "duplicate": duplicate,
            "created_id": created,
            "message": ("Doublon probable : contact déjà existant." if duplicate
                        else ("Fiche créée." if created else "Champs extraits — à valider."))}
