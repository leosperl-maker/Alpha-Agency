# Alpha Agency CRM - MoltBot

## Vue d'ensemble
CRM complet avec assistant IA MoltBot, intégrations multiples, et analytics avancées.

**Dernière mise à jour**: 6 Février 2026

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
- **Services préenregistrés** - Utilise les services du CRM avec prix et DESCRIPTION COMPLÈTE
- **Création CRM par message** - Devis, factures, contacts, tâches via langage naturel
- **Questions intelligentes** - Demande les infos manquantes (email, SIRET, etc.) avant création
- **TVA correcte** - Utilise le taux configuré (8.5%) pas 20%
- **Génération d'images** - Nano Banana (Gemini) intégré
- **Envoi de fichiers CRM** - PDF, images, documents
- **Génération PDF automatique** - Les devis créés sont générés en PDF et uploadés sur Cloudinary
- **Analyse d'images** - Vision IA sur images reçues
- **Analyse de documents** - PDF avec extraction de texte (PyMuPDF)
- **Analyse de vidéos COMPLÈTE** - Analyse visuelle + transcription audio ✅ NOUVEAU
- **Transcription audio** - Messages vocaux via Whisper (OGG→MP3 auto-conversion)
- **Recherche de documents** - Cherche par titre et contenu
- **Programmation réseaux sociaux** - Peut programmer des posts Instagram/Facebook
- **Classification de fichiers** - Classe les fichiers reçus dans le CRM
- **Rappels RDV automatiques** - Notification WhatsApp 30 min avant chaque RDV ✅ NOUVEAU
- **Notifications de publication** - Notification quand un post programmé est publié ✅ NOUVEAU

### Actions MoltBot Disponibles (28 au total)
1. CREATE_QUOTE_WITH_SERVICES - Créer devis avec services
2. SEND_QUOTE - Chercher et envoyer DEVIS uniquement (DEV-xxx) ✅ NOUVEAU
3. SEND_INVOICE - Chercher et envoyer FACTURE uniquement (FAC-xxx) ✅ AMÉLIORÉ
4. CREATE_CONTACT - Créer contact
5. UPDATE_CONTACT - Modifier contact
6. CREATE_TASK - Créer tâche
7. UPDATE_TASK - Modifier tâche
8. CREATE_APPOINTMENT - Créer RDV
9. LIST_APPOINTMENTS - Lister RDV
10. CREATE_OPPORTUNITY - Créer affaire pipeline
11. UPDATE_OPPORTUNITY - Modifier affaire
12. LIST_OPPORTUNITIES - Lister affaires
13. CREATE_BLOG_POST - Créer article blog simple
14. CREATE_BLOG_WITH_AI - Créer article complet avec IA (contenu + image) ✅ NOUVEAU
15. CREATE_EDITORIAL - Ajouter au calendrier éditorial
16. CREATE_MULTILINK - Créer page multilink
17. SEND_FILE - Chercher et envoyer fichier avec filtre type (image/pdf/excel/ppt) ✅ AMÉLIORÉ
18. SEND_DOCUMENT - Chercher et envoyer document
19. GENERATE_IMAGE - Générer image IA
20. GET_ANALYTICS - Voir statistiques
21. SEARCH_CRM - Recherche globale améliorée (contacts + factures via contact_id) ✅ AMÉLIORÉ
22. ANALYZE_WEBSITE - Analyser site web
23. CREATE_USER - Créer utilisateur
24. SEARCH_COMPANY - Recherche Societe.com
25. IMPORT_DRIVE - Importer fichiers Google Drive
26. SCHEDULE_SOCIAL_POST - Programmer post réseaux sociaux
27. LIST_SOCIAL_POSTS - Lister posts programmés
28. CLASSIFY_FILE - Classer fichier reçu

### Scheduler MoltBot - Tâches automatiques
| Tâche | Fréquence | Description |
|-------|-----------|-------------|
| Morning Briefing | 8h00 Lun-Ven | Résumé du jour (tâches, RDV, leads) |
| Evening Recap | 18h00 Lun-Ven | Bilan de la journée |
| Overdue Tasks | Toutes les 2h | Alerte tâches en retard |
| **Appointment Reminders** | Toutes les 5 min | Rappel 30 min avant chaque RDV ✅ NOUVEAU |
| **Publication Notifications** | Toutes les 10 min | Notification quand post publié ✅ NOUVEAU |

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

## Intégration Societe.com ✅

### Backend API
- `GET /api/societe/search/company?q={query}` - Recherche entreprise par nom
- `POST /api/societe/search/dirigeant` - Recherche par nom de dirigeant
- `GET /api/societe/company/{siret_or_siren}` - Détails entreprise + dirigeants + bilans
- `GET /api/societe/company/{siret}/financials` - Données financières uniquement

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
| `/admin/editorial` | Calendrier éditorial (posts sociaux) |

---

## Tâches Restantes

### P0 - Critique
- ⬜ **Stabilité service Railway WhatsApp** - Code v2.0 fourni dans `/app/docs/MISE_A_JOUR_INDEX_JS_RAILWAY.md`, en attente de déploiement utilisateur

### P1 - Important
- ⬜ **API Blog pour n8n** - Modifier `/app/backend/routes/blog.py` selon spec `content_blocks`

### P2 - Backlog
- ⬜ Analytics avec alertes configurables
- ⬜ UI Preview Multi-Plateformes

---

## Credentials Test
- Email: `admin@alphagency.fr`
- Password: `Test123!`
- Admin WhatsApp: `+596696447353`

---

## Documentation
- `/app/docs/MISE_A_JOUR_INDEX_JS_RAILWAY.md` - Guide mise à jour Railway v2.0 (MISE À JOUR)
- `/app/docs/GUIDE_DOMAINE_PERSONNALISE_MULTILINK.md` - Domaines personnalisés
