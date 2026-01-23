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

### 6. Module Agenda / RDV ✅ UPDATED 2026-01-22
- Google Calendar API (OAuth2)
- Lien Google Meet automatique
- Invitations email avec .ics
- **Fuseau horaire Guadeloupe (America/Guadeloupe)** ✅ FIXED
- **Envoi email invitation Brevo** ✅ FIXED
- Configuration Google depuis Paramètres > Intégrations

### 7. Calendrier Éditorial ✅ COMPLETE 2026-01-22

**Multi-calendar system pour planification social media**

#### Fonctionnalités Terminées

1. **Dates Fortes Intelligentes (IA)** ✅
   - Génération automatique de 20-25 dates marketing par calendrier
   - Basé sur la niche (Restaurant, Beauté, Auto, etc.) et le pays
   - Création de post pré-rempli depuis une date forte

2. **Vue Calendrier** ✅
   - Affichage mensuel avec navigation
   - Posts colorés par calendrier
   - Dates fortes affichées avec icône 📅

3. **Vue Trello avec Drag & Drop** ✅
   - Colonnes par semaine avec cartes draggables (@dnd-kit)
   - API Move pour déplacer les posts entre semaines

4. **Filtres Avancés** ✅
   - Filtre par calendrier, réseau social, statut, format
   - Bouton de réinitialisation des filtres

5. **Prévisualisations Social Media** ✅
   - Mockups réalistes pour Instagram, Facebook, LinkedIn, TikTok, YouTube

6. **IA d'Aide à la Rédaction** ✅
   - Génère idées, légende, hooks, hashtags, CTA
   - Utilise GPT-5.2 via Emergent LLM Key

7. **Export PDF du Planning** ✅ NEW 2026-01-22
   - Export par calendrier avec filtres de dates
   - Export global multi-calendriers
   - Format tableau avec statuts et réseaux

8. **Statistiques par Calendrier** ✅ NEW 2026-01-22
   - Posts par statut, réseau, format, pilier
   - Taux de complétion
   - Timeline par semaine
   - Modal de statistiques dans le frontend

#### API Routes - Calendrier Éditorial
```
GET    /api/editorial/niches
GET    /api/editorial/settings
GET    /api/editorial/calendars
POST   /api/editorial/calendars
GET    /api/editorial/calendars/{id}
PUT    /api/editorial/calendars/{id}
DELETE /api/editorial/calendars/{id}
POST   /api/editorial/calendars/{id}/duplicate
GET    /api/editorial/calendars/{id}/key-dates
POST   /api/editorial/calendars/{id}/key-dates/regenerate
POST   /api/editorial/calendars/{id}/key-dates/{dateId}/create-post
GET    /api/editorial/calendars/{id}/stats        # NEW
GET    /api/editorial/calendars/{id}/export/pdf   # NEW
GET    /api/editorial/stats/global                # NEW
GET    /api/editorial/export/pdf                  # NEW (multi-calendars)
GET    /api/editorial/posts
POST   /api/editorial/posts
PUT    /api/editorial/posts/{id}
DELETE /api/editorial/posts/{id}
PUT    /api/editorial/posts/{id}/move
POST   /api/editorial/ai/assist
POST   /api/editorial/ai/improve-caption
```

## Tests Effectués ✅
- iteration_33.json: 22/22 tests backend calendrier éditorial
- iteration_34.json: 15/15 tests nouvelles fonctionnalités (stats, PDF, email, timezone)

## Environment
- Backend: FastAPI (port 8001)
- Frontend: React (port 3000)
- Database: MongoDB
- Auth: JWT
- Admin: admin@alphagency.fr / superpassword

## Bugs Corrigés 2026-01-22

1. **Fuseau horaire RDV** ✅
   - Problème: RDV à 11h Guadeloupe → 6h sur Google Calendar
   - Solution: Changé `Europe/Paris` → `America/Guadeloupe` dans appointments.py
   - Fichier ICS également mis à jour

2. **Envoi email invitation Brevo** ✅
   - Problème: Erreur 500 `{"message":"Key not found","code":"unauthorized"}`
   - Solution: Ajouté `load_dotenv()` dans appointments.py pour charger BREVO_API_KEY

