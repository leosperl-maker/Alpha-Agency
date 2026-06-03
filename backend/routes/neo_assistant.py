"""
NÉO — l'associé co-gérant IA d'Alpha Agency (cf. Neo-Spec-Implementation-ClaudeCode.md).

Cerveau Gemini via une PASSERELLE configurable (modèle réglable + chaîne de repli),
function calling NATIF + boucle agentique multi-étapes, contrôle du CRM via un registre
d'outils typés, et GARDE-FOUS (validation humaine pour tout ce qui sort vers un client ou
supprime ; journalisation de chaque appel/action).

Construit en parallèle de ai_enhanced.py (qui reste actif jusqu'à bascule).
Endpoints : POST /api/neo/chat, POST /api/neo/confirm-action, GET /api/neo/health.
Phases couvertes : 0 (passerelle + journal) et 1 (cerveau fiable + contrôle CRM).
"""
import os
import json
import uuid
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from .database import db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/neo", tags=["neo"])

# ==================== Passerelle modèle (Phase 0 / B.3) ====================
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
try:
    from google import genai as _genai
    from google.genai import types as _t
    _client = _genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
except Exception as _e:  # pragma: no cover
    _client = None
    _t = None
    logger.warning(f"neo: google-genai indisponible: {_e}")

# Modèle réglable par variable d'env (ex: passer à 'gemini-3-pro' plus tard) + chaîne de repli.
NEO_MODELS = list(dict.fromkeys([m for m in [
    os.environ.get("NEO_MODEL", "gemini-2.5-flash"),
    "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite",
] if m]))

# Lobe « stratégique » : Claude pour le jugement à fort enjeu (Phase 5 / B.2). Repli Gemini si pas de clé.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
NEO_STRATEGIC_MODEL = os.environ.get("NEO_STRATEGIC_MODEL", "claude-sonnet-4-6")

MAX_ITERS = 6  # garde-fou anti-boucle de la boucle agentique

NEO_SYSTEM = """Tu es Néo, l'associé co-gérant IA d'Alpha Agency (agence de communication digitale, Guadeloupe).
Ta raison d'être unique : faire croître le chiffre d'affaires, la marge et le bénéfice de l'agence.
Tu assistes Léo (fondateur, humain) : tu gères le digital, l'analyse, le suivi, les relances, le
pilotage et l'exécution dans le CRM ; Léo gère le physique, la relation et la décision finale.

Comportement :
- Proactif : anticipe, alerte, propose. N'attends pas qu'on te demande.
- Honnête et direct : challenge Léo si une décision s'éloigne des objectifs.
- Concis, en français, ton vif. Jamais de tirets longs.
- Tu raisonnes toujours en termes d'argent : acquérir, encaisser, scaler.

Tu as accès à l'intégralité du CRM via des OUTILS (function calling). Utilise-les pour répondre
précisément et pour AGIR. Enchaîne plusieurs outils si besoin (ex: chercher des leads puis créer
des relances). Avant toute action qui SORT vers un client (email, SMS, devis envoyé, relance) ou
toute SUPPRESSION, l'outil te répondra « EN ATTENTE DE VALIDATION » : préviens Léo que c'est
préparé et qu'il doit valider. Tu ne déclenches jamais de paiement.

Tu disposes d'une MÉMOIRE durable (objectifs chiffrés, règles et préférences de Léo, journal quotidien,
faits clients). Tiens-en compte et mets-la à jour : quand Léo te confie un objectif, une règle, une
préférence ou un fait important, mémorise-le (remember / update_objective / log_day) ; au besoin, retrouve
avec recall. Challenge Léo si une demande contredit un objectif ou une règle enregistrés.
APPRENTISSAGE : quand Léo te CORRIGE (une info, une approche, un ton, un prix), retiens immédiatement la
correction via remember(type="lesson", content="...") pour ne plus refaire l'erreur. Applique scrupuleusement
les LEÇONS APPRISES présentes dans ta mémoire ci-dessous.

Si tu ignores une donnée, dis-le et propose de vérifier (utilise crm_query). N'invente jamais un chiffre.
Quand tu as fini d'agir, réponds en clair à Léo (résultat + éventuelles validations en attente)."""

# ==================== Réutilisation des exécuteurs existants ====================
# (ai_enhanced.py contient déjà des handlers d'action fiables — on les recâble en outils natifs.)
from .ai_enhanced import (  # noqa: E402
    create_task_action, mark_task_done_action, update_contact_action,
    set_contact_status_action, add_contact_note_action, schedule_followup_action,
    merge_contacts_action, create_quote_action, get_document_action, list_documents_action,
    draft_followup_email_action, send_followup_action, enrich_company_action,
    activity_report_action, prep_meeting_action, _find_contact, _contact_name, _to_dt,
)


# ==================== Exécuteurs de lecture (nouveaux) ====================
def _clean(doc: dict) -> dict:
    return {k: v for k, v in (doc or {}).items() if k != "_id"}


