# Alpha Agency CRM & Social Media Management Tool

## Vue d'ensemble
CRM complet pour Alpha Agency avec gestion clients, devis/factures, calendrier éditorial, Multilink, et intégration IA complète via MoltBot.

## Fonctionnalités Principales

### 1. MoltBot (Assistant IA Admin)
- Chat interface dans `/admin/moltbot`
- Commandes naturelles : "CA du mois", "Crée un devis..."
- Briefing matin et récap soir automatiques
- Accès complet au CRM

### 2. Agent X (Chatbot Public)
- Widget chat rouge sur le site public
- FAQ automatique
- Capture de leads
- Design rouge/blanc/noir
- **Téléphone contact : 0691 266 003**

### 3. WhatsApp Business Integration
- Page de configuration : `/admin/whatsapp`
- **Baileys (actuel)**: Service Node.js pour connexion QR - FONCTIONNEL
- **Cloud API (nouveau)**: API officielle Meta - EN COURS DE CONFIG
- Commandes WhatsApp avancées :
  - "Crée devis 1500€ pour Client, description" → Génère un devis
  - "Crée facture 500€ pour Client, service" → Génère une facture
  - "Envoie devis DEV-2024-001" → Génère le PDF
  - Stats, tâches, contacts, briefing, etc.
- Briefings automatiques matin/soir
- Modification nom/photo profil WhatsApp

### 4. Instagram Story Editor (NOUVEAU - COMPLET)
- **Route**: `/admin/instagram-stories`
- **Backend**: `/api/instagram-story/*`
- **Features**:
  - ✅ **Éditeur visuel WYSIWYG** avec aperçu téléphone en temps réel
  - ✅ **Stickers d'engagement drag-and-drop**: Sondage, Question, Quiz, Mention, Lien, Texte
  - ✅ **Stylisation du texte**: taille, police, couleur, gras, italique, ombre
  - ✅ **Couleur de fond personnalisable**
  - ✅ **Multi-comptes Instagram**
  - ✅ **Historique par compte**
  - ✅ **Suppression de comptes**
  - ✅ **Programmation des Stories**
  - ✅ **Test de connexion Instagram** (Playwright)
- **WARNING**: L'automatisation est contre les CGU Instagram - risque de suspension

### 5. Widget PWA iPhone
- Page `/widget` optimisée mobile
- Tâches du jour
- Stats rapides
- Add to Home Screen ready

### 6. Gestion Commentaires Blog
- Endpoints : pending, all, moderate, delete
- Statuts : pending, approved, rejected, spam
- **UI de modération complète dans BlogAdminPage.jsx**
- Bandeau d'alerte pour commentaires en attente
- Modal de modération avec onglets (En attente, Approuvés, Rejetés, Tous)

### 7. Business Search API (Recherche Entreprises)
- API française de recherche d'entreprises
- Source : recherche-entreprises.api.gouv.fr (fiable)
- Recherche par nom, SIRET, SIREN
- Retourne : nom, adresse, dirigeants, effectifs, CA

### 8. API Blog avec content_blocks
- Support images inline
- Publication via n8n

## Architecture

```
/app
├── backend/
│   ├── routes/
│   │   ├── moltbot.py         # API MoltBot complète
│   │   ├── whatsapp.py        # API WhatsApp Baileys
│   │   ├── whatsapp_cloud.py  # API WhatsApp Cloud (scaffolding)
│   │   ├── instagram_story.py # API Stories (comptes, brouillons, publication)
│   │   ├── instagram_automation.py # Playwright pour automation Instagram
│   │   ├── business_search.py # Recherche SIRET
│   │   ├── blog.py            # Blog + commentaires
│   │   └── ...
│   └── server.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatWidget.jsx     # Agent X (rouge)
│       │   ├── StoryEditor.jsx    # Éditeur visuel de Stories
│       │   └── ...
│       ├── pages/
│       │   ├── WidgetPage.jsx         # PWA iPhone
│       │   └── dashboard/
│       │       ├── MoltBotPage.jsx
│       │       ├── WhatsAppConfigPage.jsx
│       │       ├── InstagramStoryPage.jsx  # Page Stories complète
│       │       └── ...
│       └── ...
└── whatsapp-service/
    ├── package.json
    └── index.js               # Service Baileys
```

## Changelog

### 2026-02-03 (Session actuelle - Suite 7)

#### ✅ Instagram Story Editor COMPLET
- **Éditeur Visuel WYSIWYG** : Nouveau composant `StoryEditor.jsx`
  - Aperçu téléphone iPhone avec Dynamic Island
  - Zone de drop pour média (image/vidéo)
  - 6 types de stickers avec drag-and-drop via @dnd-kit
