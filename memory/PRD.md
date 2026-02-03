# Alpha Agency CRM - MoltBot

## Vue d'ensemble
CRM complet avec assistant IA MoltBot, intégrations multiples (WhatsApp, Gmail, Instagram), et analytics avancées.

## Fonctionnalités Principales

### 1. MoltBot (Assistant IA Admin)
- Chat interface dans `/admin/moltbot`
- Commandes naturelles pour gérer le CRM
- Briefings automatiques matin/soir

### 2. Gmail Integration (NOUVEAU ✅)
- OAuth 2.0 avec scope complet `https://mail.google.com/`
- Nettoyage intelligent (mode Soft/Medium/Hard)
- Désabonnement automatique des newsletters
- Liste blanche pour emails critiques (banques, factures, clients)
- Logs de toutes les actions pour audit/rollback
- **Route**: `/api/moltbot/gmail/*`

### 3. Voice-to-CRM (NOUVEAU ✅)
- Transcription audio via Whisper
- Analyse IA pour créer automatiquement :
  - Contacts
  - Tâches
  - Notes
  - RDV
  - Devis/Factures
- **Route**: `/api/audio/voice-to-crm`

### 4. Lead Scoring (NOUVEAU ✅)
- Score 0-100 basé sur :
  - Profil complet (email, téléphone, entreprise, budget)
  - Engagement (RDV, emails, clics)
  - Activité (devis, factures)
  - Timing (contact récent)
- Grades A/B/C/D/F
- Recommandations automatiques
- **Route**: `/api/analytics/lead-scores`

### 5. Alertes Churn (NOUVEAU ✅)
- Détection des clients à risque
- Niveaux: critical, high, medium, low
- Signaux d'alerte :
  - Aucun contact depuis X jours
  - Factures impayées
  - Baisse des commandes
  - RDV annulés
- Actions recommandées
- **Route**: `/api/analytics/churn-alerts`

### 6. Advanced Analytics PDF (NOUVEAU ✅)
- Rapports PDF générés avec ReportLab
- Périodes : semaine, mois, trimestre, année, custom
- Sections : CA, devis, leads, clients, tâches
- **Route**: `/api/reports/analytics-pdf`

### 7. Multi-Platform Post Preview (NOUVEAU ✅)
- Prévisualisation pour Facebook, Instagram, LinkedIn, Twitter, TikTok
- Validation des limites de caractères
- Suggestions de hashtags IA
- Optimisation de contenu
- **Route**: `/api/social/preview`

### 8. WhatsApp Integration
- **Baileys (Non-officiel)**: Connecté, QR code, commandes
- **Cloud API (Officiel)**: Scaffolding prêt
- Commandes avancées : "crée devis", "envoie facture"
- Envoi de PDF via WhatsApp

### 9. Instagram Story Editor
- Éditeur visuel WYSIWYG avec aperçu téléphone
- Stickers drag-and-drop : Sondage, Question, Quiz, Mention, Lien, Texte
- Multi-comptes
- Programmation

### 10. Agent X (Chatbot Public)
- Widget chat rouge sur le site public
- FAQ automatique, capture de leads

## Architecture

```
/app
├── backend/
│   └── routes/
│       ├── moltbot_gmail.py       # Gmail integration
│       ├── audio_transcription.py # Voice-to-CRM
│       ├── lead_scoring.py        # Lead scores & churn
│       ├── analytics_reports.py   # PDF reports
│       ├── social_preview.py      # Multi-platform preview
│       ├── instagram_story.py     # Story editor
│       ├── whatsapp.py            # WhatsApp Baileys
│       └── ...
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── MoltBotGmailSection.jsx
│       │   └── StoryEditor.jsx
│       └── pages/
│           └── dashboard/
│               ├── MoltBotPage.jsx
│               ├── InstagramStoryPage.jsx
│               └── ...
└── whatsapp-service/
    └── index.js
```

## Changelog

### 2026-02-03 (Session 8)

#### ✅ Gmail Integration
- OAuth 2.0 complet avec scope `https://mail.google.com/`
- Nettoyage intelligent (label + archive, jamais de suppression directe)
- Désabonnement via List-Unsubscribe header
- Liste blanche automatique (banques, admin, clients)
- UI dans MoltBot page

#### ✅ Voice-to-CRM
- Transcription + analyse IA
- Création automatique de contacts, tâches, notes, RDV, devis

#### ✅ Lead Scoring & Churn Alerts
- Algorithme de scoring multi-facteurs
- Détection des clients à risque
- Recommandations et actions

#### ✅ Advanced Analytics PDF
- Génération PDF avec ReportLab
- Rapports CA, leads, clients, tâches

#### ✅ Multi-Platform Preview
- Prévisualisation Facebook, Instagram, LinkedIn, Twitter
- Validation des limites
- Suggestions de hashtags IA

#### ✅ Tests
- Backend: 21/21 (100%)
- Frontend: 100%

### Sessions précédentes
- Instagram Story Editor WYSIWYG
- Fix Playwright
- Fix Meta pagination
- WhatsApp profile management
- Commandes WhatsApp avancées

## APIs Nouvelles

### Gmail
```
GET  /api/moltbot/gmail/auth      # Initier OAuth
GET  /api/moltbot/gmail/callback  # Callback OAuth
GET  /api/moltbot/gmail/status    # Statut connexion
GET  /api/moltbot/gmail/emails    # Lister emails
POST /api/moltbot/gmail/clean     # Nettoyer inbox
POST /api/moltbot/gmail/unsubscribe # Désabonner
POST /api/moltbot/gmail/reply     # Envoyer email
DELETE /api/moltbot/gmail/disconnect # Déconnecter
```

### Voice-to-CRM
```
POST /api/audio/voice-to-crm      # Transcrire et créer entrée CRM
GET  /api/audio/voice-commands    # Historique commandes
```

### Analytics
```
GET  /api/analytics/lead-scores   # Tous les scores
GET  /api/analytics/lead-score/{id} # Score d'un contact
GET  /api/analytics/churn-alerts  # Alertes churn
GET  /api/analytics/dashboard     # Dashboard complet
GET  /api/reports/analytics-pdf   # Télécharger PDF
GET  /api/reports/analytics-json  # Données JSON
```

### Social Preview
```
POST /api/social/preview          # Prévisualiser multi-plateforme
POST /api/social/suggest-hashtags # Suggestions hashtags
GET  /api/social/platform-info    # Infos plateformes
POST /api/social/optimize-content # Optimiser contenu
```

## Configuration Production

Pour déployer en production, ajouter dans `.env` :
```
GMAIL_CLIENT_ID=votre_client_id
GMAIL_CLIENT_SECRET=votre_client_secret
GMAIL_REDIRECT_URI=https://votre-domaine.fr/api/moltbot/gmail/callback
```

Et ajouter l'URI de redirection dans Google Cloud Console.

## Credentials Test
- Email: admin@alphagency.fr
- Password: Test123!

## URLs
- Preview: https://social-command-10.preview.emergentagent.com
- MoltBot: /admin/moltbot
- Instagram Stories: /admin/instagram-stories
- WhatsApp: /admin/whatsapp
