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
- **PDF**: ReportLab
- **Import**: Pandas, OpenPyXL
- **Storage**: Cloudinary (images), Dropbox (backups)

## Core Features Implemented

### Authentication & Users
- [x] JWT-based authentication
- [x] Super admin management
- [x] User CRUD (create, read, update, delete)
- [x] Password reset functionality
- [x] Login page with "Mot de passe oublié"

### Contacts Management
- [x] Full CRUD operations
- [x] Extended contact model (poste, note, infos_sup, budget, city)
- [x] Contact import from CSV/Excel (3-step wizard)
- [x] Status and score tracking
- [x] Tags system
- [x] **Contact History View** ✅ DONE 2025-01-08
  - Slide-over panel with contact details
  - Summary cards (quotes, invoices, paid, due)
  - Tabs for Quotes, Invoices, Tasks, Notes
  - Financial totals and history

### Pipeline / Opportunities
- [x] Kanban-style pipeline view
- [x] Opportunity stages (dynamiques depuis la base de données)
- [x] Drag & drop support
- [x] Amount and probability tracking
- [x] **Colonnes personnalisables** ✅ DONE 2025-01-09
  - API CRUD pour les colonnes (GET/POST/PUT/DELETE)
  - Interface pour ajouter/modifier/supprimer des étapes
  - Choix de couleur pour chaque colonne
  - Réorganisation des colonnes
  - Initialisation automatique des colonnes par défaut

### Quotes (Devis)
- [x] Quote creation with line items (title + description)
- [x] Professional PDF generation with logo
- [x] Status workflow (brouillon → envoyé → accepté)
- [x] **Quote to Invoice conversion** ✅ DONE 2025-01-08
- [x] Download PDF functionality

### Invoices (Factures)
- [x] Invoice creation with line items
- [x] Professional PDF generation with company info
- [x] Status workflow (brouillon → en_attente → envoyée → payée)
- [x] **Payment tracking system** ✅ DONE 2025-01-08
  - Add/delete payments (amount, date, method, notes)
  - Automatic status updates (partiellement_payée, payée)
  - Visual progress bar for partial payments
  - Payment summary (total, paid, remaining)
- [x] Download PDF functionality

### Dashboard
- [x] KPI cards (contacts, pipeline, MRR, conversion rate)
- [x] Charts (leads evolution, pipeline distribution)
- [x] Responsive design
- [x] Real CRM data integration

### Tasks
- [x] Task management with priorities
- [x] Due dates and status tracking
- [x] Optional contact linking
- [x] Task statistics
- [x] **Tâches en retard** - Section dédiée avec indicateurs visuels

### Budget & Trésorerie (Module Avancé) ✅ Phase 1 COMPLETE 2025-01-09
- [x] Import de transactions bancaires (CSV)
- [x] Gestion des transactions (CRUD)
- [x] Catégories personnalisées (revenus/dépenses)
- [x] Règles d'auto-catégorisation
- [x] Vue d'ensemble avec graphiques
  - Évolution mensuelle (revenus/dépenses)
  - Répartition des dépenses par catégorie (pie chart)
  - Top dépenses par catégorie (barres de progression)
- [x] Filtres (mois, type, catégorie, recherche)
- [x] Résumé financier (revenus, dépenses, résultat, non catégorisé)

### Other Modules
- [x] Subscriptions management
- [x] Portfolio management
- [x] Blog/Articles management
- [x] Document management
- [x] Backup system (Dropbox integration)
- [x] Settings page
- [x] **Gestion des données de test** ✅ DONE 2025-01-08

## Recent Changes (2025-01-09)

### Bug Fixes P0 ✅ VERIFIED
- ✅ **Responsive mobile Pipeline/Tâches** - Scroll horizontal fonctionne (vérifié à 400px viewport)
- ✅ **Tâches en retard** - Détection correcte (exclusion des dates vides) avec section dédiée

### Pipeline Improvements P1 ✅ IMPLEMENTED
- ✅ **Colonnes personnalisables du Pipeline**
  - API Routes: GET/POST/PUT/DELETE /api/pipeline/columns
  - API Route: PUT /api/pipeline/columns/reorder (réorganisation)
  - API Route: POST /api/pipeline/columns/initialize (initialisation)
  - Interface: Bouton "Ajouter une étape"
  - Interface: Menu de colonne (Modifier, Supprimer)
  - Interface: Dialogue de création avec palette de couleurs
  - Interface: Aperçu en temps réel
- ✅ **Menu actions sur les cartes** - Modifier, Archiver, Supprimer
- ✅ **Archivage** - Bouton "Afficher/Masquer les archivées"

### Data Management P1 ✅ IMPLEMENTED (2025-01-08)
- ✅ **Onglet Données** dans Paramètres
- ✅ **Statistiques des collections**
- ✅ **Suppression par collection**
- ✅ **Suppression globale** avec double confirmation

### Budget Module Phase 1 ✅ VERIFIED
- ✅ Toutes les API fonctionnelles (22/22 tests passés)
- ✅ Interface utilisateur complète avec 4 onglets

## Backlog (Prioritized)

### P2 - Medium Priority
- [ ] **Module Budget Phase 2** - Règles d'auto-catégorisation avancées + graphiques additionnels
- [ ] **Module Budget Phase 3** - Budget prévisionnel (Prévu vs Réel)
- [ ] **Module Budget Phase 4** - Vue de cashflow prévisionnel
- [ ] **Activer compte Brevo SMTP** - En attente activation par utilisateur
- [ ] **Audio player for portfolio** - Lecteur audio sur page publique

### P3 - Low Priority
- [ ] Enhanced reporting and analytics
- [ ] Email templates management
- [ ] Bulk operations on contacts
- [ ] E2E test fix for contact form dropdown (recurring issue)

## Known Issues

### Fixed in This Session
- ✅ Mobile responsive issues (verified)
- ✅ Pipeline columns hardcoded (now dynamic)

### Still Pending
- ⚠️ E2E test for contact form dropdown (Shadcn Select component)
- ⚠️ Email functionality via Brevo (needs account activation by user)

## API Credentials
- **Admin Login**: admin@alphagency.fr / superpassword
- **Admin URL**: /alpha-admin-2024

## File Structure
```
/app/
├── backend/
│   ├── server.py          # Main API server (Pipeline columns routes added)
│   └── utils/
│       ├── backup_manager.py
│       └── backup_scheduler.py
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/
│   │   │   ├── dashboard/ # Admin pages (PipelinePage updated)
│   │   │   └── auth/      # Auth pages
│   │   └── lib/
│   │       └── api.js     # API client (pipelineColumnsAPI added)
├── tests/
│   └── test_pipeline_budget.py  # NEW: Pipeline & Budget tests (22 tests)
└── test_reports/
    ├── iteration_6.json
    ├── iteration_7.json
    └── iteration_8.json   # Latest test report (all passed)
```

## Database Collections
- users
- contacts
- opportunities
- quotes
- invoices
- subscriptions
- tasks
- blog_posts
- portfolio
- settings
- services
- counters
- **pipeline_columns** (NEW - pour les colonnes personnalisables)
- **bank_transactions** (Budget module)
- **budget_categories** (Budget module)
- **auto_category_rules** (Budget module - règles d'auto-catégorisation)
