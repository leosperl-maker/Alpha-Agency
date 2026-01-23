/**
 * Social Media Management - Agorapulse-style Interface
 * Multi-Entity, Multi-Account System with Publishing, Inbox, Reports
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, Send, MessageSquare, Settings, Plus, Clock, CheckCircle,
  AlertCircle, Facebook, Instagram, Linkedin, Image, Video, FileText,
  ChevronLeft, ChevronRight, MoreVertical, Trash2, Edit, Eye, Filter,
  Inbox, Archive, Star, Reply, Loader2, RefreshCw, List, Grid,
  Upload, ChevronDown, CalendarDays, LayoutList, Monitor, Smartphone,
  Heart, MessageCircle, Share2, BarChart3, Users, Building2, Link2,
  CheckSquare, Square, Layers, Globe, TrendingUp, PieChart, Download,
  Play, Pause, Zap, Hash, MapPin, AtSign, Smile, X, Copy, Save,
  FileImage, Film, Sparkles, AlertTriangle, Info, ExternalLink, 
  ChevronUp, LayoutDashboard, Mail, Bell, Search, SlidersHorizontal
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Checkbox } from '../../components/ui/checkbox';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from '../../components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger
} from '../../components/ui/popover';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '../../components/ui/tooltip';
import { toast } from 'sonner';
import api from '../../lib/api';
import SocialComposer from '../../components/SocialComposer';

// ==================== CONSTANTS ====================

const PLATFORMS = {
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2', bgColor: 'bg-[#1877F2]' },
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F', bgColor: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', bgColor: 'bg-[#0A66C2]' },
  tiktok: { name: 'TikTok', icon: Play, color: '#000000', bgColor: 'bg-black' },
};

const POST_STATUSES = {
  draft: { label: 'Brouillon', color: 'bg-slate-500/20 text-slate-400', icon: FileText },
  scheduled: { label: 'Programmé', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  publishing: { label: 'Publication...', color: 'bg-yellow-500/20 text-yellow-400', icon: Loader2 },
  published: { label: 'Publié', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  failed: { label: 'Échec', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
};

const POST_TYPES = {
  feed: { label: 'Publication', icon: Image },
  reel: { label: 'Reel/Short', icon: Film },
  story: { label: 'Story', icon: Layers },
  carousel: { label: 'Carrousel', icon: FileImage },
};

// ==================== COMPONENTS ====================

// Platform Icon with color
const PlatformIcon = ({ platform, className = "w-4 h-4", showBg = false }) => {
  const config = PLATFORMS[platform];
  if (!config) return <Globe className={className} />;
  const Icon = config.icon;
  
  if (showBg) {
    return (
      <div className={`${config.bgColor} p-1.5 rounded-lg`}>
        <Icon className={`${className} text-white`} />
      </div>
    );
  }
  
  return <Icon className={className} style={{ color: config.color }} />;
};

// Status Badge
const StatusBadge = ({ status }) => {
  const config = POST_STATUSES[status] || POST_STATUSES.draft;
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} border-none text-xs gap-1`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

// Entity Badge with color dot
const EntityBadge = ({ entity, size = "sm" }) => {
  if (!entity) return null;
  return (
    <div className={`flex items-center gap-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <div 
        className={`${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} rounded-full`}
        style={{ backgroundColor: entity.color }}
      />
      <span className="text-white/80">{entity.name}</span>
    </div>
  );
};

// Capability indicator
const CapabilityIndicator = ({ capability, label, available }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 text-xs ${available ? 'text-green-400' : 'text-white/30'}`}>
            {available ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
            <span>{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {available ? `${label} disponible` : `${label} non disponible via API`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Account Card
const AccountCard = ({ account, selected, onToggle, onDisconnect }) => {
  const platform = PLATFORMS[account.platform];
  
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
        ${selected 
          ? 'border-indigo-500 bg-indigo-500/10' 
          : 'border-white/10 bg-white/5 hover:bg-white/10'
        }`}
      onClick={() => onToggle(account.id)}
    >
      <div className="relative">
        {account.profile_picture_url ? (
          <img 
            src={account.profile_picture_url} 
            alt={account.display_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${platform?.bgColor || 'bg-white/10'}`}>
            <PlatformIcon platform={account.platform} className="w-5 h-5 text-white" />
          </div>
        )}
        <div 
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: platform?.color }}
        >
          <PlatformIcon platform={account.platform} className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{account.display_name}</p>
        <p className="text-white/50 text-xs truncate">@{account.username || account.external_id}</p>
      </div>
      
      <div className="flex items-center gap-2">
        {account.status === 'active' ? (
          <Badge className="bg-green-500/20 text-green-400 border-none text-xs">Actif</Badge>
        ) : (
          <Badge className="bg-red-500/20 text-red-400 border-none text-xs">Erreur</Badge>
        )}
        
        <Checkbox 
          checked={selected}
          onCheckedChange={() => onToggle(account.id)}
          className="border-white/30"
        />
      </div>
    </div>
  );
};

// ==================== ENTITY SELECTOR ====================

const EntitySelector = ({ entities, selectedEntity, onSelect, accounts, selectedAccountIds, onAccountsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const entityAccounts = selectedEntity 
    ? accounts.filter(a => a.entity_ids?.includes(selectedEntity.id))
    : [];
  
  const allSelected = entityAccounts.length > 0 && 
    entityAccounts.every(a => selectedAccountIds.includes(a.id));
  
  const toggleAll = () => {
    if (allSelected) {
      onAccountsChange([]);
    } else {
      onAccountsChange(entityAccounts.map(a => a.id));
    }
  };
  
  return (
    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3">
      {/* Entity Dropdown */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-white hover:bg-white/10 h-auto py-2"
          >
            {selectedEntity ? (
              <>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedEntity.color }}
                />
                <span className="font-medium">{selectedEntity.name}</span>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                <span>Sélectionner une entité</span>
              </>
            )}
            <ChevronDown className="w-4 h-4 text-white/50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 bg-slate-900 border-white/10">
          <div className="space-y-1">
            {entities.map(entity => (
              <button
                key={entity.id}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
                  ${selectedEntity?.id === entity.id 
                    ? 'bg-indigo-500/20 text-white' 
                    : 'text-white/80 hover:bg-white/10'
                  }`}
                onClick={() => {
                  onSelect(entity);
                  setIsOpen(false);
                }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entity.color }}
                />
                <span className="flex-1">{entity.name}</span>
                <span className="text-xs text-white/40">{entity.account_count} comptes</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      <Separator orientation="vertical" className="h-8 bg-white/10" />
      
      {/* Accounts Multi-Select */}
      {selectedEntity && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {entityAccounts.slice(0, 4).map(account => (
              <TooltipProvider key={account.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`relative p-0.5 rounded-full transition-all
                        ${selectedAccountIds.includes(account.id) 
                          ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' 
                          : 'opacity-50 hover:opacity-100'
                        }`}
                      onClick={() => {
                        if (selectedAccountIds.includes(account.id)) {
                          onAccountsChange(selectedAccountIds.filter(id => id !== account.id));
                        } else {
                          onAccountsChange([...selectedAccountIds, account.id]);
                        }
                      }}
                    >
                      {account.profile_picture_url ? (
                        <img 
                          src={account.profile_picture_url} 
                          alt={account.display_name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${PLATFORMS[account.platform]?.bgColor || 'bg-white/20'}`}>
                          <PlatformIcon platform={account.platform} className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {account.display_name} ({PLATFORMS[account.platform]?.name})
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {entityAccounts.length > 4 && (
              <span className="text-xs text-white/50 ml-1">+{entityAccounts.length - 4}</span>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-xs text-white/60 hover:text-white h-7"
          >
            {allSelected ? 'Désélectionner tout' : 'Tout sélectionner'}
          </Button>
          
          <Badge className="bg-indigo-500/20 text-indigo-400 border-none">
            {selectedAccountIds.length} actif{selectedAccountIds.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}
      
      {!selectedEntity && (
        <p className="text-white/40 text-sm">
          Sélectionnez une entité pour voir les comptes
        </p>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const SocialMediaPage = () => {
  // Navigation state
  const [activeSection, setActiveSection] = useState('publishing');
  const [activeSubSection, setActiveSubSection] = useState('calendar');
  
  // Entity & Account state
  const [entities, setEntities] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  
  // Posts state
  const [posts, setPosts] = useState([]);
  const [calendarPosts, setCalendarPosts] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [newEntity, setNewEntity] = useState({ name: '', color: '#6366f1', description: '' });
  const [savingEntity, setSavingEntity] = useState(false);
  
  // Stats
  const [stats, setStats] = useState(null);

  // ==================== META OAUTH HANDLING ====================
  
  // Handle OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // Handle Meta callback
    if (urlParams.get('meta_callback') && code) {
      handleMetaCallback(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Handle LinkedIn callback
    else if (urlParams.get('linkedin_callback') && code) {
      handleLinkedInCallback(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Handle TikTok callback
    else if (urlParams.get('tiktok_callback') && code) {
      handleTikTokCallback(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  const handleMetaCallback = async (code) => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/admin/social-media?meta_callback=true`;
      const response = await api.post('/meta/exchange-token', { code, redirect_uri: redirectUri });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Compte Meta connecté avec succès !');
        // Fetch pages after successful connection
        await fetchMetaPages();
        // Sync Meta accounts to new social system
        await syncMetaAccounts();
        // Reload all data
        await loadData();
      }
    } catch (error) {
      console.error("Meta callback error:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de la connexion Meta");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInCallback = async (code) => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/admin/social-media?linkedin_callback=true`;
      const response = await api.post('/linkedin/exchange-token', { code, redirect_uri: redirectUri });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Compte LinkedIn connecté !');
        await loadData();
      }
    } catch (error) {
      console.error("LinkedIn callback error:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de la connexion LinkedIn");
    } finally {
      setLoading(false);
    }
  };

  const handleTikTokCallback = async (code) => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/admin/social-media?tiktok_callback=true`;
      const response = await api.post('/tiktok/exchange-token', { code, redirect_uri: redirectUri });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Compte TikTok connecté !');
        await loadData();
      }
    } catch (error) {
      console.error("TikTok callback error:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de la connexion TikTok");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMetaPages = async () => {
    try {
      const response = await api.get('/meta/pages');
      if (response.data && response.data.length > 0) {
        toast.success(`${response.data.length} page(s) Facebook récupérée(s)`);
      }
      return response.data;
    } catch (error) {
      console.error("Error fetching Meta pages:", error);
      // Not an error if not connected
    }
  };
  
  const syncMetaAccounts = async () => {
    try {
      const response = await api.post('/social/sync-meta-accounts');
      if (response.data.synced > 0) {
        toast.success(`${response.data.synced} compte(s) synchronisé(s)`);
      }
      return response.data;
    } catch (error) {
      console.error("Error syncing Meta accounts:", error);
      // Try again on next load
    }
  };

  // ==================== DATA LOADING ====================
  
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entitiesRes, accountsRes, statsRes] = await Promise.all([
        api.get('/social/entities'),
        api.get('/social/accounts'),
        api.get('/social/stats/overview')
      ]);
      
      setEntities(entitiesRes.data || []);
      setAccounts(accountsRes.data || []);
      setStats(statsRes.data || {});
      
      // Auto-select first entity if available
      if (entitiesRes.data?.length > 0 && !selectedEntity) {
        setSelectedEntity(entitiesRes.data[0]);
      }
      
      // Also check for Meta pages
      try {
        const pagesRes = await api.get('/meta/pages');
        if (pagesRes.data && pagesRes.data.length > 0) {
          // Meta is connected, we have pages
          console.log('Meta pages available:', pagesRes.data.length);
        }
      } catch (e) {
        // Meta not connected, that's fine
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    }
    setLoading(false);
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEntity) params.append('entity_id', selectedEntity.id);
      
      const response = await api.get(`/social/posts?${params.toString()}`);
      setPosts(response.data?.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }, [selectedEntity]);

  const loadCalendarPosts = useCallback(async () => {
    if (!selectedEntity) return;
    
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    try {
      const params = new URLSearchParams({
        entity_id: selectedEntity.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
      
      if (selectedAccountIds.length > 0) {
        params.append('account_ids', selectedAccountIds.join(','));
      }
      
      const response = await api.get(`/social/calendar?${params.toString()}`);
      setCalendarPosts(response.data || {});
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  }, [selectedEntity, selectedAccountIds, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedEntity) {
      loadPosts();
      loadCalendarPosts();
    }
  }, [selectedEntity, loadPosts, loadCalendarPosts]);

  // ==================== HANDLERS ====================

  const handleEntitySelect = (entity) => {
    setSelectedEntity(entity);
    // Reset account selection to all accounts of this entity
    const entityAccountIds = accounts
      .filter(a => a.entity_ids?.includes(entity.id))
      .map(a => a.id);
    setSelectedAccountIds(entityAccountIds);
  };

  const handleConnectMeta = async () => {
    try {
      const response = await api.get('/meta/auth-url');
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.error('Erreur lors de la connexion Meta');
    }
  };

  const handleConnectLinkedIn = async () => {
    try {
      const response = await api.get('/linkedin/auth-url');
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Error getting LinkedIn auth URL:', error);
      toast.error('Erreur lors de la connexion LinkedIn');
    }
  };

  const handleConnectTikTok = async () => {
    try {
      const response = await api.get('/tiktok/auth-url');
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Error getting TikTok auth URL:', error);
      toast.error('Erreur lors de la connexion TikTok');
    }
  };

  const handleCreateEntity = async () => {
    if (!newEntity.name.trim()) {
      toast.error('Le nom de l\'entité est requis');
      return;
    }
    
    setSavingEntity(true);
    try {
      const response = await api.post('/social/entities', newEntity);
      toast.success(`Entité "${response.data.name}" créée avec succès`);
      setShowEntityModal(false);
      setNewEntity({ name: '', color: '#6366f1', description: '' });
      // Reload entities
      await loadData();
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSavingEntity(false);
    }
  };

  const handleDeleteEntity = async (entityId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entité ?')) return;
    
    try {
      await api.delete(`/social/entities/${entityId}`);
      toast.success('Entité supprimée');
      await loadData();
      if (selectedEntity?.id === entityId) {
        setSelectedEntity(null);
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleLinkAccountToEntity = async (entityId, accountId) => {
    if (entityId === 'none') {
      // Unlink from all entities
      try {
        await api.delete(`/social/accounts/${accountId}/entities`);
        toast.success('Compte dissocié de l\'entité');
        await loadData();
      } catch (error) {
        console.error('Error unlinking account:', error);
        toast.error('Erreur lors de la dissociation');
      }
      return;
    }
    
    try {
      await api.post(`/social/entities/${entityId}/accounts/${accountId}`);
      toast.success('Compte lié à l\'entité');
      await loadData();
    } catch (error) {
      console.error('Error linking account:', error);
      toast.error('Erreur lors de la liaison');
    }
  };

  const handleDisconnectAccount = async (accountId) => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter ce compte ?')) return;
    
    try {
      await api.delete(`/social/accounts/${accountId}`);
      toast.success('Compte déconnecté');
      await loadData();
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // ==================== RENDER SECTIONS ====================

  const renderPublishing = () => (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1">
        {[
          { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
          { id: 'queue', label: 'File d\'attente', icon: LayoutList },
          { id: 'drafts', label: 'Brouillons', icon: FileText },
          { id: 'published', label: 'Publiés', icon: CheckCircle },
        ].map(item => (
          <Button
            key={item.id}
            variant={activeSubSection === item.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveSubSection(item.id)}
            className={activeSubSection === item.id ? 'bg-indigo-600' : 'text-white/60'}
          >
            <item.icon className="w-4 h-4 mr-1" />
            {item.label}
          </Button>
        ))}
      </div>
      
      {/* Calendar View */}
      {activeSubSection === 'calendar' && renderCalendar()}
      
      {/* Queue View */}
      {activeSubSection === 'queue' && renderQueue('scheduled')}
      
      {/* Drafts View */}
      {activeSubSection === 'drafts' && renderQueue('draft')}
      
      {/* Published View */}
      {activeSubSection === 'published' && renderQueue('published')}
    </div>
  );

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Monday = 1
    
    const days = [];
    // Previous month padding
    for (let i = 1; i < startDay; i++) {
      const day = new Date(year, month, 1 - (startDay - i));
      days.push({ date: day, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }
    
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(new Date(year, month - 1))}
              className="text-white/60 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-white font-medium min-w-[150px] text-center">
              {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(new Date(year, month + 1))}
              className="text-white/60 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={() => setShowComposer(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Créer un post
          </Button>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Weekday headers */}
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-white/50 border-b border-white/10">
              {day}
            </div>
          ))}
          
          {/* Days */}
          {days.map((day, idx) => {
            const dateStr = day.date.toISOString().split('T')[0];
            const dayPosts = calendarPosts[dateStr] || [];
            const isToday = day.date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={idx}
                className={`min-h-[100px] p-1 border-b border-r border-white/5 
                  ${day.isCurrentMonth ? '' : 'bg-white/[0.02]'}
                  ${isToday ? 'bg-indigo-500/10' : ''}
                  hover:bg-white/5 transition-colors cursor-pointer`}
                onClick={() => {
                  setEditingPost(null);
                  setShowComposer(true);
                }}
              >
                <div className={`text-xs p-1 ${day.isCurrentMonth ? 'text-white/80' : 'text-white/30'}
                  ${isToday ? 'bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                  {day.date.getDate()}
                </div>
                
                <div className="space-y-0.5 mt-1">
                  {dayPosts.slice(0, 3).map(post => (
                    <div 
                      key={post.id}
                      className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPost(post);
                        setShowComposer(true);
                      }}
                    >
                      {post.content?.substring(0, 20)}...
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <div className="text-xs text-white/40 px-1">
                      +{dayPosts.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQueue = (status) => {
    const filteredPosts = posts.filter(p => p.status === status);
    
    return (
      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun post {status === 'draft' ? 'en brouillon' : status === 'scheduled' ? 'programmé' : 'publié'}</p>
            <Button 
              onClick={() => setShowComposer(true)}
              className="mt-4 bg-indigo-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer un post
            </Button>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div 
              key={post.id}
              className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              {/* Media preview */}
              {post.media_urls?.[0] ? (
                <img 
                  src={post.media_urls[0]} 
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white/30" />
                </div>
              )}
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={post.status} />
                  {post.account_ids?.map(accId => {
                    const acc = accounts.find(a => a.id === accId);
                    return acc ? (
                      <PlatformIcon key={accId} platform={acc.platform} className="w-4 h-4" />
                    ) : null;
                  })}
                </div>
                
                <p className="text-white text-sm line-clamp-2 mb-2">{post.content}</p>
                
                <div className="flex items-center gap-4 text-xs text-white/50">
                  {post.scheduled_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(post.scheduled_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white/40 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
                  <DropdownMenuItem className="text-white/80">
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-white/80">
                    <Copy className="w-4 h-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem className="text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderInbox = () => (
    <div className="flex h-[calc(100vh-280px)] bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* Thread list */}
      <div className="w-80 border-r border-white/10">
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              placeholder="Rechercher..." 
              className="pl-9 bg-white/5 border-white/10"
            />
          </div>
        </div>
        
        <div className="p-4 text-center text-white/40">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Aucune conversation</p>
          <p className="text-xs mt-1">Les commentaires et messages apparaîtront ici</p>
        </div>
      </div>
      
      {/* Message detail */}
      <div className="flex-1 flex items-center justify-center text-white/40">
        <div className="text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Sélectionnez une conversation</p>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs">Posts totaux</p>
                <p className="text-2xl font-bold text-white">{stats?.total_posts || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs">Publiés</p>
                <p className="text-2xl font-bold text-green-400">{stats?.published || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs">Programmés</p>
                <p className="text-2xl font-bold text-blue-400">{stats?.scheduled || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs">Entités</p>
                <p className="text-2xl font-bold text-purple-400">{stats?.entities_count || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts placeholder */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">Performance par entité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-white/40">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Les statistiques détaillées seront disponibles après les premières publications</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAccounts = () => (
    <div className="space-y-6">
      {/* Entities Management */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white text-lg">Entités</CardTitle>
            <CardDescription className="text-white/50">
              Gérez vos marques et clients
            </CardDescription>
          </div>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setShowEntityModal(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle entité
          </Button>
        </CardHeader>
        <CardContent>
          {entities.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune entité créée</p>
              <p className="text-sm mt-1">Créez des entités pour organiser vos comptes par marque/client</p>
              <Button 
                className="mt-4 bg-indigo-600"
                onClick={() => setShowEntityModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Créer ma première entité
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {entities.map(entity => (
                <div 
                  key={entity.id}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: entity.color + '30' }}
                      >
                        <Building2 className="w-5 h-5" style={{ color: entity.color }} />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{entity.name}</h4>
                        <p className="text-white/50 text-xs">{entity.account_count} comptes liés</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDeleteEntity(entity.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {accounts
                      .filter(a => a.entity_ids?.includes(entity.id))
                      .slice(0, 5)
                      .map(acc => (
                        <PlatformIcon key={acc.id} platform={acc.platform} className="w-4 h-4" />
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Connected Accounts */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white text-lg">Comptes connectés</CardTitle>
            <CardDescription className="text-white/50">
              {accounts.length} compte{accounts.length > 1 ? 's' : ''} connecté{accounts.length > 1 ? 's' : ''}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-indigo-600">
                <Plus className="w-4 h-4 mr-1" />
                Connecter un compte
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-white/10">
              <DropdownMenuLabel className="text-white/50">Plateformes</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleConnectMeta} className="text-white/80 cursor-pointer">
                <Facebook className="w-4 h-4 mr-2 text-[#1877F2]" />
                Facebook / Instagram
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleConnectLinkedIn} className="text-white/80 cursor-pointer">
                <Linkedin className="w-4 h-4 mr-2 text-[#0A66C2]" />
                LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleConnectTikTok} className="text-white/80 cursor-pointer">
                <Play className="w-4 h-4 mr-2" />
                TikTok
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun compte connecté</p>
              <p className="text-sm mt-1">Connectez vos réseaux sociaux pour commencer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(account => (
                <div 
                  key={account.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5"
                >
                  <div className="relative">
                    {account.profile_picture_url ? (
                      <img 
                        src={account.profile_picture_url} 
                        alt={account.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${PLATFORMS[account.platform]?.bgColor || 'bg-white/10'}`}>
                        <PlatformIcon platform={account.platform} className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div 
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900"
                      style={{ backgroundColor: PLATFORMS[account.platform]?.color }}
                    >
                      <PlatformIcon platform={account.platform} className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{account.display_name}</h4>
                    <p className="text-white/50 text-sm">@{account.username || account.external_id}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {account.status === 'active' ? (
                      <Badge className="bg-green-500/20 text-green-400 border-none">Actif</Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-none">Erreur</Badge>
                    )}
                    
                    {/* Entity assignment */}
                    <Select 
                      value={account.entity_ids?.[0] || ''} 
                      onValueChange={(entityId) => handleLinkAccountToEntity(entityId, account.id)}
                    >
                      <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white text-sm">
                        <SelectValue placeholder="Assigner à..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="none">
                          <span className="text-white/50">Aucune entité</span>
                        </SelectItem>
                        {entities.map(entity => (
                          <SelectItem key={entity.id} value={entity.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entity.color }} />
                              {entity.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDisconnectAccount(account.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ==================== MAIN RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Media</h1>
          <p className="text-white/50 text-sm">
            Gérez vos publications sur tous vos réseaux
          </p>
        </div>
      </div>
      
      {/* Entity & Account Selector */}
      <EntitySelector
        entities={entities}
        selectedEntity={selectedEntity}
        onSelect={handleEntitySelect}
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
        onAccountsChange={setSelectedAccountIds}
      />
      
      {/* Main Navigation */}
      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1.5">
        {[
          { id: 'publishing', label: 'Publishing', icon: Send },
          { id: 'inbox', label: 'Inbox', icon: Inbox, badge: 0 },
          { id: 'reports', label: 'Reports', icon: BarChart3 },
          { id: 'accounts', label: 'Accounts', icon: Users },
        ].map(item => (
          <Button
            key={item.id}
            variant={activeSection === item.id ? 'default' : 'ghost'}
            onClick={() => setActiveSection(item.id)}
            className={`flex-1 ${activeSection === item.id ? 'bg-indigo-600' : 'text-white/60 hover:text-white'}`}
          >
            <item.icon className="w-4 h-4 mr-2" />
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <Badge className="ml-2 bg-red-500 text-white border-none text-xs">
                {item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </div>
      
      {/* Content */}
      <div className="mt-4">
        {activeSection === 'publishing' && renderPublishing()}
        {activeSection === 'inbox' && renderInbox()}
        {activeSection === 'reports' && renderReports()}
        {activeSection === 'accounts' && renderAccounts()}
      </div>
      
      {/* Composer Pro Modal */}
      <SocialComposer
        open={showComposer}
        onOpenChange={setShowComposer}
        entities={entities}
        accounts={accounts}
        selectedEntity={selectedEntity}
        selectedAccountIds={selectedAccountIds}
        editingPost={editingPost}
        onSuccess={() => {
          loadPosts();
          loadCalendarPosts();
        }}
      />
      
      {/* Entity Creation Modal */}
      <Dialog open={showEntityModal} onOpenChange={setShowEntityModal}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Nouvelle Entité</DialogTitle>
            <DialogDescription className="text-white/60">
              Créez une entité pour regrouper vos comptes par marque ou client
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/80">Nom de l'entité *</Label>
              <Input
                placeholder="Ex: Mon Client, Ma Marque..."
                value={newEntity.name}
                onChange={(e) => setNewEntity({...newEntity, name: e.target.value})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white/80">Couleur</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newEntity.color}
                  onChange={(e) => setNewEntity({...newEntity, color: e.target.value})}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <div className="flex gap-2">
                  {['#6366f1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'].map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full transition-transform ${newEntity.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewEntity({...newEntity, color})}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white/80">Description (optionnel)</Label>
              <Textarea
                placeholder="Une brève description..."
                value={newEntity.description}
                onChange={(e) => setNewEntity({...newEntity, description: e.target.value})}
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={2}
              />
            </div>
            
            {/* Preview */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 mb-2">Aperçu</p>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: newEntity.color + '30' }}
                >
                  <Building2 className="w-5 h-5" style={{ color: newEntity.color }} />
                </div>
                <div>
                  <h4 className="text-white font-medium">{newEntity.name || 'Nom de l\'entité'}</h4>
                  <p className="text-white/50 text-xs">0 comptes liés</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowEntityModal(false);
                setNewEntity({ name: '', color: '#6366f1', description: '' });
              }}
              className="text-white/60 hover:text-white"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateEntity}
              disabled={!newEntity.name.trim() || savingEntity}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {savingEntity ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Créer l'entité
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialMediaPage;
