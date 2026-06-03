# 🧠 NÉO — Blueprint du co-gérant IA d'Alpha Agency

> Spécification pour faire de Néo un assistant **intelligent, fonctionnel et puissant**. Alignée sur le récap admin vérifié (2026-06-03). On ne part pas de zéro : Néo existe (l'orbe rouge + cockpit « Aujourd'hui »), il faut le muscler.

---

## 0. État réel (vérifié)

**Où vit Néo :** l'**orbe rouge** ouvre le panneau de chat (entrée principale). Le cockpit **« Aujourd'hui »** (`/admin`) est déjà « assistant-first » (briefing + chiffres clés). Page dédiée `/admin/assistant` existante mais hors menu.

**Néo sait déjà :**
- **Voir** : contacts, demandes, devis, factures, documents, agenda.
- **Briefer** le matin : leads chauds, devis à valider, factures en retard, tâches, RDV + résumé rédigé.
- **Agir** : 15 actions en langage naturel — `create_task`, `mark_task_done`, `schedule_followup`, `update_contact`, `set_contact_status`, `add_contact_note`, `merge_contacts`, `create_quote`, `draft_followup_email`, `send_followup` (après validation), `get_document`, `list_documents`, `enrich_company`, `activity_report`, `prep_meeting`.

**Infra :** emails **Resend** (OK), SMS **Twilio** (OK), WhatsApp Twilio (sandbox OK, prod en attente Meta).

**Finances :** page **Budget** (recettes / dépenses / prévisionnel, saisie manuelle). **Pas de connexion bancaire live.**

**Retiré mais back-end conservé volontairement** (ne pas toucher) : pipeline, page Tâches, social media, stories. L'assistant utilise encore le back « tasks ».

---

## 1. Les verrous à lever (par ordre d'impact)

