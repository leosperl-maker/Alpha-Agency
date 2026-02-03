# 📚 Documentation API Blog - Intégration n8n

## Vue d'ensemble

L'API Blog du CRM Alpha Agency permet la publication automatisée d'articles via des workflows externes (n8n, Zapier, Make, etc.).

---

## 🔐 Authentification

Toutes les requêtes à l'endpoint d'automatisation doivent inclure une clé API dans le header :

```
X-API-Key: blog-alpha-auto-publish-2024-secure
```

---

## 📍 Endpoint Principal

### POST `/api/blog/auto-publish`

Crée et publie automatiquement un article de blog.

**URL complète :** `https://alphagency.fr/api/blog/auto-publish`

---

## 📋 Schéma des données

### Option 1 : Avec `content_blocks` (RECOMMANDÉ)

Format typé pour un contrôle total du rendu (titres H2/H3/H4, images inline, etc.)

```json
{
  "title": "IA générative en entreprise : 5 raisons pour lesquelles les TPE/PME doivent s'y mettre dès 2026",
  "slug": "ia-generative-entreprise-tpe-pme-2026",
  "excerpt": "L'intelligence artificielle générative n'est plus une technologie futuriste...",
  "featured_image_url": "https://res.cloudinary.com/xxx/image/upload/v123/cover.jpg",
  "content_blocks": [
    { "type": "heading", "level": 2, "text": "Introduction" },
    { "type": "text", "text": "L'IA générative a franchi un cap décisif pour les petites et moyennes entreprises..." },
    { "type": "image", "url": "https://res.cloudinary.com/xxx/image/upload/v123/image1.jpg", "alt": "Illustration IA en entreprise" },
    { "type": "heading", "level": 3, "text": "1. Automatisation des tâches répétitives" },
    { "type": "text", "text": "Les TPE/PME peuvent désormais automatiser..." },
    { "type": "image", "url": "https://res.cloudinary.com/xxx/image/upload/v123/image2.jpg", "alt": "Automatisation" },
    { "type": "heading", "level": 3, "text": "2. Création de contenu à grande échelle" },
    { "type": "text", "text": "La génération de contenu marketing..." }
  ],
  "tags": ["ia", "marketing", "tpe-pme"],
  "category": "Marketing Digital",
  "status": "published",
  "seo_title": "IA Générative pour TPE/PME : Guide 2026",
  "seo_description": "Découvrez comment l'IA générative peut transformer votre entreprise en 2026."
}
```

### Types de blocs supportés

| Type | Champs | Exemple |
|------|--------|---------|
| `heading` | `level` (2, 3, 4), `text` | `{ "type": "heading", "level": 2, "text": "Mon titre H2" }` |
| `text` | `text` | `{ "type": "text", "text": "Contenu du paragraphe..." }` |
| `image` | `url`, `alt` (optionnel) | `{ "type": "image", "url": "https://...", "alt": "Description" }` |
| `quote` | `content`, `author` (optionnel) | `{ "type": "quote", "content": "Citation...", "author": "Auteur" }` |

### Option 2 : Avec `content` (Markdown ou HTML)

Pour une conversion automatique (moins précis pour les images) :

```json
{
  "title": "Mon article",
  "excerpt": "Résumé de l'article",
  "content": "## Introduction\n\nContenu en Markdown...\n\n![Image](https://...)\n\n## Chapitre 1",
  "content_format": "markdown",
  "featured_image_url": "https://example.com/cover.jpg",
  "tags": ["tag1", "tag2"],
  "status": "published"
}
```

---

## 📝 Champs disponibles

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `title` | string | ✅ | Titre de l'article |
| `slug` | string | ❌ | URL personnalisée (auto-générée si absent) |
| `excerpt` | string | ❌ | Résumé/extrait de l'article |
| `featured_image_url` | string | ❌ | URL de l'image de couverture (hero) |
| `content_blocks` | array | ❌* | Blocs de contenu typés (prioritaire) |
| `content` | string | ❌* | Contenu Markdown/HTML (si pas de content_blocks) |
| `content_format` | string | ❌ | `"markdown"`, `"html"`, ou `"text"` (défaut: markdown) |
| `tags` | array | ❌ | Liste des tags |
| `category` | string | ❌ | Catégorie de l'article |
| `status` | string | ❌ | `"draft"`, `"published"`, `"scheduled"` (défaut: published) |
| `publish_at` | string | ❌ | Date ISO 8601 pour publication programmée |
| `seo_title` | string | ❌ | Titre SEO (utilise title si absent) |
| `seo_description` | string | ❌ | Description SEO (utilise excerpt si absent) |
| `author_name` | string | ❌ | Nom de l'auteur (défaut: Alpha Agency) |
| `source_ia` | object | ❌ | Métadonnées IA pour audit |

