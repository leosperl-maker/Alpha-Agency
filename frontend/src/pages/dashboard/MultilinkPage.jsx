import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, ExternalLink, Link2, BarChart3,
  GripVertical, Copy, Check, Loader2, Image, Settings, X,
  Instagram, Facebook, Twitter, Youtube, Linkedin, 
  MessageCircle, Send, Mail, Globe, ShoppingBag, Calendar,
  Phone, MapPin, Link, Download, Play, Music, Mic, BookOpen,
  ChevronDown, Palette, TrendingUp
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import api from '../../lib/api';

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

const ICON_OPTIONS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'telegram', label: 'Telegram', icon: Send },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'website', label: 'Site Web', icon: Globe },
  { value: 'shop', label: 'Boutique', icon: ShoppingBag },
  { value: 'calendar', label: 'Calendrier', icon: Calendar },
  { value: 'phone', label: 'Téléphone', icon: Phone },
  { value: 'location', label: 'Adresse', icon: MapPin },
  { value: 'link', label: 'Lien', icon: Link },
  { value: 'download', label: 'Télécharger', icon: Download },
  { value: 'play', label: 'Vidéo', icon: Play },
  { value: 'music', label: 'Musique', icon: Music },
  { value: 'podcast', label: 'Podcast', icon: Mic },
  { value: 'blog', label: 'Blog', icon: BookOpen },
];

