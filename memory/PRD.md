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

### Pipeline / Opportunities
- [x] Kanban-style pipeline view
- [x] Opportunity stages (nouveau, qualifié, devis_envoyé, gagné, perdu)
- [x] Drag & drop support
- [x] Amount and probability tracking

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

### Other Modules
- [x] Budget tracking
- [x] Subscriptions management
- [x] Portfolio management
- [x] Blog/Articles management
- [x] Document management
- [x] Backup system (Dropbox integration)
- [x] Settings page

## Recent Changes (2025-01-09)

### Bug Fixes P0
- ✅ **Tâches en retard** - Correction de la détection (exclusion des dates vides)
- ✅ **Section tâches en retard** - Affichage en bas de la page TasksPage avec fond rouge
- ✅ **Responsive mobile Pipeline/Tâches** - Scroll horizontal amélioré avec `-mx-6 px-6` et `min-w-max`

### Pipeline Improvements P1
- ✅ **Menu actions sur les cartes** - Modifier, Archiver, Supprimer
- ✅ **Archivage** - Bouton "Afficher/Masquer les archivées"
- ✅ **Édition d'opportunité** - Dialogue de modification
- ✅ **Scroll horizontal** - Amélioration du swipe sur mobile

### Data Management P1
- ✅ **Onglet Données** dans Paramètres
- ✅ **Statistiques des collections** (contacts, opportunities, quotes, invoices, tasks)
- ✅ **Suppression par collection** (Leads, Projets, Factures)
- ✅ **Suppression globale** avec double confirmation

### Previous Changes (2025-01-08)
- Payment tracking on invoices
- Quote to Invoice conversion
- Contact history view
- Unified Facturation module
- Google Analytics 4 integration
- Brevo email integration (pending activation)

## Backlog (Prioritized)

### P2 - Medium Priority
- [ ] **Activer compte Brevo SMTP** : Contacter contact@brevo.com pour activer l'envoi d'emails transactionnels
- [ ] **Audio player for portfolio**: Frontend player for uploaded audio files
- [ ] **E2E test fix**: Contact form dropdown test (recurring issue)

### P3 - Low Priority
- [ ] Enhanced reporting and analytics
- [ ] Email templates management
- [ ] Bulk operations on contacts
- [ ] Cascade delete for orphaned references (quotes with deleted contacts)

## Known Issues

### Fixed in This Session
- ✅ Dashboard showing zeros (fixed - uses real data)
- ✅ Mobile responsive issues (fixed)
- ✅ Tasks/Pipeline not displaying (fixed)
- ✅ PDF download issues (fixed)
- ✅ Login issues in production (fixed - password reset at startup)

### Still Pending
- ⚠️ E2E test for contact form dropdown (Shadcn Select component)
- ⚠️ Email functionality is mocked (needs Resend integration)

## API Credentials
- **Admin Login**: admin@alphagency.fr / superpassword
- **Admin URL**: /alpha-admin-2024

## File Structure
```
/app/
├── backend/
│   ├── server.py          # Main API server
│   └── utils/
│       ├── backup_manager.py
│       └── backup_scheduler.py
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/
│   │   │   ├── dashboard/ # Admin pages
│   │   │   └── auth/      # Auth pages
│   │   └── lib/
│   │       └── api.js     # API client
├── tests/
│   └── test_invoice_payments.py
└── test_reports/
    └── iteration_6.json   # Latest test report
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
