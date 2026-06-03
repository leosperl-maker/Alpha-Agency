# 🚀 Alpha Agency — Plan maître "Néo, le co-gérant IA"

> Document unique qui **couple** le blueprint Néo (le cerveau) avec toutes tes idées de features (les modules autour). Aligné sur le récap admin vérifié (2026-06-03). Remplace et consolide les deux notes précédentes (Néo-Blueprint + Roadmap-IA).

---

## 1. La vision en une phrase

Faire de **Néo** un véritable co-gérant : une IA qui **voit** tout ton business (commercial + finances + mails), qui **se souvient** de tes objectifs et décisions, qui **agit** de façon fiable, qui **te pilote** chaque jour, et à qui tu pourras un jour simplement **parler**.

---

## 2. État réel (vérifié)

- **Néo vit déjà** : l'orbe rouge + le cockpit « Aujourd'hui ». Il voit contacts/devis/factures/docs/agenda, briefe le matin, et exécute **15 actions** en langage naturel.
- **Infra** : emails **Resend** (OK), SMS **Twilio** (OK), WhatsApp Twilio (sandbox).
- **Finances** : page **Budget** (recettes/dépenses/prévisionnel, saisie manuelle). Pas de banque connectée.
- **Retiré** (back conservé, ne pas toucher) : pipeline, page Tâches, social, stories.

---

## 3. Le cerveau — les 5 piliers de Néo

1. **VOIR** : agréger dans son contexte le commercial (fait), les **finances (Budget)**, l'agenda (fait), puis les **mails (Gmail)**.
2. **SE SOUVENIR** : une mémoire `neo_memory` (objectifs chiffrés, décisions/règles, journal quotidien, faits clients).
3. **AGIR** : passer du bricolage `[ACTION]` au **function calling natif** + nouveaux outils (envoyer email/SMS, lire Budget, relancer impayé, gérer RDV), avec confirmation avant tout envoi client.
4. **ÊTRE PROACTIF** : check-in matin/soir, alertes (cashflow, impayés, lead chaud non traité).
5. **PARLER** : voix Jarvis (STT + TTS + temps réel), **en dernier**.

---

## 4. Les modules autour (tes features, rattachées au cerveau)

