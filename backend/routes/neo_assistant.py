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


async def _gemini_call(contents):
    """Un tour de génération avec outils. Essaie la chaîne de modèles. Retourne (response, model)."""
    tools = _gemini_tools()
    system = NEO_SYSTEM + _now_line()
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

    pending = []
    actions = []
    for _ in range(MAX_ITERS):
        resp, _mdl = await _gemini_call(contents)
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


@router.get("/health")
async def neo_health():
    return {"available": bool(_client), "model_chain": NEO_MODELS, "tools": [t["name"] for t in TOOLS]}


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
