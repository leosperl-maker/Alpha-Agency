# Alpha Agency CRM - Product Requirements Document

## Overview
Application CRM complète pour agence de communication en Guadeloupe (Alpha Agency). Gestion des contacts, leads, facturation, portfolio, blog, actualités locales et campagnes marketing.

## Core Features

### 1. Dashboard & Analytics
- KPIs principaux (sessions, leads, taux conversion, MRR)
- Graphiques d'évolution
- Notifications et alertes

### 2. Contacts Management
- CRUD contacts avec filtres
- Import/export
- Tags et catégorisation

### 3. Pipeline (CRM)
- Kanban des opportunités
- Colonnes personnalisables
- Drag & drop

### 4. Facturation ✅ UPDATED 2026-01-10
- Devis et factures avec prévisualisation PDF
- **Services avec titre séparé de la description**
- **Remises par ligne (%)**
- **Remise globale (% ou montant fixe)**
- Suivi des paiements
- TVA 8.5% (Guadeloupe)

### 5. Budget & Trésorerie
- Graphique évolution mensuelle (combine budget + bank_transactions)
- Catégories de dépenses
- Prévisionnel

### 6. Portfolio (Réalisations) ✅ REFONTE COMPLÈTE 2026-01-09
- **Éditeur de blocs avancé (15 types)**:
  - Texte, Titre (H1-H4), Liste, Citation
  - Image, Galerie (lightbox), Vidéo, Avant/Après
  - Séparateur, Espace, Section couleur
  - Statistiques, Bouton CTA, Accordéon, Code
- Page publique haut de gamme avec filtres
- Page détail avec métadonnées (client, date, lien)
- Projets similaires en pied de page

### 7. Blog
- Articles avec éditeur riche
- Tags et catégories
- SEO optimisé

### 8. Actualités Locales
- Intégration NewsAPI avec mots-clés locaux
- Sources: Guadeloupe, Martinique, Antilles
- Multiple clés API pour éviter rate limits

### 9. Campagnes Email/SMS
- Templates prédéfinis
- Éditeur visuel drag-and-drop (react-email-editor)
- Intégration Brevo

### 10. Intégrations Tierces
- Perplexity AI (suggestions)
- NewsAPI.org (actualités)
- Brevo/Sendinblue (emails)
- Meta (Facebook/Instagram) - EN COURS

## Architecture

### Backend (FastAPI)
```
/app/backend/
├── server.py          # Monolithique (en refactorisation)
├── routes/
│   ├── campaigns.py   # Module campagnes
│   ├── database.py    # Utilitaires DB
│   ├── meta.py        # Intégration Meta
│   └── news.py        # Actualités locales
└── requirements.txt
```

### Frontend (React)
```
/app/frontend/src/
├── components/
│   ├── ui/                      # Shadcn components
│   ├── AdvancedBlockEditor.jsx  # Éditeur 15 blocs
│   ├── AdvancedBlockRenderer.jsx # Rendu public
│   └── EmailEditor.jsx          # Éditeur emails
├── pages/
│   ├── dashboard/
│   │   ├── InvoicesPage.jsx     # Facturation (avec remises)
│   │   ├── PortfolioManagePageNew.jsx # Gestion portfolio
│   │   ├── CampaignsPage.jsx    # Campagnes
│   │   └── ...
│   ├── PortfolioPageNew.jsx     # Page publique portfolio
│   └── ...
└── lib/api.js
```

## Completed Work (2026-01-09 / 2026-01-10)

### Session 1 - 2026-01-09
- ✅ Amélioration actualités locales (mots-clés spécifiques DOM-TOM)
- ✅ Support multiple clés NewsAPI
- ✅ Page gestion API dans paramètres
- ✅ Templates campagne email
- ✅ Éditeur email visuel drag-and-drop
- ✅ Début refactorisation server.py (news, meta)

### Session 2 - 2026-01-10
- ✅ Bug Pipeline scrollbar corrigé
- ✅ Bug Budget graphique vérifié (données réelles)
- ✅ Bug Facturation redirection corrigé
- ✅ **REFONTE COMPLÈTE MODULE RÉALISATIONS**
  - Éditeur 15 types de blocs
  - Page publique style agence haut de gamme
  - Suppression anciennes données, 2 projets exemples
- ✅ **Facturation améliorée**
  - Titre séparé de description pour services
  - Remise par ligne (%)
  - Remise globale (% ou € fixe)

