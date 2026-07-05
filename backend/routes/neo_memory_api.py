"""
Mémoire de Néo consultable et corrigeable par Léo (Lot C de la refonte).

Néo écrit dans neo_memory via ses outils (remember, update_objective, log_day,
feedback → lessons). Ces endpoints donnent à Léo la main sur ce que Néo retient :
consulter, corriger, supprimer. C'est une exigence du brief « Jarvis » : la mémoire
ne doit jamais être une boîte noire.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/neo/memory", tags=["Neo Memory"])

MEM_TYPES = ("objective", "rule", "daily_log", "client_fact", "decision", "lesson")

TYPE_LABELS = {
    "objective": "Objectifs", "rule": "Règles", "lesson": "Leçons apprises",
    "client_fact": "Faits clients", "decision": "Décisions", "daily_log": "Journal",
}


class MemoryUpdate(BaseModel):
    content: str
    type: Optional[str] = None


@router.get("")
async def list_memory(type: Optional[str] = None, q: Optional[str] = None,
                      limit: int = 200, current_user: dict = Depends(get_current_user)):
    """Tout ce que Néo retient, du plus récent au plus ancien. Filtres : type, texte."""
    flt = {}
    if type and type in MEM_TYPES:
        flt["type"] = type
    rows = await db.neo_memory.find(flt, {"_id": 0}).to_list(2000)
    if q:
        needle = q.strip().lower()
        rows = [r for r in rows if needle in (r.get("content") or "").lower()
                or needle in (r.get("key") or "").lower()]
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    rows = rows[: max(1, min(limit, 500))]
    counts = {}
    for r in rows:
        counts[r.get("type") or "?"] = counts.get(r.get("type") or "?", 0) + 1
    return {"success": True, "count": len(rows), "counts": counts,
            "types": [{"key": k, "label": TYPE_LABELS[k]} for k in MEM_TYPES],
            "items": rows}


@router.put("/{mem_id}")
async def update_memory(mem_id: str, payload: MemoryUpdate,
                        current_user: dict = Depends(get_current_user)):
    """Corrige un souvenir (contenu, et type si fourni)."""
    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Contenu vide.")
    updates = {"content": content[:2000],
               "updated_at": datetime.now(timezone.utc).isoformat(),
               "corrected_by": current_user.get("id") or current_user.get("email")}
    if payload.type and payload.type in MEM_TYPES:
        updates["type"] = payload.type
    res = await db.neo_memory.update_one({"id": mem_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Souvenir introuvable.")
    return {"success": True, "message": "Souvenir corrigé."}


@router.delete("/{mem_id}")
async def delete_memory(mem_id: str, current_user: dict = Depends(get_current_user)):
    """Fait oublier UN souvenir précis à Néo (par id — jamais en masse)."""
    res = await db.neo_memory.delete_one({"id": mem_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Souvenir introuvable.")
    return {"success": True, "message": "Souvenir supprimé."}
