import { useState, useEffect, useRef } from "react";
import { 
  Send, Loader2, Sparkles, User, Image as ImageIcon,
  Plus, Wand2, Camera, Download, Zap, CheckCircle2, AlertCircle,
  X, ChevronDown, History, Trash2, RefreshCw, Bot, Check
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { aiEnhancedAPI, aiAPI } from "../../lib/api";

// Simple markdown to HTML converter (handles **bold** and removes unwanted asterisks)
const formatMessage = (text) => {
  if (!text) return "";
  
  // Convert **bold** to <strong>
  let formatted = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
  
  // Convert *italic* to <em> (single asterisks)
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert bullet points
  formatted = formatted.replace(/^- /gm, '• ');
  formatted = formatted.replace(/^\* /gm, '• ');
  
  // Convert numbered lists
  formatted = formatted.replace(/^(\d+)\. /gm, '<span class="text-indigo-600">$1.</span> ');
  
  // Convert line breaks
  formatted = formatted.replace(/\n/g, '<br/>');
  
  return formatted;
};

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
  const [mode, setMode] = useState("chat"); // chat or generate
  const [actionsEnabled, setActionsEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showModelDialog, setShowModelDialog] = useState(false);
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

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
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
    { value: "gemini-3-flash-preview", label: "Gemini Flash", description: "Rapide", icon: "⚡" },
    { value: "nano-banana", label: "Nano Banana", description: "Image Gen", icon: "🍌" },
    { value: "perplexity", label: "Perplexity", description: "Recherche", icon: "🔍" },
  ];

  const currentModel = modelOptions.find(m => m.value === selectedModel) || modelOptions[0];

  const suggestions = [
    "Combien de leads ai-je ce mois ?",
    "Quelles tâches sont en retard ?",
    "Résume mon pipeline",
    "Quel est mon solde Qonto ?"
  ];

  return (
    <TooltipProvider>
      <div data-testid="assistant-page" className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-b from-[#0a0a12] to-[#0d0d1a] overflow-hidden">
        
        {/* History Panel */}
        {showHistory && (
          <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm" onClick={() => setShowHistory(false)}>
            <div 
              className="absolute inset-y-0 left-0 w-80 max-w-[90vw] bg-gradient-to-b from-[#12121f] to-[#0a0a12] border-r border-slate-200 flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-base font-semibold text-slate-900">Conversations</h2>
                <button 
                  onClick={() => setShowHistory(false)} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              
              {/* New conversation button */}
              <div className="p-3 border-b border-slate-200">
                <Button 
                  onClick={startNewConversation}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 h-9 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle conversation
                </Button>
              </div>
              
              {/* Conversations list */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-1.5">
                  {conversations.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">Aucune conversation</p>
                  ) : (
                    conversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                          currentConversationId === conv.id 
                            ? 'bg-indigo-50 border border-indigo-500/30' 
                            : 'bg-white hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        <p className="text-sm text-slate-900 line-clamp-2 pr-6">{conv.title || "Conversation"}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(conv.updated_at || conv.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-700 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
          
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowHistory(true)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <History className="w-5 h-5 text-slate-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Historique des conversations</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={startNewConversation}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-5 h-5 text-slate-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Nouvelle conversation</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="flex items-center gap-3">
              {status?.features?.context_aware && (
                <span className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                  <Zap className="w-3 h-3" />
                  Context-Aware
                </span>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-slate-400 bg-white px-2 py-1 rounded-full">
                    {status?.remaining || 0}/{status?.daily_limit || 200}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Requêtes restantes aujourd'hui</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-xl sm:text-2xl font-light text-slate-900 mb-2">
                  Comment puis-je vous aider ?
                </h1>
                <p className="text-sm text-slate-500 mb-8 max-w-sm">
                  Je peux accéder à vos contacts, tâches, factures, budget et bien plus.
                </p>
                
                {/* Suggestions */}
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === "user" 
                        ? "bg-gradient-to-br from-cyan-500 to-blue-600" 
                        : "bg-gradient-to-br from-indigo-500 to-purple-600"
                    }`}>
                      {msg.role === "user" ? (
                        <User className="w-4 h-4 text-slate-900" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-slate-900" />
                      )}
                    </div>
                    <div className={`max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                      <div className={`inline-block rounded-2xl px-4 py-2.5 ${
                        msg.role === "user" 
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white" 
                          : "bg-white border border-slate-200 text-slate-900"
                      }`}>
                        {msg.image_url && (
                          <img src={msg.image_url} alt="Attached" className="max-w-full max-h-40 rounded-lg mb-2" />
                        )}
                        <div 
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                        />
                        
                        {msg.action_executed && (
                          <div className={`mt-2 pt-2 border-t ${msg.action_executed.success ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                              msg.action_executed.success 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {msg.action_executed.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              Action exécutée
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-4 h-4 text-slate-900" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Image Preview */}
          {imagePreview && (
            <div className="px-4 pb-2">
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-16 rounded-lg border border-slate-200" />
                <button
                  onClick={removeAttachedImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <X className="w-3 h-3 text-slate-900" />
                </button>
              </div>
            </div>
          )}

          {/* Generated Image */}
          {generatedImage && (
            <div className="mx-4 mb-3 p-3 bg-white rounded-xl border border-slate-200">
              <img src={generatedImage} alt="Generated" className="max-h-48 rounded-lg mx-auto" />
              <Button onClick={downloadGeneratedImage} size="sm" className="mt-2 w-full h-8 text-xs">
                <Download className="w-3 h-3 mr-1" /> Télécharger
              </Button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200">
            <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
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
                placeholder={mode === "chat" ? "Posez une question..." : "Décrivez l'image à générer..."}
                rows={1}
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 px-4 py-3 resize-none focus:outline-none text-sm"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              
              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-2 py-1.5 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-0.5">
                  {/* Model selector - Opens Dialog on mobile, dropdown on desktop */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowModelDialog(true)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <span>{currentModel.icon}</span>
                        <span className="hidden sm:inline">{currentModel.label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Changer de modèle IA</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Image attach */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageAttach}
                    className="hidden"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Joindre une image</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Mode toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setMode(mode === "chat" ? "generate" : "chat")}
                        className={`p-2 rounded-lg transition-colors ${
                          mode === "generate" ? "text-purple-400 bg-purple-500/20" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <Wand2 className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{mode === "chat" ? "Passer en génération d'image" : "Passer en mode chat"}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* Actions toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActionsEnabled(!actionsEnabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          actionsEnabled ? "text-amber-400 bg-amber-500/20" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{actionsEnabled ? "Actions automatiques activées" : "Actions automatiques désactivées"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Send button */}
                <button
                  onClick={mode === "chat" ? handleSend : handleGenerateImage}
                  disabled={loading || generatingImage || (!input.trim() && !attachedImage)}
                  className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
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

      {/* Model Selection Dialog */}
      <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
        <DialogContent className="bg-slate-50 border-slate-200 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Bot className="w-5 h-5 text-indigo-600" />
              Choisir un modèle IA
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2 py-2">
            {modelOptions.map(model => (
              <button
                key={model.value}
                onClick={() => { setSelectedModel(model.value); setShowModelDialog(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedModel === model.value 
                    ? 'bg-indigo-50 border-2 border-indigo-500/50' 
                    : 'bg-white border-2 border-transparent hover:bg-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  selectedModel === model.value ? 'bg-indigo-600/30' : 'bg-white'
                }`}>
                  {model.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${selectedModel === model.value ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {model.label}
                  </p>
                  <p className="text-xs text-slate-400">{model.description}</p>
                </div>
                {selectedModel === model.value && (
                  <Check className="w-5 h-5 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
          
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              Sélectionnez le modèle adapté à votre besoin
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default AIAssistantPageNew;
