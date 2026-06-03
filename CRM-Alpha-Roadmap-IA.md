# 🚀 Alpha Agency CRM — Roadmap "Co-gérant IA"

> Cadrage priorisé, basé sur une lecture réelle du code (repo `leosperl-maker/Alpha-Agency`, branche `main`, commit `6f222fd`). Pour chaque idée : ce qui existe déjà dans le code, ce qu'il manque, l'effort estimé.

---

## 0. Constat de départ (la vérité du code)

Le CRM est très riche, mais éclaté. Beaucoup d'idées sont **déjà construites en pièces détachées** qui ne se parlent pas et ne remontent pas dans un cerveau central. Le vrai chantier n'est pas "construire plus", c'est **connecter + donner de la mémoire** à l'IA.

Points factuels corrigés :

- **Qonto** : code présent (`qonto.py`) mais jamais branché réellement. À reprendre, moitié technique déjà écrite.
- **Pipeline / Opportunités** : supprimé (commit `6767685`). À reconstruire si voulu.
- **Email** : a basculé de Brevo vers **Resend** (commit `22756f1`). Le sujet email se règle côté Resend, pas Brevo.
- **Gmail** : intégration quasi complète déjà codée (`moltbot_gmail.py`).
- **Voix** : speech-to-text déjà codé (`audio_transcription.py`, Whisper + voice-to-CRM).

---

## 1. Vision

Faire de l'IA un **co-gérant**, pas une secrétaire. Pour ça, trois manques à combler, dans cet ordre :

1. **Voir** (finances + mails + agenda au même endroit)
2. **Se souvenir** (mémoire d'un jour à l'autre, objectifs, décisions)
3. **Parler** (interface Jarvis, posée en dernier sur un cerveau déjà intelligent)

---

## 2. Idée par idée

