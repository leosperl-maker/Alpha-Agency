import { useState, useEffect, useCallback } from "react";
import { 
  Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, 
  FileText, Calendar, Tag, Clock, CheckCircle, Archive,
  Image, Video, Music, X, GripVertical, Bold, Italic,
  Heading1, Heading2, List, Quote, Link2, AlignLeft, 
  AlignCenter, AlignRight, Maximize
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "../../components/ui/dialog";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { blogAPI, tagsAPI, uploadAPI } from "../../lib/api";
import { toast } from "sonner";

// Rich Text Content Block Component
const ContentBlockEditor = ({ block, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        return (
          <Textarea
            value={block.content || ''}
            onChange={(e) => onUpdate({ ...block, content: e.target.value })}
            placeholder="Votre texte ici..."
            className="min-h-24 bg-white border-[#E5E5E5]"
          />
        );
      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select 
                value={String(block.level || 2)} 
                onValueChange={(v) => onUpdate({ ...block, level: parseInt(v) })}
              >
                <SelectTrigger className="w-24 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={block.content || ''}
                onChange={(e) => onUpdate({ ...block, content: e.target.value })}
                placeholder="Titre de la section"
                className={`flex-1 bg-white ${block.level === 2 ? 'text-xl font-bold' : 'text-lg font-semibold'}`}
              />
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={block.url || ''}
                onChange={(e) => onUpdate({ ...block, url: e.target.value })}
                placeholder="URL de l'image"
                className="flex-1 bg-white"
              />
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span><Image className="w-4 h-4 mr-1" /> Upload</span>
                </Button>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      try {
                        const res = await uploadAPI.image(e.target.files[0]);
                        onUpdate({ ...block, url: res.data.url });
                        toast.success("Image uploadée");
                      } catch (err) {
                        toast.error("Erreur upload");
                      }
                    }
                  }}
                />
              </label>
            </div>
            {block.url && (
              <div className="relative">
                <img 
                  src={block.url} 
                  alt="" 
                  className={`max-h-48 object-cover ${block.rounded ? 'rounded-xl' : ''}`}
                  style={{ width: block.size === 'full' ? '100%' : block.size === 'large' ? '80%' : '50%' }}
                />
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Select 
                value={block.alignment || 'center'} 
                onValueChange={(v) => onUpdate({ ...block, alignment: v })}
              >
                <SelectTrigger className="w-28 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                  <SelectItem value="full">Pleine largeur</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={block.size || 'medium'} 
                onValueChange={(v) => onUpdate({ ...block, size: v })}
              >
                <SelectTrigger className="w-24 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="small">Petit</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="large">Grand</SelectItem>
                  <SelectItem value="full">Plein</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={block.rounded ? "default" : "outline"}
                size="sm"
                onClick={() => onUpdate({ ...block, rounded: !block.rounded })}
              >
                Coins arrondis
              </Button>
            </div>
            <Input
              value={block.caption || ''}
              onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              placeholder="Légende (optionnel)"
              className="bg-white"
            />
          </div>
        );
      case 'gallery':
        return (
          <div className="space-y-3">
            <p className="text-sm text-[#666666]">Galerie d'images (URLs séparées par des virgules)</p>
            <Textarea
              value={(block.urls || []).join(', ')}
              onChange={(e) => onUpdate({ ...block, urls: e.target.value.split(',').map(u => u.trim()).filter(u => u) })}
              placeholder="https://image1.jpg, https://image2.jpg"
              className="bg-white"
            />
            {block.urls?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {block.urls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded" />
                ))}
              </div>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="space-y-3">
            <Input
              value={block.url || ''}
              onChange={(e) => onUpdate({ ...block, url: e.target.value })}
              placeholder="URL du fichier audio"
              className="bg-white"
            />
            {block.url && (
              <audio controls className="w-full">
                <source src={block.url} />
              </audio>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="space-y-3">
            <Input
              value={block.url || ''}
              onChange={(e) => onUpdate({ ...block, url: e.target.value })}
              placeholder="URL YouTube ou Vimeo"
              className="bg-white"
            />
            {block.url && (
              <div className="aspect-video bg-[#F8F8F8] rounded-lg flex items-center justify-center">
                <Video className="w-12 h-12 text-[#666666]" />
              </div>
            )}
          </div>
        );
      case 'quote':
        return (
          <div className="space-y-2 border-l-4 border-[#CE0202] pl-4">
            <Textarea
              value={block.content || ''}
              onChange={(e) => onUpdate({ ...block, content: e.target.value })}
              placeholder="Citation..."
              className="bg-white italic"
            />
            <Input
              value={block.caption || ''}
              onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
              placeholder="Auteur (optionnel)"
              className="bg-white text-sm"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const blockTypeLabels = {
    text: 'Texte',
    heading: 'Titre',
    image: 'Image',
    gallery: 'Galerie',
    audio: 'Audio',
    video: 'Vidéo',
    quote: 'Citation'
  };

  return (
    <div className="bg-[#F8F8F8] rounded-lg p-3 border border-[#E5E5E5] group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-[#999999] cursor-grab" />
          <Badge variant="outline" className="text-xs">
            {blockTypeLabels[block.type] || block.type}
          </Badge>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={isFirst} className="h-6 w-6 p-0">
            ↑
          </Button>
          <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast} className="h-6 w-6 p-0">
            ↓
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-red-500">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {renderBlockContent()}
    </div>
  );
};

// Article Editor Component
const ArticleEditor = ({ article, onSave, onCancel, tags: availableTags }) => {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    excerpt: article?.excerpt || '',
    featured_image: article?.featured_image || '',
    content_blocks: article?.content_blocks || [],
    tags: article?.tags || [],
    category: article?.category || '',
    status: article?.status || 'draft',
    seo_title: article?.seo_title || '',
    seo_description: article?.seo_description || ''
  });
  const [saving, setSaving] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [suggestedNewTags, setSuggestedNewTags] = useState([]);

  const handleSuggestTags = async () => {
    const contentText = formData.content_blocks
      .filter(b => b.type === 'text' || b.type === 'heading')
      .map(b => b.content)
      .join('\n');
    
    if (!formData.title && !contentText) {
      toast.error("Ajoutez un titre ou du contenu pour suggérer des tags");
      return;
    }
    
    setSuggestingTags(true);
    try {
      const res = await tagsAPI.suggest(contentText, formData.title, 'blog');
      
      if (res.data.suggested_tags && res.data.suggested_tags.length > 0) {
        const newTags = [...new Set([...formData.tags, ...res.data.suggested_tags])];
        setFormData(prev => ({ ...prev, tags: newTags }));
        toast.success(`${res.data.suggested_tags.length} tag(s) suggéré(s) et ajouté(s)`);
      }
      
      if (res.data.new_tags && res.data.new_tags.length > 0) {
        setSuggestedNewTags(res.data.new_tags);
        toast.info(`${res.data.new_tags.length} nouveau(x) tag(s) proposé(s)`);
      }
      
      if (!res.data.suggested_tags?.length && !res.data.new_tags?.length) {
        toast.info("Aucune suggestion de tag pour ce contenu");
      }
    } catch (error) {
      console.error("Error suggesting tags:", error);
      toast.error("Erreur lors de la suggestion de tags");
    } finally {
      setSuggestingTags(false);
    }
  };

  const addBlock = (type) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type,
      content: '',
      level: type === 'heading' ? 2 : undefined
    };
    setFormData(prev => ({
      ...prev,
      content_blocks: [...prev.content_blocks, newBlock]
    }));
  };

  const updateBlock = (index, updatedBlock) => {
    setFormData(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.map((b, i) => i === index ? updatedBlock : b)
    }));
  };

  const deleteBlock = (index) => {
    setFormData(prev => ({
      ...prev,
      content_blocks: prev.content_blocks.filter((_, i) => i !== index)
    }));
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...formData.content_blocks];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setFormData(prev => ({ ...prev, content_blocks: newBlocks }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Titre *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Titre de l'article"
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug (URL)</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            placeholder="mon-article"
            className="bg-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Chapeau / Extrait</Label>
        <Textarea
          value={formData.excerpt}
          onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
          placeholder="Courte description de l'article"
          className="bg-white"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Image à la une</Label>
          <div className="flex gap-2">
            <Input
              value={formData.featured_image}
              onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
              placeholder="URL de l'image"
              className="flex-1 bg-white"
            />
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span><Image className="w-4 h-4" /></span>
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files?.[0]) {
                    try {
                      const res = await uploadAPI.image(e.target.files[0]);
                      setFormData(prev => ({ ...prev, featured_image: res.data.url }));
                      toast.success("Image uploadée");
                    } catch (err) {
                      toast.error("Erreur upload");
                    }
                  }
                }}
              />
            </label>
          </div>
          {formData.featured_image && (
            <img src={formData.featured_image} alt="" className="h-24 object-cover rounded-lg" />
          )}
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1">
            {availableTags?.map(tag => (
              <Badge
                key={tag.id}
                variant={formData.tags.includes(tag.name) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    tags: prev.tags.includes(tag.name)
                      ? prev.tags.filter(t => t !== tag.name)
                      : [...prev.tags, tag.name]
                  }));
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg">Contenu</Label>
          <div className="flex gap-1 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => addBlock('text')}>
              <FileText className="w-3 h-3 mr-1" /> Texte
            </Button>
            <Button variant="outline" size="sm" onClick={() => addBlock('heading')}>
              <Heading2 className="w-3 h-3 mr-1" /> Titre
            </Button>
            <Button variant="outline" size="sm" onClick={() => addBlock('image')}>
              <Image className="w-3 h-3 mr-1" /> Image
            </Button>
            <Button variant="outline" size="sm" onClick={() => addBlock('gallery')}>
              <Image className="w-3 h-3 mr-1" /> Galerie
            </Button>
            <Button variant="outline" size="sm" onClick={() => addBlock('quote')}>
              <Quote className="w-3 h-3 mr-1" /> Citation
            </Button>
            <Button variant="outline" size="sm" onClick={() => addBlock('audio')}>
              <Music className="w-3 h-3 mr-1" /> Audio
            </Button>
            <Button variant="outline" size="sm" onClick={() => addBlock('video')}>
              <Video className="w-3 h-3 mr-1" /> Vidéo
            </Button>
          </div>
        </div>

        <div className="space-y-3 min-h-48">
          {formData.content_blocks.length === 0 ? (
            <div className="text-center py-12 text-[#666666] bg-[#F8F8F8] rounded-lg border-2 border-dashed border-[#E5E5E5]">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Ajoutez des blocs de contenu avec les boutons ci-dessus</p>
            </div>
          ) : (
            formData.content_blocks.map((block, index) => (
              <ContentBlockEditor
                key={block.id}
                block={block}
                onUpdate={(updated) => updateBlock(index, updated)}
                onDelete={() => deleteBlock(index)}
                onMoveUp={() => moveBlock(index, -1)}
                onMoveDown={() => moveBlock(index, 1)}
                isFirst={index === 0}
                isLast={index === formData.content_blocks.length - 1}
              />
            ))
          )}
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
        <Select 
          value={formData.status} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
        >
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving}
            className="bg-[#CE0202] hover:bg-[#B00202] text-white"
          >
            {saving ? "Enregistrement..." : article?.id ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Blog Admin Page
const BlogAdminPage = () => {
  const [articles, setArticles] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [articlesRes, tagsRes] = await Promise.all([
        blogAPI.getAll({ published_only: false }),
        tagsAPI.getAll('blog')
      ]);
      setArticles(articlesRes.data);
      setTags(tagsRes.data);
    } catch (error) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveArticle = async (data) => {
    try {
      if (editingArticle?.id) {
        await blogAPI.update(editingArticle.id, data);
        toast.success("Article mis à jour");
      } else {
        await blogAPI.create(data);
        toast.success("Article créé");
      }
      setEditorOpen(false);
      setEditingArticle(null);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm("Supprimer cet article ?")) return;
    try {
      await blogAPI.delete(id);
      toast.success("Article supprimé");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await tagsAPI.create({ name: newTagName, type: 'blog' });
      toast.success("Tag créé");
      setNewTagName('');
      setTagDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm("Supprimer ce tag ?")) return;
    try {
      await tagsAPI.delete(id);
      toast.success("Tag supprimé");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const filteredArticles = articles.filter(article => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!article.title?.toLowerCase().includes(q)) return false;
    }
    if (filterStatus !== 'all' && article.status !== filterStatus) return false;
    if (filterTag !== 'all' && !article.tags?.includes(filterTag)) return false;
    return true;
  });

  if (editorOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => { setEditorOpen(false); setEditingArticle(null); }}>
            ← Retour
          </Button>
          <h1 className="text-xl font-bold">
            {editingArticle?.id ? "Modifier l'article" : "Nouvel article"}
          </h1>
        </div>
        <Card className="bg-white">
          <CardContent className="p-6">
            <ArticleEditor
              article={editingArticle}
              tags={tags}
              onSave={handleSaveArticle}
              onCancel={() => { setEditorOpen(false); setEditingArticle(null); }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="blog-admin-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Blog / Actualités</h1>
          <p className="text-[#666666] text-xs sm:text-sm">{articles.length} articles</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none text-sm">
                <Tag className="w-4 h-4 mr-1" /> Tags
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Gestion des tags</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nouveau tag"
                    className="flex-1"
                  />
                  <Button onClick={handleCreateTag} className="bg-[#CE0202] text-white">
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center justify-between p-2 bg-[#F8F8F8] rounded">
                      <Badge variant="outline">{tag.name}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTag(tag.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-center text-[#666666] py-4">Aucun tag</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            onClick={() => { setEditingArticle(null); setEditorOpen(true); }}
            className="bg-[#CE0202] hover:bg-[#B00202] text-white flex-1 sm:flex-none text-sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Nouvel article
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 bg-white w-full"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-32 bg-white">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-full sm:w-32 bg-white">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Tous</SelectItem>
            {tags.map(tag => (
              <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-[#666666] opacity-30" />
            <p className="text-[#666666]">Aucun article</p>
            <Button 
              onClick={() => { setEditingArticle(null); setEditorOpen(true); }}
              className="mt-4 bg-[#CE0202] text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Créer un article
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredArticles.map(article => (
            <Card key={article.id} className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {article.featured_image ? (
                    <img 
                      src={article.featured_image} 
                      alt="" 
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#F8F8F8] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-8 h-8 text-[#666666] opacity-30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[#1A1A1A] truncate">{article.title}</h3>
                        <p className="text-sm text-[#666666] line-clamp-2 mt-1">{article.excerpt}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white">
                          <DropdownMenuItem onClick={() => { setEditingArticle(article); setEditorOpen(true); }}>
                            <Edit className="w-4 h-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/actualites/${article.slug}`, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" /> Voir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteArticle(article.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant={article.status === 'published' ? 'default' : 'outline'} className="text-xs">
                        {article.status === 'published' ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Publié</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> Brouillon</>
                        )}
                      </Badge>
                      {article.tags?.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs bg-[#F8F8F8]">
                          {tag}
                        </Badge>
                      ))}
                      {article.published_at && (
                        <span className="text-xs text-[#666666] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.published_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogAdminPage;
