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

### 2. Dashboard Analytics Avancé ✅
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

---

## WhatsApp MoltBot - Assistant IA (ClawdBot) ✅

### Fonctionnalités Implémentées
- **Chat conversationnel IA** - Répond naturellement avec mémoire de conversation
- **Services préenregistrés** - Utilise les services du CRM avec prix et **DESCRIPTION COMPLÈTE** ✅ CORRIGÉ
- **Création CRM par message** - Devis, factures, contacts, tâches via langage naturel
- **Questions intelligentes** - Demande les infos manquantes (email, SIRET, etc.) avant création
- **TVA correcte** - Utilise le taux configuré (8.5%) pas 20%
- **Génération d'images** - Nano Banana (Gemini) intégré
- **Envoi de fichiers CRM** - PDF, images, documents
- **Génération PDF automatique** - Les devis créés sont générés en PDF et uploadés sur Cloudinary ✅ NOUVEAU
- **Analyse d'images** - Vision IA sur images reçues ✅
- **Analyse de documents** - PDF avec extraction de texte (PyMuPDF) ✅
- **Analyse de vidéos** - Extraction de frame et analyse ✅
- **Transcription audio** - Messages vocaux via Whisper (OGG→MP3 auto-conversion) ✅
- **Recherche de documents** - Cherche par titre et contenu

### Architecture
- **Service WhatsApp**: Hébergé sur **Railway** (Node.js/Baileys)
- **Backend CRM**: FastAPI `/api/whatsapp/webhook`
- **Repo GitHub**: `leosperl-maker/whatsapp-moltbot`

### Variables d'environnement
```env
WHATSAPP_SERVICE_URL=https://whatsapp-moltbot-production.up.railway.app
BACKEND_WEBHOOK_URL=https://alphagency.fr/api/whatsapp/webhook  # PRODUCTION
```

⚠️ **IMPORTANT**: L'URL Railway doit pointer vers **alphagency.fr** (production), PAS vers l'URL preview.

---

## Intégration Societe.com ✅ NOUVEAU

### Backend API
- `GET /api/societe/search/company?q={query}` - Recherche entreprise par nom
- `POST /api/societe/search/dirigeant` - Recherche par nom de dirigeant
- `GET /api/societe/company/{siret_or_siren}` - Détails entreprise + dirigeants + bilans
- `GET /api/societe/company/{siret}/financials` - Données financières uniquement

### Frontend
- **Champ SIRET/SIREN** ajouté au formulaire de contact
- **Onglet "Finances"** dans ContactDetailSheet - affiche les bilans publics quand le SIRET est renseigné
- Lien vers Societe.com pour plus de détails

### Clé API
```env
SOCIETE_API_KEY=6324e71a28971350a9ea387c82c5ff65
```

---

## Intégration Google Drive ✅

### Backend API
- `GET /api/gdrive/auth` - Démarrer OAuth
- `GET /api/gdrive/auth/callback` - Callback OAuth
- `GET /api/gdrive/files` - Lister fichiers
- `POST /api/gdrive/import` - Importer fichiers avec classification IA

### Frontend
- **Bouton "Connect Google Drive"** sur `/admin/moltbot`
- Commande WhatsApp: `"Importe mes fichiers de Drive"`

### Status
- En attente de connexion OAuth par l'utilisateur

---

## Routes Frontend
| Route | Description |
|-------|-------------|
| `/admin/analytics-dashboard` | Dashboard Analytics avancé |
| `/admin/moltbot` | Assistant IA + Gmail + Google Drive |
| `/admin/voice-crm` | Voice-to-CRM |
| `/admin/nurturing` | Séquences email |
| `/admin/instagram-stories` | Stories Instagram |
| `/admin/campagnes` | Campagnes Email/SMS |
| `/admin/contacts` | Gestion contacts + Finances |

---

## Tâches Restantes

### P0 - Critique
- ⬜ **API Blog pour n8n** - Modifier `/app/backend/routes/blog.py` selon spec `content_blocks`

### P1 - Important
- ⬜ **Résumé quotidien WhatsApp** - Tâche planifiée automatique

### P2 - Backlog
- ⬜ Analytics avec alertes
- ⬜ UI Preview Multi-Plateformes

---

## Credentials Test
- Email: `admin@alphagency.fr`
- Password: `Test123!`
- Admin WhatsApp: `+596696447353`

## Tests (Iteration 55)
- Backend: 93% (13/14 tests)
- Frontend: 100%

---

## Documentation
- `/app/docs/MISE_A_JOUR_INDEX_JS_RAILWAY.md` - Guide mise à jour Railway
- `/app/docs/GUIDE_DOMAINE_PERSONNALISE_MULTILINK.md` - Domaines personnalisés
