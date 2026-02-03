import { useState, useEffect, useRef } from "react";
import {
  Instagram, Plus, Image, Video, Type, BarChart2, HelpCircle,
  Clock, Calendar, Send, Trash2, Eye, EyeOff, Settings, User, Lock,
  CheckCircle2, XCircle, Loader2, RefreshCw, ChevronDown, MessageCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const InstagramStoryPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  
  // New account form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Story creation
  const [storyMedia, setStoryMedia] = useState(null);
  const [storyMediaPreview, setStoryMediaPreview] = useState(null);
  const [storyText, setStoryText] = useState("");
  const [storyPoll, setStoryPoll] = useState({ enabled: false, question: "", options: ["", ""] });
  const [storyQuestion, setStoryQuestion] = useState({ enabled: false, question: "" });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [publishing, setPublishing] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAccounts();
    loadDrafts();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("alpha_token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0 && !selectedAccount) {
          setSelectedAccount(data.accounts[0]);
        }
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async () => {
    try {
      const res = await fetch(`${API}/api/instagram-story/drafts`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error("Error loading drafts:", error);
    }
  };

  const addAccount = async () => {
    if (!newUsername || !newPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    setSavingAccount(true);
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Compte @${newUsername} ajouté !`);
        setNewUsername("");
        setNewPassword("");
        setShowAddAccount(false);
        loadAccounts();
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setSavingAccount(false);
    }
  };

  const testAccountLogin = async (accountId) => {
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts/${accountId}/test`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success("Connexion réussie !");
        loadAccounts();
      } else {
        toast.error(data.error || "Échec de connexion");
      }
    } catch (error) {
      toast.error("Erreur lors du test");
    }
  };

  const deleteAccount = async (accountId) => {
    if (!confirm("Supprimer ce compte Instagram ?")) return;
    
    try {
      await fetch(`${API}/api/instagram-story/accounts/${accountId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      toast.success("Compte supprimé");
      loadAccounts();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error("Format non supporté. Utilisez une image ou vidéo.");
      return;
    }
    
    setStoryMedia(file);
    setStoryMediaPreview(URL.createObjectURL(file));
  };

  const createStory = async (publishNow = false) => {
    if (!selectedAccount) {
      toast.error("Sélectionnez un compte Instagram");
      return;
    }
    
    if (!storyMedia && !storyMediaPreview) {
      toast.error("Ajoutez une image ou vidéo");
      return;
    }
    
    setPublishing(true);
    
    try {
      // First upload media if needed
      let mediaUrl = storyMediaPreview;
      
      if (storyMedia) {
        const formData = new FormData();
        formData.append("file", storyMedia);
        
        const uploadRes = await fetch(`${API}/api/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${localStorage.getItem("alpha_token")}` },
          body: formData
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          mediaUrl = uploadData.url;
        }
      }
      
      // Create draft with engagement stickers
      const draftData = {
        account_id: selectedAccount.id,
        media_url: mediaUrl,
        media_type: storyMedia?.type?.startsWith('video/') ? 'video' : 'image',
        text_overlay: storyText || null,
        poll: storyPoll.enabled ? {
          question: storyPoll.question,
          options: storyPoll.options.filter(o => o)
        } : null,
        question: storyQuestion.enabled ? {
          question: storyQuestion.question
        } : null,
        schedule_time: scheduleEnabled && scheduleDate && scheduleTime 
          ? `${scheduleDate}T${scheduleTime}:00` 
          : null
      };
      
      const res = await fetch(`${API}/api/instagram-story/drafts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(draftData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (publishNow && !scheduleEnabled) {
          // Publish immediately
          const pubRes = await fetch(`${API}/api/instagram-story/drafts/${data.draft_id}/publish`, {
            method: "POST",
            headers: getAuthHeaders()
          });
          
          const pubData = await pubRes.json();
          
          if (pubData.success) {
            toast.success("Story publiée avec succès !");
          } else {
            toast.error(pubData.error || "Erreur lors de la publication");
          }
        } else {
          toast.success(scheduleEnabled ? "Story programmée !" : "Brouillon créé !");
        }
        
        // Reset form
        setStoryMedia(null);
        setStoryMediaPreview(null);
        setStoryText("");
        setStoryPoll({ enabled: false, question: "", options: ["", ""] });
        setScheduleEnabled(false);
        setShowCreateStory(false);
        loadDrafts();
      } else {
        toast.error(data.error || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setPublishing(false);
    }
  };

  const publishDraft = async (draftId) => {
    try {
      const res = await fetch(`${API}/api/instagram-story/drafts/${draftId}/publish`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success("Story publiée !");
        loadDrafts();
      } else {
        toast.error(data.error || "Erreur lors de la publication");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  const deleteDraft = async (draftId) => {
    try {
      await fetch(`${API}/api/instagram-story/drafts/${draftId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      toast.success("Brouillon supprimé");
      loadDrafts();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { color: "bg-gray-500", text: "Brouillon" },
      scheduled: { color: "bg-blue-500", text: "Programmé" },
      publishing: { color: "bg-yellow-500", text: "Publication..." },
      published: { color: "bg-green-500", text: "Publié" },
      failed: { color: "bg-red-500", text: "Échoué" }
    };
    const badge = badges[status] || badges.draft;
    return <span className={`px-2 py-1 text-xs rounded-full ${badge.color} text-white`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Instagram className="w-8 h-8 text-pink-500" />
              Instagram Stories
            </h1>
            <p className="text-white/60 mt-1">Créez et programmez vos Stories Instagram</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowAddAccount(true)}
              variant="outline"
              className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un compte
            </Button>
            <Button 
              onClick={() => setShowCreateStory(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              disabled={accounts.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une Story
            </Button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-yellow-300 text-sm">
            ⚠️ <strong>Attention :</strong> L'automatisation Instagram est contre les CGU. 
            Utilisez à vos risques - votre compte pourrait être suspendu.
          </p>
        </div>

        {/* Accounts Section */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-pink-400" />
            Comptes Instagram ({accounts.length})
          </h2>
          
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <Instagram className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Aucun compte configuré</p>
              <Button 
                onClick={() => setShowAddAccount(true)}
                className="mt-4 bg-pink-600 hover:bg-pink-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter votre premier compte
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <div 
                  key={account.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedAccount?.id === account.id 
                      ? 'bg-pink-500/20 border-pink-500' 
                      : 'bg-white/5 border-white/10 hover:border-pink-500/50'
                  }`}
                  onClick={() => setSelectedAccount(account)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                        <Instagram className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">@{account.username}</p>
                        <p className="text-white/40 text-xs">
                          {account.login_success ? "✅ Connecté" : "⚠️ Non testé"}
                        </p>
                      </div>
                    </div>
                    
                    {selectedAccount?.id === account.id && (
                      <CheckCircle2 className="w-5 h-5 text-pink-400" />
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={(e) => { e.stopPropagation(); testAccountLogin(account.id); }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Tester
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="text-xs"
                      onClick={(e) => { e.stopPropagation(); deleteAccount(account.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drafts & Scheduled Section */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Stories en attente ({drafts.filter(d => d.status !== 'published').length})
          </h2>
          
          {drafts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Aucune story en attente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drafts.filter(d => d.status !== 'published').map((draft) => (
                <div key={draft.id} className="bg-white/5 rounded-lg overflow-hidden border border-white/10">
                  {draft.media_url && (
                    <div className="aspect-[9/16] max-h-48 bg-black/50 relative">
                      <img 
                        src={draft.media_url} 
                        alt="Story preview"
                        className="w-full h-full object-cover"
                      />
                      {draft.elements?.text_overlay && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-white text-lg font-bold text-center px-4 drop-shadow-lg">
                            {draft.elements.text_overlay}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-sm">@{draft.instagram_username}</span>
                      {getStatusBadge(draft.status)}
                    </div>
                    
                    {draft.schedule_time && (
                      <p className="text-white/50 text-xs mb-2">
                        📅 {new Date(draft.schedule_time).toLocaleString('fr-FR')}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      {draft.status === 'draft' && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-pink-600 hover:bg-pink-500 text-xs"
                          onClick={() => publishDraft(draft.id)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Publier
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="text-xs"
                        onClick={() => deleteDraft(draft.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Published Stories */}
        {drafts.filter(d => d.status === 'published').length > 0 && (
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Stories publiées
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {drafts.filter(d => d.status === 'published').slice(0, 12).map((draft) => (
                <div key={draft.id} className="aspect-[9/16] rounded-lg overflow-hidden bg-white/5 relative">
                  {draft.media_url && (
                    <img 
                      src={draft.media_url} 
                      alt="Story"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-xs truncate">@{draft.instagram_username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Instagram className="w-6 h-6 text-pink-500" />
              Ajouter un compte Instagram
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm block mb-1">Nom d'utilisateur</label>
                <Input
                  placeholder="votre_username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              
              <div>
                <label className="text-white/70 text-sm block mb-1">Mot de passe</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-300 text-xs">
                  🔐 Vos identifiants sont chiffrés et stockés de manière sécurisée.
                  MoltBot les utilise uniquement pour publier vos Stories.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowAddAccount(false); setShowPassword(false); }}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-pink-600 hover:bg-pink-500"
                  onClick={addAccount}
                  disabled={savingAccount}
                >
                  {savingAccount ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Ajouter"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Story Modal */}
      {showCreateStory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-pink-500" />
              Créer une Story
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Media Preview */}
              <div>
                <label className="text-white/70 text-sm block mb-2">Média</label>
                <div 
                  className="aspect-[9/16] rounded-lg bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-pink-500/50 transition-colors overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {storyMediaPreview ? (
                    <img 
                      src={storyMediaPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Image className="w-12 h-12 text-white/30 mx-auto mb-2" />
                      <p className="text-white/50 text-sm">Cliquez pour ajouter</p>
                      <p className="text-white/30 text-xs">Image ou Vidéo</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </div>
              
              {/* Options */}
              <div className="space-y-4">
                {/* Account Selection */}
                <div>
                  <label className="text-white/70 text-sm block mb-1">Compte Instagram</label>
                  <select
                    value={selectedAccount?.id || ""}
                    onChange={(e) => setSelectedAccount(accounts.find(a => a.id === e.target.value))}
                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>@{acc.username}</option>
                    ))}
                  </select>
                </div>
                
                {/* Text Overlay */}
                <div>
                  <label className="text-white/70 text-sm block mb-1">
                    <Type className="w-4 h-4 inline mr-1" />
                    Texte (optionnel)
                  </label>
                  <Input
                    placeholder="Texte sur la story..."
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                
                {/* Engagement Stickers Section */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                  <h4 className="text-pink-300 font-medium text-sm mb-3 flex items-center gap-2">
                    ✨ Stickers d'engagement
                  </h4>
                  
                  {/* Poll Sticker */}
                  <div className="mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={storyPoll.enabled}
                        onChange={(e) => setStoryPoll({ ...storyPoll, enabled: e.target.checked })}
                        className="rounded accent-pink-500"
                      />
                      <span className="text-white text-sm flex items-center gap-1">
                        <BarChart2 className="w-4 h-4 text-pink-400" />
                        Sondage
                      </span>
                    </label>
                    
                    {storyPoll.enabled && (
                      <div className="mt-2 space-y-2 p-3 rounded-lg bg-black/30">
                        <Input
                          placeholder="Posez votre question..."
                          value={storyPoll.question}
                          onChange={(e) => setStoryPoll({ ...storyPoll, question: e.target.value })}
                          className="bg-white/5 border-white/10 text-white text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Oui ✅"
                            value={storyPoll.options[0]}
                            onChange={(e) => setStoryPoll({ 
                              ...storyPoll, 
                              options: [e.target.value, storyPoll.options[1]] 
                            })}
                            className="bg-white/5 border-white/10 text-white text-sm"
                          />
                          <Input
                            placeholder="Non ❌"
                            value={storyPoll.options[1]}
                            onChange={(e) => setStoryPoll({ 
                              ...storyPoll, 
                              options: [storyPoll.options[0], e.target.value] 
                            })}
                            className="bg-white/5 border-white/10 text-white text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Question Sticker */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={storyQuestion.enabled}
                        onChange={(e) => setStoryQuestion({ ...storyQuestion, enabled: e.target.checked })}
                        className="rounded accent-purple-500"
                      />
                      <span className="text-white text-sm flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 text-purple-400" />
                        Question ouverte
                      </span>
                    </label>
                    
                    {storyQuestion.enabled && (
                      <div className="mt-2 p-3 rounded-lg bg-black/30">
                        <Input
                          placeholder="Posez-moi une question..."
                          value={storyQuestion.question}
                          onChange={(e) => setStoryQuestion({ ...storyQuestion, question: e.target.value })}
                          className="bg-white/5 border-white/10 text-white text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Schedule */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-white/70 text-sm">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Programmer la publication
                    </span>
                  </label>
                  
                  {scheduleEnabled && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateStory(false)}
              >
                Annuler
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => createStory(false)}
                disabled={publishing}
              >
                Sauvegarder brouillon
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                onClick={() => createStory(true)}
                disabled={publishing}
              >
                {publishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : scheduleEnabled ? (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Programmer
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publier maintenant
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramStoryPage;