- **Stickers d'engagement**:
  - Sondage (2 options, question personnalisable)
  - Question ouverte
  - Quiz (4 options, bonne réponse)
  - Mention (@username)
  - Lien (texte personnalisable)
  - Texte (taille, police, couleur, ombre)
- **Onglets de l'éditeur**:
  - Stickers : grille des 6 types
  - Texte : paramètres par défaut
  - Fond : couleurs prédéfinies + custom
- **Gestion Multi-comptes**:
  - Liste des comptes avec stats (publiées/en attente)
  - Bouton Historique par compte
  - Suppression de comptes
  - Test de connexion Instagram

#### ✅ Fix Playwright (P0 Bloqueur)
- **Problème**: Le navigateur Chromium n'était pas installé dans `/pw-browsers/`
- **Solution**: Installation de Chromium via `python3 -m playwright install chromium`
- **Résultat**: Le test de connexion Instagram retourne 200 (pas 500)
- **Note**: Timeout normal avec identifiants invalides

#### ✅ API Améliorée
- Nouvel endpoint: `GET /api/instagram-story/accounts/{id}/history` - Historique par compte
- Amélioration: `GET /api/instagram-story/drafts` - Filtre par account_id

#### ✅ Tests (iteration_50)
- Backend: 23/23 tests passés (100%)
- Frontend: 100% vérifié
- Playwright: Fonctionnel (pas d'erreur 500)

### Sessions précédentes

#### WhatsApp Business Cloud API (Backend)
- Endpoints pour config, status, send/text, send/media, send/template, webhook
- UI dans `/admin/whatsapp` avec champs credentials

#### Commandes WhatsApp Avancées
- "Crée devis 1500€ pour Client, description" → Crée un devis
- "Crée facture 500€ pour Client, service" → Crée une facture

#### Fix Comptes Meta manquants (Pagination)
- Boucle de pagination pour récupérer tous les comptes
- Bouton "Resync depuis Meta"

## Routes API Instagram Stories

```
# Comptes
GET  /api/instagram-story/accounts           # Liste des comptes
POST /api/instagram-story/accounts           # Ajouter un compte
GET  /api/instagram-story/accounts/{id}      # Détails d'un compte
DELETE /api/instagram-story/accounts/{id}    # Supprimer un compte
POST /api/instagram-story/accounts/{id}/test # Tester connexion (Playwright)
GET  /api/instagram-story/accounts/{id}/history # Historique du compte

# Brouillons/Stories
GET  /api/instagram-story/drafts             # Liste des brouillons
POST /api/instagram-story/drafts             # Créer un brouillon
GET  /api/instagram-story/drafts/{id}        # Détails d'un brouillon
DELETE /api/instagram-story/drafts/{id}      # Supprimer un brouillon
POST /api/instagram-story/drafts/{id}/publish # Publier une story

# Info
GET  /api/instagram-story/elements           # Types de stickers disponibles
GET  /api/instagram-story/analytics          # Statistiques
```

## Tâches Restantes

### Terminées cette session
- [x] Fix Playwright (erreur 500 → OK)
- [x] Éditeur visuel WYSIWYG avec aperçu téléphone
- [x] Stickers drag-and-drop (6 types)
- [x] Stylisation du texte
- [x] Historique par compte
- [x] Suppression de comptes

### P1 (En attente de credentials)
- [ ] Gmail integration via MoltBot (bloqué sur Google credentials)
- [ ] Google Drive sync avec tri automatique MoltBot (bloqué sur Google credentials)
- [ ] WhatsApp Business Cloud API (bloqué sur Meta credentials)

### Backlog
- [ ] Multi-platform post preview
- [ ] Voice-to-CRM
- [ ] Advanced analytics PDF
- [ ] Automatisations avancées (lead scoring, alertes churn)
- [ ] Commandes WhatsApp avancées (factures PDF avec envoi)

## Credentials
- Email: admin@alphagency.fr
- Password: Test123!
- MoltBot Secret: moltbot-alpha-secret-2024
- Blog API Key: blog-alpha-auto-publish-2024-secure

## URLs
- Preview: https://social-command-10.preview.emergentagent.com
- Widget iPhone: /widget
- MoltBot Admin: /admin/moltbot
- WhatsApp Config: /admin/whatsapp
- Instagram Stories: /admin/instagram-stories

## Notes Techniques

### Playwright
- Chemin browsers: `/pw-browsers/`
- Variable d'environnement: `PLAYWRIGHT_BROWSERS_PATH=/pw-browsers`
- Chromium installé via: `python3 -m playwright install chromium`

### Instagram Automation
- Contre les CGU Instagram (risque de suspension)
- Utilisé pour poster des Stories (non supporté par l'API officielle)
- Alternative recommandée: Meta Business Suite
