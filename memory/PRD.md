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
- **Structure PDF conforme au modèle de référence:** ✅ FINAL 2026-01-13
  - **Header tableau BLEU MARINE FONCÉ** (comme preview paramètres) ✅
  - **Pas de colonne "Code"** - uniquement Désignation | Qté | Remise | P.U. HT | TVA | Total HT
  - **Titre en gras + description dans la même cellule Désignation** ✅
  - **Descriptions longues:** divisées en chunks de ~1200 caractères ✅
  - **"Montant Total de votre investissement (TTC)" en VERT** ✅
  - **Prix TTC en VERT** ✅
  - **Section "Bon pour accord & signature"** (simplifiée, une seule ligne) ✅
  - **Sections "Conditions de règlement" et "Détails de paiement" avec fond rose pastel** ✅
- **Remises par ligne (% ou €)** ✅
- **Remise globale (% ou montant fixe)** ✅
- TVA 8.5% (Guadeloupe)
- **PDF téléchargement mobile iOS/Safari corrigé** ✅
- **Sélection multiple + actions groupées (mobile & desktop)** ✅

### 5. Budget & Trésorerie
- Graphique évolution mensuelle (combine budget + bank_transactions)
- Catégories de dépenses
- Prévisionnel

### 6. Portfolio (Réalisations) ✅ REFONTE COMPLÈTE 2026-01-09
- **Éditeur de blocs avancé (15 types)**
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
- Éditeur visuel drag-and-drop (react-email-editor)
- Intégration Brevo

### 10. Module "Things" ✅ UPDATED 2026-01-20
- Liste de tâches journalière style "Things app"
- **Report automatique des tâches non terminées** ✅
  - Les tâches avec `dueDate < today` et `!completed` et `!archived` sont reportées à aujourd'hui
  - Champ `rescheduledFrom` conserve la date originale
  - Champ `rescheduledAt` enregistre le moment du report

### 11. Module Agenda / RDV ✅ 2026-01-13
- Intégration Google Calendar API (OAuth2)
- Création d'événements avec lien Google Meet
- Envoi d'invitations email avec fichier .ics
- Relances SMS configurables (via Brevo)
- **⚠️ BLOCKER SMS Guadeloupe**: Les SMS ne sont pas reçus (problème opérateur)

## Architecture Backend

```
/app/backend/
├── server.py              # Principal
├── routes/
│   ├── ai_enhanced.py     # ✅ Context-Aware AI
│   ├── appointments.py    # ✅ Agenda/RDV + Google Calendar
│   ├── backup.py          # ✅ Sauvegardes
│   ├── blog.py            # ✅ Articles
│   ├── budget.py          # ✅ Budget
│   ├── campaigns.py       # ✅ Campagnes
│   ├── database.py        # Utilitaires DB partagés
│   ├── documents.py       # ✅ Documents
│   ├── file_manager.py    # ✅ Gestionnaire fichiers
│   ├── invoices.py        # ✅ Factures + PDF + Paiements
│   ├── meta.py            # ✅ Meta (Facebook/Instagram)
│   ├── news.py            # ✅ Actualités
│   ├── portfolio.py       # ✅ Réalisations
│   ├── qonto.py           # ✅ Intégration Qonto OAuth2
│   ├── quotes.py          # ✅ Devis
│   ├── tags.py            # ✅ Tags
│   ├── tasks.py           # ✅ Tâches
│   └── transfers.py       # ✅ WeTransfer
└── requirements.txt
```

## Environment
- Backend: FastAPI (port 8001)
- Frontend: React (port 3000)
- Database: MongoDB
- Auth: JWT
- Admin: admin@alphagency.fr / superpassword

## Completed Work - 2026-01-20

### Session 20 - 4 Corrections validées
- ✅ **Système de paiement partiel (Acompte/Solde)**
  - POST /api/invoices/{id}/payments accepte `payment_type` et `acompte_percent`
  - Statut passe à "partiel" puis "payée"
  - Tests: 6/6 passés
- ✅ **CA Encaissé corrigé**
  - Calcul basé sur `$sum(total_paid)` au lieu du total des factures "payées"
  - Filtre inclut les factures sans `document_type` (anciennes données)
  - Tests: 2/2 passés
- ✅ **Affichage paiements sur PDF**
  - Section "💳 Paiements reçus" avec détails
  - Tests: 4/4 passés
- ✅ **Report tâches Things**
  - Code présent (lignes 34-48 de ThingsPage.jsx)
  - Tests: 1/1 passé (code review)

**Test Report**: /app/test_reports/iteration_32.json - 14/14 PASSED (100%)

## Pending Tasks

### P0 - Bloqueurs
- **SMS Guadeloupe**: Les SMS via Brevo ne sont pas reçus. Problème opérateur probable.
  - Solution proposée: Twilio ou WhatsApp Business

### P1 - Priorité haute
- **PDF descriptions très longues**: L'approche actuelle divise en chunks de 1200 chars.
  - L'utilisateur veut une cellule unique qui coule sur plusieurs pages
  - ReportLab ne supporte pas ce comportement nativement
  - Alternative: WeasyPrint (HTML-to-PDF) mais nécessite dépendances système

### P2 - Priorité moyenne
- Personnalisation des templates email/SMS
- Vérification "Bulk Delete"
- Améliorations MindMap
- Notifications Push

### P3 - Backlog
- Intégration Qonto Phase 3 (comptabilité style Indy)
- Import Gmail automatique factures
- Google Ads / META Ads invoices import

## 3rd Party Integrations
- **Brevo (Sendinblue)**: Emails ✅, SMS ⚠️ (Guadeloupe)
- **Google Calendar API**: OAuth2 ✅, création événements ✅, Meet links ✅
- **Cloudinary**: Upload fichiers/images ✅
- **ReportLab**: Génération PDF ✅

## Known Issues
- Toggle thème clair/sombre: Interface reste sombre (CSS hardcodées)
- Frontend login via Playwright: Échoue silencieusement (WebSocket issues)

## Test Reports
- Session 20: 100% pass rate (14/14) - iteration_32.json
