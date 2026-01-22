import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Grid3X3, List, ChevronLeft, ChevronRight,
  Image, Video, Film, Circle, Images, Trash2, Edit, Eye, MoreVertical,
  Copy, Archive, Clock, User, Link as LinkIcon, MessageSquare, Target,
  Sparkles, Upload, X, Check, GripVertical, Instagram, Facebook, Linkedin, Youtube,
  Wand2, Loader2, Lightbulb, Hash, MousePointerClick
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { toast } from 'sonner';
import api from '../../lib/api';
import SocialPreviewModal from '../../components/SocialPreviewModal';

// Network icons mapping
const NetworkIcon = ({ network, className = "w-4 h-4" }) => {
  const icons = {
    instagram: <Instagram className={className} />,
    facebook: <Facebook className={className} />,
    linkedin: <Linkedin className={className} />,
    youtube: <Youtube className={className} />,
    tiktok: <span className={`${className} font-bold`}>T</span>
  };
  return icons[network] || null;
};

// Format icons mapping
const FormatIcon = ({ format, className = "w-4 h-4" }) => {
  const icons = {
    post: <Image className={className} />,
    carrousel: <Images className={className} />,
    reel: <Film className={className} />,
    video: <Video className={className} />,
    story: <Circle className={className} />
  };
  return icons[format] || <Image className={className} />;
};

