import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, ExternalLink, Link2, BarChart3,
  GripVertical, Copy, Check, Loader2, Image, Settings, X,
  Instagram, Facebook, Twitter, Youtube, Linkedin, 
  MessageCircle, Send, Mail, Globe, ShoppingBag, Calendar,
  Phone, MapPin, Link, Download, Play, Music, Mic, BookOpen,
  ChevronDown, Palette, TrendingUp, Search, Layout, Type,
  Share2, Verified, ImagePlus, LayoutGrid, FileText, Minus, Heading,
  Video, Sparkles, Zap, Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Smile, Undo, Redo
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
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

// Block types for zaap.bio style - organized by category
const BLOCK_CATEGORIES = {
  basics: [
    { id: 'link', name: 'Lien simple', icon: Link, description: 'Un lien vers n\'importe quelle URL' },
    { id: 'link_image', name: 'Lien + Image', icon: Image, description: 'Lien avec une image en bannière' },
    { id: 'button', name: 'Bouton', icon: ExternalLink, description: 'Bouton d\'action mis en avant' },
    { id: 'folder', name: 'Dossier/Carousel', icon: LayoutGrid, description: 'Groupe de liens en slider' },
    { id: 'text', name: 'Bloc de texte', icon: FileText, description: 'Texte libre pour informations' },
  ],
  content: [
    { id: 'image_block', name: 'Image', icon: Image, description: 'Afficher une ou plusieurs images' },
    { id: 'video', name: 'Vidéo YouTube', icon: Play, description: 'Intégrer une vidéo YouTube' },
    { id: 'header', name: 'Titre/En-tête', icon: Heading, description: 'Séparer les sections avec un titre' },
    { id: 'divider', name: 'Séparateur', icon: Minus, description: 'Ligne de séparation visuelle' },
  ],
  social: [
    { id: 'instagram_embed', name: 'Post Instagram', icon: Instagram, description: 'Intégrer un post Instagram' },
    { id: 'tiktok_embed', name: 'Vidéo TikTok', icon: Music, description: 'Intégrer une vidéo TikTok' },
  ]
};

