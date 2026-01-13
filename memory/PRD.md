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

### 4. Facturation ✅ UPDATED 2026-01-13
- Devis et factures avec prévisualisation PDF
- **Structure PDF conforme au modèle de référence:** ✅ FINAL 2026-01-13
  - **Header tableau BLEU MARINE FONCÉ** (comme preview paramètres) ✅
  - **Pas de colonne "Code"** - uniquement Désignation | Qté | Remise | P.U. HT | TVA | Total HT
  - **Titre en gras + description dans la même cellule Désignation** ✅
  - **Descriptions longues:** titre séparé + description comme paragraph flowable ✅
  - **"Montant Total de votre investissement (TTC)" en VERT** ✅
  - **Prix TTC en VERT** ✅
  - **Section "Bon pour accord & signature"** (simplifiée, une seule ligne) ✅
  - **Sections "Conditions de règlement" et "Détails de paiement" avec fond gris clair** ✅
- **Remises par ligne (% ou €)** ✅
- **Remise globale (% ou montant fixe)**
- Suivi des paiements
- TVA 8.5% (Guadeloupe)
- **PDF téléchargement mobile iOS/Safari corrigé** ✅
- **Mise en page PDF : Expéditeur (gauche) / Destinataire (droite)** ✅
- **Nom de fichier PDF correct (devis_DEV-XXXX.pdf / facture_FAC-XXXX.pdf)** ✅
- **Footer PDF professionnel (SIRET, TVA, RCS, mentions légales)** ✅
- **Sélection multiple + actions groupées (mobile & desktop)** ✅
- **Bouton téléchargement rapide** ✅
- **Bouton envoi par email avec modèle** ✅
- **Changement de statut facile** ✅
- **Icône réglages sur page principale** ✅
- **Paramètres du document (conditions, IBAN) modifiables** ✅
- **Templates d'email modifiables avec aperçu et logo** ✅
- **Flux "Phase 2" post-création (actions: Envoyer, Télécharger)** ✅ DÉJÀ FAIT
- **Création de contact "en ligne" dans le formulaire** ✅ DÉJÀ FAIT
- **Modale de confirmation avant envoi d'email** ✅ DÉJÀ FAIT

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
  - Colonnes réduites à 260px sur mobile (vs 320px desktop)
  - Wrapper `overflow-x-auto` avec scroll horizontal
- ✅ **Page MindMap responsive**
  - Toolbar responsive (flex-col sur mobile, flex-row sur desktop)
  - Support touch events pour le canvas (pan et drag des nœuds)
  - Toolbar du nœud sélectionné adaptée pour mobile (bottom-16 au lieu de bottom-4)
- ✅ **Page Things responsive**
  - Déjà responsive avec dropdown de filtre mobile

### Session 9 - 2026-01-11 (Refonte Mobile Avancée)
- ✅ **REFONTE: Page Assistant IA style Perplexity**
  - Design minimaliste et centré
  - Titre "Que voulez-vous savoir ?" au centre
  - Suggestions de questions en pills cliquables
  - Input en bas avec sélecteur de modèle intégré
  - Panneau historique accessible via bouton
  - Suppression de la sidebar permanente
- ✅ **Page Budget responsive complète**
  - Stats cards en grille 2x2 sur mobile (grid-cols-2)
  - Tabs avec scroll horizontal (overflow-x-auto)
  - Graphiques avec hauteur adaptative (h-[200px] sm:h-[280px])
  - Boutons compacts (icônes seules sur mobile)
- ✅ **Page Facturation responsive complète**
  - Stats cards en grille 2x2 sur mobile
  - Vue cards mobile (sm:hidden) pour les factures
  - Vue tableau desktop (hidden sm:block)
  - Actions dropdown sur chaque carte
- ✅ **Page Tâches améliorée**
  - Colonnes Kanban encore plus étroites (260px)
  - Stats cards empilées proprement

### Session 10 - 2026-01-11 (Mobile-First Responsive V2)
- ✅ **Responsive Mobile-First amélioré**
  - Polices réduites: `text-[10px]` pour labels, `text-xs` pour texte
  - Espacements compacts: `p-2 sm:p-3`, `gap-1.5 sm:gap-2`
  - Icônes réduites: `w-3 h-3 sm:w-4 sm:h-4`
- ✅ **Page Budget V2**
  - Header ultra-compact avec titre et actions en ligne
  - Cards stats avec icônes à gauche et texte tronqué
  - Tabs avec `text-[10px]` et abréviations (Vue, Trans., Cat., etc.)
