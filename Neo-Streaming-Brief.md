# 🧠 NÉO — Brief : streaming complet du chat (« il parle pendant qu'il fait »)

> Brief auto-suffisant pour une **session Claude Code fraîche**. Objectif : refondre le chat de Néo en **flux temps réel** (le texte s'affiche au fur et à mesure + les étapes d'outils s'affichent en direct), pour le chat texte ET le mode vocal. À faire **étape par étape, build/déploiement à chaque étape**. Ne PAS casser ce qui marche déjà.

## Pourquoi une session fraîche
La session qui a tout construit (cerveau, page Néo, vocal, couverture CRM, fixes) était devenue très chargée — c'est le contexte qui avait introduit un crash. Ce refactor touche le **cœur de Néo (`run_neo`)**, déployé et fonctionnel. On le fait au propre, à froid.

## État actuel (non-streaming) — à connaître
- **Endpoint** : `POST /api/neo/chat` dans `backend/routes/neo_assistant.py`.
  - Route vers `run_neo()` (cerveau **Gemini**, défaut) ou `run_neo_claude()` (cerveau **Claude**, si `brain="claude"`).
  - `run_neo` : boucle agentique (`MAX_ITERS = 6`). À chaque tour : `_gemini_call(contents, system)` → si `resp.function_calls` → `execute_tool(name, args, uid)` pour chacun → on rejoue le tour avec les `function_response` → … jusqu'à une réponse texte. Retourne un **dict d'un coup** : `{"message", "available", "pending_actions", "actions_done"}`.
  - Modèles : chaîne de repli `NEO_MODELS` (gemini-2.5-flash…). Appel via `_client.models.generate_content(...)` (lib `google.genai`, client `_client`, types `_t`).
- **Garde-fous (NE PAS CASSER)** : `execute_tool` — si l'outil a `validation=True` (send_followup, merge_contacts, crm_delete) et `confirmed=False`, il crée une `db.neo_pending_actions` et renvoie `{"pending": True, "action_id": ...}`. Le front affiche Valider/Annuler ; `POST /neo/confirm-action` exécute après accord. Ce mécanisme doit rester identique en streaming.
- **Front** :
  - `frontend/src/components/AssistantChat.jsx` → `send()` fait `neoAPI.chat(...)` (axios POST, `frontend/src/lib/api.js` ligne ~425) et affiche la réponse d'un bloc. Il y a déjà un **chrono "Néo réfléchit… Xs"** et un **bouton Stop** (AbortController) à recâbler sur le flux.
  - `frontend/src/components/NeoVoiceMode.jsx` → `handleUtterance()` même appel (avec `mode:"voice"`), puis `speak(reply)` (TTS ElevenLabs via `POST /neo/tts`). Latence actuelle : le TTS attend toute la réponse → le streaming + TTS par phrases la réduira.

## Architecture cible

### Backend
1. **Nouvel endpoint** `POST /neo/chat/stream` (garder `/neo/chat` intact en fallback). Renvoie une `StreamingResponse(media_type="text/event-stream")`, chaque événement = `data: {json}\n\n`.
2. **Refactorer en générateur async** `run_neo_stream(messages, user_id, voice, attachments)` qui `yield` ces events :
   - `{"type":"tool","name":"create_quote","phase":"start"}` — avant l'exécution d'un outil
   - `{"type":"tool","name":"create_quote","phase":"done","ok":true,"label":"Devis créé"}` — après
   - `{"type":"text","delta":"…"}` — fragments de texte (utiliser **`_client.models.generate_content_stream(...)`** au lieu de `generate_content`)
   - `{"type":"pending","action_id":…,"name":…,"args":…}` — action à valider
   - `{"type":"done","actions_done":[…],"pending_actions":[…]}` — fin
   - `{"type":"error","detail":"…"}`
   - Logique : garder la boucle `MAX_ITERS`. À chaque tour, streamer la génération ; accumuler les `function_calls` ; s'il y en a → yield `tool start`, `execute_tool`, yield `tool done`, rejouer ; sinon → les `text.delta` sont le texte final, puis `done`.
3. **Garde-fous inchangés** : `execute_tool` gère toujours la validation ; un `pending` devient un event `{"type":"pending",...}` (ne pas exécuter l'action sortante dans le flux).
4. (V2) Faire pareil pour `run_neo_claude` (l'API Anthropic supporte `stream:true`). Pour la V1, on peut router `brain="claude"` vers le non-stream.

### Frontend
1. `lib/api.js` : ajouter `streamChat(data, { signal, onEvent })` en **fetch natif** (pas axios) : `fetch('/neo/chat/stream', {method:POST, body, signal})`, puis `response.body.getReader()` + `TextDecoder`, parser les lignes `data: …`, appeler `onEvent(JSON.parse(...))`. Respecter le `baseURL`/token d'axios (réutiliser le même header Authorization).
2. `AssistantChat.send()` : remplacer l'appel bloquant par `streamChat` :
   - sur `text.delta` → append au message assistant en cours (il s'écrit).
   - sur `tool` → afficher une ligne d'étape live ("⚙️ Néo crée le devis…").
   - sur `done` → figer `actions_done` / `pending` (boutons Valider/Annuler comme aujourd'hui).
   - le **bouton Stop** appelle `abort()` → `reader.cancel()`.
   - Garder un **fallback** vers l'ancien `neoAPI.chat` si le stream échoue.
3. `NeoVoiceMode.handleUtterance()` : idem ; en vocal, déclencher le TTS quand le texte est complet (V2 : par phrases dès le 1er point, pour parler plus tôt).

## Étapes (ordre, build à chaque)
1. **Backend** : `run_neo_stream` (Gemini) + endpoint `/neo/chat/stream`. Tester avec `curl -N` (voir les events couler).
2. **Front chat** : `streamChat` dans api.js + brancher `AssistantChat.send()` (texte progressif + étapes + Stop). `npm run build`.
3. **Front vocal** : brancher `NeoVoiceMode`. `npm run build`.
4. **V2** : streaming Claude ; TTS par phrases.

## Garde-fous & pièges
- NE PAS supprimer `/neo/chat` (fallback).
- Les actions à validation (send_followup, merge_contacts, crm_delete) passent TOUJOURS par le pending — jamais d'exécution directe.
- Abort propre (front `reader.cancel()` ; côté serveur le générateur s'arrête quand le client ferme).
- Vérifier après chaque étape : le chat répond (texte qui s'écrit), les actions à valider s'affichent, le mode vocal parle.

## Fichiers
- `backend/routes/neo_assistant.py` — `run_neo` (réf), nouveau `run_neo_stream`, endpoint `/neo/chat/stream`.
- `frontend/src/lib/api.js` — `streamChat`.
- `frontend/src/components/AssistantChat.jsx` — `send()` en streaming.
- `frontend/src/components/NeoVoiceMode.jsx` — `handleUtterance()` en streaming.

## Déploiement
Commits directs sur `main` (Railway déploie automatiquement via GitHub). Build front = `CI=false npm run build` dans `frontend/` pour valider avant push.
