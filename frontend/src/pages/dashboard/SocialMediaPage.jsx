import { useState, useEffect } from "react";
import { 
  Calendar, Send, MessageSquare, Settings, Plus, Clock, CheckCircle, 
  AlertCircle, Facebook, Instagram, Image, Video, FileText, Sparkles,
  ChevronLeft, ChevronRight, MoreVertical, Trash2, Edit, Eye, Filter,
  Inbox, Archive, Star, Reply, Bot, Loader2, RefreshCw, List, Grid
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "../../components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { toast } from "sonner";
import { socialAPI } from "../../lib/api";

// Platform icons
const PlatformIcon = ({ platform, className = "w-4 h-4" }) => {
  if (platform === "facebook") return <Facebook className={`${className} text-[#1877F2]`} />;
  if (platform === "instagram") return <Instagram className={`${className} text-[#E4405F]`} />;
  return <MessageSquare className={className} />;
};

// Post type icons
const PostTypeIcon = ({ type, className = "w-4 h-4" }) => {
  if (type === "image") return <Image className={className} />;
  if (type === "video" || type === "reel") return <Video className={className} />;
  if (type === "carousel") return <Image className={className} />;
  return <FileText className={className} />;
};

// Status badge
const StatusBadge = ({ status }) => {
  const config = {
    scheduled: { label: "Programmé", color: "bg-blue-100 text-blue-700" },
    published: { label: "Publié", color: "bg-green-100 text-green-700" },
    failed: { label: "Échec", color: "bg-red-100 text-red-700" },
    draft: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  };
  const { label, color } = config[status] || config.draft;
  return <Badge className={`${color} border-none text-xs`}>{label}</Badge>;
};

// Priority badge
const PriorityBadge = ({ priority }) => {
  const config = {
    low: { label: "Basse", color: "bg-gray-100 text-gray-600" },
    normal: { label: "Normal", color: "bg-blue-100 text-blue-700" },
    high: { label: "Haute", color: "bg-orange-100 text-orange-700" },
    urgent: { label: "Urgent", color: "bg-red-100 text-red-700" },
  };
  const { label, color } = config[priority] || config.normal;
  return <Badge className={`${color} border-none text-xs`}>{label}</Badge>;
};

const SocialMediaPage = () => {
  const [activeTab, setActiveTab] = useState("calendar");
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState({});
  
  // Post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postForm, setPostForm] = useState({
    content: "",
    media_urls: [],
    post_type: "text",
    platforms: [],
    scheduled_at: "",
    hashtags: [],
    status: "scheduled"
  });
  
  // Inbox state
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [inboxFilter, setInboxFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "calendar") {
      fetchCalendar();
    }
  }, [currentMonth, currentYear, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, accountsRes, inboxRes] = await Promise.all([
        socialAPI.getStats(),
        socialAPI.getAccounts(),
        socialAPI.getInbox({})
      ]);
      setStats(statsRes.data);
      setAccounts(accountsRes.data);
      setInbox(inboxRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async () => {
    try {
      const res = await socialAPI.getCalendar(currentMonth, currentYear);
      setCalendarData(res.data.posts_by_date || {});
    } catch (error) {
      console.error("Error fetching calendar:", error);
    }
  };

  const handleCreatePost = async () => {
    if (!postForm.content.trim()) {
      toast.error("Le contenu est requis");
      return;
    }
    if (!postForm.scheduled_at) {
      toast.error("La date de publication est requise");
      return;
    }
    
    try {
      if (editingPost) {
        await socialAPI.updatePost(editingPost.id, postForm);
        toast.success("Post mis à jour");
      } else {
        await socialAPI.createPost(postForm);
        toast.success("Post programmé");
      }
      setPostDialogOpen(false);
      resetPostForm();
      fetchCalendar();
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Supprimer ce post ?")) return;
    try {
      await socialAPI.deletePost(postId);
      toast.success("Post supprimé");
      fetchCalendar();
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const resetPostForm = () => {
    setPostForm({
      content: "",
      media_urls: [],
      post_type: "text",
      platforms: [],
      scheduled_at: "",
      hashtags: [],
      status: "scheduled"
    });
    setEditingPost(null);
  };

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostForm({
      content: post.content,
      media_urls: post.media_urls || [],
      post_type: post.post_type,
      platforms: post.platforms || [],
      scheduled_at: post.scheduled_at,
      hashtags: post.hashtags || [],
      status: post.status
    });
    setPostDialogOpen(true);
  };

  // Inbox functions
  const handleUpdateStatus = async (messageId, status) => {
    try {
      await socialAPI.updateMessageStatus(messageId, status);
      setInbox(inbox.map(m => m.id === messageId ? { ...m, status } : m));
      toast.success("Statut mis à jour");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;
    
    try {
      await socialAPI.replyToMessage(selectedMessage.id, replyContent);
      setInbox(inbox.map(m => 
        m.id === selectedMessage.id 
          ? { ...m, status: "replied", reply_content: replyContent }
          : m
      ));
      setReplyContent("");
      toast.success("Réponse enregistrée");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleGetAISuggestions = async () => {
    if (!selectedMessage) return;
    
    setLoadingAI(true);
    try {
      const res = await socialAPI.suggestReply(selectedMessage.id);
      setAiSuggestions(res.data.suggestions || []);
    } catch (error) {
      toast.error("Erreur lors de la génération");
    } finally {
      setLoadingAI(false);
    }
  };

  // Calendar rendering
  const renderCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days = [];
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-[#F8F8F8]" />);
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayPosts = calendarData[dateStr] || [];
      const isToday = new Date().toISOString().startsWith(dateStr);
      
      days.push(
        <div 
          key={day} 
          className={`h-24 border border-[#E5E5E5] p-1 overflow-hidden ${
            isToday ? 'bg-[#CE0202]/5 border-[#CE0202]' : 'bg-white'
          }`}
        >
          <div className={`text-xs font-medium mb-1 ${isToday ? 'text-[#CE0202]' : 'text-[#666666]'}`}>
            {day}
          </div>
          <div className="space-y-0.5">
            {dayPosts.slice(0, 3).map((post, idx) => (
              <div 
                key={idx}
                onClick={() => openEditPost(post)}
                className="text-[10px] bg-[#CE0202]/10 text-[#CE0202] px-1 py-0.5 rounded truncate cursor-pointer hover:bg-[#CE0202]/20"
              >
                {post.platforms?.map(p => p === 'facebook' ? 'FB' : 'IG').join('+')} • {post.content.slice(0, 20)}...
              </div>
            ))}
            {dayPosts.length > 3 && (
              <div className="text-[10px] text-[#666666]">+{dayPosts.length - 3} autres</div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => {
            if (currentMonth === 1) {
              setCurrentMonth(12);
              setCurrentYear(currentYear - 1);
            } else {
              setCurrentMonth(currentMonth - 1);
            }
          }}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">
            {monthNames[currentMonth - 1]} {currentYear}
          </h3>
          <Button variant="outline" size="sm" onClick={() => {
            if (currentMonth === 12) {
              setCurrentMonth(1);
              setCurrentYear(currentYear + 1);
            } else {
              setCurrentMonth(currentMonth + 1);
            }
          }}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-0 border border-[#E5E5E5] rounded-lg overflow-hidden">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(d => (
            <div key={d} className="bg-[#F8F8F8] text-center py-2 text-xs font-medium text-[#666666] border-b border-[#E5E5E5]">
              {d}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  // Filter inbox messages
  const filteredInbox = inbox.filter(m => {
    if (inboxFilter === "all") return true;
    if (inboxFilter === "unread") return m.status === "unread";
    if (inboxFilter === "replied") return m.status === "replied";
    if (inboxFilter === "archived") return m.status === "archived";
    return true;
  });

  return (
    <div data-testid="social-media-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Social Media</h1>
          <p className="text-[#666666]">Gérez vos réseaux sociaux (style Agorapulse)</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { resetPostForm(); setPostDialogOpen(true); }}
            className="bg-[#CE0202] hover:bg-[#B00202] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau post
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{stats.posts?.scheduled || 0}</p>
                  <p className="text-xs text-[#666666]">Programmés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{stats.posts?.published || 0}</p>
                  <p className="text-xs text-[#666666]">Publiés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{stats.posts?.drafts || 0}</p>
                  <p className="text-xs text-[#666666]">Brouillons</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Inbox className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{stats.inbox?.unread || 0}</p>
                  <p className="text-xs text-[#666666]">Non lus</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{stats.inbox?.pending_reply || 0}</p>
                  <p className="text-xs text-[#666666]">À répondre</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F8F8F8] p-1">
          <TabsTrigger value="calendar" className="data-[state=active]:bg-white data-[state=active]:text-[#CE0202]">
            <Calendar className="w-4 h-4 mr-2" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="inbox" className="data-[state=active]:bg-white data-[state=active]:text-[#CE0202]">
            <Inbox className="w-4 h-4 mr-2" />
            Boîte de réception
            {stats?.inbox?.unread > 0 && (
              <Badge className="ml-2 bg-[#CE0202] text-white text-xs">{stats.inbox.unread}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accounts" className="data-[state=active]:bg-white data-[state=active]:text-[#CE0202]">
            <Settings className="w-4 h-4 mr-2" />
            Comptes
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-6">
              {renderCalendar()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Messages List */}
            <Card className="bg-white border-[#E5E5E5] lg:col-span-1">
              <CardHeader className="pb-2 border-b border-[#E5E5E5]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Messages</CardTitle>
                  <Select value={inboxFilter} onValueChange={setInboxFilter}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="unread">Non lus</SelectItem>
                      <SelectItem value="replied">Répondus</SelectItem>
                      <SelectItem value="archived">Archivés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <ScrollArea className="h-[500px]">
                <div className="p-2 space-y-2">
                  {filteredInbox.length === 0 ? (
                    <div className="text-center py-8 text-[#666666]">
                      <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucun message</p>
                    </div>
                  ) : (
                    filteredInbox.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => { setSelectedMessage(msg); setAiSuggestions([]); }}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedMessage?.id === msg.id 
                            ? 'border-[#CE0202] bg-[#CE0202]/5'
                            : 'border-[#E5E5E5] hover:bg-[#F8F8F8]'
                        } ${msg.status === 'unread' ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <PlatformIcon platform={msg.platform} className="w-4 h-4 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-[#1A1A1A] truncate">
                                {msg.sender_name}
                              </p>
                              {msg.status === 'unread' && (
                                <div className="w-2 h-2 bg-[#CE0202] rounded-full" />
                              )}
                            </div>
                            <p className="text-xs text-[#666666] truncate mt-0.5">{msg.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">{msg.message_type}</Badge>
                              <PriorityBadge priority={msg.priority} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Message Detail & Reply */}
            <Card className="bg-white border-[#E5E5E5] lg:col-span-2">
              {selectedMessage ? (
                <>
                  <CardHeader className="pb-2 border-b border-[#E5E5E5]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={selectedMessage.platform} className="w-5 h-5" />
                        <div>
                          <CardTitle className="text-base">{selectedMessage.sender_name}</CardTitle>
                          <p className="text-xs text-[#666666]">{selectedMessage.message_type} • {selectedMessage.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedMessage.id, 'archived')}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Select 
                          value={selectedMessage.priority} 
                          onValueChange={(v) => {
                            socialAPI.updateMessagePriority(selectedMessage.id, v);
                            setSelectedMessage({ ...selectedMessage, priority: v });
                          }}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="low">Basse</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Haute</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Original Message */}
                    <div className="bg-[#F8F8F8] rounded-lg p-4 mb-4">
                      <p className="text-[#1A1A1A]">{selectedMessage.content}</p>
                      <p className="text-xs text-[#666666] mt-2">
                        {new Date(selectedMessage.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    {/* Previous Reply */}
                    {selectedMessage.reply_content && (
                      <div className="bg-[#CE0202]/5 rounded-lg p-4 mb-4 border-l-4 border-[#CE0202]">
                        <p className="text-xs text-[#CE0202] font-medium mb-1">Votre réponse</p>
                        <p className="text-[#1A1A1A]">{selectedMessage.reply_content}</p>
                      </div>
                    )}

                    {/* AI Suggestions */}
                    <div className="mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGetAISuggestions}
                        disabled={loadingAI}
                        className="mb-3"
                      >
                        {loadingAI ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2 text-[#CE0202]" />
                        )}
                        Suggestions IA
                      </Button>
                      
                      {aiSuggestions.length > 0 && (
                        <div className="space-y-2">
                          {aiSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => setReplyContent(suggestion)}
                              className="w-full text-left p-3 bg-[#F8F8F8] rounded-lg hover:bg-[#E5E5E5] transition-colors text-sm"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reply Input */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Votre réponse</Label>
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Écrivez votre réponse..."
                        rows={3}
                        className="bg-white border-[#E5E5E5]"
                      />
                      <Button
                        onClick={handleReply}
                        disabled={!replyContent.trim()}
                        className="bg-[#CE0202] hover:bg-[#B00202] text-white"
                      >
                        <Reply className="w-4 h-4 mr-2" />
                        Répondre
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="h-[500px] flex items-center justify-center">
                  <div className="text-center text-[#666666]">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Sélectionnez un message pour le voir</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="mt-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader>
              <CardTitle className="text-lg">Comptes connectés</CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 mx-auto mb-4 text-[#E5E5E5]" />
                  <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Aucun compte connecté</h3>
                  <p className="text-[#666666] mb-4">
                    Connectez vos comptes Facebook et Instagram pour commencer à publier.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" className="border-[#1877F2] text-[#1877F2]">
                      <Facebook className="w-4 h-4 mr-2" />
                      Connecter Facebook
                    </Button>
                    <Button variant="outline" className="border-[#E4405F] text-[#E4405F]">
                      <Instagram className="w-4 h-4 mr-2" />
                      Connecter Instagram
                    </Button>
                  </div>
                  <p className="text-xs text-[#666666] mt-4">
                    Note: L'intégration Meta API sera activée prochainement.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border border-[#E5E5E5] rounded-lg">
                      <div className="flex items-center gap-3">
                        <PlatformIcon platform={account.platform} className="w-8 h-8" />
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{account.account_name}</p>
                          <p className="text-xs text-[#666666]">{account.platform}</p>
                        </div>
                      </div>
                      <Badge className={account.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                        {account.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Post Dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Modifier le post" : "Nouveau post"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Content */}
            <div className="space-y-2">
              <Label>Contenu *</Label>
              <Textarea
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                placeholder="Écrivez votre publication..."
                rows={4}
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
              <p className="text-xs text-[#666666]">{postForm.content.length}/2200 caractères</p>
            </div>

            {/* Platforms */}
            <div className="space-y-2">
              <Label>Plateformes *</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={postForm.platforms.includes('facebook') ? 'default' : 'outline'}
                  onClick={() => {
                    const platforms = postForm.platforms.includes('facebook')
                      ? postForm.platforms.filter(p => p !== 'facebook')
                      : [...postForm.platforms, 'facebook'];
                    setPostForm({ ...postForm, platforms });
                  }}
                  className={postForm.platforms.includes('facebook') ? 'bg-[#1877F2]' : ''}
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  type="button"
                  variant={postForm.platforms.includes('instagram') ? 'default' : 'outline'}
                  onClick={() => {
                    const platforms = postForm.platforms.includes('instagram')
                      ? postForm.platforms.filter(p => p !== 'instagram')
                      : [...postForm.platforms, 'instagram'];
                    setPostForm({ ...postForm, platforms });
                  }}
                  className={postForm.platforms.includes('instagram') ? 'bg-[#E4405F]' : ''}
                >
                  <Instagram className="w-4 h-4 mr-2" />
                  Instagram
                </Button>
              </div>
            </div>

            {/* Post Type */}
            <div className="space-y-2">
              <Label>Type de post</Label>
              <Select value={postForm.post_type} onValueChange={(v) => setPostForm({ ...postForm, post_type: v })}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="carousel">Carrousel</SelectItem>
                  <SelectItem value="reel">Reel / Vidéo courte</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Date et heure de publication *</Label>
              <Input
                type="datetime-local"
                value={postForm.scheduled_at}
                onChange={(e) => setPostForm({ ...postForm, scheduled_at: e.target.value })}
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Hashtags (séparés par des virgules)</Label>
              <Input
                value={postForm.hashtags.join(', ')}
                onChange={(e) => setPostForm({ 
                  ...postForm, 
                  hashtags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                placeholder="#marketing, #guadeloupe"
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={postForm.status} onValueChange={(v) => setPostForm({ ...postForm, status: v })}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="scheduled">Programmé</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setPostDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreatePost} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              {editingPost ? "Mettre à jour" : "Programmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialMediaPage;
