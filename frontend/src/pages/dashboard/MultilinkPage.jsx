import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, ExternalLink, Link2, BarChart3,
  GripVertical, Copy, Check, Loader2, Image, Settings, X,
  Instagram, Facebook, Twitter, Youtube, Linkedin, 
  MessageCircle, Send, Mail, Globe, ShoppingBag, Calendar,
  Phone, MapPin, Link, Download, Play, Music, Mic, BookOpen,
  ChevronDown, Palette, TrendingUp, Search, Layout, Type,
  Share2, Verified, ImagePlus
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
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter, color: '#000000' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { value: 'telegram', label: 'Telegram', icon: Send, color: '#0088cc' },
  { value: 'email', label: 'Email', icon: Mail, color: '#EA4335' },
  { value: 'website', label: 'Site Web', icon: Globe, color: '#6366f1' },
  { value: 'shop', label: 'Boutique', icon: ShoppingBag, color: '#F59E0B' },
  { value: 'calendar', label: 'Calendrier', icon: Calendar, color: '#10B981' },
  { value: 'phone', label: 'Téléphone', icon: Phone, color: '#3B82F6' },
  { value: 'location', label: 'Adresse', icon: MapPin, color: '#EF4444' },
  { value: 'link', label: 'Lien', icon: Link, color: '#8B5CF6' },
  { value: 'download', label: 'Télécharger', icon: Download, color: '#14B8A6' },
  { value: 'play', label: 'Vidéo', icon: Play, color: '#EC4899' },
  { value: 'music', label: 'Musique', icon: Music, color: '#1DB954' },
  { value: 'podcast', label: 'Podcast', icon: Mic, color: '#7C3AED' },
  { value: 'blog', label: 'Blog', icon: BookOpen, color: '#F97316' },
];

const THEME_PRESETS = [
  { id: 'minimal', name: 'Minimal', bg: '#ffffff', text: '#1a1a1a' },
  { id: 'dark', name: 'Dark', bg: '#0f0f1a', text: '#ffffff' },
  { id: 'gradient', name: 'Gradient', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },
  { id: 'ocean', name: 'Ocean', bg: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 100%)', text: '#ffffff' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(135deg, #f72585 0%, #7209b7 100%)', text: '#ffffff' },
  { id: 'nature', name: 'Nature', bg: '#f0fdf4', text: '#166534' },
  { id: 'custom', name: 'Personnalisé', bg: '#1a1a2e', text: '#ffffff' },
];

const BUTTON_STYLES = [
  { id: 'rounded', name: 'Arrondi', preview: 'rounded-xl' },
  { id: 'pill', name: 'Pilule', preview: 'rounded-full' },
  { id: 'square', name: 'Carré', preview: 'rounded-none' },
  { id: 'soft', name: 'Doux', preview: 'rounded-2xl' },
  { id: 'outline', name: 'Contour', preview: 'rounded-xl border-2' },
];

