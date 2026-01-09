import { useState, useEffect } from "react";
import { 
  Tag, Plus, Pencil, Trash2, Loader2, Save, X, 
  Palette, FolderOpen, FileText, CheckCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import { tagsAPI } from "../../lib/api";

// Predefined colors for tags
const TAG_COLORS = [
  { name: "Rouge", value: "#CE0202" },
  { name: "Bleu", value: "#3B82F6" },
  { name: "Vert", value: "#22C55E" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Orange", value: "#F97316" },
  { name: "Rose", value: "#EC4899" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Jaune", value: "#EAB308" },
  { name: "Gris", value: "#6B7280" },
  { name: "Indigo", value: "#6366F1" },
];

const TagsManagePage = () => {
  const [portfolioTags, setPortfolioTags] = useState([]);
  const [blogTags, setBlogTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("portfolio");
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#CE0202",
    type: "portfolio"
  });
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const [portfolioRes, blogRes] = await Promise.all([
        tagsAPI.getAll("portfolio"),
        tagsAPI.getAll("blog")
      ]);
      setPortfolioTags(portfolioRes.data || []);
      setBlogTags(blogRes.data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Erreur lors du chargement des tags");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tag = null, type = "portfolio") => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color || "#CE0202",
        type: tag.type
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: "",
        color: "#CE0202",
        type: type
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom du tag est requis");
      return;
    }

    setSaving(true);
    try {
      if (editingTag) {
        await tagsAPI.update(editingTag.id, formData.name, formData.color);
        toast.success("Tag modifié avec succès");
      } else {
        await tagsAPI.create(formData);
        toast.success("Tag créé avec succès");
      }
      setModalOpen(false);
      fetchTags();
    } catch (error) {
      console.error("Error saving tag:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!tagToDelete) return;
    
    try {
      await tagsAPI.delete(tagToDelete.id);
      toast.success("Tag supprimé");
      setDeleteDialogOpen(false);
      setTagToDelete(null);
      fetchTags();
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const currentTags = activeTab === "portfolio" ? portfolioTags : blogTags;

  return (
    <div data-testid="tags-manage-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#CE0202] flex items-center justify-center">
              <Tag className="w-5 h-5 text-white" />
            </div>
            Gestion des Tags
          </h1>
          <p className="text-[#666666] text-sm mt-1">
            Créez et organisez vos tags pour le portfolio et le blog
          </p>
        </div>
        
        <Button
          onClick={() => handleOpenModal(null, activeTab)}
          className="bg-[#CE0202] hover:bg-[#B00202] text-white"
          data-testid="add-tag-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau tag
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#F5F5F5] p-1">
          <TabsTrigger 
            value="portfolio" 
            className="data-[state=active]:bg-white data-[state=active]:text-[#CE0202]"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Portfolio ({portfolioTags.length})
          </TabsTrigger>
          <TabsTrigger 
            value="blog"
            className="data-[state=active]:bg-white data-[state=active]:text-[#CE0202]"
          >
            <FileText className="w-4 h-4 mr-2" />
            Blog ({blogTags.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-4">
          <TagsGrid 
            tags={portfolioTags} 
            loading={loading}
            onEdit={(tag) => handleOpenModal(tag)}
            onDelete={handleDeleteClick}
            onAdd={() => handleOpenModal(null, "portfolio")}
            type="portfolio"
          />
        </TabsContent>

        <TabsContent value="blog" className="mt-4">
          <TagsGrid 
            tags={blogTags} 
            loading={loading}
            onEdit={(tag) => handleOpenModal(tag)}
            onDelete={handleDeleteClick}
            onAdd={() => handleOpenModal(null, "blog")}
            type="blog"
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#CE0202]" />
              {editingTag ? "Modifier le tag" : "Nouveau tag"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nom du tag</Label>
              <Input
                id="tag-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Design, Marketing, Tech..."
                className="bg-white border-[#E5E5E5]"
                data-testid="tag-name-input"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color.value 
                        ? 'border-[#1A1A1A] scale-110' 
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Type (only for new tags) */}
            {!editingTag && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-white border-[#E5E5E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="portfolio">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Portfolio
                      </div>
                    </SelectItem>
                    <SelectItem value="blog">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Blog
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label>Aperçu</Label>
              <div className="flex items-center gap-2 p-3 bg-[#F8F8F8] rounded-lg">
                <Badge 
                  style={{ backgroundColor: formData.color }}
                  className="text-white border-0"
                >
                  {formData.name || "Nom du tag"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
              data-testid="save-tag-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingTag ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tag ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le tag "{tagToDelete?.name}" sera supprimé définitivement. 
              Les articles et réalisations utilisant ce tag ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Tags Grid Component
const TagsGrid = ({ tags, loading, onEdit, onDelete, onAdd, type }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#CE0202]" />
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <Card className="bg-white border-[#E5E5E5]">
        <CardContent className="py-16 text-center">
          <Tag className="w-16 h-16 mx-auto mb-4 text-[#E5E5E5]" />
          <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">
            Aucun tag {type === "portfolio" ? "portfolio" : "blog"}
          </h3>
          <p className="text-[#666666] mb-6 max-w-md mx-auto">
            Créez des tags pour organiser vos {type === "portfolio" ? "réalisations" : "articles"} et faciliter la navigation.
          </p>
          <Button
            onClick={onAdd}
            className="bg-[#CE0202] hover:bg-[#B00202] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer le premier tag
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-[#E5E5E5]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {type === "portfolio" ? (
            <FolderOpen className="w-5 h-5 text-[#CE0202]" />
          ) : (
            <FileText className="w-5 h-5 text-[#CE0202]" />
          )}
          Tags {type === "portfolio" ? "Portfolio" : "Blog"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 bg-[#F8F8F8] rounded-lg border border-[#E5E5E5] hover:border-[#CE0202]/30 transition-colors group"
              data-testid={`tag-item-${tag.id}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color || "#CE0202" }}
                />
                <span className="font-medium text-[#1A1A1A] truncate">
                  {tag.name}
                </span>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-[#E5E5E5]"
                  onClick={() => onEdit(tag)}
                  data-testid={`edit-tag-${tag.id}`}
                >
                  <Pencil className="w-4 h-4 text-[#666666]" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-100"
                  onClick={() => onDelete(tag)}
                  data-testid={`delete-tag-${tag.id}`}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TagsManagePage;
