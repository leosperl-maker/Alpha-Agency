# Alpha Agency CRM - Product Requirements Document

## Original Problem Statement
Application CRM complète pour une agence de communication digitale incluant:
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
- Fond de page, cartes, texte, boutons, accent
- Thèmes prédéfinis + personnalisé
- Option afficher/masquer le titre

#### QR Code (NEW)
- Génération automatique de QR Code pour chaque page
- Téléchargement en PNG (1024px) ou SVG vectoriel
- URL basée sur le domaine personnalisé si configuré

#### Analytics Multilink (Onglet dédié)
- Vues totales avec croissance
- Clics totaux avec croissance
- Taux de conversion (CTR)
- Graphique des vues par jour (30 derniers jours)
- Stats détaillées par bloc (clics par élément)
- Barre de progression pour comparer les performances

#### Domaines Personnalisés
- Configuration d'un domaine personnalisé par page (ex: bio.votre-domaine.com)
- UI dans l'onglet SEO pour configurer le domaine
- Vérification du statut DNS
- Instructions détaillées pour la configuration CNAME

#### Mode Sandbox (Meta & TikTok)
- Toggle entre mode production et sandbox
- Données mock pour développement/test

### 🆕 Améliorations UX (30 Janvier 2026)

#### Barre de recherche globale (⌘K)
- Command Palette accessible via ⌘K (Mac) ou Ctrl+K (Windows)
- Recherche dans: Navigation, Actions rapides, Contacts, Tâches, Factures, Opportunités
- Navigation au clavier (↑↓ + Entrée)
- Regroupement par catégorie

#### Sélecteur d'agent IA amélioré
- Dialog modal au lieu de dropdown scroll
- Interface claire avec icônes et descriptions
- Fonctionne parfaitement sur mobile

#### Actions rapides améliorées
- Plus d'options: Contact, Tâche, Facture, Opportunité, Multilink, Publier, Assistant IA
- Design amélioré avec labels de section

#### Mobile: Onglets Multilink scrollables
- Les onglets (Contenu, Design, Profil, Réseaux, SEO, Analytics) sont maintenant scrollables horizontalement sur mobile

### 🔄 Prochaines Priorités

#### P0 - Social Media Manager
- Suggestions IA de posts (calendrier éditorial)
- Meilleur moment pour poster
- Aperçu multi-plateforme
- Suggestions de hashtags

#### P1 - Story Editor + Scheduler (Clone Storrito)
- Éditeur de Stories Instagram
- Planification et publication automatique

#### P2 - Mode hors-ligne
- Dashboard admin fonctionnel sans connexion (PWA + cache)

### 📋 Backlog

1. Bulk Delete pour posts sociaux
2. Amélioration MindMap (export PDF, raccourcis)
3. Push Notifications
4. Intégration Qonto (banking)
5. Analytics & Reporting avancé
6. Gestion client (portail, notes internes)

### 🐛 Bugs Connus

#### P1 - Comptes Meta Manquants
- Certains comptes Facebook/Instagram ne s'affichent pas
- À investiguer: scopes OAuth, pagination Graph API

### ⛔ Bloqués (Externe)

- **LinkedIn Posting** - En attente d'approbation w_member_social
- **Meta Inbox (Production)** - En attente Meta App Review pour pages_messaging (Mode Sandbox disponible)

## Architecture Technique

### Backend (FastAPI)
- `/app/backend/routes/multilink.py` - API Multilink
- `/app/backend/routes/meta.py` - API Meta avec Sandbox
- `/app/backend/routes/social.py` - API Social Media Manager

### Frontend (React)
- `/app/frontend/src/pages/dashboard/MultilinkPage.jsx` - Admin UI Multilink (QR Code, Analytics)
- `/app/frontend/src/pages/dashboard/DashboardLayout.jsx` - Layout avec Command Palette (⌘K)
- `/app/frontend/src/pages/dashboard/AIAssistantPageNew.jsx` - Assistant IA (sélecteur modal)
- `/app/frontend/src/components/QuickActions.jsx` - Actions rapides améliorées
- `/app/frontend/src/components/FloatingAIChat.jsx` - Chat IA flottant

### Base de données (MongoDB)
- `multilink_pages` - Pages Multilink (avec `custom_domain`)
- `multilink_blocks` - Blocs unifiés
- `multilink_stats` - Statistiques (vues, clics)

## Credentials de Test
- Email: `admin@alphagency.fr`
- Password: `Test123!`

## URLs
- Admin: `/admin`
- Multilink Admin: `/admin/multilink`
- Page publique: `/lien-bio/{slug}`
- Page par domaine: `https://{custom_domain}`

## Raccourcis Clavier
- `⌘K` / `Ctrl+K` - Ouvrir la recherche globale
- `↑↓` - Naviguer dans les résultats
- `Entrée` - Sélectionner
- `Échap` - Fermer
