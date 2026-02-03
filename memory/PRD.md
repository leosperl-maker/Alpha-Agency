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
- Service Baileys Node.js pour connexion QR
- Commandes via WhatsApp
- Briefings automatiques

### 4. Widget PWA iPhone
- Page `/widget` optimisée mobile
- Tâches du jour
- Stats rapides
- Add to Home Screen ready

### 5. Gestion Commentaires Blog
- Endpoints : pending, all, moderate, delete
- Statuts : pending, approved, rejected, spam
- **UI de modération complète dans BlogAdminPage.jsx**
- Bandeau d'alerte pour commentaires en attente
- Modal de modération avec onglets (En attente, Approuvés, Rejetés, Tous)

### 6. Business Search API (Recherche Entreprises)
- API française de recherche d'entreprises
- Source : recherche-entreprises.api.gouv.fr (fiable)
- Recherche par nom, SIRET, SIREN
- Retourne : nom, adresse, dirigeants, effectifs, CA

### 7. API Blog avec content_blocks
- Support images inline
- Publication via n8n

## Architecture

```
/app
├── backend/
│   ├── routes/
│   │   ├── moltbot.py         # API MoltBot complète
│   │   ├── whatsapp.py        # API WhatsApp
│   │   ├── business_search.py # Recherche SIRET
│   │   ├── blog.py            # Blog + commentaires
│   │   └── ...
│   └── server.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatWidget.jsx     # Agent X (rouge)
│       │   └── ...
│       ├── pages/
│       │   ├── WidgetPage.jsx         # PWA iPhone
│       │   └── dashboard/
│       │       ├── MoltBotPage.jsx
│       │       ├── WhatsAppConfigPage.jsx
│       │       └── ...
│       └── ...
└── whatsapp-service/
    ├── package.json
    └── index.js               # Service Baileys
```

## Changelog

### 2026-02-03 (Session actuelle - Suite 5)

#### ✅ WhatsApp P1 Features Finalisés et Testés
- **QR Code issue résolu**: Service WhatsApp Node.js redémarré, session reconnectée automatiquement
- **URL correcte**: `/admin/whatsapp` (pas `/admin/whatsapp-config`)
- **Gestion messages audio améliorée**: 
  - Service Node.js télécharge les fichiers audio
  - Backend transcrit via fichier local (plus fiable que URL)
  - Nettoyage automatique des fichiers temporaires
- **Boutons de test briefings**: Interface UI pour tester manuellement l'envoi des briefings
- **API test-briefing**: Nouvel endpoint `/api/whatsapp/test-briefing` pour déclencher manuellement

#### ✅ Personnalisation profil WhatsApp
- **Modification du nom de profil**: API `/api/whatsapp/profile/name` + UI avec crayon
- **Modification de la photo**: API `/api/whatsapp/profile/picture` + overlay caméra
- **Nom changé**: "Alpha Agency" → "Agent X - Alpha Agency"
- **Interface intuitive**: Clic sur photo/nom pour modifier

#### ✅ Fix Comptes Meta manquants (Pagination)
- **Problème**: L'API Facebook pagine les résultats mais le code ne gérait pas la pagination
- **Solution**: Ajout de la boucle de pagination dans `/api/meta/exchange-token`
- **Nouvel endpoint**: `/api/meta/resync-pages` pour resynchroniser tous les comptes depuis Meta
- **UI**: Bouton "Resync depuis Meta" dans la page Social Media → Accounts
- **Limite augmentée**: De 25 à 100 pages par requête + pagination automatique

#### ✅ Tests passés: iteration_49
- Backend: 20/20 tests (100%)
- Frontend: 100% (UI vérifiée)
- Service WhatsApp: Connecté et fonctionnel

### 2026-02-03 (Session actuelle - Suite 2)

### 2026-02-03 (Session actuelle - Suite 4)

#### ✅ MoltBot P1 Features implementés
- **Transcription audio Whisper** (`/api/audio/*`)
  - Upload fichiers audio (mp3, wav, ogg, etc.)
  - Transcription depuis URL
  - Historique des transcriptions
- **WhatsApp bidirectionnel avec audio**
  - Webhook traite messages texte ET audio
  - Transcription automatique des vocaux
  - Réponses formatées
- **Scheduler briefings automatiques**
  - Briefing matin 8h00 (tâches, RDV, alertes)
  - Récap soir 18h00 (CA, tâches terminées)
  - Timezone America/Guadeloupe
  - Check tâches en retard

#### ✅ Corrections UI
- ChatWidget "Agent X" → "MoltBot"
- Numéro téléphone 0691 266 003
- MoltBot sidebar X bouton visible

#### ✅ Tests passés: 25/25 backend, 100% frontend

