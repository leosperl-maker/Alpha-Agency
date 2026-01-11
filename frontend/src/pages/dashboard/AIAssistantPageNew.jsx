import { useState, useEffect, useRef } from "react";
import { 
  Send, Loader2, Sparkles, User, Image as ImageIcon,
  Plus, Upload, Wand2, Camera, Download, Zap, CheckCircle2, AlertCircle,
  FileText, Users, ListTodo, Search, Menu, X, ChevronDown, MessageCircle, History
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { toast } from "sonner";
import { aiEnhancedAPI, aiAPI } from "../../lib/api";

const AIAssistantPageNew = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [attachedImage, setAttachedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [mode, setMode] = useState("chat");
  const [actionsEnabled, setActionsEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

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
      setShowHistory(false);
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
    setShowHistory(false);
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
      let response;
      
      if (selectedModel === "perplexity" && !userMessage.image_url) {
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

  const modelOptions = [
    { value: "gpt-4o", label: "GPT-4o", description: "Vision + Texte", icon: "🤖" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Rapide", icon: "⚡" },
    { value: "perplexity", label: "Perplexity", description: "Recherche web", icon: "🔍" },
  ];

  const currentModel = modelOptions.find(m => m.value === selectedModel);

  const suggestions = [
    "Combien de leads ai-je ?",
    "Quelles tâches sont en retard ?",
    "Résume mon pipeline"
  ];

  return (
    <div data-testid="assistant-page" className="h-[calc(100vh-4rem)] flex flex-col bg-[#0a0a12] overflow-hidden">
      {/* Mobile History Panel */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div 
            className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-[#0a0a12] border-r border-white/10 p-4 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Historique</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <Button 
              onClick={startNewConversation}
              className="w-full mb-4 bg-indigo-600 hover:bg-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle conversation
            </Button>
            <div className="space-y-2">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    currentConversationId === conv.id 
                      ? 'bg-indigo-600/20 border border-indigo-500/40' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm text-white/90 line-clamp-2">{conv.title}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {new Date(conv.updated_at || conv.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Perplexity-style centered layout */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4">
        {/* Minimal Header */}
        <header className="flex items-center justify-between py-3 border-b border-white/5">
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <History className="w-5 h-5 text-white/60" />
          </button>
          
          <div className="flex items-center gap-2">
            {status?.features?.context_aware && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                <Zap className="w-3 h-3" />
                Context-Aware
              </span>
            )}
            <span className="text-xs text-white/40">
              {status?.remaining || 0}/{status?.daily_limit || 200}
            </span>
          </div>
          
          <button
            onClick={() => setActionsEnabled(!actionsEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              actionsEnabled ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:bg-white/10'
            }`}
            title={actionsEnabled ? "Actions activées" : "Actions désactivées"}
          >
            <ListTodo className="w-5 h-5" />
          </button>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 py-6">
          {messages.length === 0 ? (
            /* Empty State - Perplexity-inspired */
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <h1 className="text-2xl sm:text-3xl font-light text-white mb-8">
                Que voulez-vous savoir ?
              </h1>
              
              {/* Suggestions */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white" 
                        : "bg-white/5 border border-white/10 text-white/90"
                    }`}>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="Attached" className="max-w-full max-h-48 rounded-lg mb-2" />
                      )}
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      
                      {msg.action_executed && (
                        <div className={`mt-2 pt-2 border-t ${msg.action_executed.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            msg.action_executed.success 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {msg.action_executed.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            Action exécutée
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Image Preview */}
        {imagePreview && (
          <div className="relative inline-block mb-2">
            <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
            <button
              onClick={removeAttachedImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Generated Image */}
        {generatedImage && (
          <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <img src={generatedImage} alt="Generated" className="max-h-64 rounded-lg mx-auto" />
            <Button onClick={downloadGeneratedImage} size="sm" className="mt-2 w-full">
              <Download className="w-4 h-4 mr-2" /> Télécharger
            </Button>
          </div>
        )}

        {/* Input Area - Perplexity-style */}
        <div className="pb-4 sm:pb-6">
          <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  mode === "chat" ? handleSend() : handleGenerateImage();
                }
              }}
              placeholder="Posez une question..."
              rows={1}
              className="w-full bg-transparent text-white placeholder-white/40 px-4 py-3 pr-24 resize-none focus:outline-none text-sm"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
              <div className="flex items-center gap-1">
                {/* Model selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{currentModel?.label}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showModelMenu && (
                    <div className="absolute bottom-full left-0 mb-1 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-10">
                      {modelOptions.map(model => (
                        <button
                          key={model.value}
                          onClick={() => { setSelectedModel(model.value); setShowModelMenu(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 transition-colors ${
                            selectedModel === model.value ? 'bg-indigo-600/20 text-indigo-400' : 'text-white/80'
                          }`}
                        >
                          <span>{model.icon}</span>
                          <span className="text-sm">{model.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Image attach */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageAttach}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
                
                {/* Mode toggle */}
                <button
                  onClick={() => setMode(mode === "chat" ? "generate" : "chat")}
                  className={`p-2 rounded-lg transition-colors ${
                    mode === "generate" ? "text-purple-400 bg-purple-500/20" : "text-white/40 hover:text-white hover:bg-white/10"
                  }`}
                  title={mode === "chat" ? "Passer en mode génération d'image" : "Passer en mode chat"}
                >
                  <Wand2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* Send button */}
              <button
                onClick={mode === "chat" ? handleSend : handleGenerateImage}
                disabled={loading || generatingImage || (!input.trim() && !attachedImage)}
                className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading || generatingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPageNew;