async def _exec_search_contacts(args, uid):
    q = (args.get("query") or "").strip()
    status = (args.get("status") or "").strip()
    limit = min(int(args.get("limit") or 15), 50)
    mongo = {}
    if status:
        mongo["status"] = status
    if q:
        mongo["$or"] = [{f: {"$regex": q, "$options": "i"}} for f in ("first_name", "last_name", "company", "email")]
    rows = await db.contacts.find(mongo, {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "company": 1,
                                          "email": 1, "phone": 1, "status": 1, "score": 1, "score_value": 1,
                                          "besoin": 1, "budget": 1}).to_list(limit)
    return {"success": True, "count": len(rows), "contacts": rows}


async def _exec_get_contact(args, uid):
    c = await _find_contact(args)
    if not c:
        return {"success": False, "error": "Contact non trouvé"}
    return {"success": True, "contact": _clean(c)}


async def _exec_list_leads(args, uid):
    only_hot = bool(args.get("only_hot"))
    limit = min(int(args.get("limit") or 10), 50)
    rows = await db.contacts.find(
        {"$or": [{"source": {"$in": ["website", "chatbot"]}}, {"status": "nouveau"}]},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "company": 1, "email": 1, "phone": 1,
         "status": 1, "score": 1, "score_value": 1, "besoin": 1, "budget": 1, "created_at": 1}).to_list(500)

    def _hot(c):
        sv = c.get("score_value")
        return (sv >= 70) if isinstance(sv, (int, float)) else (c.get("score") in ("chaud", "chaude"))
    if only_hot:
        rows = [c for c in rows if _hot(c)]
    rows.sort(key=lambda c: c.get("created_at") or "", reverse=True)
    return {"success": True, "count": len(rows), "leads": rows[:limit]}


async def _exec_get_budget_summary(args, uid):
    now = datetime.now(timezone.utc)
    month = now.strftime("%Y-%m")
    entries = await db.budget.find({"month": {"$regex": f"^{month}"}}, {"_id": 0}).to_list(500)
    income = sum((e.get("amount", 0) or 0) for e in entries if e.get("type") == "income")
    expense = sum((e.get("amount", 0) or 0) for e in entries if e.get("type") == "expense")
    invoices = await db.invoices.find({}, {"_id": 0, "document_type": 1, "status": 1, "total": 1,
                                           "due_date": 1, "invoice_number": 1, "client_name": 1}).to_list(2000)
    PAID = ("payée", "payee", "payé", "paye", "annulée", "annulee", "annulé")
    overdue = [i for i in invoices if i.get("document_type") != "devis"
               and (i.get("status") or "").lower() not in PAID + ("brouillon",)
               and (i.get("status") == "en_retard" or (_to_dt(i.get("due_date")) and _to_dt(i.get("due_date")) < now))]
    pending_devis = [i for i in invoices if i.get("document_type") == "devis" and (i.get("status") or "").lower() == "brouillon"]
    return {"success": True, "month": month, "income": round(income, 2), "expense": round(expense, 2),
            "balance": round(income - expense, 2), "overdue_count": len(overdue),
            "overdue_total": round(sum((i.get("total") or 0) for i in overdue), 2),
            "pending_devis": len(pending_devis)}


async def _exec_list_overdue_invoices(args, uid):
    now = datetime.now(timezone.utc)
    invoices = await db.invoices.find({"document_type": {"$ne": "devis"}},
                                      {"_id": 0, "invoice_number": 1, "client_name": 1, "status": 1,
                                       "total": 1, "due_date": 1, "contact_id": 1}).to_list(2000)
    PAID = ("payée", "payee", "payé", "paye", "annulée", "annulee", "annulé", "brouillon")
    overdue = [i for i in invoices if (i.get("status") or "").lower() not in PAID
               and (i.get("status") == "en_retard" or (_to_dt(i.get("due_date")) and _to_dt(i.get("due_date")) < now))]
    return {"success": True, "count": len(overdue),
            "total": round(sum((i.get("total") or 0) for i in overdue), 2), "invoices": overdue}


async def _exec_list_tasks(args, uid):
    status = (args.get("status") or "").strip()
    mongo = {"status": status} if status else {"status": {"$nin": ["done", "cancelled"]}}
    rows = await db.tasks.find(mongo, {"_id": 0, "id": 1, "title": 1, "status": 1, "priority": 1,
                                       "category": 1, "due_date": 1, "contact_id": 1}).to_list(100)
    return {"success": True, "count": len(rows), "tasks": rows}


_CRM_READONLY = {"contacts", "invoices", "tasks", "appointments", "budget", "opportunities",
                 "multilink_pages", "documents", "quotes", "portfolio"}


async def _exec_crm_query(args, uid):
    coll = (args.get("collection") or "").strip()
    if coll not in _CRM_READONLY:
        return {"success": False, "error": f"Collection non autorisée. Choisis parmi: {', '.join(sorted(_CRM_READONLY))}"}
    flt = args.get("filter") or {}
    if not isinstance(flt, dict):
        flt = {}
    limit = min(int(args.get("limit") or 20), 50)
    rows = await db[coll].find(flt, {"_id": 0}).to_list(limit)
    return {"success": True, "collection": coll, "count": len(rows), "rows": rows}