const EditorialCalendarPage = () => {
  // State
  const [calendars, setCalendars] = useState([]);
  const [posts, setPosts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({
    networks: [],
    formats: [],
    statuses: [],
    pillars: [],
    objectives: []
  });
  const [loading, setLoading] = useState(true);
  
  // View state
  const [viewMode, setViewMode] = useState('calendar'); // calendar, trello
  const [calendarView, setCalendarView] = useState('month'); // month, week
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState('all');
  const [filters, setFilters] = useState({
    network: '',
    format: '',
    status: ''
  });
  
  // Modal states
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  
  // Form states
  const [calendarForm, setCalendarForm] = useState({
    title: '',
    contact_id: '',
    description: '',
    color: '#6366f1'
  });
  
  const [postForm, setPostForm] = useState({
    calendar_id: '',
    title: '',
    caption: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    networks: [],
    format_type: 'post',
    content_pillar: '',
    objective: '',
    cta: '',
    status: 'idea',
    assigned_to: '',
    external_links: '',
    notes: ''
  });

  // AI Assistant states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiResult, setAiResult] = useState(null);

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [calendarsRes, settingsRes, contactsRes] = await Promise.all([
        api.get('/editorial/calendars'),
        api.get('/editorial/settings'),
        api.get('/contacts')
      ]);
      
      setCalendars(calendarsRes.data || []);
      setSettings(settingsRes.data || {});
      setContacts(contactsRes.data || []);
      
      // Load posts based on current view
      await loadPosts();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    }
    setLoading(false);
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedCalendarId && selectedCalendarId !== 'all') {
        params.append('calendar_id', selectedCalendarId);
      }
      if (filters.network) params.append('network', filters.network);
      if (filters.format) params.append('format_type', filters.format);
      if (filters.status) params.append('status', filters.status);
      
      // Date range based on view
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
      params.append('start_date', startDate.toISOString().split('T')[0]);
      params.append('end_date', endDate.toISOString().split('T')[0]);
      
      const response = await api.get(`/editorial/posts?${params.toString()}`);
      setPosts(response.data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }, [selectedCalendarId, filters, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      loadPosts();
    }
  }, [loadPosts, selectedCalendarId, filters, currentDate, loading]);

  // Calendar CRUD
  const handleSaveCalendar = async () => {
    try {
      if (editingCalendar) {
        await api.put(`/editorial/calendars/${editingCalendar.id}`, calendarForm);
        toast.success('Calendrier mis à jour');
      } else {
        await api.post('/editorial/calendars', calendarForm);
        toast.success('Calendrier créé');
      }
      setShowCalendarModal(false);
      resetCalendarForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteCalendar = async (calendarId) => {
    if (!window.confirm('Supprimer ce calendrier et tous ses posts ?')) return;
    try {
      await api.delete(`/editorial/calendars/${calendarId}`);
      toast.success('Calendrier supprimé');
      loadData();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  const handleDuplicateCalendar = async (calendarId) => {
    try {
      await api.post(`/editorial/calendars/${calendarId}/duplicate`);
      toast.success('Calendrier dupliqué');
      loadData();
    } catch (error) {
      toast.error('Erreur duplication');
    }
  };

  // Post CRUD
  const handleSavePost = async () => {
    if (!postForm.calendar_id || !postForm.title) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    
    try {
      if (editingPost) {
        await api.put(`/editorial/posts/${editingPost.id}`, postForm);
        toast.success('Post mis à jour');
      } else {
        await api.post('/editorial/posts', postForm);
        toast.success('Post créé');
      }
      setShowPostModal(false);
      resetPostForm();
      loadPosts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Supprimer ce post ?')) return;
    try {
      await api.delete(`/editorial/posts/${postId}`);
      toast.success('Post supprimé');
      loadPosts();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  const handleMovePost = async (postId, newDate) => {
    try {
      await api.put(`/editorial/posts/${postId}/move?scheduled_date=${newDate}`);
      loadPosts();
    } catch (error) {
      toast.error('Erreur déplacement');
    }
  };

  // AI Assistant
  const handleAIAssist = async () => {
    if (!aiTopic.trim()) {
      toast.error('Veuillez entrer un sujet');
      return;
    }

    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await api.post('/editorial/ai/assist', {
        topic: aiTopic,
        networks: postForm.networks,
        format_type: postForm.format_type,
        content_pillar: postForm.content_pillar,
        objective: postForm.objective,
        client_context: ''
      });

      if (response.data.success) {
        setAiResult(response.data.data);
        toast.success('Suggestions générées !');
      } else {
        toast.error('Erreur lors de la génération');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur IA');
    }

    setAiLoading(false);
  };

  const applyAICaption = () => {
    if (aiResult?.caption) {
      setPostForm(prev => ({ ...prev, caption: aiResult.caption }));
      toast.success('Légende appliquée');
    }
  };

  const applyAICTA = () => {
    if (aiResult?.cta) {
      setPostForm(prev => ({ ...prev, cta: aiResult.cta }));
      toast.success('CTA appliqué');
    }
  };

  // Form helpers
  const resetCalendarForm = () => {
    setCalendarForm({ title: '', contact_id: '', description: '', color: '#6366f1' });
    setEditingCalendar(null);
  };

  const resetPostForm = () => {
    setPostForm({
      calendar_id: selectedCalendarId !== 'all' ? selectedCalendarId : '',
      title: '',
      caption: '',
      scheduled_date: '',
      scheduled_time: '09:00',
      networks: [],
      format_type: 'post',
      content_pillar: '',
      objective: '',
      cta: '',
      status: 'idea',
      assigned_to: '',
      external_links: '',
      notes: ''
    });
    setEditingPost(null);
  };

  const openEditCalendar = (calendar) => {
    setEditingCalendar(calendar);
    setCalendarForm({
      title: calendar.title,
      contact_id: calendar.contact_id || '',
      description: calendar.description || '',
      color: calendar.color || '#6366f1'
    });
    setShowCalendarModal(true);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostForm({
      calendar_id: post.calendar_id,
      title: post.title,
      caption: post.caption || '',
      scheduled_date: post.scheduled_date || '',
      scheduled_time: post.scheduled_time || '09:00',
      networks: post.networks || [],
      format_type: post.format_type || 'post',
      content_pillar: post.content_pillar || '',
      objective: post.objective || '',
      cta: post.cta || '',
      status: post.status || 'idea',
      assigned_to: post.assigned_to || '',
      external_links: post.external_links || '',
      notes: post.notes || ''
    });
    setShowPostModal(true);
  };

  const openNewPost = (date = null) => {
    resetPostForm();
    if (date) {
      setPostForm(prev => ({ ...prev, scheduled_date: date }));
    }
    setShowPostModal(true);
  };

  // Calendar navigation
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Get days for calendar view
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Monday = 1
    
    const days = [];
    
    // Previous month days
    for (let i = startDay - 1; i > 0; i--) {
      const date = new Date(year, month, 1 - i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  // Get posts for a specific day
  const getPostsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return posts.filter(p => p.scheduled_date === dateStr);
  };

  // Get status color
  const getStatusColor = (statusId) => {
    const status = settings.statuses?.find(s => s.id === statusId);
    return status?.color || '#9CA3AF';
  };

  // Get network color
  const getNetworkColor = (networkId) => {
    const network = settings.networks?.find(n => n.id === networkId);
    return network?.color || '#6366f1';
  };

  // Trello columns (weeks of current month)
  const getTrelloColumns = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const columns = [];
    let weekStart = new Date(firstDay);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Start from Monday
    
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      columns.push({
        start: new Date(weekStart),
        end: weekEnd,
        label: `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('fr-FR', { month: 'short' })}`
      });
      
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    return columns;
  };

  // Get posts for a week range
  const getPostsForWeek = (start, end) => {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return posts.filter(p => p.scheduled_date >= startStr && p.scheduled_date <= endStr);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const monthYearLabel = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="editorial-calendar-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendrier Éditorial</h1>
          <p className="text-white/60">Planifiez vos contenus social media</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => { resetCalendarForm(); setShowCalendarModal(true); }}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau calendrier
          </Button>
          <Button 
            onClick={() => openNewPost()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau post
          </Button>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
        {/* Calendar selector */}
        <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Tous les calendriers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les calendriers</SelectItem>
            {calendars.map(cal => (
              <SelectItem key={cal.id} value={cal.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                  {cal.title}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters */}
        <Select value={filters.network} onValueChange={(v) => setFilters(f => ({ ...f, network: v }))}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Réseau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les réseaux</SelectItem>
            {settings.networks?.map(n => (
              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les statuts</SelectItem>
            {settings.statuses?.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() => setViewMode('calendar')}
            className={viewMode === 'calendar' ? 'bg-indigo-600' : 'text-white/60'}
          >
            <CalendarIcon className="w-4 h-4 mr-1" />
            Calendrier
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'trello' ? 'default' : 'ghost'}
            onClick={() => setViewMode('trello')}
            className={viewMode === 'trello' ? 'bg-indigo-600' : 'text-white/60'}
          >
            <Grid3X3 className="w-4 h-4 mr-1" />
            Trello
          </Button>
        </div>
      </div>

      {/* Calendars list (collapsible) */}
      {calendars.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {calendars.map(cal => (
            <div 
              key={cal.id}
              className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
              <span className="text-white text-sm">{cal.title}</span>
              <span className="text-white/40 text-xs">({cal.post_count} posts)</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/60 hover:text-white">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => openEditCalendar(cal)}>
                    <Edit className="w-4 h-4 mr-2" /> Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateCalendar(cal.id)}>
                    <Copy className="w-4 h-4 mr-2" /> Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteCalendar(cal.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <Button variant="ghost" onClick={() => navigateMonth(-1)} className="text-white">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-white capitalize">{monthYearLabel}</h2>
            <Button variant="ghost" onClick={() => navigateMonth(1)} className="text-white">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} className="p-2 text-center text-white/60 text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {getCalendarDays().map((day, idx) => {
              const dayPosts = getPostsForDay(day.date);
              const isToday = day.date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 border-b border-r border-white/5 ${
                    !day.isCurrentMonth ? 'bg-white/[0.02]' : ''
                  } ${isToday ? 'bg-indigo-500/10' : ''}`}
                  onClick={() => openNewPost(day.date.toISOString().split('T')[0])}
                >
                  <div className={`text-sm mb-1 ${
                    day.isCurrentMonth ? 'text-white' : 'text-white/30'
                  } ${isToday ? 'font-bold text-indigo-400' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map(post => (
                      <div
                        key={post.id}
                        onClick={(e) => { e.stopPropagation(); openEditPost(post); }}
                        className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate"
                        style={{ backgroundColor: post.calendar?.color || '#6366f1' }}
                      >
                        <div className="flex items-center gap-1">
                          {post.networks?.slice(0, 2).map(n => (
                            <span key={n} style={{ color: getNetworkColor(n) }}>
                              <NetworkIcon network={n} className="w-3 h-3" />
                            </span>
                          ))}
                          <span className="text-white truncate">{post.title}</span>
                        </div>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-xs text-white/40">+{dayPosts.length - 3} autres</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trello View */}
      {viewMode === 'trello' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {getTrelloColumns().map((column, idx) => {
            const columnPosts = getPostsForWeek(column.start, column.end);
            
            return (
              <div key={idx} className="flex-shrink-0 w-72">
                <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3">
                  <h3 className="text-white font-medium mb-3 text-sm">{column.label}</h3>
                  
                  <div className="space-y-2 min-h-[200px]">
                    {columnPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => openEditPost(post)}
                        className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/10"
                      >
                        {/* Thumbnail */}
                        {post.medias?.[0]?.url && (
                          <div className="w-full h-24 rounded-lg overflow-hidden mb-2">
                            {post.medias[0].type === 'video' ? (
                              <video src={post.medias[0].url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={post.medias[0].url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        
                        {/* Title */}
                        <h4 className="text-white text-sm font-medium mb-2 truncate">{post.title}</h4>
                        
                        {/* Networks */}
                        <div className="flex items-center gap-1 mb-2">
                          {post.networks?.map(n => (
                            <span key={n} style={{ color: getNetworkColor(n) }}>
                              <NetworkIcon network={n} className="w-4 h-4" />
                            </span>
                          ))}
                        </div>
                        
                        {/* Meta */}
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ borderColor: getStatusColor(post.status), color: getStatusColor(post.status) }}
                          >
                            {settings.statuses?.find(s => s.id === post.status)?.name || post.status}
                          </Badge>
                          
                          <span className="text-white/40 text-xs">
                            {post.scheduled_time || ''}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add button */}
                    <Button
                      variant="ghost"
                      className="w-full border-dashed border border-white/10 text-white/40 hover:text-white hover:border-white/20"
                      onClick={() => {
                        resetPostForm();
                        setPostForm(prev => ({ ...prev, scheduled_date: column.start.toISOString().split('T')[0] }));
                        setShowPostModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar Modal */}
      <Dialog open={showCalendarModal} onOpenChange={setShowCalendarModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCalendar ? 'Modifier le calendrier' : 'Nouveau calendrier'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du calendrier *</Label>
              <Input
                value={calendarForm.title}
                onChange={(e) => setCalendarForm({ ...calendarForm, title: e.target.value })}
                placeholder="Ex: Client ABC - Instagram"
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Client associé</Label>
              <Select 
                value={calendarForm.contact_id} 
                onValueChange={(v) => setCalendarForm({ ...calendarForm, contact_id: v })}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Sélectionner un contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {['#6366f1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'].map(color => (
                  <button
                    key={color}
                    onClick={() => setCalendarForm({ ...calendarForm, color })}
                    className={`w-8 h-8 rounded-full border-2 ${calendarForm.color === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={calendarForm.description}
                onChange={(e) => setCalendarForm({ ...calendarForm, description: e.target.value })}
                placeholder="Description du calendrier..."
                className="bg-white/5 border-white/10"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCalendarModal(false)}>Annuler</Button>
            <Button onClick={handleSaveCalendar} className="bg-indigo-600 hover:bg-indigo-500">
              {editingCalendar ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Modifier le post' : 'Nouveau post'}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="bg-white/5 mb-4">
              <TabsTrigger value="content">Contenu</TabsTrigger>
              <TabsTrigger value="planning">Planification</TabsTrigger>
              <TabsTrigger value="media">Médias</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Calendrier *</Label>
                  <Select 
                    value={postForm.calendar_id} 
                    onValueChange={(v) => setPostForm({ ...postForm, calendar_id: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Choisir un calendrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select 
                    value={postForm.format_type} 
                    onValueChange={(v) => setPostForm({ ...postForm, format_type: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.formats?.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          <div className="flex items-center gap-2">
                            <FormatIcon format={f.id} />
                            {f.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Titre interne *</Label>
                <Input
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="Titre du post (usage interne)"
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Réseaux sociaux</Label>
                <div className="flex flex-wrap gap-2">
                  {settings.networks?.map(n => (
                    <button
                      key={n.id}
                      onClick={() => {
                        const networks = postForm.networks.includes(n.id)
                          ? postForm.networks.filter(x => x !== n.id)
                          : [...postForm.networks, n.id];
                        setPostForm({ ...postForm, networks });
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        postForm.networks.includes(n.id)
                          ? 'border-white/40 bg-white/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <span style={{ color: n.color }}>
                        <NetworkIcon network={n.id} />
                      </span>
                      <span className="text-white text-sm">{n.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Légende / Texte du post</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAIModal(true)}
                    className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                  >
                    <Wand2 className="w-4 h-4 mr-1" />
                    Aide IA
                  </Button>
                </div>
                <Textarea
                  value={postForm.caption}
                  onChange={(e) => setPostForm({ ...postForm, caption: e.target.value })}
                  placeholder="Rédigez votre légende..."
                  className="bg-white/5 border-white/10"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pilier de contenu</Label>
                  <Select 
                    value={postForm.content_pillar} 
                    onValueChange={(v) => setPostForm({ ...postForm, content_pillar: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {settings.pillars?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Objectif</Label>
                  <Select 
                    value={postForm.objective} 
                    onValueChange={(v) => setPostForm({ ...postForm, objective: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {settings.objectives?.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>CTA (appel à l'action)</Label>
                <Input
                  value={postForm.cta}
                  onChange={(e) => setPostForm({ ...postForm, cta: e.target.value })}
                  placeholder="Ex: Découvrez notre offre..."
                  className="bg-white/5 border-white/10"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="planning" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de publication</Label>
                  <Input
                    type="date"
                    value={postForm.scheduled_date}
                    onChange={(e) => setPostForm({ ...postForm, scheduled_date: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Heure</Label>
                  <Input
                    type="time"
                    value={postForm.scheduled_time}
                    onChange={(e) => setPostForm({ ...postForm, scheduled_time: e.target.value })}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select 
                  value={postForm.status} 
                  onValueChange={(v) => setPostForm({ ...postForm, status: v })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.statuses?.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Liens externes (UTM, landing page...)</Label>
                <Input
                  value={postForm.external_links}
                  onChange={(e) => setPostForm({ ...postForm, external_links: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notes internes</Label>
                <Textarea
                  value={postForm.notes}
                  onChange={(e) => setPostForm({ ...postForm, notes: e.target.value })}
                  placeholder="Notes pour l'équipe..."
                  className="bg-white/5 border-white/10"
                  rows={3}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="media" className="space-y-4">
              {editingPost ? (
                <MediaManager postId={editingPost.id} medias={editingPost.medias || []} onUpdate={loadPosts} />
              ) : (
                <div className="text-center text-white/60 py-8">
                  <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Créez d'abord le post, puis ajoutez des médias</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between">
            {editingPost && (
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  handleDeletePost(editingPost.id);
                  setShowPostModal(false);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowPostModal(false)}>Annuler</Button>
              <Button onClick={handleSavePost} className="bg-indigo-600 hover:bg-indigo-500">
                {editingPost ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-400" />
              Assistant IA - Aide rédactionnelle
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Input section */}
            <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="space-y-2">
                <Label>Sujet / Thème du post *</Label>
                <Textarea
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ex: Lancement de notre nouvelle offre de création de site web, Témoignage client satisfait, Astuce marketing pour les entrepreneurs..."
                  className="bg-white/5 border-white/10"
                  rows={2}
                />
              </div>
              
              <div className="text-xs text-white/50">
                <p>L'IA tiendra compte des paramètres sélectionnés dans le formulaire du post :</p>
                <ul className="mt-1 ml-4 list-disc">
                  {postForm.networks.length > 0 && <li>Réseaux : {postForm.networks.join(', ')}</li>}
                  {postForm.format_type && <li>Format : {postForm.format_type}</li>}
                  {postForm.content_pillar && <li>Pilier : {postForm.content_pillar}</li>}
                  {postForm.objective && <li>Objectif : {postForm.objective}</li>}
                </ul>
              </div>
              
              <Button
                onClick={handleAIAssist}
                disabled={aiLoading || !aiTopic.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer des suggestions
                  </>
                )}
              </Button>
            </div>
            
            {/* Results section */}
            {aiResult && (
              <div className="space-y-4">
                {/* Angles */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <h3 className="font-medium text-white">Angles / Idées de post</h3>
                  </div>
                  <div className="space-y-2">
                    {aiResult.angles?.map((angle, idx) => (
                      <div key={idx} className="p-3 bg-white/5 rounded-lg text-sm text-white/80">
                        <span className="text-indigo-400 font-medium mr-2">{idx + 1}.</span>
                        {angle}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Caption */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <h3 className="font-medium text-white">Légende suggérée</h3>
                    </div>
                    <Button size="sm" variant="outline" onClick={applyAICaption} className="text-xs">
                      <Check className="w-3 h-3 mr-1" /> Utiliser
                    </Button>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg text-sm text-white/80 whitespace-pre-wrap">
                    {aiResult.caption}
                  </div>
                </div>
                
                {/* Hooks */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-red-400" />
                    <h3 className="font-medium text-white">Hooks accrocheurs</h3>
                  </div>
                  <div className="space-y-2">
                    {aiResult.hooks?.map((hook, idx) => (
                      <div 
                        key={idx} 
                        className="p-2 bg-white/5 rounded-lg text-sm text-white/80 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => {
                          setPostForm(prev => ({ 
                            ...prev, 
                            caption: hook + '\n\n' + (prev.caption || '') 
                          }));
                          toast.success('Hook ajouté au début de la légende');
                        }}
                      >
                        <span className="text-red-400 mr-2">→</span>
                        {hook}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Hashtags */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Hash className="w-4 h-4 text-green-400" />
                    <h3 className="font-medium text-white">Hashtags recommandés</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.hashtags?.map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="border-green-500/50 text-green-400 cursor-pointer hover:bg-green-500/10"
                        onClick={() => {
                          const hashtag = tag.startsWith('#') ? tag : `#${tag}`;
                          setPostForm(prev => ({ 
                            ...prev, 
                            caption: (prev.caption || '') + ' ' + hashtag 
                          }));
                          toast.success(`${hashtag} ajouté`);
                        }}
                      >
                        #{tag.replace('#', '')}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* CTA */}
                {aiResult.cta && (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-purple-400" />
                        <h3 className="font-medium text-white">Call-to-Action</h3>
                      </div>
                      <Button size="sm" variant="outline" onClick={applyAICTA} className="text-xs">
                        <Check className="w-3 h-3 mr-1" /> Utiliser
                      </Button>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg text-sm text-white/80">
                      {aiResult.cta}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => { setShowAIModal(false); setAiResult(null); setAiTopic(''); }}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Media Manager Component
const MediaManager = ({ postId, medias = [], onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [localMedias, setLocalMedias] = useState(medias);

  useEffect(() => {
    setLocalMedias(medias);
  }, [medias]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post(`/editorial/posts/${postId}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setLocalMedias(prev => [...prev, response.data]);
      }
      toast.success('Média(s) uploadé(s)');
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur upload');
    }
    setUploading(false);
  };

  const handleDelete = async (mediaId) => {
    try {
      await api.delete(`/editorial/posts/${postId}/media/${mediaId}`);
      setLocalMedias(prev => prev.filter(m => m.id !== mediaId));
      toast.success('Média supprimé');
      onUpdate?.();
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors">
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-white/40 mb-2" />
            <span className="text-white/60 text-sm">Cliquez pour uploader des images ou vidéos</span>
          </>
        )}
      </label>

      {/* Media grid */}
      {localMedias.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {localMedias.map((media, idx) => (
            <div key={media.id} className="relative group aspect-square">
              {media.type === 'video' ? (
                <video 
                  src={media.url} 
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <img 
                  src={media.url} 
                  alt="" 
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
              
              {/* Order badge */}
              <div className="absolute top-2 left-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs">
                {idx + 1}
              </div>
              
              {/* Delete button */}
              <button
                onClick={() => handleDelete(media.id)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Type badge */}
              <div className="absolute bottom-2 left-2 bg-black/50 rounded px-2 py-1 text-white text-xs">
                {media.type === 'video' ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditorialCalendarPage;
