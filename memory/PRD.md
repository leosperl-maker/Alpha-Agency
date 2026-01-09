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
- **AI**: Perplexity API (model: llama-3.1-sonar-small-128k-online)
- **PDF**: ReportLab
- **Storage**: Cloudinary (images), Dropbox (backups)

## Core Features Implemented

### Pipeline / Opportunities ✅ COMPLETE (Updated 2026-01-09)
- [x] Kanban-style pipeline view style Pipedrive
- [x] Colonnes personnalisables (CRUD + réordonnement)
- [x] **Drag & Drop des colonnes** ✅
- [x] **Drag & Drop des cartes** avec handles (GripVertical) ✅
- [x] **Scroll horizontal** fonctionnel (grab cursor, overflow-x-auto) ✅
- [x] **Menus contextuels** (Modifier/Voir détails/Archiver/Supprimer) ✅
- [x] **Vue détaillée** des opportunités (Sheet panel) ✅
- [x] KPIs en haut (Valeur pipeline, Affaires actives, Taux conversion, Valeur moyenne)

### Tâches ✅ COMPLETE (2026-01-09)
- [x] Kanban-style task board
- [x] **Colonnes configurables** (CRUD via bouton "Colonnes") ✅
- [x] **Drag & Drop des tâches** avec handles ✅
- [x] **Scroll horizontal** fonctionnel ✅
- [x] **Menus contextuels** fonctionnels ✅
- [x] **Vue détaillée** des tâches ✅
- [x] Persistance colonnes en localStorage

### Demandes ✅ COMPLETE (2026-01-09)
- [x] **Barre de recherche** par nom, email, entreprise ✅
- [x] **Filtre par statut** (Non traité, Contacté, Qualifié, Converti, Perdu) ✅
- [x] **Encarts de résumé** (Total, Non traité, Contacté, Qualifié, Converti) ✅
- [x] Liste des demandes avec informations complètes
- [x] Vue détaillée avec actions (email, téléphone)

### Facturation & Devis ✅ COMPLETE (2026-01-09)
- [x] Interface double colonne (formulaire + aperçu) pour factures
- [x] **Bouton Services** ajouté dans l'en-tête ✅
- [x] Boutons "Nouveau devis" et "Nouvelle facture" redirigent vers la nouvelle interface

### Assistant IA (Perplexity) ✅ COMPLETE (Updated 2026-01-09)
- [x] **Page /admin/assistant** avec interface de chat
- [x] **Sidebar d'historique** des conversations ✅
- [x] **Persistance backend** des messages ✅
- [x] **Chargement des conversations** depuis l'historique ✅ FIXED
- [x] **CRUD conversations** (créer, lire, modifier titre, supprimer) ✅
- [x] **Conversion format legacy** automatique ✅
- [x] Contexte CRM intelligent (Général, Pipeline, Contacts, Facturation, Budget)
- [x] Limite 50 requêtes/jour avec compteur visible
- [x] Prompts suggérés

### Bulle de Chat IA Flottante ✅ COMPLETE (Updated 2026-01-09)
- [x] **Visible sur toutes les pages admin** sauf /admin/assistant ✅
- [x] **Design amélioré** : panneau bien formaté, aligné, responsive ✅ FIXED
- [x] **Fermeture propre** : redevient bulle immédiatement ✅ FIXED
- [x] **Historique synchronisé** avec la page principale ✅
- [x] Mini interface de chat fonctionnelle avec compteur
- [x] Position fixe en bas à droite

### Budget & Trésorerie (Module Avancé) ✅ ALL 4 PHASES COMPLETE
- Phase 1 ✅ - Import CSV, Transactions, Catégories
- Phase 2 ✅ - Règles auto-catégorisation avancées
- Phase 3 ✅ - Budget Prévisionnel (Prévu vs Réel)
- Phase 4 ✅ - Projection Cashflow Multi-mois

### Réalisations (Portfolio Public) ✅ COMPLETE (Updated 2026-01-09)
- [x] Page publique responsive
- [x] **Galerie style moderne** avec images en scroll vertical ✅ REDESIGNED
- [x] Images sur fond noir immersif
- [x] Compteur d'images (1/2, 2/2, etc.)
- [x] Section description et audio sous les images
- [x] Bouton fermeture bien positionné

