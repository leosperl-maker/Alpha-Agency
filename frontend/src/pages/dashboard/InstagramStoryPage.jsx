import { useState, useEffect, useRef } from "react";
import {
  Instagram, Plus, Image, Video, Type, BarChart2, HelpCircle,
  Clock, Calendar, Send, Trash2, Eye, EyeOff, Settings, User, Lock,
  CheckCircle2, XCircle, Loader2, RefreshCw, ChevronDown, MessageCircle,
  History, Filter, ArrowLeft
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import StoryEditor from "../../components/StoryEditor";

const API = process.env.REACT_APP_BACKEND_URL;

const InstagramStoryPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [viewMode, setViewMode] = useState("all"); // all, account
  const [filterAccountId, setFilterAccountId] = useState(null);
  const [testingAccount, setTestingAccount] = useState(null);
  
  // New account form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Publishing state
  const [publishing, setPublishing] = useState(false);

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
      const res = await fetch(`${API}/api/instagram-story/drafts?limit=100`, {
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
    setTestingAccount(accountId);
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts/${accountId}/test`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success("Connexion Instagram réussie !");
        loadAccounts();
      } else {
        toast.error(data.error || "Échec de connexion");
      }
    } catch (error) {
      toast.error("Erreur lors du test de connexion");
    } finally {
      setTestingAccount(null);
    }
  };

  const deleteAccount = async (accountId) => {
    if (!confirm("Supprimer ce compte Instagram ? Les stories associées seront conservées.")) return;
    
    try {
      const res = await fetch(`${API}/api/instagram-story/accounts/${accountId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        toast.success("Compte supprimé");
        loadAccounts();
        if (selectedAccount?.id === accountId) {
          setSelectedAccount(accounts.find(a => a.id !== accountId) || null);
        }
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleEditorSave = async (editorData) => {
    if (!selectedAccount) {
      toast.error("Sélectionnez un compte Instagram");
      return;
    }

    try {
      // Upload media if needed
      let mediaUrl = editorData.mediaPreview;
      
      if (editorData.mediaFile) {
        const formData = new FormData();
        formData.append("file", editorData.mediaFile);
        
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

      // Get poll/question data from stickers
      const pollSticker = editorData.stickers.find(s => s.type === "poll");
      const questionSticker = editorData.stickers.find(s => s.type === "question");
      const textSticker = editorData.stickers.find(s => s.type === "text");

      const draftData = {
        account_id: selectedAccount.id,
        media_url: mediaUrl,
        media_type: editorData.mediaFile?.type?.startsWith('video/') ? 'video' : 'image',
        background_color: editorData.backgroundColor,
        text_overlay: textSticker?.data?.text || null,
        poll: pollSticker ? {
          question: pollSticker.data.question,
          options: pollSticker.data.options.filter(o => o)
        } : null,
        question: questionSticker ? {
          question: questionSticker.data.question
        } : null,
      };

      const res = await fetch(`${API}/api/instagram-story/drafts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(draftData)
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Brouillon créé !");
        setShowVisualEditor(false);
        loadDrafts();
      } else {
        toast.error(data.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  const handleEditorPublish = async (editorData) => {
    if (!selectedAccount) {
      toast.error("Sélectionnez un compte Instagram");
      return;
    }

    setPublishing(true);

    try {
      // Upload media if needed
      let mediaUrl = editorData.mediaPreview;
      
      if (editorData.mediaFile) {
        const formData = new FormData();
        formData.append("file", editorData.mediaFile);
        
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

      // Get poll/question data from stickers
      const pollSticker = editorData.stickers.find(s => s.type === "poll");
      const questionSticker = editorData.stickers.find(s => s.type === "question");
      const textSticker = editorData.stickers.find(s => s.type === "text");

      const draftData = {
        account_id: selectedAccount.id,
        media_url: mediaUrl,
        media_type: editorData.mediaFile?.type?.startsWith('video/') ? 'video' : 'image',
        background_color: editorData.backgroundColor,
        text_overlay: textSticker?.data?.text || null,
        poll: pollSticker ? {
          question: pollSticker.data.question,
          options: pollSticker.data.options.filter(o => o)
        } : null,
        question: questionSticker ? {
          question: questionSticker.data.question
        } : null,
      };

      // Create draft first
      const draftRes = await fetch(`${API}/api/instagram-story/drafts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(draftData)
      });

      const draftResult = await draftRes.json();

      if (!draftResult.success) {
        toast.error(draftResult.error || "Erreur lors de la création");
        return;
      }

      // Now publish
      const pubRes = await fetch(`${API}/api/instagram-story/drafts/${draftResult.draft_id}/publish`, {
        method: "POST",
        headers: getAuthHeaders()
      });

      const pubData = await pubRes.json();

      if (pubData.success) {
        toast.success("Story publiée avec succès !");
        setShowVisualEditor(false);
        loadDrafts();
      } else {
        toast.error(pubData.error || "Erreur lors de la publication");
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
    if (!confirm("Supprimer ce brouillon ?")) return;
    
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

  // Filter drafts by account
  const filteredDrafts = filterAccountId 
    ? drafts.filter(d => d.account_id === filterAccountId)
    : drafts;

  const pendingDrafts = filteredDrafts.filter(d => d.status !== 'published');
  const publishedDrafts = filteredDrafts.filter(d => d.status === 'published');

  // Group published stories by account
  const storiesByAccount = accounts.map(acc => ({
    account: acc,
    stories: drafts.filter(d => d.account_id === acc.id)
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  // Visual Editor View
  if (showVisualEditor) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => setShowVisualEditor(false)}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </Button>
            <h1 className="text-xl font-bold text-white">Créer une Story</h1>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-6">
            <p className="text-yellow-300 text-sm">
              ⚠️ L'automatisation Instagram est contre les CGU. Risque de suspension de compte.
            </p>
          </div>

          {/* Editor */}
          <StoryEditor
            accounts={accounts}
            selectedAccountId={selectedAccount?.id}
            onAccountChange={(id) => setSelectedAccount(accounts.find(a => a.id === id))}
            onSave={handleEditorSave}
            onPublish={handleEditorPublish}
            isPublishing={publishing}
          />
        </div>
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
              data-testid="add-account-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un compte
            </Button>
            <Button 
              onClick={() => setShowVisualEditor(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              disabled={accounts.length === 0}
              data-testid="create-story-btn"
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
        <div className="glass-panel rounded-xl p-6" data-testid="accounts-section">
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
              {accounts.map((account) => {
                const accountStories = drafts.filter(d => d.account_id === account.id);
                const publishedCount = accountStories.filter(d => d.status === 'published').length;
                const pendingCount = accountStories.filter(d => d.status !== 'published').length;
                
                return (
                  <div 
                    key={account.id}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedAccount?.id === account.id 
                        ? 'bg-pink-500/20 border-pink-500' 
                        : 'bg-white/5 border-white/10 hover:border-pink-500/50'
                    }`}
                    data-testid={`account-card-${account.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 flex items-center justify-center">
                          <Instagram className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">@{account.username}</p>
                          <p className="text-white/40 text-xs flex items-center gap-1">
                            {account.login_success === true ? (
                              <><CheckCircle2 className="w-3 h-3 text-green-400" /> Connecté</>
                            ) : account.login_success === false ? (
                              <><XCircle className="w-3 h-3 text-red-400" /> Échec connexion</>
                            ) : (
                              <><Clock className="w-3 h-3 text-yellow-400" /> Non testé</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Account Stats */}
                    <div className="flex gap-4 mb-3 text-xs">
                      <div className="flex items-center gap-1 text-white/60">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        {publishedCount} publiées
                      </div>
                      <div className="flex items-center gap-1 text-white/60">
                        <Clock className="w-3 h-3 text-blue-400" />
                        {pendingCount} en attente
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => testAccountLogin(account.id)}
                        disabled={testingAccount === account.id}
                        data-testid={`test-account-${account.id}`}
                      >
                        {testingAccount === account.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <><RefreshCw className="w-3 h-3 mr-1" /> Tester</>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setFilterAccountId(account.id);
                          setViewMode("account");
                        }}
                        data-testid={`view-history-${account.id}`}
                      >
                        <History className="w-3 h-3 mr-1" />
                        Historique
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="text-xs"
                        onClick={() => deleteAccount(account.id)}
                        data-testid={`delete-account-${account.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter Bar (when viewing specific account) */}
        {viewMode === "account" && filterAccountId && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-pink-500/10 border border-pink-500/30">
            <Filter className="w-5 h-5 text-pink-400" />
            <span className="text-white">
              Affichage des stories de <strong>@{accounts.find(a => a.id === filterAccountId)?.username}</strong>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setViewMode("all"); setFilterAccountId(null); }}
              className="ml-auto text-white/70 hover:text-white"
            >
              Voir tous
            </Button>
          </div>
        )}

        {/* Drafts & Scheduled Section */}
        <div className="glass-panel rounded-xl p-6" data-testid="pending-section">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Stories en attente ({pendingDrafts.length})
          </h2>
          
          {pendingDrafts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Aucune story en attente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingDrafts.map((draft) => (
                <div key={draft.id} className="bg-white/5 rounded-lg overflow-hidden border border-white/10" data-testid={`draft-${draft.id}`}>
                  <div className="aspect-[9/16] max-h-56 bg-black/50 relative">
                    {draft.media_url ? (
                      <img 
                        src={draft.media_url} 
                        alt="Story preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: draft.background_color || "#000" }}
                      >
                        <Image className="w-8 h-8 text-white/30" />
                      </div>
                    )}
                    {draft.elements?.text_overlay && (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <p className="text-white text-lg font-bold text-center drop-shadow-lg">
                          {draft.elements.text_overlay}
                        </p>
                      </div>
                    )}
                    {draft.elements?.poll && (
                      <div className="absolute bottom-3 left-3 right-3 bg-white/90 rounded-lg p-2">
                        <p className="text-xs text-gray-800 font-medium truncate">{draft.elements.poll.question}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-sm">@{draft.instagram_username}</span>
                      {getStatusBadge(draft.status)}
                    </div>
                    
                    {draft.schedule_time && (
                      <p className="text-white/50 text-xs mb-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(draft.schedule_time).toLocaleString('fr-FR')}
                      </p>
                    )}
                    
                    {draft.error_message && (
                      <p className="text-red-400 text-xs mb-2 truncate" title={draft.error_message}>
                        ⚠️ {draft.error_message}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      {(draft.status === 'draft' || draft.status === 'failed') && (
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

        {/* Published Stories Section */}
        {publishedDrafts.length > 0 && (
          <div className="glass-panel rounded-xl p-6" data-testid="published-section">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Stories publiées ({publishedDrafts.length})
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {publishedDrafts.slice(0, 18).map((draft) => (
                <div 
                  key={draft.id} 
                  className="aspect-[9/16] rounded-lg overflow-hidden bg-white/5 relative group"
                  data-testid={`published-${draft.id}`}
                >
                  {draft.media_url ? (
                    <img 
                      src={draft.media_url} 
                      alt="Story"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full"
                      style={{ backgroundColor: draft.background_color || "#000" }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs"
                      onClick={() => deleteDraft(draft.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-xs truncate">@{draft.instagram_username}</p>
                    <p className="text-white/60 text-[10px]">
                      {new Date(draft.published_at).toLocaleDateString('fr-FR')}
                    </p>
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
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md" data-testid="add-account-modal">
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
                  data-testid="username-input"
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
                    data-testid="password-input"
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
                  data-testid="save-account-btn"
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
    </div>
  );
};

export default InstagramStoryPage;
