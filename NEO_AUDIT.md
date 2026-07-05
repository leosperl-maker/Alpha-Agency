# NEO_AUDIT.md — État des lieux CRM Alpha Agency + Néo, et plan de refonte

> Audit réalisé le 5 juillet 2026 (Phase 0 du chantier « refonte CRM + Néo Jarvis »).
> Méthode : 4 explorations parallèles en profondeur (backend, Néo, frontend, infra/tests/docs), croisées avec l'historique git et la mémoire projet.

---

## 1. Verdict d'ensemble

**Le point de départ est bien meilleur que ce que le brief suppose.** Une grande partie de la vision « Jarvis » est déjà en production et fonctionne :

- Néo tourne en function calling natif avec **47 outils** (lecture + écriture encadrée), une boucle agentique, du **streaming SSE** (texte + étapes d'outils en direct), un **mode vocal** complet (STT navigateur, TTS ElevenLabs flash, barge-in, cartes contextuelles animées), un **routage automatique Gemini/Claude**, une **mémoire long terme** (objectifs, règles, leçons), des **garde-fous** avec validation humaine et un **journal d'actions**.
- Le CRM a déjà un design system propre (tokens CSS light/dark, shadcn/ui, glassmorphism, rouge marque), une **palette ⌘K** avec recherche base + raccourcis vim, une PWA mobile soignée, framer-motion/GSAP/Lottie/Three déjà en place.

**La refonte n'est donc pas une reconstruction : c'est (1) combler les vrais trous, (2) consolider ce qui est fragmenté, (3) sécuriser et fiabiliser, (4) pousser le niveau visuel et la proactivité.**

Les vrais écarts par rapport à la cible :

| # | Écart | Gravité |
|---|-------|---------|
| 1 | **Aucune UI pipeline/kanban** — l'API opportunités existe, aucune page ne l'affiche | Majeur (parcours CRM clé absent) |
| 2 | **Pas d'architecture multi-agents** — un seul cerveau, pas d'orchestrateur ni de sous-agents | Majeur (cible produit) |
| 3 | **Pas de proactivité autonome** — le check-in existe mais rien ne détecte les signaux tout seul (deal qui stagne, relance en retard) | Majeur |
| 4 | **3 chaînes IA parallèles** — `neo_assistant.py` (2 195 l.) + `moltbot.py` (1 282 l.) + `ai_enhanced.py` (1 553 l.) coexistent | Dette lourde |
| 5 | **Sécurité** — secrets en dur (Qonto, Stripe test, MoltBot), JWT_SECRET aléatoire si absent, tokens OAuth stockés en clair | Critique |
| 6 | **Perf front** — aucun code-splitting par route (tout le CRM charge d'un coup), aucune virtualisation de liste | Important |
| 7 | **Zéro test sur les outils Néo** — 47 outils, boucle agentique, garde-fous : rien n'est testé | Important |
| 8 | **`db.quotes` vs `db.invoices`** — incohérence de fond jamais réconciliée (cause de l'incident de suppression de juin) | Important |
| 9 | **Pas de backup automatique actif en prod** (backup_manager.py existe mais non branché sur Railway) | Critique vu l'incident |

---

## 2. Stack détectée

**Backend** — FastAPI 0.110.1, Python 3.11, MongoDB via Motor 3.3.1 (async), Pydantic v2, JWT (PyJWT, HS256, 24 h), APScheduler. `server.py` = **6 748 lignes** (modèles + helpers + endpoints + montage de 43 routers), ~95 collections MongoDB, ~493 endpoints.

**IA** — Gemini 2.5 Flash (défaut, chaîne de repli Flash-Lite/Flash-Latest), Claude Sonnet (stratégique, routé par heuristique `_resolve_brain`), ElevenLabs `eleven_flash_v2_5` (TTS), Whisper (transcription), Perplexity (enrichissement). MCP server (`neo_mcp_server.py`) pour le Claude du PC de Léo.

**Frontend** — React 19 + CRA/craco, Tailwind + shadcn/ui (47 composants), React Router v7, framer-motion 12 / GSAP 3.15 / Lottie / Three (lazy), Recharts, dnd-kit, cmdk. 124 fichiers, 21 pages admin (22 500 lignes).

**Infra** — Railway, image Docker unique (Nginx + Uvicorn + build React statique), `www.alphagency.fr`. Services WhatsApp Node/Baileys séparés (whatsapp-service local, whatsapp-railway). Emails Resend, SMS/WhatsApp Twilio, Meta/Instagram, Qonto, Google Drive/Calendar/Gmail, Cloudinary, Stripe (partiel).

**Tests** — 19 fichiers d'intégration backend (pytest + HTTP réel, dernier run 100 % en déc. 2025), rien sur Néo, rien en unitaire, rien côté front.

---

## 3. État détaillé de Néo

### Ce qui marche (à ne pas casser)
- **Boucle agentique** `run_neo` / `run_neo_stream` (Gemini) et `run_neo_claude*` (Claude), MAX_ITERS=6, function calling natif des deux côtés.
- **47 outils** : 33 lecture (contacts, finances, Qonto, tâches, docs, Gmail, web, `crm_query` générique whitelisté 9 collections), 10 écriture encadrée (`create_contact`, `create_quote`, `crm_create/update`, notes, statuts…), 2 sensibles à validation humaine (`send_followup`, `merge_contacts`), 4 mémoire (`remember`, `recall`, `update_objective`, `log_day`).
- **Garde-fous** : actions sortantes → `neo_pending_actions` + boutons Valider/Annuler ; `crm_delete` n'agit que si le filtre matche exactement 1 document ; pas d'accès paiements/virements ; collections sensibles exclues de `crm_query` ; tout est journalisé dans `neo_action_log`.
- **Contexte injecté à chaque appel** : date/heure, budget du mois (encaissé/dépensé/solde/impayés/pipeline, Qonto si connecté), mémoire centrale (objectifs + règles + leçons issues du feedback 👍/👎).
- **Streaming SSE** complet (texte token par token, étapes d'outils labellisées, actions pending) ; **vocal** avec barge-in qui annule le flux, TTS par phrases, cartes Jarvis animées.
- **Persistance** : `neo_conversations`, reprise de conversation, historique.

### Ce qui manque ou est fragile
- **Un seul cerveau, pas d'orchestration** : pas de sous-agents spécialisés ; `delegate_task` existe mais générique. `neo_assistant.py` est un monolithe de 2 195 lignes (passerelle modèles + registre outils + 47 exécuteurs + boucles + endpoints).
- **Proactivité** : `/neo/run-proactive` et `/neo/checkin` existent mais rien ne tourne seul ; pas de détection de signaux (deal stagnant, relance en retard, anomalie tréso).
- **Fragmentation** : MoltBot (WhatsApp) et ai_enhanced (ancien assistant) tournent en parallèle ; les exécuteurs de Néo importent des fonctions legacy d'ai_enhanced → 3 systèmes à maintenir pour 1 rôle.
- **MAX_ITERS=6** : trop bas pour les demandes multi-étapes ambitieuses.
- **Gmail** : outil `read_emails` présent mais non injecté en contexte automatique.
- **Aucun test** sur outils/garde-fous/routage.
- **Mémoire** : pas d'UI pour consulter/corriger ce que Néo retient (exigence du brief).

---

## 4. État détaillé du CRM

### Parcours modernes (polish seulement)
Contacts (+ sheet détail avec timeline), Facturation/Devis (3 392 l., PDF inline, acomptes/soldes), Calendrier éditorial (dnd-kit fluide), Multilink (3 971 l.), Budget (import CSV, auto-catégorisation, prévisionnel), Dashboard (KPIs + Recharts), Agenda, Documents, Transferts.

### Trous fonctionnels
- **Pipeline kanban : absent.** `opportunitiesAPI` et `pipeline_columns` (colonnes avec stage/label/couleur/probabilité) existent côté back, rien côté front. C'est LE parcours commercial manquant.
- **Recherche globale** : la palette ⌘K cherche contacts + factures seulement.
- **Reporting** : dashboard correct mais pas de vue « santé du portefeuille » consolidée.

### Dette front
- Fichiers monolithiques : MultilinkPage 3 971 l., InvoicesPage 3 392 l., EditorialCalendarPage 2 523 l., SocialComposer 1 226 l.
- **Aucun `React.lazy` par route** : les 21 pages admin + le site public partent dans le même bundle.
- **Aucune virtualisation** : ContactsPage/InvoicesPage rendent tout (freeze au-delà de ~1 000 lignes).
- Doublons : AssistantChat vs ChatWidget (assumé : admin vs public), AdvancedBlockEditor/Renderer ; `next-themes` installé mais inutilisé (ThemeContext custom fait le travail) ; couleurs en dur (#CE0202) à côté des tokens.
- 53 `console.*` résiduels.

---

## 5. Sécurité et fiabilité — constats critiques

1. **Secrets en dur dans le code** (à retirer ET à faire tourner, car committés) :
   - `routes/qonto.py:26-27` — QONTO_CLIENT_ID/SECRET en fallback clair.
   - `routes/database.py:76` — clé Stripe test en fallback.
   - `whatsapp-service/index.js` + `whatsapp-railway/index.js` — `MOLTBOT_SECRET='moltbot-alpha-secret-2024'`.
2. **`JWT_SECRET` facultatif** (`server.py:44-47`) : généré aléatoirement à chaque démarrage s'il manque → toutes les sessions sautent à chaque redéploiement Railway.
3. **Tokens OAuth stockés en clair** (`qonto_tokens`, `gmail_credentials`, `drive_credentials`) — `token_encryption.py` existe mais n'est pas utilisé partout.
4. **`pdf_tokens` sans expiration** — un lien PDF reste valide indéfiniment.
5. **Pas de rate limiting** sur les endpoints publics (chat public, multilink, transfers).
6. **Backups** : BackupManager présent mais pas de sauvegarde automatique visible en prod. Après l'incident de juin (suppression d'une vraie facture), c'est le risque n° 1.
7. **`db.quotes` vs `db.invoices`** : les devis vivent dans `invoices` (type devis) mais une collection `quotes` héritée existe encore — source de confusion pour humains et pour Néo.

---

## 6. Plan de refonte par étapes

Ordre conforme au brief (a → g), chaque lot livrable et testé indépendamment. Complexité : S < M < L < XL.

### Lot A — Fiabilisation + socle sécurité (M)
- A1. `JWT_SECRET` obligatoire (échec explicite au boot si absent en prod) — S
- A2. Purge des secrets en dur (Qonto, Stripe, MoltBot) + consigne de rotation pour Léo — S
- A3. Expiration des `pdf_tokens` — S
- A4. Code-splitting par route (React.lazy sur les 21 pages admin + site public) — M
- A5. Tests : smoke tests de la couche outils Néo (registre, garde-fous, crm_delete unicité, whitelists) — M
- A6. Backup : activer une sauvegarde périodique réelle (ou documenter le plan Railway/Atlas) — M

### Lot B — Socle multi-agents Néo (L)
- B1. Éclater `neo_assistant.py` en package `backend/neo/` : `brains.py` (passerelle Gemini/Claude), `tools/` (registre + exécuteurs par domaine : contacts, finance, tâches, docs, mémoire, générique), `orchestrator.py` (boucles), `guardrails.py`, `routes.py` — sans changement de comportement (mêmes endpoints, mêmes events SSE).
- B2. Orchestrateur + sous-agents : Neo Core planifie et délègue à des sous-agents spécialisés (Recherche/Données, Actions, Commercial/Pipeline, Communication, Veille, Trésorerie) — chaque sous-agent = prompt dédié + sous-ensemble d'outils + modèle adapté (Flash pour lookup, Claude pour jugement). Timeline des étapes exposée dans les events SSE existants.
- B3. Dépréciation MoltBot/ai_enhanced : rapatrier les exécuteurs encore importés, geler les routes legacy.
- B4. MAX_ITERS 6 → 10 + budget d'outils par tour.

### Lot C — Langage naturel + actions (M)
- C1. UI mémoire : page « Ce que Néo sait » (consulter/corriger/supprimer `neo_memory`).
- C2. Gmail en contexte optionnel automatique (résumé inbox dans le check-in).
- C3. Réconciliation `quotes`/`invoices` (migration douce + suppression de l'ambiguïté dans les outils).

### Lot D — Parcours CRM clés (L)
- D1. **Pipeline kanban** : nouvelle page `/admin/pipeline` (colonnes `pipeline_columns`, drag-drop dnd-kit animé, montants pondérés par probabilité, création rapide, lien contact/devis). Néo y gagne l'outil `move_deal`.
- D2. Virtualisation des grandes listes (contacts, factures).
- D3. Recherche globale ⌘K étendue (deals, tâches, documents, pages).
- D4. Reporting : vue santé portefeuille (health score visuel, top risques, top opportunités).

### Lot E — Proactivité (M)
- E1. Moteur de signaux planifié (APScheduler déjà présent) : deal qui stagne, facture en retard, relance oubliée, lead chaud sans suite, anomalie tréso.
- E2. Notifications actionnables (in-app + WhatsApp existant) avec action en 1 clic (Valider la relance → passe par `neo_pending_actions`).
- E3. Règles configurables (seuils par type de signal).

### Lot F — Interface immersive (M)
- F1. Timeline visuelle des étapes quand Néo enchaîne (le flux SSE `tool` existe déjà — il faut le rendre spectaculaire : HUD, états écoute/réflexion/action/terminé).
- F2. Polish orbe/HUD (anneaux, scan, particules discrètes), cohérence CRM ↔ Néo, `prefers-reduced-motion` partout.
- F3. Skeletons de chargement unifiés, micro-interactions cartes/boutons.

### Lot G — Voix (S/M)
- G1. Raffinements du vocal existant (déjà bon) : visuels contextuels sur chaque énoncé (brief mémoire), mot d'activation si faisable proprement.

### Garde-fous de chantier (permanents)
- **Aucune donnée de test créée/supprimée en prod** (leçon de l'incident de juin).
- Chaque lot : code review, tests, commit atomique, pas de régression sur l'existant.
- Le front dev pointe sur l'API de prod → vérifications front en lecture seule uniquement.

---

## 7. Décisions prises (carte blanche)

1. **On ne réécrit pas le CRM, on le consolide.** Le design system et 80 % des parcours sont bons ; réécrire serait le meilleur moyen de casser l'existant.
2. **Intégration Néo = les deux** : l'overlay global existant (orbe + panneau) reste le mode courant, la page `/admin/neo` reste le QG immersif. C'est l'architecture actuelle, elle est saine.
3. **Multi-agents par spécialisation d'outils et de prompts**, pas par processus séparés : même boucle SSE, sous-agents = configurations (modèle + outils + prompt) orchestrées par Neo Core. Extensible sans tout réécrire, et pas de latence d'infra en plus.
4. **MoltBot et ai_enhanced sont dépréciés** au profit de Néo (routes gelées puis retirées après période d'observation).
5. **Priorité produit n° 1 côté CRM : le pipeline kanban** — c'est le seul parcours commercial clé totalement absent.
