# Alpha Agency CRM - Product Requirements Document

## Original Problem Statement
Application CRM complète pour une agence de communication digitale.

## 🆕 Dernières implémentations (30 Janvier 2026)

### 🤖 Assistant IA Social Media (Panneau unifié)
Le panneau "Idées IA" est maintenant un assistant complet avec 3 onglets :

#### 1. Idées de Posts
- Génération automatique basée sur le secteur d'activité
- Thèmes saisonniers automatiques
- Formats variés (post, carrousel, reel, story)
- Utilisation directe d'une idée

#### 2. Générateur de Hashtags (NEW)
- Génération IA basée sur le sujet et le réseau social
- Catégorisation: volume élevé, moyen, niche, tendance
- Set recommandé prêt à copier
- Ajout direct à la légende du post
- Adapté à chaque plateforme (Instagram 30, TikTok 5-7, LinkedIn 3-5, Twitter 2-3)

#### 3. Meilleur Moment pour Publier (NEW)
- Recommandations par réseau social
- Heures optimales basées sur les études d'engagement
- Meilleurs jours de la semaine
- Moments à éviter
- Ajustement selon le secteur d'activité (restaurant, fitness, beauté, etc.)
- Application directe de l'heure au formulaire de post

### ⌨️ Raccourcis Clavier
- `⌘K` / `Ctrl+K` - Recherche globale
- `?` - Aide raccourcis
- `G+lettre` - Navigation rapide

### 📴 Mode Hors-ligne (PWA)
- Service Worker avec cache
- Indicateur de connexion

## Module Multilink

### ✅ Fonctionnalités Complètes
- Système de blocs unifié
- QR Code avec téléchargement
- Analytics détaillés
- Domaines personnalisés
- Mode Sandbox Meta/TikTok

## Architecture Technique

### Nouveaux Endpoints API
```
POST /api/editorial/ai/generate-ideas - Génération d'idées de posts
POST /api/editorial/ai/hashtags - Génération de hashtags
POST /api/editorial/ai/best-time - Meilleurs moments de publication
```

### Données de Timing par Plateforme
```javascript
Instagram: Mardi/Mercredi/Jeudi - 11h, 13h, 19h
Facebook: Mercredi/Jeudi/Vendredi - 9h, 13h, 16h
LinkedIn: Mardi/Mercredi/Jeudi - 8h, 10h, 12h
Twitter: Mercredi/Jeudi - 9h, 12h, 17h
TikTok: Mardi/Jeudi/Vendredi - 19h, 21h, 22h
YouTube: Jeudi/Vendredi/Samedi - 12h, 15h, 21h
```

### Ajustements par Secteur
- Restaurant: Avant les repas (11h30, 18h30, 20h)
- Fitness: Heures d'entraînement (6h, 12h, 18h)
- Beauté: Moments détente (10h, 14h, 20h)
- Retail: Shopping hours (12h, 18h, 21h)
- Tech: Business hours sur LinkedIn (8h30, 12h, 17h)

## 📋 Backlog

1. Aperçu multi-plateforme (voir comment le post apparaîtra)
2. Analytics & Reporting avancé
3. Intégration Qonto
4. Push Notifications

## ⛔ Bloqués (Externe)

- LinkedIn Posting - En attente d'approbation
- Meta Inbox (Production) - En attente App Review
- Meta Insights - Nécessite permissions supplémentaires

## Credentials de Test
- Email: `admin@alphagency.fr`
- Password: `Test123!`
