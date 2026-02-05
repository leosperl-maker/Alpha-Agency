# Alpha Agency CRM - MoltBot

## Vue d'ensemble
CRM complet avec assistant IA MoltBot, intégrations multiples, et analytics avancées.

**Dernière mise à jour**: 5 Février 2026

## Fonctionnalités Implémentées

### 1. MoltBot Intelligent ✅
- Chat IA conversationnel (Gemini)
- Requêtes CRM : "Combien de clients?", "Résume mon activité"
- Recherche automatique dans contacts, devis, factures
- Résumé quotidien par WhatsApp (déjà actif)
- **Route**: `/api/moltbot/chat`
- **Frontend**: `/admin/moltbot`

### 2. Dashboard Analytics Avancé ✅ (NOUVEAU)
- 4 KPIs avec comparaison période précédente
- Graphique évolution CA
- Entonnoir des leads avec taux de conversion
- Top Clients par CA
- Timeline activité récente
- Filtres : aujourd'hui, semaine, mois, trimestre, année
- Export CSV/JSON
- **Route**: `/api/analytics/*`
- **Frontend**: `/admin/analytics-dashboard`

### 3. Notifications Push en Temps Réel ✅
- WebSocket pour notifications instantanées
- Types : nouveau lead, paiement, email traité, Voice-CRM, churn
- **Route**: `/api/notifications/*`
- **WebSocket**: `/api/notifications/ws/{user_id}`

### 4. Gmail Integration ✅
- OAuth 2.0 complet
- Nettoyage intelligent (Soft/Medium/Hard)
- Désabonnement automatique newsletters
- Liste blanche emails importants
- Interface compacte dans sidebar MoltBot
- **Route**: `/api/moltbot/gmail/*`
- **Redirect URI Production**: `https://alphagency.fr/api/moltbot/gmail/callback`

### 5. Voice-to-CRM ✅
- Transcription audio via Whisper
- Création automatique : contacts, tâches, notes, RDV, devis
- **Frontend**: `/admin/voice-crm`
- **Route**: `/api/audio/voice-to-crm`

### 6. Email Nurturing ✅
- Séquences email automatisées
- Templates prédéfinis
- **Frontend**: `/admin/nurturing`

### 7. Instagram Stories ✅
- Éditeur visuel avec stickers
- Automation Playwright
- **Note**: Peut être rate-limité (429) sur certains serveurs
- **Frontend**: `/admin/instagram-stories`

### 8. Lead Scoring & Alertes Churn ✅
- Scores 0-100
- Widgets dashboard

## Routes Frontend
| Route | Description |
|-------|-------------|
| `/admin/analytics-dashboard` | Dashboard Analytics avancé |
| `/admin/moltbot` | Assistant IA + Gmail |
| `/admin/voice-crm` | Voice-to-CRM |
| `/admin/nurturing` | Séquences email |
| `/admin/instagram-stories` | Stories Instagram |
| `/admin/campagnes` | Campagnes Email/SMS |

## APIs Analytics
```
GET /api/analytics/dashboard      # KPIs principaux
GET /api/analytics/revenue-chart  # Graphique CA
GET /api/analytics/leads-funnel   # Entonnoir leads
GET /api/analytics/top-clients    # Meilleurs clients
GET /api/analytics/activity-timeline  # Activité récente
GET /api/analytics/kpi-trends     # Tendances 12 mois
GET /api/analytics/export         # Export CSV/JSON
```

## Configuration Production
```env
GMAIL_REDIRECT_URI=https://alphagency.fr/api/moltbot/gmail/callback
```

## Credentials Test
- Email: admin@alphagency.fr
- Password: Test123!

## Tests (Iteration 54)
- Backend: 100% (27/27)
- Frontend: 100%

## Notes Instagram Stories
L'automation peut recevoir une erreur 429 (rate limit) d'Instagram sur certains serveurs. Les messages d'erreur sont maintenant en français et explicites:
- "⚠️ Instagram limite les connexions depuis ce serveur..."
- "🔐 Instagram demande une vérification de sécurité..."
- "🔑 Authentification à deux facteurs requise..."

## Tâches Archivées (P2)
- UI Preview Multi-Plateformes

---

## WhatsApp MoltBot - Assistant IA (ClawdBot) ✅

### Fonctionnalités Implémentées
- **Chat conversationnel IA** - Répond naturellement comme ChatGPT
- **Création CRM par message** - Devis, factures, contacts, tâches via langage naturel
- **Génération d'images** - Nano Banana (Gemini) intégré
- **Envoi de fichiers CRM** - PDF, images, documents
- **Analyse d'images** - Vision IA sur images reçues ✅ TESTÉ
- **Analyse de documents** - PDF avec extraction de texte (PyMuPDF) ✅ TESTÉ
- **Analyse de vidéos** - Extraction de frame et analyse ✅ TESTÉ
- **Transcription audio** - Messages vocaux via Whisper (OGG→MP3 auto-conversion) ✅ TESTÉ

### Architecture
- **Service WhatsApp**: Hébergé sur **Railway** (Node.js/Baileys)
- **Backend CRM**: FastAPI `/api/whatsapp/webhook`
- **Repo GitHub**: `leosperl-maker/whatsapp-moltbot`

### Variables d'environnement
```env
WHATSAPP_SERVICE_URL=https://whatsapp-moltbot-production.up.railway.app
BACKEND_WEBHOOK_URL=https://crmalphaagency-f7ab9328.svc-us5.zcloud.ws/api/whatsapp/webhook
```

### Tâches Restantes
1. **(P0) Mettre à jour `index.js` sur GitHub** - Voir `/app/docs/MISE_A_JOUR_INDEX_JS_RAILWAY.md`
2. **(P1) API Blog pour n8n** - Modifier `/app/backend/routes/blog.py` selon spec `content_blocks`
3. **(P1) Résumé quotidien WhatsApp** - Tâche planifiée

### Documentation
- `/app/docs/MISE_A_JOUR_INDEX_JS_RAILWAY.md` - Guide mise à jour Railway
- `/app/docs/GUIDE_DOMAINE_PERSONNALISE_MULTILINK.md` - Domaines personnalisés