- ✅ **Page Facturation V2**
  - Header compact avec dropdown "Nouveau"
  - Stats cards 2x2 ultra-compactes
  - Filtres inline (recherche + dropdown)
- ✅ **Page Tâches V2**
  - Stats en 3 colonnes centrées sur mobile
  - Recherche et filtre compacts (h-8)
  - Kanban avec gap-2 et colonnes scrollables
- ✅ **Assistant IA - Accès CRM complet**
  - Contexte étendu aux données Qonto (comptes et transactions)
  - L'IA peut maintenant voir toutes les données : Budget, Factures, Contacts, Tâches, Pipeline, Devis, Documents, Qonto
- ✅ **Page Things - Archivage automatique**
  - Les tâches complétées sont automatiquement déplacées vers "Archives"
  - Fonction de restauration disponible

### Session 11 - 2026-01-11 (Bugs critiques + Améliorations)
- ✅ **Assistant IA refonte complète**
  - Nouveau design style Perplexity plus élégant
  - Formatage markdown → HTML (plus d'astérisques ** visibles)
  - Dropdown modèles fonctionnel avec Nano Banana
  - Tooltips sur toutes les icônes
  - Panneau historique amélioré avec suppression
  - Animation de chargement (dots bouncing)
- ✅ **Toggle thème clair/sombre**
  - CSS overrides pour les couleurs hard-codées
  - Thème light fonctionne sur toutes les pages admin
- ✅ **Consolidation Facturation**
  - Une seule page InvoicesPage pour devis + factures
  - Suppression des redirections vers anciennes pages
- ✅ **Qonto OAuth2 (Authorization Code Flow)**
  - Implémentation complète du flow OAuth2
  - Endpoints: /auth/url, /auth/callback, /auth/disconnect
  - Stockage et refresh des tokens en base
  - L'utilisateur doit autoriser l'accès dans Qonto

### Session 12 - 2026-01-11 (Module WeTransfer + Fix Mode Clair)
- ✅ **Bug Fix P0: Texte illisible en mode clair**
  - Texte noir sur fond violet était invisible
  - Ajout de règles CSS avec sélecteurs d'attribut `[class*="text-white"]`
  - Préservation du texte blanc sur boutons colorés (indigo, purple, gradient)
  - Amélioration du contraste des éléments interactifs (`bg-white/5`)
- ✅ **NOUVEAU: Module WeTransfer (Transfert de fichiers)**
  - Backend: `/app/backend/routes/transfers.py`
    - Upload fichiers vers Cloudinary (chunked, 2GB+)
    - Génération de liens uniques de téléchargement
    - Envoi d'emails via Brevo avec template HTML brandé
    - Statistiques (transferts actifs, téléchargements)
    - Expiration configurable (1-30 jours)
  - Frontend Admin: `/admin/transfer` (`TransfersPage.jsx`)
    - Zone drag & drop pour fichiers
    - Formulaire: titre, message, emails destinataires
    - Historique des transferts avec actions (copier lien, voir, supprimer)
    - Stats KPI (transferts actifs, téléchargements)
  - Page publique: `/transfer/:id` (`TransferDownloadPage.jsx`)
    - Page de téléchargement brandée Alphagency
    - Affichage expéditeur, message, liste fichiers
    - Bouton télécharger tout
    - Gestion erreurs 404 et expiration
- ✅ **Nettoyage**
  - Suppression fichier obsolète `FacturationPage.jsx`

### Session 13 - 2026-01-11 (Bug Fix Critique + Améliorations Majeures)
- ✅ **Bug Fix P0 CRITIQUE: Création Devis génère FAC- au lieu de DEV-**
  - **Cause racine:** Routes `/invoices` dupliquées dans `server.py`
  - **Solution:** Suppression des routes dupliquées, centralisation dans `routes/invoices.py`
  - Tests: 10/10 passés (100%)
- ✅ **Configuration Email Brevo**
  - Adresse d'expéditeur: `noreply@alphagency.fr` (à vérifier dans Brevo)
- ✅ **Amélioration Téléchargement PDF Mobile**
  - Utilisation de l'endpoint `/pdf-url` avec URL Cloudinary sur iOS/mobile
- ✅ **Badges Devis/Facture**
  - Badge bleu "DEVIS" pour DEV-XXXX, badge vert "FACTURE" pour FAC-XXXX
- ✅ **MindMap Style Mindnote**
  - Courbes de Bézier, nœuds avec gradient/ombres, fond amélioré
- ✅ **Interface Connexion Qonto**
  - Nouvelle interface élégante avec bouton "Connecter Qonto"
  - Gestion du callback OAuth2
  - Bouton de déconnexion
  - 3 badges de fonctionnalités (Sync auto, Analyse flux, Sécurité)

## En attente de validation utilisateur
- **Email Brevo** : Vérifier `noreply@alphagency.fr` dans le dashboard Brevo
- **PDF Mobile** : Tester le téléchargement sur appareil mobile
- **Qonto** : L'utilisateur doit autoriser l'accès via OAuth2

### Session 14 - 2026-01-12 (Corrections PDF & Paramètres Facturation)
- ✅ **Bug Fix P0 CRITIQUE: Génération PDF avec LayoutError**
  - **Cause racine:** Descriptions longues causaient un dépassement de page dans ReportLab
  - **Solution:** Refonte complète de `generate_professional_pdf()` avec flowables séparés par article
  - Les descriptions ne sont plus tronquées et peuvent s'étendre sur plusieurs pages
  - Format de remise corrigé (`-200.00 €` au lieu de `-200.0fixed`)
- ✅ **Bug Fix P0: Envoi d'email**
  - L'API `/api/invoices/{id}/send-email` fonctionne correctement avec Brevo
  - Copie BCC envoyée à `leo.sperl@alphagency.com`
- ✅ **Amélioration P1: Modale des paramètres de facturation**
  - Ajout des champs `company_address`, `company_siret`, `company_vat` au modèle `InvoiceSettingsUpdate`
  - Valeurs par défaut depuis `COMPANY_INFO` dans le backend
  - Frontend simplifié avec les 4 champs principaux (nom, adresse, SIRET, TVA)
  - Prévisualisation PDF utilise les paramètres en temps réel
- ✅ **Amélioration P1: Suppression multiple**
  - API DELETE `/api/invoices/{id}` fonctionnelle
  - Frontend avec checkbox et barre d'actions groupées
- ✅ **Amélioration P1: InvoicePreview**
  - Utilise les settings pour afficher le nom d'entreprise, adresse, SIRET, TVA
  - Footer PDF avec mentions légales correctes (sans "Pas d'escompte")
- Tests: 12/12 passés (100%) - iteration_27.json

### Session 15 - 2026-01-12 (Preview Unifiée & Templates Email)
- ✅ **Preview Unifiée Devis/Facture**
  - UN SEUL format de preview utilisé partout (paramètres, création, PDF)
  - Tous les champs modifiables: company_name, company_address, company_phone, company_email, company_siret, company_vat
  - Les modifications sont reflétées en temps réel dans la preview
  - Le PDF généré correspond exactement à la preview
- ✅ **Templates Email Brevo**
  - Nouveau endpoint `GET/PUT /api/settings/email-templates`
  - Templates séparés pour Devis et Facture
  - Variables supportées: {{numero}}, {{client_name}}, {{montant}}, {{company_name}}, {{company_phone}}, {{company_email}}
  - Endpoint de test `POST /api/settings/email-templates/test` envoyé à leo.sperl@alphagency.com
- ✅ **Correction Assistant IA** - Élargi les sélecteurs de contexte/modèle pour éviter le coupure

### Session 16 - 2026-01-13 (PDF Conforme GHI & Responsive Mobile)
- ✅ **Structure PDF conforme au modèle GHI**
  - Suppression de la colonne "Code"
  - Colonnes: Désignation | Qté | Remise | P.U. HT | TVA | Total HT
  - Titre en gras + description en dessous dans la même cellule Désignation
  - Descriptions courtes (<1800 car) restent dans une seule ligne
  - Descriptions très longues découpées en lignes de continuation (évite LayoutError)
  - "Montant total TTC" affiché sur une seule ligne
- ✅ **Sections Conditions et Détails de Paiement avec fond gris clair** (comme le modèle)
  - "Conditions de règlement" avec fond gris et liste à puces
  - "Détails de paiement" avec fond gris et infos IBAN formatées
  - Connectées aux paramètres de facturation
- ✅ **Interface Templates Email Améliorée**
  - Champ "Adresse email de test" pour envoyer les tests
  - Champ "Logo pour les emails" avec bouton Upload
  - Bouton "Aperçu" pour prévisualiser l'email avec données exemple
  - Variables {{numero}}, {{client_name}}, {{montant}}, etc. clairement affichées
- ✅ **Corrections Responsive Mobile**
  - Page Campagnes: tabs en icônes sur mobile, stats 2x2, cards mobiles
  - Page AI Assistant: sélecteurs de contexte/modèle non coupés
  - Page Pipeline/Social Media: vérifiées OK
- ✅ **Tâches confirmées déjà faites** (retirées de la liste):
  - Flux "Phase 2" post-création (Envoyer, Télécharger)
  - Création de contact "en ligne"
  - Modale de confirmation avant envoi

### Session 17 - 2026-01-13 (Fix PDF Pagination & Email Templates)
- ✅ **Bug Fix P0: Pagination PDF corrigée - LE TABLEAU COMMENCE SUR PAGE 1**
  - Solution finale: MAX_CHARS_PER_CHUNK = 1200 caractères
  - Les descriptions longues sont divisées en chunks qui coulent naturellement sur les pages
  - DEV-2026-0027 (3779 chars) → 5 pages, tableau démarre page 1
  - DEV-2026-0030 (62 chars) → 2 pages
- ✅ **Bug Fix P0: Fonds gris supprimés**
  - Plus de fonds gris alternés sur les lignes du tableau
  - Fonds gris conservés UNIQUEMENT sur "Conditions de règlement" et "Détails de paiement"
- ✅ **Bug Fix P0: Dates affichées sur le PDF**
  - Format français: DD/MM/YYYY
  - "En date du" pour la date de création
  - "Date de validité" ou "Échéance" selon le type de document
- ✅ **P1: Backend templates d'email finalisé**
  - POST /api/settings/email-templates/test - Envoi email de test avec adresse dynamique
  - GET/POST/DELETE /api/settings/email-logo - Gestion du logo personnalisé
  - Logo utilisé dans les emails de test
- ✅ Tests automatisés: 17/17 passés (iteration_31.json)

### Session 18 - 2026-01-13 (Refonte Visuelle PDF - Charte Rouge Pastel)
- ✅ **Refonte visuelle complète du PDF**
  - **Logo à GAUCHE** (agrandi à 5cm x 1.75cm), **titre DEVIS/FACTURE à DROITE** (grande typo rouge)
  - **DESTINATAIRE** en petit, noir, pas gras (plus discret comme étiquette)
  - **Textes plus fins et petits** dans les sections info (fontSize 8-9)
  - **Fond rouge pastel (#FFF0F5)** sur sections info, dates, conditions, paiement
  - **PAS DE BORDURE FONCÉE** sur les sections pastel (suppression des BOX styles)
- ✅ **Dates sur une seule ligne avec labels en rouge foncé**
  - Format: `Date d'émission: 13/01/2026    Validité: 12/02/2026`
  - Labels en couleur #B85050 (rouge foncé pour contraste)
  - Suppression de la date en doublon (en haut à droite)
- ✅ **Sections Conditions et Paiement affinées**
  - Même style pastel sans bordure
  - Textes plus compacts (fontSize 8)
- ✅ Backend testé via curl: PDF généré sans erreur
- ✅ Analyse du PDF validant tous les changements:
  - ✅ Logo à gauche: CONFORME
  - ✅ DEVIS à droite: CONFORME
  - ✅ DESTINATAIRE petit/noir/pas gras: CONFORME
  - ✅ Dates sur même ligne avec labels rouge foncé: CONFORME
  - ✅ Sections sans bordure foncée: CONFORME

## Known Issues
- Session 17: 100% pass rate (17/17) - iteration_31.json (PDF + Email templates)
- Session 17: 100% pass rate (12/12) - iteration_30.json
- Session 17: 100% pass rate (8/8) - iteration_29.json
- Session 15: Tests manuels passés
- Session 14: 100% pass rate (12/12) - iteration_27.json
- Session 13: 100% pass rate (10/10) - iteration_25.json

## Architecture Backend (mise à jour Session 12)

```
/app/backend/routes/
├── transfers.py       # ✅ NOUVEAU - Module WeTransfer
├── ai_enhanced.py     # ✅ Context-Aware AI
├── backup.py          # ✅ Sauvegardes
├── blog.py            # ✅ Articles
├── budget.py          # ✅ Budget
├── campaigns.py       # ✅ Campagnes
├── database.py        # Utilitaires DB
├── documents.py       # ✅ Documents
├── file_manager.py    # ✅ Gestionnaire fichiers
├── invoices.py        # ✅ Factures
├── meta.py            # ✅ Meta (Facebook/Instagram)
├── news.py            # ✅ Actualités
├── portfolio.py       # ✅ Réalisations
├── qonto.py           # ✅ Intégration Qonto OAuth2
├── quotes.py          # ✅ Devis
├── tags.py            # ✅ Tags
└── tasks.py           # ✅ Tâches
```