// Sortable Link Item
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
      className={`flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 ${isDragging ? 'z-50' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/60">
        <GripVertical className="w-5 h-5" />
      </button>
      
      {link.thumbnail ? (
        <img src={link.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-white/60" />
        </div>
      )}
      
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

// Social Link Item
const SocialLinkItem = ({ social, onEdit, onDelete, onToggle, stats }) => {
  const IconComponent = ICON_OPTIONS.find(i => i.value === social.icon)?.icon || Globe;
  const iconColor = ICON_OPTIONS.find(i => i.value === social.icon)?.color || '#6366f1';
  
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: iconColor }}
      >
        <IconComponent className="w-5 h-5 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{social.label || social.icon}</p>
        <p className="text-white/40 text-xs truncate">{social.url}</p>
      </div>
      
      {stats > 0 && (
        <Badge className="bg-indigo-500/20 text-indigo-400">{stats} clics</Badge>
      )}
      
      <Switch
        checked={social.is_active}
        onCheckedChange={() => onToggle(social)}
        className="data-[state=checked]:bg-green-500"
      />
      
      <Button variant="ghost" size="icon" onClick={() => onEdit(social)} className="text-white/60 hover:text-white hover:bg-white/10">
        <Edit2 className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={() => onDelete(social)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
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
  const [activeTab, setActiveTab] = useState('content');
  
  // Dialogs
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [editingSocial, setEditingSocial] = useState(null);
  
  // Page Form
  const [pageForm, setPageForm] = useState({
    slug: '',
    title: '',
    bio: '',
    profile_image: '',
    banner_image: '',
    theme: 'dark',
    custom_colors: {
      background: '#0f0f1a',
      text: '#ffffff',
      button_bg: 'rgba(255,255,255,0.1)',
      button_text: '#ffffff',
      button_hover: 'rgba(255,255,255,0.2)',
      accent: '#6366f1'
    },
    design_settings: {
      button_style: 'rounded',
      background_type: 'solid',
      gradient: '',
      background_image: ''
    },
    seo_settings: {
      title: '',
      description: '',
      keywords: '',
      og_image: '',
      indexable: true
    },
    social_links: [],
    verified: false,
    is_active: true
  });
  
  // Link Form
  const [linkForm, setLinkForm] = useState({
    label: '',
    url: '',
    description: '',
    thumbnail: '',
    icon: 'link',
    icon_type: 'social',
    is_active: true
  });
  
  // Social Form
  const [socialForm, setSocialForm] = useState({
    icon: 'instagram',
    url: '',
    label: '',
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
      // Also update pageForm for editing
      setPageForm({
        ...pageForm,
        ...response.data,
        custom_colors: response.data.custom_colors || response.data.theme_colors || pageForm.custom_colors,
        design_settings: response.data.design_settings || pageForm.design_settings,
        seo_settings: response.data.seo_settings || pageForm.seo_settings,
        social_links: response.data.social_links || []
      });
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
        slug: page.slug || '',
        title: page.title || '',
        bio: page.bio || '',
        profile_image: page.profile_image || '',
        banner_image: page.banner_image || '',
        theme: page.theme || 'dark',
        custom_colors: page.custom_colors || page.theme_colors || {
          background: '#0f0f1a',
          text: '#ffffff',
          button_bg: 'rgba(255,255,255,0.1)',
          button_text: '#ffffff',
          button_hover: 'rgba(255,255,255,0.2)',
          accent: '#6366f1'
        },
        design_settings: page.design_settings || {
          button_style: 'rounded',
          background_type: 'solid',
          gradient: '',
          background_image: ''
        },
        seo_settings: page.seo_settings || {
          title: page.title || '',
          description: page.bio || '',
          keywords: '',
          og_image: page.profile_image || '',
          indexable: true
        },
        social_links: page.social_links || [],
        verified: page.verified || false,
        is_active: page.is_active !== false
      });
    } else {
      setEditingPage(null);
      setPageForm({
        slug: '',
        title: '',
        bio: '',
        profile_image: '',
        banner_image: '',
        theme: 'dark',
        custom_colors: {
          background: '#0f0f1a',
          text: '#ffffff',
          button_bg: 'rgba(255,255,255,0.1)',
          button_text: '#ffffff',
          button_hover: 'rgba(255,255,255,0.2)',
          accent: '#6366f1'
        },
        design_settings: {
          button_style: 'rounded',
          background_type: 'solid',
          gradient: '',
          background_image: ''
        },
        seo_settings: {
          title: '',
          description: '',
          keywords: '',
          og_image: '',
          indexable: true
        },
        social_links: [],
        verified: false,
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

  const savePageSettings = async () => {
    if (!selectedPage) return;
    
    setSaving(true);
    try {
      await api.put(`/multilink/pages/${selectedPage.id}`, pageForm);
      toast.success('Modifications enregistrées');
      fetchPageDetails(selectedPage);
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
        description: link.description || '',
        thumbnail: link.thumbnail || '',
        icon: link.icon || 'link',
        icon_type: link.icon_type || 'social',
        is_active: link.is_active
      });
    } else {
      setEditingLink(null);
      setLinkForm({
        label: '',
        url: '',
        description: '',
        thumbnail: '',
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

  const openSocialDialog = (social = null) => {
    if (social) {
      setEditingSocial(social);
      setSocialForm({
        icon: social.icon || 'instagram',
        url: social.url || '',
        label: social.label || '',
        is_active: social.is_active !== false
      });
    } else {
      setEditingSocial(null);
      setSocialForm({
        icon: 'instagram',
        url: '',
        label: '',
        is_active: true
      });
    }
    setSocialDialogOpen(true);
  };

  const saveSocial = async () => {
    if (!socialForm.url.trim()) {
      toast.error('L\'URL est requise');
      return;
    }
    
    let url = socialForm.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const newSocialLinks = [...(pageForm.social_links || [])];
    const socialData = { 
      ...socialForm, 
      url, 
      id: editingSocial?.id || `social_${Date.now()}`,
      label: socialForm.label || ICON_OPTIONS.find(i => i.value === socialForm.icon)?.label || socialForm.icon
    };
    
    if (editingSocial) {
      const index = newSocialLinks.findIndex(s => s.id === editingSocial.id);
      if (index >= 0) {
        newSocialLinks[index] = socialData;
      }
    } else {
      newSocialLinks.push(socialData);
    }
    
    setPageForm({ ...pageForm, social_links: newSocialLinks });
    setSocialDialogOpen(false);
    
    // Auto-save if page is selected
    if (selectedPage) {
      try {
        await api.put(`/multilink/pages/${selectedPage.id}`, { social_links: newSocialLinks });
        toast.success('Réseau social ajouté');
        fetchPageDetails(selectedPage);
      } catch (error) {
        toast.error('Erreur');
      }
    }
  };

  const deleteSocial = async (social) => {
    if (!window.confirm('Supprimer ce réseau social ?')) return;
    
    const newSocialLinks = (pageForm.social_links || []).filter(s => s.id !== social.id);
    setPageForm({ ...pageForm, social_links: newSocialLinks });
    
    if (selectedPage) {
      try {
        await api.put(`/multilink/pages/${selectedPage.id}`, { social_links: newSocialLinks });
        toast.success('Réseau social supprimé');
        fetchPageDetails(selectedPage);
      } catch (error) {
        toast.error('Erreur');
      }
    }
  };

  const toggleSocial = async (social) => {
    const newSocialLinks = (pageForm.social_links || []).map(s => 
      s.id === social.id ? { ...s, is_active: !s.is_active } : s
    );
    setPageForm({ ...pageForm, social_links: newSocialLinks });
    
    if (selectedPage) {
      try {
        await api.put(`/multilink/pages/${selectedPage.id}`, { social_links: newSocialLinks });
        fetchPageDetails(selectedPage);
      } catch (error) {
        toast.error('Erreur');
      }
    }
  };

  const uploadImage = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/multilink/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPageForm({ ...pageForm, [field]: response.data.url });
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
          <p className="text-white/60 mt-1">Créez des pages de liens professionnelles</p>
        </div>
        <Button onClick={() => openPageDialog()} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle page
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pages List */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider">Mes pages</h2>
          
          {pages.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-8 text-center border border-white/10">
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
                    <p className="text-white font-medium truncate flex items-center gap-1">
                      {page.title}
                      {page.verified && <Verified className="w-4 h-4 text-blue-400" />}
                    </p>
                    <p className="text-white/40 text-xs">/{page.slug}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {page.total_views}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {page.total_clicks}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Page Editor */}
        <div className="lg:col-span-9">
          {selectedPage ? (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              {/* Page Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  {selectedPage.profile_image && (
                    <img src={selectedPage.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <div>
                    <h2 className="text-white font-bold flex items-center gap-2">
                      {selectedPage.title}
                      {selectedPage.verified && <Verified className="w-4 h-4 text-blue-400" />}
                    </h2>
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
                    onClick={() => deletePage(selectedPage)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tabs like Zaap */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full bg-white/5 border-b border-white/10 rounded-none h-auto p-0">
                  <TabsTrigger value="content" className="flex-1 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-white">
                    <Layout className="w-4 h-4 mr-2" /> Contenu
                  </TabsTrigger>
                  <TabsTrigger value="design" className="flex-1 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-white">
                    <Palette className="w-4 h-4 mr-2" /> Design
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="flex-1 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-white">
                    <Type className="w-4 h-4 mr-2" /> Profil
                  </TabsTrigger>
                  <TabsTrigger value="socials" className="flex-1 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-white">
                    <Share2 className="w-4 h-4 mr-2" /> Réseaux
                  </TabsTrigger>
                  <TabsTrigger value="seo" className="flex-1 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-white">
                    <Search className="w-4 h-4 mr-2" /> SEO
                  </TabsTrigger>
                </TabsList>

                {/* CONTENT TAB */}
                <TabsContent value="content" className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">Liens ({pageLinks.length})</h3>
                    <Button onClick={() => openLinkDialog()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter un lien
                    </Button>
                  </div>

                  {pageLinks.length === 0 ? (
                    <div className="text-center py-12 text-white/40 bg-white/5 rounded-xl">
                      <Link className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>Aucun lien ajouté</p>
                      <Button onClick={() => openLinkDialog()} size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700">
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
                </TabsContent>

                {/* DESIGN TAB */}
                <TabsContent value="design" className="p-4 space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <Label className="text-white mb-3 block">Thème</Label>
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
                          <div 
                            className="w-full h-16 rounded-lg mb-2"
                            style={{ background: theme.bg }}
                          />
                          <p className="text-white text-xs">{theme.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Style */}
                  <div>
                    <Label className="text-white mb-3 block">Style des boutons</Label>
                    <div className="grid grid-cols-5 gap-3">
                      {BUTTON_STYLES.map(style => (
                        <button
                          key={style.id}
                          onClick={() => setPageForm({ 
                            ...pageForm, 
                            design_settings: { ...pageForm.design_settings, button_style: style.id }
                          })}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            pageForm.design_settings?.button_style === style.id 
                              ? 'border-indigo-500' 
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className={`w-full h-8 bg-white/20 ${style.preview}`} />
                          <p className="text-white text-xs mt-2">{style.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors (only for custom theme) */}
                  {pageForm.theme === 'custom' && (
                    <div className="bg-white/5 rounded-xl p-4 space-y-4">
                      <h4 className="text-white font-medium flex items-center gap-2">
                        <Palette className="w-4 h-4" /> Couleurs personnalisées
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { key: 'background', label: 'Fond' },
                          { key: 'text', label: 'Texte' },
                          { key: 'button_bg', label: 'Bouton' },
                          { key: 'button_text', label: 'Texte bouton' },
                          { key: 'accent', label: 'Accent' },
                        ].map(color => (
                          <div key={color.key}>
                            <Label className="text-white/60 text-xs">{color.label}</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="color"
                                value={pageForm.custom_colors?.[color.key] || '#ffffff'}
                                onChange={(e) => setPageForm({
                                  ...pageForm,
                                  custom_colors: { ...pageForm.custom_colors, [color.key]: e.target.value }
                                })}
                                className="w-10 h-10 rounded cursor-pointer border-0"
                              />
                              <Input
                                value={pageForm.custom_colors?.[color.key] || ''}
                                onChange={(e) => setPageForm({
                                  ...pageForm,
                                  custom_colors: { ...pageForm.custom_colors, [color.key]: e.target.value }
                                })}
                                className="bg-white/5 border-white/10 text-white text-xs h-10 flex-1"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <Button onClick={savePageSettings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer le design
                  </Button>
                </TabsContent>

                {/* PROFILE TAB */}
                <TabsContent value="profile" className="p-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Titre</Label>
                      <Input
                        value={pageForm.title}
                        onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
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
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Bio</Label>
                    <Textarea
                      value={pageForm.bio}
                      onChange={(e) => setPageForm({ ...pageForm, bio: e.target.value })}
                      placeholder="Décrivez-vous en quelques mots..."
                      className="bg-white/5 border-white/10 text-white min-h-[100px]"
                    />
                  </div>

                  {/* Profile Image */}
                  <div className="space-y-2">
                    <Label className="text-white">Photo de profil</Label>
                    <div className="flex items-center gap-4">
                      {pageForm.profile_image ? (
                        <div className="relative">
                          <img src={pageForm.profile_image} alt="" className="w-24 h-24 rounded-full object-cover" />
                          <button
                            onClick={() => setPageForm({ ...pageForm, profile_image: '' })}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
                          <Image className="w-10 h-10 text-white/30" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={(e) => uploadImage(e, 'profile_image')} className="hidden" />
                        <div className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm transition-colors">
                          {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Choisir une image'}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Banner Image */}
                  <div className="space-y-2">
                    <Label className="text-white">Image bannière (optionnel)</Label>
                    <div className="flex items-center gap-4">
                      {pageForm.banner_image ? (
                        <div className="relative">
                          <img src={pageForm.banner_image} alt="" className="w-40 h-24 rounded-lg object-cover" />
                          <button
                            onClick={() => setPageForm({ ...pageForm, banner_image: '' })}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-40 h-24 rounded-lg bg-white/10 flex items-center justify-center border-2 border-dashed border-white/20">
                          <ImagePlus className="w-8 h-8 text-white/30" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={(e) => uploadImage(e, 'banner_image')} className="hidden" />
                        <div className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
                          Ajouter une bannière
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Page Status */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
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

                  <Button onClick={savePageSettings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer le profil
                  </Button>
                </TabsContent>

                {/* SOCIALS TAB */}
                <TabsContent value="socials" className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Réseaux sociaux</h3>
                      <p className="text-white/40 text-xs">Icônes affichées en haut de votre page</p>
                    </div>
                    <Button onClick={() => openSocialDialog()} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                  </div>

                  {(pageForm.social_links || []).length === 0 ? (
                    <div className="text-center py-12 text-white/40 bg-white/5 rounded-xl">
                      <Share2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>Aucun réseau social ajouté</p>
                      <p className="text-xs mt-1">Les icônes s&apos;afficheront en haut de votre page</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(pageForm.social_links || []).map(social => (
                        <SocialLinkItem
                          key={social.id}
                          social={social}
                          onEdit={openSocialDialog}
                          onDelete={deleteSocial}
                          onToggle={toggleSocial}
                          stats={0}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* SEO TAB */}
                <TabsContent value="seo" className="p-4 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-white">Titre SEO</Label>
                    <Input
                      value={pageForm.seo_settings?.title || ''}
                      onChange={(e) => setPageForm({ 
                        ...pageForm, 
                        seo_settings: { ...pageForm.seo_settings, title: e.target.value }
                      })}
                      placeholder={pageForm.title}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <p className="text-white/40 text-xs">Titre affiché dans les résultats Google</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Description SEO</Label>
                    <Textarea
                      value={pageForm.seo_settings?.description || ''}
                      onChange={(e) => setPageForm({ 
                        ...pageForm, 
                        seo_settings: { ...pageForm.seo_settings, description: e.target.value }
                      })}
                      placeholder={pageForm.bio}
                      className="bg-white/5 border-white/10 text-white min-h-[100px]"
                    />
                    <p className="text-white/40 text-xs">Description affichée dans les résultats Google</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <p className="text-white font-medium">Indexation Google</p>
                      <p className="text-white/40 text-xs">Autoriser Google à indexer cette page</p>
                    </div>
                    <Switch
                      checked={pageForm.seo_settings?.indexable !== false}
                      onCheckedChange={(checked) => setPageForm({ 
                        ...pageForm, 
                        seo_settings: { ...pageForm.seo_settings, indexable: checked }
                      })}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>

                  <Button onClick={savePageSettings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer le SEO
                  </Button>
                </TabsContent>
              </Tabs>
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

      {/* Page Creation Dialog */}
      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Link2 className="w-5 h-5 text-indigo-400" />
              {editingPage ? 'Modifier la page' : 'Nouvelle page'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
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
                <span className="text-white/40 text-sm whitespace-nowrap">/lien-bio/</span>
                <Input
                  value={pageForm.slug}
                  onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="auto-généré"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPageDialogOpen(false)} className="border-white/10 text-white">
              Annuler
            </Button>
            <Button onClick={savePage} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPage ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-white">
              <Link className="w-5 h-5 text-indigo-400" />
              {editingLink ? 'Modifier le lien' : 'Ajouter un lien'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLinkDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Thumbnail Upload */}
            <div className="space-y-2">
              <Label className="text-white">Image de la carte (optionnel)</Label>
              <div className="flex items-center gap-4">
                {linkForm.thumbnail ? (
                  <div className="relative">
                    <img 
                      src={linkForm.thumbnail} 
                      alt="" 
                      className="w-24 h-24 rounded-xl object-cover border border-white/10"
                    />
                    <button
                      onClick={() => setLinkForm({ ...linkForm, thumbnail: '' })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
                    <Image className="w-8 h-8 text-white/30" />
                  </div>
                )}
                <label className="cursor-pointer flex-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const response = await api.post('/multilink/upload-image', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setLinkForm({ ...linkForm, thumbnail: response.data.url });
                        toast.success('Image uploadée');
                      } catch (error) {
                        toast.error('Erreur upload');
                      } finally {
                        setUploadingImage(false);
                      }
                    }} 
                    className="hidden" 
                  />
                  <div className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm transition-colors text-center">
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Choisir une image'}
                  </div>
                </label>
              </div>
              <p className="text-white/40 text-xs">L'image apparaîtra sur la carte du lien comme sur zaap.bio</p>
            </div>

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
              <Label className="text-white">Description (optionnel)</Label>
              <Input
                value={linkForm.description}
                onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                placeholder="Courte description..."
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
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: option.color }}>
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white">Lien actif</span>
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
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingLink ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social Dialog */}
      <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Share2 className="w-5 h-5 text-indigo-400" />
              {editingSocial ? 'Modifier' : 'Ajouter un réseau social'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-white">Réseau social</Label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.filter(i => ['instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'whatsapp', 'telegram', 'email', 'website'].includes(i.value)).map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSocialForm({ ...socialForm, icon: option.value })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        socialForm.icon === option.value 
                          ? 'border-indigo-500 bg-indigo-500/20' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div 
                        className="w-8 h-8 mx-auto rounded-full flex items-center justify-center"
                        style={{ background: option.color }}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">URL du profil *</Label>
              <Input
                value={socialForm.url}
                onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                placeholder="https://instagram.com/monprofil"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white">Actif</span>
              <Switch
                checked={socialForm.is_active}
                onCheckedChange={(checked) => setSocialForm({ ...socialForm, is_active: checked })}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSocialDialogOpen(false)} className="border-white/10 text-white">
              Annuler
            </Button>
            <Button onClick={saveSocial} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSocial ? 'Mettre à jour' : 'Ajouter'}
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
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                  <Eye className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pageStats.total_views}</p>
                  <p className="text-white/60 text-sm">Vues</p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pageStats.total_clicks}</p>
                  <p className="text-white/60 text-sm">Clics</p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 text-center">
                  <BarChart3 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pageStats.ctr}%</p>
                  <p className="text-white/60 text-sm">CTR</p>
                </div>
              </div>

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
