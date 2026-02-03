# Alpha Agency CRM - MoltBot

## Vue d'ensemble
CRM complet avec assistant IA MoltBot, intégrations multiples, et analytics avancées.

**Dernière mise à jour**: 3 Février 2026

## Fonctionnalités Implémentées

### 1. Gmail Integration ✅
- OAuth 2.0 avec scope complet
- Nettoyage intelligent (Soft/Medium/Hard)
- Désabonnement automatique newsletters
- Liste blanche emails critiques
- Interface frontend dans MoltBot
- **Route**: `/api/moltbot/gmail/*`
- **Frontend**: `/admin/moltbot` (section Gmail)

### 2. Voice-to-CRM ✅ (NOUVEAU)
- Transcription audio via Whisper
- Création automatique via IA : contacts, tâches, notes, RDV, devis
- **Interface dédiée**: `/admin/voice-crm`
- Exemples de commandes vocales
- Saisie manuelle possible
- **Route**: `/api/audio/voice-to-crm`

### 3. Lead Scoring ✅
- Scores 0-100 basés sur profil, engagement, activité
- Grades A/B/C/D/F
- Widget dashboard "Leads Chauds"
- **Route**: `/api/analytics/lead-scores`

### 4. Alertes Churn ✅
- Détection clients à risque (critical/high/medium/low)
- Widget dashboard "Alertes Churn"
- **Route**: `/api/analytics/churn-alerts`

### 5. Analytics PDF ✅
- Rapports PDF téléchargeables
- Périodes : semaine, mois, trimestre, année
- **Route**: `/api/reports/analytics-pdf`

### 6. Multi-Platform Preview ✅
- Facebook, Instagram, LinkedIn, Twitter, TikTok
- Validation limites caractères
- Suggestions hashtags IA
- **Route**: `/api/social/preview`

### 7. Email Nurturing (Séquences) ✅
- Création de séquences email automatisées
- Triggers : lead créé, score, inactivité, devis envoyé
- Templates prédéfinis
- Personnalisation {{first_name}}, {{company}}
- **Route**: `/api/nurturing/*`

### 8. Instagram Story Editor ✅
- Éditeur visuel WYSIWYG
- Stickers drag-and-drop
- Multi-comptes

### 9. WhatsApp Integration ✅
- Baileys (connecté)
- Commandes avancées + envoi PDF

## Dashboard Widgets
- **Leads Chauds** : Affiche les leads avec score ≥ 60
- **Alertes Churn** : Affiche les clients à risque

## APIs Principales

### Nurturing
```
POST /api/nurturing/sequences        # Créer séquence
GET  /api/nurturing/sequences        # Lister séquences
PUT  /api/nurturing/sequences/{id}   # Modifier séquence
POST /api/nurturing/sequences/{id}/activate # Activer
POST /api/nurturing/enroll           # Inscrire un contact
GET  /api/nurturing/enrollments      # Lister inscriptions
GET  /api/nurturing/templates        # Templates email
GET  /api/nurturing/analytics        # Statistiques
```

### Analytics
```
GET /api/analytics/lead-scores       # Tous les scores
GET /api/analytics/churn-alerts      # Alertes churn
GET /api/analytics/dashboard         # Dashboard complet
GET /api/reports/analytics-pdf       # Télécharger PDF
```

### Gmail
```
GET  /api/moltbot/gmail/auth         # OAuth
POST /api/moltbot/gmail/clean        # Nettoyer
POST /api/moltbot/gmail/unsubscribe  # Désabonner
```

## Configuration Production

Pour Gmail :
```
GMAIL_REDIRECT_URI=https://alphagency.fr/api/moltbot/gmail/callback
```

Pour Brevo (Email nurturing) :
```
BREVO_API_KEY=votre_clé_api
SENDER_EMAIL=contact@alphagency.fr
```

## Credentials
- Email: admin@alphagency.fr
- Password: Test123!

## Tests
- Backend: 100% validé
- Frontend: 100% validé
- Dashboard widgets: Visible et fonctionnel

## Routes Frontend
| Route | Description |
|-------|-------------|
| `/admin/voice-crm` | Voice-to-CRM - création vocale |
| `/admin/nurturing` | Séquences email automatisées |
| `/admin/campagnes` | Campagnes marketing (Email/SMS) |
| `/admin/campaigns` | Alias anglais pour campagnes |
| `/admin/moltbot` | Assistant IA + Gmail |
| `/admin/whatsapp` | Configuration WhatsApp |

## Documentation API
- **Blog API pour n8n**: `/app/docs/API_BLOG_N8N.md`

## Tâches Archivées (pour plus tard)
- UI Preview Multi-Plateformes (P2)
