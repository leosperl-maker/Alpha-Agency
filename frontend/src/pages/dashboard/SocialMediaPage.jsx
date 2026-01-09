import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Calendar, Send, MessageSquare, Settings, Plus, Clock, CheckCircle, 
  AlertCircle, Facebook, Instagram, Image, Video, FileText, Sparkles,
  ChevronLeft, ChevronRight, MoreVertical, Trash2, Edit, Eye, Filter,
  Inbox, Archive, Star, Reply, Bot, Loader2, RefreshCw, List, Grid,
  Smile, MapPin, Hash, X, Upload, FolderOpen, ChevronDown, CalendarDays,
  LayoutList, Rows3, GripVertical, Monitor, Smartphone, Heart, 
  MessageCircle, Share2, Bookmark, ThumbsUp
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Checkbox } from "../../components/ui/checkbox";
import { Switch } from "../../components/ui/switch";
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
import { socialAPI, uploadAPI, metaAPI } from "../../lib/api";

// Platform icons component
const PlatformIcon = ({ platform, className = "w-4 h-4" }) => {
  if (platform === "facebook") return <Facebook className={`${className} text-[#1877F2]`} />;
  if (platform === "instagram") return <Instagram className={`${className} text-[#E4405F]`} />;
  return <MessageSquare className={className} />;
};

// Status badge component
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

// Priority badge component
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

