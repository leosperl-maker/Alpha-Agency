import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Trash2, Edit2, Eye, ExternalLink, Link2, BarChart3,
  GripVertical, Copy, Check, Loader2, Image, Settings, X,
  Instagram, Facebook, Twitter, Youtube, Linkedin, 
  MessageCircle, Send, Mail, Globe, ShoppingBag, Calendar,
  Phone, MapPin, Link, Download, Play, Music, Mic, BookOpen,
  ChevronDown, Palette, TrendingUp, Search, Layout, Type,
  Share2, Verified, ImagePlus, LayoutGrid, FileText, Minus, Heading,
  Video, Sparkles, Zap, Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Smile, Undo, Redo,
  Globe2, CheckCircle2, AlertCircle, RefreshCw, QrCode, MousePointerClick
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  { value: 'tiktok', label: 'TikTok', icon: Play, color: '#000000' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { value: 'telegram', label: 'Telegram', icon: Send, color: '#0088cc' },
  { value: 'email', label: 'Email', icon: Mail, color: '#EA4335' },
  { value: 'website', label: 'Site Web', icon: Globe, color: '#E11D2E' },
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
  { id: 'dark', name: 'Sombre', bg: '#0f0f1a', text: '#ffffff' },
  { id: 'gradient', name: 'Dégradé', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },
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
      className={`flex items-center gap-3 p-3 bg-card rounded-xl border border-border ${isDragging ? 'z-50' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none select-none text-muted-foreground hover:text-foreground/60">
        <GripVertical className="w-5 h-5" />
      </button>
      
      {link.thumbnail ? (
        <img src={link.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium truncate">{link.label}</p>
        <p className="text-muted-foreground text-xs truncate">{link.url}</p>
      </div>
      
      <Switch
        checked={link.is_active}
        onCheckedChange={() => onToggle(link)}
        className="data-[state=checked]:bg-success"
      />
      
      <Button variant="ghost" size="icon" onClick={() => onEdit(link)} className="text-muted-foreground hover:text-foreground hover:bg-secondary">
        <Edit2 className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={() => onDelete(link)} className="text-danger hover:text-red-300 hover:bg-danger-soft">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Sortable Block Item (unified content blocks — drag to reorder)
const SortableBlockItem = ({ block, onEdit, onDelete, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (block.is_active ? 1 : 0.5),
  };

  const blockTypeInfo = SECTION_TYPES.find(t => t.id === block.block_type) || { icon: Link, name: 'Bloc' };
  const BlockIcon = blockTypeInfo.icon;
  const isLink = block.block_type.includes('link');
  const tint = isLink ? 'rgba(225,29,46,0.18)' :
    block.block_type === 'text' ? 'rgba(34,197,94,0.2)' :
    block.block_type === 'image' ? 'rgba(236,72,153,0.2)' :
    (block.block_type === 'video' || block.block_type === 'youtube') ? 'rgba(239,68,68,0.2)' :
    block.block_type === 'carousel' ? 'rgba(168,85,247,0.2)' : 'rgba(127,127,140,0.15)';
  const iconColor = isLink ? '#E11D2E' :
    block.block_type === 'text' ? '#22c55e' :
    block.block_type === 'image' ? '#ec4899' :
    (block.block_type === 'video' || block.block_type === 'youtube') ? '#ef4444' :
    block.block_type === 'carousel' ? '#a855f7' : '#9ca3af';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-colors ${
        block.is_active ? 'bg-card border-border' : 'bg-secondary border-border'
      } ${isDragging ? 'z-50' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none select-none text-muted-foreground hover:text-foreground/60 flex-shrink-0">
        <GripVertical className="w-5 h-5" />
      </button>

      {(block.thumbnail || block.media_url) ? (
        <img src={block.thumbnail || block.media_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tint }}>
          <BlockIcon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium truncate">
          {block.label || block.content?.substring(0, 40) || blockTypeInfo.name}
        </p>
        <p className="text-muted-foreground text-xs truncate">
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
        onCheckedChange={() => onToggle(block)}
        className="data-[state=checked]:bg-success flex-shrink-0"
      />
      <Button variant="ghost" size="icon" onClick={() => onEdit(block)} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary flex-shrink-0">
        <Edit2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(block)} className="h-8 w-8 text-danger hover:text-red-300 hover:bg-danger-soft flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Social Link Item
const SocialLinkItem = ({ social, onEdit, onDelete, onToggle, stats }) => {
  const IconComponent = ICON_OPTIONS.find(i => i.value === social.icon)?.icon || Globe;
  const iconColor = ICON_OPTIONS.find(i => i.value === social.icon)?.color || '#E11D2E';
  
  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: iconColor }}
      >
        <IconComponent className="w-5 h-5 text-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-medium">{social.label || social.icon}</p>
        <p className="text-muted-foreground text-xs truncate">{social.url}</p>
      </div>
      
      {stats > 0 && (
        <Badge className="bg-brand-soft text-primary">{stats} clics</Badge>
      )}
      
      <Switch
        checked={social.is_active}
        onCheckedChange={() => onToggle(social)}
        className="data-[state=checked]:bg-success"
      />
      
      <Button variant="ghost" size="icon" onClick={() => onEdit(social)} className="text-muted-foreground hover:text-foreground hover:bg-secondary">
        <Edit2 className="w-4 h-4" />
      </Button>
      
      <Button variant="ghost" size="icon" onClick={() => onDelete(social)} className="text-danger hover:text-red-300 hover:bg-danger-soft">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

const MultilinkPage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [pageLinks, setPageLinks] = useState([]);
  const [pageStats, setPageStats] = useState(null);
  const [activeTab, setActiveTab] = useState('content');
  
  // Dialogs
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editingLink, setEditingLink] = useState(null);
  const [editingSocial, setEditingSocial] = useState(null);
  const qrRef = useRef(null);
  
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
      button_bg: '#E2E8F0',
      button_text: '#ffffff',
      button_hover: '#E2E8F0',
      accent: '#E11D2E'
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
  
  // Custom domain states
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainStatus, setDomainStatus] = useState(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  // Rattachements CRM (Documents / Contacts) — aide l'agent IA à retrouver le logo/le client
  const [crmDocuments, setCrmDocuments] = useState([]);
  const [crmContacts, setCrmContacts] = useState([]);
  const [crmDocSearch, setCrmDocSearch] = useState('');
  const [crmContactSearch, setCrmContactSearch] = useState('');
  // WS2 — générateur "depuis un logo"
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genTitle, setGenTitle] = useState('');
  const [genSlug, setGenSlug] = useState('');
  const [genTemplateId, setGenTemplateId] = useState('');
  const [genLogo, setGenLogo] = useState(null);     // dataURL
  const [genPalette, setGenPalette] = useState(null);
  const [genBusy, setGenBusy] = useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    // distance:8 → un simple clic ne déclenche pas un drag ; le drag démarre après un vrai déplacement
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  // ── WS2 : génération d'une page depuis un logo ──
  const openGenDialog = () => {
    setGenTitle(''); setGenSlug(''); setGenLogo(null); setGenPalette(null);
    setGenTemplateId(pages[0]?.id || '');
    setGenDialogOpen(true);
  };
  const handleGenLogo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { setGenLogo(e.target.result); setGenPalette(null); };
    reader.readAsDataURL(file);
  };
  const analyzeGenLogo = async () => {
    if (!genLogo) { toast.error('Choisis un logo'); return; }
    setGenBusy(true);
    try {
      const res = await api.post('/multilink/extract-palette', { image_base64: genLogo });
      setGenPalette(res.data.palette);
      toast.success('Palette extraite du logo ✨');
    } catch (e) {
      toast.error(e.response?.data?.detail || "Échec de l'analyse du logo");
    } finally { setGenBusy(false); }
  };
  const createFromTemplate = async () => {
    if (!genTemplateId) { toast.error('Choisis un template à dupliquer'); return; }
    if (!genTitle.trim()) { toast.error('Donne un nom à la page'); return; }
    setGenBusy(true);
    try {
      const res = await api.post(`/multilink/pages/${genTemplateId}/duplicate`, {
        title: genTitle.trim(),
        slug: genSlug.trim() || undefined,
        custom_colors: genPalette || undefined,
      });
      toast.success('Page générée !');
      setGenDialogOpen(false);
      await fetchPages();
      if (res.data?.id) fetchPageDetails({ id: res.data.id });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Échec de la génération');
    } finally { setGenBusy(false); }
  };

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
      setPreviewKey(k => k + 1); // refresh live phone preview after any save/refetch
      // Charger les listes CRM pour les rattachements (Documents + Contacts), une fois
      // NB: les fichiers/visuels du CRM vivent dans le file-manager (POST /file-manager/upload),
      // PAS dans /documents (système legacy vide). flat=true = tous dossiers confondus.
      api.get('/file-manager', { params: { flat: true } }).then(r => {
        const d = Array.isArray(r.data) ? r.data : (r.data?.documents || r.data?.items || []);
        setCrmDocuments(d.filter(x => x && x.id));
      }).catch(() => {});
      api.get('/contacts').then(r => {
        const c = Array.isArray(r.data) ? r.data : (r.data?.contacts || r.data?.items || []);
        setCrmContacts(c.filter(x => x && x.id));
      }).catch(() => {});
      // Initialize custom domain input
      setCustomDomainInput(response.data.custom_domain || '');
      setDomainStatus(null);
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
          button_bg: '#E2E8F0',
          button_text: '#ffffff',
          button_hover: '#E2E8F0',
          accent: '#E11D2E'
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
          button_bg: '#E2E8F0',
          button_text: '#ffffff',
          button_hover: '#E2E8F0',
          accent: '#E11D2E'
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

  const toggleLinkedDoc = (id) => setPageForm(f => {
    const cur = f.linked_document_ids || [];
    return { ...f, linked_document_ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
  });
  const toggleLinkedContact = (id) => setPageForm(f => {
    const cur = f.linked_contact_ids || [];
    return { ...f, linked_contact_ids: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
  });

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

  // ================== CUSTOM DOMAIN MANAGEMENT ==================
  
  const saveCustomDomain = async () => {
    if (!selectedPage) return;
    
    setSavingDomain(true);
    try {
      const response = await api.post(`/multilink/pages/${selectedPage.id}/custom-domain`, {
        domain: customDomainInput.trim() || null
      });
      
      toast.success(response.data.message);
      
      // Show DNS instructions if domain was set
      if (customDomainInput.trim() && response.data.instructions) {
        setDomainStatus({
          configured: true,
          dns_configured: false,
          instructions: response.data.instructions,
          custom_domain: response.data.custom_domain
        });
      } else {
        setDomainStatus(null);
      }
      
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la configuration du domaine');
    } finally {
      setSavingDomain(false);
    }
  };

  const checkDomainStatus = async () => {
    if (!selectedPage) return;
    
    setCheckingDomain(true);
    try {
      const response = await api.get(`/multilink/pages/${selectedPage.id}/domain-status`);
      setDomainStatus(response.data);
      
      if (response.data.dns_configured) {
        toast.success('DNS correctement configuré !');
      } else if (response.data.configured) {
        toast.warning('DNS non résolu - Vérifiez votre configuration CNAME');
      }
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    } finally {
      setCheckingDomain(false);
    }
  };

  const removeCustomDomain = async () => {
    if (!selectedPage) return;
    if (!window.confirm('Supprimer le domaine personnalisé ?')) return;
    
    setSavingDomain(true);
    try {
      await api.post(`/multilink/pages/${selectedPage.id}/custom-domain`, { domain: null });
      toast.success('Domaine personnalisé supprimé');
      setCustomDomainInput('');
      setDomainStatus(null);
      fetchPageDetails(selectedPage);
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setSavingDomain(false);
    }
  };

  // ================== END CUSTOM DOMAIN MANAGEMENT ==================

  // ================== QR CODE FUNCTIONS ==================
  
  const getPageUrl = () => {
    if (selectedPage?.custom_domain) {
      return `https://${selectedPage.custom_domain}`;
    }
    return `https://alphagency.fr/lien-bio/${selectedPage?.slug}`;
  };

  const downloadQrCode = (format = 'png') => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    if (format === 'svg') {
      // Download as SVG
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `qr-${selectedPage?.slug || 'page'}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    } else {
      // Download as PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new window.Image();
      
      img.onload = () => {
        canvas.width = 1024;
        canvas.height = 1024;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `qr-${selectedPage?.slug || 'page'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
    
    toast.success(`QR Code téléchargé en ${format.toUpperCase()}`);
  };

  // ================== END QR CODE FUNCTIONS ==================

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
        is_active: social.is_active !== false,
        custom_icon: social.custom_icon || ''
      });
    } else {
      setEditingSocial(null);
      setSocialForm({
        icon: 'instagram',
        url: '',
        label: '',
        is_active: true,
        custom_icon: ''
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
      label: socialForm.label || ICON_OPTIONS.find(i => i.value === socialForm.icon)?.label || socialForm.icon,
      custom_icon: socialForm.custom_icon || ''
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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Link2 className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
            Multilink
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-0.5 sm:mt-1">Créez des pages de liens professionnelles</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={openGenDialog} variant="outline" className="border-primary/40 bg-brand-soft text-primary hover:bg-brand-soft hover:text-primary w-full sm:w-auto">
            <Sparkles className="w-4 h-4 mr-2" /> Générer (IA)
          </Button>
          <Button onClick={() => openPageDialog()} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle page
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Pages List - Horizontal scroll on mobile */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-muted-foreground text-xs sm:text-sm font-medium uppercase tracking-wider">Mes pages</h2>
          
          {pages.length === 0 ? (
            <div className="bg-card rounded-xl p-6 sm:p-8 text-center border border-border">
              <Link2 className="w-10 h-10 sm:w-12 sm:h-12 text-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm sm:text-base">Aucune page créée</p>
              <Button onClick={() => openPageDialog()} className="mt-4 bg-primary hover:bg-primary/90 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> Créer ma première page
              </Button>
            </div>
          ) : (
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
              {pages.map(page => (
                <div
                  key={page.id}
                  onClick={() => fetchPageDetails(page)}
                  className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all min-w-[200px] lg:min-w-0 flex-shrink-0 lg:flex-shrink ${
                    selectedPage?.id === page.id 
                      ? 'bg-brand-soft border-2 border-primary' 
                      : 'bg-card border border-border hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    {page.profile_image ? (
                      <img src={page.profile_image} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-soft flex items-center justify-center">
                        <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium truncate flex items-center gap-1 text-sm sm:text-base">
                        {page.title}
                        {page.verified && <Verified className="w-3 h-3 sm:w-4 sm:h-4 text-info" />}
                      </p>
                      <p className="text-muted-foreground text-[10px] sm:text-xs">/{page.slug}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {page.total_views}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {page.total_clicks}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Page Editor + live phone preview */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 sm:gap-6 items-start">
          <div className="min-w-0">
          {selectedPage ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Page Header */}
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-2 bg-card">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {selectedPage.profile_image && (
                    <img src={selectedPage.profile_image} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h2 className="text-foreground font-bold flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{selectedPage.title}</span>
                      {selectedPage.verified && <Verified className="w-4 h-4 text-info flex-shrink-0" />}
                    </h2>
                    <p className="text-muted-foreground text-xs truncate">alphagency.fr/lien-bio/{selectedPage.slug}</p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyLink(selectedPage.slug)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Copier le lien"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQrDialogOpen(true)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fetchPageStats(selectedPage)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Statistiques"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(`/lien-bio/${selectedPage.slug}`, '_blank')}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Ouvrir la page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePage(selectedPage)}
                    className="h-8 w-8 text-danger hover:text-red-300 hover:bg-danger-soft"
                    title="Supprimer la page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tabs like Zaap */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto scrollbar-hide">
                  <TabsList className="w-max min-w-full bg-card border-b border-border rounded-none h-auto p-0 flex">
                    <TabsTrigger value="content" className="flex-shrink-0 px-4 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground whitespace-nowrap">
                      <Layout className="w-4 h-4 mr-2" /> Contenu
                    </TabsTrigger>
                    <TabsTrigger value="design" className="flex-shrink-0 px-4 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground whitespace-nowrap">
                      <Palette className="w-4 h-4 mr-2" /> Design
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="flex-shrink-0 px-4 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground whitespace-nowrap">
                      <Type className="w-4 h-4 mr-2" /> Profil
                    </TabsTrigger>
                    <TabsTrigger value="socials" className="flex-shrink-0 px-4 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground whitespace-nowrap">
                      <Share2 className="w-4 h-4 mr-2" /> Réseaux
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="flex-shrink-0 px-4 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground whitespace-nowrap">
                      <Search className="w-4 h-4 mr-2" /> SEO
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex-shrink-0 px-4 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground whitespace-nowrap">
                      <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* CONTENT TAB - UNIFIED BLOCKS like Zaap.bio */}
                <TabsContent value="content" className="p-4 space-y-4">
                  {/* Add Block Button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-foreground font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Blocs ({pageBlocks.length})
                    </h3>
                    <Button onClick={() => openBlockDialog()} size="sm" className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter un bloc
                    </Button>
                  </div>

                  {/* Blocks List - Unified drag & drop */}
                  {pageBlocks.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-dashed border-border">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-soft flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="text-foreground font-medium mb-2">Créez votre page</h4>
                      <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                        Ajoutez des liens, images, vidéos, textes et plus encore
                      </p>
                      <Button onClick={() => openBlockDialog()} className="bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un bloc
                      </Button>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
                      <SortableContext items={pageBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {pageBlocks.map(block => (
                            <SortableBlockItem
                              key={block.id}
                              block={block}
                              onEdit={openBlockDialog}
                              onDelete={deleteBlock}
                              onToggle={toggleBlock}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </TabsContent>

                {/* DESIGN TAB - Complete Color Customization like zaap.bio */}
                <TabsContent value="design" className="p-4 space-y-6">
                  {/* Theme Selection */}
                  <div>
                    <Label className="text-foreground mb-3 block">Thème de base</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {THEME_PRESETS.map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => setPageForm({ ...pageForm, theme: theme.id })}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            pageForm.theme === theme.id 
                              ? 'border-primary' 
                              : 'border-border hover:border-foreground/30'
                          }`}
                        >
                          <div 
                            className="w-full h-16 rounded-lg mb-2"
                            style={{ background: theme.bg }}
                          />
                          <p className="text-foreground text-xs">{theme.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Button Style */}
                  <div>
                    <Label className="text-foreground mb-3 block">Style des boutons</Label>
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
                              ? 'border-primary' 
                              : 'border-border hover:border-foreground/30'
                          }`}
                        >
                          <div className={`w-full h-8 bg-card/20 ${style.preview}`} />
                          <p className="text-foreground text-xs mt-2">{style.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full Color Customization Section - zaap.bio style */}
                  <div className="bg-card rounded-xl p-4 space-y-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Palette className="w-5 h-5 text-primary" />
                      <h4 className="text-foreground font-medium">Personnalisation des couleurs</h4>
                    </div>
                    <p className="text-muted-foreground text-xs mb-4">Personnalisez chaque élément de votre page</p>
                    
                    {/* Background Color */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Fond de page</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.background || '#0f0f1a'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, background: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                        />
                        <Input
                          value={pageForm.custom_colors?.background || '#0f0f1a'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, background: e.target.value }
                          })}
                          className="bg-card border-border text-foreground flex-1"
                          placeholder="#0f0f1a"
                        />
                      </div>
                    </div>

                    {/* Card Background Color */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Fond des cartes</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.card_bg || pageForm.custom_colors?.button_bg?.replace('#E2E8F0', '#2a2a3e') || '#2a2a3e'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, card_bg: e.target.value, button_bg: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                        />
                        <Input
                          value={pageForm.custom_colors?.card_bg || '#2a2a3e'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, card_bg: e.target.value, button_bg: e.target.value }
                          })}
                          className="bg-card border-border text-foreground flex-1"
                          placeholder="#2a2a3e"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Couleur du texte</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, text: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                        />
                        <Input
                          value={pageForm.custom_colors?.text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, text: e.target.value }
                          })}
                          className="bg-card border-border text-foreground flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Button Background */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Couleur des boutons</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.button_bg?.startsWith('#') ? pageForm.custom_colors.button_bg : '#E11D2E'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_bg: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                        />
                        <Input
                          value={pageForm.custom_colors?.button_bg || '#E11D2E'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_bg: e.target.value }
                          })}
                          className="bg-card border-border text-foreground flex-1"
                          placeholder="#E11D2E"
                        />
                      </div>
                    </div>

                    {/* Button Text Color */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Texte des boutons</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.button_text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_text: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                        />
                        <Input
                          value={pageForm.custom_colors?.button_text || '#ffffff'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, button_text: e.target.value }
                          })}
                          className="bg-card border-border text-foreground flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Couleur d'accent</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={pageForm.custom_colors?.accent || '#E11D2E'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, accent: e.target.value }
                          })}
                          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
                        />
                        <Input
                          value={pageForm.custom_colors?.accent || '#E11D2E'}
                          onChange={(e) => setPageForm({
                            ...pageForm,
                            theme: 'custom',
                            custom_colors: { ...pageForm.custom_colors, accent: e.target.value }
                          })}
                          className="bg-card border-border text-foreground flex-1"
                          placeholder="#E11D2E"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Display Options */}
                  <div className="bg-card rounded-xl p-4 space-y-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-5 h-5 text-primary" />
                      <h4 className="text-foreground font-medium">Options d'affichage</h4>
                    </div>
                    
                    {/* Show/Hide Title */}
                    <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                      <div>
                        <p className="text-foreground text-sm">Afficher le titre</p>
                        <p className="text-muted-foreground text-xs">Le titre apparaît sur la page publique</p>
                      </div>
                      <Switch
                        checked={pageForm.design_settings?.show_title !== false}
                        onCheckedChange={(checked) => setPageForm({
                          ...pageForm,
                          design_settings: { ...pageForm.design_settings, show_title: checked }
                        })}
                        className="data-[state=checked]:bg-success"
                      />
                    </div>
                  </div>

                  {/* Live Preview Mini */}
                  <div className="bg-card rounded-xl p-4 border border-border">
                    <Label className="text-muted-foreground text-sm mb-3 block">Aperçu en direct</Label>
                    <div 
                      className="rounded-xl p-4 min-h-[150px]"
                      style={{ background: pageForm.custom_colors?.background || '#0f0f1a' }}
                    >
                      <div className="text-center mb-3">
                        <div 
                          className="w-12 h-12 rounded-full mx-auto mb-2"
                          style={{ background: pageForm.custom_colors?.accent || '#E11D2E' }}
                        />
                        {pageForm.design_settings?.show_title !== false && (
                          <p style={{ color: pageForm.custom_colors?.text || '#ffffff' }} className="font-bold">Titre</p>
                        )}
                      </div>
                      <div 
                        className="rounded-xl p-3 mb-2"
                        style={{ background: pageForm.custom_colors?.card_bg || pageForm.custom_colors?.button_bg || '#E2E8F0' }}
                      >
                        <p style={{ color: pageForm.custom_colors?.text || '#ffffff' }} className="text-sm font-medium">Exemple de carte</p>
                        <p style={{ color: pageForm.custom_colors?.text || '#ffffff', opacity: 0.7 }} className="text-xs">Description du lien</p>
                      </div>
                      <div 
                        className="rounded-full py-2 px-4 text-center text-sm font-medium"
                        style={{ 
                          background: pageForm.custom_colors?.accent || '#E11D2E',
                          color: pageForm.custom_colors?.button_text || '#ffffff'
                        }}
                      >
                        Bouton
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button onClick={savePageSettings} disabled={saving} className="w-full bg-primary hover:bg-primary/90">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer le design
                  </Button>
                </TabsContent>

                {/* PROFILE TAB */}
                <TabsContent value="profile" className="p-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Titre</Label>
                      <Input
                        value={pageForm.title}
                        onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                        className="bg-card border-border text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Slug (URL)</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">/lien-bio/</span>
                        <Input
                          value={pageForm.slug}
                          onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                          className="bg-card border-border text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Bio</Label>
                    <Textarea
                      value={pageForm.bio}
                      onChange={(e) => setPageForm({ ...pageForm, bio: e.target.value })}
                      placeholder="Décrivez-vous en quelques mots..."
                      className="bg-card border-border text-foreground min-h-[100px]"
                    />
                  </div>

                  {/* Profile Image */}
                  <div className="space-y-2">
                    <Label className="text-foreground">Photo de profil</Label>
                    <div className="flex items-center gap-4">
                      {pageForm.profile_image ? (
                        <div className="relative">
                          <img src={pageForm.profile_image} alt="" className="w-24 h-24 rounded-full object-cover" />
                          <button
                            onClick={() => setPageForm({ ...pageForm, profile_image: '' })}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-danger rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-foreground" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
                          <Image className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={(e) => uploadImage(e, 'profile_image')} className="hidden" />
                        <div className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-white text-sm transition-colors">
                          {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Choisir une image'}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Banner Image */}
                  <div className="space-y-2">
                    <Label className="text-foreground">Image bannière (optionnel)</Label>
                    <div className="flex items-center gap-4">
                      {pageForm.banner_image ? (
                        <div className="relative">
                          <img src={pageForm.banner_image} alt="" className="w-40 h-24 rounded-lg object-cover" />
                          <button
                            onClick={() => setPageForm({ ...pageForm, banner_image: '' })}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-danger rounded-full flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-foreground" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-40 h-24 rounded-lg bg-secondary flex items-center justify-center border-2 border-dashed border-border">
                          <ImagePlus className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={(e) => uploadImage(e, 'banner_image')} className="hidden" />
                        <div className="px-4 py-2 bg-secondary hover:bg-card/20 rounded-lg text-foreground text-sm transition-colors">
                          Ajouter une bannière
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Page Status */}
                  <div className="flex items-center justify-between p-4 bg-card rounded-xl">
                    <div>
                      <p className="text-foreground font-medium">Page active</p>
                      <p className="text-muted-foreground text-xs">La page sera visible publiquement</p>
                    </div>
                    <Switch
                      checked={pageForm.is_active}
                      onCheckedChange={(checked) => setPageForm({ ...pageForm, is_active: checked })}
                      className="data-[state=checked]:bg-success"
                    />
                  </div>

                  {/* Rattachements CRM — relie logo/visuels (Documents) + client (Contact) pour l'agent IA */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div>
                      <Label className="text-foreground flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Rattachements CRM</Label>
                      <p className="text-muted-foreground text-xs mt-1">Reliez le logo et les visuels (Documents) et la fiche client (Contact). L'assistant IA s'en sert pour créer ou adapter cette page.</p>
                    </div>

                    {/* Documents liés */}
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Documents liés <span className="text-primary">({(pageForm.linked_document_ids || []).length})</span></p>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={crmDocSearch} onChange={(e) => setCrmDocSearch(e.target.value)} placeholder="Rechercher un document..." className="pl-9 bg-background border-border text-foreground" />
                      </div>
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                        {(() => {
                          const q = crmDocSearch.toLowerCase();
                          const list = crmDocuments.filter(d => !q || (d.name || '').toLowerCase().includes(q));
                          if (list.length === 0) return <p className="text-muted-foreground text-xs p-3 text-center">Aucun document</p>;
                          return list.slice(0, 60).map(d => {
                            const sel = (pageForm.linked_document_ids || []).includes(d.id);
                            return (
                              <button key={d.id} type="button" onClick={() => toggleLinkedDoc(d.id)} className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${sel ? 'bg-brand-soft' : 'hover:bg-secondary'}`}>
                                {d.file_type === 'image' && (d.url || d.file_url) ? (
                                  <img src={d.url || d.file_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-muted-foreground" /></div>
                                )}
                                <span className="flex-1 min-w-0 text-foreground text-sm truncate">{d.name || 'Document'}</span>
                                {sel && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Contacts liés */}
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">Contacts liés <span className="text-primary">({(pageForm.linked_contact_ids || []).length})</span></p>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input value={crmContactSearch} onChange={(e) => setCrmContactSearch(e.target.value)} placeholder="Rechercher un contact..." className="pl-9 bg-background border-border text-foreground" />
                      </div>
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                        {(() => {
                          const fmt = c => [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company || c.email || 'Contact';
                          const q = crmContactSearch.toLowerCase();
                          const list = crmContacts.filter(c => !q || fmt(c).toLowerCase().includes(q));
                          if (list.length === 0) return <p className="text-muted-foreground text-xs p-3 text-center">Aucun contact</p>;
                          return list.slice(0, 60).map(c => {
                            const sel = (pageForm.linked_contact_ids || []).includes(c.id);
                            const name = fmt(c);
                            return (
                              <button key={c.id} type="button" onClick={() => toggleLinkedContact(c.id)} className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${sel ? 'bg-brand-soft' : 'hover:bg-secondary'}`}>
                                <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center flex-shrink-0 text-primary text-xs font-semibold">{name.charAt(0).toUpperCase()}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-foreground text-sm truncate">{name}</p>
                                  {c.company && <p className="text-muted-foreground text-xs truncate">{c.company}</p>}
                                </div>
                                {sel && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>

                  <Button onClick={savePageSettings} disabled={saving} className="bg-primary hover:bg-primary/90">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer le profil
                  </Button>
                </TabsContent>

                {/* SOCIALS TAB */}
                <TabsContent value="socials" className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-foreground font-medium">Réseaux sociaux</h3>
                      <p className="text-muted-foreground text-xs">Icônes affichées en haut de votre page</p>
                    </div>
                    <Button onClick={() => openSocialDialog()} size="sm" className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                  </div>

                  {(pageForm.social_links || []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-card rounded-xl">
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
                    <Label className="text-foreground">Titre SEO</Label>
                    <Input
                      value={pageForm.seo_settings?.title || ''}
                      onChange={(e) => setPageForm({ 
                        ...pageForm, 
                        seo_settings: { ...pageForm.seo_settings, title: e.target.value }
                      })}
                      placeholder={pageForm.title}
                      className="bg-card border-border text-foreground"
                    />
                    <p className="text-muted-foreground text-xs">Titre affiché dans les résultats Google</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Description SEO</Label>
                    <Textarea
                      value={pageForm.seo_settings?.description || ''}
                      onChange={(e) => setPageForm({ 
                        ...pageForm, 
                        seo_settings: { ...pageForm.seo_settings, description: e.target.value }
                      })}
                      placeholder={pageForm.bio}
                      className="bg-card border-border text-foreground min-h-[100px]"
                    />
                    <p className="text-muted-foreground text-xs">Description affichée dans les résultats Google</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-card rounded-xl">
                    <div>
                      <p className="text-foreground font-medium">Indexation Google</p>
                      <p className="text-muted-foreground text-xs">Autoriser Google à indexer cette page</p>
                    </div>
                    <Switch
                      checked={pageForm.seo_settings?.indexable !== false}
                      onCheckedChange={(checked) => setPageForm({ 
                        ...pageForm, 
                        seo_settings: { ...pageForm.seo_settings, indexable: checked }
                      })}
                      className="data-[state=checked]:bg-success"
                    />
                  </div>

                  <Button onClick={savePageSettings} disabled={saving} className="bg-primary hover:bg-primary/90">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enregistrer le SEO
                  </Button>

                  {/* CUSTOM DOMAIN SECTION */}
                  <div className="border-t border-border pt-6 mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe2 className="w-5 h-5 text-primary" />
                      <h3 className="text-foreground font-medium">Domaine personnalisé</h3>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-4">
                      Associez un domaine personnalisé à cette page (ex: bio.votre-domaine.com)
                    </p>

                    {/* Current domain display */}
                    {selectedPage?.custom_domain && (
                      <div className="mb-4 p-3 bg-success-soft border border-success/20 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span className="text-success text-sm font-medium">
                              Domaine configuré: {selectedPage.custom_domain}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeCustomDomain}
                            disabled={savingDomain}
                            className="text-danger hover:text-red-300 hover:bg-danger-soft h-7"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Domain input */}
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={customDomainInput}
                          onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().replace(/^https?:\/\//, ''))}
                          placeholder="bio.votre-domaine.com"
                          className="bg-card border-border text-foreground flex-1"
                        />
                        <Button 
                          onClick={saveCustomDomain} 
                          disabled={savingDomain || !customDomainInput.trim()}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {savingDomain ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Configurer'
                          )}
                        </Button>
                      </div>

                      {/* Check DNS status button */}
                      {selectedPage?.custom_domain && (
                        <Button
                          variant="outline"
                          onClick={checkDomainStatus}
                          disabled={checkingDomain}
                          className="w-full border-border text-foreground hover:bg-secondary"
                        >
                          {checkingDomain ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Vérifier la configuration DNS
                        </Button>
                      )}
                    </div>

                    {/* Domain status display */}
                    {domainStatus && (
                      <div className={`mt-4 p-4 rounded-xl border ${
                        domainStatus.dns_configured 
                          ? 'bg-success-soft border-success/20' 
                          : 'bg-warning-soft border-yellow-500/20'
                      }`}>
                        <div className="flex items-start gap-3">
                          {domainStatus.dns_configured ? (
                            <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-medium ${
                              domainStatus.dns_configured ? 'text-success' : 'text-yellow-400'
                            }`}>
                              {domainStatus.dns_configured ? 'DNS configuré correctement' : 'Configuration DNS requise'}
                            </p>
                            <p className="text-muted-foreground text-sm mt-1">
                              {domainStatus.dns_message || 'Suivez les instructions ci-dessous pour configurer votre domaine.'}
                            </p>
                            
                            {/* DNS Instructions */}
                            {domainStatus.instructions && !domainStatus.dns_configured && (
                              <div className="mt-3 p-3 bg-secondary rounded-lg">
                                <p className="text-foreground text-sm font-medium mb-2">Instructions de configuration:</p>
                                <ol className="text-muted-foreground text-sm space-y-2">
                                  <li>1. Accédez à votre panneau de gestion DNS</li>
                                  <li>2. Ajoutez un enregistrement <strong className="text-foreground">CNAME</strong></li>
                                  <li className="pl-4">
                                    <span className="text-primary">Nom/Host:</span> {customDomainInput.split('.')[0] || 'bio'}
                                  </li>
                                  <li className="pl-4">
                                    <span className="text-primary">Valeur/Target:</span> 
                                    <code className="ml-1 bg-secondary px-2 py-0.5 rounded text-xs">
                                      {domainStatus.instructions?.dns_record?.split('→')[2]?.trim() || 'alphagency.fr'}
                                    </code>
                                  </li>
                                  <li>3. Attendez la propagation DNS (quelques minutes à 24h)</li>
                                  <li>4. Cliquez sur &quot;Vérifier la configuration DNS&quot; ci-dessus</li>
                                </ol>
                              </div>
                            )}

                            {/* Success URL */}
                            {domainStatus.dns_configured && domainStatus.url && (
                              <a 
                                href={domainStatus.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-success hover:text-green-300 text-sm"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ouvrir {domainStatus.url}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Help text */}
                    <div className="mt-4 p-3 bg-card rounded-lg">
                      <p className="text-muted-foreground text-xs">
                        <strong className="text-muted-foreground">💡 Conseil:</strong> Pour utiliser un sous-domaine comme <code className="bg-secondary px-1 rounded">bio.votre-site.com</code>, 
                        créez un enregistrement CNAME pointant vers notre serveur. La propagation DNS peut prendre jusqu&apos;à 24 heures.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* ANALYTICS TAB */}
                <TabsContent value="analytics" className="p-4 space-y-6">
                  {/* Quick Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-brand-soft rounded-xl p-4 border border-primary/20">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-medium">Vues totales</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{pageStats?.total_views || selectedPage?.total_views || 0}</p>
                      {pageStats?.views_growth !== undefined && (
                        <p className={`text-xs mt-1 ${pageStats.views_growth >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pageStats.views_growth >= 0 ? '+' : ''}{pageStats.views_growth}% vs période précédente
                        </p>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-success/20">
                      <div className="flex items-center gap-2 text-success mb-2">
                        <MousePointerClick className="w-4 h-4" />
                        <span className="text-xs font-medium">Clics totaux</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{pageStats?.total_clicks || selectedPage?.total_clicks || 0}</p>
                      {pageStats?.clicks_growth !== undefined && (
                        <p className={`text-xs mt-1 ${pageStats.clicks_growth >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pageStats.clicks_growth >= 0 ? '+' : ''}{pageStats.clicks_growth}% vs période précédente
                        </p>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-4 border border-amber-500/20">
                      <div className="flex items-center gap-2 text-warning mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Taux de clic</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{pageStats?.ctr || 0}%</p>
                      <p className="text-xs text-muted-foreground mt-1">CTR moyen</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl p-4 border border-pink-500/20">
                      <div className="flex items-center gap-2 text-pink-400 mb-2">
                        <Zap className="w-4 h-4" />
                        <span className="text-xs font-medium">Blocs actifs</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{pageBlocks.filter(b => b.is_active).length}</p>
                      <p className="text-xs text-muted-foreground mt-1">sur {pageBlocks.length} total</p>
                    </div>
                  </div>

                  {/* Load full stats button */}
                  {!pageStats && (
                    <Button 
                      onClick={() => fetchPageStats(selectedPage)}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Charger les analytics détaillés
                    </Button>
                  )}

                  {/* Detailed Block Stats */}
                  {pageStats?.block_stats && pageStats.block_stats.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-foreground font-medium flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-success" />
                        Clics par bloc
                      </h4>
                      <div className="space-y-2">
                        {pageStats.block_stats.map((stat, index) => (
                          <div 
                            key={stat.block_id || index}
                            className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                          >
                            {stat.thumbnail ? (
                              <img src={stat.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                                <Link className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground font-medium truncate">{stat.label}</p>
                              <p className="text-muted-foreground text-xs truncate">
                                {stat.type} {stat.url && `• ${stat.url}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-foreground font-bold">{stat.clicks}</p>
                              <p className="text-muted-foreground text-xs">clics</p>
                            </div>
                            {/* Progress bar */}
                            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (stat.clicks / Math.max(...pageStats.block_stats.map(s => s.clicks))) * 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy Link Stats */}
                  {pageStats?.link_stats && pageStats.link_stats.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-foreground font-medium flex items-center gap-2">
                        <Link className="w-4 h-4 text-primary" />
                        Clics par lien (legacy)
                      </h4>
                      <div className="space-y-2">
                        {pageStats.link_stats.map((stat, index) => (
                          <div 
                            key={stat.link_id || index}
                            className="flex items-center justify-between p-3 bg-card rounded-xl border border-border"
                          >
                            <span className="text-foreground truncate">{stat.label}</span>
                            <Badge className="bg-brand-soft text-primary">{stat.clicks} clics</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Views by day chart placeholder */}
                  {pageStats?.views_by_day && pageStats.views_by_day.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-foreground font-medium flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        Vues par jour (30 derniers jours)
                      </h4>
                      <div className="bg-card rounded-xl p-4 border border-border">
                        <div className="flex items-end gap-1 h-32">
                          {pageStats.views_by_day.slice(-30).map((day, index) => {
                            const maxViews = Math.max(...pageStats.views_by_day.map(d => d.count));
                            const height = maxViews > 0 ? (day.count / maxViews) * 100 : 0;
                            return (
                              <div 
                                key={day.date || index}
                                className="flex-1 bg-primary rounded-t-sm hover:bg-primary/80 transition-all cursor-pointer group relative"
                                style={{ height: `${Math.max(4, height)}%` }}
                                title={`${day.date}: ${day.count} vues`}
                              >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card rounded text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  {day.date}: {day.count} vues
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>{pageStats.views_by_day[0]?.date}</span>
                          <span>{pageStats.views_by_day[pageStats.views_by_day.length - 1]?.date}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!pageStats && (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p>Cliquez sur le bouton ci-dessus pour charger les analytics</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Link2 className="w-16 h-16 text-foreground/10 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Sélectionnez une page</p>
              <p className="text-muted-foreground text-sm mt-1">ou créez-en une nouvelle</p>
            </div>
          )}
          </div>

          {selectedPage && (
            <div className="hidden xl:block xl:sticky xl:top-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Aperçu en direct</Label>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary" onClick={() => setPreviewKey(k => k + 1)} title="Rafraîchir l'aperçu">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary" onClick={() => window.open(`/lien-bio/${selectedPage.slug}`, '_blank')} title="Ouvrir dans un onglet">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mx-auto w-[300px] rounded-[2.5rem] border-[10px] border-[#0e0e12] bg-[#0e0e12] shadow-pop ring-1 ring-border/60">
                <div className="relative overflow-hidden rounded-[1.8rem] bg-black" style={{ aspectRatio: '300 / 620' }}>
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 h-5 w-24 rounded-full bg-[#0e0e12]" />
                  <iframe
                    key={previewKey}
                    src={`/lien-bio/${selectedPage.slug}?preview=1`}
                    title="Aperçu de la page"
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                  />
                </div>
              </div>
              <p className="text-center text-muted-foreground text-[11px] mt-3">Aperçu de la version publiée · mis à jour à chaque enregistrement</p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Page Creation Dialog */}
      {/* WS2 — Générer une page depuis un logo (IA) */}
      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" /> Générer une page depuis un logo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-muted-foreground text-sm">Charge le logo du client : l'IA en extrait les couleurs, puis on duplique un template à sa charte.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-foreground">Nom de la page *</Label>
                <Input value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="Ex : Fit Holistik" className="bg-background border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Slug (optionnel)</Label>
                <Input value={genSlug} onChange={(e) => setGenSlug(e.target.value)} placeholder="auto-généré" className="bg-background border-border text-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground">Template à dupliquer</Label>
              <select value={genTemplateId} onChange={(e) => setGenTemplateId(e.target.value)} className="w-full rounded-lg bg-background border border-border text-foreground px-3 py-2 text-sm">
                {pages.length === 0 && <option value="">Aucune page existante</option>}
                {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <p className="text-muted-foreground text-xs">La structure (blocs, réseaux) de ce template est copiée, avec les nouvelles couleurs.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground">Logo du client</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-16 h-16 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
                  {genLogo ? <img src={genLogo} alt="" className="w-full h-full object-contain" /> : <ImagePlus className="w-6 h-6 text-muted-foreground" />}
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGenLogo(e.target.files?.[0])} />
                  <span className="inline-flex items-center px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm hover:bg-secondary/80">
                    <ImagePlus className="w-4 h-4 mr-2" /> Choisir un logo
                  </span>
                </label>
                <Button onClick={analyzeGenLogo} disabled={!genLogo || genBusy} variant="outline" className="border-primary/40 text-primary hover:bg-brand-soft">
                  {genBusy && !genPalette ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Analyser
                </Button>
              </div>
            </div>

            {genPalette && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Palette extraite</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['background','accent','button_bg','text','button_text'].filter(k => genPalette[k]).map(k => (
                    <div key={k} className="flex flex-col items-center gap-1">
                      <div className="w-9 h-9 rounded-lg border border-border" style={{ background: genPalette[k] }} />
                      <span className="text-[10px] text-muted-foreground">{genPalette[k]}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl p-4 mt-1" style={{ background: genPalette.background || '#0f0f1a' }}>
                  <p className="text-center font-bold mb-2" style={{ color: genPalette.text || '#ffffff' }}>{genTitle || 'Aperçu'}</p>
                  <div className="rounded-full py-2 text-center text-sm font-medium" style={{ background: genPalette.button_bg || genPalette.accent, color: genPalette.button_text || '#ffffff' }}>Bouton</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setGenDialogOpen(false)} className="border-border text-foreground">Annuler</Button>
            <Button onClick={createFromTemplate} disabled={genBusy || !genTemplateId} className="bg-primary hover:bg-primary/90">
              {genBusy && genPalette ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Générer la page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Link2 className="w-5 h-5 text-primary" />
              {editingPage ? 'Modifier la page' : 'Nouvelle page'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-foreground">Titre *</Label>
              <Input
                value={pageForm.title}
                onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                placeholder="Mon Linktree"
                className="bg-card border-border text-foreground"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-foreground">Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm whitespace-nowrap">/lien-bio/</span>
                <Input
                  value={pageForm.slug}
                  onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="auto-généré"
                  className="bg-card border-border text-foreground"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPageDialogOpen(false)} className="border-border text-foreground">
              Annuler
            </Button>
            <Button onClick={savePage} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPage ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Link className="w-5 h-5 text-primary" />
              {editingLink ? 'Modifier le lien' : 'Ajouter un lien'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLinkDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Thumbnail Upload */}
            <div className="space-y-2">
              <Label className="text-foreground">Image de la carte (optionnel)</Label>
              <p className="text-muted-foreground text-xs mb-2">📐 Format recommandé : 1200×630px (ratio 1.91:1)</p>
              <div className="flex items-center gap-4">
                {linkForm.thumbnail ? (
                  <div className="relative">
                    <img 
                      src={linkForm.thumbnail} 
                      alt="" 
                      className="w-24 h-24 rounded-xl object-cover border border-border"
                    />
                    <button
                      onClick={() => setLinkForm({ ...linkForm, thumbnail: '' })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-card border-2 border-dashed border-border flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
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
                  <div className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-white text-sm transition-colors text-center">
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Choisir une image'}
                  </div>
                </label>
              </div>
              <p className="text-muted-foreground text-xs">L'image apparaîtra sur la carte du lien comme sur zaap.bio</p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Label *</Label>
              <Input
                value={linkForm.label}
                onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                placeholder="Mon site web"
                className="bg-card border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">URL *</Label>
              <Input
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="https://example.com"
                className="bg-card border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Description (optionnel)</Label>
              <Input
                value={linkForm.description}
                onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                placeholder="Courte description..."
                className="bg-card border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Icône</Label>
              <Select value={linkForm.icon} onValueChange={(value) => setLinkForm({ ...linkForm, icon: value })}>
                <SelectTrigger className="bg-card border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-secondary border-border max-h-60">
                  {ICON_OPTIONS.map(option => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value} className="text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: option.color }}>
                            <Icon className="w-3 h-3 text-foreground" />
                          </div>
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-card rounded-lg">
              <span className="text-foreground">Lien actif</span>
              <Switch
                checked={linkForm.is_active}
                onCheckedChange={(checked) => setLinkForm({ ...linkForm, is_active: checked })}
                className="data-[state=checked]:bg-success"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)} className="border-border text-foreground">
              Annuler
            </Button>
            <Button onClick={saveLink} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingLink ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social Dialog */}
      <Dialog open={socialDialogOpen} onOpenChange={setSocialDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Share2 className="w-5 h-5 text-primary" />
              {editingSocial ? 'Modifier' : 'Ajouter un réseau social'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSocialDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Réseau social</Label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.filter(i => ['instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'tiktok', 'whatsapp', 'telegram', 'email', 'website'].includes(i.value)).map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSocialForm({ ...socialForm, icon: option.value })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        socialForm.icon === option.value 
                          ? 'border-primary bg-brand-soft' 
                          : 'border-border hover:border-foreground/30'
                      }`}
                    >
                      <div 
                        className="w-8 h-8 mx-auto rounded-full flex items-center justify-center"
                        style={{ background: option.color }}
                      >
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">URL du profil *</Label>
              <Input
                value={socialForm.url}
                onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                placeholder="https://instagram.com/monprofil"
                className="bg-card border-border text-foreground"
              />
            </div>

            {/* Custom Icon Image - especially useful for website */}
            <div className="space-y-2">
              <Label className="text-foreground">Icône personnalisée (optionnel)</Label>
              <p className="text-muted-foreground text-xs">Remplace l'icône par défaut par votre propre image</p>
              <div className="flex items-center gap-4">
                {socialForm.custom_icon ? (
                  <div className="relative">
                    <img 
                      src={socialForm.custom_icon} 
                      alt="" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-border" 
                    />
                    <button
                      type="button"
                      onClick={() => setSocialForm({ ...socialForm, custom_icon: '' })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3 h-3 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-secondary border border-dashed border-border flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const response = await api.post('/multilink/upload-media', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        setSocialForm(prev => ({ ...prev, custom_icon: response.data.url }));
                        toast.success('Image uploadée');
                      } catch (error) {
                        toast.error('Erreur upload');
                      }
                    }} 
                    className="hidden" 
                  />
                  <div className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-white text-sm cursor-pointer">
                    Uploader une image
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-card rounded-lg">
              <span className="text-foreground">Actif</span>
              <Switch
                checked={socialForm.is_active}
                onCheckedChange={(checked) => setSocialForm({ ...socialForm, is_active: checked })}
                className="data-[state=checked]:bg-success"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSocialDialogOpen(false)} className="border-border text-foreground">
              Annuler
            </Button>
            <Button onClick={saveSocial} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSocial ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <LayoutGrid className="w-5 h-5 text-primary" />
              {editingSection ? 'Modifier la section' : 'Ajouter une section'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSectionDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Block Type Selection - zaap.bio style with categories */}
            <div className="space-y-3">
              <Label className="text-foreground">Choisir un type de bloc</Label>
              
              {/* Category: Basics */}
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Basiques</p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_CATEGORIES.basics.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSectionForm({ ...sectionForm, section_type: type.id })}
                        className={`p-3 rounded-xl border transition-all text-left flex items-start gap-3 ${
                          sectionForm.section_type === type.id 
                            ? 'border-primary bg-brand-soft' 
                            : 'border-border hover:border-foreground/30 hover:bg-secondary'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground text-sm font-medium">{type.name}</p>
                          <p className="text-muted-foreground text-xs line-clamp-1">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Category: Content */}
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Contenu</p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_CATEGORIES.content.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSectionForm({ ...sectionForm, section_type: type.id })}
                        className={`p-3 rounded-xl border transition-all text-left flex items-start gap-3 ${
                          sectionForm.section_type === type.id 
                            ? 'border-blue-500 bg-info-soft' 
                            : 'border-border hover:border-foreground/30 hover:bg-secondary'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-info-soft flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-info" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground text-sm font-medium">{type.name}</p>
                          <p className="text-muted-foreground text-xs line-clamp-1">{type.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div className="space-y-2">
              <Label className="text-foreground">Titre (optionnel)</Label>
              <Input
                value={sectionForm.title}
                onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                placeholder="Titre de la section"
                className="bg-card border-border text-foreground"
              />
            </div>

            {/* Content for Text/Header sections */}
            {(sectionForm.section_type === 'text' || sectionForm.section_type === 'header') && (
              <div className="space-y-2">
                <Label className="text-foreground">Contenu *</Label>
                <Textarea
                  value={sectionForm.content}
                  onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                  placeholder="Votre texte ici..."
                  className="bg-card border-border text-foreground min-h-[100px]"
                />
              </div>
            )}

            {/* Carousel/Folder Items */}
            {(sectionForm.section_type === 'carousel' || sectionForm.section_type === 'folder') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">Éléments du carousel</Label>
                    <p className="text-muted-foreground text-xs mt-0.5">📐 Images: 400×500px (ratio 4:5)</p>
                  </div>
                  <Button size="sm" onClick={addCarouselItem} className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
                
                {sectionForm.items.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-card rounded-xl">
                    <p className="text-sm">Aucun élément</p>
                    <p className="text-xs mt-1">Ajoutez des cartes comme sur zaap.bio</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {sectionForm.items.map((item, index) => (
                      <div key={index} className="p-3 bg-card rounded-xl border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Élément {index + 1}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeCarouselItem(index)} className="text-danger hover:text-red-300 h-6 w-6 p-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          value={item.image}
                          onChange={(e) => updateCarouselItem(index, 'image', e.target.value)}
                          placeholder="URL de l'image (400×500px recommandé)"
                          className="bg-card border-border text-foreground text-sm"
                        />
                        <Input
                          value={item.title}
                          onChange={(e) => updateCarouselItem(index, 'title', e.target.value)}
                          placeholder="Titre"
                          className="bg-card border-border text-foreground text-sm"
                        />
                        <Input
                          value={item.subtitle}
                          onChange={(e) => updateCarouselItem(index, 'subtitle', e.target.value)}
                          placeholder="Sous-titre (optionnel)"
                          className="bg-card border-border text-foreground text-sm"
                        />
                        <Input
                          value={item.url}
                          onChange={(e) => updateCarouselItem(index, 'url', e.target.value)}
                          placeholder="URL au clic (optionnel)"
                          className="bg-card border-border text-foreground text-sm"
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
                <Label className="text-foreground">URLs des images (une par ligne)</Label>
                <p className="text-muted-foreground text-xs">📐 Format carré recommandé: 600×600px</p>
                <Textarea
                  value={sectionForm.images.join('\n')}
                  onChange={(e) => setSectionForm({ ...sectionForm, images: e.target.value.split('\n').filter(url => url.trim()) })}
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  className="bg-card border-border text-foreground min-h-[100px]"
                />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-card rounded-lg">
              <span className="text-foreground">Section active</span>
              <Switch
                checked={sectionForm.is_active}
                onCheckedChange={(checked) => setSectionForm({ ...sectionForm, is_active: checked })}
                className="data-[state=checked]:bg-success"
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)} className="border-border text-foreground">
              Annuler
            </Button>
            <Button onClick={saveSection} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSection ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UNIFIED BLOCK DIALOG - Zaap.bio style avec WYSIWYG */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {blockForm.block_type === 'link_image' && <><Image className="w-5 h-5 text-primary" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Lien + image</>}
              {blockForm.block_type === 'link' && <><Link className="w-5 h-5 text-primary" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Lien</>}
              {blockForm.block_type === 'text' && <><Type className="w-5 h-5 text-primary" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Bloc de texte</>}
              {blockForm.block_type === 'button' && <><ExternalLink className="w-5 h-5 text-primary" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Bouton</>}
              {blockForm.block_type === 'image' && <><Image className="w-5 h-5 text-pink-400" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Image</>}
              {blockForm.block_type === 'video' && <><Video className="w-5 h-5 text-danger" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Vidéo</>}
              {blockForm.block_type === 'youtube' && <><Youtube className="w-5 h-5 text-danger" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Vidéo YouTube</>}
              {blockForm.block_type === 'carousel' && <><LayoutGrid className="w-5 h-5 text-primary" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Carrousel</>}
              {blockForm.block_type === 'header' && <><Heading className="w-5 h-5 text-info" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Titre</>}
              {blockForm.block_type === 'divider' && <><Minus className="w-5 h-5 text-muted-foreground" /> {editingBlock ? 'Modifier' : 'Nouveau'} : Séparateur</>}
              {!editingBlock && !['link_image','link','text','button','image','video','youtube','carousel','header','divider'].includes(blockForm.block_type) && <>
                <Sparkles className="w-5 h-5 text-primary" /> Ajouter un bloc
              </>}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBlockDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Block Type Selection - Only show when adding new */}
            {!editingBlock && (
              <div className="space-y-3">
                <Label className="text-foreground">Type de bloc</Label>
                
                {/* Links */}
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Liens</p>
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
                            ? 'border-primary bg-brand-soft' 
                            : 'border-border hover:border-foreground/30'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-soft flex items-center justify-center flex-shrink-0">
                          <type.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-foreground text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media */}
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Médias</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'image', name: 'Image', icon: Image, bgColor: 'bg-pink-500/20', color: 'text-pink-400' },
                      { id: 'video', name: 'Vidéo', icon: Video, bgColor: 'bg-danger-soft', color: 'text-danger' },
                      { id: 'youtube', name: 'YouTube', icon: Youtube, bgColor: 'bg-danger-soft', color: 'text-danger' },
                      { id: 'carousel', name: 'Carrousel', icon: LayoutGrid, bgColor: 'bg-brand-soft', color: 'text-primary' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setBlockForm({ ...blockForm, block_type: type.id })}
                        className={`p-2.5 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                          blockForm.block_type === type.id 
                            ? 'border-primary bg-brand-soft' 
                            : 'border-border hover:border-foreground/30'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${type.bgColor} flex items-center justify-center`}>
                          <type.icon className={`w-5 h-5 ${type.color}`} />
                        </div>
                        <span className="text-foreground text-xs">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Contenu</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'text', name: 'Texte', icon: FileText, bgColor: 'bg-success-soft', color: 'text-success' },
                      { id: 'header', name: 'Titre', icon: Heading, bgColor: 'bg-info-soft', color: 'text-info' },
                      { id: 'divider', name: 'Séparateur', icon: Minus, bgColor: 'bg-secondary', color: 'text-muted-foreground' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setBlockForm({ ...blockForm, block_type: type.id })}
                        className={`p-2.5 rounded-xl border transition-all text-left flex items-center gap-2 ${
                          blockForm.block_type === type.id 
                            ? 'border-success bg-success-soft' 
                            : 'border-border hover:border-foreground/30'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${type.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <type.icon className={`w-4 h-4 ${type.color}`} />
                        </div>
                        <span className="text-foreground text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============ LINK + IMAGE FORM (zaap.bio style) ============ */}
            {blockForm.block_type === 'link_image' && (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">Modifie le lien et son image.</p>
                
                {/* Heading (Label) */}
                <div className="space-y-2">
                  <Label className="text-foreground">Heading *</Label>
                  <Input
                    value={blockForm.label}
                    onChange={(e) => setBlockForm({ ...blockForm, label: e.target.value })}
                    placeholder="Site Web"
                    className="bg-card border-border text-foreground"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-foreground">Description</Label>
                  <Textarea
                    value={blockForm.description}
                    onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                    placeholder="Démarquez-vous avec Alpha Agency, votre agence de marketing digital..."
                    className="bg-card border-border text-foreground min-h-[80px]"
                  />
                </div>

                {/* Link URL */}
                <div className="space-y-2">
                  <Label className="text-foreground">URL du lien *</Label>
                  <Input
                    value={blockForm.url}
                    onChange={(e) => setBlockForm({ ...blockForm, url: e.target.value })}
                    placeholder="https://alphagency.fr/"
                    className="bg-card border-border text-foreground"
                  />
                </div>

                {/* Open link in */}
                <div className="space-y-2">
                  <Label className="text-foreground">Open link in:</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={blockForm.settings?.open_in !== 'new_tab' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, open_in: 'same_tab' } })}
                      className={blockForm.settings?.open_in !== 'new_tab' ? 'bg-primary' : 'border-border text-muted-foreground'}
                    >
                      Same Tab
                    </Button>
                    <Button
                      type="button"
                      variant={blockForm.settings?.open_in === 'new_tab' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, open_in: 'new_tab' } })}
                      className={blockForm.settings?.open_in === 'new_tab' ? 'bg-primary' : 'border-border text-muted-foreground'}
                    >
                      New Tab
                    </Button>
                  </div>
                </div>

                {/* Button Text */}
                <div className="space-y-2">
                  <Label className="text-foreground">Texte du bouton *</Label>
                  <Input
                    value={blockForm.settings?.button_text || 'En Savoir +'}
                    onChange={(e) => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, button_text: e.target.value } })}
                    placeholder="En Savoir +"
                    className="bg-card border-border text-foreground"
                  />
                </div>

                {/* Image Upload - Only upload, no URL option */}
                <div className="space-y-2">
                  <Label className="text-foreground">Image</Label>
                  <div className="bg-card rounded-xl p-4 border border-border">
                    {blockForm.thumbnail ? (
                      <div className="relative">
                        <img src={blockForm.thumbnail} alt="" className="w-full h-48 rounded-xl object-contain bg-secondary" />
                        <button
                          type="button"
                          onClick={() => setBlockForm({ ...blockForm, thumbnail: '' })}
                          className="absolute top-2 right-2 w-8 h-8 bg-danger rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-4 h-4 text-foreground" />
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
                        <div className="flex flex-col items-center py-8 border-2 border-dashed border-border rounded-xl hover:border-primary/40 transition-colors">
                          {uploadingBlockMedia ? (
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                          ) : (
                            <>
                              <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center mb-3">
                                <ImagePlus className="w-8 h-8 text-primary" />
                              </div>
                              <p className="text-foreground font-medium">Cliquer pour uploader</p>
                              <p className="text-muted-foreground text-xs mt-1">JPG, PNG, WebP (max 10MB)</p>
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
                  <Label className="text-foreground">Label *</Label>
                  <Input
                    value={blockForm.label}
                    onChange={(e) => setBlockForm({ ...blockForm, label: e.target.value })}
                    placeholder="Mon lien"
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">URL *</Label>
                  <Input
                    value={blockForm.url}
                    onChange={(e) => setBlockForm({ ...blockForm, url: e.target.value })}
                    placeholder="https://..."
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Description (optionnel)</Label>
                  <Input
                    value={blockForm.description}
                    onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                    placeholder="Courte description..."
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Icône</Label>
                  <Select value={blockForm.icon || 'link'} onValueChange={(value) => setBlockForm({ ...blockForm, icon: value })}>
                    <SelectTrigger className="bg-card border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border max-h-60">
                      {ICON_OPTIONS.map(option => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value} className="text-foreground">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: option.color }}>
                                <Icon className="w-3 h-3 text-foreground" />
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
                  <Label className="text-foreground">Texte du bouton *</Label>
                  <Input
                    value={blockForm.label}
                    onChange={(e) => setBlockForm({ ...blockForm, label: e.target.value })}
                    placeholder="Découvrir"
                    className="bg-card border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">URL *</Label>
                  <Input
                    value={blockForm.url}
                    onChange={(e) => setBlockForm({ ...blockForm, url: e.target.value })}
                    placeholder="https://..."
                    className="bg-card border-border text-foreground"
                  />
                </div>
              </>
            )}

            {/* ============ TEXT BLOCK WITH WYSIWYG ============ */}
            {blockForm.block_type === 'text' && (
              <div className="space-y-2" data-color-mode="dark">
                <p className="text-muted-foreground text-sm mb-4">Share text, notes, or information on your page.</p>
                <MDEditor
                  value={blockForm.content || ''}
                  onChange={(value) => setBlockForm({ ...blockForm, content: value || '' })}
                  preview="edit"
                  height={250}
                  textareaProps={{
                    placeholder: "Nous sommes convaincus que la clé du succès réside dans une collaboration étroite avec nos clients...",
                  }}
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderRadius: '8px',
                  }}
                />
                <p className="text-muted-foreground text-xs mt-2">Utilisez Markdown pour le formatage: **gras**, *italique*, # titre, - liste</p>
              </div>
            )}

            {/* ============ HEADER BLOCK ============ */}
            {blockForm.block_type === 'header' && (
              <div className="space-y-2">
                <Label className="text-foreground">Titre *</Label>
                <Input
                  value={blockForm.content}
                  onChange={(e) => setBlockForm({ ...blockForm, content: e.target.value })}
                  placeholder="Votre titre..."
                  className="bg-card border-border text-foreground text-xl font-bold"
                />
              </div>
            )}

            {/* ============ IMAGE/VIDEO UPLOAD ============ */}
            {['image', 'video'].includes(blockForm.block_type) && (
              <div className="space-y-2">
                <Label className="text-foreground">
                  {blockForm.block_type === 'image' ? 'Image' : 'Vidéo'} *
                </Label>
                <p className="text-muted-foreground text-xs">
                  {blockForm.block_type === 'image' ? '📐 Formats: JPG, PNG, WebP (max 10MB)' : '📹 Formats: MP4, MOV, WebM (max 100MB)'}
                </p>
                <div className="flex flex-col items-center gap-3 p-4 bg-card rounded-xl border border-dashed border-border">
                  {blockForm.media_url ? (
                    <div className="relative w-full">
                      {blockForm.media_type === 'image' || blockForm.block_type === 'image' ? (
                        <img src={blockForm.media_url} alt="" className="w-full h-48 rounded-lg object-contain bg-secondary" />
                      ) : (
                        <video src={blockForm.media_url} className="w-full h-48 rounded-lg object-contain bg-secondary" controls />
                      )}
                      <button
                        onClick={() => setBlockForm({ ...blockForm, media_url: '', media_type: '' })}
                        className="absolute top-2 right-2 w-8 h-8 bg-danger rounded-full flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-foreground" />
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
                      <div className="flex flex-col items-center py-8 border-2 border-dashed border-border rounded-xl hover:border-primary/40 transition-colors">
                        {uploadingBlockMedia ? (
                          <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center mb-3">
                              {blockForm.block_type === 'image' ? <Image className="w-8 h-8 text-primary" /> : <Video className="w-8 h-8 text-primary" />}
                            </div>
                            <p className="text-foreground font-medium">Cliquer pour uploader</p>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
                
                {/* Aspect ratio & Rounded settings */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-xs">Format</Label>
                    <Select 
                      value={blockForm.settings?.aspect_ratio || 'auto'} 
                      onValueChange={(value) => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, aspect_ratio: value } })}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="auto" className="text-foreground">Auto</SelectItem>
                        <SelectItem value="1:1" className="text-foreground">1:1 (Carré)</SelectItem>
                        <SelectItem value="4:5" className="text-foreground">4:5 (Portrait)</SelectItem>
                        <SelectItem value="16:9" className="text-foreground">16:9 (Paysage)</SelectItem>
                        <SelectItem value="9:16" className="text-foreground">9:16 (Story)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground text-xs">Bords arrondis</Label>
                    <Select 
                      value={blockForm.settings?.rounded || 'lg'} 
                      onValueChange={(value) => setBlockForm({ ...blockForm, settings: { ...blockForm.settings, rounded: value } })}
                    >
                      <SelectTrigger className="bg-card border-border text-foreground text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="none" className="text-foreground">Aucun</SelectItem>
                        <SelectItem value="sm" className="text-foreground">Léger</SelectItem>
                        <SelectItem value="md" className="text-foreground">Moyen</SelectItem>
                        <SelectItem value="lg" className="text-foreground">Arrondi</SelectItem>
                        <SelectItem value="full" className="text-foreground">Cercle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ============ YOUTUBE URL ============ */}
            {blockForm.block_type === 'youtube' && (
              <div className="space-y-2">
                <Label className="text-foreground">URL YouTube *</Label>
                <Input
                  value={blockForm.youtube_url}
                  onChange={(e) => setBlockForm({ ...blockForm, youtube_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-card border-border text-foreground"
                />
                <p className="text-muted-foreground text-xs">Collez le lien d'une vidéo YouTube</p>
              </div>
            )}

            {/* ============ CAROUSEL ITEMS - Enhanced with 3 types ============ */}
            {blockForm.block_type === 'carousel' && (
              <div className="space-y-4">
                {/* Add Element Buttons */}
                <div>
                  <Label className="text-foreground mb-3 block">Ajouter un élément</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => addBlockCarouselItem('image')}
                      className="p-3 rounded-xl border border-border hover:border-pink-500/50 hover:bg-pink-500/10 transition-all flex flex-col items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                        <Image className="w-5 h-5 text-pink-400" />
                      </div>
                      <span className="text-foreground text-xs">Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlockCarouselItem('video')}
                      className="p-3 rounded-xl border border-border hover:border-red-500/50 hover:bg-danger-soft transition-all flex flex-col items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-lg bg-danger-soft flex items-center justify-center">
                        <Video className="w-5 h-5 text-danger" />
                      </div>
                      <span className="text-foreground text-xs">Vidéo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlockCarouselItem('link_image')}
                      className="p-3 rounded-xl border border-border hover:border-primary/40 hover:brightness-110/10 transition-all flex flex-col items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-lg bg-brand-soft flex items-center justify-center">
                        <Link className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-foreground text-xs">Image + Lien</span>
                    </button>
                  </div>
                </div>
                
                {/* Elements List */}
                {blockForm.items.length === 0 ? (
                  <div className="text-center py-8 bg-card rounded-xl text-muted-foreground">
                    <LayoutGrid className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun élément dans le carrousel</p>
                    <p className="text-xs mt-1">Cliquez sur un type ci-dessus pour ajouter</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {blockForm.items.map((item, index) => (
                      <div key={index} className="p-4 bg-card rounded-xl border border-border">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">#{index + 1}</span>
                            <Badge className={
                              item.type === 'video' ? 'bg-danger-soft text-danger' :
                              item.type === 'link_image' ? 'bg-brand-soft text-primary' :
                              'bg-pink-100 text-pink-700'
                            }>
                              {item.type === 'video' ? 'Vidéo' : item.type === 'link_image' ? 'Image + Lien' : 'Image'}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeBlockCarouselItem(index)} 
                            className="text-danger hover:text-red-300 h-7 w-7 p-0"
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
                                  className="w-full h-32 rounded-lg object-cover bg-secondary" 
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
                                className="absolute top-2 right-2 w-7 h-7 bg-danger rounded-full flex items-center justify-center hover:bg-red-600"
                              >
                                <X className="w-4 h-4 text-foreground" />
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
                              <div className="flex flex-col items-center py-6 border-2 border-dashed border-border rounded-xl hover:border-primary/40 transition-colors">
                                {uploadingBlockMedia ? (
                                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                ) : (
                                  <>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${
                                      item.type === 'video' ? 'bg-danger-soft' : 'bg-pink-500/20'
                                    }`}>
                                      {item.type === 'video' ? (
                                        <Video className="w-6 h-6 text-danger" />
                                      ) : (
                                        <ImagePlus className="w-6 h-6 text-pink-400" />
                                      )}
                                    </div>
                                    <p className="text-foreground text-sm">Cliquer pour uploader</p>
                                    <p className="text-muted-foreground text-xs mt-1">
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
                            className="bg-card border-border text-foreground text-sm h-9"
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
                                className="bg-card border-border text-foreground text-sm min-h-[60px]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={item.url || ''}
                                onChange={(e) => updateBlockCarouselItem(index, 'url', e.target.value)}
                                placeholder="URL du lien *"
                                className="bg-card border-border text-foreground text-sm h-9"
                              />
                              <Input
                                value={item.button_text || 'En Savoir +'}
                                onChange={(e) => updateBlockCarouselItem(index, 'button_text', e.target.value)}
                                placeholder="Texte du bouton"
                                className="bg-card border-border text-foreground text-sm h-9"
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
              <div className="flex items-center justify-between p-3 bg-card rounded-lg">
                <span className="text-foreground">Bloc actif</span>
                <Switch
                  checked={blockForm.is_active}
                  onCheckedChange={(checked) => setBlockForm({ ...blockForm, is_active: checked })}
                  className="data-[state=checked]:bg-success"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)} className="border-border text-foreground">
              Cancel
            </Button>
            <Button onClick={saveBlock} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingBlock ? 'Apply Changes' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog - Enhanced Analytics */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-3xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <div 
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
          >
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              Analytics - {selectedPage?.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStatsDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {pageStats && (
            <div className="space-y-6">
              {/* Period Info */}
              <div className="flex items-center justify-between text-muted-foreground text-sm">
                <span>Période : {pageStats.period_days} derniers jours</span>
                <span className="text-muted-foreground">Comparé aux {pageStats.period_days} jours précédents</span>
              </div>

              {/* KPIs with Growth */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-info-soft rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Eye className="w-6 h-6 text-info" />
                    {pageStats.views_growth !== 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pageStats.views_growth > 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                        {pageStats.views_growth > 0 ? '+' : ''}{pageStats.views_growth}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{pageStats.total_views.toLocaleString()}</p>
                  <p className="text-muted-foreground text-sm">Vues totales</p>
                  {pageStats.prev_total_views > 0 && (
                    <p className="text-muted-foreground text-xs mt-1">vs {pageStats.prev_total_views.toLocaleString()} précédemment</p>
                  )}
                </div>
                <div className="bg-success-soft rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-6 h-6 text-success" />
                    {pageStats.clicks_growth !== 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pageStats.clicks_growth > 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                        {pageStats.clicks_growth > 0 ? '+' : ''}{pageStats.clicks_growth}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{pageStats.total_clicks.toLocaleString()}</p>
                  <p className="text-muted-foreground text-sm">Clics totaux</p>
                  {pageStats.prev_total_clicks > 0 && (
                    <p className="text-muted-foreground text-xs mt-1">vs {pageStats.prev_total_clicks.toLocaleString()} précédemment</p>
                  )}
                </div>
                <div className="bg-brand-soft rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{pageStats.ctr}%</p>
                  <p className="text-muted-foreground text-sm">Taux de conversion</p>
                  <p className="text-muted-foreground text-xs mt-1">Clics / Vues</p>
                </div>
              </div>

              {/* Mini Chart - Views by Day */}
              {pageStats.views_by_day?.length > 0 && (
                <div className="bg-card rounded-xl p-4">
                  <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Vues par jour
                  </h3>
                  <div className="flex items-end gap-1 h-24">
                    {pageStats.views_by_day.slice(-14).map((day, i) => {
                      const max = Math.max(...pageStats.views_by_day.map(d => d.count));
                      const height = max > 0 ? (day.count / max) * 100 : 0;
                      return (
                        <div 
                          key={i} 
                          className="flex-1 bg-primary/40 rounded-t hover:brightness-110 transition-colors group relative"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${day.date}: ${day.count} vues`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                            {day.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-muted-foreground text-xs">
                    <span>{pageStats.views_by_day[0]?.date?.slice(5)}</span>
                    <span>{pageStats.views_by_day[pageStats.views_by_day.length - 1]?.date?.slice(5)}</span>
                  </div>
                </div>
              )}

              {/* Block Stats - NEW */}
              {pageStats.block_stats?.length > 0 && (
                <div>
                  <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                    Performance des blocs
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pageStats.block_stats.map((block, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-secondary transition-colors">
                        <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                        {block.thumbnail && (
                          <img src={block.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{block.label}</p>
                          <p className="text-muted-foreground text-xs">{block.type}</p>
                        </div>
                        <Badge className="bg-brand-soft text-primary">{block.clicks} clics</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link Stats - Legacy */}
              {pageStats.link_stats?.length > 0 && (
                <div>
                  <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <Link className="w-4 h-4 text-primary" />
                    Performance des liens (legacy)
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pageStats.link_stats.map((link, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-secondary transition-colors">
                        <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                        <span className="flex-1 text-foreground truncate">{link.label}</span>
                        <Badge className="bg-brand-soft text-primary">{link.clicks} clics</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No data message */}
              {(!pageStats.block_stats?.length && !pageStats.link_stats?.length && pageStats.total_views === 0) && (
                <div className="text-center py-8 bg-card rounded-xl">
                  <BarChart3 className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune donnée pour cette période</p>
                  <p className="text-muted-foreground text-sm mt-1">Partagez votre page pour commencer à collecter des statistiques</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setStatsDialogOpen(false)} className="border-border text-foreground">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <QrCode className="w-5 h-5 text-primary" />
              QR Code - {selectedPage?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* QR Code Preview */}
            <div 
              ref={qrRef}
              className="bg-card rounded-2xl p-6 mx-auto w-fit"
            >
              <QRCodeSVG 
                value={getPageUrl()}
                size={200}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            {/* URL Display */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-1">URL de la page</p>
              <p className="text-foreground font-medium break-all text-sm bg-card rounded-lg px-3 py-2">
                {getPageUrl()}
              </p>
            </div>

            {/* Download Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={() => downloadQrCode('png')}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                PNG (1024px)
              </Button>
              <Button 
                onClick={() => downloadQrCode('svg')}
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                SVG
              </Button>
            </div>

            {/* Tips */}
            <div className="bg-card rounded-lg p-3">
              <p className="text-muted-foreground text-xs">
                <strong className="text-muted-foreground">💡 Conseil:</strong> Le format PNG est idéal pour les impressions (cartes de visite, flyers). Le format SVG est vectoriel et peut être agrandi sans perte de qualité.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)} className="border-border text-foreground">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultilinkPage;
