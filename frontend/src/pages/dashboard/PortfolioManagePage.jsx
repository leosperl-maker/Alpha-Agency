import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Image as ImageIcon, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Eye,
  EyeOff,
  Archive,
  MoreVertical,
  Upload,
  X,
  Loader2,
  Check,
  FileText,
  Globe,
  Music,
  Volume2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import api from "../../lib/api";

const PortfolioManagePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    image_url: "",
    gallery: [],
    audio_url: "",  // New field for audio
    link: "",
    tags: "",
    status: "brouillon",
    client: "",
    date: new Date().getFullYear().toString()
  });

  const categories = [
    { value: "site_web", label: "Site Web" },
    { value: "site_ecommerce", label: "Site E-commerce" },
    { value: "reseaux_sociaux", label: "Réseaux Sociaux" },
    { value: "photo", label: "Photographie" },
    { value: "video", label: "Vidéo" },
    { value: "infographie", label: "Infographie" },
    { value: "ads", label: "Publicité digitale" },
    { value: "radio", label: "Radio / Audio" }
  ];

  const statuses = [
    { value: "brouillon", label: "Brouillon", color: "bg-yellow-100 text-yellow-800" },
    { value: "publie", label: "Publié", color: "bg-green-100 text-green-800" },
    { value: "archive", label: "Archivé", color: "bg-gray-100 text-gray-600" }
  ];

  const fetchItems = async () => {
    try {
      const response = await api.get('/portfolio');
      setItems(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Upload image to Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, image_url: url }));
      toast.success("Image téléversée");
    } catch (error) {
      toast.error("Erreur lors du téléversement");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = files.map(file => uploadToCloudinary(file));
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({ 
        ...prev, 
        gallery: [...(prev.gallery || []), ...urls] 
      }));
      toast.success(`${urls.length} image(s) ajoutée(s) à la galerie`);
    } catch (error) {
      toast.error("Erreur lors du téléversement");
    } finally {
      setUploading(false);
    }
  };

  const removeFromGallery = (index) => {
    setFormData(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      if (editingItem) {
        await api.put(`/portfolio/${editingItem.id}`, data);
        toast.success("Réalisation mise à jour");
      } else {
        await api.post('/portfolio', data);
        toast.success("Réalisation créée");
      }
      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    try {
      await api.put(`/portfolio/${item.id}`, { ...item, status: newStatus });
      toast.success(`Statut changé en "${statuses.find(s => s.value === newStatus)?.label}"`);
      fetchItems();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette réalisation ?")) return;
    try {
      await api.delete(`/portfolio/${id}`);
      toast.success("Réalisation supprimée");
      fetchItems();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      description: "",
      image_url: "",
      gallery: [],
      link: "",
      tags: "",
      status: "brouillon",
      client: "",
      date: new Date().getFullYear().toString()
    });
    setEditingItem(null);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || "",
      category: item.category || "",
      description: item.description || "",
      image_url: item.image_url || "",
      gallery: item.gallery || [],
      link: item.link || "",
      tags: item.tags?.join(', ') || "",
      status: item.status || "brouillon",
      client: item.client || "",
      date: item.date || new Date().getFullYear().toString()
    });
    setDialogOpen(true);
  };

  const getCategoryLabel = (value) => {
    const cat = categories.find(c => c.value === value);
    return cat?.label || value;
  };

  const getStatusBadge = (status) => {
    const s = statuses.find(st => st.value === status);
    return s || statuses[0];
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (filterStatus === "all") return true;
    return item.status === filterStatus;
  });

  // Count by status
  const statusCounts = {
    all: items.length,
    brouillon: items.filter(i => i.status === "brouillon").length,
    publie: items.filter(i => i.status === "publie").length,
    archive: items.filter(i => i.status === "archive").length
  };

  return (
    <div data-testid="portfolio-manage-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Réalisations</h1>
          <p className="text-[#666666] text-sm">{items.length} réalisation{items.length > 1 ? 's' : ''} au total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-portfolio-btn"
              onClick={resetForm}
              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle réalisation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-[#E5E5E5] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1A1A1A]">
                {editingItem ? "Modifier la réalisation" : "Nouvelle réalisation"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Titre *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    placeholder="Ex: Restaurant Le Marin"
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Catégorie *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                    required
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Client & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Client</Label>
                  <Input
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    placeholder="Nom du client"
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Année</Label>
                  <Input
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    placeholder="2024"
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  placeholder="Description du projet..."
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  rows={3}
                />
              </div>

              {/* Main Image Upload */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Image principale *</Label>
                <div className="flex gap-4 items-start">
                  {formData.image_url ? (
                    <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-[#E5E5E5]">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, image_url: ""})}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 h-24 border-2 border-dashed border-[#E5E5E5] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#CE0202] transition-colors"
                    >
                      {uploading ? (
                        <Loader2 className="w-6 h-6 text-[#CE0202] animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-[#666666]" />
                          <span className="text-xs text-[#666666] mt-1">Téléverser</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageUpload}
                    className="hidden"
                  />
                  <div className="flex-1">
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      placeholder="Ou entrez l'URL de l'image"
                      className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                    />
                    <p className="text-xs text-[#666666] mt-1">
                      Téléversez une image ou collez une URL
                    </p>
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[#1A1A1A]">Galerie d'images</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploading}
                    className="text-[#CE0202] hover:text-[#B00202]"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    Ajouter
                  </Button>
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
                {formData.gallery?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.gallery.map((url, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#E5E5E5]">
                        <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFromGallery(index)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#666666]">Aucune image dans la galerie</p>
                )}
              </div>

              {/* Link */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Lien vers le projet</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  placeholder="https://..."
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Tags (séparés par des virgules)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="Site Web, Restaurant, Guadeloupe"
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Statut de publication</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E5E5]">
                    <SelectItem value="brouillon">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-yellow-600" />
                        Brouillon
                      </span>
                    </SelectItem>
                    <SelectItem value="publie">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-green-600" />
                        Publié
                      </span>
                    </SelectItem>
                    <SelectItem value="archive">
                      <span className="flex items-center gap-2">
                        <Archive className="w-4 h-4 text-gray-500" />
                        Archivé
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving || !formData.title || !formData.category || !formData.image_url}
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    editingItem ? "Mettre à jour" : "Créer"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
          className={filterStatus === "all" ? "bg-[#1A1A1A] text-white" : ""}
        >
          Tous ({statusCounts.all})
        </Button>
        <Button
          variant={filterStatus === "publie" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("publie")}
          className={filterStatus === "publie" ? "bg-green-600 text-white hover:bg-green-700" : ""}
        >
          <Globe className="w-4 h-4 mr-1" />
          Publiés ({statusCounts.publie})
        </Button>
        <Button
          variant={filterStatus === "brouillon" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("brouillon")}
          className={filterStatus === "brouillon" ? "bg-yellow-600 text-white hover:bg-yellow-700" : ""}
        >
          <FileText className="w-4 h-4 mr-1" />
          Brouillons ({statusCounts.brouillon})
        </Button>
        <Button
          variant={filterStatus === "archive" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("archive")}
          className={filterStatus === "archive" ? "bg-gray-600 text-white hover:bg-gray-700" : ""}
        >
          <Archive className="w-4 h-4 mr-1" />
          Archivés ({statusCounts.archive})
        </Button>
      </div>

      {/* Portfolio Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-12 text-center">
          <ImageIcon className="w-12 h-12 text-[#666666] mx-auto mb-4" />
          <p className="text-[#666666]">
            {filterStatus === "all" 
              ? "Aucune réalisation ajoutée" 
              : `Aucune réalisation ${statuses.find(s => s.value === filterStatus)?.label.toLowerCase()}`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const statusInfo = getStatusBadge(item.status);
            return (
              <div 
                key={item.id}
                data-testid={`portfolio-item-${item.id}`}
                className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden group"
              >
                {/* Image */}
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80';
                    }}
                  />
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className={`${statusInfo.color} border-none text-xs`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  {/* Actions Overlay */}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="bg-white/90 hover:bg-white shadow-sm h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border-[#E5E5E5]">
                        <DropdownMenuItem 
                          onClick={() => openEditDialog(item)}
                          className="cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        {item.link && (
                          <DropdownMenuItem 
                            onClick={() => window.open(item.link, '_blank')}
                            className="cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Voir le projet
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {item.status !== "publie" && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(item, "publie")}
                            className="cursor-pointer text-green-600"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Publier
                          </DropdownMenuItem>
                        )}
                        {item.status !== "brouillon" && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(item, "brouillon")}
                            className="cursor-pointer text-yellow-600"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Mettre en brouillon
                          </DropdownMenuItem>
                        )}
                        {item.status !== "archive" && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(item, "archive")}
                            className="cursor-pointer text-gray-600"
                          >
                            <Archive className="w-4 h-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(item.id)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-[#CE0202]/10 text-[#CE0202] border-none text-xs">
                      {getCategoryLabel(item.category)}
                    </Badge>
                    {item.date && (
                      <span className="text-xs text-[#666666]">{item.date}</span>
                    )}
                  </div>
                  <h3 className="text-[#1A1A1A] font-semibold mb-1">{item.title}</h3>
                  {item.client && (
                    <p className="text-xs text-[#666666] mb-1">Client : {item.client}</p>
                  )}
                  <p className="text-[#666666] text-sm line-clamp-2">{item.description}</p>
                  {item.gallery?.length > 0 && (
                    <p className="text-xs text-[#CE0202] mt-2">
                      {item.gallery.length} image{item.gallery.length > 1 ? 's' : ''} dans la galerie
                    </p>
                  )}
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.slice(0, 3).map((tag, i) => (
                        <span 
                          key={i}
                          className="text-xs px-2 py-0.5 bg-[#F8F8F8] text-[#666666] rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-xs text-[#666666]">+{item.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortfolioManagePage;
