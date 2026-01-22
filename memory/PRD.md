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

### 7. Calendrier Éditorial ✅ COMPLETE 2026-01-22

**Multi-calendar system pour planification social media**

#### Fonctionnalités Terminées

1. **Dates Fortes Intelligentes (IA)** ✅ 2026-01-22
   - Génération automatique de 20-25 dates marketing par calendrier
   - Basé sur la niche (Restaurant, Beauté, Auto, etc.) et le pays
   - Dates génériques (jours fériés, Black Friday) + dates spécifiques au secteur
   - Endpoint: `POST /api/editorial/calendars` avec `generate_key_dates: true`
   - Création de post pré-rempli depuis une date forte

2. **Vue Calendrier** ✅
   - Affichage mensuel avec navigation
   - Posts colorés par calendrier
   - Dates fortes affichées avec icône 📅
   - Clic sur une date = créer un nouveau post

3. **Vue Trello/Kanban avec Drag & Drop** ✅ 2026-01-22
   - Colonnes par semaine
   - Cartes draggables avec @dnd-kit
   - Déplacement de posts entre semaines
   - Endpoint: `PUT /api/editorial/posts/{id}/move`

4. **Filtres Avancés** ✅ 2026-01-22
   - Filtre par calendrier
   - Filtre par réseau social (Instagram, Facebook, LinkedIn, TikTok, YouTube)
   - Filtre par statut (Idée, À rédiger, En cours, À valider, Validé, Programmé, Publié)
   - Filtre par format (Post, Carrousel, Reel, Vidéo, Story)
   - Bouton de réinitialisation des filtres

5. **Prévisualisations Social Media** ✅ 2026-01-22
   - Mockups réalistes pour 5 plateformes:
     - **Instagram:** Feed post avec avatar, likes, caption, hashtags
     - **Facebook:** Publication de page avec réactions
     - **LinkedIn:** Post professionnel
     - **TikTok:** Mockup mobile vertical
     - **YouTube:** Thumbnail avec titre et vues
   - Accessible via bouton œil ou "Prévisualiser" dans l'éditeur

6. **IA d'Aide à la Rédaction** ✅
   - Génère 3 angles/idées, légende, hooks, hashtags, CTA
   - Utilise GPT-5.2 via Emergent LLM Key
   - Endpoint: `POST /api/editorial/ai/assist`

7. **Upload Médias** ✅
   - Intégration Cloudinary
   - Support images et vidéos
   - Réorganisation de l'ordre des médias (carrousels)

#### API Routes - Calendrier Éditorial
```
GET    /api/editorial/niches              # Liste des niches disponibles
GET    /api/editorial/settings            # Réseaux, formats, statuts
GET    /api/editorial/calendars           # Liste calendriers
POST   /api/editorial/calendars           # Créer calendrier (+ dates fortes IA)
GET    /api/editorial/calendars/:id       # Détail calendrier
PUT    /api/editorial/calendars/:id       # Modifier calendrier
DELETE /api/editorial/calendars/:id       # Supprimer calendrier
POST   /api/editorial/calendars/:id/duplicate
GET    /api/editorial/calendars/:id/key-dates      # Dates fortes
POST   /api/editorial/calendars/:id/key-dates/regenerate
POST   /api/editorial/calendars/:id/key-dates/:dateId/create-post
GET    /api/editorial/posts               # Liste posts (avec filtres)
POST   /api/editorial/posts               # Créer post
GET    /api/editorial/posts/:id
PUT    /api/editorial/posts/:id
DELETE /api/editorial/posts/:id
PUT    /api/editorial/posts/:id/move      # Drag & drop
POST   /api/editorial/posts/:id/media     # Upload média
POST   /api/editorial/ai/assist           # Aide IA
POST   /api/editorial/ai/improve-caption
```

## Tests Effectués ✅
- 22/22 tests backend passés
- Rapport: `/app/test_reports/iteration_33.json`
- Tests: `/app/backend/tests/test_editorial_calendar.py`

## Environment
- Backend: FastAPI (port 8001)
- Frontend: React (port 3000)
- Database: MongoDB
- Auth: JWT
- Admin: admin@alphagency.fr / superpassword

## Prochaines Étapes

### P1 - Prioritaire
- ❌ **SMS Guadeloupe** - Brevo bloqué, proposer Twilio comme alternative

### P2 - Améliorations Calendrier Éditorial
- Intégration avec module Things (tâches liées aux posts) - **En attente à la demande de l'utilisateur**
- Export PDF du planning
- Statistiques par calendrier
- Templates de posts réutilisables

### P3 - Backlog
- API Meta/LinkedIn/TikTok pour publication directe
- Vérifier fonctionnalité "Bulk Delete"
- Améliorations MindMap (Export PDF, raccourcis)
- Notifications Push
- Intégration Qonto (banque)

## 3rd Party Integrations
- **Cloudinary:** Upload médias ✅
- **Google Calendar:** OAuth2 ✅
- **Brevo:** Emails ✅, SMS ⚠️ (Guadeloupe bloqué)
- **GPT-5.2:** IA rédactionnelle ✅
- **@dnd-kit:** Drag & drop ✅

## Files Modified This Session (2026-01-22)
- `/app/backend/routes/editorial.py` - Ajout endpoints key-dates, fix calendar-view
- `/app/frontend/src/pages/dashboard/EditorialCalendarPage.jsx` - Drag & drop, filtres avancés
- `/app/frontend/src/components/SocialPreviewModal.jsx` - Mockups complets
- `/app/backend/tests/test_editorial_calendar.py` - Tests complets (22 tests)
