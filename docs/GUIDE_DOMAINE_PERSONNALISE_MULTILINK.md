# 🔗 Guide : Ajouter un Domaine Personnalisé pour Multilink

Ce guide explique comment connecter un nom de domaine personnalisé (acheté par votre agence) à une page Multilink créée dans le CRM Alpha Agency.

---

## 📋 Prérequis

- Un nom de domaine acheté (ex: `mondomaine.com`, `mondomaine.fr`, `mondomaine.bio`)
- Accès au panneau DNS de votre registrar (OVH, Squarespace, GoDaddy, Gandi, etc.)
- Un compte GitHub (gratuit) OU un compte Railway (gratuit)
- L'URL de votre page Multilink : `https://alphagency.fr/lien-bio/[nom-du-client]`

---

## 🎯 Méthode 1 : GitHub Pages (Recommandé - 100% Gratuit)

### Étape 1 : Créer un compte GitHub
1. Allez sur **https://github.com**
2. Créez un compte gratuit si vous n'en avez pas

### Étape 2 : Créer un nouveau repository
1. Cliquez sur **"New"** ou allez sur **https://github.com/new**
2. **Nom du repository** : `multilink-mondomaine` (remplacez par le nom du client)
3. **Visibilité** : **Public** (obligatoire pour GitHub Pages gratuit)
4. Cliquez **"Create repository"**

### Étape 3 : Créer le fichier index.html
1. Dans le repository vide, cliquez sur **"creating a new file"** ou **"Add file"** → **"Create new file"**
2. **Nom du fichier** : `index.html`
3. **Contenu** (copiez-collez) :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liens - Nom du Client</title>
    <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
    </style>
</head>
<body>
    <iframe src="https://alphagency.fr/lien-bio/NOM-DU-CLIENT"></iframe>
</body>
</html>
```

⚠️ **Important** : Remplacez `NOM-DU-CLIENT` par le slug exact de la page Multilink (ex: `antilla`, `dupont-immobilier`, etc.)

4. Cliquez **"Commit changes"**

### Étape 4 : Activer GitHub Pages
1. Dans le repository, cliquez sur **"Settings"** (icône engrenage)
2. Dans le menu de gauche, cliquez sur **"Pages"**
3. **Source** : Sélectionnez **"Deploy from a branch"**
4. **Branch** : Sélectionnez **"main"** et **"/ (root)"**
5. Cliquez **"Save"**

### Étape 5 : Ajouter le domaine personnalisé
1. Toujours dans **Settings → Pages**
2. **Custom domain** : Entrez votre domaine (ex: `mondomaine.com`)
3. Cliquez **"Save"**
4. Cochez **"Enforce HTTPS"** (apparaîtra après vérification DNS)

### Étape 6 : Configurer les DNS
Allez dans le panneau DNS de votre registrar et ajoutez ces enregistrements :

#### Pour un domaine racine (ex: mondomaine.com)

| Type | Nom/Host | Valeur |
|------|----------|--------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | votre-username.github.io |

#### Pour un sous-domaine (ex: liens.mondomaine.com)

| Type | Nom/Host | Valeur |
|------|----------|--------|
| CNAME | liens | votre-username.github.io |

### Étape 7 : Attendre la propagation DNS
- La propagation DNS peut prendre **5 minutes à 48 heures**
- Testez votre domaine régulièrement
- Une fois fonctionnel, le site affichera la page Multilink

---

## 🚀 Méthode 2 : Railway (Alternative)

Railway est une plateforme de déploiement cloud qui offre un plan gratuit.

### Étape 1 : Créer un compte Railway
1. Allez sur **https://railway.app**
2. Connectez-vous avec votre compte **GitHub**

### Étape 2 : Créer un repository GitHub
(Même procédure que la Méthode 1, Étapes 2 et 3)

Créez un repository avec ces fichiers :

**Fichier 1 : `index.html`**
```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liens - Nom du Client</title>
    <style>
        * { margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
    </style>
</head>
<body>
    <iframe src="https://alphagency.fr/lien-bio/NOM-DU-CLIENT"></iframe>
</body>
</html>
```

**Fichier 2 : `package.json`** (nécessaire pour Railway)
```json
{
  "name": "multilink-redirect",
  "version": "1.0.0",
  "scripts": {
    "start": "npx serve -s . -l $PORT"
  },
  "dependencies": {
    "serve": "^14.2.0"
  }
}
```

### Étape 3 : Déployer sur Railway
1. Sur Railway, cliquez **"New Project"**
2. Choisissez **"Deploy from GitHub repo"**
3. Sélectionnez votre repository
4. Railway déploie automatiquement

### Étape 4 : Obtenir l'URL publique
1. Cliquez sur le service déployé
2. Allez dans **"Settings"** → **"Networking"**
3. Cliquez **"Generate Domain"**
4. Vous obtenez une URL comme : `https://multilink-xxx-production.up.railway.app`

### Étape 5 : Ajouter un domaine personnalisé
1. Dans **"Settings"** → **"Networking"** → **"Custom Domain"**
2. Entrez votre domaine : `mondomaine.com`
3. Railway vous donnera un enregistrement CNAME à ajouter

### Étape 6 : Configurer les DNS
Dans votre registrar, ajoutez :

| Type | Nom/Host | Valeur |
|------|----------|--------|
| CNAME | @ ou www | votre-projet.up.railway.app |

⚠️ **Note** : Certains registrars n'acceptent pas de CNAME sur le domaine racine (@). Dans ce cas, utilisez un sous-domaine (ex: `www` ou `liens`).

---

## 🔧 Dépannage

### Le site affiche une erreur 404
- Vérifiez que le fichier s'appelle bien `index.html` (pas `Index.html` ni `index.HTML`)
- Vérifiez que le repository est **public** (pour GitHub Pages)

### Le domaine ne fonctionne pas
- Attendez 24-48h pour la propagation DNS
- Vérifiez les enregistrements DNS avec [dnschecker.org](https://dnschecker.org)
- Assurez-vous d'avoir supprimé les anciens enregistrements DNS

### Erreur SSL/HTTPS
- Sur GitHub Pages : Attendez quelques minutes après la configuration, puis cochez "Enforce HTTPS"
- Sur Railway : Le SSL est automatique, attendez quelques minutes

### L'iframe ne s'affiche pas
- Vérifiez que l'URL dans l'iframe est correcte : `https://alphagency.fr/lien-bio/NOM-DU-CLIENT`
- Testez l'URL directement dans votre navigateur

---

## 📞 Support

En cas de difficulté, contactez l'équipe Alpha Agency :
- Email : support@alphagency.fr
- Téléphone : 0690 05 34 44

---

*Document créé par Alpha Agency - Dernière mise à jour : Février 2026*
