# Alpha Agency CRM - Product Requirements Document

## Original Problem Statement
Application CRM full-stack pour Alpha Agency (agence de communication en Guadeloupe) permettant de gérer les contacts, le pipeline commercial, les devis, les factures, les abonnements, le portfolio et les tâches.

## User Personas
- **Super Admin**: Propriétaire de l'agence, gère tous les aspects du CRM
- **Admin**: Employés de l'agence avec accès complet sauf gestion des utilisateurs
- **Clients**: Contacts et prospects dans le CRM

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Charts**: Recharts
- **PDF**: ReportLab
- **Import**: Pandas, OpenPyXL
- **Storage**: Cloudinary (images), Dropbox (backups)

## Core Features Implemented

### Pipeline / Opportunities ✅ COMPLETE
- [x] Kanban-style pipeline view
- [x] **Colonnes personnalisables** ✅ DONE 2025-01-09
  - API CRUD pour les colonnes (GET/POST/PUT/DELETE)
  - Interface pour ajouter/modifier/supprimer des étapes
  - Choix de couleur pour chaque colonne
- [x] **Drag & Drop des colonnes** ✅ DONE 2025-01-09
  - Réorganisation par glisser-déposer avec @dnd-kit
  - Poignées de déplacement (GripVertical) sur chaque colonne
  - API PUT /api/pipeline/columns/reorder
  - Mise à jour en temps réel de l'ordre

### Budget & Trésorerie (Module Avancé) ✅ PHASES 1-3 COMPLETE

#### Phase 1 ✅ COMPLETE (2025-01-09)
- [x] Import de transactions bancaires (CSV)
- [x] Gestion des transactions (CRUD)
- [x] Catégories personnalisées (revenus/dépenses)
- [x] Vue d'ensemble avec graphiques

#### Phase 2 ✅ COMPLETE (2025-01-09) - Règles Auto-catégorisation Avancées
- [x] **Types de correspondance** : contains, starts_with, ends_with, exact, regex
- [x] **Filtre par type** : Revenus uniquement, Dépenses uniquement, ou les deux
- [x] **Bouton "Appliquer les règles"** : Applique automatiquement les règles aux transactions non catégorisées
- [x] API POST /api/budget/rules/apply avec filtre optionnel par mois
- [x] API PUT /api/budget/rules/{id} pour modifier une règle existante
- [x] Interface mise à jour avec nouveaux champs dans le dialogue de création

#### Phase 3 ✅ COMPLETE (2025-01-09) - Budget Prévisionnel
- [x] **Nouvel onglet "Prévisionnel"** dans le module Budget
- [x] **Cartes de synthèse** : Revenus prévus vs Réel, Dépenses prévues vs Réel, Solde prévu vs Réel
- [x] **Barres de progression** visuelles pour suivre l'avancement
- [x] **Tableau "Prévu vs Réel par catégorie"** avec écarts et pourcentages
- [x] **Alertes de dépassement** : Affichage automatique des catégories dépassant >20% du budget
- [x] **Création de prévisions** : Par type (revenu/dépense), catégorie, montant et description
- [x] **Copie vers autre mois** : Réplication des prévisions d'un mois vers un autre
- [x] APIs complètes :
  - GET /api/budget/forecast - Liste des prévisions
  - POST /api/budget/forecast - Création de prévision
  - PUT /api/budget/forecast/{id} - Modification
  - DELETE /api/budget/forecast/{id} - Suppression
  - GET /api/budget/forecast/comparison - Comparaison prévu vs réel
  - POST /api/budget/forecast/copy - Copie vers autre mois

### Other Core Features ✅
- [x] Authentication & Users (JWT)
- [x] Contacts Management (CRUD + Import)
- [x] Quotes (Devis) with PDF generation
- [x] Invoices with payment tracking
- [x] Dashboard with KPIs and charts
- [x] Tasks management
- [x] Subscriptions management
- [x] Portfolio management
- [x] Blog/Articles management
- [x] Document management
- [x] Backup system (Dropbox)
- [x] Settings page with data management

## Recent Changes (2025-01-09)

### Session Accomplishments
1. ✅ **Drag & Drop Pipeline** - Colonnes réorganisables avec @dnd-kit
2. ✅ **Budget Phase 2** - Règles d'auto-catégorisation avancées (match_type, apply_to_type)
3. ✅ **Budget Phase 3** - Budget prévisionnel complet avec comparaison prévu vs réel

### Tests Passed
- **Backend**: 22/22 tests (100%)
- **Frontend**: 100%
- Test files: `/app/tests/test_phase2_phase3_features.py`

## Backlog (Prioritized)

### P2 - Medium Priority
- [ ] **Module Budget Phase 4** - Vue de cashflow prévisionnel sur plusieurs mois
- [ ] Graphiques de tendances et prévisions automatiques

### P3 - Low Priority
- [ ] **Audio player for portfolio** - Lecteur audio sur page publique
- [ ] Enhanced reporting and analytics
- [ ] Email templates management

### Blocked
- ⚠️ **Intégration Brevo (e-mails)** - En attente activation du compte par l'utilisateur

## API Credentials
- **Admin Login**: admin@alphagency.fr / superpassword
- **Admin URL**: /alpha-admin-2024

## Database Collections
- users, contacts, opportunities, quotes, invoices
- subscriptions, tasks, blog_posts, portfolio
- settings, services, counters
- **pipeline_columns** (colonnes personnalisables)
- **bank_transactions** (Budget module)
- **budget_categories** (Budget module)
- **auto_category_rules** (Budget module - règles avancées)
- **budget_forecasts** (Budget module - prévisionnel)

## File Structure
```
/app/
├── backend/
│   ├── server.py          # API server with all routes
│   └── tests/
│       └── test_phase2_phase3_features.py  # Phase 2 & 3 tests
├── frontend/
│   ├── src/
│   │   ├── pages/dashboard/
│   │   │   ├── PipelinePage.jsx    # Drag & Drop with @dnd-kit
│   │   │   └── BudgetPage.jsx      # All phases including ForecastTab
│   │   └── lib/
│   │       └── api.js              # API client updated
└── test_reports/
    ├── iteration_8.json
    └── iteration_9.json            # Latest (Phase 2 & 3 tests)
```