### Session 3 - 2026-01-10 (suite)
- ✅ **Refactorisation backend avancée**
  - Création module `/app/backend/routes/invoices.py` (complet avec PDF, paiements)
  - Création module `/app/backend/routes/budget.py` (CRUD + stats)
  - Correction conflit collection budget (budget_entries → budget)
  - Inclusion des nouveaux modules dans server.py
- ✅ **Bug E2E formulaire contact corrigé**
  - Ajout data-testid sur options Select Radix UI
  - Tests Playwright passent maintenant
- ✅ Suppression tâche P2 (sources Saint-Martin/Saint-Barth - plus nécessaire)

### Session 4 - 2026-01-10 (continuation)
- ✅ **Refactorisation backend MASSIVE - 5 nouveaux modules**
  - `quotes.py` - Devis (CRUD, PDF, conversion en facture)
  - `tasks.py` - Tâches (CRUD + statistiques)
  - `blog.py` - Articles (CRUD avec blocs de contenu)
  - `portfolio.py` - Réalisations (CRUD avec blocs de contenu)
  - `tags.py` - Tags (CRUD + suggestions IA Perplexity)
- ✅ **Médias avancés (P3)**
  - Nouveau bloc PDF dans l'éditeur (upload, aperçu, téléchargement)
  - Bloc vidéo amélioré (YouTube, Vimeo, fichiers uploadés)
  - Routes backend `/upload/video` et `/upload/file` pour Cloudinary
- ✅ Tous les modules inclus dans server.py via `app.include_router()`

### Session 5 - 2026-01-10 (refonte UI)
- ✅ **REFONTE COMPLÈTE UI GLASSMORPHIQUE**
  - Nouveau DashboardLayout sombre avec sidebar glassmorphique
  - Background gradient indigo/purple avec effets de lumière
  - Cartes KPI avec effets neon et animations hover
  - Graphiques stylisés (fond transparent, couleurs neon)
  - Tables et badges avec style glassmorphique
  - Topbar avec recherche et notifications
- ✅ **Assistant IA Amélioré**
  - Support multi-modèles : GPT-4o (Vision), Gemini 3 Flash, Perplexity
  - Upload et analyse d'images
  - Génération d'images via Gemini Nano Banana
  - Interface chat moderne avec sidebar conversations
  - Sélecteur de modèle avec descriptions claires
  - Responsive mobile optimisé
- ✅ **Bulle flottante IA mise à jour**
  - Design glassmorphique assorti au dashboard
  - Gradient indigo/purple
  - Badge compteur de requêtes
- ✅ **Responsive Design**
  - Layout mobile optimisé
  - Cartes KPI en grille 2 colonnes sur mobile
  - Menu hamburger pour navigation mobile

### Session 6 - 2026-01-10 (Corrections UI & IA Context-Aware)
- ✅ **Bug Fix: Scrollbar sidebar**
  - Ajout de `overflow-y-auto`, `min-h-0`, `flex-shrink-0` au conteneur de navigation
  - Tous les 38 éléments de menu sont maintenant accessibles
