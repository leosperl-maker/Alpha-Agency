import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, Loader2, Sparkles, User, Image as ImageIcon,
  MessageSquare, Trash2, Plus, X, Upload, Wand2,
  ChevronLeft, Camera, Download, Zap, CheckCircle2, AlertCircle,
  FileText, Users, ListTodo
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { toast } from "sonner";
import { aiEnhancedAPI, aiAPI } from "../../lib/api";

const AIAssistantPageNew = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [attachedImage, setAttachedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [mode, setMode] = useState("chat");
  const [actionsEnabled, setActionsEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStatus();
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStatus = async () => {
    try {
      const res = await aiEnhancedAPI.getStatus();
      setStatus(res.data);
    } catch (error) {
      console.error("Error fetching AI status:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await aiEnhancedAPI.getConversations();
      setConversations(res.data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const res = await aiEnhancedAPI.getConversation(conversationId);
      setCurrentConversationId(conversationId);
      setMessages(res.data.messages || []);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setAttachedImage(null);
    setImagePreview(null);
    setGeneratedImage(null);
  };

  const handleImageAttach = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 10MB)");
      return;
    }
    
    setAttachedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || loading) return;

    const userContent = input.trim();
    const userMessage = { 
      role: "user", 
      content: userContent,
      image_url: imagePreview || null
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    removeAttachedImage();

    try {
      // Use Perplexity for text-only, enhanced API for vision
      let response;
      
      if (selectedModel === "perplexity" && !userMessage.image_url) {
        // Use legacy Perplexity API
        response = await aiAPI.chat({
          messages: [...messages, { role: "user", content: userContent }],
          context_type: "general"
        });
        
        const assistantMessage = {
          role: "assistant",
          content: response.data.message
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        if (response.data.usage) {
          setStatus(prev => ({
            ...prev,
            remaining: response.data.usage.remaining
          }));
        }
      } else {
        // Use enhanced API for GPT-4o / Gemini
        response = await aiEnhancedAPI.chat({
          messages: [...messages, userMessage],
          conversation_id: currentConversationId,
          model: selectedModel,
          include_context: true,
          enable_actions: actionsEnabled
        });

        const assistantMessage = {
          role: "assistant",
          content: response.data.message,
          action_executed: response.data.action_executed
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentConversationId(response.data.conversation_id);
        
        // Show toast for successful actions
        if (response.data.action_executed?.success) {
          toast.success(response.data.action_executed.message, {
            icon: <CheckCircle2 className="w-4 h-4" />
          });
        }
        
        if (response.data.usage) {
          setStatus(prev => ({
            ...prev,
            remaining: response.data.usage.remaining,
            calls_today: response.data.usage.calls_today
          }));
        }
      }
      
      fetchConversations();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur de communication");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!input.trim() || generatingImage) return;
    
    setGeneratingImage(true);
    setGeneratedImage(null);
    
    try {
      const res = await aiEnhancedAPI.generateImage(input.trim());
      
      if (res.data.success && res.data.image) {
        const imgSrc = `data:${res.data.image.mime_type};base64,${res.data.image.data}`;
        setGeneratedImage(imgSrc);
        toast.success("Image générée !");
      } else {
        toast.error(res.data.message || "Échec de la génération");
      }
      
      if (res.data.usage) {
        setStatus(prev => ({ ...prev, remaining: res.data.usage.remaining }));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur de génération");
    } finally {
      setGeneratingImage(false);
    }
  };

  const downloadGeneratedImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `alpha-ai-${Date.now()}.png`;
    link.click();
  };

  const handleDeleteConversation = async (id) => {
    try {
      await aiEnhancedAPI.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) startNewConversation();
      toast.success("Conversation supprimée");
    } catch (error) {
      toast.error("Erreur de suppression");
    }
  };

  // Model options with descriptions
  const modelOptions = [
    { value: "gpt-4o", label: "GPT-4o", description: "Vision + Texte", icon: "🤖" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Rapide", icon: "⚡" },
    { value: "perplexity", label: "Perplexity", description: "Recherche web", icon: "🔍" },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-[#0a0a12] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-purple-950/20 pointer-events-none" />
      
      {/* Sidebar - Conversations */}
      <aside className={`
        relative z-10 flex-shrink-0 flex flex-col transition-all duration-300 
        bg-black/40 backdrop-blur-xl border-r border-white/10
        ${sidebarOpen ? 'w-72' : 'w-0 -ml-1'}
        md:relative fixed inset-y-0 left-0
      `}>
        <div className={`${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity flex flex-col h-full`}>
          {/* New conversation button */}
          <div className="p-4 border-b border-white/10">
            <Button 
              onClick={startNewConversation}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle conversation
            </Button>
          </div>
          
          {/* Conversations list */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`
                    group p-3 rounded-xl cursor-pointer transition-all duration-200
                    ${currentConversationId === conv.id 
                      ? 'bg-indigo-600/20 border border-indigo-500/40 shadow-lg shadow-indigo-500/10' 
                      : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10'}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white/90 line-clamp-2 font-medium">{conv.title}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-white/40 mt-1.5">
                    {new Date(conv.updated_at || conv.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-center text-white/30 text-sm py-8">Aucune conversation</p>
              )}
            </div>
          </ScrollArea>

          {/* Status footer */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Requêtes</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status?.remaining > 50 ? 'bg-green-500' : status?.remaining > 10 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-white font-semibold text-sm">
                  {status?.remaining || 0}/{status?.daily_limit || 200}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`
          absolute z-20 top-1/2 -translate-y-1/2 
          bg-indigo-600 hover:bg-indigo-500 p-1.5 rounded-r-lg text-white 
          transition-all duration-300 shadow-lg
          ${sidebarOpen ? 'left-72' : 'left-0'}
        `}
      >
        <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`} />
      </button>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/30 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Assistant IA Alpha</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/50">GPT-4o • Gemini • Perplexity</p>
                {status?.features?.context_aware && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-semibold">
                    <Zap className="w-2.5 h-2.5" />
                    Context-Aware
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Actions Toggle */}
            <button
              onClick={() => setActionsEnabled(!actionsEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                actionsEnabled 
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400" 
                  : "bg-white/5 border-white/10 text-white/40"
              }`}
              title={actionsEnabled ? "Actions activées (l'IA peut créer des tâches, devis, etc.)" : "Actions désactivées"}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Actions {actionsEnabled ? "ON" : "OFF"}
            </button>

            {/* Mode Toggle */}
            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setMode("chat")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === "chat" 
                    ? "bg-indigo-600 text-white shadow-lg" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </button>
              <button
                onClick={() => setMode("generate")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === "generate" 
                    ? "bg-purple-600 text-white shadow-lg" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">Générer</span>
              </button>
            </div>

            {/* Model Select */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white hover:bg-white/10">
                <SelectValue placeholder="Choisir un modèle" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/20 shadow-xl">
                {modelOptions.map(model => (
                  <SelectItem 
                    key={model.value} 
                    value={model.value}
                    className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{model.icon}</span>
                      <span className="font-medium">{model.label}</span>
                      <span className="text-white/50 text-xs">({model.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 md:p-6">
          {mode === "chat" ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-12 md:py-20">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/10">
                    <Bot className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Comment puis-je vous aider ?</h2>
                  <p className="text-white/50 max-w-md mx-auto text-sm md:text-base mb-3">
                    Posez une question, envoyez une image à analyser, ou demandez-moi de générer du contenu.
                  </p>
                  {status?.features?.context_aware && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-6">
                      <Zap className="w-4 h-4" />
                      <span>J'ai accès à vos données CRM : factures, contacts, tâches, pipeline, devis...</span>
                    </div>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      "Quelles factures sont impayées ?", 
                      "Combien de leads ai-je ?", 
                      "Quelles tâches sont en retard ?", 
                      "Résume mon pipeline"
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(suggestion)}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:border-indigo-500/50 hover:text-white transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 md:gap-4 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-2xl ${msg.role === "user" ? "order-first" : ""}`}>
                      <div className={`rounded-2xl p-4 ${
                        msg.role === "user" 
                          ? "bg-indigo-600 text-white ml-auto" 
                          : "bg-white/5 backdrop-blur-sm border border-white/10 text-white/90"
                      }`}>
                        {msg.image_url && (
                          <img src={msg.image_url} alt="Attached" className="max-w-full md:max-w-xs rounded-lg mb-3" />
                        )}
                        <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
                        
                        {/* Action Result Badge */}
                        {msg.action_executed && (
                          <div className={`mt-3 pt-3 border-t ${msg.action_executed.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              msg.action_executed.success 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {msg.action_executed.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                              {msg.action_executed.task_id && <ListTodo className="w-3.5 h-3.5" />}
                              {msg.action_executed.quote_number && <FileText className="w-3.5 h-3.5" />}
                              {msg.action_executed.contact_id && <Users className="w-3.5 h-3.5" />}
                              <span>Action exécutée</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse shadow-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-white/60">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Réflexion en cours...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Image Generation Mode */
            <div className="max-w-2xl mx-auto py-6 md:py-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center mb-4 shadow-xl">
                  <Wand2 className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Générateur d'images IA</h2>
                <p className="text-white/50 text-sm">Décrivez l'image que vous souhaitez créer</p>
              </div>

              {generatedImage && (
                <div className="mb-6 bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-2xl">
                  <img src={generatedImage} alt="Generated" className="w-full rounded-xl mb-4" />
                  <div className="flex justify-center gap-3">
                    <Button onClick={downloadGeneratedImage} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                    <Button onClick={() => setGeneratedImage(null)} variant="ghost" className="text-white/60 hover:text-white">
                      Générer une autre
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ex: Un logo moderne pour une agence digitale, style minimaliste, couleurs bleu et violet..."
                  className="w-full h-32 bg-transparent border-none resize-none text-white placeholder-white/30 focus:outline-none text-sm md:text-base"
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40 flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    Gemini Nano Banana
                  </p>
                  <Button 
                    onClick={handleGenerateImage}
                    disabled={!input.trim() || generatingImage}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Générer l'image
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Input Area (Chat Mode) */}
        {mode === "chat" && (
          <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 flex items-start gap-2">
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="h-16 md:h-20 rounded-lg border border-white/20" />
                    <button
                      onClick={removeAttachedImage}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2 md:gap-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageAttach}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-indigo-500/50 transition-all flex-shrink-0"
                  title="Joindre une image"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <div className="flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={attachedImage ? "Décrivez ce que vous voulez savoir sur cette image..." : "Posez votre question..."}
                    className="bg-white/5 border-white/10 text-white placeholder-white/30 py-6 focus:border-indigo-500/50"
                    disabled={loading}
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && !attachedImage)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 h-12 px-4 md:px-6 flex-shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AIAssistantPageNew;
