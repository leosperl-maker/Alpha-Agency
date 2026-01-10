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

## Pending Tasks

### P1 - Priorité haute
- [ ] **Module Documents** - Gestionnaire de fichiers complet (dossiers, upload, téléchargement)
- [ ] **Toggle Thème Clair/Sombre** - Switch entre glassmorphique sombre et thème clair
- [ ] Appliquer le design glassmorphique aux pages restantes (Contacts, Pipeline, Facturation, etc.)

### P2 - Priorité moyenne
- [ ] Nettoyer les routes dupliquées dans server.py (auth, contacts, opportunities restent à migrer)
- [ ] Supprimer le code mort dans server.py après migration complète
- [ ] Intégration Google Agenda
- [ ] Tags sur pages publiques (blog/portfolio) avec filtrage
- [ ] Finaliser intégration Meta (test publication)

### P3 - Priorité basse
- [ ] Étendre l'accès aux données de l'IA (inclure le futur module Documents)
- [ ] Améliorer la recherche globale dans la topbar (plus de types de résultats)

## Known Issues
- Routes dupliquées temporairement dans server.py et modules séparés
- server.py encore partiellement monolithique (~6000 lignes) mais 10 modules extraits

## Architecture Backend (mise à jour)

```
/app/backend/
├── server.py              # Principal (en refactorisation)
├── routes/
│   ├── __init__.py
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