- ✅ **Bug Fix: Page de connexion**
  - Migré vers design glassmorphique sombre (bg-[#02040A])
  - Texte blanc, bouton gradient indigo/purple, champs arrondis
- ✅ **Bug Fix: Contraste texte**
  - Corrigé les classes `text-[#1A1A1A]` vers `text-white/80`
  - Plus de texte noir sur fond sombre
- ✅ **Bug Fix: Topbar fonctionnelle**
  - Barre de recherche interactive avec résultats (contacts, tâches)
  - Dropdown notifications avec données réelles (tâches en retard, factures impayées, nouveaux leads)
  - Dropdown profil avec liens vers Paramètres et Déconnexion
- ✅ **NOUVEAU: Assistant IA Context-Aware**
  - L'IA a maintenant accès à toutes les données CRM en temps réel
  - Données accessibles : Factures, Contacts, Tâches, Pipeline, Budget, Devis
  - Endpoint `/api/ai-enhanced/context` pour récupérer le résumé des données
  - Badge "Context-Aware" visible dans l'interface
  - Suggestions contextuelles ("Quelles factures sont impayées?", etc.)
  - L'IA peut répondre à des questions comme "Quelles tâches sont en retard?" avec des données réelles
- ✅ **NOUVEAU: Assistant IA avec Actions**
  - L'IA peut maintenant exécuter des actions dans le CRM
  - Actions disponibles : Créer tâche, Marquer tâche terminée, Modifier contact, Créer devis
  - Toggle "Actions ON/OFF" dans l'interface
  - Badge "Action exécutée" sur les messages avec actions
  - Notifications toast pour les actions réussies
- ✅ **NOUVEAU: Module Gestionnaire de Fichiers**
  - Backend complet avec routes `/api/file-manager`
  - Gestion de dossiers (création, suppression, arborescence)
  - Upload de fichiers (tous types: PDF, Word, Excel, Images, ZIP, etc.)
  - Interface type explorateur (vue grille/liste)
  - Breadcrumb de navigation
  - Sélection multiple et actions groupées (déplacer, supprimer)
  - Prévisualisation des fichiers
  - Statistiques de stockage
- ✅ **Design Glassmorphique étendu**
  - Toutes les pages dashboard migrées vers le thème sombre
  - ContactsPage, PipelinePage, SettingsPage, TasksPage, BudgetPage, etc.
  - Badges et boutons avec nouveau design
- ✅ **Documents intégrés à l'assistant IA**
  - L'IA peut voir les fichiers uploadés dans le contexte
  - Actions `get_document` et `list_documents` disponibles
  - L'IA peut rechercher et lister les documents par type ou nom
- ✅ **Toggle Thème Sombre/Clair**
  - ThemeContext avec persistance localStorage
  - Toggle dans le dropdown profil (topbar)
  - Support classes utilitaires theme-bg, theme-text, etc.

## Pending Tasks

### P0 - Bugs Critiques (TOUS CORRIGÉS)
- [x] ~~Bug PipelinePage.jsx (balises div non fermées)~~ - ✅ Corrigé
- [x] ~~Texte invisible sélecteur de blocs~~ - ✅ Corrigé avec classes text-white
- [x] ~~Boutons "Étapes" et "Nouvelle" invisibles sur Pipeline~~ - ✅ Corrigé

### P1 - Priorité haute (COMPLÉTÉES)
- [x] ~~**Page Things**~~ - ✅ Liste de tâches journalière
- [x] ~~**Page MindMap**~~ - ✅ Outil de mind mapping
- [x] ~~**Refonte éditeur Blog**~~ - ✅ Utilise AdvancedBlockEditor
- [x] ~~**Preview et Rename pour Documents**~~ - ✅ Modal amélioré
- [x] ~~**Bouton Quick Actions**~~ - ✅ Bouton flottant avec 6 actions rapides
- [x] ~~**Intégration Qonto (Phase 1)**~~ - ✅ Onglet Qonto dans Budget avec sync transactions

### P1.5 - Fonctionnalités en cours
- [ ] **Cloche de notifications fonctionnelle** - Backend + frontend pour notifications temps réel
- [ ] **Intégration Qonto (Phase 2)** - Rapprochement automatique factures ↔ transactions
  - Credentials actuels : sb-digital-3245 / 8b715440c1dcf713aa1487662cabd850 (⚠️ semblent invalides, vérifier avec Qonto)

### P2 - Priorité moyenne
- [ ] **Intégration Qonto (Phase 3)** - Comptabilité intégrée style Indy, calcul TVA, déclarations
- [ ] Remplacer les champs URL d'image/vidéo par des composants d'upload
- [ ] Style glassmorphique pour pages restantes
- [ ] Finaliser intégration Meta (test publication)

### P3 - Priorité basse / Backlog futur
- [ ] **Import Gmail automatique des factures & reçus**
  - Analyse boîte de réception toutes les 3h
  - Extraction automatique (nom tiers, montant, date)
  - Rapprochement avec transactions Qonto
- [ ] **Google Ads / META Ads invoices import** - Import automatique factures publicitaires
- [ ] Refactoring CSS complet pour support réel du thème clair

### Session 7 - 2026-01-11 (Corrections bugs critiques + Nouvelles pages)
- ✅ **Bug Fix CRITIQUE: PipelinePage.jsx**
  - 2 balises `<div>` non fermées causaient une erreur de parsing JSX
  - Correction de l'alignement du header pour que les boutons "Étapes" et "Nouvelle" soient visibles
- ✅ **Bug Fix: Texte invisible dans l'éditeur de blocs**
  - Ajout de classes `text-white hover:bg-white/10` sur tous les SelectItem et DropdownMenuItem
- ✅ **NOUVEAU: Page Things**
  - Liste de tâches journalière style "Things app"
  - Sections : Aujourd'hui, Prochainement, À tout moment, Favoris, Terminées, Archives
  - Route : `/admin/things`
- ✅ **NOUVEAU: Page MindMap**
  - Outil de mind mapping interactif avec gestion multi-cartes
  - Route : `/admin/mindmap`
- ✅ **Refonte éditeur Blog**
  - Utilisation de l'AdvancedBlockEditor (identique aux Réalisations)
  - Interface éditeur full-screen avec sidebar de paramètres
- ✅ **Preview et Rename pour Documents**
  - Modal de prévisualisation amélioré + option Renommer
- ✅ **NOUVEAU: Bouton Quick Actions flottant**
  - Accessible depuis toutes les pages du dashboard
  - Actions rapides : Contact, Facture, Tâche, Opportunité, Document, Article
  - Design glassmorphique avec icônes colorées en gradient
- ✅ **NOUVEAU: Intégration Qonto**
  - Backend : `/api/qonto/*` (status, accounts, transactions, sync, stats)
  - Nouvel onglet "Qonto" dans la page Budget
  - Affichage solde, revenus/dépenses 30j, liste transactions
  - Bouton de synchronisation manuelle
  - Cache local MongoDB des transactions

## Known Issues
- Routes dupliquées temporairement dans server.py et modules séparés
- server.py encore partiellement monolithique (~6000 lignes) mais 10 modules extraits
- **Toggle thème clair/sombre : fonctionne techniquement mais l'interface reste sombre car tous les composants utilisent des couleurs CSS hardcodées (bg-[#1a1a2e], text-white, etc.) au lieu de variables CSS. Refactoring CSS complet nécessaire pour un vrai support du thème clair.**

## Architecture Backend (mise à jour)

```
/app/backend/
├── server.py              # Principal (en refactorisation)
├── routes/
│   ├── __init__.py
│   ├── ai_enhanced.py     # ✅ NOUVEAU - Context-Aware AI
│   ├── auth.py            # Créé (pas encore migré)
│   ├── backup.py          # ✅ Actif
│   ├── blog.py            # ✅ NOUVEAU - Actif
│   ├── budget.py          # ✅ Actif
│   ├── campaigns.py       # ✅ Actif
│   ├── contacts.py        # Créé (pas encore migré)
│   ├── database.py        # Utilitaires DB partagés
│   ├── invoices.py        # ✅ Actif
│   ├── meta.py            # ✅ Actif
│   ├── news.py            # ✅ Actif
│   ├── opportunities.py   # Créé (pas encore migré)
│   ├── portfolio.py       # ✅ NOUVEAU - Actif
│   ├── quotes.py          # ✅ NOUVEAU - Actif
│   ├── tags.py            # ✅ NOUVEAU - Actif
│   └── tasks.py           # ✅ NOUVEAU - Actif
└── requirements.txt
```

## Environment
- Backend: FastAPI (port 8001)
- Frontend: React (port 3000)
- Database: MongoDB
- Auth: JWT
- Admin: admin@alphagency.fr / superpassword

### Session 8 - 2026-01-11 (Corrections Mobile Responsive)
- ✅ **Bug Fix CRITIQUE: Bulles flottantes se superposaient sur mobile**
  - FloatingAIChat déplacé à `bottom-24 right-6`
  - QuickActions reste à `bottom-6 right-6`
  - 16px d'écart entre les deux bulles
- ✅ **NOUVEAU: Bulles déplaçables au doigt (touch drag)**
  - Ajout de `useCallback` handlers pour `touchstart`, `touchmove`, `touchend`
  - Les deux bulles peuvent être repositionnées par l'utilisateur sur mobile
  - Classe `touch-none` pour contrôle personnalisé du touch
- ✅ **Bug Fix: Scrollbar manquante dans la sidebar mobile**
  - Ajout de `flex flex-col` sur le conteneur aside
  - `overflow-y-auto` et `min-h-0` sur le conteneur nav
  - `flex-shrink-0` sur les sections header et footer
- ✅ **Page Contacts responsive**
  - Ajout de `overflow-x-hidden` au conteneur principal
  - Layout mobile optimisé (déjà existant mais vérifié)
- ✅ **Page Tâches (Kanban) responsive**
  - Colonnes avec scroll horizontal sur mobile
  - Wrapper `overflow-x-auto` avec `-webkit-overflow-scrolling: touch`
- ✅ **Page MindMap responsive**
  - Toolbar responsive (flex-col sur mobile, flex-row sur desktop)
  - Support touch events pour le canvas (pan et drag des nœuds)
  - Toolbar du nœud sélectionné adaptée pour mobile (bottom-16 au lieu de bottom-4)
- ✅ **Page Things responsive**
  - Déjà responsive avec dropdown de filtre mobile

## Test Results
- Session 8: 100% pass rate (7/7 tests frontend mobile)
- Viewport testé: 375x800 (iPhone SE/XR)
- Toutes les pages principales fonctionnent correctement sur mobile

