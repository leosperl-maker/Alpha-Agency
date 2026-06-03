# 🤖 Chatbot public (visiteur) — Plan d'amélioration

> Document de cadrage. Objectif : capter plus de leads, mieux qualifiés, sans alourdir la conversation. À passer au dev (ou à intégrer directement).

---

## 1. Principe directeur

Le bot reste un **entretien de découverte fluide, une question à la fois**. On n'ajoute pas de friction : chaque nouvelle info doit soit améliorer la qualification, soit se déduire de ce qui est déjà dit. On ne demande jamais frontalement ce qu'on peut déduire.

---

## 2. Questions à ajouter (forte valeur commerciale)

À glisser naturellement dans le flux existant (après le besoin, avant la clôture).

| Question | Formulation suggérée | Pourquoi |
|---|---|---|
| **Délai / urgence** | « C'est pour quand, idéalement ? » | Un projet « sous 3 semaines » vaut bien plus qu'un « un jour peut-être ». Sert à prioriser. |
| **Comment il nous a connus** | « Au fait, comment avez-vous entendu parler de nous ? » | Mesure les canaux qui marchent (bouche-à-oreille, Google, Insta, pub). |
| **Canal de rappel préféré** | « Vous préférez qu'on vous rappelle, qu'on vous écrive par mail, ou WhatsApp ? » | Augmente fortement le taux de transformation. |

> On **n'ajoute pas** la question « c'est vous qui décidez du budget ? » : elle peut braquer. On la déduit (voir section 3).

---

## 3. Déduire le décideur via le poste (sans le demander)

La fonction est déjà demandée. On l'exploite pour estimer le niveau de décision, **silencieusement**.

### Règles de mapping (poste → niveau de décision)

| Poste déclaré | Niveau | Affichage fiche |
|---|---|---|
| Gérant, dirigeant, fondateur, CEO, président, patron, propriétaire | Décideur | **Décideur : oui** |
| Directeur, responsable marketing/com, DG, associé | Influenceur fort, souvent décideur | **Décideur : probable** |
| Chargé de…, assistant, stagiaire, employé | Relais, pas le décideur final | **Décideur : non** |
| Ambigu ou non donné | Inconnu | **Décideur : à confirmer** |

### Relance contextuelle (seulement si ambigu ou absent)

Si le poste ne permet pas de trancher, le bot glisse une question **douce et non frontale**, par exemple :

> « Et sur ce projet, c'est vous qui pilotez en interne, ou il y a d'autres personnes à embarquer ? »

Ça passe pour de l'intérêt commercial normal, et la réponse indique s'il faut convaincre une personne ou un comité.

---

## 4. Capturer les conversations abandonnées

Aujourd'hui, si le visiteur part avant la fin, tout est perdu.

- Créer la fiche prospect **dès qu'il y a nom + email** (déjà le cas).
- Sauvegarder aussi les conversations **incomplètes**, avec un statut **« abandonné à l'étape X »**.
- Bénéfice : tu vois où ça décroche (quelle étape fait fuir), et tu peux relancer les abandons qui ont déjà laissé un email.

---

## 5. Enrichissement web structuré

Gemini fait déjà une recherche Google. On lui demande d'en **extraire des champs structurés**, réutilisables côté admin et pour le scoring :

- Site web existant : oui / non (+ URL)
- Plateformes sociales actives : lesquelles
- Dernière publication : date approximative (signe d'activité)
- Note Google + nombre d'avis
- Secteur et taille estimée
- Concurrents visibles

Ces champs remplissent la fiche automatiquement, au lieu d'un simple bloc de texte libre.

---

## 6. Pièces jointes

Permettre au visiteur de **déposer un fichier** pendant la conversation : logo, cahier des charges, exemples, photos. Tu arrives au premier appel avec le contexte déjà en main.

---

## 7. Scoring du lead (remplace chaud / tiède)

Un score sur 100, calculé à partir de signaux pondérés :

| Signal | Poids indicatif |
|---|---|
| Budget donné | +30 |
| Délai court (< 1 mois) | +20 |
| Décideur (poste) | +20 |
| Email **et** téléphone fournis | +10 |
| Service à forte valeur (site e-commerce, refonte complète, pub) | +15 |
| Entreprise active en ligne (recherche web) | +5 |

Code couleur : 🔥 chaud (70+), 🟠 tiède (40-69), ⚪ froid (< 40). Le score s'affiche sur la fiche et sert à trier côté admin.

---

## 8. Ce qui ne change pas (garde-fous)

- **Aucun prix chiffré** annoncé au visiteur.
- **Aucune donnée interne** accessible (autres clients, devis, chiffres).
- **Anti-abus** : limite de messages par visiteur.
- Le devis reste un **brouillon** validé par toi avant tout envoi.

---

## 9. Récap des champs ajoutés à la fiche prospect

Délai, canal de rappel préféré, source (comment connu), niveau de décision déduit, champs d'enrichissement web structurés, pièces jointes, score sur 100, statut de complétion de la conversation.

---

*Document Alpha Agency. Pour modifier le comportement du chatbot, il suffit de le demander.*