// ========== AGORAPULSE-STYLE POST CREATION MODAL ==========
const CreatePostModal = ({ open, onOpenChange, accounts, editingPost, onSuccess }) => {
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaUrls, setMediaUrls] = useState([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState("facebook");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || "");
      setSelectedAccounts(editingPost.platforms || []);
      setScheduledAt(editingPost.scheduled_at || "");
      setMediaUrls(editingPost.media_urls || []);
      setIsDraft(editingPost.status === "draft");
    } else {
      resetForm();
    }
  }, [editingPost, open]);

  // Auto-update preview platform based on selected accounts
  useEffect(() => {
    if (selectedAccounts.length > 0 && !selectedAccounts.includes(previewPlatform)) {
      setPreviewPlatform(selectedAccounts[0]);
    }
  }, [selectedAccounts]);

  const resetForm = () => {
    setContent("");
    setSelectedAccounts([]);
    setMediaFiles([]);
    setMediaUrls([]);
    setScheduledAt("");
    setIsDraft(false);
  };

  const toggleAccount = (platform) => {
    setSelectedAccounts(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add("border-[#FF6B35]", "bg-orange-50");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("border-[#FF6B35]", "bg-orange-50");
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("border-[#FF6B35]", "bg-orange-50");
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = async (files) => {
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name}: Format non supporté`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: Fichier trop volumineux`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of validFiles) {
        const res = await uploadAPI.image(file);
        if (res.data?.url) {
          setMediaUrls(prev => [...prev, res.data.url]);
        }
      }
      toast.success(`${validFiles.length} fichier(s) uploadé(s)`);
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Le contenu est requis");
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error("Sélectionnez au moins un compte");
      return;
    }
    if (!isDraft && !scheduledAt) {
      toast.error("La date de publication est requise");
      return;
    }

    setSaving(true);
    try {
      const postData = {
        content,
        platforms: selectedAccounts,
        media_urls: mediaUrls,
        scheduled_at: scheduledAt || new Date().toISOString(),
        status: isDraft ? "draft" : "scheduled",
        post_type: mediaUrls.length > 0 ? (mediaUrls.some(u => u.includes("video")) ? "video" : "image") : "text",
      };

      if (editingPost) {
        await socialAPI.updatePost(editingPost.id, postData);
        toast.success("Post mis à jour");
      } else {
        await socialAPI.createPost(postData);
        toast.success(isDraft ? "Brouillon enregistré" : "Post programmé");
      }
      
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // Facebook Preview Component
  const FacebookPreview = () => (
    <div className="bg-white rounded-lg shadow-sm border border-[#DADDE1] overflow-hidden">
      {/* Facebook Header */}
      <div className="p-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-[#050505]">Alpha Agency</p>
          <div className="flex items-center gap-1 text-[13px] text-[#65676B]">
            <span>À l'instant</span>
            <span>·</span>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z"/>
            </svg>
          </div>
        </div>
      </div>
      
      {/* Facebook Content */}
      {content && (
        <div className="px-3 pb-2">
          <p className="text-[15px] text-[#050505] whitespace-pre-wrap">{content}</p>
        </div>
      )}
      
      {/* Facebook Media */}
      {mediaUrls.length > 0 && (
        <div className="bg-[#F0F2F5]">
          <img 
            src={mediaUrls[0]} 
            alt="Preview" 
            className="w-full object-cover max-h-[300px]" 
          />
        </div>
      )}
      
      {/* Facebook Reactions Bar */}
      <div className="px-3 py-2 flex items-center justify-between text-[13px] text-[#65676B] border-b border-[#CED0D4]">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-[18px] h-[18px] rounded-full bg-[#1877F2] flex items-center justify-center">
              <ThumbsUp className="w-2.5 h-2.5 text-white" />
            </div>
            <div className="w-[18px] h-[18px] rounded-full bg-[#F33E58] flex items-center justify-center">
              <Heart className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <span className="ml-1">24</span>
        </div>
        <div className="flex gap-3">
          <span>3 commentaires</span>
          <span>1 partage</span>
        </div>
      </div>
      
      {/* Facebook Actions */}
      <div className="px-2 py-1 flex items-center justify-around">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-[#F0F2F5] transition-colors">
          <ThumbsUp className="w-5 h-5 text-[#65676B]" />
          <span className="text-[15px] font-semibold text-[#65676B]">J'aime</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-[#F0F2F5] transition-colors">
          <MessageCircle className="w-5 h-5 text-[#65676B]" />
          <span className="text-[15px] font-semibold text-[#65676B]">Commenter</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md hover:bg-[#F0F2F5] transition-colors">
          <Share2 className="w-5 h-5 text-[#65676B]" />
          <span className="text-[15px] font-semibold text-[#65676B]">Partager</span>
        </button>
      </div>
    </div>
  );

  // Instagram Preview Component
  const InstagramPreview = () => (
    <div className="bg-white rounded-lg shadow-sm border border-[#DBDBDB] overflow-hidden">
      {/* Instagram Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-[#EFEFEF]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#262626]">A</span>
            </div>
          </div>
          <span className="text-[14px] font-semibold text-[#262626]">alphagency.fr</span>
        </div>
        <MoreVertical className="w-5 h-5 text-[#262626]" />
      </div>
      
      {/* Instagram Media */}
      {mediaUrls.length > 0 ? (
        <div className="aspect-square bg-black">
          <img 
            src={mediaUrls[0]} 
            alt="Preview" 
            className="w-full h-full object-cover" 
          />
        </div>
      ) : (
        <div className="aspect-square bg-[#FAFAFA] flex items-center justify-center">
          <Image className="w-12 h-12 text-[#DBDBDB]" />
        </div>
      )}
      
      {/* Instagram Actions */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6 text-[#262626] cursor-pointer hover:text-[#8E8E8E]" />
          <MessageCircle className="w-6 h-6 text-[#262626] cursor-pointer hover:text-[#8E8E8E]" />
          <Send className="w-6 h-6 text-[#262626] cursor-pointer hover:text-[#8E8E8E]" />
        </div>
        <Bookmark className="w-6 h-6 text-[#262626] cursor-pointer hover:text-[#8E8E8E]" />
      </div>
      
      {/* Instagram Likes */}
      <div className="px-3 pb-1">
        <p className="text-[14px] font-semibold text-[#262626]">127 J'aime</p>
      </div>
      
      {/* Instagram Caption */}
      {content && (
        <div className="px-3 pb-2.5">
          <p className="text-[14px] text-[#262626]">
            <span className="font-semibold">alphagency.fr</span>{" "}
            <span className="whitespace-pre-wrap">{content}</span>
          </p>
        </div>
      )}
      
      {/* Instagram Timestamp */}
      <div className="px-3 pb-3">
        <p className="text-[10px] text-[#8E8E8E] uppercase">À l'instant</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-[#1A1A1A]">
              {editingPost ? "Modifier la publication" : "Créer une publication"}
            </h2>
            <Badge variant="outline" className="text-[#FF6B35] border-[#FF6B35]">
              10 publication(s) restante(s)
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Column - Account Selection */}
          <div className="w-64 border-r border-[#E5E5E5] bg-[#FAFAFA] p-4 flex flex-col">
            <div className="relative mb-4">
              <Input 
                placeholder="Chercher un compte" 
                className="bg-white border-[#E5E5E5] pl-9"
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <Checkbox 
                checked={selectedAccounts.length === 2}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedAccounts(["facebook", "instagram"]);
                  } else {
                    setSelectedAccounts([]);
                  }
                }}
              />
              <span className="text-sm text-[#666666]">Sélectionner tout</span>
            </label>

            <div className="space-y-2 flex-1">
              {/* Facebook Account */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  selectedAccounts.includes("facebook") 
                    ? "bg-white border-2 border-[#FF6B35]" 
                    : "bg-white border border-[#E5E5E5] hover:border-[#CCCCCC]"
                }`}
                onClick={() => toggleAccount("facebook")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Alpha Agency</p>
                    <p className="text-xs text-[#666666]">Facebook Page</p>
                  </div>
                </div>
                {selectedAccounts.includes("facebook") && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleAccount("facebook"); }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Instagram Account */}
              <div 
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  selectedAccounts.includes("instagram") 
                    ? "bg-white border-2 border-[#FF6B35]" 
                    : "bg-white border border-[#E5E5E5] hover:border-[#CCCCCC]"
                }`}
                onClick={() => toggleAccount("instagram")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Alpha Agency</p>
                    <p className="text-xs text-[#666666]">Instagram Business</p>
                  </div>
                </div>
                {selectedAccounts.includes("instagram") && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleAccount("instagram"); }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Connect Account Button */}
            <Button variant="outline" className="mt-4 w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" />
              Connecter un compte
            </Button>
          </div>

          {/* Center Column - Content Creation */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Publication Content Card */}
              <Card className="border-[#E5E5E5]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Publication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Text Area */}
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Rédigez une description avec du texte, des liens..."
                    rows={6}
                    className="bg-white border-[#E5E5E5] resize-none text-base"
                  />
                  
                  {/* Toolbar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-[#666666] hover:text-[#FF6B35]">
                        <Smile className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[#666666] hover:text-[#FF6B35]">
                        <MapPin className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[#666666] hover:text-[#FF6B35]">
                        <Hash className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Draft Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isDraft}
                        onCheckedChange={setIsDraft}
                      />
                      <span className="text-sm text-[#666666]">Ceci est un brouillon</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Media Upload Card */}
              <Card className="border-[#E5E5E5]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Médias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Uploaded Media Preview */}
                  {mediaUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {mediaUrls.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-[#F8F8F8]">
                          <img src={url} alt={`Media ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeMedia(idx)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drop Zone */}
                  <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-[#E5E5E5] rounded-lg p-8 text-center transition-colors"
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-[#FF6B35] animate-spin mb-3" />
                        <p className="text-[#666666]">Upload en cours...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-[#CCCCCC] mx-auto mb-3" />
                        <p className="text-[#666666] mb-4">Glissez et déposez les fichiers n'importe où</p>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-[#E5E5E5]">
                              Parcourir les fichiers
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-white border-[#E5E5E5]">
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                              <Upload className="w-4 h-4 mr-2" />
                              Choisir depuis l'ordinateur
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FolderOpen className="w-4 h-4 mr-2" />
                              Choisir depuis la Librairie
                              <Star className="w-3 h-3 ml-auto text-[#FF6B35]" />
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleFileInput}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                  
                  <p className="text-xs text-[#999999] mt-3">
                    Formats acceptés: JPG, PNG, GIF, MP4, MOV • Max 10MB images, 100MB vidéos
                  </p>
                </CardContent>
              </Card>

              {/* Schedule Card */}
              {!isDraft && (
                <Card className="border-[#E5E5E5]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Programmation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="bg-white border-[#E5E5E5] w-full"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="w-96 border-l border-[#E5E5E5] bg-[#F0F2F5] p-4 overflow-y-auto">
            {/* Preview Header with Selector */}
            <div className="flex items-center justify-between mb-4">
              <Select value={previewPlatform} onValueChange={setPreviewPlatform}>
                <SelectTrigger className="w-[200px] bg-white border-[#E5E5E5]">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {previewPlatform === "facebook" ? (
                        <>
                          <Facebook className="w-4 h-4 text-[#1877F2]" />
                          <span>Facebook Feed preview</span>
                        </>
                      ) : (
                        <>
                          <Instagram className="w-4 h-4 text-[#E4405F]" />
                          <span>Instagram feed preview</span>
                        </>
                      )}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="facebook">
                    <div className="flex items-center gap-2">
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                      <span>Facebook Feed preview</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="instagram">
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-[#E4405F]" />
                      <span>Instagram feed preview</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Device Toggle */}
              <div className="flex items-center gap-1 bg-white rounded-lg border border-[#E5E5E5] p-0.5">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded ${previewDevice === "desktop" ? "bg-[#F0F2F5]" : ""}`}
                >
                  <Monitor className={`w-4 h-4 ${previewDevice === "desktop" ? "text-[#FF6B35]" : "text-[#666666]"}`} />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded ${previewDevice === "mobile" ? "bg-[#F0F2F5]" : ""}`}
                >
                  <Smartphone className={`w-4 h-4 ${previewDevice === "mobile" ? "text-[#FF6B35]" : "text-[#666666]"}`} />
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className={previewDevice === "mobile" ? "max-w-[320px] mx-auto" : ""}>
              {selectedAccounts.length === 0 && !content ? (
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <p className="text-[#666666] text-sm mb-4">
                    Sélectionnez un profil et ajoutez du contenu pour voir l'aperçu.
                  </p>
                  <div className="bg-[#F8F8F8] rounded-lg p-6">
                    <div className="w-10 h-10 rounded-full bg-[#E5E5E5] mx-auto mb-3" />
                    <div className="h-2 bg-[#E5E5E5] rounded w-24 mx-auto mb-2" />
                    <div className="h-16 bg-[#E5E5E5] rounded mx-auto mb-2" />
                    <div className="h-2 bg-[#E5E5E5] rounded w-32 mx-auto" />
                  </div>
                </div>
              ) : (
                <>
                  {previewPlatform === "facebook" ? <FacebookPreview /> : <InstagramPreview />}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E5E5] bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={saving || !content.trim() || selectedAccounts.length === 0}
            className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isDraft ? "Enregistrer le brouillon" : "Programmer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ========== MAIN SOCIAL MEDIA PAGE ==========
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
  const [calendarViewMode, setCalendarViewMode] = useState("month"); // "list", "week", "month"
  
  // Post modal
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  
  // Inbox state
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [inboxFilter, setInboxFilter] = useState("all");

  // Meta integration state
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaPages, setMetaPages] = useState([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [publishContent, setPublishContent] = useState("");
  const [publishImageUrl, setPublishImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);

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
      
      // Also get posts for list view
      const postsRes = await socialAPI.getPosts({ month: currentMonth, year: currentYear });
      setPosts(postsRes.data || []);
    } catch (error) {
      console.error("Error fetching calendar:", error);
    }
  };

  // ========== META INTEGRATION FUNCTIONS ==========
  
  // Check for OAuth callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const metaCallback = urlParams.get('meta_callback');
    const code = urlParams.get('code');
    
    if (metaCallback && code) {
      handleMetaCallback(code);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if Meta is already connected
    checkMetaConnection();
  }, []);

  const checkMetaConnection = async () => {
    try {
      const res = await metaAPI.getPages();
      if (res.data && res.data.length > 0) {
        setMetaConnected(true);
        setMetaPages(res.data);
        fetchPublishedPosts();
      }
    } catch (error) {
      // Not connected, that's fine
      setMetaConnected(false);
    }
  };

  const handleMetaCallback = async (code) => {
    setMetaLoading(true);
    try {
      const redirectUri = `${window.location.origin}/admin/social?meta_callback=true`;
      const res = await metaAPI.exchangeToken(code, redirectUri);
      
      if (res.data.success) {
        toast.success(res.data.message);
        setMetaConnected(true);
        // Fetch pages after connection
        await fetchMetaPages();
      }
    } catch (error) {
      console.error("Meta callback error:", error);
      toast.error("Erreur lors de la connexion Meta");
    } finally {
      setMetaLoading(false);
    }
  };

  const handleConnectMeta = async () => {
    setMetaLoading(true);
    try {
      const res = await metaAPI.getAuthUrl();
      window.location.href = res.data.auth_url;
    } catch (error) {
      console.error("Error getting Meta auth URL:", error);
      toast.error("Erreur lors de la connexion");
      setMetaLoading(false);
    }
  };

  const fetchMetaPages = async () => {
    setMetaLoading(true);
    try {
      const res = await metaAPI.getPages();
      setMetaPages(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedPage(res.data[0]);
      }
    } catch (error) {
      console.error("Error fetching Meta pages:", error);
      toast.error("Erreur lors de la récupération des pages");
    } finally {
      setMetaLoading(false);
    }
  };

  const fetchPublishedPosts = async () => {
    try {
      const res = await metaAPI.getPublishedPosts(null, 20);
      setPublishedPosts(res.data || []);
    } catch (error) {
      console.error("Error fetching published posts:", error);
    }
  };

  const handleDisconnectMeta = async () => {
    if (!window.confirm("Déconnecter votre compte Meta ?")) return;
    try {
      await metaAPI.disconnect();
      setMetaConnected(false);
      setMetaPages([]);
      setPublishedPosts([]);
      toast.success("Compte Meta déconnecté");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handlePublishToFacebook = async () => {
    if (!selectedPage || !publishContent.trim()) {
      toast.error("Veuillez sélectionner une page et entrer du contenu");
      return;
    }
    
    setPublishing(true);
    try {
      const res = await metaAPI.publishFacebook({
        page_id: selectedPage.page_id,
        content: publishContent,
        media_urls: publishImageUrl ? [publishImageUrl] : [],
        link_url: null
      });
      
      if (res.data.success) {
        toast.success("Post publié sur Facebook !");
        setPublishContent("");
        setPublishImageUrl("");
        setPublishModalOpen(false);
        fetchPublishedPosts();
      }
    } catch (error) {
      console.error("Error publishing to Facebook:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishToInstagram = async () => {
    if (!selectedPage?.instagram_id || !publishContent.trim() || !publishImageUrl) {
      toast.error("Instagram nécessite une image et une légende");
      return;
    }
    
    setPublishing(true);
    try {
      const res = await metaAPI.publishInstagram({
        ig_account_id: selectedPage.instagram_id,
        caption: publishContent,
        image_url: publishImageUrl
      });
      
      if (res.data.success) {
        toast.success("Post publié sur Instagram !");
        setPublishContent("");
        setPublishImageUrl("");
        setPublishModalOpen(false);
        fetchPublishedPosts();
      }
    } catch (error) {
      console.error("Error publishing to Instagram:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  // ========== END META INTEGRATION ==========

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

  const openEditPost = (post) => {
    setEditingPost(post);
    setPostModalOpen(true);
  };

  const openNewPost = () => {
    setEditingPost(null);
    setPostModalOpen(true);
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

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Calendar Month View
  const renderMonthView = () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const days = [];
    
    // Empty cells before first day (Monday = 0)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 bg-[#FAFAFA]" />);
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayPosts = calendarData[dateStr] || [];
      const isToday = new Date().toISOString().startsWith(dateStr);
      
      days.push(
        <div 
          key={day} 
          className={`h-16 sm:h-28 border border-[#E5E5E5] p-1 sm:p-2 overflow-hidden transition-colors hover:bg-[#FAFAFA] ${
            isToday ? 'bg-orange-50 border-[#FF6B35]' : 'bg-white'
          }`}
        >
          <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-[#FF6B35]' : 'text-[#666666]'}`}>
            {day}
          </div>
          {/* Desktop: show post details */}
          <div className="hidden sm:block space-y-1">
            {dayPosts.slice(0, 2).map((post, idx) => (
              <div 
                key={idx}
                onClick={() => openEditPost(post)}
                className="flex items-center gap-1 text-xs bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-1 rounded cursor-pointer hover:bg-[#FF6B35]/20 truncate"
              >
                {post.platforms?.map((p, i) => (
                  <PlatformIcon key={i} platform={p} className="w-3 h-3 flex-shrink-0" />
                ))}
                <span className="truncate">{post.content?.slice(0, 20)}...</span>
              </div>
            ))}
            {dayPosts.length > 2 && (
              <div className="text-xs text-[#666666]">+{dayPosts.length - 2} autre(s)</div>
            )}
          </div>
          {/* Mobile: just show dot indicator */}
          {dayPosts.length > 0 && (
            <div className="sm:hidden flex justify-center mt-1">
              <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        {/* Days header - Desktop */}
        <div className="hidden sm:grid grid-cols-7 bg-[#FAFAFA] border-b border-[#E5E5E5]">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
            <div key={d} className="text-center py-3 text-sm font-medium text-[#666666]">
              {d}
            </div>
          ))}
        </div>
        {/* Days header - Mobile */}
        <div className="sm:hidden grid grid-cols-7 bg-[#FAFAFA] border-b border-[#E5E5E5]">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} className="text-center py-2 text-xs font-medium text-[#666666]">
              {d}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    );
  };

  // Calendar List View
  const renderListView = () => {
    const sortedPosts = [...posts].sort((a, b) => 
      new Date(a.scheduled_at) - new Date(b.scheduled_at)
    );
    
    const groupedPosts = sortedPosts.reduce((acc, post) => {
      const date = post.scheduled_at?.split('T')[0] || 'Sans date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(post);
      return acc;
    }, {});

    if (Object.keys(groupedPosts).length === 0) {
      return (
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-[#E5E5E5]" />
          <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Aucune publication programmée</h3>
          <p className="text-[#666666] mb-4">Commencez par créer votre premier post</p>
          <Button onClick={openNewPost} className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Créer un post
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(groupedPosts).map(([date, datePosts]) => {
          const dateObj = new Date(date);
          const isToday = new Date().toISOString().startsWith(date);
          
          return (
            <div key={date} className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              {/* Date Header */}
              <div className={`px-4 py-3 border-b border-[#E5E5E5] flex items-center gap-3 ${
                isToday ? 'bg-orange-50' : 'bg-[#FAFAFA]'
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                  isToday ? 'bg-[#FF6B35] text-white' : 'bg-white text-[#1A1A1A]'
                }`}>
                  {dateObj.getDate()}
                </div>
                <div>
                  <p className="font-medium text-[#1A1A1A] capitalize">
                    {dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })}
                    {isToday && <Badge className="ml-2 bg-[#FF6B35] text-white text-xs">Aujourd'hui</Badge>}
                  </p>
                  <p className="text-xs text-[#666666]">
                    {dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              
              {/* Posts */}
              <div className="divide-y divide-[#E5E5E5]">
                {datePosts.map((post) => (
                  <div key={post.id} className="p-4 hover:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Time & Platforms */}
                      <div className="text-center w-16 flex-shrink-0">
                        <p className="text-lg font-bold text-[#1A1A1A]">
                          {new Date(post.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex gap-1 justify-center mt-1">
                          {post.platforms?.map((p, idx) => (
                            <PlatformIcon key={idx} platform={p} className="w-4 h-4" />
                          ))}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1A1A1A] line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <StatusBadge status={post.status} />
                          {post.media_urls?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <Image className="w-3 h-3 mr-1" />
                              {post.media_urls.length} média(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Media Preview */}
                      {post.media_urls?.length > 0 && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F8F8F8] flex-shrink-0">
                          <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          <DropdownMenuItem onClick={() => openEditPost(post)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
    <div data-testid="social-media-page" className="space-y-4 sm:space-y-6">
      {/* Header - Agorapulse Style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Social Media</h1>
          <p className="text-[#666666] text-xs sm:text-sm">Gérez vos réseaux sociaux</p>
        </div>
        <Button onClick={openNewPost} className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Créer un post
        </Button>
      </div>

      {/* Stats - Agorapulse Orange Theme */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-[#1A1A1A]">{stats.posts?.scheduled || 0}</p>
                  <p className="text-[10px] sm:text-xs text-[#666666]">Programmés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-100 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-[#1A1A1A]">{stats.posts?.published || 0}</p>
                  <p className="text-[10px] sm:text-xs text-[#666666]">Publiés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gray-100 flex-shrink-0">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-[#1A1A1A]">{stats.posts?.drafts || 0}</p>
                  <p className="text-[10px] sm:text-xs text-[#666666]">Brouillons</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-100 flex-shrink-0">
                  <Inbox className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-[#1A1A1A]">{stats.inbox?.unread || 0}</p>
                  <p className="text-[10px] sm:text-xs text-[#666666]">Non lus</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5] col-span-2 sm:col-span-1">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-[#1A1A1A]">{stats.inbox?.pending_reply || 0}</p>
                  <p className="text-[10px] sm:text-xs text-[#666666]">À répondre</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-[#E5E5E5] p-1 rounded-xl w-full sm:w-auto grid grid-cols-3 sm:flex">
          <TabsTrigger value="calendar" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white rounded-lg text-xs sm:text-sm">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Calendrier</span>
          </TabsTrigger>
          <TabsTrigger value="inbox" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white rounded-lg text-xs sm:text-sm">
            <Inbox className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Boîte</span>
            {stats?.inbox?.unread > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1">{stats.inbox.unread}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accounts" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white rounded-lg text-xs sm:text-sm">
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Comptes</span>
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-4">
          {/* Calendar Header with Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const today = new Date();
                setCurrentMonth(today.getMonth() + 1);
                setCurrentYear(today.getFullYear());
              }}>
                Aujourd'hui
              </Button>
              <div className="flex items-center">
                <Button variant="ghost" size="sm" onClick={() => {
                  if (currentMonth === 1) {
                    setCurrentMonth(12);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
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
              <span className="text-lg font-semibold text-[#1A1A1A] ml-2">
                {monthNames[currentMonth - 1]} {currentYear}
              </span>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#F8F8F8] rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarViewMode("list")}
                className={calendarViewMode === "list" 
                  ? "bg-white shadow-sm text-[#FF6B35]" 
                  : "text-[#666666]"}
              >
                <LayoutList className="w-4 h-4 mr-1" />
                Liste
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarViewMode("month")}
                className={calendarViewMode === "month" 
                  ? "bg-white shadow-sm text-[#FF6B35]" 
                  : "text-[#666666]"}
              >
                <CalendarDays className="w-4 h-4 mr-1" />
                Mois
              </Button>
            </div>
          </div>

          {/* Calendar Content */}
          {calendarViewMode === "month" ? renderMonthView() : renderListView()}
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
                            ? 'border-[#FF6B35] bg-orange-50'
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
                                <div className="w-2 h-2 bg-[#FF6B35] rounded-full" />
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
                      <div className="bg-orange-50 rounded-lg p-4 mb-4 border-l-4 border-[#FF6B35]">
                        <p className="text-xs text-[#FF6B35] font-medium mb-1">Votre réponse</p>
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
                        className="mb-3 border-[#FF6B35] text-[#FF6B35]"
                      >
                        {loadingAI ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
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
                        className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white"
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
          <div className="space-y-6">
            {/* Meta Connection Card */}
            <Card className="bg-white border-[#E5E5E5]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1877F2] to-[#E4405F] flex items-center justify-center">
                      <Facebook className="w-4 h-4 text-white" />
                    </div>
                    Connexion Meta (Facebook & Instagram)
                  </CardTitle>
                  {metaConnected && (
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connecté
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {metaLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1877F2]" />
                    <span className="ml-3 text-[#666666]">Connexion en cours...</span>
                  </div>
                ) : metaConnected ? (
                  <div className="space-y-4">
                    {/* Connected Pages */}
                    <div>
                      <h4 className="text-sm font-medium text-[#1A1A1A] mb-3">Pages connectées ({metaPages.length})</h4>
                      <div className="grid gap-3">
                        {metaPages.map((page) => (
                          <div 
                            key={page.page_id}
                            className="flex items-center gap-3 p-3 bg-[#F8F8F8] rounded-lg border border-[#E5E5E5]"
                          >
                            {page.picture_url ? (
                              <img src={page.picture_url} alt={page.page_name} className="w-10 h-10 rounded-full" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                                <Facebook className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-[#1A1A1A]">{page.page_name}</p>
                              <div className="flex items-center gap-2 text-xs text-[#666666]">
                                <span>{page.category}</span>
                                {page.has_instagram && (
                                  <Badge className="bg-pink-100 text-pink-700 border-0 text-xs">
                                    <Instagram className="w-3 h-3 mr-1" />
                                    Instagram lié
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
                              onClick={() => {
                                setSelectedPage(page);
                                setPublishModalOpen(true);
                              }}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Publier
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
                      <Button
                        variant="outline"
                        onClick={fetchMetaPages}
                        disabled={metaLoading}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${metaLoading ? 'animate-spin' : ''}`} />
                        Rafraîchir les pages
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDisconnectMeta}
                      >
                        Déconnecter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#1877F2] to-[#E4405F] flex items-center justify-center">
                      <Facebook className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">Connectez vos réseaux sociaux</h3>
                    <p className="text-[#666666] mb-6 max-w-md mx-auto">
                      Connectez vos pages Facebook et comptes Instagram Business pour publier directement depuis Alpha Agency CRM.
                    </p>
                    <Button
                      onClick={handleConnectMeta}
                      className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
                      disabled={metaLoading}
                    >
                      {metaLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Facebook className="w-4 h-4 mr-2" />
                      )}
                      Connecter Facebook & Instagram
                    </Button>
                    <p className="text-xs text-[#999999] mt-4 max-w-sm mx-auto">
                      Vous serez redirigé vers Facebook pour autoriser l'accès à vos pages.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Published Posts History */}
            {metaConnected && publishedPosts.length > 0 && (
              <Card className="bg-white border-[#E5E5E5]">
                <CardHeader>
                  <CardTitle className="text-lg">Historique des publications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {publishedPosts.slice(0, 10).map((post) => (
                      <div 
                        key={post.id}
                        className="flex items-start gap-3 p-3 bg-[#F8F8F8] rounded-lg"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          post.platform === 'facebook' ? 'bg-[#1877F2]' : 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]'
                        }`}>
                          {post.platform === 'facebook' ? (
                            <Facebook className="w-4 h-4 text-white" />
                          ) : (
                            <Instagram className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1A1A1A] line-clamp-2">{post.content || post.caption}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[#666666]">
                            <span>{post.page_name}</span>
                            <span>•</span>
                            <span>{new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">Publié</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Post Modal - Agorapulse Style */}
      <CreatePostModal
        open={postModalOpen}
        onOpenChange={setPostModalOpen}
        accounts={accounts}
        editingPost={editingPost}
        onSuccess={() => {
          fetchCalendar();
          fetchData();
        }}
      />
    </div>
  );
};

export default SocialMediaPage;
