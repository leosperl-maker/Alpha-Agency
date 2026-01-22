# Alpha Agency CRM - Product Requirements Document

## Overview
Application CRM complète pour agence de communication en Guadeloupe (Alpha Agency). Gestion des contacts, leads, facturation, portfolio, blog, calendrier éditorial, et campagnes marketing.

## Core Features

### 1. Dashboard & Analytics ✅
- KPIs principaux
- Graphiques d'évolution
- Notifications

### 2. Contacts Management ✅
- CRUD contacts avec filtres
- Import/export
- Fiche contact avec onglets (Overview, Activité, Affaires, Docs, Éditorial)

### 3. Pipeline (CRM) ✅
- Kanban des opportunités
- Colonnes personnalisables

### 4. Facturation ✅
- Devis et factures PDF
- Paiements partiels (Acompte/Solde)
- CA Encaissé calculé sur total_paid

### 5. Module "Things" ✅
- Liste de tâches journalière
- Report automatique des tâches non terminées

### 6. Module Agenda / RDV ✅
- Google Calendar API (OAuth2)
- Lien Google Meet automatique
- Invitations email avec .ics
- **Configuration Google depuis Paramètres > Intégrations** ✅ 2026-01-21

### 7. Calendrier Éditorial ✅ NEW 2026-01-22
**Multi-calendar system pour planification social media**

#### Backend (`/app/backend/routes/editorial.py`)
- **Collections:** `editorial_calendars`, `editorial_posts`
- **Endpoints:**
  - `GET/POST /api/editorial/calendars` - CRUD calendriers
  - `GET/POST /api/editorial/posts` - CRUD posts
  - `POST /api/editorial/posts/{id}/media` - Upload médias (Cloudinary)
  - `PUT /api/editorial/posts/{id}/move` - Drag & drop
  - `GET /api/editorial/settings` - Réseaux, formats, statuts configurables
  - `GET /api/editorial/contact/{id}/calendars` - Calendriers d'un contact
  - **`POST /api/editorial/ai/assist`** - IA d'aide rédactionnelle (GPT-5.2) ✅
  - **`POST /api/editorial/ai/improve-caption`** - Amélioration de légende ✅

#### IA d'aide rédactionnelle ✅ 2026-01-22
- **Modèle:** GPT-5.2 via Emergent LLM Key
- **Génère:**
  - 3 angles/idées de post
  - Légende complète adaptée aux réseaux ciblés
  - 3 hooks accrocheurs
  - 5 hashtags pertinents
  - Call-to-Action suggéré
- **Paramètres pris en compte:**
  - Sujet/thème
  - Réseaux sociaux ciblés
  - Format de post
  - Pilier de contenu
  - Objectif marketing

#### Frontend (`/app/frontend/src/pages/dashboard/EditorialCalendarPage.jsx`)
- **Vue Calendrier** (mois) avec navigation et posts colorés
- **Vue Trello/Kanban** avec colonnes par semaine
- **Modal Post** avec 3 onglets (Contenu, Planification, Médias)
- **Bouton "Aide IA"** dans l'onglet Contenu
- **Modal IA** avec résultats cliquables pour appliquer

#### Réseaux sociaux configurés
- Instagram, Facebook, LinkedIn, TikTok, YouTube

#### Formats de post
- Post simple, Carrousel, Reel/Short, Vidéo, Story

#### Statuts
- Idée → À rédiger → En cours → À valider → Validé → Programmé → Publié

#### Intégration Contact
- Onglet "Éditorial" dans la fiche contact
- Affiche les calendriers liés au contact
- Bouton pour créer un nouveau calendrier

## Environment
- Backend: FastAPI (port 8001)
- Frontend: React (port 3000)
- Database: MongoDB
- Auth: JWT
- Admin: admin@alphagency.fr / superpassword

## API Routes - Calendrier Éditorial
```
GET    /api/editorial/settings
PUT    /api/editorial/settings
GET    /api/editorial/calendars
POST   /api/editorial/calendars
GET    /api/editorial/calendars/:id
PUT    /api/editorial/calendars/:id
DELETE /api/editorial/calendars/:id
POST   /api/editorial/calendars/:id/duplicate
GET    /api/editorial/posts
POST   /api/editorial/posts
GET    /api/editorial/posts/:id
PUT    /api/editorial/posts/:id
DELETE /api/editorial/posts/:id
PUT    /api/editorial/posts/:id/move
POST   /api/editorial/posts/:id/media
DELETE /api/editorial/posts/:id/media/:mediaId
PUT    /api/editorial/posts/:id/media/reorder
GET    /api/editorial/calendar-view
GET    /api/editorial/contact/:contactId/calendars
```

## Session 2026-01-22 - Travail Complété

### 1. Configuration Google Calendar depuis l'interface ✅
- Ajout des champs dans Paramètres > Intégrations
- Backend lit la config depuis la base de données (pas les env vars)
- Résout le problème de redirect_uri_mismatch

### 2. Module Calendrier Éditorial MVP ✅
- Backend complet avec CRUD calendriers et posts
- Upload médias via Cloudinary
- Frontend avec vue calendrier et vue Trello
- Intégration dans la fiche Contact

## Prochaines Étapes (Phase 2)

### P1 - À implémenter
- **IA d'aide rédactionnelle** (GPT-5.2)
- **Prévisualisations** par réseau (Instagram, Facebook, TikTok, LinkedIn)
- **Dates fortes 2026** (marronniers marketing)
- **Drag & drop** amélioré entre colonnes Trello

### P2 - Améliorations
- Intégration avec module Things (tâches liées aux posts)
- Export PDF du planning
- Statistiques par calendrier

### P3 - Futur
- API Meta/LinkedIn/TikTok pour publication directe
- Templates de posts réutilisables

## 3rd Party Integrations
- **Cloudinary:** Upload médias ✅
- **Google Calendar:** OAuth2 ✅
- **Brevo:** Emails ✅, SMS ⚠️ (Guadeloupe)
- **GPT-5.2:** À intégrer (Phase 2)

## Files Modified This Session
- `/app/backend/routes/editorial.py` (NEW)
- `/app/backend/server.py` (router added)
- `/app/frontend/src/pages/dashboard/EditorialCalendarPage.jsx` (NEW)
- `/app/frontend/src/pages/dashboard/DashboardLayout.jsx` (menu link)
- `/app/frontend/src/components/ContactDetailSheet.jsx` (editorial tab)
- `/app/frontend/src/App.js` (route)
- `/app/frontend/src/pages/dashboard/SettingsPage.jsx` (Google config fields)
- `/app/backend/routes/appointments.py` (get_google_config from DB)