const THEME_PRESETS = [
  { id: 'minimal', name: 'Minimal', preview: 'bg-white' },
  { id: 'dark', name: 'Dark', preview: 'bg-[#0f0f1a]' },
  { id: 'gradient', name: 'Gradient', preview: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
  { id: 'ocean', name: 'Ocean', preview: 'bg-gradient-to-br from-blue-500 to-cyan-400' },
  { id: 'sunset', name: 'Sunset', preview: 'bg-gradient-to-br from-pink-500 to-purple-700' },
  { id: 'nature', name: 'Nature', preview: 'bg-green-50' },
  { id: 'custom', name: 'Custom', preview: 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200' },
];

// Sortable Link Item Component
const SortableLinkItem = ({ link, onEdit, onDelete, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const IconComponent = ICON_OPTIONS.find(i => i.value === link.icon)?.icon || Link;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 ${isDragging ? 'z-50' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/60">
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <IconComponent className="w-4 h-4 text-white/60" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{link.label}</p>
        <p className="text-white/40 text-xs truncate">{link.url}</p>
      </div>
      
      <Switch
        checked={link.is_active}
        onCheckedChange={() => onToggle(link)}
        className="data-[state=checked]:bg-green-500"
      />
      
      <Button variant="ghost" size="icon" onClick={() => onEdit(link)} className="text-white/60 hover:text-white hover:bg-white/10">
        <Edit2 className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={() => onDelete(link)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

const MultilinkPage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageLinks, setPageLinks] = useState([]);
  const [pageStats, setPageStats] = useState(null);
  
  // Dialogs
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  
  // Forms
  const [pageForm, setPageForm] = useState({
    slug: '',
    title: '',
    bio: '',
    profile_image: '',
    theme: 'minimal',
    custom_colors: {
      background: '#ffffff',
      text: '#1a1a1a',
      button_bg: '#f3f4f6',
      button_text: '#1a1a1a',
      button_hover: '#e5e7eb',
      accent: '#6366f1'
    },
    is_active: true
  });
  
  const [linkForm, setLinkForm] = useState({
    label: '',
    url: '',
    icon: 'link',
    icon_type: 'social',
    is_active: true
  });
  
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPages = useCallback(async () => {
    try {
      const response = await api.get('/multilink/pages');
      setPages(response.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const fetchPageDetails = async (page) => {
    try {
      const response = await api.get(`/multilink/pages/${page.id}`);
      setSelectedPage(response.data);
      setPageLinks(response.data.links || []);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const fetchPageStats = async (page) => {
    try {
      const response = await api.get(`/multilink/pages/${page.id}/stats?days=30`);
      setPageStats(response.data);
      setStatsDialogOpen(true);
    } catch (error) {
      toast.error('Erreur de chargement des stats');
    }
  };

  const openPageDialog = (page = null) => {
    if (page) {
      setEditingPage(page);
      setPageForm({
        slug: page.slug,
        title: page.title,
        bio: page.bio || '',
        profile_image: page.profile_image || '',
        theme: page.theme || 'minimal',
        custom_colors: page.custom_colors || {
          background: '#ffffff',
          text: '#1a1a1a',
          button_bg: '#f3f4f6',
          button_text: '#1a1a1a',
          button_hover: '#e5e7eb',
          accent: '#6366f1'
        },
        is_active: page.is_active
      });
    } else {
      setEditingPage(null);
      setPageForm({
        slug: '',
        title: '',
        bio: '',
        profile_image: '',
        theme: 'minimal',
        custom_colors: {
          background: '#ffffff',
          text: '#1a1a1a',
          button_bg: '#f3f4f6',
          button_text: '#1a1a1a',
          button_hover: '#e5e7eb',
          accent: '#6366f1'
        },
        is_active: true
      });
    }
    setPageDialogOpen(true);
  };

  const savePage = async () => {
    if (!pageForm.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    
    setSaving(true);
    try {
      if (editingPage) {
        await api.put(`/multilink/pages/${editingPage.id}`, pageForm);
        toast.success('Page mise à jour');
      } else {
        await api.post('/multilink/pages', pageForm);
        toast.success('Page créée');
      }
      setPageDialogOpen(false);
      fetchPages();
      if (selectedPage) {
        fetchPageDetails(selectedPage);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (page) => {
    if (!window.confirm(`Supprimer la page "${page.title}" ?`)) return;
    
    try {
      await api.delete(`/multilink/pages/${page.id}`);
      toast.success('Page supprimée');
      if (selectedPage?.id === page.id) {
        setSelectedPage(null);
        setPageLinks([]);
      }
      fetchPages();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const openLinkDialog = (link = null) => {
    if (link) {
      setEditingLink(link);
      setLinkForm({
        label: link.label,
        url: link.url,
        icon: link.icon || 'link',
        icon_type: link.icon_type || 'social',
        is_active: link.is_active
      });
    } else {
      setEditingLink(null);
      setLinkForm({
        label: '',
        url: '',
        icon: 'link',
        icon_type: 'social',
        is_active: true
      });
    }
    setLinkDialogOpen(true);
  };

  const saveLink = async () => {
    if (!linkForm.label.trim() || !linkForm.url.trim()) {
      toast.error('Le label et l\'URL sont requis');
      return;
    }
    
    // Add https if missing
    let url = linkForm.url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
      url = 'https://' + url;
    }
    
    setSaving(true);
    try {
      if (editingLink) {
        await api.put(`/multilink/pages/${selectedPage.id}/links/${editingLink.id}`, { ...linkForm, url });
        toast.success('Lien mis à jour');
      } else {
        await api.post(`/multilink/pages/${selectedPage.id}/links`, { ...linkForm, url });
        toast.success('Lien ajouté');
      }
      setLinkDialogOpen(false);
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (link) => {
    if (!window.confirm('Supprimer ce lien ?')) return;
    
    try {
      await api.delete(`/multilink/pages/${selectedPage.id}/links/${link.id}`);
      toast.success('Lien supprimé');
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const toggleLink = async (link) => {
    try {
      await api.put(`/multilink/pages/${selectedPage.id}/links/${link.id}`, { is_active: !link.is_active });
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = pageLinks.findIndex(l => l.id === active.id);
      const newIndex = pageLinks.findIndex(l => l.id === over.id);
      
      const newLinks = arrayMove(pageLinks, oldIndex, newIndex);
      setPageLinks(newLinks);
      
      // Save order
      try {
        await api.put(`/multilink/pages/${selectedPage.id}/links/reorder`, {
          link_ids: newLinks.map(l => l.id)
        });
      } catch (error) {
        toast.error('Erreur de réorganisation');
        fetchPageDetails(selectedPage);
      }
    }
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/multilink/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPageForm({ ...pageForm, profile_image: response.data.url });
      toast.success('Image uploadée');
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setUploadingImage(false);
    }
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`https://alphagency.fr/lien-bio/${slug}`);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Link2 className="w-7 h-7 text-indigo-400" />
            Multilink
          </h1>
          <p className="text-white/60 mt-1">Créez des pages de liens type Linktree</p>
        </div>
        <Button onClick={() => openPageDialog()} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle page
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pages List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider">Mes pages</h2>
          
          {pages.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-8 text-center">
              <Link2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/60">Aucune page créée</p>
              <Button onClick={() => openPageDialog()} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" /> Créer ma première page
              </Button>
            </div>
          ) : (
            pages.map(page => (
              <div
                key={page.id}
                onClick={() => fetchPageDetails(page)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedPage?.id === page.id 
                    ? 'bg-indigo-600/20 border-2 border-indigo-500' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {page.profile_image ? (
                    <img src={page.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{page.title}</p>
                    <p className="text-white/40 text-xs">/{page.slug}</p>
                  </div>
                  {!page.is_active && (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">Inactif</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Link className="w-3 h-3" /> {page.link_count} liens
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {page.total_views} vues
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {page.total_clicks} clics
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Page Editor */}
        <div className="lg:col-span-2">
          {selectedPage ? (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              {/* Page Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedPage.profile_image && (
                    <img src={selectedPage.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div>
                    <h2 className="text-white font-bold">{selectedPage.title}</h2>
                    <p className="text-white/40 text-xs">alphagency.fr/lien-bio/{selectedPage.slug}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(selectedPage.slug)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchPageStats(selectedPage)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/lien-bio/${selectedPage.slug}`, '_blank')}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openPageDialog(selectedPage)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePage(selectedPage)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Links Section */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">Liens ({pageLinks.length})</h3>
                  <Button onClick={() => openLinkDialog()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>

                {pageLinks.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun lien</p>
                    <Button onClick={() => openLinkDialog()} size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter un lien
                    </Button>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={pageLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {pageLinks.map(link => (
                          <SortableLinkItem
                            key={link.id}
                            link={link}
                            onEdit={openLinkDialog}
                            onDelete={deleteLink}
                            onToggle={toggleLink}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center">
              <Link2 className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-lg">Sélectionnez une page</p>
              <p className="text-white/30 text-sm mt-1">ou créez-en une nouvelle</p>
            </div>
          )}
        </div>
      </div>

      {/* Page Dialog */}
      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Link2 className="w-5 h-5 text-indigo-400" />
              {editingPage ? 'Modifier la page' : 'Nouvelle page'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="bg-white/5 w-full">
              <TabsTrigger value="general" className="flex-1 data-[state=active]:bg-indigo-600">Général</TabsTrigger>
              <TabsTrigger value="theme" className="flex-1 data-[state=active]:bg-indigo-600">Thème</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Titre *</Label>
                  <Input
                    value={pageForm.title}
                    onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                    placeholder="Mon Linktree"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Slug (URL)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-sm">/lien-bio/</span>
                    <Input
                      value={pageForm.slug}
                      onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      placeholder="auto-généré"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Bio / Description</Label>
                <Textarea
                  value={pageForm.bio}
                  onChange={(e) => setPageForm({ ...pageForm, bio: e.target.value })}
                  placeholder="Une courte description..."
                  className="bg-white/5 border-white/10 text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Image de profil</Label>
                <div className="flex items-center gap-4">
                  {pageForm.profile_image ? (
                    <div className="relative">
                      <img src={pageForm.profile_image} alt="" className="w-20 h-20 rounded-full object-cover" />
                      <button
                        onClick={() => setPageForm({ ...pageForm, profile_image: '' })}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                      <Image className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={uploadImage} className="hidden" />
                    <div className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Changer'}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Page active</p>
                  <p className="text-white/40 text-xs">La page sera visible publiquement</p>
                </div>
                <Switch
                  checked={pageForm.is_active}
                  onCheckedChange={(checked) => setPageForm({ ...pageForm, is_active: checked })}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </TabsContent>

            <TabsContent value="theme" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label className="text-white">Thème prédéfini</Label>
                <div className="grid grid-cols-4 gap-3">
                  {THEME_PRESETS.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setPageForm({ ...pageForm, theme: theme.id })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        pageForm.theme === theme.id 
                          ? 'border-indigo-500' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className={`w-full h-12 rounded-lg ${theme.preview}`} />
                      <p className="text-white text-xs mt-2">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {pageForm.theme === 'custom' && (
                <div className="space-y-4 p-4 bg-white/5 rounded-xl">
                  <h4 className="text-white font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" /> Couleurs personnalisées
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: 'background', label: 'Fond' },
                      { key: 'text', label: 'Texte' },
                      { key: 'button_bg', label: 'Bouton' },
                      { key: 'button_text', label: 'Texte bouton' },
                      { key: 'button_hover', label: 'Bouton hover' },
                      { key: 'accent', label: 'Accent' },
                    ].map(color => (
                      <div key={color.key} className="space-y-1">
                        <Label className="text-white/60 text-xs">{color.label}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={pageForm.custom_colors[color.key] || '#ffffff'}
                            onChange={(e) => setPageForm({
                              ...pageForm,
                              custom_colors: { ...pageForm.custom_colors, [color.key]: e.target.value }
                            })}
                            className="w-8 h-8 rounded cursor-pointer"
                          />
                          <Input
                            value={pageForm.custom_colors[color.key] || ''}
                            onChange={(e) => setPageForm({
                              ...pageForm,
                              custom_colors: { ...pageForm.custom_colors, [color.key]: e.target.value }
                            })}
                            className="bg-white/5 border-white/10 text-white text-xs h-8"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPageDialogOpen(false)} className="border-white/10 text-white">
              Annuler
            </Button>
            <Button onClick={savePage} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingPage ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Link className="w-5 h-5 text-indigo-400" />
              {editingLink ? 'Modifier le lien' : 'Ajouter un lien'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-white">Label *</Label>
              <Input
                value={linkForm.label}
                onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                placeholder="Mon site web"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">URL *</Label>
              <Input
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="https://example.com"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Icône</Label>
              <Select value={linkForm.icon} onValueChange={(value) => setLinkForm({ ...linkForm, icon: value })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 max-h-60">
                  {ICON_OPTIONS.map(option => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value} className="text-white">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Lien actif</p>
                <p className="text-white/40 text-xs">Le lien sera visible</p>
              </div>
              <Switch
                checked={linkForm.is_active}
                onCheckedChange={(checked) => setLinkForm({ ...linkForm, is_active: checked })}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)} className="border-white/10 text-white">
              Annuler
            </Button>
            <Button onClick={saveLink} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingLink ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Statistiques - {selectedPage?.title}
            </DialogTitle>
          </DialogHeader>

          {pageStats && (
            <div className="space-y-6 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                  <Eye className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pageStats.total_views}</p>
                  <p className="text-white/60 text-sm">Vues totales</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pageStats.total_clicks}</p>
                  <p className="text-white/60 text-sm">Clics totaux</p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pageStats.ctr}%</p>
                  <p className="text-white/60 text-sm">Taux de clic</p>
                </div>
              </div>

              {/* Link Stats */}
              {pageStats.link_stats?.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">Performance des liens</h3>
                  <div className="space-y-2">
                    {pageStats.link_stats.map((link, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <span className="text-white/40 text-sm w-6">{index + 1}.</span>
                        <span className="flex-1 text-white truncate">{link.label}</span>
                        <Badge className="bg-indigo-500/20 text-indigo-400">{link.clicks} clics</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-white/40 text-xs text-center">
                Données des {pageStats.period_days} derniers jours
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatsDialogOpen(false)} className="border-white/10 text-white">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultilinkPage;
