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
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **Charts**: Recharts
- **AI**: Perplexity API (model: sonar)
- **PDF**: ReportLab
- **Storage**: Cloudinary (images), Dropbox (backups)

## Core Features Implemented

### Pipeline / Opportunities ✅ COMPLETE
- [x] Kanban-style pipeline view
- [x] Colonnes personnalisables (CRUD)
- [x] **Drag & Drop des colonnes** ✅ DONE 2025-01-09

### Budget & Trésorerie (Module Avancé) ✅ ALL 4 PHASES COMPLETE

#### Phase 1 ✅ - Import CSV, Transactions, Catégories
#### Phase 2 ✅ - Règles auto-catégorisation avancées
#### Phase 3 ✅ - Budget Prévisionnel (Prévu vs Réel)
#### Phase 4 ✅ COMPLETE (2025-01-09) - Projection Cashflow Multi-mois
- [x] **Nouvel onglet "Cashflow"** dans le module Budget
- [x] **Sélecteur de période** : Mois de départ + durée (3, 6, 12 mois)
- [x] **Cartes de synthèse** : Revenus totaux, Dépenses totales, Flux net moyen/mois, Solde final projeté
- [x] **Graphique AreaChart** : Évolution du cashflow avec solde cumulé et flux net mensuel
- [x] **Tableau détaillé** : Par mois avec type (Réel/Prévu), revenus, dépenses, flux net, solde cumulé
- [x] **Alertes de trésorerie** : Soldes négatifs et flux sortants importants
- [x] **API GET /api/budget/cashflow** : Projection multi-mois avec données réelles et prévisionnelles

### Assistant IA (Perplexity) ✅ COMPLETE (2025-01-09)
- [x] **Nouvelle page /admin/assistant** accessible via le menu latéral
- [x] **Intégration Perplexity API** (model: sonar)
- [x] **Interface de chat** : Messages utilisateur/assistant, indicateur de chargement
- [x] **Contexte CRM intelligent** :
  - Général : Stats globales (contacts, opportunités, pipeline, tâches)
  - Pipeline : Répartition par étape avec montants
  - Contacts : Détails d'un contact spécifique avec historique
  - Facturation : Stats des factures en attente
  - Budget : Revenus/dépenses du mois en cours
- [x] **Garde-fous de coûts** :
  - Limite de 50 requêtes/jour/utilisateur
  - Limite de 2000 caractères/message
  - Compteur de requêtes restantes visible
  - Toggle pour activer/désactiver (AI_ENABLED)
- [x] **Historique des conversations** : Enregistré en base de données
- [x] **Prompts suggérés** : Pour guider les utilisateurs
- [x] **API complètes** :
  - GET /api/ai/status - Statut et usage
  - POST /api/ai/chat - Envoi de messages
  - GET /api/ai/history - Historique des conversations

## Configuration Perplexity

**Variable d'environnement** (dans `/app/backend/.env`) :
```
PERPLEXITY_API_KEY=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
```

**Paramètres de l'IA** (dans `server.py`) :
```python
AI_ENABLED = True  # Toggle pour activer/désactiver
AI_MAX_MESSAGE_LENGTH = 2000  # Max caractères par message
AI_DAILY_LIMIT = 50  # Max appels par utilisateur par jour
```

## Recent Changes (2025-01-09)

### Session Accomplishments
1. ✅ **Budget Phase 4** - Projection de cashflow multi-mois
2. ✅ **Assistant IA Perplexity** - Chat intelligent avec contexte CRM

### Tests Passed
- **Backend**: 25/25 tests (100%)
- **Frontend**: 100%
- Test files: `/app/tests/test_phase4_ai_cashflow.py`

## Backlog (Prioritized)

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
- pipeline_columns (colonnes personnalisables)
- bank_transactions, budget_categories, auto_category_rules, budget_forecasts
- **ai_conversations** (historique des chats IA)
- **ai_usage** (compteur quotidien par utilisateur)

## File Structure
```
/app/
├── backend/
│   ├── server.py          # API server (Budget Cashflow + AI Assistant routes)
│   ├── .env               # PERPLEXITY_API_KEY configured
│   └── tests/
│       ├── test_phase2_phase3_features.py
│       └── test_phase4_ai_cashflow.py  # NEW: 25 tests
├── frontend/
│   ├── src/
│   │   ├── pages/dashboard/
│   │   │   ├── BudgetPage.jsx      # CashflowTab added
│   │   │   ├── AIAssistantPage.jsx # NEW: AI chat interface
│   │   │   └── DashboardLayout.jsx # Assistant IA link in sidebar
│   │   └── lib/
│   │       └── api.js              # aiAPI and cashflowAPI added
└── test_reports/
    ├── iteration_9.json
    └── iteration_10.json           # Latest (Phase 4 + AI tests)
```