## Prochaines Étapes

### P1 - Prioritaire
- ❌ **SMS Guadeloupe** - Brevo bloqué, proposer Twilio comme alternative

### P2 - Backlog
- Templates de posts réutilisables
- API Meta/LinkedIn/TikTok pour publication directe
- Vérifier fonctionnalité "Bulk Delete"
- Améliorations MindMap (Export PDF, raccourcis)
- Notifications Push
- Intégration Qonto (banque)

### 8. Module Social Media (Agorapulse-style) 🔄 IN PROGRESS 2026-01-23

**Refonte complète du module pour gestion multi-entités et multi-comptes**

#### Fonctionnalités Terminées ✅

1. **Architecture Multi-Entités** ✅
   - Création/modification/suppression d'entités (marques/clients)
   - Association comptes sociaux ↔ entités
   - Entités initiales: West Witch, Alpha Agency, Antilla

2. **Gestion des Comptes Sociaux** ✅
   - Connexion Facebook/Instagram via OAuth Meta
   - Synchronisation automatique des pages Facebook
   - Assignation de comptes aux entités
   - Déconnexion de comptes

3. **Composer Pro** ✅
   - Création de posts (brouillons et programmés)
   - Bug Pydantic `scheduled_at` CORRIGÉ (Optional[str] = None)
   - Statut automatique: draft si pas de date, scheduled si date

4. **Matrice des Capacités** ✅
   - Capacités par plateforme (canPublishFeed, canPublishStory, etc.)
   - API endpoint pour récupérer les capacités

5. **File d'Attente & Stats** ✅
   - Queue par statut (draft, scheduled, published)
   - Statistiques globales (posts, entités, comptes)

#### En Cours / À Faire

1. **Stories Editor** (P1) - Style Storrito, éditeur vertical
2. **Inbox unifiée** (P1) - Messages et commentaires
3. **Reports & Analytics** (P2) - Dashboards statistiques détaillés
4. **Workers Backend** (P2) - Publication programmée automatique

#### API Routes - Social Media
```
GET    /api/social/entities
POST   /api/social/entities
PUT    /api/social/entities/{id}
DELETE /api/social/entities/{id}
GET    /api/social/accounts
POST   /api/social/accounts
DELETE /api/social/accounts/{id}
DELETE /api/social/accounts/{id}/entities
POST   /api/social/entities/{id}/accounts/{account_id}
DELETE /api/social/entities/{id}/accounts/{account_id}
POST   /api/social/sync-meta-accounts
GET    /api/social/capabilities
GET    /api/social/capabilities/{platform}/{account_type}
GET    /api/social/posts
POST   /api/social/posts
PUT    /api/social/posts/{id}
DELETE /api/social/posts/{id}
GET    /api/social/queue
GET    /api/social/stats/overview
GET    /api/meta/auth-url
POST   /api/meta/exchange-token
GET    /api/meta/pages
```

## Tests Effectués ✅
- iteration_33.json: 22/22 tests backend calendrier éditorial
- iteration_34.json: 15/15 tests nouvelles fonctionnalités (stats, PDF, email, timezone)
- iteration_35.json: 20/20 tests backend Social Media module

## 3rd Party Integrations
- **Cloudinary:** Upload médias ✅
- **Google Calendar:** OAuth2 ✅ (fuseau Guadeloupe)
- **Brevo:** Emails ✅, SMS ⚠️ (Guadeloupe bloqué)
- **GPT-5.2:** IA rédactionnelle ✅
- **ReportLab:** Export PDF ✅
- **@dnd-kit:** Drag & drop ✅

## Files Modified 2026-01-22
- `/app/backend/routes/appointments.py` - Fuseau horaire + load_dotenv
- `/app/backend/routes/editorial.py` - Stats + Export PDF
- `/app/frontend/src/pages/dashboard/EditorialCalendarPage.jsx` - Modal stats + boutons export
- `/app/backend/tests/test_new_features_iteration34.py` - Tests nouvelles fonctionnalités