### Section Actualités (News) ✅ COMPLETE (2026-01-09)
- [x] **Interface NewsPage.jsx** avec grille de cartes ✅
- [x] **12 topics** configurés (géographiques + business) ✅
- [x] **Filtres par thématique** dans l'UI ✅
- [x] **Récupération via Perplexity AI** (bouton Actualiser) ✅
- [x] **Suppression d'articles** individuelle ✅
- [x] Badges colorés par catégorie
- [x] Sources avec liens externes

### Social Media Manager (style Agorapulse) ✅ REFONTE UI COMPLETE (2026-01-09)
- [x] **Architecture backend complète** (endpoints CRUD) ✅
- [x] **Page /admin/social-media** style Agorapulse ✅
- [x] **Vue Calendrier mensuel** avec posts par jour ✅
- [x] **Vue Liste chronologique** (toggle Liste/Mois) ✅
- [x] **NOUVELLE Modale de création de post 3 colonnes** ✅
  - Colonne gauche: Sélection comptes FB/IG
  - Colonne centrale: Rédaction + toolbar (emoji, localisation, hashtags, Writing Assistant)
  - Zone médias: Drag & drop + parcourir fichiers
  - Colonne droite: Aperçu en temps réel du post
  - Toggle brouillon, Bouton Programmer orange #FF6B35
- [x] **Upload de médias** (photos/vidéos) pour posts programmés ✅
- [x] **Boîte de réception** avec filtres (Tous/Non lus/Répondus/Archivés) ✅
- [x] **Onglet Comptes** pour connecter Facebook/Instagram ✅
- [x] **Suggestions IA** pour réponses (Perplexity) ✅
- [x] Stats en haut (Programmés, Publiés, Brouillons, Non lus, À répondre)
- [x] **Design orange Agorapulse** (#FF6B35) appliqué
- [ ] ⚠️ **Publication réelle** sur Meta - En attente OAuth integration

## Backlog / Upcoming Tasks

### P1 - Amélioration Fiche Contact (style Pipedrive)
- [ ] Timeline d'interactions
- [ ] Accès rapides
- [ ] Meilleure organisation visuelle ContactDetailSheet.jsx

### P2 - Intégration Google Agenda
- [ ] Guide utilisateur pour Google Cloud Console (OAuth credentials)
- [ ] Endpoints backend pour OAuth2
- [ ] Page /admin/agenda avec calendrier

### P3 - Social Media Manager - Intégration Meta API
- [ ] Connexion OAuth Facebook/Instagram
- [ ] Publication réelle des posts programmés
- [ ] Récupération des commentaires/messages réels
- [ ] Meta API integration (App ID: 4389601981285980)

### P4 - Améliorations futures
- [ ] Audio player for portfolio
- [ ] Enhanced reporting and analytics
- [ ] Email templates management

### Blocked
- ⚠️ **Intégration Brevo (e-mails)** - En attente activation du compte

## API Credentials
- **Admin Login**: admin@alphagency.fr / superpassword
- **Admin URL**: /alpha-admin-2024
- **Perplexity API**: Configurée dans backend/.env

## Database Collections
- users, contacts, opportunities, quotes, invoices
- subscriptions, tasks, portfolio, documents
- settings, services, counters
- pipeline_columns (colonnes personnalisables pipeline)
- bank_transactions, budget_categories, auto_category_rules, budget_forecasts
- **ai_conversations** (historique des chats IA - supporte ancien et nouveau format)
- **ai_usage** (compteur quotidien par utilisateur)
- **news_articles** (actualités récupérées via Perplexity)
- **social_accounts** (comptes Facebook/Instagram connectés)
- **social_posts** (posts programmés)
- **social_inbox** (messages/commentaires à modérer)

## Test Reports
- `/app/test_reports/iteration_11.json` - Phase 1 corrections (95% success)
- `/app/test_reports/pytest/pytest_news_social.xml` - Tests API News & Social (15/19 pass)
- `/app/test_reports/iteration_12.json` - Refonte Social Media Agorapulse + Pipeline scroll (100% success)
