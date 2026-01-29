# Alpha Agency CRM - Product Requirements Document

## Overview
Application CRM complète pour agence de communication en Guadeloupe (Alpha Agency). Gestion des contacts, leads, facturation, portfolio, blog, calendrier éditorial, et campagnes marketing.

## Core Features

### 1. Dashboard & Analytics ✅
- KPIs principaux
- Graphiques d'évolution
- Notifications

### 2. Contacts Management ✅
- CRUD contacts avec filtres
- Import/export
- Fiche contact avec onglets (Overview, Activité, Affaires, Docs, Éditorial)

### 3. Pipeline (CRM) ✅
- Kanban des opportunités
- Colonnes personnalisables

### 4. Facturation ✅ UPDATED 2026-01-26
- Devis et factures PDF
- Paiements partiels (Acompte/Solde)
- CA Encaissé calculé sur total_paid

#### 4.1 Factures d'Acompte et de Solde ✅ NEW 2026-01-26

**Gestion complète des acomptes et soldes pour contrats long terme**

1. **Factures d'Acompte**
   - Création depuis une facture principale via menu d'actions
   - Choix par pourcentage (30%, 40%, 50%, 70%) ou montant libre
   - Numérotation automatique: `FAC-2026-0001-A1`, `FAC-2026-0001-A2`, etc.
   - Plusieurs acomptes possibles par facture (N acomptes)
   - Libellé personnalisable avec défaut auto-généré
   - Validation: total acomptes ne peut pas dépasser 100%

2. **Factures de Solde**
   - Création après acompte(s) payé(s)
   - Numérotation automatique: `FAC-2026-0001-S`
   - Calcul automatique: Total - Σ(acomptes payés)
   - Une seule facture de solde par facture principale
   - Option "Créer sans acompte" si nécessaire

3. **Synchronisation Automatique**
   - Paiement sur acompte → mise à jour automatique de la facture parente
   - Statuts: `brouillon` → `partiellement_payée` → `soldée`
   - Traçabilité complète: liste des acomptes et solde dans vue détaillée

4. **PDF Professionnel**
   - En-tête clair: "FACTURE D'ACOMPTE" ou "FACTURE DE SOLDE"
   - Référence à la facture principale
   - Récapitulatif des acomptes versés sur la facture de solde

**Endpoints API:**
```
POST   /api/invoices/{id}/create-deposit    # Créer acompte
POST   /api/invoices/{id}/create-balance    # Créer solde
GET    /api/invoices/{id}/related           # Voir factures liées
PUT    /api/invoices/{id}/sync-parent-totals # Sync manuelle
```

#### 4.2 Conditions de Règlement Différenciées ✅ NEW 2026-01-26