# ==================== Mémoire de Néo (Phase 3 / B.4) ====================
_MEM_TYPES = ("objective", "rule", "daily_log", "client_fact", "decision", "lesson")


async def _exec_remember(args, uid):
    mtype = (args.get("type") or "client_fact").strip()
    if mtype not in _MEM_TYPES:
        mtype = "client_fact"
    content = (args.get("content") or "").strip()
    if not content:
        return {"success": False, "error": "Contenu à mémoriser vide"}
    doc = {"id": str(uuid.uuid4()), "type": mtype, "content": content[:2000],
           "key": (args.get("key") or "").strip() or None, "contact_id": args.get("contact_id"),
           "created_at": datetime.now(timezone.utc).isoformat(), "user_id": uid}
    await db.neo_memory.insert_one(doc)
    return {"success": True, "message": f"Mémorisé ({mtype}).", "id": doc["id"]}


async def _exec_recall(args, uid):
    q = (args.get("query") or "").strip()
    mtype = (args.get("type") or "").strip()
    mongo = {}
    if mtype in _MEM_TYPES:
        mongo["type"] = mtype
    if q:
        mongo["content"] = {"$regex": q, "$options": "i"}
    rows = await db.neo_memory.find(mongo, {"_id": 0}).sort("created_at", -1).to_list(40)
    return {"success": True, "count": len(rows), "memories": rows}