| # | Verrou | Conséquence | Effort |
|---|---|---|---|
| 1 | **Action layer fragile** (`[ACTION]{...}[/ACTION]` parsé dans le texte) | Les 15 actions cassent dès que le modèle formule mal | Moyen |
| 2 | **Ne voit pas le Budget** (finances pas dans le contexte) | Reste assistant, pas co-gérant — alors que la donnée existe déjà | **Faible** |
| 3 | **Aucune mémoire** (chaque conv repart de zéro) | Pas de boucle matin/soir, pas d'objectifs suivis | Moyen |
| 4 | **Ne voit pas les mails** (Gmail pas dans l'admin actuel) | Aveugle sur les échanges et relances clients | Moyen-élevé (nouveau build) |

---

## 2. Architecture cible — les 5 piliers de Néo

### Pilier 1 — VOIR (contexte complet)
Le contexte de Néo doit agréger :
- **Commercial** : contacts, demandes, devis, factures (déjà là).
- **Finances** : **brancher la page Budget** (recettes, dépenses, prévisionnel, solde). *Gain immédiat, aucune banque requise.* → plus tard : sync bancaire live (Qonto retenté ou agrégateur Bridge/Powens).
- **Agenda** : RDV à venir (déjà là).
- **Mails** : Gmail (pilier plus avancé, voir Pilier 4).

### Pilier 2 — SE SOUVENIR (mémoire)
Nouvelle brique `neo_memory` :
- **Objectifs** chiffrés ("10k MRR fin 2026").
- **Décisions / règles** ("pas de client sous 500 €").
- **Journal quotidien** (ce que Léo fait / doit faire).
- **Faits durables** clients & business.
Injectée dans chaque conversation. C'est ce qui transforme l'assistant en associé. *(La page `Things`, hors menu, pourrait servir de support visuel à cette mémoire.)*

### Pilier 3 — AGIR (function calling natif)
Remplacer le parsing `[ACTION]` par le **function calling natif de Gemini** : Néo reçoit des outils typés, choisit, exécute, lit le résultat, enchaîne. Plus fiable, multi-étapes.
Outils à exposer (les 15 actions actuelles + à ajouter) :
- Communication : **envoyer email** (Resend), **SMS** (Twilio) — l'infra existe déjà.
- Finances : lire le Budget, lister les impayés, déclencher une relance d'impayé.
- Agenda : créer / déplacer un RDV.
Garde-fou : toute action sortant vers un client (email, SMS, devis, relance) passe par **confirmation** (déjà le cas pour `send_followup`).

### Pilier 4 — ÊTRE PROACTIF (boucle quotidienne)
Au-delà du briefing actuel :
- **Check-in matin** : "Léo, qu'as-tu à faire aujourd'hui ? Voici ce que je vois déjà. Comment je t'aide ?" → évalue la charge, propose, écrit en mémoire.
- **Check-in soir** : "Qu'as-tu bouclé ? Où en es-tu ?" → enregistre l'avancement, met à jour les objectifs.
- **Alertes** : cashflow tendu (via Budget), impayé qui traîne, lead chaud non traité < 24h.
- **Mails (Gmail)** : reconstruire l'accès Gmail (le code MoltBot retiré servira de base) pour que Néo lise les échanges et croise avec les impayés.

### Pilier 5 — PARLER (mode Jarvis, en dernier)
- **Entrée voix** : speech-to-text.
- **Sortie voix** : TTS (ElevenLabs, ou voix OpenAI/Gemini).
- **Temps réel** : API realtime (OpenAI Realtime ou Gemini Live).
> La voix est le **costume**, pas le muscle. Inutile avant les piliers 1 à 4.

---

## 3. Ce qui rend Néo vraiment "puissant"

- **Function calling natif** : le vrai saut de fiabilité et d'intelligence.
- **Boucle agentique** : enchaîner plusieurs actions pour une demande ("relance tous les impayés > 30 jours" = lister + rédiger + envoyer, étape par étape, avec confirmation).
- **Mémoire** : cohérence dans le temps, capacité à te challenger.
- **Revoir la limite d'appels IA quotidienne** : un co-pilote utilisé toute la journée ne peut pas être bridé.

---

## 4. Ordre de construction recommandé

| Phase | Chantier | Pourquoi | Effort |
|---|---|---|---|
| 1 | **Function calling natif** (remplacer `[ACTION]`) | Fiabilise et muscle les 15 actions | Moyen |
| 2 | **Brancher le Budget au contexte** | Néo devient co-gérant, sans banque, tout de suite | **Faible** |
| 3 | **Mémoire + check-in matin/soir** | Cohérence dans le temps, boucle de responsabilité | Moyen |
| 4 | **Alertes proactives** (enrichir le cockpit « Aujourd'hui ») | L'essentiel te saute aux yeux | Faible-moyen |
| 5 | **Prévisionnel vivant** (devis gagné/perdu → met à jour le prévisionnel du Budget) | La boussole stratégique | Moyen-élevé |
| 6 | **Accès Gmail reconstruit** + croisement impayés | Vision complète de la relation client | Élevé |
| 7 | **Sync bancaire live** (Qonto ou agrégateur) | Trésorerie temps réel | Élevé |
| 8 | **Mode Jarvis (voix)** | Le costume, cerveau déjà prêt | Élevé |

> Note produit : ton équipe a déjà identifié la **refonte UX de la Facturation** comme prochain gros chantier. Indépendant de Néo, mais à arbitrer dans le planning global.

---

## 5. Décisions préalables

- **Finances live (plus tard)** : retenter **Qonto** (code OAuth déjà écrit, cause de l'échec inconnue) ou passer sur un **agrégateur** (Bridge, Powens) multi-banques plus robuste.
- **Gmail** : confirmer que Néo doit lire **toute** la boîte ou seulement les fils liés à des contacts du CRM (plus simple, plus sûr).

---

*Document Alpha Agency. Je recommande de démarrer par la phase 1 (function calling) puis la phase 2 (Budget dans le contexte) : peu d'effort, Néo devient nettement plus puissant. Dis-moi par quoi on attaque et je fais le plan technique prêt à coder.*