*Un des deux est requis : `content_blocks` OU `content`

---

## 🖼️ Gestion des images

### Images Cloudinary (Recommandé)

Toutes les images doivent être uploadées vers Cloudinary **avant** l'appel API.

**Workflow n8n recommandé :**
1. Générer/télécharger l'image
2. Uploader vers Cloudinary via le node HTTP Request
3. Récupérer la `secure_url`
4. Utiliser cette URL dans `featured_image_url` ou `content_blocks`

### Image de couverture (Hero)

Utilisez le champ `featured_image_url` :

```json
{
  "featured_image_url": "https://res.cloudinary.com/xxx/image/upload/v123/hero.jpg"
}
```

### Images dans le contenu

Utilisez des blocs `image` dans `content_blocks` :

```json
{
  "content_blocks": [
    { "type": "text", "text": "Introduction..." },
    { "type": "image", "url": "https://res.cloudinary.com/xxx/image/upload/v123/img1.jpg", "alt": "Description" },
    { "type": "text", "text": "Suite du contenu..." }
  ]
}
```

---

## 📡 Exemples d'appels

### cURL

```bash
curl -X POST "https://alphagency.fr/api/blog/auto-publish" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: blog-alpha-auto-publish-2024-secure" \
  -d '{
    "title": "Test automatisation n8n",
    "excerpt": "Article publié automatiquement",
    "content_blocks": [
      { "type": "heading", "level": 2, "text": "Introduction" },
      { "type": "text", "text": "Ceci est un article de test." }
    ],
    "tags": ["test", "n8n"],
    "status": "published"
  }'
```

### Réponse succès (201)

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "slug": "test-automatisation-n8n",
  "message": "Article créé et publié avec succès",
  "url": "https://alphagency.fr/blog/test-automatisation-n8n"
}
```

### Réponse erreur (401)

```json
{
  "detail": "Clé API invalide. Utilisez le header X-API-Key."
}
```

---

## 🔄 Configuration n8n

### Node HTTP Request

1. **Method:** POST
2. **URL:** `https://alphagency.fr/api/blog/auto-publish`
3. **Authentication:** None (utiliser le header)
4. **Headers:**
   - `Content-Type`: `application/json`
   - `X-API-Key`: `blog-alpha-auto-publish-2024-secure`
5. **Body Type:** JSON
6. **Body Content:** Votre payload JSON

### Workflow type pour 3 articles/jour

```
[Trigger CRON] → [OpenAI/Claude: Générer contenu] → [Cloudinary: Upload images] → [HTTP Request: /api/blog/auto-publish]
```

---

## 📊 Autres endpoints utiles

### GET `/api/blog`

Liste tous les articles publiés.

```bash
curl "https://alphagency.fr/api/blog"
```

### GET `/api/blog/article/{slug}`

Récupère un article par son slug.

```bash
curl "https://alphagency.fr/api/blog/article/mon-article"
```

### GET `/api/blog/api-info`

Documentation interactive de l'API.

```bash
curl "https://alphagency.fr/api/blog/api-info"
```

---

## ⚠️ Points importants

1. **Titres :** Les blocs `heading` avec `level: 2` = H2, `level: 3` = H3, etc.
2. **Images :** Toujours utiliser des URLs HTTPS stables (Cloudinary recommandé)
3. **featured_image_url :** Doit être une URL valide pour l'image de couverture
4. **Pas de fallback texte :** Les blocs `heading` ne seront jamais rendus comme du texte brut
5. **Rate limit :** Pas de limite stricte, mais espacer les appels de quelques secondes recommandé

---

## 🔧 Dépannage

| Erreur | Cause | Solution |
|--------|-------|----------|
| 401 Unauthorized | Clé API manquante ou invalide | Vérifier le header `X-API-Key` |
| 400 Bad Request | Champs requis manquants | Vérifier que `title` et (`content` ou `content_blocks`) sont présents |
| 422 Validation Error | Format JSON invalide | Valider le JSON avec un outil en ligne |

---

## 📞 Support

Pour toute question technique sur l'intégration :
- Email : leo.sperl@alphagency.fr
- Documentation interactive : `GET /api/blog/api-info`
