import { useState, useEffect } from "react";
import {
  Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye,
  FileText, Calendar, Tag, CheckCircle, Archive, Image,
  X, Loader2, Sparkles, Save, ExternalLink, Globe, Settings2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../../components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../../components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { portfolioAPI, tagsAPI, uploadAPI } from "../../lib/api";
import { toast } from "sonner";
import AdvancedBlockEditor from "../../components/AdvancedBlockEditor";
import AdvancedBlockRenderer from "../../components/AdvancedBlockRenderer";

const CATEGORIES = [
  { id: "site_web", label: "Site Web", color: "#3B82F6" },
  { id: "site_ecommerce", label: "E-commerce", color: "#10B981" },
  { id: "reseaux_sociaux", label: "Réseaux Sociaux", color: "#EC4899" },
  { id: "photo", label: "Photo", color: "#F59E0B" },
  { id: "video", label: "Vidéo", color: "#EF4444" },
  { id: "branding", label: "Branding", color: "#8B5CF6" },
  { id: "print", label: "Print", color: "#6366F1" },
  { id: "ads", label: "Publicité", color: "#14B8A6" }
];

const PortfolioManagePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    subtitle: "",
    category: "",
    tags: [],
    featured_image: "",
    content_blocks: [],
    status: "draft",
    client_name: "",
    project_date: "",
    project_url: ""
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, tagsRes] = await Promise.all([
        portfolioAPI.getAll(),
        tagsAPI.getAll("portfolio")
      ]);
      setItems(itemsRes.data);
      setAvailableTags(tagsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      subtitle: "",
      category: "",
      tags: [],
      featured_image: "",
      content_blocks: [],
      status: "draft",
      client_name: "",
      project_date: "",
      project_url: ""
    });
    setEditingItem(null);
  };

  const openEditor = (item = null) => {
    if (item) {
      setFormData({
        title: item.title || "",
        slug: item.slug || "",
        subtitle: item.subtitle || "",
        category: item.category || "",
        tags: item.tags || [],
        featured_image: item.featured_image || "",
        content_blocks: item.content_blocks || [],
        status: item.status || "draft",
        client_name: item.client_name || "",
        project_date: item.project_date || "",
        project_url: item.project_url || ""
      });
      setEditingItem(item);
    } else {
      resetForm();
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
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
      const payload = {
        ...formData,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      };

      if (editingItem) {
        await portfolioAPI.update(editingItem.id, payload);
        toast.success("Projet mis à jour");
      } else {
        await portfolioAPI.create(payload);
        toast.success("Projet créé");
      }

      setEditorOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce projet ?")) return;
    try {
      await portfolioAPI.delete(id);
      toast.success("Projet supprimé");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await portfolioAPI.update(id, { status });
      toast.success(status === "published" ? "Projet publié" : "Projet dépublié");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleImageUpload = async (e) => {
    if (e.target.files?.[0]) {
      setUploadingImage(true);
      try {
        const res = await uploadAPI.image(e.target.files[0]);
        setFormData(prev => ({ ...prev, featured_image: res.data.url }));
        toast.success("Image uploadée");
      } catch (error) {
        toast.error("Erreur lors de l'upload");
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSuggestTags = async () => {
    const contentText = formData.content_blocks
      .filter(b => b.type === 'text' || b.type === 'heading')
      .map(b => b.content)
      .join('\n');

    if (!formData.title && !contentText) {
      toast.error("Ajoutez un titre ou du contenu pour suggérer des tags");
      return;
    }

    try {
      const res = await tagsAPI.suggest(contentText, formData.title, 'portfolio');
      if (res.data.suggested_tags?.length > 0) {
        const newTags = [...new Set([...formData.tags, ...res.data.suggested_tags])];
        setFormData(prev => ({ ...prev, tags: newTags }));
        toast.success(`${res.data.suggested_tags.length} tag(s) suggéré(s)`);
      } else {
        toast.info("Aucune suggestion");
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const openPreview = (item) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  // Filtered items
  const filteredItems = items.filter(item => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (filterCategory !== "all" && item.category !== filterCategory) return false;
    return true;
  });

  const getCategoryInfo = (categoryId) => CATEGORIES.find(c => c.id === categoryId);

  return (
    <div className="p-4 md:p-6 bg-white/5 min-h-screen" data-testid="portfolio-manage-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Réalisations</h1>
          <p className="text-white/60">Gérez votre portfolio de projets</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('/realisations', '_blank')}
            className="border-indigo-500/50 text-indigo-400"
          >
            <Globe className="w-4 h-4 mr-2" /> Voir le site
          </Button>
          <Button
            onClick={() => openEditor()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
            data-testid="new-project-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Nouveau projet
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{items.length}</div>
            <div className="text-sm text-white/60">Total projets</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {items.filter(i => i.status === 'published').length}
            </div>
            <div className="text-sm text-white/60">Publiés</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {items.filter(i => i.status === 'draft').length}
            </div>
            <div className="text-sm text-white/60">Brouillons</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-400">{CATEGORIES.length}</div>
            <div className="text-sm text-white/60">Catégories</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 bg-white/5 backdrop-blur-xl border-white/10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] bg-white/5 backdrop-blur-xl border-white/10">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white/5 backdrop-blur-xl">
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="published">Publiés</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px] bg-white/5 backdrop-blur-xl border-white/10">
            <Tag className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent className="bg-white/5 backdrop-blur-xl">
            <SelectItem value="all">Toutes</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Image className="w-16 h-16 text-[#E5E5E5] mb-4" />
            <p className="text-white/60 text-lg mb-4">Aucun projet trouvé</p>
            <Button onClick={() => openEditor()} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="w-4 h-4 mr-2" /> Créer votre premier projet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const category = getCategoryInfo(item.category);
            return (
              <Card
                key={item.id}
                className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden group hover:shadow-lg transition-shadow"
                data-testid={`portfolio-item-${item.id}`}
              >
                {/* Image */}
                <div className="relative aspect-video bg-white/5 overflow-hidden">
                  {item.featured_image ? (
                    <img
                      src={item.featured_image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-12 h-12 text-[#E5E5E5]" />
                    </div>
                  )}
                  {/* Status badge */}
                  <Badge
                    className={`absolute top-3 left-3 ${
                      item.status === 'published'
                        ? 'bg-green-500 text-white'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {item.status === 'published' ? 'Publié' : 'Brouillon'}
                  </Badge>
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openPreview(item)}
                      className="bg-white/5 backdrop-blur-xl text-white"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Aperçu
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditor(item)}
                      className="bg-white/5 backdrop-blur-xl text-white"
                    >
                      <Edit className="w-4 h-4 mr-1" /> Éditer
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-white line-clamp-1">{item.title}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-white/5 backdrop-blur-xl border-white/10" align="end">
                        <DropdownMenuItem onClick={() => openEditor(item)}>
                          <Edit className="w-4 h-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPreview(item)}>
                          <Eye className="w-4 h-4 mr-2" /> Aperçu
                        </DropdownMenuItem>
                        {item.status === 'draft' ? (
                          <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'published')}>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Publier
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'draft')}>
                            <Archive className="w-4 h-4 mr-2" /> Dépublier
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {item.subtitle && (
                    <p className="text-sm text-white/60 line-clamp-2 mb-3">{item.subtitle}</p>
                  )}

                  <div className="flex items-center justify-between">
                    {category && (
                      <Badge
                        variant="outline"
                        style={{ borderColor: category.color, color: category.color }}
                      >
                        {category.label}
                      </Badge>
                    )}
                    {item.tags?.length > 0 && (
                      <span className="text-xs text-white/40">{item.tags.length} tags</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor Sheet */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-white/5 backdrop-blur-xl p-0">
          <SheetHeader className="p-6 border-b border-white/10 sticky top-0 bg-white/5 backdrop-blur-xl z-10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl text-white">
                {editingItem ? 'Modifier le projet' : 'Nouveau projet'}
              </SheetTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditorOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingItem ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="p-6 space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="bg-white/5 border border-white/10 mb-6">
                <TabsTrigger value="content" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Contenu
                </TabsTrigger>
                <TabsTrigger value="media" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Média
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Paramètres
                </TabsTrigger>
              </TabsList>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Titre du projet *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Site web Restaurant Le Marin"
                      className="bg-white/5 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Sous-titre / Description courte</Label>
                    <Textarea
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Une brève description du projet..."
                      className="bg-white/5 border-white/10"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Contenu détaillé</Label>
                    <AdvancedBlockEditor
                      blocks={formData.content_blocks}
                      onChange={(blocks) => setFormData({ ...formData, content_blocks: blocks })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-semibold">Image principale</Label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        value={formData.featured_image}
                        onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                        placeholder="URL de l'image"
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <label className="cursor-pointer">
                      <Button variant="outline" disabled={uploadingImage} asChild>
                        <span>
                          {uploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><Image className="w-4 h-4 mr-2" /> Upload</>
                          )}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                  {formData.featured_image && (
                    <div className="relative mt-4">
                      <img
                        src={formData.featured_image}
                        alt="Preview"
                        className="w-full max-h-64 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData({ ...formData, featured_image: '' })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Catégorie *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/5 backdrop-blur-xl">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold">Statut</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/5 backdrop-blur-xl">
                        <SelectItem value="draft">Brouillon</SelectItem>
                        <SelectItem value="published">Publié</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Tags</Label>
                    <Button variant="ghost" size="sm" onClick={handleSuggestTags}>
                      <Sparkles className="w-4 h-4 mr-1" /> Suggérer via IA
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-lg border border-white/10 min-h-12">
                    {formData.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, tags: formData.tags.filter((_, idx) => idx !== i) })
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      placeholder="Ajouter un tag..."
                      className="flex-1 min-w-[120px] h-6 border-none bg-transparent p-0 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          e.preventDefault();
                          if (!formData.tags.includes(e.target.value.trim())) {
                            setFormData({
                              ...formData,
                              tags: [...formData.tags, e.target.value.trim()]
                            });
                          }
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  {availableTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {availableTags
                        .filter((t) => !formData.tags.includes(t.name))
                        .slice(0, 10)
                        .map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-indigo-600 hover:text-white hover:border-indigo-500/50"
                            onClick={() => setFormData({ ...formData, tags: [...formData.tags, tag.name] })}
                          >
                            + {tag.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Nom du client</Label>
                    <Input
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="Ex: Restaurant Le Marin"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Date du projet</Label>
                    <Input
                      type="month"
                      value={formData.project_date}
                      onChange={(e) => setFormData({ ...formData, project_date: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">URL du projet</Label>
                  <Input
                    value={formData.project_url}
                    onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Slug (URL)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="Généré automatiquement depuis le titre"
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/5 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Aperçu du projet</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-6">
              {previewItem.featured_image && (
                <img
                  src={previewItem.featured_image}
                  alt={previewItem.title}
                  className="w-full h-64 object-cover rounded-xl"
                />
              )}
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{previewItem.title}</h2>
                {previewItem.subtitle && (
                  <p className="text-lg text-white/60">{previewItem.subtitle}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {previewItem.tags?.map((tag, i) => (
                  <Badge key={i} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              {previewItem.content_blocks?.length > 0 && (
                <div className="pt-6 border-t border-white/10">
                  <AdvancedBlockRenderer blocks={previewItem.content_blocks} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioManagePage;