// Flat list for backward compatibility
const SECTION_TYPES = [
  ...BLOCK_CATEGORIES.basics,
  ...BLOCK_CATEGORIES.content,
  ...BLOCK_CATEGORIES.social,
];

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
  
  // Section Form
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [pageSections, setPageSections] = useState([]);
  const [sectionForm, setSectionForm] = useState({
    section_type: 'carousel',
    title: '',
    content: '',
    items: [],
    images: [],
    settings: {},
    is_active: true
  });
  
  // ============ NEW UNIFIED BLOCKS SYSTEM ============
  const [pageBlocks, setPageBlocks] = useState([]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockForm, setBlockForm] = useState({
    block_type: 'link',
    label: '',
    url: '',
    description: '',
    thumbnail: '',
    icon: 'link',
    content: '',
    items: [],
    media_url: '',
    media_type: '',
    youtube_url: '',
    settings: {
      aspect_ratio: 'auto',
      rounded: 'lg'
    },
    is_active: true
  });
  const [uploadingBlockMedia, setUploadingBlockMedia] = useState(false);
  // ============ END BLOCKS SYSTEM ============
  
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
      setPageSections(response.data.sections || []);
      setPageBlocks(response.data.blocks || []); // NEW: Unified blocks
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

  // ================== SECTIONS MANAGEMENT ==================
  
  const openSectionDialog = (section = null) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        section_type: section.section_type || 'carousel',
        title: section.title || '',
        content: section.content || '',
        items: section.items || [],
        images: section.images || [],
        settings: section.settings || {},
        is_active: section.is_active !== false
      });
    } else {
      setEditingSection(null);
      setSectionForm({
        section_type: 'carousel',
        title: '',
        content: '',
        items: [],
        images: [],
        settings: {},
        is_active: true
      });
    }
    setSectionDialogOpen(true);
  };

  const saveSection = async () => {
    if (sectionForm.section_type === 'text' && !sectionForm.content.trim()) {
      toast.error('Le contenu est requis pour une section texte');
      return;
    }
    
    setSaving(true);
    try {
      if (editingSection) {
        await api.put(`/multilink/pages/${selectedPage.id}/sections/${editingSection.id}`, sectionForm);
        toast.success('Section mise à jour');
      } else {
        await api.post(`/multilink/pages/${selectedPage.id}/sections`, sectionForm);
        toast.success('Section ajoutée');
      }
      setSectionDialogOpen(false);
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (section) => {
    if (!window.confirm('Supprimer cette section ?')) return;
    
    try {
      await api.delete(`/multilink/pages/${selectedPage.id}/sections/${section.id}`);
      toast.success('Section supprimée');
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const toggleSection = async (section) => {
    try {
      await api.put(`/multilink/pages/${selectedPage.id}/sections/${section.id}`, { is_active: !section.is_active });
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const addCarouselItem = () => {
    setSectionForm({
      ...sectionForm,
      items: [...sectionForm.items, { image: '', title: '', subtitle: '', url: '' }]
    });
  };

  const updateCarouselItem = (index, field, value) => {
    const newItems = [...sectionForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setSectionForm({ ...sectionForm, items: newItems });
  };

  const removeCarouselItem = (index) => {
    setSectionForm({
      ...sectionForm,
      items: sectionForm.items.filter((_, i) => i !== index)
    });
  };

  // ================== END SECTIONS MANAGEMENT ==================

  // ================== UNIFIED BLOCKS MANAGEMENT ==================
  
  const openBlockDialog = (block = null) => {
    if (block) {
      setEditingBlock(block);
      setBlockForm({
        block_type: block.block_type || 'link',
        label: block.label || '',
        url: block.url || '',
        description: block.description || '',
        thumbnail: block.thumbnail || '',
        icon: block.icon || 'link',
        content: block.content || '',
        items: block.items || [],
        media_url: block.media_url || '',
        media_type: block.media_type || '',
        youtube_url: block.youtube_url || '',
        settings: block.settings || { aspect_ratio: 'auto', rounded: 'lg' },
        is_active: block.is_active !== false
      });
    } else {
      setEditingBlock(null);
      setBlockForm({
        block_type: 'link',
        label: '',
        url: '',
        description: '',
        thumbnail: '',
        icon: 'link',
        content: '',
        items: [],
        media_url: '',
        media_type: '',
        youtube_url: '',
        settings: { aspect_ratio: 'auto', rounded: 'lg' },
        is_active: true
      });
    }
    setBlockDialogOpen(true);
  };

  const saveBlock = async () => {
    // Validation based on block type
    if (['link', 'link_image', 'button'].includes(blockForm.block_type)) {
      if (!blockForm.label.trim() || !blockForm.url.trim()) {
        toast.error('Le label et l\'URL sont requis');
        return;
      }
    }
    if (blockForm.block_type === 'text' && !blockForm.content.trim()) {
      toast.error('Le contenu est requis');
      return;
    }
    if (blockForm.block_type === 'youtube' && !blockForm.youtube_url.trim()) {
      toast.error('L\'URL YouTube est requise');
      return;
    }
    if (['image', 'video'].includes(blockForm.block_type) && !blockForm.media_url) {
      toast.error('Veuillez uploader un média');
      return;
    }
    
    setSaving(true);
    try {
      if (editingBlock) {
        await api.put(`/multilink/pages/${selectedPage.id}/blocks/${editingBlock.id}`, blockForm);
        toast.success('Bloc mis à jour');
      } else {
        await api.post(`/multilink/pages/${selectedPage.id}/blocks`, blockForm);
        toast.success('Bloc ajouté');
      }
      setBlockDialogOpen(false);
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const deleteBlock = async (block) => {
    if (!window.confirm('Supprimer ce bloc ?')) return;
    
    try {
      await api.delete(`/multilink/pages/${selectedPage.id}/blocks/${block.id}`);
      toast.success('Bloc supprimé');
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const toggleBlock = async (block) => {
    try {
      await api.put(`/multilink/pages/${selectedPage.id}/blocks/${block.id}`, { is_active: !block.is_active });
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleBlockMediaUpload = async (file) => {
    if (!file) return;
    
    setUploadingBlockMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/multilink/upload-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setBlockForm({
        ...blockForm,
        media_url: response.data.url,
        media_type: response.data.media_type
      });
      toast.success('Média uploadé');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur upload');
    } finally {
      setUploadingBlockMedia(false);
    }
  };

  const handleBlockDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = pageBlocks.findIndex(b => b.id === active.id);
      const newIndex = pageBlocks.findIndex(b => b.id === over.id);
      
      const newBlocks = arrayMove(pageBlocks, oldIndex, newIndex);
      setPageBlocks(newBlocks);
      
      try {
        await api.put(`/multilink/pages/${selectedPage.id}/blocks/reorder`, {
          block_ids: newBlocks.map(b => b.id)
        });
      } catch (error) {
        toast.error('Erreur de réorganisation');
        fetchPageDetails(selectedPage);
      }
    }
  };

  const addBlockCarouselItem = (itemType = 'image') => {
    const newItem = {
      type: itemType, // 'image', 'video', 'link_image'
      media_url: '',
      media_type: itemType === 'video' ? 'video' : 'image',
      title: '',
      description: '',
      url: '',
      button_text: 'En Savoir +'
    };
    setBlockForm({
      ...blockForm,
      items: [...blockForm.items, newItem]
    });
  };

  const updateBlockCarouselItem = (index, field, value) => {
    const newItems = [...blockForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setBlockForm({ ...blockForm, items: newItems });
  };

  const removeBlockCarouselItem = (index) => {
    setBlockForm({
      ...blockForm,
      items: blockForm.items.filter((_, i) => i !== index)
    });
  };

  const uploadCarouselMedia = async (index, file) => {
    if (!file) return;
    
    const isVideo = file.type.startsWith('video/');
    setUploadingBlockMedia(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/multilink/upload-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newItems = [...blockForm.items];
      newItems[index] = { 
        ...newItems[index], 
        media_url: response.data.url,
        media_type: isVideo ? 'video' : 'image'
      };
      setBlockForm({ ...blockForm, items: newItems });
      toast.success(isVideo ? 'Vidéo uploadée' : 'Image uploadée');
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setUploadingBlockMedia(false);
    }
  };

  // ================== END BLOCKS MANAGEMENT ==================

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

                {/* CONTENT TAB - UNIFIED BLOCKS like Zaap.bio */}
                <TabsContent value="content" className="p-4 space-y-4">
                  {/* Add Block Button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Blocs ({pageBlocks.length})
                    </h3>
                    <Button onClick={() => openBlockDialog()} size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter un bloc
                    </Button>
                  </div>

                  {/* Blocks List - Unified drag & drop */}
                  {pageBlocks.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-dashed border-white/20">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-purple-400" />
                      </div>
                      <h4 className="text-white font-medium mb-2">Créez votre page</h4>
                      <p className="text-white/50 text-sm mb-4 max-w-xs mx-auto">
                        Ajoutez des liens, images, vidéos, textes et plus encore
                      </p>
                      <Button onClick={() => openBlockDialog()} className="bg-gradient-to-r from-purple-600 to-indigo-600">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un bloc
                      </Button>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
                      <SortableContext items={pageBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {pageBlocks.map(block => {
                            const blockTypeInfo = SECTION_TYPES.find(t => t.id === block.block_type) || { icon: Link, name: 'Bloc' };
                            const BlockIcon = blockTypeInfo.icon;
                            
                            return (
                              <div 
                                key={block.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  block.is_active 
                                    ? 'bg-white/5 border-white/10 hover:border-white/20' 
                                    : 'bg-white/[0.02] border-white/5 opacity-50'
                                }`}
                              >
                                <div className="cursor-grab text-white/30 hover:text-white/60">
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                
                                {/* Thumbnail preview for media blocks */}
                                {(block.thumbnail || block.media_url) ? (
                                  <img 
                                    src={block.thumbnail || block.media_url} 
                                    alt="" 
                                    className="w-12 h-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div 
                                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                                    style={{ 
                                      backgroundColor: block.block_type.includes('link') ? 'rgba(99,102,241,0.2)' :
                                        block.block_type === 'text' ? 'rgba(34,197,94,0.2)' :
                                        block.block_type === 'image' ? 'rgba(236,72,153,0.2)' :
                                        block.block_type === 'video' ? 'rgba(239,68,68,0.2)' :
                                        block.block_type === 'youtube' ? 'rgba(239,68,68,0.2)' :
                                        block.block_type === 'carousel' ? 'rgba(168,85,247,0.2)' :
                                        'rgba(255,255,255,0.1)'
                                    }}
                                  >
                                    <BlockIcon className="w-5 h-5" style={{
                                      color: block.block_type.includes('link') ? '#6366f1' :
                                        block.block_type === 'text' ? '#22c55e' :
                                        block.block_type === 'image' ? '#ec4899' :
                                        block.block_type === 'video' || block.block_type === 'youtube' ? '#ef4444' :
                                        block.block_type === 'carousel' ? '#a855f7' :
                                        '#ffffff'
                                    }} />
                                  </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">
                                    {block.label || block.content?.substring(0, 40) || blockTypeInfo.name}
                                  </p>
                                  <p className="text-white/40 text-xs truncate">
                                    {block.block_type === 'link' && block.url}
                                    {block.block_type === 'link_image' && block.url}
                                    {block.block_type === 'text' && 'Bloc de texte'}
                                    {block.block_type === 'image' && 'Image'}
                                    {block.block_type === 'video' && 'Vidéo'}
                                    {block.block_type === 'youtube' && block.youtube_url}
                                    {block.block_type === 'carousel' && `${block.items?.length || 0} éléments`}
                                    {block.block_type === 'header' && 'Titre'}
                                    {block.block_type === 'divider' && 'Séparateur'}
                                  </p>
                                </div>
                                
                                <Switch
                                  checked={block.is_active}
                                  onCheckedChange={() => toggleBlock(block)}
                                  className="data-[state=checked]:bg-green-500"
                                />
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => openBlockDialog(block)} 
                                  className="text-white/60 hover:text-white hover:bg-white/10"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => deleteBlock(block)} 
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </TabsContent>

                {/* DESIGN TAB - Complete Color Customization like zaap.bio */}
                <TabsContent value="design" className="p-4 space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <Label className="text-white mb-3 block">Thème de base</Label>
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

                  {/* Full Color Customization Section - zaap.bio style */}
                  <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="w-5 h-5 text-indigo-400" />
                      <h4 className="text-white font-medium">Personnalisation des couleurs</h4>
                    </div>
                    <p className="text-white/50 text-xs mb-4">Personnalisez chaque élément de votre page</p>
                    
                    {/* Background Color */}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Fond de page (Background)</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.background || '#0f0f1a'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, background: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                        />
                        <Input
                          value={pageForm.custom_colors?.background || '#0f0f1a'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, background: e.target.value }
                          })}
                          className="bg-white/5 border-white/10 text-white flex-1"
                          placeholder="#0f0f1a"
                        />
                      </div>
                    </div>

                    {/* Card Background Color */}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Fond des cartes</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.card_bg || pageForm.custom_colors?.button_bg?.replace('rgba(255,255,255,0.1)', '#2a2a3e') || '#2a2a3e'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, card_bg: e.target.value, button_bg: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                        />
                        <Input
                          value={pageForm.custom_colors?.card_bg || '#2a2a3e'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, card_bg: e.target.value, button_bg: e.target.value }
                          })}
                          className="bg-white/5 border-white/10 text-white flex-1"
                          placeholder="#2a2a3e"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Couleur du texte</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, text: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                        />
                        <Input
                          value={pageForm.custom_colors?.text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, text: e.target.value }
                          })}
                          className="bg-white/5 border-white/10 text-white flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Button Background */}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Couleur des boutons</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.button_bg?.startsWith('#') ? pageForm.custom_colors.button_bg : '#6366f1'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_bg: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                        />
                        <Input
                          value={pageForm.custom_colors?.button_bg || '#6366f1'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_bg: e.target.value }
                          })}
                          className="bg-white/5 border-white/10 text-white flex-1"
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>

                    {/* Button Text Color */}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Texte des boutons</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.button_text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_text: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                        />
                        <Input
                          value={pageForm.custom_colors?.button_text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_text: e.target.value }
                          })}
                          className="bg-white/5 border-white/10 text-white flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Couleur d'accent</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.accent || '#6366f1'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, accent: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                        />
                        <Input
                          value={pageForm.custom_colors?.accent || '#6366f1'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, accent: e.target.value }
                          })}
                          className="bg-white/5 border-white/10 text-white flex-1"
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Preview Mini */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <Label className="text-white/70 text-sm mb-3 block">Aperçu en direct</Label>
                    <div 
                      className="rounded-xl p-4 min-h-[150px]"
                      style={{ background: pageForm.custom_colors?.background || '#0f0f1a' }}
                    >
                      <div className="text-center mb-3">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-2"
                          style={{ background: pageForm.custom_colors?.accent || '#6366f1' }}
                        />
                        <p style={{ color: pageForm.custom_colors?.text || '#ffffff' }} className="font-bold">Titre</p>
                      </div>
                      <div 
                        className="rounded-xl p-3 mb-2"
                        style={{ background: pageForm.custom_colors?.card_bg || pageForm.custom_colors?.button_bg || 'rgba(255,255,255,0.1)' }}
                      >
                        <p style={{ color: pageForm.custom_colors?.button_text || '#ffffff' }} className="text-sm font-medium">Exemple de carte</p>
                        <p style={{ color: pageForm.custom_colors?.button_text || '#ffffff', opacity: 0.7 }} className="text-xs">Description du lien</p>
                      </div>
                      <div 
                        className="rounded-full py-2 px-4 text-center text-sm font-medium"
                        style={{ 
                          background: pageForm.custom_colors?.accent || '#6366f1',
                          color: pageForm.custom_colors?.button_text || '#ffffff'
                        }}
                      >
                        Bouton
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button onClick={savePageSettings} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
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
              <p className="text-white/40 text-xs mb-2">📐 Format recommandé : 1200×630px (ratio 1.91:1)</p>
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
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-white">
              <Share2 className="w-5 h-5 text-indigo-400" />
              {editingSocial ? 'Modifier' : 'Ajouter un réseau social'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSocialDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
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

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-white">
              <LayoutGrid className="w-5 h-5 text-purple-400" />
              {editingSection ? 'Modifier la section' : 'Ajouter une section'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSectionDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Block Type Selection - zaap.bio style with categories */}
            <div className="space-y-3">
              <Label className="text-white">Choisir un type de bloc</Label>
              
              {/* Category: Basics */}
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Basiques</p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_CATEGORIES.basics.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSectionForm({ ...sectionForm, section_type: type.id })}
                        className={`p-3 rounded-xl border transition-all text-left flex items-start gap-3 ${
                          sectionForm.section_type === type.id 
                            ? 'border-purple-500 bg-purple-500/20' 
                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium">{type.name}</p>
                          <p className="text-white/50 text-xs line-clamp-1">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Category: Content */}
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Contenu</p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_CATEGORIES.content.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSectionForm({ ...sectionForm, section_type: type.id })}
                        className={`p-3 rounded-xl border transition-all text-left flex items-start gap-3 ${
                          sectionForm.section_type === type.id 
                            ? 'border-blue-500 bg-blue-500/20' 
                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium">{type.name}</p>
                          <p className="text-white/50 text-xs line-clamp-1">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div className="space-y-2">
              <Label className="text-white">Titre (optionnel)</Label>
              <Input
                value={sectionForm.title}
                onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                placeholder="Titre de la section"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            {/* Content for Text/Header sections */}
            {(sectionForm.section_type === 'text' || sectionForm.section_type === 'header') && (
              <div className="space-y-2">
                <Label className="text-white">Contenu *</Label>
                <Textarea
                  value={sectionForm.content}
                  onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                  placeholder="Votre texte ici..."
                  className="bg-white/5 border-white/10 text-white min-h-[100px]"
                />
              </div>
            )}

            {/* Carousel/Folder Items */}
            {(sectionForm.section_type === 'carousel' || sectionForm.section_type === 'folder') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Éléments du carousel</Label>
                    <p className="text-white/40 text-xs mt-0.5">📐 Images: 400×500px (ratio 4:5)</p>
                  </div>
                  <Button size="sm" onClick={addCarouselItem} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
                
                {sectionForm.items.length === 0 ? (
                  <div className="text-center py-6 text-white/40 bg-white/5 rounded-xl">
                    <p className="text-sm">Aucun élément</p>
                    <p className="text-xs mt-1">Ajoutez des cartes comme sur zaap.bio</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {sectionForm.items.map((item, index) => (
                      <div key={index} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60 text-xs">Élément {index + 1}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeCarouselItem(index)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          value={item.image}
                          onChange={(e) => updateCarouselItem(index, 'image', e.target.value)}
                          placeholder="URL de l'image (400×500px recommandé)"
                          className="bg-white/5 border-white/10 text-white text-sm"
                        />
                        <Input
                          value={item.title}
                          onChange={(e) => updateCarouselItem(index, 'title', e.target.value)}
                          placeholder="Titre"
                          className="bg-white/5 border-white/10 text-white text-sm"
                        />
                        <Input
                          value={item.subtitle}
                          onChange={(e) => updateCarouselItem(index, 'subtitle', e.target.value)}
                          placeholder="Sous-titre (optionnel)"
                          className="bg-white/5 border-white/10 text-white text-sm"
                        />
                        <Input
                          value={item.url}
                          onChange={(e) => updateCarouselItem(index, 'url', e.target.value)}
                          placeholder="URL au clic (optionnel)"
                          className="bg-white/5 border-white/10 text-white text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Image URLs for Image section */}
            {sectionForm.section_type === 'image' && (
              <div className="space-y-2">
                <Label className="text-white">URLs des images (une par ligne)</Label>
                <p className="text-white/40 text-xs">📐 Format carré recommandé: 600×600px</p>
                <Textarea
                  value={sectionForm.images.join('\n')}
                  onChange={(e) => setSectionForm({ ...sectionForm, images: e.target.value.split('\n').filter(url => url.trim()) })}
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  className="bg-white/5 border-white/10 text-white min-h-[100px]"
                />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white">Section active</span>
              <Switch
                checked={sectionForm.is_active}
                onCheckedChange={(checked) => setSectionForm({ ...sectionForm, is_active: checked })}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)} className="border-white/10 text-white">
              Annuler
            </Button>
            <Button onClick={saveSection} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSection ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNIFIED BLOCK DIALOG - Zaap.bio style avec WYSIWYG */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-white">
              {blockForm.block_type === 'link_image' && <><Image className="w-5 h-5 text-indigo-400" /> Edit Link &amp; Image</>}
              {blockForm.block_type === 'link' && <><Link className="w-5 h-5 text-indigo-400" /> Edit Link</>}
              {blockForm.block_type === 'text' && <><Type className="w-5 h-5 text-indigo-400" /> Update Text Block</>}
              {blockForm.block_type === 'button' && <><ExternalLink className="w-5 h-5 text-indigo-400" /> Edit Button</>}
              {blockForm.block_type === 'image' && <><Image className="w-5 h-5 text-pink-400" /> Image Block</>}
              {blockForm.block_type === 'video' && <><Video className="w-5 h-5 text-red-400" /> Video Block</>}
              {blockForm.block_type === 'youtube' && <><Youtube className="w-5 h-5 text-red-400" /> YouTube Embed</>}
              {blockForm.block_type === 'carousel' && <><LayoutGrid className="w-5 h-5 text-purple-400" /> Carousel</>}
              {blockForm.block_type === 'header' && <><Heading className="w-5 h-5 text-blue-400" /> Header</>}
              {blockForm.block_type === 'divider' && <><Minus className="w-5 h-5 text-gray-400" /> Divider</>}
              {!editingBlock && !['link_image','link','text','button','image','video','youtube','carousel','header','divider'].includes(blockForm.block_type) && <>
                <Sparkles className="w-5 h-5 text-purple-400" /> Ajouter un bloc
              </>}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBlockDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Block Type Selection - Only show when adding new */}
            {!editingBlock && (
              <div className="space-y-3">
                <Label className="text-white">Type de bloc</Label>
                
                {/* Links */}
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Liens</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'link', name: 'Lien simple', icon: Link },
                      { id: 'link_image', name: 'Lien + Image', icon: Image },
                      { id: 'button', name: 'Bouton', icon: ExternalLink },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setBlockForm({ ...blockForm, block_type: type.id })}
                        className={`p-2.5 rounded-xl border transition-all text-left flex items-center gap-2 ${
                          blockForm.block_type === type.id 
                            ? 'border-indigo-500 bg-indigo-500/20' 
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <type.icon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-white text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media */}
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Médias</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'image', name: 'Image', icon: Image, bgColor: 'bg-pink-500/20', color: 'text-pink-400' },
                      { id: 'video', name: 'Vidéo', icon: Video, bgColor: 'bg-red-500/20', color: 'text-red-400' },
                      { id: 'youtube', name: 'YouTube', icon: Youtube, bgColor: 'bg-red-500/20', color: 'text-red-400' },
                      { id: 'carousel', name: 'Carousel', icon: LayoutGrid, bgColor: 'bg-purple-500/20', color: 'text-purple-400' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setBlockForm({ ...blockForm, block_type: type.id })}
                        className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                          blockForm.block_type === type.id 
                            ? 'border-purple-500 bg-purple-500/20' 
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${type.bgColor} flex items-center justify-center`}>
                          <type.icon className={`w-5 h-5 ${type.color}`} />
                        </div>
                        <span className="text-white text-xs">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Contenu</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'text', name: 'Texte', icon: FileText, bgColor: 'bg-green-500/20', color: 'text-green-400' },
                      { id: 'header', name: 'Titre', icon: Heading, bgColor: 'bg-blue-500/20', color: 'text-blue-400' },
                      { id: 'divider', name: 'Séparateur', icon: Minus, bgColor: 'bg-gray-500/20', color: 'text-gray-400' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setBlockForm({ ...blockForm, block_type: type.id })}
                        className={`p-2.5 rounded-xl border transition-all text-left flex items-center gap-2 ${
                          blockForm.block_type === type.id 
                            ? 'border-green-500 bg-green-500/20' 
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${type.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <type.icon className={`w-4 h-4 ${type.color}`} />
                        </div>
                        <span className="text-white text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============ LINK + IMAGE FORM (zaap.bio style) ============ */}
            {blockForm.block_type === 'link_image' && (
              <div className="space-y-4">
                <p className="text-white/60 text-sm">Edit the details for this link.</p>
                
                {/* Heading (Label) */}
                <div className="space-y-2">
                  <Label className="text-white">Heading *</Label>
                  <Input
                    value={blockForm.label}
                    onChange={(e) => setBlockForm({ ...blockForm, label: e.target.value })}
                    placeholder="Site Web"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-white">Description</Label>
                  <Textarea
                    value={blockForm.description}
                    onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                    placeholder="Démarquez-vous avec Alpha Agency, votre agence de marketing digital..."
                    className="bg-white/5 border-white/10 text-white min-h-[80px]"
                  />
                </div>

                {/* Link URL */}
                <div className="space-y-2">
                  <Label className="text-white">Link URL *</Label>
                  <Input
                    value={blockForm.url}
                    onChange={(e) => setBlockForm({ ...blockForm, url: e.target.value })}
                    placeholder="https://alphagency.fr/"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                {/* Open link in */}
                <div className="space-y-2">
                  <Label className="text-white">Open link in:</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={blockForm.settings?.open_in !== 'new_tab' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, open_in: 'same_tab' } })}
                      className={blockForm.settings?.open_in !== 'new_tab' ? 'bg-indigo-600' : 'border-white/20 text-white/70'}
                    >
                      Same Tab
                    </Button>
                    <Button
                      type="button"
                      variant={blockForm.settings?.open_in === 'new_tab' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, open_in: 'new_tab' } })}
                      className={blockForm.settings?.open_in === 'new_tab' ? 'bg-indigo-600' : 'border-white/20 text-white/70'}
                    >
                      New Tab
                    </Button>
                  </div>
                </div>

                {/* Button Text */}
                <div className="space-y-2">
                  <Label className="text-white">Button Text *</Label>
                  <Input
                    value={blockForm.settings?.button_text || 'En Savoir +'}
                    onChange={(e) => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, button_text: e.target.value } })}
                    placeholder="En Savoir +"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                {/* Image Upload - Only upload, no URL option */}
                <div className="space-y-2">
                  <Label className="text-white">Image</Label>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    {blockForm.thumbnail ? (
                      <div className="relative">
                        <img src={blockForm.thumbnail} alt="" className="w-full h-48 rounded-xl object-contain bg-black/20" />
                        <button
                          type="button"
                          onClick={() => setBlockForm({ ...blockForm, thumbnail: '' })}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingBlockMedia(true);
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              const response = await api.post('/multilink/upload-media', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              setBlockForm(prev => ({ ...prev, thumbnail: response.data.url }));
                              toast.success('Image uploadée');
                            } catch (error) {
                              toast.error('Erreur upload');
                            } finally {
                              setUploadingBlockMedia(false);
                            }
                          }} 
                          className="hidden" 
                        />
                        <div className="flex flex-col items-center py-8 border-2 border-dashed border-white/20 rounded-xl hover:border-indigo-500/50 transition-colors">
                          {uploadingBlockMedia ? (
                            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                          ) : (
                            <>
                              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-3">
                                <ImagePlus className="w-8 h-8 text-indigo-400" />
                              </div>
                              <p className="text-white font-medium">Cliquer pour uploader</p>
                              <p className="text-white/50 text-xs mt-1">JPG, PNG, WebP (max 10MB)</p>
                            </>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============ SIMPLE LINK FORM ============ */}
            {blockForm.block_type === 'link' && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Label *</Label>
                  <Input
                    value={blockForm.label}
                    onChange={(e) => setBlockForm({ ...blockForm, label: e.target.value })}
                    placeholder="Mon lien"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">URL *</Label>
                  <Input
                    value={blockForm.url}
                    onChange={(e) => setBlockForm({ ...blockForm, url: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Description (optionnel)</Label>
                  <Input
                    value={blockForm.description}
                    onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                    placeholder="Courte description..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Icône</Label>
                  <Select value={blockForm.icon || 'link'} onValueChange={(value) => setBlockForm({ ...blockForm, icon: value })}>
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
              </>
            )}

            {/* ============ BUTTON FORM ============ */}
            {blockForm.block_type === 'button' && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Texte du bouton *</Label>
                  <Input
                    value={blockForm.label}
                    onChange={(e) => setBlockForm({ ...blockForm, label: e.target.value })}
                    placeholder="Découvrir"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">URL *</Label>
                  <Input
                    value={blockForm.url}
                    onChange={(e) => setBlockForm({ ...blockForm, url: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </>
            )}

            {/* ============ TEXT BLOCK WITH WYSIWYG ============ */}
            {blockForm.block_type === 'text' && (
              <div className="space-y-2" data-color-mode="dark">
                <p className="text-white/60 text-sm mb-4">Share text, notes, or information on your page.</p>
                <MDEditor
                  value={blockForm.content || ''}
                  onChange={(value) => setBlockForm({ ...blockForm, content: value || '' })}
                  preview="edit"
                  height={250}
                  textareaProps={{
                    placeholder: "Nous sommes convaincus que la clé du succès réside dans une collaboration étroite avec nos clients...",
                  }}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                  }}
                />
                <p className="text-white/40 text-xs mt-2">Utilisez Markdown pour le formatage: **gras**, *italique*, # titre, - liste</p>
              </div>
            )}

            {/* ============ HEADER BLOCK ============ */}
            {blockForm.block_type === 'header' && (
              <div className="space-y-2">
                <Label className="text-white">Titre *</Label>
                <Input
                  value={blockForm.content}
                  onChange={(e) => setBlockForm({ ...blockForm, content: e.target.value })}
                  placeholder="Votre titre..."
                  className="bg-white/5 border-white/10 text-white text-xl font-bold"
                />
              </div>
            )}

            {/* ============ IMAGE/VIDEO UPLOAD ============ */}
            {['image', 'video'].includes(blockForm.block_type) && (
              <div className="space-y-2">
                <Label className="text-white">
                  {blockForm.block_type === 'image' ? 'Image' : 'Vidéo'} *
                </Label>
                <p className="text-white/40 text-xs">
                  {blockForm.block_type === 'image' ? '📐 Formats: JPG, PNG, WebP (max 10MB)' : '📹 Formats: MP4, MOV, WebM (max 100MB)'}
                </p>
                <div className="flex flex-col items-center gap-3 p-4 bg-white/5 rounded-xl border border-dashed border-white/20">
                  {blockForm.media_url ? (
                    <div className="relative w-full">
                      {blockForm.media_type === 'image' || blockForm.block_type === 'image' ? (
                        <img src={blockForm.media_url} alt="" className="w-full h-48 rounded-lg object-contain bg-black/20" />
                      ) : (
                        <video src={blockForm.media_url} className="w-full h-48 rounded-lg object-contain bg-black/20" controls />
                      )}
                      <button
                        onClick={() => setBlockForm({ ...blockForm, media_url: '', media_type: '' })}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer w-full">
                      <input 
                        type="file" 
                        accept={blockForm.block_type === 'image' ? 'image/*' : 'video/*'}
                        onChange={(e) => handleBlockMediaUpload(e.target.files?.[0])} 
                        className="hidden" 
                      />
                      <div className="flex flex-col items-center py-8 border-2 border-dashed border-white/20 rounded-xl hover:border-indigo-500/50 transition-colors">
                        {uploadingBlockMedia ? (
                          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-3">
                              {blockForm.block_type === 'image' ? <Image className="w-8 h-8 text-indigo-400" /> : <Video className="w-8 h-8 text-indigo-400" />}
                            </div>
                            <p className="text-white font-medium">Cliquer pour uploader</p>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
                
                {/* Aspect ratio & Rounded settings */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-white text-xs">Format</Label>
                    <Select 
                      value={blockForm.settings?.aspect_ratio || 'auto'} 
                      onValueChange={(value) => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, aspect_ratio: value } })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        <SelectItem value="auto" className="text-white">Auto</SelectItem>
                        <SelectItem value="1:1" className="text-white">1:1 (Carré)</SelectItem>
                        <SelectItem value="4:5" className="text-white">4:5 (Portrait)</SelectItem>
                        <SelectItem value="16:9" className="text-white">16:9 (Paysage)</SelectItem>
                        <SelectItem value="9:16" className="text-white">9:16 (Story)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white text-xs">Bords arrondis</Label>
                    <Select 
                      value={blockForm.settings?.rounded || 'lg'} 
                      onValueChange={(value) => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, rounded: value } })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e] border-white/10">
                        <SelectItem value="none" className="text-white">Aucun</SelectItem>
                        <SelectItem value="sm" className="text-white">Léger</SelectItem>
                        <SelectItem value="md" className="text-white">Moyen</SelectItem>
                        <SelectItem value="lg" className="text-white">Arrondi</SelectItem>
                        <SelectItem value="full" className="text-white">Cercle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ============ YOUTUBE URL ============ */}
            {blockForm.block_type === 'youtube' && (
              <div className="space-y-2">
                <Label className="text-white">URL YouTube *</Label>
                <Input
                  value={blockForm.youtube_url}
                  onChange={(e) => setBlockForm({ ...blockForm, youtube_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-white/40 text-xs">Collez le lien d'une vidéo YouTube</p>
              </div>
            )}

            {/* ============ CAROUSEL ITEMS - Enhanced with 3 types ============ */}
            {blockForm.block_type === 'carousel' && (
              <div className="space-y-4">
                {/* Add Element Buttons */}
                <div>
                  <Label className="text-white mb-3 block">Ajouter un élément</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => addBlockCarouselItem('image')}
                      className="p-3 rounded-xl border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/10 transition-all flex flex-col items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <Image className="w-5 h-5 text-pink-400" />
                      </div>
                      <span className="text-white text-xs">Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlockCarouselItem('video')}
                      className="p-3 rounded-xl border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all flex flex-col items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Video className="w-5 h-5 text-red-400" />
                      </div>
                      <span className="text-white text-xs">Vidéo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlockCarouselItem('link_image')}
                      className="p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all flex flex-col items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Link className="w-5 h-5 text-indigo-400" />
                      </div>
                      <span className="text-white text-xs">Image + Lien</span>
                    </button>
                  </div>
                </div>
                
                {/* Elements List */}
                {blockForm.items.length === 0 ? (
                  <div className="text-center py-8 bg-white/5 rounded-xl text-white/40">
                    <LayoutGrid className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun élément dans le carrousel</p>
                    <p className="text-xs mt-1">Cliquez sur un type ci-dessus pour ajouter</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {blockForm.items.map((item, index) => (
                      <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 text-xs">#{index + 1}</span>
                            <Badge className={
                              item.type === 'video' ? 'bg-red-500/20 text-red-400' :
                              item.type === 'link_image' ? 'bg-indigo-500/20 text-indigo-400' :
                              'bg-pink-500/20 text-pink-400'
                            }>
                              {item.type === 'video' ? 'Vidéo' : item.type === 'link_image' ? 'Image + Lien' : 'Image'}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeBlockCarouselItem(index)} 
                            className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Media Upload */}
                        <div className="mb-3">
                          {item.media_url ? (
                            <div className="relative">
                              {item.media_type === 'video' || item.type === 'video' ? (
                                <video 
                                  src={item.media_url} 
                                  className="w-full h-32 rounded-lg object-cover bg-black/20" 
                                  controls 
                                />
                              ) : (
                                <img 
                                  src={item.media_url} 
                                  alt="" 
                                  className="w-full h-32 rounded-lg object-cover" 
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => updateBlockCarouselItem(index, 'media_url', '')}
                                className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <input 
                                type="file" 
                                accept={item.type === 'video' ? 'video/*' : 'image/*'}
                                onChange={(e) => uploadCarouselMedia(index, e.target.files?.[0])} 
                                className="hidden" 
                              />
                              <div className="flex flex-col items-center py-6 border-2 border-dashed border-white/20 rounded-xl hover:border-indigo-500/50 transition-colors">
                                {uploadingBlockMedia ? (
                                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                ) : (
                                  <>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                                      item.type === 'video' ? 'bg-red-500/20' : 'bg-pink-500/20'
                                    }`}>
                                      {item.type === 'video' ? (
                                        <Video className="w-6 h-6 text-red-400" />
                                      ) : (
                                        <ImagePlus className="w-6 h-6 text-pink-400" />
                                      )}
                                    </div>
                                    <p className="text-white text-sm">Cliquer pour uploader</p>
                                    <p className="text-white/40 text-xs mt-1">
                                      {item.type === 'video' ? 'MP4, MOV, WebM' : 'JPG, PNG, WebP'}
                                    </p>
                                  </>
                                )}
                              </div>
                            </label>
                          )}
                        </div>

                        {/* Title (for all types) */}
                        <div className="space-y-2 mb-2">
                          <Input
                            value={item.title || ''}
                            onChange={(e) => updateBlockCarouselItem(index, 'title', e.target.value)}
                            placeholder="Titre (optionnel)"
                            className="bg-white/5 border-white/10 text-white text-sm h-9"
                          />
                        </div>

                        {/* Link Image specific fields */}
                        {item.type === 'link_image' && (
                          <>
                            <div className="space-y-2 mb-2">
                              <Textarea
                                value={item.description || ''}
                                onChange={(e) => updateBlockCarouselItem(index, 'description', e.target.value)}
                                placeholder="Description..."
                                className="bg-white/5 border-white/10 text-white text-sm min-h-[60px]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={item.url || ''}
                                onChange={(e) => updateBlockCarouselItem(index, 'url', e.target.value)}
                                placeholder="URL du lien *"
                                className="bg-white/5 border-white/10 text-white text-sm h-9"
                              />
                              <Input
                                value={item.button_text || 'En Savoir +'}
                                onChange={(e) => updateBlockCarouselItem(index, 'button_text', e.target.value)}
                                placeholder="Texte du bouton"
                                className="bg-white/5 border-white/10 text-white text-sm h-9"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active toggle - Always show */}
            {blockForm.block_type !== 'divider' && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-white">Bloc actif</span>
                <Switch
                  checked={blockForm.is_active}
                  onCheckedChange={(checked) => setBlockForm({ ...blockForm, is_active: checked })}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)} className="border-white/10 text-white">
              Cancel
            </Button>
            <Button onClick={saveBlock} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingBlock ? 'Apply Changes' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog - Enhanced Analytics */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Analytics - {selectedPage?.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStatsDialogOpen(false)}
              className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {pageStats && (
            <div className="space-y-6">
              {/* Period Info */}
              <div className="flex items-center justify-between text-white/50 text-sm">
                <span>Période : {pageStats.period_days} derniers jours</span>
                <span className="text-white/30">Comparé aux {pageStats.period_days} jours précédents</span>
              </div>

              {/* KPIs with Growth */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="w-6 h-6 text-blue-400" />
                    {pageStats.views_growth !== 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pageStats.views_growth > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pageStats.views_growth > 0 ? '+' : ''}{pageStats.views_growth}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white">{pageStats.total_views.toLocaleString()}</p>
                  <p className="text-white/60 text-sm">Vues totales</p>
                  {pageStats.prev_total_views > 0 && (
                    <p className="text-white/30 text-xs mt-1">vs {pageStats.prev_total_views.toLocaleString()} précédemment</p>
                  )}
                </div>
                <div className="bg-green-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    {pageStats.clicks_growth !== 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pageStats.clicks_growth > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pageStats.clicks_growth > 0 ? '+' : ''}{pageStats.clicks_growth}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white">{pageStats.total_clicks.toLocaleString()}</p>
                  <p className="text-white/60 text-sm">Clics totaux</p>
                  {pageStats.prev_total_clicks > 0 && (
                    <p className="text-white/30 text-xs mt-1">vs {pageStats.prev_total_clicks.toLocaleString()} précédemment</p>
                  )}
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">{pageStats.ctr}%</p>
                  <p className="text-white/60 text-sm">Taux de conversion</p>
                  <p className="text-white/30 text-xs mt-1">Clics / Vues</p>
                </div>
              </div>

              {/* Mini Chart - Views by Day */}
              {pageStats.views_by_day?.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Vues par jour
                  </h3>
                  <div className="flex items-end gap-1 h-24">
                    {pageStats.views_by_day.slice(-14).map((day, i) => {
                      const max = Math.max(...pageStats.views_by_day.map(d => d.count));
                      const height = max > 0 ? (day.count / max) * 100 : 0;
                      return (
                        <div 
                          key={i} 
                          className="flex-1 bg-indigo-500/50 rounded-t hover:bg-indigo-500 transition-colors group relative"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${day.date}: ${day.count} vues`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                            {day.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-white/30 text-xs">
                    <span>{pageStats.views_by_day[0]?.date?.slice(5)}</span>
                    <span>{pageStats.views_by_day[pageStats.views_by_day.length - 1]?.date?.slice(5)}</span>
                  </div>
                </div>
              )}

              {/* Block Stats - NEW */}
              {pageStats.block_stats?.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-purple-400" />
                    Performance des blocs
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pageStats.block_stats.map((block, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <span className="text-white/40 text-sm w-6">{index + 1}.</span>
                        {block.thumbnail && (
                          <img src={block.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate">{block.label}</p>
                          <p className="text-white/40 text-xs">{block.type}</p>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-400">{block.clicks} clics</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link Stats - Legacy */}
              {pageStats.link_stats?.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Link className="w-4 h-4 text-indigo-400" />
                    Performance des liens (legacy)
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pageStats.link_stats.map((link, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <span className="text-white/40 text-sm w-6">{index + 1}.</span>
                        <span className="flex-1 text-white truncate">{link.label}</span>
                        <Badge className="bg-indigo-500/20 text-indigo-400">{link.clicks} clics</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No data message */}
              {(!pageStats.block_stats?.length && !pageStats.link_stats?.length && pageStats.total_views === 0) && (
                <div className="text-center py-8 bg-white/5 rounded-xl">
                  <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">Aucune donnée pour cette période</p>
                  <p className="text-white/40 text-sm mt-1">Partagez votre page pour commencer à collecter des statistiques</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
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