### 🟢 Suivi de prospection + tâches liées aux fiches contact
- **Existe** : `tasks.py` (champ `contact_id`), fiches avec `notes` et endpoint `/history`. Le contact peut déjà porter tâches et notes.
- **Supprimé** : le pipeline Kanban.
- **À faire** : reconstruire un pipeline léger (statuts Nouveau / Contacté / Devis / Gagné / Perdu) + une **timeline unifiée** sur la fiche (chaque événement s'empile : lead, appel, devis, note, tâche). Statut qui se met à jour seul quand une tâche-clé est cochée.
- **Effort** : moyen.

### 🔴 Connexion banque pro → l'IA voit la trésorerie
- **Existe** : `qonto.py` (flow OAuth écrit) mais **jamais connecté**.
- **À faire** : (1) faire marcher la connexion réelle (credentials valides + callback), ou repartir sur un agrégateur type Bridge/Powens si Qonto coince ; (2) **brancher la trésorerie dans le contexte de l'IA** (`/context` de `ai_enhanced.py`). C'est ça qui rend l'IA "co-gérante" : elle raisonne sur l'argent réel (entrées, sorties, cashflow, alertes).
- **Effort** : moyen à élevé. **Impact maximal.**

### 🟠 L'IA co-gérant qui aide à scaler
- **Existe** : `ai_enhanced.py` sait déjà créer une tâche, modifier un contact, créer un devis ; endpoints `/briefing` et `/context` ; `AssistantChat` connecté aux vraies données.
- **À faire** : lui donner les **finances** (ci-dessus), une **mémoire long terme** (décisions + objectifs chiffrés), et la capacité de **te challenger** quand tu t'éloignes d'un objectif.
- **Effort** : moyen (dépend de la brique finances + mémoire).

### 🟡 Digest news IA quotidien (1 à 5 résumés)
- **Existe** : `news.py` + `NewsPage` (flux NewsAPI brut, pas de résumé IA).
- **À faire** : job quotidien qui prend les news IA du jour et demande à Gemini **1 à 5 cartes résumées et hiérarchisées** ("ce qui compte pour une agence comme la tienne, et pourquoi").
- **Effort** : faible. **C'est du confort, pas du CA. À faire après les finances.**

### 🟢 Business plan + prévisionnel vivant (LA vraie nouveauté)
- **Existe** : rien de dédié.
- **À faire** : un prévisionnel **vivant** que chaque devis gagné/perdu met à jour automatiquement, avec un business plan co-écrit par l'IA et un suivi dans le temps. L'IA t'alerte quand tu dérapes vs objectif. Le CRM devient ta **boussole**.
- **Effort** : élevé. **Plus forte valeur stratégique.**

### ⚪ Phrase de motivation quotidienne (effet "divin" à l'ouverture)
- **Existe** : rien.
- **À faire** : à la première ouverture du jour, une phrase apparaît en overlay (effet lumineux), disparaît au clic, révèle le CRM. **La rendre contextuelle** ("Léo, 3 devis signés cette semaine, continue") plutôt que générique.
- **Effort** : faible. **Gadget agréable, jamais prioritaire.**

---

## 3. Les 3 nouvelles idées

### 🟢 Check-in quotidien (matin + soir) — priorité haute
- **Existe** : briefing matinal **WhatsApp** à sens unique (`scheduler.py`).
- **À faire** : un vrai **dialogue**. Le matin : "qu'as-tu à faire aujourd'hui, comment je t'aide ?" → l'IA évalue ta charge et propose. Le soir : "qu'as-tu bouclé, où en es-tu ?" → l'IA enregistre l'avancement. Crée la **mémoire** et la **boucle de responsabilité** qui font le co-gérant.
- **Effort** : moyen. **Cœur de la vision.**

### 🟢 Connexion Gmail pro (mails + factures impayées)
- **Existe** : `moltbot_gmail.py` quasi complet (OAuth, lecture, réponse, brouillons, stats). `invoices.py` gère les factures.
- **À faire** : **brancher Gmail dans le cerveau de l'IA** et **croiser mails ↔ factures impayées** ("ce client t'a relancé 2 fois et te doit 1 200 €"). Les briques existent, il manque le pont.
- **Effort** : moyen (surtout du branchement, peu de neuf).

### 🟠 Mode Jarvis (parler à l'IA, qu'elle réponde) — à poser en dernier
- **Existe** : speech-to-text (`audio_transcription.py`, Whisper) + voice-to-CRM. La **moitié entrée** est là.
- **À faire** : la **voix de sortie** (TTS) et le **temps réel** (conversation fluide sans bouton). Pistes : API temps réel OpenAI, Gemini Live, ou ElevenLabs pour la voix.
- **Effort** : élevé. **À faire en dernier**, comme interface sur un cerveau déjà intelligent. La voix est le costume, pas le muscle.

---

## 4. Idées bonus (dans le prolongement de ta vision)

- **Cockpit unique à l'ouverture** : un écran, l'IA te dit les 3 choses qui comptent aujourd'hui (trésorerie, lead le plus chaud, facture en retard). La phrase de motivation s'intègre juste avant.
- **Health score de l'agence** : un seul chiffre sur 100 (trésorerie + pipeline + MRR + retards), suivi semaine après semaine.
- **Mode "prêt à déléguer"** : quand ta charge dépasse ta capacité ET que la trésorerie le permet, l'IA te dit que c'est le moment d'embaucher ou sous-traiter.
- **Mémoire de décisions** : l'IA garde tes règles ("pas de client sous 500 €", "objectif 10k MRR") et te rappelle à l'ordre.

---

## 5. Ordre recommandé

| # | Chantier | Pourquoi en premier | Effort |
|---|---|---|---|
| 1 | **Finances → contexte IA** (banque réelle + Gmail/factures dans `/context`) | Transforme l'IA en co-gérant. Tout le reste en dépend. | Moyen-élevé |
| 2 | **Mémoire + check-in matin/soir** | Crée la boucle quotidienne et le souvenir. | Moyen |
| 3 | **Prévisionnel vivant + business plan** | La boussole stratégique. | Élevé |
| 4 | **Timeline unifiée + pipeline léger** | Reconnecte la prospection aux fiches. | Moyen |
| 5 | **Cockpit + phrase de motivation** | Mise en scène de l'essentiel. | Faible |
| 6 | **Digest news IA** | Confort. | Faible |
| 7 | **Mode Jarvis (voix)** | Le costume, une fois le cerveau prêt. | Élevé |

---

## 6. Règle de tri pour toute idée future

Avant d'ajouter quoi que ce soit, une seule question : **est-ce que ça muscle la boucle qui te fait vivre (lead → devis → encaissement → relance), ou ça ajoute une pièce de plus à entretenir ?** Le CRM est déjà très large. La priorité, c'est la profondeur sur le cœur, pas la largeur.

---

*Document Alpha Agency. Pour attaquer un chantier précis (ex. brancher les finances à l'IA, ou le prévisionnel), il suffit de le demander.*
