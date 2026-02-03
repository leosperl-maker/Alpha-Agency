# Alpha Agency CRM & Social Media Management Tool

## Overview
CRM complet et outil de gestion des réseaux sociaux pour Alpha Agency avec:
- Gestion clients et pipeline
- Devis/Factures
- Calendrier éditorial
- Multilink (clone zaap.bio)
- **MoltBot** - Assistant IA avec accès CRM complet
- **Agent X** - Chatbot public sur le site

## Fonctionnalités Principales

### 1. MoltBot (Admin)
- Accès complet au CRM via chat
- Commandes naturelles : "CA du mois", "Crée un devis..."
- Briefing matin et récap soir
- Intégration WhatsApp (préparé)
- Recherche SIRET/Kbis

### 2. Agent X (Public)
- Chatbot FAQ sur le site vitrine
- Design rouge/blanc/noir
- Capture de leads automatique
- Questions fréquentes prédéfinies

### 3. Widget PWA iPhone
- Page `/widget` optimisée mobile
- Tâches du jour avec toggle
- Stats rapides (CA, leads)
- Add to Home Screen ready

### 4. Gestion Commentaires Blog (P1)
- Endpoints: pending, all, moderate, delete
- Statuts: pending, approved, rejected, spam
- Modération depuis le CRM

### 5. API Blog avec content_blocks
- Support images inline
- Publication via n8n

## Changelog

### 2026-02-03 (Session actuelle)

#### ✅ Modifications demandées
- **Bulle téléphone supprimée** de toutes les pages publiques
- **Agent X** (pas MoltBot) pour le chatbot public
- **Couleurs rouge/blanc/noir** pour Agent X

#### ✅ Implémentations
- API MoltBot complète (`/api/moltbot/*`)
- ChatWidget Agent X (rouge)
- Widget PWA iPhone (`/widget`)
- API WhatsApp préparée (`/api/whatsapp/*`)
- Gestion commentaires blog
- Recherche entreprise SIRET/Kbis

## Routes API

### MoltBot (Admin - nécessite X-MoltBot-Secret)
```
GET  /api/moltbot/contacts
GET  /api/moltbot/tasks
POST /api/moltbot/tasks
PUT  /api/moltbot/tasks/{id}/complete
GET  /api/moltbot/invoices
POST /api/moltbot/invoices
GET  /api/moltbot/appointments
POST /api/moltbot/appointments
GET  /api/moltbot/stats
GET  /api/moltbot/briefing
GET  /api/moltbot/recap
POST /api/moltbot/search
GET  /api/moltbot/business-search
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

### WhatsApp (préparé)
```
GET  /api/whatsapp/status
GET  /api/whatsapp/qr
POST /api/whatsapp/webhook
POST /api/whatsapp/send
GET  /api/whatsapp/config
POST /api/whatsapp/config
```

## Tâches restantes

### P1 (Haute priorité)
- [ ] Connexion WhatsApp réelle (QR code)
- [ ] Notifications push automatiques
- [ ] UI modération commentaires dans BlogAdminPage

### P2 (Moyenne priorité)
- [ ] Gmail integration
- [ ] Google Drive sync
- [ ] Story Editor via MoltBot (Instagram)

### Backlog
- [ ] Multi-platform post preview
- [ ] Advanced analytics
- [ ] Voice-to-CRM

## Credentials
- Email: admin@alphagency.fr
- Password: Test123!
- MoltBot Secret: moltbot-alpha-secret-2024
- Blog API Key: blog-alpha-auto-publish-2024-secure

## URLs
- Site: https://marketingcore.preview.emergentagent.com
- Widget iPhone: /widget
- MoltBot Admin: /admin/moltbot
