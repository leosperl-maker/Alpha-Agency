import { useState, useEffect } from "react";
import { Plus, Image, Edit, Trash2, ExternalLink } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../../components/ui/dialog";
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
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    image_url: "",
    link: "",
    tags: ""
  });

  const categories = [
    { value: "site_web", label: "Site Web" },
    { value: "site_ecommerce", label: "Site E-commerce" },
    { value: "reseaux_sociaux", label: "Réseaux Sociaux" },
    { value: "photo", label: "Photographie" },
    { value: "video", label: "Vidéo" },
    { value: "infographie", label: "Infographie" },
    { value: "ads", label: "Publicité digitale" }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        toast.success("Réalisation ajoutée");
      }
      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
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
      link: "",
      tags: ""
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
      link: item.link || "",
      tags: item.tags?.join(', ') || ""
    });
    setDialogOpen(true);
  };

  const getCategoryLabel = (value) => {
    const cat = categories.find(c => c.value === value);
    return cat?.label || value;
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
          <DialogContent className="bg-white border-[#E5E5E5] max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#1A1A1A]">
                {editingItem ? "Modifier la réalisation" : "Nouvelle réalisation"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    <SelectValue placeholder="Sélectionner une catégorie" />
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

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">URL de l'image *</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  required
                  placeholder="https://..."
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Lien vers le projet</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  placeholder="https://..."
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Tags (séparés par des virgules)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="Site Web, Restaurant, Guadeloupe"
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#CE0202] hover:bg-[#B00202] text-white">
                  {editingItem ? "Mettre à jour" : "Ajouter"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Portfolio Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-12 text-center">
          <Image className="w-12 h-12 text-[#666666] mx-auto mb-4" />
          <p className="text-[#666666]">Aucune réalisation ajoutée</p>
          <p className="text-[#999999] text-sm mt-2">
            Cliquez sur "Nouvelle réalisation" pour en ajouter une
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
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
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(item)}
                    className="bg-white/20 text-white hover:bg-white/30"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500/30 text-white hover:bg-red-500/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="bg-white/20 text-white hover:bg-white/30"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                <Badge className="bg-[#CE0202]/10 text-[#CE0202] border-none text-xs mb-2">
                  {getCategoryLabel(item.category)}
                </Badge>
                <h3 className="text-[#1A1A1A] font-semibold mb-1">{item.title}</h3>
                <p className="text-[#666666] text-sm line-clamp-2">{item.description}</p>
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.tags.map((tag, i) => (
                      <span 
                        key={i}
                        className="text-xs px-2 py-0.5 bg-[#F8F8F8] text-[#666666] rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioManagePage;
