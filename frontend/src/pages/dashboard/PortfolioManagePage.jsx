import { useState, useEffect, useCallback } from "react";
import { 
  Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, 
  FileText, Calendar, Tag, Clock, CheckCircle, Archive,
  Image, Video, Music, X, GripVertical, Bold, Italic,
  Heading1, Heading2, List, Quote, Link2, AlignLeft, 
  AlignCenter, AlignRight, Maximize, ExternalLink
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
import { portfolioAPI, tagsAPI, uploadAPI } from "../../lib/api";
import { toast } from "sonner";

// Rich Text Content Block Component (réutilisé du Blog)
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
            <p className="text-sm text-[#666666]">Galerie d'images - Cliquez pour ajouter des images</p>
            <div className="flex flex-wrap gap-2">
              {(block.urls || []).map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => onUpdate({ ...block, urls: block.urls.filter((_, idx) => idx !== i) })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <label className="w-24 h-24 border-2 border-dashed border-[#E5E5E5] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#CE0202]">
                <Plus className="w-6 h-6 text-[#666666]" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  multiple
                  onChange={async (e) => {
                    if (e.target.files?.length) {
                      try {
                        const newUrls = [...(block.urls || [])];
                        for (const file of e.target.files) {
                          const res = await uploadAPI.image(file);
                          newUrls.push(res.data.url);
                        }
                        onUpdate({ ...block, urls: newUrls });
                        toast.success("Images uploadées");
                      } catch (err) {
                        toast.error("Erreur upload");
                      }
                    }
                  }}
                />
              </label>
            </div>
            <Select 
              value={block.layout || 'grid'} 
              onValueChange={(v) => onUpdate({ ...block, layout: v })}
            >
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Disposition" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="grid">Grille</SelectItem>
                <SelectItem value="masonry">Masonry</SelectItem>
                <SelectItem value="carousel">Carrousel</SelectItem>
                <SelectItem value="side-by-side">Côte à côte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'audio':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={block.url || ''}
                onChange={(e) => onUpdate({ ...block, url: e.target.value })}
                placeholder="URL du fichier audio"
                className="flex-1 bg-white"
              />
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span><Music className="w-4 h-4 mr-1" /> Upload</span>
                </Button>
                <input 
                  type="file" 
                  accept="audio/*" 
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      try {
                        const res = await uploadAPI.document(e.target.files[0]);
                        onUpdate({ ...block, url: res.data.url });
                        toast.success("Audio uploadé");
                      } catch (err) {
                        toast.error("Erreur upload");
                      }
                    }
                  }}
                />
              </label>
            </div>
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
              placeholder="URL YouTube, Vimeo ou fichier vidéo"
              className="bg-white"
            />
            {block.url && (
              <div className="aspect-video bg-[#F8F8F8] rounded-lg flex items-center justify-center">
                {block.url.includes('youtube') || block.url.includes('vimeo') ? (
                  <iframe
                    src={block.url.replace('watch?v=', 'embed/')}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                ) : (
                  <video controls className="w-full h-full rounded-lg">
                    <source src={block.url} />
                  </video>
                )}
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

// Portfolio Item Editor
const PortfolioEditor = ({ item, onSave, onCancel, tags: availableTags, categories }) => {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    slug: item?.slug || '',
    subtitle: item?.subtitle || '',
    category: item?.category || '',
    tags: item?.tags || [],
    featured_image: item?.featured_image || '',
    gallery_images: item?.gallery_images || [],
    content_blocks: item?.content_blocks || [],
    audio_url: item?.audio_url || '',
    video_url: item?.video_url || '',
    status: item?.status || 'draft'
  });
  const [saving, setSaving] = useState(false);

  const addBlock = (type) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type,
      content: '',
      level: type === 'heading' ? 2 : undefined,
      urls: type === 'gallery' ? [] : undefined
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
    if (!formData.category) {
      toast.error("La catégorie est requise");
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
          <Label>Titre du projet *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Refonte site web Hôtel Paradise"
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label>Catégorie *</Label>
          <Select 
            value={formData.category} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Chapeau / Introduction</Label>
        <Textarea
          value={formData.subtitle}
          onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
          placeholder="Courte description du projet (visible dans la grille et en haut de la fiche)"
          className="bg-white"
          rows={2}
        />
      </div>

      {/* Featured Image */}
      <div className="space-y-2">
        <Label>Image principale</Label>
        <div className="flex gap-2">
          <Input
            value={formData.featured_image}
            onChange={(e) => setFormData(prev => ({ ...prev, featured_image: e.target.value }))}
            placeholder="URL de l'image"
            className="flex-1 bg-white"
          />
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span><Image className="w-4 h-4 mr-2" /> Upload</span>
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
          <img src={formData.featured_image} alt="" className="h-32 object-cover rounded-xl" />
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1">
          {availableTags?.map(tag => (
            <Badge
              key={tag.id}
              variant={formData.tags.includes(tag.name) ? "default" : "outline"}
              className="cursor-pointer"
              style={formData.tags.includes(tag.name) ? { backgroundColor: tag.color || '#CE0202' } : {}}
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
          {(!availableTags || availableTags.length === 0) && (
            <p className="text-sm text-[#666666]">Aucun tag - Créez-en dans la gestion des tags</p>
          )}
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg">Contenu détaillé</Label>
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
              <p className="text-sm mt-1">Texte, images, galeries, vidéos, audio...</p>
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
            {saving ? "Enregistrement..." : item?.id ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Portfolio Admin Page
const PortfolioManagePage = () => {
  const [items, setItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#CE0202');

  const categories = [
    { value: "site_web", label: "Site Web" },
    { value: "site_ecommerce", label: "Site E-commerce" },
    { value: "reseaux_sociaux", label: "Réseaux Sociaux" },
    { value: "community_management", label: "Community Management" },
    { value: "photo", label: "Photographie" },
    { value: "video", label: "Vidéo" },
    { value: "infographie", label: "Infographie" },
    { value: "ads", label: "Publicité digitale" },
    { value: "radio", label: "Radio / Audio" },
    { value: "branding", label: "Branding / Logo" },
    { value: "hotel", label: "Hôtellerie" },
    { value: "restaurant", label: "Restauration" }
  ];

  const tagColors = [
    "#CE0202", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", 
    "#EC4899", "#06B6D4", "#F97316", "#84CC16"
  ];

  const fetchData = useCallback(async () => {
    try {
      const [itemsRes, tagsRes] = await Promise.all([
        portfolioAPI.getAll(),
        tagsAPI.getAll('portfolio')
      ]);
      setItems(itemsRes.data);
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

  const handleSaveItem = async (data) => {
    try {
      if (editingItem?.id) {
        await portfolioAPI.update(editingItem.id, data);
        toast.success("Réalisation mise à jour");
      } else {
        await portfolioAPI.create(data);
        toast.success("Réalisation créée");
      }
      setEditorOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Supprimer cette réalisation ?")) return;
    try {
      await portfolioAPI.delete(id);
      toast.success("Réalisation supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await tagsAPI.create({ name: newTagName, type: 'portfolio', color: newTagColor });
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

  const getCategoryLabel = (value) => {
    return categories.find(c => c.value === value)?.label || value;
  };

  const filteredItems = items.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.title?.toLowerCase().includes(q) && !item.subtitle?.toLowerCase().includes(q)) return false;
    }
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterTag !== 'all' && !item.tags?.includes(filterTag)) return false;
    return true;
  });

  if (editorOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => { setEditorOpen(false); setEditingItem(null); }}>
            ← Retour
          </Button>
          <h1 className="text-xl font-bold">
            {editingItem?.id ? "Modifier la réalisation" : "Nouvelle réalisation"}
          </h1>
        </div>
        <Card className="bg-white">
          <CardContent className="p-6">
            <PortfolioEditor
              item={editingItem}
              tags={tags}
              categories={categories}
              onSave={handleSaveItem}
              onCancel={() => { setEditorOpen(false); setEditingItem(null); }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="portfolio-manage-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Réalisations</h1>
          <p className="text-[#666666] text-xs sm:text-sm">{items.length} projets</p>
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
                  <div className="flex gap-1">
                    {tagColors.slice(0, 5).map(color => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded-full border-2 ${newTagColor === color ? 'border-black' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTagColor(color)}
                      />
                    ))}
                  </div>
                  <Button onClick={handleCreateTag} className="bg-[#CE0202] text-white">
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tags.map(tag => (
                    <div key={tag.id} className="flex items-center justify-between p-2 bg-[#F8F8F8] rounded">
                      <Badge style={{ backgroundColor: tag.color || '#CE0202', color: 'white' }}>
                        {tag.name}
                      </Badge>
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
            onClick={() => { setEditingItem(null); setEditorOpen(true); }}
            className="bg-[#CE0202] hover:bg-[#B00202] text-white flex-1 sm:flex-none text-sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Nouvelle réalisation
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
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-40 bg-white">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
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

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-[#E5E5E5] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <Image className="w-12 h-12 mx-auto mb-3 text-[#666666] opacity-30" />
            <p className="text-[#666666]">Aucune réalisation</p>
            <Button 
              onClick={() => { setEditingItem(null); setEditorOpen(true); }}
              className="mt-4 bg-[#CE0202] text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Créer une réalisation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="bg-white hover:shadow-lg transition-shadow overflow-hidden group">
              <div className="relative aspect-video">
                {item.featured_image ? (
                  <img 
                    src={item.featured_image} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center">
                    <Image className="w-12 h-12 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => { setEditingItem(item); setEditorOpen(true); }}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Modifier
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => window.open(`/realisations/${item.slug || item.id}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Voir
                  </Button>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge 
                    className={`${item.status === 'published' ? 'bg-green-500' : 'bg-gray-500'} text-white text-xs`}
                  >
                    {item.status === 'published' ? 'Publié' : 'Brouillon'}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white">
                    <DropdownMenuItem onClick={() => { setEditingItem(item); setEditorOpen(true); }}>
                      <Edit className="w-4 h-4 mr-2" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`/realisations/${item.slug || item.id}`, '_blank')}>
                      <Eye className="w-4 h-4 mr-2" /> Voir
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteItem(item.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#1A1A1A] line-clamp-1">{item.title}</h3>
                </div>
                <p className="text-sm text-[#666666] line-clamp-2 mb-3">{item.subtitle}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(item.category)}
                  </Badge>
                  {item.tags?.slice(0, 2).map(tag => {
                    const tagObj = tags.find(t => t.name === tag);
                    return (
                      <Badge 
                        key={tag} 
                        className="text-xs"
                        style={{ backgroundColor: tagObj?.color || '#CE0202', color: 'white' }}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                  {item.tags?.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioManagePage;
