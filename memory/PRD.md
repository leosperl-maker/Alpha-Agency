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

### ✅ Implémenté (30 Janvier 2026)

#### Système de Blocs Unifié
- `link` - Lien simple avec icône
- `link_image` - Carte avec image, description et bouton "En Savoir +"
- `button` - Bouton CTA
- `text` - Bloc texte avec éditeur Markdown (@uiw/react-md-editor)
- `header` - Titre/En-tête
- `image` - Image avec aspect ratio configurable
- `video` - Vidéo avec aspect ratio configurable
- `youtube` - Embed YouTube
- `carousel` - Carrousel d'images (upload direct image/vidéo/image+lien)
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
- Option afficher/masquer le titre

#### Analytics pour Multilink
- Vues totales avec croissance vs période précédente
- Clics totaux avec croissance
- Taux de conversion (CTR)
- Graphique des vues par jour
- Stats par bloc (clics par bloc)
- Stats par lien (legacy)

#### Domaines Personnalisés (NEW - 30/01/2026)
- Configuration d'un domaine personnalisé par page (ex: bio.votre-domaine.com)
- UI dans l'onglet SEO pour configurer le domaine
- Vérification du statut DNS
- Instructions détaillées pour la configuration CNAME
- Endpoint `/api/multilink/domain/{domain}` pour accès par domaine
- Un domaine ne peut être associé qu'à une seule page

#### Mode Sandbox (Meta & TikTok)
- Toggle entre mode production et sandbox
- Données mock pour développement/test
- Bannières d'indication du mode actif

#### Page Publique
- Rendu Markdown (react-markdown + remark-gfm)
- Application des couleurs personnalisées
- Enregistrement des clics par bloc pour analytics

### 🔄 Prochaines Priorités

#### P0 - Story Editor + Scheduler (Clone Storrito)
- Éditeur de Stories Instagram
- Planification et publication automatique
- Utilisation d'émulateurs Android côté serveur

#### P1 - Dashboard Analytics Complet
- Expansion des analytics Multilink
- Statistiques globales multi-pages

#### P2 - Amélioration Sandbox Meta
- Inclure les commentaires en plus des messages

### 📋 Backlog

1. Bulk Delete pour posts sociaux
2. Amélioration MindMap (export PDF, raccourcis)
3. Push Notifications
4. Intégration Qonto (banking)

### 🐛 Bugs Connus

#### P1 - Comptes Meta Manquants
- Certains comptes Facebook/Instagram ne s'affichent pas
- À investiguer: scopes OAuth, pagination Graph API

### ⛔ Bloqués (Externe)

- **LinkedIn Posting** - En attente d'approbation w_member_social
- **Meta Inbox (Production)** - En attente Meta App Review pour pages_messaging (Mode Sandbox disponible)

## Architecture Technique

### Backend (FastAPI)
- `/app/backend/routes/multilink.py` - API Multilink (blocs, pages, stats, domaines personnalisés)
- `/app/backend/routes/meta.py` - API Meta (Facebook/Instagram) avec Sandbox
- `/app/backend/routes/social.py` - API Social Media Manager

### Frontend (React)
- `/app/frontend/src/pages/dashboard/MultilinkPage.jsx` - Admin UI Multilink (avec domaines personnalisés)
- `/app/frontend/src/pages/public/LinkBioPage.jsx` - Page publique
- `/app/frontend/src/components/SocialComposer.jsx` - Composeur social

### Base de données (MongoDB)
- `multilink_pages` - Pages Multilink (avec `custom_domain`)
- `multilink_blocks` - Blocs unifiés
- `multilink_stats` - Statistiques (vues, clics)
- `multilink_views` - Vues détaillées

## Credentials de Test
- Email: `admin@alphagency.fr`
- Password: `Test123!`

## URLs
- Admin: `/multilink`
- Page publique: `/lien-bio/{slug}`
- Page par domaine: `https://{custom_domain}`
