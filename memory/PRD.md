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

## 🆕 Dernières implémentations (30 Janvier 2026)

### 🤖 Suggestions IA de Posts
- Bouton "Idées IA" dans le calendrier éditorial
- Panneau latéral avec génération d'idées automatiques
- Prise en compte du secteur d'activité (niche) du client
- Thèmes saisonniers automatiques (vacances, événements, etc.)
- Formats variés proposés (post, carrousel, reel, story)
- Utilisation directe d'une idée pour créer un post

### ⌨️ Raccourcis Clavier Complets
- `⌘K` / `Ctrl+K` - Recherche globale
- `?` (Shift+?) - Afficher l'aide des raccourcis
- Séquences G+lettre pour navigation rapide:
  - G+D → Dashboard
  - G+C → Contacts
  - G+T → Tâches
  - G+P → Pipeline
  - G+F → Facturation
  - G+S → Social Media
  - G+E → Éditorial
  - G+M → Multilink
  - G+A → Assistant IA
  - G+B → Budget

### 📴 Mode Hors-ligne (PWA)
- Service Worker configuré pour le cache
- Page offline dédiée
- Cache des assets statiques
- Cache des données API (contacts, tâches, calendriers)
- Indicateur visuel de connexion (barre jaune hors-ligne, verte au retour)
- Synchronisation automatique au retour en ligne

## Module Multilink (Clone Zaap.bio)

### ✅ Fonctionnalités Complètes
- Système de blocs unifié (link, button, text, header, image, video, carousel, etc.)
- Éditeur Markdown pour les blocs texte
- Personnalisation complète des couleurs et styles
- QR Code avec téléchargement PNG/SVG
- Analytics détaillés (vues, clics, CTR, graphiques)
- Domaines personnalisés (CNAME)
- Mode Sandbox pour Meta et TikTok
- Scroll horizontal des onglets sur mobile

## Social Media Manager

### ✅ Fonctionnalités Actuelles
- Calendrier éditorial avec drag & drop
- Assistant IA pour génération de contenu
- Suggestions IA automatiques (NEW)
- Publication multi-plateforme
- Prévisualisation des posts
- Gestion des médias

### 🔄 En attente
- Insights Meta (nécessite App Review)
- Analyse des posts performants

## Architecture Technique

### Backend (FastAPI)
- `/api/editorial/ai/generate-ideas` - Génération d'idées IA (NEW)
- `/api/editorial/ai/assist` - Assistant IA existant
- `/api/multilink/*` - API Multilink complète

### Frontend (React)
- Service Worker pour PWA
- Hook `useOnlineStatus` pour détection connexion
- Command Palette (⌘K)
- Panneau d'idées IA

### PWA Configuration
- `/public/service-worker.js` - Cache et offline support
- `/public/offline.html` - Page hors-ligne
- `/public/manifest.json` - Manifest PWA

## 🔄 Prochaines Priorités

### P1 - Améliorations Social Media
- Meilleur moment pour poster (basé sur les stats quand disponibles)
- Aperçu multi-plateforme
- Suggestions de hashtags avancées

### P2 - Bug Comptes Meta Manquants
- Investiguer scopes OAuth
- Vérifier pagination Graph API

## 📋 Backlog

1. Story Editor (Storrito clone)
2. Analytics & Reporting avancé
3. Intégration Qonto
4. Push Notifications
5. Bulk Delete posts

## ⛔ Bloqués (Externe)

- **LinkedIn Posting** - En attente d'approbation w_member_social
- **Meta Inbox (Production)** - En attente Meta App Review
- **Meta Insights** - Nécessite permissions supplémentaires

## Credentials de Test
- Email: `admin@alphagency.fr`
- Password: `Test123!`

## Raccourcis Clavier (Résumé)
| Raccourci | Action |
|-----------|--------|
| ⌘K / Ctrl+K | Recherche globale |
| ? | Aide raccourcis |
| G → D | Dashboard |
| G → C | Contacts |
| G → T | Tâches |
| G → P | Pipeline |
| G → F | Facturation |
| G → S | Social Media |
| G → E | Éditorial |
| G → M | Multilink |
| G → A | Assistant IA |
| G → B | Budget |
| Échap | Fermer modals |