async def _exec_update_objective(args, uid):
    content = (args.get("content") or "").strip()
    if not content:
        return {"success": False, "error": "Objectif vide"}
    key = (args.get("key") or "objectif_principal").strip()
    now = datetime.now(timezone.utc).isoformat()
    await db.neo_memory.update_one(
        {"type": "objective", "key": key},
        {"$set": {"type": "objective", "key": key, "content": content[:2000], "updated_at": now, "user_id": uid},
         "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
        upsert=True)
    return {"success": True, "message": f"Objectif « {key} » enregistré."}


async def _exec_log_day(args, uid):
    note = (args.get("note") or "").strip()
    if not note:
        return {"success": False, "error": "Note vide"}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now = datetime.now(timezone.utc).isoformat()
    await db.neo_memory.update_one(
        {"type": "daily_log", "key": today},
        {"$set": {"type": "daily_log", "key": today, "user_id": uid, "updated_at": now},
         "$push": {"entries": {"at": now, "note": note[:1000]}},
         "$setOnInsert": {"id": str(uuid.uuid4()), "created_at": now}},
        upsert=True)
    return {"success": True, "message": "Journal du jour mis à jour."}


async def _central_memory() -> str:
    """Mémoire centrale (objectifs + règles) injectée dans le cerveau à chaque appel."""
    try:
        rows = await db.neo_memory.find({"type": {"$in": ["objective", "rule"]}},
                                        {"_id": 0, "type": 1, "content": 1}).sort("created_at", 1).to_list(60)
    except Exception:
        return ""
    objs = [r["content"] for r in rows if r.get("type") == "objective"]
    rules = [r["content"] for r in rows if r.get("type") == "rule"]
    try:
        lessons = [r.get("content") for r in await db.neo_memory.find(
            {"type": "lesson"}, {"_id": 0, "content": 1}).sort("created_at", -1).to_list(15)]
    except Exception:
        lessons = []
    if not (objs or rules or lessons):
        return ""
    out = "\n\n=== MÉMOIRE DE NÉO (tiens-en compte absolument) ==="
    if objs:
        out += "\nOBJECTIFS :\n" + "\n".join(f"- {o}" for o in objs)
    if rules:
        out += "\nRÈGLES DE LÉO :\n" + "\n".join(f"- {r}" for r in rules)
    if lessons:
        out += "\nLEÇONS APPRISES (corrections passées de Léo, applique-les) :\n" + "\n".join(f"- {l}" for l in lessons if l)
    return out


# ==================== Health score (Phase 4) ====================
async def _compute_health_score() -> dict:
    """Score de santé business /100 : trésorerie + impayés + pipeline (devis) + leads chauds non traités."""
    now = datetime.now(timezone.utc)
    month = now.strftime("%Y-%m")
    try:
        entries = await db.budget.find({"month": {"$regex": f"^{month}"}}, {"_id": 0, "amount": 1, "type": 1}).to_list(500)
    except Exception:
        entries = []
    income = sum((e.get("amount", 0) or 0) for e in entries if e.get("type") == "income")
    expense = sum((e.get("amount", 0) or 0) for e in entries if e.get("type") == "expense")
    balance = income - expense
    invoices = await db.invoices.find({}, {"_id": 0, "document_type": 1, "status": 1, "total": 1, "due_date": 1}).to_list(2000)
    PAID = ("payée", "payee", "payé", "paye", "annulée", "annulee", "annulé", "brouillon")
    overdue = [i for i in invoices if i.get("document_type") != "devis"
               and (i.get("status") or "").lower() not in PAID
               and (i.get("status") == "en_retard" or (_to_dt(i.get("due_date")) and _to_dt(i.get("due_date")) < now))]
    pending_devis = [i for i in invoices if i.get("document_type") == "devis" and (i.get("status") or "").lower() == "brouillon"]
    contacts = await db.contacts.find({"status": "nouveau"}, {"_id": 0, "score": 1, "score_value": 1}).to_list(2000)

    def _hot(c):
        sv = c.get("score_value")
        return (sv >= 70) if isinstance(sv, (int, float)) else (c.get("score") in ("chaud", "chaude"))
    hot = [c for c in contacts if _hot(c)]
    score = 70
    score += 15 if balance >= 0 else -20
    score -= min(35, len(overdue) * 12)
    score += min(12, len(pending_devis) * 3)
    score -= min(15, len(hot) * 5)
    score = max(0, min(100, int(round(score))))
    label = "solide" if score >= 75 else ("à surveiller" if score >= 50 else "tendu")
    return {"success": True, "score": score, "label": label, "balance": round(balance, 2),
            "overdue_count": len(overdue), "overdue_total": round(sum((i.get("total") or 0) for i in overdue), 2),
            "pending_devis": len(pending_devis), "hot_leads": len(hot)}


# ==================== Pilotage stratégique (Phase 5) ====================
async def _strategic_review(args=None, uid=None) -> dict:
    """Point stratégique : prévisionnel (encaissé + pipeline), risque n°1, reco 'prêt à déléguer'.
    Jugement routé vers Claude (repli Gemini). Lecture seule."""
    hs = await _compute_health_score()
    invoices = await db.invoices.find({}, {"_id": 0, "document_type": 1, "status": 1, "total": 1}).to_list(2000)
    pending_devis = [i for i in invoices if i.get("document_type") == "devis"
                     and (i.get("status") or "").lower() in ("brouillon", "en_attente", "envoyée", "envoyee")]
    pipeline_total = sum((i.get("total") or 0) for i in pending_devis)
    try:
        open_tasks = await db.tasks.count_documents({"status": {"$nin": ["done", "cancelled"]}})
        total_contacts = await db.contacts.count_documents({})
        clients = await db.contacts.count_documents({"status": "client"})
        objs = [r.get("content") for r in await db.neo_memory.find(
            {"type": "objective"}, {"_id": 0, "content": 1}).to_list(10)]
    except Exception:
        open_tasks = total_contacts = clients = 0
        objs = []
    data = (f"Trésorerie ce mois (solde): {hs['balance']}€. Impayés à relancer: {hs['overdue_count']} "
            f"({hs['overdue_total']}€). Pipeline (devis en attente): {len(pending_devis)} pour {pipeline_total:.0f}€ "
            f"potentiels. Leads chauds non traités: {hs['hot_leads']}. Tâches ouvertes: {open_tasks}. "
            f"Contacts: {total_contacts}, dont {clients} clients. Score santé: {hs['score']}/100. "
            f"Objectifs enregistrés: {('; '.join(o for o in objs if o)) if objs else 'aucun (à définir avec Léo)'}.")
    system = ("Tu es Néo, l'associé co-gérant IA d'Alpha Agency (agence de communication, Guadeloupe). Ta raison "
              "d'être : faire croître le CA, la marge et le bénéfice. Donne un POINT STRATÉGIQUE concis et "
              "actionnable, en français, sans tirets longs : 1) prévisionnel du mois (encaissé + pipeline, vs "
              "objectif si connu, alerte si dérapage) ; 2) le risque n°1 ou là où l'on perd des prospects ; "
              "3) reco « prêt à déléguer ? » en comparant la charge (tâches) et la trésorerie. 4 à 7 phrases, direct, "
              "termine par la prochaine action concrète à faire.")
    review, model = await _strategic_text(system, "Données actuelles du CRM :\n" + data + "\n\nFais ton point stratégique.")
    return {"success": True, "model": model, "review": review, "pipeline_total": round(pipeline_total, 2),
            "open_tasks": open_tasks, "score": hs["score"], "balance": hs["balance"]}


# ==================== Registre d'outils (Partie C) ====================
def _obj(props: dict, required=None):
    return {"type": "object", "properties": props, "required": required or []}


_STR = {"type": "string"}
_INT = {"type": "integer"}
_BOOL = {"type": "boolean"}

# Chaque outil : name, description, params (json schema), validation (garde-fou A.5), run(args, uid)
TOOLS = [
    # --- Lecture ---
    {"name": "search_contacts", "validation": False, "run": _exec_search_contacts,
     "description": "Cherche des contacts par texte (nom/entreprise/email) et/ou statut.",
     "params": _obj({"query": _STR, "status": _STR, "limit": _INT})},
    {"name": "get_contact", "validation": False, "run": _exec_get_contact,
     "description": "Récupère la fiche complète d'un contact par nom/entreprise/email ou id.",
     "params": _obj({"contact_name": _STR, "contact_id": _STR})},
    {"name": "list_leads", "validation": False, "run": _exec_list_leads,
     "description": "Liste les leads récents (site + chatbot). only_hot=true pour les leads chauds (score>=70).",
     "params": _obj({"only_hot": _BOOL, "limit": _INT})},
    {"name": "get_budget_summary", "validation": False, "run": _exec_get_budget_summary,
     "description": "Résumé financier du mois : entrées, sorties, solde, impayés (nb + total), devis en attente.",
     "params": _obj({})},
    {"name": "list_overdue_invoices", "validation": False, "run": _exec_list_overdue_invoices,
     "description": "Liste les factures en retard (à relancer) avec le total dû.",
     "params": _obj({})},
    {"name": "list_tasks", "validation": False, "run": _exec_list_tasks,
     "description": "Liste les tâches (par défaut les non terminées). status optionnel.",
     "params": _obj({"status": _STR})},
    {"name": "get_health_score", "validation": False, "run": lambda a, u: _compute_health_score(),
     "description": "Score de santé business /100 (trésorerie, impayés, devis en attente, leads chauds) + détail.",
     "params": _obj({})},
    {"name": "strategic_review", "validation": False, "run": lambda a, u: _strategic_review(a, u),
     "description": "Point stratégique (jugement routé vers Claude) : prévisionnel du mois, risque n°1, reco 'prêt à déléguer'. À utiliser quand Léo demande un point stratégique / prévisionnel / conseil de pilotage.",
     "params": _obj({})},
    {"name": "activity_report", "validation": False, "run": lambda a, u: activity_report_action(a),
     "description": "Reporting d'activité : leads, conversion, valeur moyenne des devis, service & canal n°1.",
     "params": _obj({"days": _INT})},
    {"name": "prep_meeting", "validation": False, "run": lambda a, u: prep_meeting_action(a),
     "description": "Prépare un RDV : fiche + devis/factures + tâches + points à valider.",
     "params": _obj({"contact_name": _STR, "contact_id": _STR})},
    {"name": "enrich_company", "validation": False, "run": lambda a, u: enrich_company_action(a),
     "description": "Recherche web sur l'entreprise d'un contact (avant un appel) + 3 angles de RDV. Stocke un résumé.",
     "params": _obj({"contact_name": _STR, "contact_id": _STR})},
    {"name": "list_documents", "validation": False, "run": lambda a, u: list_documents_action(a),
     "description": "Liste les documents (filtres optionnels).",
     "params": _obj({"folder_name": _STR, "file_type": _STR, "search": _STR})},
    {"name": "get_document", "validation": False, "run": lambda a, u: get_document_action(a),
     "description": "Détails d'un document par nom ou id.",
     "params": _obj({"document_name": _STR, "document_id": _STR})},
    {"name": "crm_query", "validation": False, "run": _exec_crm_query,
     "description": "Lecture seule générique sur une collection du CRM pour répondre à une question imprévue. "
                    "collections: contacts, invoices, tasks, appointments, budget, opportunities, multilink_pages, documents, quotes, portfolio.",
     "params": _obj({"collection": _STR, "filter": {"type": "object"}, "limit": _INT}, ["collection"])},
    # --- Actions internes (pas de sortie client → exécution directe, journalisée) ---
    {"name": "create_task", "validation": False, "run": lambda a, u: create_task_action(a, u),
     "description": "Crée une tâche. title requis ; due_date YYYY-MM-DD ; priority low/medium/high/urgent.",
     "params": _obj({"title": _STR, "description": _STR, "priority": _STR, "due_date": _STR, "contact_id": _STR}, ["title"])},
    {"name": "mark_task_done", "validation": False, "run": lambda a, u: mark_task_done_action(a),
     "description": "Marque une tâche comme terminée (task_title ou task_id).",
     "params": _obj({"task_title": _STR, "task_id": _STR})},
    {"name": "schedule_followup", "validation": False, "run": lambda a, u: schedule_followup_action(a, u),
     "description": "Programme une relance (crée une tâche catégorie relance).",
     "params": _obj({"contact_name": _STR, "contact_id": _STR, "due_date": _STR, "label": _STR})},
    {"name": "set_contact_status", "validation": False, "run": lambda a, u: set_contact_status_action(a),
     "description": "Change le statut d'un contact (gagné/perdu/en cours/client/qualifié...).",
     "params": _obj({"contact_name": _STR, "contact_id": _STR, "status": _STR}, ["status"])},
    {"name": "add_contact_note", "validation": False, "run": lambda a, u: add_contact_note_action(a),
     "description": "Ajoute une note horodatée à une fiche (sans rien écraser).",
     "params": _obj({"contact_name": _STR, "contact_id": _STR, "note": _STR}, ["note"])},
    {"name": "update_contact", "validation": False, "run": lambda a, u: update_contact_action(a),
     "description": "Met à jour des champs d'un contact (phone, email, company, budget, poste, project_type, city, note...).",
     "params": _obj({"contact_name": _STR, "contact_id": _STR, "updates": {"type": "object"}}, ["updates"])},
    {"name": "create_quote", "validation": False, "run": lambda a, u: create_quote_action(a, u),
     "description": "Crée un DEVIS BROUILLON (pas envoyé). client_name requis ; services: [{title,description,quantity,unit_price}].",
     "params": _obj({"client_name": _STR, "client_email": _STR,
                     "services": {"type": "array", "items": {"type": "object"}}, "notes": _STR}, ["client_name"])},
    {"name": "draft_followup_email", "validation": False, "run": lambda a, u: draft_followup_email_action(a),
     "description": "Rédige (sans envoyer) un email de relance personnalisé, stocké en brouillon.",
     "params": _obj({"contact_name": _STR, "contact_id": _STR, "angle": _STR})},
    # --- Mémoire de Néo (Phase 3) ---
    {"name": "remember", "validation": False, "run": _exec_remember,
     "description": "Mémorise un fait durable. type: objective|rule|daily_log|client_fact|decision ; content requis.",
     "params": _obj({"type": _STR, "content": _STR, "key": _STR, "contact_id": _STR}, ["content"])},
    {"name": "recall", "validation": False, "run": _exec_recall,
     "description": "Retrouve dans la mémoire de Néo (filtre par texte 'query' et/ou 'type').",
     "params": _obj({"query": _STR, "type": _STR})},
    {"name": "update_objective", "validation": False, "run": _exec_update_objective,
     "description": "Définit/met à jour un objectif chiffré de l'agence (key optionnel, défaut objectif_principal).",
     "params": _obj({"content": _STR, "key": _STR}, ["content"])},
    {"name": "log_day", "validation": False, "run": _exec_log_day,
     "description": "Ajoute une entrée au journal du jour (check-in matin/soir, avancement de Léo).",
     "params": _obj({"note": _STR}, ["note"])},
    # --- Actions SORTANTES / IRRÉVERSIBLES → validation humaine (garde-fou A.5) ---
    {"name": "send_followup", "validation": True, "run": lambda a, u: send_followup_action(a),
     "description": "ENVOIE la relance (email) au prospect. Sortie client → nécessite la validation de Léo.",
     "params": _obj({"contact_name": _STR, "contact_id": _STR})},
    {"name": "merge_contacts", "validation": True, "run": lambda a, u: merge_contacts_action(a),
     "description": "Fusionne deux fiches en doublon (supprime le doublon). Irréversible → validation de Léo.",
     "params": _obj({"keep": _STR, "remove": _STR, "primary_id": _STR, "duplicate_id": _STR})},
]
_SPEC = {t["name"]: t for t in TOOLS}


def _gemini_tools():
    if not _t:
        return None
    decls = [_t.FunctionDeclaration(name=t["name"], description=t["description"],
                                    parameters_json_schema=t["params"]) for t in TOOLS]
    return [_t.Tool(function_declarations=decls)]


# ==================== Journalisation (Phase 0) ====================
async def _log(kind: str, payload: dict):
    try:
        await db.neo_action_log.insert_one({
            "id": str(uuid.uuid4()), "kind": kind,
            "at": datetime.now(timezone.utc).isoformat(), **payload})
    except Exception as e:
        logger.warning(f"neo log échoué: {e}")


# ==================== Exécution d'un outil (avec garde-fous) ====================
async def execute_tool(name: str, args: dict, user_id: str, confirmed: bool = False) -> dict:
    spec = _SPEC.get(name)
    if not spec:
        return {"success": False, "error": f"Outil inconnu: {name}"}
    # Garde-fou A.5 : sortie client / suppression → validation humaine
    if spec["validation"] and not confirmed:
        action_id = str(uuid.uuid4())
        await db.neo_pending_actions.insert_one({
            "id": action_id, "name": name, "args": args, "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(), "status": "pending"})
        await _log("pending", {"tool": name, "args": args, "user_id": user_id, "action_id": action_id})
        return {"success": True, "pending": True, "action_id": action_id,
                "message": f"EN ATTENTE DE VALIDATION de Léo (action: {name})."}
    try:
        res = await spec["run"](args, user_id)
    except Exception as e:
        logger.error(f"neo tool {name} a échoué: {e}")
        res = {"success": False, "error": str(e)[:300]}
    await _log("executed", {"tool": name, "args": args, "user_id": user_id,
                            "success": bool(res.get("success", True))})
    return res


# ==================== Appel modèle (passerelle + chaîne de repli) ====================
def _now_line():
    jdays = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    n = datetime.now(timezone.utc)
    return f"\n\nAUJOURD'HUI : {jdays[n.weekday()]} {n.strftime('%d/%m/%Y')} (ISO {n.strftime('%Y-%m-%d')})."


async def _gemini_call(contents, system):
    """Un tour de génération avec outils. Essaie la chaîne de modèles. Retourne (response, model)."""
    tools = _gemini_tools()
    last_err = None
    for mdl in NEO_MODELS:
        def _call(_m=mdl):
            cfg = _t.GenerateContentConfig(
                system_instruction=system, tools=tools,
                automatic_function_calling=_t.AutomaticFunctionCallingConfig(disable=True),
            )
            return _client.models.generate_content(model=_m, contents=contents, config=cfg)
        try:
            t0 = time.time()
            resp = await asyncio.to_thread(_call)
            await _log("llm", {"model": mdl, "latency_ms": int((time.time() - t0) * 1000)})
            return resp, mdl
        except Exception as e:
            last_err = e
            logger.warning(f"neo: modèle {mdl} a échoué: {e}")
            continue
    raise RuntimeError(f"all_neo_models_failed: {last_err}")


async def _claude_text(system: str, user_text: str) -> str:
    """Appel Claude (Anthropic Messages API, HTTP direct, sans dépendance) pour le jugement stratégique."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("no_anthropic_key")
    import requests

    def _call():
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": NEO_STRATEGIC_MODEL, "max_tokens": 1500, "system": system,
                  "messages": [{"role": "user", "content": user_text}]},
            timeout=60)
        r.raise_for_status()
        data = r.json()
        return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
    return await asyncio.to_thread(_call)


async def _gemini_text(system: str, prompt: str) -> str:
    """Génération texte simple (sans outils), chaîne de repli de modèles."""
    if not _client:
        raise RuntimeError("no_gemini")
    last = None
    for mdl in NEO_MODELS:
        def _c(_m=mdl):
            resp = _client.models.generate_content(
                model=_m, contents=prompt,
                config=_t.GenerateContentConfig(system_instruction=system))
            return (getattr(resp, "text", "") or "").strip()
        try:
            t = await asyncio.to_thread(_c)
            if t:
                return t
        except Exception as e:
            last = e
            continue
    raise RuntimeError(f"gemini_text_failed: {last}")


async def _strategic_text(system: str, user_text: str):
    """Lobe stratégique : Claude si dispo (jugement à fort enjeu), sinon repli Gemini. Retourne (texte, modèle)."""
    if ANTHROPIC_API_KEY:
        try:
            t = await _claude_text(system, user_text)
            if t:
                return t, "claude"
        except Exception as e:
            logger.warning(f"neo: Claude indisponible, repli Gemini: {e}")
    return await _gemini_text(system, user_text), "gemini"


def _fr_json(res: dict) -> dict:
    """Réponse d'outil sérialisable pour le modèle (jamais d'ObjectId/datetime brut)."""
    return {"result": json.dumps(res, default=str, ensure_ascii=False)[:4000]}


# ==================== Boucle agentique ====================
async def run_neo(messages: list, user_id: str) -> dict:
    if not _client:
        return {"message": "Néo est momentanément indisponible (clé IA manquante).", "available": False}
    contents = []
    for m in messages:
        role = "model" if m.get("role") == "assistant" else "user"
        contents.append(_t.Content(role=role, parts=[_t.Part.from_text(text=(m.get("content") or "")[:8000])]))

    system = NEO_SYSTEM + _now_line() + await _central_memory()
    pending = []
    actions = []
    for _ in range(MAX_ITERS):
        resp, _mdl = await _gemini_call(contents, system)
        fcs = list(getattr(resp, "function_calls", None) or [])
        if not fcs:
            txt = (getattr(resp, "text", "") or "").strip()
            return {"message": txt or "C'est noté.", "available": True,
                    "pending_actions": pending, "actions_done": actions}
        # rejoue le tour du modèle (avec ses appels d'outils)
        try:
            contents.append(resp.candidates[0].content)
        except Exception:
            contents.append(_t.Content(role="model",
                                       parts=[_t.Part.from_function_call(name=fc.name, args=dict(fc.args or {})) for fc in fcs]))
        tool_parts = []
        for fc in fcs:
            name = fc.name
            args = dict(fc.args or {})
            res = await execute_tool(name, args, user_id)
            if res.get("pending"):
                pending.append({"action_id": res["action_id"], "name": name, "args": args})
            elif res.get("success", True):
                actions.append({"name": name})
            tool_parts.append(_t.Part.from_function_response(name=name, response=_fr_json(res)))
        contents.append(_t.Content(role="tool", parts=tool_parts))

    return {"message": "J'ai atteint la limite d'étapes. Reformule ou demande la suite.",
            "available": True, "pending_actions": pending, "actions_done": actions}


# ==================== Endpoints ====================
class NeoChatRequest(BaseModel):
    messages: List[dict]
    conversation_id: Optional[str] = None


class ConfirmRequest(BaseModel):
    action_id: str


class FeedbackRequest(BaseModel):
    rating: str  # 'up' | 'down'
    message: Optional[str] = None  # le message de Néo évalué
    note: Optional[str] = None     # la correction / le commentaire de Léo
    conversation_id: Optional[str] = None


@router.get("/health")
async def neo_health():
    return {"available": bool(_client), "model_chain": NEO_MODELS, "tools": [t["name"] for t in TOOLS]}


@router.get("/health-score")
async def neo_health_score_endpoint(current_user: dict = Depends(get_current_user)):
    """Score de santé business /100 (déterministe, sans LLM) — pour le cockpit + Néo."""
    return await _compute_health_score()


@router.get("/checkin")
async def neo_checkin(current_user: dict = Depends(get_current_user)):
    """Check-in proactif matin/soir (Phase 3) : Néo te briefe à l'ouverture, ton adapté au
    moment de la journée, alertes finances incluses, et pose la bonne question. Déterministe (rapide)."""
    h = (datetime.now(timezone.utc).hour - 4) % 24  # Guadeloupe = UTC-4
    moment = "matin" if 4 <= h < 12 else ("après-midi" if 12 <= h < 18 else "soir")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        checked = bool(await db.neo_memory.find_one({"type": "daily_log", "key": today}))
    except Exception:
        checked = False
    hs = await _compute_health_score()
    bits = []
    if hs.get("overdue_count"):
        bits.append(f"{hs['overdue_count']} facture(s) en retard ({hs['overdue_total']:.0f}€) à relancer")
    if hs.get("hot_leads"):
        bits.append(f"{hs['hot_leads']} lead(s) chaud(s) à traiter")
    if hs.get("pending_devis"):
        bits.append(f"{hs['pending_devis']} devis à valider")
    prio = " · ".join(bits) if bits else "rien d'urgent, avance sur le fond"
    if moment == "soir":
        msg = f"Bonne soirée Léo. Bilan : {prio}. Comment a avancé ta journée ?"
        question = "Raconte-moi où tu en es, je mets le journal à jour."
    else:
        salut = "Bonjour" if moment == "matin" else "Bon après-midi"
        msg = f"{salut} Léo. Aujourd'hui : {prio}. Santé de l'agence : {hs['score']}/100 ({hs['label']})."
        question = None if checked else "Qu'as-tu de prévu aujourd'hui ? Dis-le-moi, je m'organise avec toi."
    return {"moment": moment, "checked_in_today": checked, "score": hs.get("score"),
            "label": hs.get("label"), "message": msg, "question": question, "priorities": bits}


@router.get("/strategy")
async def neo_strategy(current_user: dict = Depends(get_current_user)):
    """Point stratégique de Néo (Phase 5) — jugement routé vers Claude (repli Gemini)."""
    return await _strategic_review()


@router.post("/chat")
async def neo_chat(req: NeoChatRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id") or current_user.get("id")
    msgs = req.messages or []
    if not msgs:
        raise HTTPException(status_code=400, detail="Message requis")
    try:
        result = await run_neo(msgs, user_id)
    except Exception as e:
        logger.error(f"neo chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Néo: {str(e)[:200]}")
    result["conversation_id"] = req.conversation_id or str(uuid.uuid4())
    return result


@router.post("/confirm-action")
async def neo_confirm(req: ConfirmRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("user_id") or current_user.get("id")
    pending = await db.neo_pending_actions.find_one({"id": req.action_id, "status": "pending"})
    if not pending:
        raise HTTPException(status_code=404, detail="Action introuvable ou déjà traitée")
    res = await execute_tool(pending["name"], pending.get("args") or {}, user_id, confirmed=True)
    await db.neo_pending_actions.update_one({"id": req.action_id},
                                            {"$set": {"status": "done", "executed_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": res.get("success", True), "message": res.get("message") or "Action exécutée.", "result": res}


@router.post("/cancel-action")
async def neo_cancel(req: ConfirmRequest, current_user: dict = Depends(get_current_user)):
    await db.neo_pending_actions.update_one({"id": req.action_id}, {"$set": {"status": "cancelled"}})
    return {"success": True, "message": "Action annulée."}


@router.post("/feedback")
async def neo_feedback(req: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    """Apprentissage de Néo (cf. demande Léo « les deux ») :
    - 👍/👎 sur les réponses ; un 👎 avec note (ou un 👍 avec note) devient une LEÇON injectée
      dans le cerveau de Néo à chaque appel ; tout est journalisé comme signal d'apprentissage."""
    uid = current_user.get("user_id") or current_user.get("id")
    now = datetime.now(timezone.utc).isoformat()
    rating = (req.rating or "").strip().lower()
    note = (req.note or "").strip()
    lesson = None
    if rating == "down":
        lesson = "À ÉVITER : " + (note or "réponse jugée insatisfaisante par Léo (reformuler, être plus utile)")
    elif rating == "up" and note:
        lesson = "BONNE APPROCHE (à reproduire) : " + note
    if lesson:
        await db.neo_memory.insert_one({"id": str(uuid.uuid4()), "type": "lesson", "content": lesson[:1000],
                                        "created_at": now, "user_id": uid})
    await db.neo_feedback.insert_one({"id": str(uuid.uuid4()), "rating": rating, "note": note[:1000],
                                      "message": (req.message or "")[:2000], "conversation_id": req.conversation_id,
                                      "user_id": uid, "created_at": now})
    await _log("feedback", {"rating": rating, "has_note": bool(note), "user_id": uid})
    return {"success": True,
            "message": "Merci, je retiens." if rating == "up" else "Compris, je corrige et je le retiens pour la prochaine fois."}
