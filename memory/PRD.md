# Alpha Agency CRM - MoltBot

## Vue d'ensemble
CRM complet avec assistant IA MoltBot, intégrations multiples, et analytics avancées.

**Dernière mise à jour**: 4 Février 2026

## Fonctionnalités Implémentées

### 1. MoltBot Intelligent ✅ (AMÉLIORÉ)
- Chat IA conversationnel (Gemini)
- **Requêtes CRM intelligentes** : "Combien de clients ce mois-ci?", "Résume mon activité"
- Recherche automatique dans contacts, devis, factures
- Réponses contextuelles avec données CRM en temps réel
- **Route**: `/api/moltbot/chat`
- **Frontend**: `/admin/moltbot`

### 2. Notifications Push en Temps Réel ✅ (NOUVEAU)
- WebSocket pour notifications instantanées
- Types : nouveau lead, paiement reçu, email traité, Voice-CRM, alerte churn
- Préférences utilisateur configurables
- Son de notification (activable/désactivable)
- **Route**: `/api/notifications/*`
- **WebSocket**: `/api/notifications/ws/{user_id}`
- **Frontend**: Icône cloche dans le header

### 3. Gmail Integration ✅
- OAuth 2.0 avec scope complet
- Nettoyage intelligent (Soft/Medium/Hard)
- Désabonnement automatique newsletters
- Interface compacte dans sidebar MoltBot
- **Route**: `/api/moltbot/gmail/*`
- **Redirect URI Production**: `https://alphagency.fr/api/moltbot/gmail/callback`

### 4. Voice-to-CRM ✅
- Transcription audio via Whisper
- Création automatique via IA : contacts, tâches, notes, RDV, devis
- **Interface dédiée**: `/admin/voice-crm`
- Exemples de commandes vocales
- Saisie manuelle possible
- **Route**: `/api/audio/voice-to-crm`

### 5. Email Nurturing (Séquences) ✅
- Création de séquences email automatisées
- Triggers : lead créé, score, inactivité, devis envoyé
- Templates prédéfinis
- Personnalisation {{first_name}}, {{company}}
- **Route**: `/api/nurturing/*`
- **Frontend**: `/admin/nurturing`

### 6. Lead Scoring & Alertes Churn ✅
- Scores 0-100 basés sur profil, engagement, activité
- Détection clients à risque
- Widgets dashboard
- **Route**: `/api/analytics/lead-scores`, `/api/analytics/churn-alerts`

### 7. Analytics PDF ✅
- Rapports PDF téléchargeables
- **Route**: `/api/reports/analytics-pdf`

### 8. Multi-Platform Preview ✅
- Facebook, Instagram, LinkedIn, Twitter, TikTok
- **Route**: `/api/social/preview`

### 9. Instagram Story Editor ✅
- Éditeur visuel WYSIWYG avec stickers drag-and-drop

### 10. WhatsApp Integration ✅
- Baileys + commandes avancées + envoi PDF

## Routes Frontend
| Route | Description |
|-------|-------------|
| `/admin/moltbot` | Assistant IA + Gmail + Chat intelligent |
| `/admin/voice-crm` | Voice-to-CRM - création vocale |
| `/admin/nurturing` | Séquences email automatisées |
| `/admin/campagnes` | Campagnes marketing (Email/SMS) |
| `/admin/campaigns` | Alias anglais pour campagnes |
| `/admin/whatsapp` | Configuration WhatsApp |
| `/admin/blog` | Gestion des articles |

## APIs Principales

### MoltBot Chat Intelligent
```
POST /api/moltbot/chat
Body: { "message": "Combien de clients ce mois-ci?" }
Headers: X-MoltBot-Secret: moltbot-alpha-secret-2024
```

### Notifications
```
GET  /api/notifications/              # Lister notifications
POST /api/notifications/              # Créer notification
PUT  /api/notifications/{id}/read     # Marquer lu
PUT  /api/notifications/read-all      # Tout marquer lu
DELETE /api/notifications/{id}        # Supprimer
GET  /api/notifications/preferences   # Préférences
WebSocket: /api/notifications/ws/{user_id}
```

### Nurturing
```
POST /api/nurturing/sequences        # Créer séquence
GET  /api/nurturing/sequences        # Lister séquences
POST /api/nurturing/enroll           # Inscrire contact
```

## Documentation
- **Blog API pour n8n**: `/app/docs/API_BLOG_N8N.md`

## Configuration Production
```env
GMAIL_REDIRECT_URI=https://alphagency.fr/api/moltbot/gmail/callback
BREVO_API_KEY=votre_clé_api
```

## Credentials Test
- Email: admin@alphagency.fr
- Password: Test123!
- MoltBot Secret: moltbot-alpha-secret-2024

## Tests (Iteration 53)
- Backend: 100% (15/15 tests)
- Frontend: 100% (toutes pages fonctionnelles)

## Tâches Archivées (P2 - pour plus tard)
- UI Preview Multi-Plateformes
- Dashboard Analytics Avancé
