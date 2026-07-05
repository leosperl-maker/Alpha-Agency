"""
Réconciliation de la collection héritée `quotes` vers `invoices` (Lot C3).

Contexte : les VRAIS devis vivent dans `invoices` (document_type='devis') et
c'est là que la Facturation et Néo travaillent. Mais une collection `quotes`
héritée traîne encore (anciens endpoints + bot WhatsApp) — c'est la confusion
qui a causé l'incident de juin 2026 (suppression du mauvais document).

Principes NON NÉGOCIABLES ici :
  - AUCUNE suppression, jamais : la migration COPIE vers invoices et marque
    l'original (migrated_to_invoices). Réversible par construction.
  - dry_run par défaut : on voit exactement ce qui serait fait avant de le faire.
  - Idempotent : un doc déjà marqué migré n'est jamais re-migré.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import uuid
import logging

from .database import db, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quotes/legacy", tags=["Quotes Legacy"])

# Correspondance des statuts hérités → statuts Facturation
_STATUS_MAP = {
    "brouillon": "brouillon", "envoyé": "envoyée", "envoyée": "envoyée", "envoye": "envoyée",
    "accepté": "accepté", "accepte": "accepté", "refusé": "refusé", "refuse": "refusé",
}


def _peek(d: dict) -> dict:
    return {k: d.get(k) for k in ("id", "number", "quote_number", "status", "total",
                                  "client_name", "contact_id", "created_at",
                                  "migrated_to_invoices") if d.get(k) is not None}


@router.get("/audit")
async def audit_legacy_quotes(current_user: dict = Depends(get_current_user)):
    """État des lieux : combien de docs dans `quotes`, déjà migrés ou non, aperçu."""
    docs = await db.quotes.find({}, {"_id": 0}).to_list(2000)
    migrated = [d for d in docs if d.get("migrated_to_invoices")]
    pending = [d for d in docs if not d.get("migrated_to_invoices")]
    by_status = {}
    for d in pending:
        by_status[(d.get("status") or "?")] = by_status.get(d.get("status") or "?", 0) + 1
    devis_count = await db.invoices.count_documents({"document_type": "devis"})
    return {
        "success": True,
        "legacy_total": len(docs), "already_migrated": len(migrated),
        "to_migrate": len(pending), "by_status": by_status,
        "invoices_devis_count": devis_count,
        "preview": [_peek(d) for d in pending[:10]],
        "note": "La migration COPIE vers invoices (document_type=devis) sans jamais rien supprimer.",
    }


@router.post("/migrate")
async def migrate_legacy_quotes(dry_run: bool = True,
                                current_user: dict = Depends(get_current_user)):
    """Migre les docs de `quotes` vers `invoices`. dry_run=true (défaut) = simulation."""
    docs = await db.quotes.find({}, {"_id": 0}).to_list(2000)
    pending = [d for d in docs if not d.get("migrated_to_invoices")]
    now = datetime.now(timezone.utc).isoformat()
    plan, migrated = [], 0

    for q in pending:
        legacy_number = q.get("quote_number") or q.get("number")
        status = _STATUS_MAP.get((q.get("status") or "").lower(), "brouillon")
        new_id = str(uuid.uuid4())
        # Copie INTÉGRALE du doc hérité (aucune perte), puis surcharges Facturation.
        new_doc = {
            **{k: v for k, v in q.items() if k != "_id"},
            "id": new_id,
            "document_type": "devis",
            "status": status,
            "legacy_number": legacy_number,
            "migrated_from_quotes": q.get("id"),
            "migrated_at": now,
        }
        # Numéro : on garde un numéro DEV- existant, sinon numéro de migration
        # explicite (pas de collision possible avec la séquence DEV- normale).
        if isinstance(legacy_number, str) and legacy_number.startswith("DEV-"):
            new_doc["invoice_number"] = legacy_number
        else:
            new_doc["invoice_number"] = f"DEV-MIG-{(q.get('id') or new_id)[:8]}"

        plan.append({"legacy": _peek(q), "invoice_number": new_doc["invoice_number"], "status": status})
        if not dry_run:
            await db.invoices.insert_one(new_doc)
            await db.quotes.update_one(
                {"id": q.get("id")},
                {"$set": {"migrated_to_invoices": new_id, "migrated_at": now}})
            migrated += 1

    if not dry_run:
        logger.info(f"quotes_legacy: {migrated} devis hérités migrés vers invoices")
        try:
            from .neo_assistant import _log
            await _log("quotes_migration", {"migrated": migrated,
                                            "by": current_user.get("email") or current_user.get("id")})
        except Exception:
            pass

    return {"success": True, "dry_run": dry_run,
            "to_migrate": len(pending), "migrated": 0 if dry_run else migrated,
            "plan": plan[:50],
            "message": ("SIMULATION — rien n'a été écrit. Relance avec dry_run=false pour migrer."
                        if dry_run else f"{migrated} devis hérités copiés dans la Facturation (originaux conservés et marqués).")}
