"""
Sous-agents spécialisés de Néo — architecture multi-agents (Lot B de la refonte).

Principe : Néo (l'orchestrateur, boucle existante de neo_assistant) gagne un outil
`consult_agent` qui délègue une MISSION à un sous-agent spécialisé. Chaque sous-agent
est une configuration bornée :
  - un prompt système dédié (son métier),
  - un SOUS-ENSEMBLE d'outils (moindre privilège : un agent d'analyse ne peut pas écrire),
  - sa propre boucle agentique bornée (max_iters), sur la même passerelle de modèles.

Ce qui ne change PAS : chaque outil exécuté par un sous-agent passe par
neo_assistant.execute_tool → mêmes garde-fous (validation humaine des actions
sensibles, whitelists, journal d'audit). Un sous-agent n'a donc JAMAIS plus de
droits que Néo lui-même — il en a moins.

Ajouter un sous-agent = ajouter une entrée au registre AGENTS. Rien d'autre.
"""
from fastapi import APIRouter, Depends
import asyncio
import logging
import time

from .database import get_current_user
from . import neo_assistant as na

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/neo/agents", tags=["Neo Agents"])

SUBAGENT_MAX_ITERS = 6  # boucle bornée par sous-agent (l'orchestrateur a la sienne)

_COMMON = """Tu es un sous-agent spécialisé de Néo, l'associé IA d'Alpha Agency (agence de
communication digitale, Guadeloupe). Néo t'a confié une MISSION précise : accomplis-la
avec tes outils, puis rends un RAPPORT court, factuel et directement exploitable
(chiffres exacts, noms exacts, recommandation claire). Français direct, pas de blabla.
Si une action sensible part en validation humaine, dis-le dans ton rapport."""

AGENTS = {
    "recherche": {
        "label": "Recherche & Données",
        "description": "interroger le CRM et le web en LECTURE pour rassembler des faits (contacts, historique, documents, chiffres)",
        "system": _COMMON + "\nTon métier : rassembler des FAITS (CRM + web). Tu ne modifies jamais rien.",
        "tools": ["search_contacts", "get_contact", "get_contact_history", "crm_query",
                  "list_documents", "get_document", "list_leads", "list_tasks", "web_search", "read_emails"],
    },
    "commercial": {
        "label": "Commercial & Pipeline",
        "description": "analyser les deals/le pipeline, prioriser, détecter les blocages, faire avancer les opportunités et programmer des relances",
        "system": _COMMON + "\nTon métier : le PIPELINE. Analyse les deals (collection opportunities et devis dans invoices), "
                            "détecte ce qui stagne, priorise par montant×probabilité, propose et déclenche la prochaine action "
                            "(déplacer un deal = crm_update sur opportunities ; relance = schedule_followup).",
        "tools": ["crm_query", "search_contacts", "get_contact", "get_contact_history", "list_leads",
                  "activity_report", "get_health_score", "crm_create", "crm_update", "schedule_followup"],
    },
    "communication": {
        "label": "Communication",
        "description": "rédiger emails, relances, messages et comptes-rendus dans le style de Léo",
        "system": _COMMON + "\nTon métier : RÉDIGER (emails, relances, comptes-rendus). Style de Léo : direct, chaleureux, pro, "
                            "phrases courtes, pas de jargon. Prépare en brouillon (draft_followup_email) ; l'ENVOI (send_followup) "
                            "partira en validation humaine, c'est normal.",
        "tools": ["get_contact", "get_contact_history", "read_emails", "web_search",
                  "draft_followup_email", "send_followup", "add_contact_note"],
    },
    "tresorerie": {
        "label": "Trésorerie & Reporting",
        "description": "synthèses chiffrées : trésorerie, impayés, prévisionnel, santé du portefeuille, KPIs",
        "system": _COMMON + "\nTon métier : les CHIFFRES. Trésorerie réelle (Qonto), budget du mois, impayés, prévisionnel "
                            "(devis en attente), santé globale. Toujours des montants exacts et une lecture (bon/inquiétant/action).",
        "tools": ["get_budget_summary", "get_bank_balance", "list_transactions",
                  "list_overdue_invoices", "get_health_score", "activity_report", "crm_query"],
    },
    "veille": {
        "label": "Veille & Signaux",
        "description": "surveiller les signaux (deals qui stagnent, impayés, leads chauds) et enrichir la connaissance d'un prospect/marché",
        "system": _COMMON + "\nTon métier : la VEILLE. Détecte ce qui mérite attention (impayés, deals qui dorment, leads chauds "
                            "sans suite), enrichis les prospects (web), et rends une liste priorisée d'actions.",
        "tools": ["crm_query", "list_overdue_invoices", "list_leads", "list_tasks",
                  "enrich_company", "web_search", "get_health_score"],
    },
    "actions": {
        "label": "Actions CRM",
        "description": "exécuter une série d'opérations d'écriture dans le CRM (créer/modifier contacts, devis, tâches, notes...)",
        "system": _COMMON + "\nTon métier : EXÉCUTER des opérations CRM précises et vérifiables. Procède pas à pas, vérifie "
                            "l'existant avant de créer (pas de doublon), et récapitule exactement ce qui a été fait.",
        "tools": ["search_contacts", "get_contact", "create_contact", "update_contact", "set_contact_status",
                  "add_contact_note", "create_quote", "create_task", "mark_task_done", "schedule_followup",
                  "crm_query", "crm_create", "crm_update", "crm_delete"],
    },
}


def _agent_tools_decls(agent: dict):
    """Déclarations Gemini limitées aux outils du sous-agent (moindre privilège)."""
    if not na._t:
        return None
    specs = [na._SPEC[n] for n in agent["tools"] if n in na._SPEC]
    decls = [na._t.FunctionDeclaration(name=t["name"], description=t["description"],
                                       parameters_json_schema=t["params"]) for t in specs]
    return [na._t.Tool(function_declarations=decls)]


