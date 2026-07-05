# Prompt pour Claude Code : refonte complète du CRM + de Neo en assistant "Jarvis"

> À coller tel quel dans Claude Code (Fable), à la racine du dépôt du CRM.
> Double objectif :
> 1. Refonte complète du CRM lui-même : plus puissant, plus rapide, plus agréable, avec une interface moderne, des effets visuels et des animations soignées.
> 2. Transformer Neo, l'IA du CRM, en un assistant complet inspiré de Jarvis (Iron Man) : architecture multi-agents, compréhension du langage naturel, actions réelles dans le CRM, proactivité, voix, et interface immersive.
>
> Neo et le CRM forment un tout : la refonte du CRM et celle de Neo doivent être pensées ensemble, avec une identité visuelle et une expérience cohérentes.

---

## Rôle et posture

Tu es un ingénieur logiciel senior et architecte IA, et tu es aux commandes. Tu prends en charge la refonte complète du CRM et de "Neo", son assistant IA. Tu travailles de façon méthodique, tu ne casses rien qui fonctionne, et tu livres du code réellement fonctionnel, testé, propre et documenté. Tu ne produis jamais de fonctionnalité "en façade" : chaque capacité annoncée doit marcher de bout en bout.

## Carte blanche

Tu as carte blanche. C'est toi le décideur produit et technique sur ce chantier. Utilise ton intuition et ton jugement d'expert :

- Décide toi-même de ce qui doit être amélioré, ajouté, refait ou supprimé. Si tu vois qu'une fonctionnalité serait excellente pour le CRM, tu la conçois et tu la construis, sans me demander la permission.
- N'attends pas de validation pour avancer. Prends les meilleures décisions par défaut, assume-les, et documente tes choix et le pourquoi.
- Sois ambitieux : vise le meilleur CRM possible et le meilleur assistant possible, pas le minimum. Si tu penses "ce serait parfait d'avoir ça", alors fais-le.
- Ne me consulte que si un choix est vraiment irréversible et lourd de conséquences (ex : suppression définitive de données, changement de base de données majeur). Pour tout le reste, tu tranches.
- Tu gardes une seule limite : ne jamais casser l'existant ni perdre de données. La liberté ne dispense pas de la rigueur.

Avant d'écrire du code, tu explores et tu comprends l'existant, puis tu décides et tu avances.

---

## Phase 0 : audit de l'existant (obligatoire, avant tout code)

1. Cartographie le dépôt : langages, frameworks, structure des dossiers, gestionnaire de paquets, scripts de build/test, base de données, ORM, système d'auth.
2. Localise tout le code actuel de Neo (backend, endpoints, prompts, front, composants UI, intégrations LLM). Liste précisément ce que Neo sait déjà faire aujourd'hui.
3. Identifie les modèles de données clés du CRM (contacts, entreprises, deals/opportunités, tâches, activités, emails, pipelines, utilisateurs, permissions).
4. Repère les points d'intégration existants (API interne, webhooks, envoi d'emails, calendrier, téléphonie, etc.).
5. Produis un fichier `NEO_AUDIT.md` : état des lieux, stack détectée, dette technique, risques, et un plan de refonte par étapes avec estimation de complexité.

Livre cet audit et ton plan, puis enchaîne directement sur la construction : pas besoin d'attendre mon feu vert. Le plan sert à cadrer ton travail et à me tenir informé, pas à te bloquer.

---

## Refonte complète du CRM (l'application elle-même)

En parallèle de Neo, tu modernises le CRM de fond en comble. Il doit devenir plus puissant, plus rapide et plus agréable, sans perdre les fonctionnalités existantes ni les données.

**Fonctionnel et performance**
- Conserve et fiabilise l'existant : aucune perte de données, aucune régression sur les fonctions déjà utilisées. Prévois migrations et compatibilité.
- Optimise les performances : chargement rapide, requêtes efficaces, pagination/virtualisation des grandes listes, mise en cache, temps de réponse perçu minimal.
- Améliore les parcours clés : gestion des contacts/entreprises, pipeline de deals (vue kanban fluide avec glisser-déposer), tâches et rappels, activités/historique, recherche globale rapide, tableaux de bord et reporting.
- Renforce la robustesse : gestion d'erreurs claire, états de chargement/vide/erreur soignés, sauvegarde fiable.

