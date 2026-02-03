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

### 6. API Blog avec content_blocks
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

### 2026-02-03 (Session actuelle)

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
PUT  /api/blog/comments/{id}/moderate
DELETE /api/blog/comments/{id}
```

## Tâches Restantes

### P1 (Haute priorité)
- [ ] UI modération commentaires dans BlogAdminPage
- [ ] Scheduler pour briefings automatiques (cron)
- [ ] Tests complets WhatsApp

### P2 (Moyenne priorité)
- [ ] Gmail integration via MoltBot
- [ ] Google Drive sync
- [ ] Story Editor via MoltBot (Instagram)

### Backlog
- [ ] Multi-platform post preview
- [ ] Voice-to-CRM
- [ ] Advanced analytics PDF

## Credentials
- Email: admin@alphagency.fr
- Password: Test123!
- MoltBot Secret: moltbot-alpha-secret-2024
- Blog API Key: blog-alpha-auto-publish-2024-secure

## URLs
- Preview: https://moltbot-crm.preview.emergentagent.com
- Widget iPhone: /widget
- MoltBot Admin: /admin/moltbot
- WhatsApp Config: /admin/whatsapp
