# Alpha Agency CRM - Product Requirements Document

## Overview
Application CRM complète pour agence de communication en Guadeloupe (Alpha Agency). Gestion des contacts, leads, facturation, portfolio, blog, actualités locales et campagnes marketing.

## Core Features

### 1. Dashboard & Analytics
- KPIs principaux (sessions, leads, taux conversion, MRR)
- Graphiques d'évolution
- Notifications et alertes

### 2. Contacts Management
- CRUD contacts avec filtres
- Import/export
- Tags et catégorisation

### 3. Pipeline (CRM)
- Kanban des opportunités
- Colonnes personnalisables
- Drag & drop

### 4. Facturation ✅ UPDATED 2026-01-20
- Devis et factures avec prévisualisation PDF
- **Paiements partiels (Acompte/Solde)** ✅
  - `payment_type`: "acompte" ou "solde"
  - `acompte_percent`: pourcentage d'acompte (30, 40, 50...)
  - Statut "partiel" quand partiellement payé
  - Statut "payée" quand totalement payé
- **CA Encaissé dans statistiques** ✅
  - Calcul basé sur `$sum(total_paid)` et non sur le total des factures "payées"
  - Filtre `facture_filter` inclut `document_type=facture` OU `invoice_number` commençant par "FAC-"
- **Affichage des paiements sur le PDF** ✅
  - Section "💳 Paiements reçus" listant tous les paiements
  - Format: Acompte X% ou Paiement de X€, date, méthode
  - Affiche "FACTURE SOLDÉE" ou "Reste à payer: X€"
- PDF avec descriptions longues divisées en chunks (utilisateur satisfait du rendu actuel)

### 5. Budget & Trésorerie
- Graphique évolution mensuelle
- Catégories de dépenses
- Prévisionnel

### 6. Portfolio (Réalisations)
- Éditeur de blocs avancé (15 types)
- Page publique haut de gamme avec filtres
- Page détail avec métadonnées

### 7. Blog
- Articles avec éditeur riche
- Tags et catégories
- SEO optimisé

### 8. Actualités Locales
- Intégration NewsAPI avec mots-clés locaux

### 9. Campagnes Email/SMS
- Templates prédéfinis
- Éditeur visuel drag-and-drop
- Intégration Brevo

### 10. Module "Things" ✅ UPDATED 2026-01-20
- Liste de tâches journalière style "Things app"
- **Report automatique des tâches non terminées** ✅

### 11. Module Agenda / RDV ✅ TESTED 2026-01-20
- **Intégration Google Calendar API (OAuth2)** ✅
- **Création d'événements avec lien Google Meet** ✅
- **Envoi d'invitations email avec fichier .ics** ✅
- **Confirmation email à l'admin** ✅
- **Redirection vers alphagency.fr après OAuth** ✅ (nécessite config Google Console)
- Relances SMS configurables (via Brevo)
- **⚠️ SMS Guadeloupe**: Bloqué par opérateur mobile

## Environment
- Backend: FastAPI (port 8001)
- Frontend: React (port 3000)
- Database: MongoDB
- Auth: JWT
- Admin: admin@alphagency.fr / superpassword

## Completed Work - Session 2026-01-20

### 4 Corrections validées (14/14 tests passés)
1. ✅ Paiements partiels (Acompte/Solde)
2. ✅ CA Encaissé corrigé (filtre élargi pour anciennes factures)
3. ✅ Paiements affichés sur PDF
4. ✅ Report tâches Things

### Agenda corrigé
- ✅ `GOOGLE_REDIRECT_URI` → `https://alphagency.fr/api/appointments/auth/callback`
- ✅ `FRONTEND_URL` → `https://alphagency.fr`
- ✅ Redirections après OAuth vers alphagency.fr

### Tests Agenda validés
- ✅ Connexion Google Calendar (leo.sperl@alphagency.fr)
- ✅ Création RDV avec lien Meet
- ✅ Envoi invitation avec .ics
- ✅ Suppression RDV

## Action requise utilisateur
**Console Google Cloud** : Ajouter `https://alphagency.fr/api/appointments/auth/callback` dans les Authorized redirect URIs

## Pending Tasks

### P0 - Bloqueurs
- **SMS Guadeloupe**: Bloqué par opérateur - alternatives: Twilio ou WhatsApp Business

### P1 - Priorité haute (RÉSOLU ou différé)
- ~~PDF descriptions longues~~ → Utilisateur satisfait du rendu actuel

### P2 - Priorité moyenne
- Personnalisation des templates email/SMS
- Vérification "Bulk Delete"
- Améliorations MindMap
- Notifications Push

### P3 - Backlog
- Intégration Qonto Phase 3
- Import Gmail factures
- Google Ads / META Ads invoices

## 3rd Party Integrations
- **Brevo**: Emails ✅, SMS ⚠️ (Guadeloupe)
- **Google Calendar API**: OAuth2 ✅, événements ✅, Meet ✅
- **Cloudinary**: Upload fichiers ✅
- **ReportLab**: PDF ✅

## Test Reports
- Session 20: 100% (14/14) - `/app/test_reports/iteration_32.json`