**Interface et design (moderne, animée, cohérente avec Jarvis)**
- Refonte visuelle complète : design system unifié (couleurs, typographie, espacements, composants réutilisables), thème sombre par défaut cohérent avec l'univers de Neo, thème clair optionnel.
- Effets et animations : transitions fluides entre vues, micro-interactions sur les boutons/cartes/listes, animations d'apparition, feedback visuel immédiat, drag-and-drop animé dans le pipeline, skeletons de chargement élégants.
- UX : navigation claire, raccourcis clavier, palette de commandes (type "cmd+k") pour tout atteindre vite, densité d'information maîtrisée.
- Accessibilité : contrastes suffisants, navigation clavier, respect de `prefers-reduced-motion`, libellés ARIA.
- Performance des animations : viser 60 fps, animations GPU-friendly, jamais au détriment de la réactivité.

**Intégration Neo dans le CRM**
- Neo est accessible partout dans l'app (overlay/panneau global) et contextuel : il connaît l'écran où je suis et peut agir dessus.
- L'identité visuelle de Neo (orbe, HUD, accents lumineux) et celle du CRM forment un ensemble cohérent, pas deux mondes séparés.

Traite d'abord le socle et les parcours critiques, puis le polish visuel. Chaque étape de la refonte CRM doit rester livrable, testée et sans régression.

---

## Vision produit : ce que Neo doit devenir

Neo doit se comporter comme un véritable copilote de l'entreprise, pas comme un simple chatbot. Concrètement :

- Je peux lui demander n'importe quoi en langage naturel sur les données du CRM et il répond juste, avec les bonnes sources.
- Il agit réellement dans le CRM : créer/modifier/qualifier des contacts, deals, tâches, notes ; déplacer un deal dans le pipeline ; programmer un rappel ; préparer et envoyer un email ; générer un compte-rendu.
- Il est proactif : il détecte les signaux (deal qui stagne, relance en retard, opportunité chaude, anomalie de trésorerie) et me prévient ou propose une action, sans que je demande.
- Il parle et écoute : entrée et sortie vocales, pour une interaction mains libres façon Jarvis.
- Il s'appuie sur une architecture multi-agents : un agent orchestrateur qui délègue à des sous-agents spécialisés.

---

## Architecture cible : orchestrateur + sous-agents

Construis Neo comme un système d'agents, pas comme un unique appel LLM.

**Agent orchestrateur (Neo Core)**
- Reçoit la demande (texte ou voix), comprend l'intention, planifie, choisit le/les sous-agent(s) à mobiliser, agrège les résultats, formule la réponse finale.
- Gère la mémoire de conversation et la mémoire long terme (préférences, contexte entreprise, historique des décisions).
- Applique les garde-fous : permissions utilisateur, confirmation avant action sensible, journalisation.

**Sous-agents spécialisés (exemples, à adapter au CRM réel)**
- Agent Recherche/Données : interroge le CRM et répond aux questions (lecture seule).
- Agent Actions : exécute les opérations d'écriture (create/update/delete) via des outils bien définis.
- Agent Commercial/Pipeline : analyse les deals, priorise, détecte les blocages, propose des relances.
- Agent Communication : rédige emails, messages, comptes-rendus, dans mon style.
- Agent Veille/Proactivité : tâches planifiées, détection de signaux, alertes.
- Agent Trésorerie/Reporting : synthèses chiffrées, santé du portefeuille, KPIs (réutilise les capacités existantes type health score et treasury si présentes).

