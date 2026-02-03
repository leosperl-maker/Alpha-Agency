import { useState, useEffect, useCallback } from "react";
import { 
  Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, 
  FileText, Calendar, Tag, Clock, CheckCircle, Archive,
  X, XCircle, Loader2, Sparkles, Save, ArrowLeft, MessageCircle, User
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "../../components/ui/dialog";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ScrollArea } from "../../components/ui/scroll-area";
import { blogAPI, tagsAPI, uploadAPI } from "../../lib/api";
import { toast } from "sonner";
import AdvancedBlockEditor from "../../components/AdvancedBlockEditor";

const BlogAdminPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availableTags, setAvailableTags] = useState([]);
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content_blocks: [],
    featured_image: "",
    status: "draft",
    tags: [],
    category: "",
    author_name: "Alpha Agency",
    meta_title: "",
    meta_description: "",
    slug: ""
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Comments management
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostComments, setSelectedPostComments] = useState([]);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const res = await blogAPI.getAll({ status: statusFilter !== "all" ? statusFilter : undefined });
      setPosts(res.data.posts || res.data || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des articles");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await tagsAPI.getAll();
      setAvailableTags(res.data.filter(t => t.type === "blog" || !t.type) || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchTags();
  }, [fetchPosts, fetchTags]);

  // Generate slug
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Handle title change with auto slug
  const handleTitleChange = (title) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  // Upload featured image
  const handleImageUpload = async (e) => {
    if (e.target.files?.[0]) {
      setUploadingImage(true);
      try {
        const res = await uploadAPI.image(e.target.files[0]);
        setFormData(prev => ({ ...prev, featured_image: res.data.url }));
        toast.success("Image uploadée");
      } catch (err) {
        toast.error("Erreur lors de l'upload de l'image");
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Open editor for new post
  const createNewPost = () => {
    setEditingPost(null);
    setFormData({
      title: "",
      excerpt: "",
      content_blocks: [],
      featured_image: "",
      status: "draft",
      tags: [],
      category: "",
      author_name: "Alpha Agency",
      meta_title: "",
      meta_description: "",
      slug: ""
    });
    setIsEditing(true);
  };

  // Open editor for existing post
  const editPost = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title || "",
      excerpt: post.excerpt || "",
      content_blocks: post.content_blocks || [],
      featured_image: post.featured_image || "",
      status: post.status || "draft",
      tags: post.tags || [],
      category: post.category || "",
      author_name: post.author_name || "Alpha Agency",
      meta_title: post.meta_title || post.seo_title || "",
      meta_description: post.meta_description || post.seo_description || "",
      slug: post.slug || ""
    });
    setIsEditing(true);
  };
  
  // Comments state
  const [pendingCommentsCount, setPendingCommentsCount] = useState(0);
  const [allComments, setAllComments] = useState([]);
  const [commentsTab, setCommentsTab] = useState("pending");
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Fetch pending comments count
  const fetchPendingCommentsCount = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/blog/comments/pending`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCommentsCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching pending comments:", error);
    }
  };
  
  // Fetch all comments for moderation panel
  const fetchAllComments = async (status = null) => {
    setLoadingComments(true);
    try {
      const token = localStorage.getItem("alpha_token");
      const url = status 
        ? `${process.env.REACT_APP_BACKEND_URL}/api/blog/comments/all?status=${status}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/blog/comments/all`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllComments(data.comments || []);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };
  
  // View comments for a post
  const viewComments = async (post) => {
    setSelectedPostForComments(post);
    setLoadingComments(true);
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/blog/comments/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter comments for this post
        const postComments = data.comments?.filter(c => c.article_slug === post.slug) || [];
        setSelectedPostComments(postComments);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des commentaires");
    } finally {
      setLoadingComments(false);
    }
    setShowCommentsModal(true);
  };
  
  // Moderate a comment
  const moderateComment = async (commentId, status) => {
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/blog/comments/${commentId}/moderate`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const statusText = { approved: "approuvé", rejected: "rejeté", spam: "marqué spam" };
        toast.success(`Commentaire ${statusText[status]}`);
        // Refresh comments
        if (selectedPostForComments) {
          viewComments(selectedPostForComments);
        } else {
          fetchAllComments(commentsTab === "all" ? null : commentsTab);
        }
        fetchPendingCommentsCount();
      }
    } catch (error) {
      toast.error("Erreur lors de la modération");
    }
  };
  
  // Delete a comment
  const deleteComment = async (commentId) => {
    if (!confirm("Supprimer définitivement ce commentaire ?")) return;
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/blog/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Commentaire supprimé");
        // Refresh
        if (selectedPostForComments) {
          const updated = selectedPostComments.filter(c => c.id !== commentId);
          setSelectedPostComments(updated);
        } else {
          fetchAllComments(commentsTab === "all" ? null : commentsTab);
        }
        fetchPendingCommentsCount();
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };
  
  // Load pending count on mount
  useEffect(() => {
    fetchPendingCommentsCount();
  }, []);

  // Save post
  const savePost = async (newStatus = null) => {
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    
    setSaving(true);
    try {
      const postData = {
        ...formData,
        status: newStatus || formData.status
      };
      
      if (editingPost) {
        await blogAPI.update(editingPost.id, postData);
        toast.success("Article mis à jour");
      } else {
        await blogAPI.create(postData);
        toast.success("Article créé");
      }
      
      setIsEditing(false);
      fetchPosts();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Delete post
  const deletePost = async (id) => {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      await blogAPI.delete(id);
      toast.success("Article supprimé");
      fetchPosts();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Toggle tag
  const toggleTag = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }));
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (searchQuery && !post.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === "published").length,
    draft: posts.filter(p => p.status === "draft").length
  };

  // Editor View
  if (isEditing) {
    return (
      <div data-testid="blog-editor" className="h-full flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-white/60">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <span className="text-white/40">|</span>
            <h1 className="text-lg font-semibold text-white">
              {editingPost ? "Modifier l'article" : "Nouvel article"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => savePost("draft")}
              disabled={saving}
              className="border-white/20 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Brouillon
            </Button>
            <Button
              onClick={() => savePost("published")}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Publier
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Editor Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Title */}
              <div>
                <Input
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Titre de l'article"
                  className="text-3xl font-bold bg-transparent border-0 border-b border-white/10 rounded-none px-0 h-auto py-3 focus-visible:ring-0 focus-visible:border-indigo-500"
                />
              </div>

              {/* Excerpt */}
              <div>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Extrait / résumé de l'article (affiché dans les aperçus)"
                  className="bg-white/5 border-white/10 min-h-20"
                />
              </div>

              {/* Content Blocks - Using AdvancedBlockEditor */}
              <div className="space-y-4">
                <Label className="text-lg text-white font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Contenu
                </Label>
                <AdvancedBlockEditor
                  blocks={formData.content_blocks}
                  onChange={(blocks) => setFormData(prev => ({ ...prev, content_blocks: blocks }))}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Panel */}
          <aside className="w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {/* Status */}
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      <SelectItem value="draft" className="text-white">Brouillon</SelectItem>
                      <SelectItem value="published" className="text-white">Publié</SelectItem>
                      <SelectItem value="archived" className="text-white">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Author */}
                <div className="space-y-2">
                  <Label>Auteur</Label>
                  <Input
                    value={formData.author_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))}
                    placeholder="Nom de l'auteur"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                
                {/* Category */}
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Ex: Marketing, Tech, Actualités..."
                    className="bg-white/5 border-white/10"
                  />
                </div>

                {/* Featured Image */}
                <div className="space-y-2">
                  <Label>Image à la une</Label>
                  {formData.featured_image ? (
                    <div className="relative">
                      <img
                        src={formData.featured_image}
                        alt="Featured"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData(prev => ({ ...prev, featured_image: "" }))}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                        {uploadingImage ? (
                          <Loader2 className="w-8 h-8 mx-auto animate-spin text-white/60" />
                        ) : (
                          <>
                            <FileText className="w-8 h-8 mx-auto text-white/40 mb-2" />
                            <p className="text-sm text-white/60">Cliquez pour uploader</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label>URL (slug)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="url-de-l-article"
                    className="bg-white/5 border-white/10"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={formData.tags.includes(tag.name) ? "default" : "outline"}
                        className="cursor-pointer"
                        style={formData.tags.includes(tag.name) ? { backgroundColor: tag.color || '#6366f1' } : {}}
                        onClick={() => toggleTag(tag.name)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                    {availableTags.length === 0 && (
                      <p className="text-sm text-white/40">Aucun tag disponible</p>
                    )}
                  </div>
                </div>

                {/* SEO */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <Label className="text-white/80">SEO</Label>
                  <div className="space-y-2">
                    <Input
                      value={formData.meta_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                      placeholder="Titre SEO (optionnel)"
                      className="bg-white/5 border-white/10 text-sm"
                    />
                    <Textarea
                      value={formData.meta_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                      placeholder="Description SEO (optionnel)"
                      className="bg-white/5 border-white/10 text-sm min-h-16"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </aside>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div data-testid="blog-admin-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog</h1>
          <p className="text-white/60 text-sm">Gérez vos articles de blog</p>
        </div>
        <Button onClick={createNewPost} className="bg-indigo-600 hover:bg-indigo-500">
          <Plus className="w-4 h-4 mr-2" />
          Nouvel article
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-white/60 text-sm">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-green-400">{stats.published}</p>
            <p className="text-white/60 text-sm">Publiés</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-amber-400">{stats.draft}</p>
            <p className="text-white/60 text-sm">Brouillons</p>
          </CardContent>
        </Card>
      </div>

      {/* Comments Moderation Section */}
      {pendingCommentsCount > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {pendingCommentsCount} commentaire{pendingCommentsCount > 1 ? 's' : ''} en attente
                  </p>
                  <p className="text-white/60 text-sm">Modération requise</p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  setSelectedPostForComments(null);
                  setCommentsTab("pending");
                  fetchAllComments("pending");
                  setShowCommentsModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-black"
              >
                Modérer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 backdrop-blur-xl border-white/10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white/5 backdrop-blur-xl border-white/10">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10">
            <SelectItem value="all" className="text-white">Tous</SelectItem>
            <SelectItem value="published" className="text-white">Publiés</SelectItem>
            <SelectItem value="draft" className="text-white">Brouillons</SelectItem>
            <SelectItem value="archived" className="text-white">Archivés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <FileText className="w-12 h-12 mx-auto text-white/30 mb-3" />
          <h3 className="text-white font-medium mb-1">Aucun article</h3>
          <p className="text-white/50 text-sm mb-4">
            {searchQuery ? "Aucun article ne correspond à votre recherche" : "Créez votre premier article"}
          </p>
          {!searchQuery && (
            <Button onClick={createNewPost} className="bg-indigo-600 hover:bg-indigo-500">
              <Plus className="w-4 h-4 mr-2" />
              Créer un article
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPosts.map(post => (
            <Card key={post.id} className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-white/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  {post.featured_image && (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white truncate">{post.title}</h3>
                        <p className="text-white/60 text-sm line-clamp-2 mt-1">{post.excerpt}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4 text-white/60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                          <DropdownMenuItem onClick={() => editPost(post)} className="text-white">
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => window.open(`/actualites/${post.slug}`, '_blank')}
                            className="text-white"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Aperçu
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => viewComments(post)} className="text-white">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Commentaires
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem onClick={() => deletePost(post.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-white/40">
                      <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-xs">
                        {post.status === "published" ? "Publié" : post.status === "draft" ? "Brouillon" : "Archivé"}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author_name || "Alpha Agency"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {post.tags?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {post.tags.slice(0, 2).join(", ")}
                          {post.tags.length > 2 && ` +${post.tags.length - 2}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Comments Modal with Moderation */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 w-full max-w-3xl max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-400" />
                  {selectedPostForComments ? "Commentaires de l'article" : "Modération des commentaires"}
                </h2>
                {selectedPostForComments && (
                  <p className="text-white/60 text-sm truncate max-w-md mt-1">
                    {selectedPostForComments.title}
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowCommentsModal(false);
                  setSelectedPostForComments(null);
                }}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Tabs for moderation view */}
            {!selectedPostForComments && (
              <div className="flex gap-2 p-4 border-b border-white/10 bg-black/20">
                {[
                  { key: "pending", label: "En attente", color: "amber" },
                  { key: "approved", label: "Approuvés", color: "green" },
                  { key: "rejected", label: "Rejetés", color: "red" },
                  { key: "all", label: "Tous", color: "gray" }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setCommentsTab(tab.key);
                      fetchAllComments(tab.key === "all" ? null : tab.key);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      commentsTab === tab.key
                        ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30`
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                    style={commentsTab === tab.key ? {
                      backgroundColor: tab.color === "amber" ? "rgba(245,158,11,0.2)" :
                                       tab.color === "green" ? "rgba(34,197,94,0.2)" :
                                       tab.color === "red" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)",
                      color: tab.color === "amber" ? "#fbbf24" :
                             tab.color === "green" ? "#4ade80" :
                             tab.color === "red" ? "#f87171" : "#9ca3af",
                      borderColor: tab.color === "amber" ? "rgba(245,158,11,0.3)" :
                                   tab.color === "green" ? "rgba(34,197,94,0.3)" :
                                   tab.color === "red" ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.2)"
                    } : {}}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              {loadingComments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : (selectedPostForComments ? selectedPostComments : allComments).length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 mx-auto text-white/20 mb-3" />
                  <p className="text-white/60">
                    {selectedPostForComments 
                      ? "Aucun commentaire sur cet article"
                      : `Aucun commentaire ${commentsTab === "pending" ? "en attente" : commentsTab === "approved" ? "approuvé" : commentsTab === "rejected" ? "rejeté" : ""}`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(selectedPostForComments ? selectedPostComments : allComments).map(comment => (
                    <div 
                      key={comment.id} 
                      className={`bg-white/5 rounded-xl p-4 border ${
                        comment.status === "pending" ? "border-amber-500/30" :
                        comment.status === "approved" ? "border-green-500/30" :
                        comment.status === "rejected" ? "border-red-500/30" : "border-white/10"
                      }`}
                    >
                      {/* Article info if in moderation view */}
                      {!selectedPostForComments && comment.article_title && (
                        <div className="mb-3 pb-3 border-b border-white/10">
                          <p className="text-white/40 text-xs">Article :</p>
                          <p className="text-white/80 text-sm font-medium">{comment.article_title}</p>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {(comment.author || comment.name)?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white">{comment.author || comment.name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                comment.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                                comment.status === "approved" ? "bg-green-500/20 text-green-400" :
                                comment.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                comment.status === "spam" ? "bg-gray-500/20 text-gray-400" : ""
                              }`}>
                                {comment.status === "pending" ? "En attente" :
                                 comment.status === "approved" ? "Approuvé" :
                                 comment.status === "rejected" ? "Rejeté" :
                                 comment.status === "spam" ? "Spam" : comment.status}
                              </span>
                              <span className="text-white/40 text-xs">
                                {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {comment.email && (
                              <p className="text-white/40 text-xs">{comment.email}</p>
                            )}
                            <p className="text-white/80 mt-2">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                        {comment.status === "pending" && (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => moderateComment(comment.id, "approved")}
                              className="bg-green-600 hover:bg-green-500 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approuver
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => moderateComment(comment.id, "rejected")}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeter
                            </Button>
                            <Button 
                              size="sm"
                              variant="ghost"
                              onClick={() => moderateComment(comment.id, "spam")}
                              className="text-white/50 hover:text-white/80"
                            >
                              Spam
                            </Button>
                          </>
                        )}
                        {comment.status !== "pending" && comment.status !== "approved" && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => moderateComment(comment.id, "approved")}
                            className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteComment(comment.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20">
              <p className="text-white/40 text-sm text-center">
                {(selectedPostForComments ? selectedPostComments : allComments).length} commentaire{(selectedPostForComments ? selectedPostComments : allComments).length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogAdminPage;