| Feature | Rattachée à | Note |
|---|---|---|
| **Timeline unifiée sur la fiche contact** + pipeline-lite (statut auto) | Pilier VOIR | Ne pas reconstruire un kanban : un **fil d'événements** par contact (lead, contacté, devis, note, tâche), le statut avance tout seul quand une tâche-clé est cochée. |
| **Prévisionnel vivant + business plan co-créé** | Piliers VOIR + SE SOUVENIR | Chaque devis gagné/perdu met à jour le prévisionnel du Budget ; Néo t'alerte si tu dérapes vs objectif. **Ta vraie idée visionnaire.** |
| **Cockpit unique à l'ouverture** | Pilier ÊTRE PROACTIF | 3 choses qui comptent : trésorerie, lead le plus chaud, facture en retard. Le reste à un clic. |
| **Health score /100** | Pilier VOIR | Un chiffre = santé de la boîte (tréso + impayés + devis en attente + MRR), suivi semaine après semaine. |
| **Phrase de motivation "effet divin"** | Cockpit | Overlay à la 1re ouverture du jour. **La rendre contextuelle** ("3 devis signés cette semaine, continue"). Gadget assumé, 2h de travail, jamais prioritaire. |
| **Mode "prêt à déléguer"** | Piliers VOIR + SE SOUVENIR | Quand ta charge dépasse ta capacité ET que la tréso le permet, Néo te dit d'embaucher/sous-traiter. |
| **Mémoire de décisions qui te challenge** | Pilier SE SOUVENIR | Garde tes règles ("pas de client < 500 €", "10k MRR fin d'année") et te rappelle à l'ordre. |
| **Digest news IA quotidien (1 à 5 cartes)** | Pilier ÊTRE PROACTIF | Job quotidien : Gemini résume et hiérarchise les news IA utiles à une agence. Confort, pas du CA. |
| **Accès Gmail** (mails + impayés signalés par mail) | Pilier VOIR/PROACTIF | Nouveau build (l'ancien code Gmail était dans MoltBot, retiré). |

---

## 5. Feuille de route unifiée (l'ordre qui compte)

### Phase 1 — Fondations du cerveau *(effort moyen, impact maximal)*
- **Function calling natif** : fiabilise les 15 actions, permet l'enchaînement multi-étapes.
- **Brancher le Budget dans le contexte** : Néo voit l'argent. *Faible effort, gros saut.*
➡️ Résultat : Néo agit de façon fiable **et** raisonne sur la trésorerie. Il devient co-gérant.

### Phase 2 — Mémoire & boucle quotidienne *(effort moyen)*
- Mémoire `neo_memory` (objectifs, décisions, journal).
- **Check-in matin** ("qu'as-tu à faire, comment je t'aide ?") + **check-in soir** ("qu'as-tu bouclé ?").
- Mémoire de décisions **qui te challenge**.
➡️ Résultat : Néo devient cohérent dans le temps. Un associé, pas une secrétaire.

### Phase 3 — Cockpit & mise en scène *(effort faible-moyen)*
- Cockpit « Aujourd'hui » resserré : **3 priorités** (tréso, lead chaud, facture en retard).
- **Health score /100** (commence sans pipeline, s'affine après la phase 5).
- **Phrase de motivation** contextuelle à l'ouverture.
➡️ Résultat : l'essentiel te saute aux yeux chaque matin.

### Phase 4 — Pilotage stratégique *(effort moyen-élevé)*
- **Prévisionnel vivant** (devis gagné/perdu → mise à jour auto) + **business plan** co-créé.
- **Mode "prêt à déléguer"**.
➡️ Résultat : le CRM devient ta boussole.

### Phase 5 — Prospection reconnectée *(effort moyen)*
- **Timeline unifiée** sur la fiche contact + statut pipeline-lite automatique.
➡️ Résultat : suivi de prospection fluide, sans ressaisie.

### Phase 6 — Confort & ouverture *(effort variable)*
- **Digest news IA** quotidien (1 à 5 cartes).
- **Accès Gmail** reconstruit + croisement impayés.
- **Sync bancaire live** (Qonto retenté ou agrégateur Bridge/Powens) — upgrade des finances de la phase 1.

### Phase 7 — Jarvis *(effort élevé, en dernier)*
- Voix : entrée (STT) + sortie (TTS, ElevenLabs / OpenAI / Gemini) + temps réel (Realtime / Gemini Live).
➡️ La voix est le costume, pas le muscle. Elle se pose sur un cerveau déjà intelligent.

---

## 6. Ce qui rend Néo "puissant" (transversal)

- **Function calling natif** = le vrai saut de fiabilité et d'intelligence.
- **Boucle agentique** : enchaîner plusieurs actions ("relance tous les impayés > 30 j" = lister + rédiger + envoyer, avec confirmation).
- **Mémoire** = cohérence et capacité à anticiper.
- **Revoir la limite d'appels IA quotidienne** : un co-pilote s'utilise toute la journée.

---

## 7. Décisions à prendre (avant les phases concernées)

1. **Par quoi on démarre** : recommandé = Phase 1 (function calling + Budget au contexte).
2. **Finances live (phase 6)** : retenter **Qonto** (code écrit, cause d'échec inconnue) ou **agrégateur** multi-banques (Bridge, Powens) ?
3. **Gmail (phase 6)** : Néo lit **toute** la boîte, ou seulement les fils liés à des contacts du CRM (plus simple, plus sûr) ?

> Note produit indépendante : ton équipe a flagué la **refonte UX de la Facturation** comme prochain gros chantier. À arbitrer dans le planning, hors périmètre Néo.

---

## 8. Le filtre pour toute idée future

Une seule question avant d'ajouter quoi que ce soit : **est-ce que ça muscle la boucle qui te fait vivre (lead → devis → encaissement → relance), ou ça ajoute une pièce de plus à entretenir ?** Profondeur sur le cœur, pas largeur.

---

*Document Alpha Agency. Dis-moi par quelle phase on attaque (je recommande la 1) et je te livre le plan technique détaillé, prêt à coder.*
