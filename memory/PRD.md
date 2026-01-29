# Alpha Agency CRM - Product Requirements Document

## Original Problem Statement
Application CRM complète pour une agence de marketing digital incluant:
- Gestion des contacts et opportunités
- Facturation (devis, factures, abonnements)
- Module Multilink (clone de zaap.bio)
- Gestionnaire de médias sociaux
- Budget et prévisions
- Calendrier et tâches
- File Manager, Transferts, etc.

## Current Focus: Module Multilink (Clone Zaap.bio)

### ✅ Implémenté (29 Janvier 2026)

#### Système de Blocs Unifié
- `link` - Lien simple avec icône
- `link_image` - Carte avec image, description et bouton "En Savoir +"
- `button` - Bouton CTA
- `text` - Bloc texte avec éditeur Markdown (@uiw/react-md-editor)
- `header` - Titre/En-tête
- `image` - Image avec aspect ratio configurable
- `video` - Vidéo avec aspect ratio configurable
- `youtube` - Embed YouTube
- `carousel` - Carrousel d'images
- `divider` - Séparateur

#### Personnalisation des Couleurs (Onglet Design)
- Fond de page (background)
- Fond des cartes (card_bg)
- Couleur du texte
- Couleur des boutons
- Texte des boutons
- Couleur d'accent
- Aperçu en direct
- Thèmes prédéfinis: Minimal, Dark, Gradient, Ocean, Sunset, Nature, Personnalisé

#### Analytics pour Multilink
- Vues totales avec croissance vs période précédente
- Clics totaux avec croissance
- Taux de conversion (CTR)
- Graphique des vues par jour
- Stats par bloc (clics par bloc)
- Stats par lien (legacy)

#### Page Publique
- Rendu Markdown (react-markdown + remark-gfm)
- Application des couleurs personnalisées
- Enregistrement des clics par bloc pour analytics

### 🔄 En Cours / À Faire

#### P0 - Bug Upload Images (Production uniquement)
- Le bug ne se reproduit qu'en production
- 401 Unauthorized intercepté avec redirection login
- Utilisateur doit ouvrir console pour voir les logs

#### P1 - Comptes Meta
- ✅ Tous les comptes sont visibles maintenant

### 📋 Backlog

1. Stories Editor pour médias sociaux
2. Reports & Analytics dashboard global
3. Bulk Delete pour posts sociaux
4. Amélioration MindMap (export PDF, raccourcis)
5. Push Notifications
6. Intégration Qonto (banking)

### ⛔ Bloqués (Externe)

- **LinkedIn Posting** - En attente d'approbation w_member_social
- **Meta Inbox** - En attente Meta App Review pour pages_messaging

## Architecture Technique

### Backend (FastAPI)
- `/app/backend/routes/multilink.py` - API Multilink (blocs, pages, stats)
- `/app/backend/routes/meta.py` - API Meta (Facebook/Instagram)
- `/app/backend/routes/social.py` - API Social Media Manager

### Frontend (React)
- `/app/frontend/src/pages/dashboard/MultilinkPage.jsx` - Admin UI Multilink
- `/app/frontend/src/pages/public/LinkBioPage.jsx` - Page publique
- `/app/frontend/src/components/SocialComposer.jsx` - Composeur social

### Base de données (MongoDB)
- `multilink_pages` - Pages Multilink
- `multilink_blocks` - Blocs unifiés
- `multilink_stats` - Statistiques (vues, clics)
- `multilink_views` - Vues détaillées

## Credentials de Test
- Email: `admin@alphagency.fr`
- Password: `Test123!`

## URLs
- Admin: `/admin/multilink`
- Page publique: `/lien-bio/{slug}`
