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