### 2026-02-03 (Session actuelle - Suite 3)

#### ✅ Refonte interface MoltBot
- Suppression de "Assistant IA" du menu (remplacé par MoltBot)
- Nouveau layout responsive avec sidebar droite compacte
- Version mobile optimisée avec sidebar cachée
- Stats du mois, WhatsApp, et astuces dans sidebar
- Quick actions en bas (Stats, Tâches, RDV, Devis, Briefing, Aide)

#### ✅ MoltBot Document Intelligence (Gemini AI)
- API `/api/document-ai/*` pour classification intelligente
- Analyse OCR et contenu avec gemini-2.5-flash
- Suggestion automatique de nom et dossier
- UI intégrée dans page Documents avec bouton violet "Analyser avec MoltBot"
- Panneau MoltBot AI avec liste des fichiers à analyser
- Bouton "Appliquer les suggestions" pour renommer/déplacer automatiquement

#### ✅ Interface Documents style Google Drive
- Sidebar avec arborescence des dossiers
- Indicateur de stockage (X Ko / 15 Go)
- Panneau de détails (clic droit ou bouton info)
- Vue grille et liste
- Drag & drop pour upload
- Recherche dans Drive

#### ✅ Corrections P0 terminées
1. **Numéro téléphone Agent X** → 0691 266 003 (était 0690 05 34 44)
2. **UI Modération commentaires** → Modal complète avec onglets
3. **Business Search API** → Réécrite pour utiliser recherche-entreprises.api.gouv.fr

#### ✅ Tests passés (100%)
- Backend: 9/9 tests passés (iteration_45)
- Frontend Documents: 100% (iteration_46)
- Login flow: PASS

### 2026-02-03 (Session précédente)

#### ✅ Demandes utilisateur
- Bulle téléphone supprimée de toutes pages publiques
- Agent X (pas MoltBot) pour chatbot public
- Couleurs rouge/blanc/noir pour Agent X

#### ✅ Implémentations
1. **Agent X** - Chatbot public rouge
2. **WhatsApp Service** - Node.js + Baileys
3. **Page /admin/whatsapp** - Configuration QR + settings
4. **Gestion commentaires** - Modération blog
5. **Widget PWA** - `/widget` pour iPhone

## Routes API Principales

### MoltBot
```
GET  /api/moltbot/stats
GET  /api/moltbot/briefing
GET  /api/moltbot/recap
POST /api/moltbot/tasks
POST /api/moltbot/invoices
POST /api/moltbot/search
```

### WhatsApp
```
GET  /api/whatsapp/status
GET  /api/whatsapp/qr
POST /api/whatsapp/webhook
POST /api/whatsapp/send
GET/POST /api/whatsapp/config
```

### Blog Comments
```
GET  /api/blog/articles/{slug}/comments
POST /api/blog/articles/{slug}/comments
GET  /api/blog/comments/pending
GET  /api/blog/comments/all
PUT  /api/blog/comments/{id}/moderate
DELETE /api/blog/comments/{id}
```

### Business Search
```
GET  /api/business/search?query=nom_entreprise
GET  /api/business/search/all?query=nom&limit=10
GET  /api/business/siret/{siret}
GET  /api/business/siren/{siren}
```

## Tâches Restantes

### P0 (Terminé ce jour)
- [x] Numéro téléphone Agent X corrigé → 0691 266 003
- [x] UI modération commentaires dans BlogAdminPage
- [x] Business Search API fonctionnelle
- [x] Interface Documents style Google Drive
- [x] MoltBot : Classification intelligente des documents (Gemini AI)

### P1 (Terminé ce jour)
- [x] Transcription audio/vidéo avec Whisper
- [x] WhatsApp bidirectionnel avec support audio
- [x] Scheduler briefings automatiques (matin/soir)

### P2 (Moyenne priorité)
- [ ] Gmail integration via MoltBot
- [ ] Google Drive sync avec tri automatique MoltBot
- [ ] Story Editor via MoltBot (Instagram)
- [ ] Accounts Meta manquants (pagination/scopes OAuth)

### Backlog
- [ ] Multi-platform post preview
- [ ] Voice-to-CRM
- [ ] Advanced analytics PDF
- [ ] Automatisations avancées (lead scoring, alertes churn)

## Credentials
- Email: admin@alphagency.fr
- Password: Test123!
- MoltBot Secret: moltbot-alpha-secret-2024
- Blog API Key: blog-alpha-auto-publish-2024-secure

## URLs
- Preview: https://smart-agent-54.preview.emergentagent.com
- Widget iPhone: /widget
- MoltBot Admin: /admin/moltbot
- WhatsApp Config: /admin/whatsapp