async def _subagent_gemini_call(contents, system, tools):
    """Un tour de génération pour un sous-agent (même chaîne de repli que Néo)."""
    last_err = None
    for mdl in na.NEO_MODELS:
        def _call(_m=mdl):
            cfg = na._t.GenerateContentConfig(
                system_instruction=system, tools=tools,
                automatic_function_calling=na._t.AutomaticFunctionCallingConfig(disable=True),
            )
            return na._client.models.generate_content(model=_m, contents=contents, config=cfg)
        try:
            t0 = time.time()
            resp = await asyncio.to_thread(_call)
            await na._log("llm", {"model": mdl, "latency_ms": int((time.time() - t0) * 1000), "subagent": True})
            has_fc = bool(getattr(resp, "function_calls", None))
            try:
                has_txt = bool((resp.text or "").strip())
            except Exception:
                has_txt = False
            if has_fc or has_txt:
                return resp, mdl
            last_err = "empty_response"
            continue
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"subagent_all_models_failed: {last_err}")


async def run_subagent(agent_key: str, mission: str, user_id: str, context: str = "") -> dict:
    """Boucle agentique bornée d'un sous-agent. Retourne un rapport + le journal des actions."""
    agent = AGENTS.get(agent_key)
    if not agent:
        return {"success": False,
                "error": f"Sous-agent inconnu « {agent_key} ». Disponibles : {', '.join(sorted(AGENTS))}."}
    mission = (mission or "").strip()
    if not mission:
        return {"success": False, "error": "Mission vide."}
    if na._client is None or na._t is None:
        return {"success": False, "error": "Passerelle modèle indisponible (GEMINI_API_KEY absente)."}

    system = agent["system"] + na._now_line()
    tools = _agent_tools_decls(agent)
    user_text = mission if not context else f"{mission}\n\nCONTEXTE FOURNI PAR NÉO :\n{context}"
    contents = [na._t.Content(role="user", parts=[na._t.Part.from_text(text=user_text)])]

    actions_done, pending_actions = [], []
    await na._log("subagent_start", {"agent": agent_key, "mission": mission[:300], "user_id": user_id})

    for _ in range(SUBAGENT_MAX_ITERS):
        resp, mdl = await _subagent_gemini_call(contents, system, tools)
        fcs = list(getattr(resp, "function_calls", None) or [])
        if not fcs:
            try:
                report = (resp.text or "").strip()
            except Exception:
                report = ""
            await na._log("subagent_done", {"agent": agent_key, "actions": len(actions_done),
                                            "pending": len(pending_actions)})
            return {"success": True, "agent": agent_key, "agent_label": agent["label"],
                    "report": report or "(rapport vide)",
                    "actions_done": actions_done, "pending_actions": pending_actions}

        # Le modèle veut agir : on exécute chaque appel via execute_tool (garde-fous intacts)
        contents.append(resp.candidates[0].content)
        parts = []
        for fc in fcs:
            name = fc.name
            args = dict(fc.args or {})
            if name not in agent["tools"]:
                result = {"success": False, "error": f"Outil « {name} » hors du périmètre du sous-agent {agent_key}."}
            else:
                result = await na.execute_tool(name, args, user_id)
            if result.get("pending"):
                pending_actions.append({"tool": name, "action_id": result.get("action_id"), "args": args})
            elif result.get("success"):
                actions_done.append({"tool": name})
            parts.append(na._t.Part.from_function_response(name=name, response={"result": result}))
        contents.append(na._t.Content(role="tool", parts=parts))

    await na._log("subagent_done", {"agent": agent_key, "actions": len(actions_done),
                                    "pending": len(pending_actions), "max_iters": True})
    return {"success": True, "agent": agent_key, "agent_label": agent["label"],
            "report": "Mission arrêtée à la limite d'itérations — voici ce qui a été fait.",
            "actions_done": actions_done, "pending_actions": pending_actions}


# ==================== Outil orchestrateur : consult_agent ====================

async def _exec_consult_agent(args, uid):
    return await run_subagent((args.get("agent") or "").strip(), args.get("mission") or "",
                              uid, context=(args.get("context") or ""))


def register():
    """Ajoute l'outil consult_agent au registre de Néo (idempotent)."""
    if "consult_agent" in na._SPEC:
        return
    catalogue = " ; ".join(f"'{k}' = {v['description']}" for k, v in AGENTS.items())
    tool = {
        "name": "consult_agent", "validation": False, "run": _exec_consult_agent,
        "description": ("Délègue une MISSION à un sous-agent spécialisé de ton équipe, qui travaille avec ses "
                        "propres outils et te rend un rapport. À utiliser pour les missions qui méritent un "
                        "spécialiste ou plusieurs étapes focalisées. Sous-agents : " + catalogue +
                        ". Donne une mission PRÉCISE (objectif + critères de succès) et le contexte utile."),
        "params": na._obj({"agent": {"type": "string", "enum": sorted(AGENTS)},
                           "mission": na._STR, "context": na._STR}, ["agent", "mission"]),
    }
    na.TOOLS.append(tool)
    na._SPEC["consult_agent"] = tool
    logger.info(f"neo_agents: consult_agent enregistré ({len(AGENTS)} sous-agents)")


register()


# ==================== ROUTES (introspection) ====================

@router.get("")
async def list_agents(current_user: dict = Depends(get_current_user)):
    """Catalogue des sous-agents (pour l'UI et le debug)."""
    return {"success": True, "agents": [
        {"key": k, "label": v["label"], "description": v["description"], "tools": v["tools"]}
        for k, v in AGENTS.items()]}
