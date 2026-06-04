#!/usr/bin/env python3
"""
Serveur MCP « Néo · Alpha Agency » — pont entre ton Claude local (Desktop / Code / Cowork)
et Néo (le co-gérant IA d'Alpha Agency, accès complet au CRM, trésorerie, web, fichiers…).

Ton Claude sur PC peut ainsi INTERROGER et PILOTER Néo : poser une question, récupérer la
trésorerie, le score de santé, demander une action (Néo applique ses garde-fous : validation
des envois sortants, jamais de paiement, etc.).

Installation (sur ton Mac) :
    pip install "mcp[cli]" requests          # ou : uv pip install "mcp[cli]" requests

Configuration — voir le bloc JSON donné par Léo/Claude (claude_desktop_config.json
pour l'app, ou config MCP de Claude Code). Auth via variables d'env :
    ALPHA_API_URL   (def: https://www.alphagency.fr/api)
    ALPHA_EMAIL + ALPHA_PASSWORD   (recommandé)  — ou ALPHA_TOKEN (jeton déjà obtenu)

Lancement direct (test) :  python3 neo_mcp_server.py
"""
import os
import requests
from mcp.server.fastmcp import FastMCP

API = os.environ.get("ALPHA_API_URL", "https://www.alphagency.fr/api").rstrip("/")
EMAIL = os.environ.get("ALPHA_EMAIL", "")
PASSWORD = os.environ.get("ALPHA_PASSWORD", "")
_TOKEN = {"v": os.environ.get("ALPHA_TOKEN", "")}

mcp = FastMCP("neo-alpha")


def _login() -> str:
    if not (EMAIL and PASSWORD):
        raise RuntimeError("Auth manquante : définis ALPHA_EMAIL + ALPHA_PASSWORD (ou ALPHA_TOKEN).")
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=25)
    r.raise_for_status()
    _TOKEN["v"] = r.json()["token"]
    return _TOKEN["v"]


def _req(method: str, path: str, **kw):
    """Appel API authentifié, re-login automatique sur 401."""
    if not _TOKEN["v"]:
        _login()
    for attempt in range(2):
        headers = {"Authorization": f"Bearer {_TOKEN['v']}"}
        headers.update(kw.pop("headers", {}) if attempt == 0 else {"Authorization": f"Bearer {_TOKEN['v']}"})
        resp = requests.request(method, f"{API}{path}", headers=headers, timeout=kw.pop("timeout", 90), **kw)
        if resp.status_code == 401 and attempt == 0:
            _login(); kw["headers"] = {}; continue
        resp.raise_for_status()
        return resp
    resp.raise_for_status()
    return resp


@mcp.tool()
def ask_neo(question: str) -> str:
    """Pose une question ou confie une tâche à Néo, le co-gérant IA d'Alpha Agency.
    Néo a accès au CRM complet (contacts, leads, devis/factures, tâches, agenda), à la
    trésorerie Qonto, à la recherche web, et peut agir (avec validation humaine pour tout
    envoi sortant). Utilise-le pour : état du business, qui relancer, analyse, rédaction,
    recherche, préparation d'actions. Réponse en langage naturel."""
    r = _req("POST", "/neo/chat", json={"messages": [{"role": "user", "content": question}]})
    d = r.json()
    out = d.get("message", "")
    pend = d.get("pending_actions") or []
    if pend:
        out += "\n\n[Actions préparées en attente de validation de Léo : " + ", ".join(p.get("name", "?") for p in pend) + "]"
    return out or "(réponse vide)"


@mcp.tool()
def neo_treasury() -> str:
    """Trésorerie réelle d'Alpha Agency (Qonto) : solde total, soldes par compte, derniers
    mouvements, entrées/sorties par mois. Données chiffrées brutes."""
    d = _req("GET", "/neo/treasury").json()
    if not d.get("connected"):
        return "Trésorerie Qonto non connectée."
    lines = [f"Solde total : {d.get('total_balance')} €"]
    for a in d.get("accounts", []):
        lines.append(f"  - {a.get('name')} : {a.get('balance')} €")
    for m in (d.get("monthly") or [])[-6:]:
        lines.append(f"  {m.get('month')} : +{m.get('income')} / -{m.get('expense')}")
    return "\n".join(lines)


@mcp.tool()
def neo_health_score() -> str:
    """Score de santé business d'Alpha Agency /100 (trésorerie, impayés, devis en attente,
    leads chauds) avec le détail des points d'attention."""
    import json as _j
    d = _req("GET", "/neo/health-score").json()
    return _j.dumps(d, ensure_ascii=False, indent=2)


@mcp.tool()
def get_cowork_tasks() -> str:
    """Récupère les tâches que NÉO t'a envoyées (à toi, Cowork) à traiter. Néo dépose des
    briefs depuis Alpha Agency ; cet outil te les liste (id, titre, brief). Travaille dessus
    puis appelle complete_cowork_task avec le résultat."""
    import json as _j
    tasks = _req("GET", "/neo/cowork-inbox").json().get("tasks", [])
    if not tasks:
        return "Aucune tâche en attente de la part de Néo."
    return _j.dumps(tasks, ensure_ascii=False, indent=2)


@mcp.tool()
def complete_cowork_task(task_id: str, result: str = "") -> str:
    """Marque une tâche reçue de Néo comme traitée et lui renvoie le résultat (Néo pourra le
    consulter). task_id = l'id donné par get_cowork_tasks."""
    _req("POST", f"/neo/cowork-inbox/{task_id}/done", json={"result": result})
    return f"Tâche {task_id} traitée, résultat transmis à Néo."


if __name__ == "__main__":
    mcp.run()