**Principes techniques**
- Chaque capacité d'un agent est exposée comme un "outil" (tool/function) avec un schéma d'entrée/sortie strict et validé.
- Toutes les actions passent par une couche de service unique et sécurisée (jamais d'accès direct à la DB depuis le LLM).
- Toute action d'écriture est confirmable, réversible si possible, et tracée dans un journal d'audit.
- Le système doit être extensible : ajouter un sous-agent ou un outil ne doit pas exiger de tout réécrire.

---

## Capacités à livrer (bout en bout)

1. **Compréhension du langage naturel + planification**
   Interpréter des demandes complexes, décomposer en étapes, gérer les demandes ambiguës en demandant la précision utile.

2. **Actions réelles dans le CRM**
   Couvrir au minimum : contacts, entreprises, deals/pipeline, tâches, notes/activités, emails. Chaque action validée, confirmée si sensible, et journalisée.

3. **Proactivité et automatisations**
   Tâches planifiées et déclencheurs événementiels. Règles configurables. Notifications claires avec action en un clic.

4. **Voix**
   Reconnaissance vocale (entrée) et synthèse vocale (sortie), avec activation manuelle et, si faisable, mot d'activation. Prévoir un fallback texte propre.

5. **Mémoire**
   Court terme (conversation) et long terme (préférences, contexte, décisions passées), avec possibilité pour l'utilisateur de consulter et corriger ce que Neo retient.

---

## Interface immersive "Jarvis" (UI/UX)

Crée une interface d'assistant immersive et haut de gamme, clairement inspirée de Jarvis, mais originale (pas de copie d'assets sous copyright).

- **Ambiance visuelle** : thème sombre, accents lumineux (bleu/cyan type HUD), typographie nette, effet "verre"/glassmorphism, profondeur.
- **Cœur animé** : un orbe / noyau réactif au centre qui pulse et réagit à la voix (visualisation audio en temps réel quand Neo écoute ou parle).
- **Effets** : anneaux HUD rotatifs, lignes de scan, particules discrètes, transitions fluides, apparition progressive des réponses, indicateur d'état (écoute / réflexion / action en cours / terminé).
- **Micro-interactions** : feedback visuel à chaque action déclenchée par un agent, timeline des étapes quand Neo enchaîne plusieurs actions.
- **Performance** : animations fluides (viser 60 fps), sans plomber l'app. Prévoir un mode réduit pour machines faibles et respecter `prefers-reduced-motion`.
- **Responsive** : desktop en priorité, mais lisible et utilisable sur écran plus petit.
- **Intégration** : soit un panneau/overlay accessible partout dans le CRM, soit une vue dédiée. Choisis l'option la plus propre selon l'archi existante et justifie.

L'UI doit rester au service de l'usage : belle ET fonctionnelle, jamais un gadget qui gêne le travail.

---

## Exigences de qualité (non négociables)

- Code typé, modulaire, commenté là où c'est utile, cohérent avec les conventions du dépôt existant.
- Sécurité : respect des permissions/rôles, pas de fuite de données, validation stricte des entrées, secrets hors du code.
- Robustesse : gestion des erreurs LLM (timeouts, réponses invalides, hallucinations d'outils), retries raisonnés, dégradation gracieuse.
- Coûts/latence : mets en cache ce qui peut l'être, choisis le bon niveau de modèle par sous-agent, évite les appels inutiles.
- Tests : tests unitaires sur la couche outils/actions, tests d'intégration sur les parcours clés, et un jeu de scénarios de bout en bout (ex : "crée un deal pour X à 5000 euros et programme une relance dans 3 jours").
- Journalisation et observabilité : chaque décision et action de Neo traçable et débogable.
- Documentation : `NEO.md` expliquant l'architecture, les agents, les outils, comment en ajouter, et comment configurer les automatisations.

---

## Méthode de travail attendue

1. Livre d'abord `NEO_AUDIT.md` (audit + plan par étapes), puis avance sans attendre ma validation. Tu décides.
2. Avance par incréments livrables et testés : à chaque étape, explique ce que tu as fait, ce qui marche, ce qui reste, et ce que tu comptes faire ensuite.
3. Ne me livre jamais du code non testé présenté comme fonctionnel. Si quelque chose n'est pas fini, dis-le clairement.
4. Priorise dans cet ordre sauf indication contraire : (a) fiabilisation de l'existant CRM sans régression + design system, (b) socle multi-agents Neo + couche d'actions sécurisée, (c) compréhension langage naturel + actions CRM réelles, (d) refonte des parcours CRM clés (pipeline, contacts, tâches, reporting), (e) proactivité/automatisations, (f) interface immersive + effets et animations (CRM et Neo), (g) voix.
5. À la fin de chaque étape, propose la suite logique.

Commence maintenant par la Phase 0 (audit), présente-moi `NEO_AUDIT.md` avec ton plan de refonte, puis lance-toi. Tu as carte blanche : décide, construis, améliore, surprends-moi.
