# NEO.md — Architecture de Néo (assistant IA du CRM Alpha Agency)

> Documentation vivante. Mise à jour : 5 juillet 2026 (refonte « Jarvis », lots A/B/E livrés).
> Pour l'état des lieux et le plan complet de la refonte : voir `NEO_AUDIT.md`.

---

## 1. Vue d'ensemble

Néo est un **orchestrateur agentique** branché sur tout le CRM :

```
Léo (texte ou voix)
   │
   ▼
Neo Core (orchestrateur) ──────────── mémoire long terme (neo_memory)
   │  boucle agentique (MAX_ITERS=10)      contexte budget injecté
   │  routage Auto Gemini ⟷ Claude          journal d'audit (neo_action_log)
   │
   ├─ ~48 outils directs (lecture / écriture encadrée / mémoire)
   │        └─ TOUS via execute_tool → garde-fous + journal
   │
   └─ consult_agent → SOUS-AGENTS spécialisés (routes/neo_agents.py)
         ├─ recherche      (lecture CRM + web, zéro écriture)
         ├─ commercial     (pipeline : analyse, priorisation, relances)
         ├─ communication  (rédaction emails/CR ; l'envoi part en validation)
         ├─ tresorerie     (chiffres : Qonto, budget, impayés, prévisionnel)
         ├─ veille         (signaux, enrichissement prospects)
         └─ actions        (séries d'opérations CRM vérifiables)
```

**Principe clé : un sous-agent n'a jamais plus de droits que Néo.** Chaque outil qu'il
exécute passe par le même `execute_tool` (validation humaine des actions sensibles,
whitelists de collections, journal). Il en a même moins : chaque sous-agent est borné
à un **sous-ensemble d'outils** (moindre privilège) et à sa propre limite d'itérations.

## 2. Fichiers

| Fichier | Rôle |
|---|---|
| `backend/routes/neo_assistant.py` | Neo Core : passerelle modèles, registre TOOLS, exécuteurs, boucles (sync + SSE), mémoire, check-in, endpoints `/api/neo/*` |
| `backend/routes/neo_agents.py` | Sous-agents : registre AGENTS, boucle bornée `run_subagent`, outil `consult_agent`, `GET /api/neo/agents` |
| `backend/routes/neo_signals.py` | Proactivité : détection de signaux, règles configurables, scans planifiés, `GET/POST /api/neo/signals*` |
| `frontend/src/components/AssistantChat.jsx` | Chat (panneau + page), streaming SSE, validations, action 1-clic (`neo:prompt` / sessionStorage) |
| `frontend/src/components/NeoVoiceMode.jsx` | Mode vocal (STT navigateur, TTS ElevenLabs, barge-in, cartes Jarvis) |
| `frontend/src/pages/dashboard/NeoPage.jsx` | QG `/admin/neo` : chat plein écran + Radar + santé + trésorerie |
| `neo_mcp_server.py` | Pont MCP pour le Claude du PC de Léo |

## 3. Cerveaux et routage

- **Gemini 2.5 Flash** (défaut, chaîne de repli Flash-Lite/Latest) : lookup, commandes, vocal.
- **Claude Sonnet** (`NEO_STRATEGIC_MODEL`) : jugement stratégique — routé par `_resolve_brain`
  (mots-clés forts, texte > 600 caractères, ou choix manuel du toggle front Auto/Gemini/Claude).
- Le vocal force Gemini (latence).
- Sous-agents : Gemini (chaîne de repli identique). Le champ `brain` du registre est prévu
  pour router un sous-agent vers Claude plus tard sans rien réécrire.

## 4. Outils : comment en ajouter un

Dans `neo_assistant.py`, ajouter une entrée au tableau `TOOLS` :

```python
{"name": "mon_outil", "validation": False,  # True = validation humaine obligatoire
 "run": _exec_mon_outil,                    # async def _exec_mon_outil(args, uid) -> dict
 "description": "Description POUR LE MODÈLE : quand et comment l'utiliser.",
 "params": _obj({"champ": _STR}, ["champ"])}
```

Règles :
- **Toute écriture sensible** (sortie client, suppression, fusion) → `validation: True`
  → l'appel crée un doc `neo_pending_actions` et le front affiche Valider/Annuler.
- Les écritures génériques passent par `crm_create/update/delete`, bornées à `_CRM_WRITABLE`
  (jamais users, credentials/tokens, transferts d'argent, collections internes `neo_*`).
- `crm_delete` ne supprime que si le filtre matche **exactement un** document (leçon de
  l'incident de juin 2026) — verrouillé par les tests.

## 5. Sous-agents : comment en ajouter un

Dans `neo_agents.py`, ajouter une entrée à `AGENTS` :

```python
"mon_agent": {
    "label": "Mon Agent",
    "description": "ce qu'il sait faire (visible par l'orchestrateur dans consult_agent)",
    "system": _COMMON + "\nTon métier : ...",
    "tools": ["outil1", "outil2"],   # sous-ensemble STRICT de na._SPEC
},
```

C'est tout : l'enum de `consult_agent` et le catalogue `GET /api/neo/agents` se mettent
à jour tout seuls. Le test `test_tous_les_outils_des_agents_existent` casse si un nom
d'outil est faux.

## 6. Proactivité (signaux)

`neo_signals.py` détecte : facture en retard, deal qui stagne (≥ 14 j), devis sans
réponse (≥ 7 j), tâche en retard, lead chaud sans suite (≥ 3 j).

- **Seuils configurables** : `PUT /api/neo/signals/rules` (stockés dans `settings`,
  type `neo_signal_rules`) — jours par type, montant « gros deal », activation par signal.
- **Scans planifiés** : 07:45 et 17:45 (heure Guadeloupe) sur le scheduler APScheduler
  existant. Les signaux prioritaires déposent une notification in-app (dédupliquée par jour).
- **Action en 1 clic** : chaque signal porte un `neo_prompt`. Le bouton « Traiter » (carte
  Radar du QG) ou le clic sur la notification envoie ce prompt à Néo — c'est la machinerie
  agentique normale qui traite, avec ses garde-fous.
- Ajouter un signal = une fonction de détection dans `detect_signals` + un test.

## 7. Mémoire

- **Courte** : conversations persistées (`neo_conversations`), reprise possible.
- **Longue** : `neo_memory` — objectifs, règles, leçons (feedback 👍/👎), faits clients,
  journal quotidien. Injectée dans le prompt à chaque appel via `_central_memory()`.
- À venir (lot C) : page « Ce que Néo sait » pour consulter/corriger la mémoire.

## 8. Sécurité

- JWT : source unique `routes/database.py`, secret exigé de l'environnement (fallback
  aléatoire + log CRITICAL sinon). Plus aucun secret en dur dans le code.
- Actions Néo : garde-fous A.5 (validation humaine, anti-suppression multiple, pas d'accès
  paiements/credentials), journal `neo_action_log` complet (LLM, outils, sous-agents, scans).
- Variables d'env requises en prod (Railway) : `JWT_SECRET`, `MONGO_URL`, `DB_NAME`,
  `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `QONTO_CLIENT_ID/SECRET`,
  `MOLTBOT_SECRET` (+ intégrations optionnelles).

## 9. Tests

```bash
cd backend
../.venv-backend/bin/python -m pytest tests/test_neo_guardrails.py tests/test_neo_signals.py tests/test_neo_agents.py -q
```

57 tests unitaires (faux Mongo en mémoire, zéro réseau) : whitelists, crm_delete,
validation humaine, moteur de signaux (détections, règles, dédup), multi-agents
(registre, moindre privilège, boucle, hors-périmètre, limite d'itérations).