**Problème résolu:** Un seul champ de conditions utilisé pour tous les types de documents créait des incohérences juridiques (ex: "Un acompte de 50% est exigé" sur une facture d'acompte).

**Solution:** 4 champs distincts dans les paramètres de facturation:
- `conditions_devis` : Pour les devis
- `conditions_facture` : Pour les factures standard
- `conditions_acompte` : Pour les factures d'acompte
- `conditions_solde` : Pour les factures de solde

**Comportement:**
- Chaque type de document utilise automatiquement ses conditions spécifiques
- Migration automatique des anciens paramètres
- Personnalisation possible par document
- Templates par défaut appropriés pour chaque type

### 5. Module "Things" ✅
- Liste de tâches journalière
- Report automatique des tâches non terminées

### 6. Module Agenda / RDV ✅ UPDATED 2026-01-22
- Google Calendar API (OAuth2)
- Lien Google Meet automatique
- Invitations email avec .ics
- **Fuseau horaire Guadeloupe (America/Guadeloupe)** ✅ FIXED
- **Envoi email invitation Brevo** ✅ FIXED
- Configuration Google depuis Paramètres > Intégrations

### 7. Calendrier Éditorial ✅ COMPLETE 2026-01-22

**Multi-calendar system pour planification social media**

#### Fonctionnalités Terminées

1. **Dates Fortes Intelligentes (IA)** ✅
   - Génération automatique de 20-25 dates marketing par calendrier
   - Basé sur la niche (Restaurant, Beauté, Auto, etc.) et le pays
   - Création de post pré-rempli depuis une date forte

2. **Vue Calendrier** ✅
   - Affichage mensuel avec navigation
   - Posts colorés par calendrier
   - Dates fortes affichées avec icône 📅

3. **Vue Trello avec Drag & Drop** ✅
   - Colonnes par semaine avec cartes draggables (@dnd-kit)
   - API Move pour déplacer les posts entre semaines

4. **Filtres Avancés** ✅
   - Filtre par calendrier, réseau social, statut, format
   - Bouton de réinitialisation des filtres

5. **Prévisualisations Social Media** ✅
   - Mockups réalistes pour Instagram, Facebook, LinkedIn, TikTok, YouTube

6. **IA d'Aide à la Rédaction** ✅
   - Génère idées, légende, hooks, hashtags, CTA
   - Utilise GPT-5.2 via Emergent LLM Key

7. **Export PDF du Planning** ✅ NEW 2026-01-22
   - Export par calendrier avec filtres de dates
   - Export global multi-calendriers
   - Format tableau avec statuts et réseaux

8. **Statistiques par Calendrier** ✅ NEW 2026-01-22
   - Posts par statut, réseau, format, pilier
   - Taux de complétion
   - Timeline par semaine
   - Modal de statistiques dans le frontend

#### API Routes - Calendrier Éditorial
```
GET    /api/editorial/niches
GET    /api/editorial/settings
GET    /api/editorial/calendars
POST   /api/editorial/calendars
GET    /api/editorial/calendars/{id}
PUT    /api/editorial/calendars/{id}
DELETE /api/editorial/calendars/{id}
POST   /api/editorial/calendars/{id}/duplicate
GET    /api/editorial/calendars/{id}/key-dates
POST   /api/editorial/calendars/{id}/key-dates/regenerate
POST   /api/editorial/calendars/{id}/key-dates/{dateId}/create-post
GET    /api/editorial/calendars/{id}/stats        # NEW
GET    /api/editorial/calendars/{id}/export/pdf   # NEW
GET    /api/editorial/stats/global                # NEW
GET    /api/editorial/export/pdf                  # NEW (multi-calendars)
GET    /api/editorial/posts
POST   /api/editorial/posts
PUT    /api/editorial/posts/{id}
DELETE /api/editorial/posts/{id}
PUT    /api/editorial/posts/{id}/move
POST   /api/editorial/ai/assist
POST   /api/editorial/ai/improve-caption
```

## Tests Effectués ✅
- iteration_33.json: 22/22 tests backend calendrier éditorial
- iteration_34.json: 15/15 tests nouvelles fonctionnalités (stats, PDF, email, timezone)

## Environment
- Backend: FastAPI (port 8001)
- Frontend: React (port 3000)
- Database: MongoDB
- Auth: JWT
- Admin: admin@alphagency.fr / superpassword

## Bugs Corrigés 2026-01-22

1. **Fuseau horaire RDV** ✅
   - Problème: RDV à 11h Guadeloupe → 6h sur Google Calendar
   - Solution: Changé `Europe/Paris` → `America/Guadeloupe` dans appointments.py
   - Fichier ICS également mis à jour

2. **Envoi email invitation Brevo** ✅
   - Problème: Erreur 500 `{"message":"Key not found","code":"unauthorized"}`
   - Solution: Ajouté `load_dotenv()` dans appointments.py pour charger BREVO_API_KEY

## Prochaines Étapes

### P1 - Prioritaire
- ❌ **SMS Guadeloupe** - Brevo bloqué, proposer Twilio comme alternative

### P2 - Backlog
- Templates de posts réutilisables
- API Meta/LinkedIn/TikTok pour publication directe
- Vérifier fonctionnalité "Bulk Delete"
- Améliorations MindMap (Export PDF, raccourcis)
- Notifications Push
- Intégration Qonto (banque)

### 8. Module Social Media (Agorapulse-style) 🔄 IN PROGRESS 2026-01-23

**Refonte complète du module pour gestion multi-entités et multi-comptes**

#### Fonctionnalités Terminées ✅

1. **Architecture Multi-Entités** ✅
   - Création/modification/suppression d'entités (marques/clients)
   - Association comptes sociaux ↔ entités
   - Entités initiales: West Witch, Alpha Agency, Antilla

2. **Gestion des Comptes Sociaux** ✅
   - Connexion Facebook/Instagram via OAuth Meta
   - Synchronisation automatique des pages Facebook
   - Assignation de comptes aux entités
   - Déconnexion de comptes

3. **Composer Pro** ✅
   - Création de posts (brouillons et programmés)
   - Bug Pydantic `scheduled_at` CORRIGÉ (Optional[str] = None)
   - Statut automatique: draft si pas de date, scheduled si date

4. **Matrice des Capacités** ✅
   - Capacités par plateforme (canPublishFeed, canPublishStory, etc.)
   - API endpoint pour récupérer les capacités

5. **File d'Attente & Stats** ✅
   - Queue par statut (draft, scheduled, published)
   - Statistiques globales (posts, entités, comptes)

6. **Design Responsive Mobile** ✅ NEW 2026-01-23
   - Navigation principale avec icônes sur mobile
   - EntitySelector vertical sur mobile
   - Calendrier compact avec indicateurs dots
   - Inbox full-width avec panneau détail overlay
   - Cards et grilles adaptatives
   - Typographie responsive (text-xs → text-base)
   - Touch-friendly: boutons min 7x7 → 10x10

#### En Cours / À Faire

1. **Stories Editor** (P1) - Style Storrito, éditeur vertical
2. ~~**Inbox unifiée**~~ ✅ DONE - Messages et commentaires avec sync Meta
3. ~~**Reports & Analytics**~~ (P2) - Dashboards statistiques détaillés (Basique implémenté)
4. ~~**Workers Backend**~~ ✅ DONE - Publication programmée automatique
5. ~~**LinkedIn Integration**~~ ✅ DONE - OAuth et publication
6. ~~**TikTok Integration**~~ ✅ DONE - OAuth connecté (publication nécessite review TikTok)
7. **TikTok Sandbox Mode** ✅ NEW 2026-01-24 - Mode démo pour vidéo de review TikTok

#### TikTok Sandbox Mode ✅ COMPLETE 2026-01-24

Implémentation complète d'un mode sandbox pour enregistrer une vidéo de démonstration pour la review TikTok.

**Fonctionnalités:**
- Variable d'environnement `TIKTOK_SANDBOX=true` pour activer
- Page d'autorisation OAuth simulée dans le frontend
- Création de compte TikTok sandbox avec métadonnées simulées
- Création de posts sandbox avec simulation de statut (scheduled → publishing → published)
- Panneau "API Logs" affichant tous les appels API simulés
- Bannière "TikTok Sandbox Mode" visible dans l'interface
- Badge "Sandbox" sur les comptes et posts TikTok sandbox
- Tous les logs API enregistrés pour la démo vidéo

**Fichiers:**
- `/app/backend/routes/tiktok.py` - Logique sandbox complète (sandbox-authorize, publish, api-logs)
- `/app/frontend/src/components/TikTokSandbox.jsx` - Composants UI sandbox
- `/app/frontend/src/pages/dashboard/SocialMediaPageNew.jsx` - Intégration sandbox UI

**Endpoints TikTok Sandbox:**
```
GET    /api/tiktok/sandbox-status
GET    /api/tiktok/api-logs
DELETE /api/tiktok/api-logs
POST   /api/tiktok/sandbox-authorize
POST   /api/tiktok/publish
POST   /api/tiktok/simulate-scheduled-publish/{post_id}
GET    /api/tiktok/accounts
GET    /api/tiktok/posts
```

#### Meta Integration Refactoring ✅ COMPLETE 2026-01-25

**CRITIQUE: Correction de l'architecture des tokens Meta**

**Problème Résolu:**
- L'ancienne implémentation utilisait les **User Access Tokens** pour publier, ce qui causait des erreurs "Invalid OAuth access token" car les User Tokens ne peuvent pas publier sur les Pages
- Maintenant utilise correctement les **Page Access Tokens** obtenus via `/me/accounts`

**Changements Clés:**
1. **Nouvelle collection `meta_pages`** - Stocke les Page Access Tokens encryptés pour chaque Page Facebook
2. **Tokens séparés pour chaque Page** - Chaque Page a son propre token, jamais de User Token partagé
3. **Instagram utilise le Page Token** - Instagram Business utilise le token de la Page Facebook liée
4. **Scopes OAuth complets** - Ajout des scopes inbox: `pages_messaging`, `instagram_manage_comments`, `instagram_manage_messages`
5. **Suppression des anciens endpoints** - Les routes `/api/meta/*` dans `server.py` ont été supprimées
6. **Nouveau module** - Tout est géré par `/app/backend/routes/meta.py`

**Fichiers Modifiés:**
- `/app/backend/routes/meta.py` - Module complet refactoré avec Page Tokens
- `/app/backend/routes/publication_worker.py` - Utilise maintenant `meta_pages` collection
- `/app/backend/server.py` - Anciens endpoints Meta supprimés

**Endpoints Meta Refactorés:**
```
GET    /api/meta/auth-url              # URL OAuth avec scopes complets
POST   /api/meta/exchange-token        # Échange code → Page Access Tokens
GET    /api/meta/pages                 # Liste des pages avec statut token
GET    /api/meta/status                # Statut de connexion détaillé
POST   /api/meta/publish/facebook      # Publication avec Page Token
POST   /api/meta/publish/instagram     # Publication avec Page Token
POST   /api/meta/inbox/sync            # Sync messages et commentaires
GET    /api/meta/inbox                 # Récupérer inbox
DELETE /api/meta/disconnect            # Déconnexion complète
GET    /api/meta/webhooks              # Vérification webhook Meta
POST   /api/meta/webhooks              # Réception événements webhook
```

**⚠️ ACTION REQUISE UTILISATEUR:**
Après déploiement, l'utilisateur DOIT reconnecter tous ses comptes Meta via OAuth pour générer les nouveaux Page Access Tokens.

#### API Routes - Social Media
```
GET    /api/social/entities
POST   /api/social/entities
PUT    /api/social/entities/{id}
DELETE /api/social/entities/{id}
GET    /api/social/accounts
POST   /api/social/accounts
DELETE /api/social/accounts/{id}
DELETE /api/social/accounts/{id}/entities
POST   /api/social/entities/{id}/accounts/{account_id}
DELETE /api/social/entities/{id}/accounts/{account_id}
POST   /api/social/sync-meta-accounts
GET    /api/social/capabilities
GET    /api/social/capabilities/{platform}/{account_type}
GET    /api/social/posts
POST   /api/social/posts
PUT    /api/social/posts/{id}
DELETE /api/social/posts/{id}
GET    /api/social/queue
GET    /api/social/stats/overview
GET    /api/social/inbox
GET    /api/social/inbox/stats
POST   /api/social/inbox/sync
POST   /api/social/inbox/mark-all-read
PUT    /api/social/inbox/{id}/status
PUT    /api/social/inbox/{id}/priority
POST   /api/social/inbox/{id}/reply
POST   /api/social/inbox/{id}/suggest-reply
GET    /api/social/worker/status
POST   /api/social/worker/start
POST   /api/social/worker/stop
POST   /api/social/worker/process-now
GET    /api/social/worker/queue
GET    /api/meta/auth-url
POST   /api/meta/exchange-token
GET    /api/meta/pages
GET    /api/linkedin/auth-url
POST   /api/linkedin/exchange-token
GET    /api/linkedin/profile
POST   /api/linkedin/post
DELETE /api/linkedin/disconnect
GET    /api/tiktok/auth-url
POST   /api/tiktok/exchange-token
GET    /api/tiktok/profile
POST   /api/tiktok/refresh-token
DELETE /api/tiktok/disconnect
GET    /api/tiktok/sandbox-status     # NEW: Sandbox mode
GET    /api/tiktok/api-logs           # NEW: Sandbox logs
DELETE /api/tiktok/api-logs           # NEW: Clear logs
POST   /api/tiktok/sandbox-authorize  # NEW: Sandbox auth
POST   /api/tiktok/publish            # NEW: Publish/schedule
POST   /api/tiktok/simulate-scheduled-publish/{post_id}  # NEW: Trigger scheduled
GET    /api/tiktok/accounts           # NEW: List TikTok accounts
GET    /api/tiktok/posts              # NEW: List TikTok posts
```

## Tests Effectués ✅
- iteration_33.json: 22/22 tests backend calendrier éditorial
- iteration_34.json: 15/15 tests nouvelles fonctionnalités (stats, PDF, email, timezone)
- iteration_35.json: 20/20 tests backend Social Media module
- iteration_36.json: 29/29 tests Meta integration refactoring ✅ 2026-01-25
- iteration_37.json: 20/20 tests factures acompte/solde ✅ 2026-01-26
- iteration_38.json: 17/17 tests conditions de règlement différenciées ✅ 2026-01-26
- iteration_39.json: 9/9 tests upload média Cloudinary ✅ 2026-01-26
- iteration_40.json: 21/21 tests module Multilink ✅ 2026-01-28
- iteration_41.json: 30/30 tests (21 multilink + 9 upload) + SocialComposer responsive ✅ 2026-01-29

## Modules Ajoutés 2026-01-28
### Module Multilink (type Linktree/Zaap.bio) ✅ ENHANCED 2026-01-29
- **Objectif:** Créer des pages de liens accessibles publiquement sur `/lien-bio/{slug}`
- **Collections MongoDB:** multilink_pages, multilink_links, multilink_stats, multilink_views
- **Endpoints Admin:**
  - CRUD pages: GET/POST/PUT/DELETE `/api/multilink/pages`
  - CRUD liens: GET/POST/PUT/DELETE `/api/multilink/pages/{id}/links`
  - Réordonnement: PUT `/api/multilink/pages/{id}/links/reorder`
  - Stats: GET `/api/multilink/pages/{id}/stats`
  - Upload image: POST `/api/multilink/upload-image`
- **Endpoints Public (sans auth):**
  - GET `/api/multilink/public/{slug}` - Affichage page + enregistrement vue
  - POST `/api/multilink/public/{slug}/click/{link_id}` - Enregistrement clic
- **Frontend Admin:** `/admin/multilink` - Éditeur avec onglets (Contenu, Design, Profil, Réseaux, SEO)
- **Frontend Public:** `/lien-bio/{slug}` - Template moderne mobile-first avec icônes sociaux
- **Thèmes:** minimal, dark, gradient, ocean, sunset, nature, custom (couleurs personnalisées)
- **Design Settings:** button_style (rounded, pill, square, soft, outline), background_type
- **SEO Settings:** title, description, og_image, indexable
- **Social Links:** Icônes sociaux en header (Instagram, Facebook, Twitter, etc.)
- **Icônes:** 20+ icônes (réseaux sociaux + génériques)
- **Stats:** Vues/clics par jour, CTR, graphiques temporels

## Bug Fixes 2026-01-29
- **Fix SocialComposer Mobile Responsive:** Le composeur de posts sociaux n'était pas utilisable sur mobile (3 panneaux côte à côte). Ajout de tabs mobiles (Comptes/Contenu) et masquage du panneau preview sur mobile (trop petit pour être utile).
- **Fix Upload Image "Body is disturbed or locked":** L'erreur se produisait car le body de la requête fetch était lu deux fois (une fois pour vérifier response.ok, une fois pour parser JSON). Corrigé en lisant JSON une seule fois.
- **Fix Multilink theme_colors update:** Quand le thème était "custom" et les custom_colors modifiées, theme_colors n'était pas mis à jour. Corrigé pour merger les custom_colors dans theme_colors automatiquement.

## Bug Fixes 2026-01-26
- **Fix Cloudinary Upload:** Les images pour les posts sociaux étaient stockées en tant que blob:// URLs locales au lieu d'être uploadées vers Cloudinary. Cela causait des erreurs Facebook/Instagram car les URLs n'étaient pas accessibles. Nouveau endpoint POST /api/social/upload-media créé.
- **Fix Meta Scopes:** Retrait des scopes `pages_messaging` et `instagram_manage_messages` qui nécessitent une App Review de Meta.

## 3rd Party Integrations
- **Cloudinary:** Upload médias ✅
- **Google Calendar:** OAuth2 ✅ (fuseau Guadeloupe)
- **Brevo:** Emails ✅, SMS ⚠️ (Guadeloupe bloqué)
- **GPT-5.2:** IA rédactionnelle ✅
- **ReportLab:** Export PDF ✅
- **@dnd-kit:** Drag & drop ✅
- **Meta API:** OAuth Facebook/Instagram ✅ REFACTORÉ 2026-01-25 (App ID: 859300267084667) - Utilise Page Access Tokens
- **LinkedIn API:** OAuth ✅ (Client ID: 78o6g7zdfql0bg) - ⚠️ Publication bloquée par LinkedIn (scope non approuvé)
- **TikTok API:** OAuth ✅ (Client Key: awz0lr5px7ek23jj) - Mode Sandbox pour démo review
- **Cryptography:** Chiffrement tokens ✅

## Files Modified 2026-01-25 (Meta Refactoring)
- `/app/backend/routes/meta.py` - RÉÉCRITURE COMPLÈTE: Page Access Tokens, inbox sync, webhooks
- `/app/backend/routes/publication_worker.py` - Updated pour utiliser meta_pages collection
- `/app/backend/server.py` - SUPPRESSION des anciens endpoints Meta (lignes 6316-6736)
- `/app/backend/routes/meta_integration.py` - SUPPRIMÉ (code intégré dans meta.py)

## Files Modified 2026-01-24
- `/app/backend/routes/tiktok.py` - Réécriture complète pour sandbox mode
- `/app/backend/.env` - TIKTOK_SANDBOX=true ajouté
- `/app/frontend/src/components/TikTokSandbox.jsx` - NEW: Composants UI sandbox (Auth, ApiLogs, Banner, PostComposer, PostsList)
- `/app/frontend/src/components/SocialComposer.jsx` - Fix bouton "Publier maintenant" disabled condition
- `/app/frontend/src/pages/dashboard/SocialMediaPageNew.jsx` - Intégration TikTok Sandbox (handleConnectTikTok, sandbox auth modal, api logs panel, banner)

## Bugs Identifiés 2026-01-24 (Production alphagency.fr)

### Problèmes signalés par l'utilisateur:
1. **Dashboard crashé** - Erreurs de chargement intermittentes sur production
2. **Impossible de sauvegarder/programmer/publier** - Erreur lors de la sauvegarde
3. **Sync DMs/Commentaires crash** - Erreur lors de la synchronisation
4. **LinkedIn OAuth** - Non fonctionnel sur production (redirect_uri mismatch probable)
5. **Bouton "Publier maintenant" inactif** - ✅ CORRIGÉ: condition `disabled` incorrecte dans SocialComposer.jsx

### Corrections apportées cette session:
- ✅ **TikTok Sandbox Mode complet** pour vidéo de review
- ✅ **Fix bouton "Publier maintenant"** dans SocialComposer.jsx (disabled condition)
- ✅ **Fix publication immédiate** - statut `publishing` au lieu de `draft` (server.py ligne 4836)
- ✅ **Fix sync_meta_comments** - adapté à la nouvelle architecture (pages = comptes séparés)

### À vérifier sur production après déploiement:
- Meta pages/Instagram accounts display
- Entity linking fonctionnel
- LinkedIn OAuth callback
- Dashboard loading issues (peut nécessiter investigation logs production)

## Files Modified 2026-01-23
- `/app/backend/server.py` - ScheduledPost model, inbox sync, mark-all-read
- `/app/backend/routes/social_media.py` - Module complet entités/comptes/posts
- `/app/backend/routes/linkedin.py` - NEW: LinkedIn OAuth2 integration
- `/app/backend/routes/tiktok.py` - NEW: TikTok OAuth2 integration
- `/app/backend/routes/inbox.py` - NEW: Inbox sync functions
- `/app/backend/routes/publication_worker.py` - NEW: Scheduled post worker
- `/app/backend/.env` - LinkedIn/TikTok credentials
- `/app/frontend/src/pages/dashboard/SocialMediaPageNew.jsx` - Inbox UI, LinkedIn/TikTok connect, **RESPONSIVE MOBILE**
- `/app/frontend/src/components/SocialComposer.jsx` - Fix imports
- `/app/backend/tests/test_social_media_module.py` - 20 tests backend

## Files Modified 2026-01-22
- `/app/backend/routes/appointments.py` - Fuseau horaire + load_dotenv
- `/app/backend/routes/editorial.py` - Stats + Export PDF
- `/app/frontend/src/pages/dashboard/EditorialCalendarPage.jsx` - Modal stats + boutons export
- `/app/backend/tests/test_new_features_iteration34.py` - Tests nouvelles fonctionnalités
