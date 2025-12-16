# ALPHA Agency - Site Web + Dashboard CRM

## Projet Original
Création du site web + dashboard CRM pour ALPHA Agency, agence de communication digitale 360° basée en Guadeloupe.

## Technologies Utilisées
- **Backend**: FastAPI (Python) avec MongoDB
- **Frontend**: React avec Tailwind CSS et Shadcn/UI
- **Intégrations**: 
  - Stripe (paiements/abonnements)
  - Resend (emails transactionnels)
  - PDF Generation (reportlab)

## Fonctionnalités Implémentées

### Site Vitrine
- [x] Page d'accueil avec hero, services, process, stats animés
- [x] Page L'agence (présentation, valeurs, méthodologie)
- [x] Page Nos offres (Site Web 90€/mois, CM, Photo, Vidéo, Ads)
- [x] Page Réalisations/Portfolio avec filtres
- [x] Page Blog avec articles
- [x] Page Contact avec formulaire complet
- [x] Pages légales (Mentions, Confidentialité, Cookies)
- [x] Navigation responsive avec menu mobile
- [x] Footer avec coordonnées et réseaux sociaux
- [x] Design "Digital Noir" avec palette bordeaux/noir/blanc

### Dashboard CRM
- [x] Authentification JWT (login/register)
- [x] Vue d'ensemble avec KPIs et graphiques
- [x] Gestion des contacts (CRUD complet)
- [x] Pipeline commercial (Kanban: Nouveau→Qualifié→Devis→Gagné/Perdu)
- [x] Création et gestion des devis avec génération PDF
- [x] Création et gestion des factures avec génération PDF
- [x] Gestion des abonnements (MRR tracking)
- [x] Page paramètres (entreprise, KPIs, intégrations)
- [x] Interface entièrement en français

### API Backend
- [x] Auth: /api/auth/register, /api/auth/login, /api/auth/me
- [x] Contacts: CRUD complet
- [x] Opportunités: CRUD avec pipeline
- [x] Devis: création, envoi, conversion en facture, PDF
- [x] Factures: création, statuts, PDF
- [x] Abonnements: gestion des plans récurrents
- [x] Lead form public: /api/lead
- [x] Dashboard stats: /api/dashboard/stats, /api/dashboard/pipeline
- [x] Paiements Stripe: création checkout session

## Prochaines Étapes

### Phase 2 - Intégrations
- [ ] Configurer clé API Resend pour emails réels
- [ ] Ajouter ID Google Analytics 4
- [ ] Configurer Stripe en mode production
- [ ] Ajouter le SIREN/SIRET dans les paramètres

### Phase 3 - Fonctionnalités Avancées
- [ ] Automatisation des relances devis (X jours après envoi)
- [ ] Notifications email pour nouveaux leads
- [ ] Export comptable des factures
- [ ] Intégration calendrier pour prise de RDV
- [ ] Google OAuth optionnel

### Phase 4 - Contenu
- [ ] Ajouter les photos de l'équipe
- [ ] Ajouter les vraies réalisations au portfolio
- [ ] Rédiger les articles de blog
- [ ] Compléter les informations légales (SIREN, etc.)

## Identité
- **Raison sociale**: Alpha Digital (SASU)
- **Nom commercial**: ALPHA Agency
- **Adresse**: 3 Boulevard du Marquisat de Houelbourg, 97122 Baie-Mahault
- **Contact**: 0691 266 003 | leo.sperl@alphagency.fr
- **Palette**: Noir (#050505) / Bordeaux (#6A0F1A) / Blanc
