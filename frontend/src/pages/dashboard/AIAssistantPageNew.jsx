import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, Loader2, Sparkles, User, Image as ImageIcon,
  MessageSquare, Trash2, Plus, History, X, Upload, Wand2,
  ChevronLeft, Settings2, Zap, Camera, Download
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { toast } from "sonner";
import { aiEnhancedAPI } from "../../lib/api";

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
  const [mode, setMode] = useState("chat"); // chat, analyze, generate
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
    
    const tempImage = imagePreview;
    removeAttachedImage();

    try {
      const res = await aiEnhancedAPI.chat({
        messages: [...messages, userMessage],
        conversation_id: currentConversationId,
        model: selectedModel
      });

      const assistantMessage = {
        role: "assistant",
        content: res.data.message
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentConversationId(res.data.conversation_id);
      
      if (res.data.usage) {
        setStatus(prev => ({
          ...prev,
          remaining: res.data.usage.remaining,
          calls_today: res.data.usage.calls_today
        }));
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

  return (
    <div className="admin-body h-[calc(100vh-4rem)] flex relative z-10">
      {/* Sidebar - Conversations */}
      <aside className={`glass-sidebar w-72 flex-shrink-0 flex flex-col transition-all duration-300 ${sidebarOpen ? '' : '-ml-72'}`}>
        <div className="p-4 border-b border-white/5">
          <Button 
            onClick={startNewConversation}
            className="w-full btn-neon flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle conversation
          </Button>
        </div>
        
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`group p-3 rounded-xl cursor-pointer transition-all ${
                  currentConversationId === conv.id 
                    ? 'bg-indigo-500/20 border border-indigo-500/30' 
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white/80 line-clamp-2">{conv.title}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {new Date(conv.updated_at || conv.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Status */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Requêtes restantes</span>
            <span className={`font-semibold ${status?.remaining > 50 ? 'neon-green' : status?.remaining > 10 ? 'neon-orange' : 'text-red-400'}`}>
              {status?.remaining || 0}/{status?.daily_limit || 200}
            </span>
          </div>
        </div>
      </aside>

      {/* Toggle Sidebar */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-indigo-600 p-1.5 rounded-r-lg text-white hover:bg-indigo-500 transition-all"
        style={{ left: sidebarOpen ? '288px' : '0' }}
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
      </button>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="glass-topbar px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse-neon">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Assistant IA Alpha</h1>
              <p className="text-xs text-white/50">Propulsé par GPT-4o & Gemini</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setMode("chat")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "chat" ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"}`}
              >
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Chat
              </button>
              <button
                onClick={() => setMode("generate")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "generate" ? "bg-purple-600 text-white" : "text-white/60 hover:text-white"}`}
              >
                <Wand2 className="w-4 h-4 inline mr-1" />
                Générer
              </button>
            </div>

            {/* Model Select */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-44 input-neon">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                <SelectItem value="gpt-4o">GPT-4o (Vision)</SelectItem>
                <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          {mode === "chat" ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center mb-6">
                    <Bot className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Comment puis-je vous aider ?</h2>
                  <p className="text-white/50 max-w-md mx-auto">
                    Posez une question, envoyez une image à analyser, ou demandez-moi de générer du contenu.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {["Résume mes ventes du mois", "Analyse cette image", "Rédige un email client", "Suggère des tags"].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(suggestion)}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:border-indigo-500/50 transition-all"
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
                    className={`flex gap-4 animate-slide-up ${msg.role === "user" ? "justify-end" : ""}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-2xl ${msg.role === "user" ? "order-first" : ""}`}>
                      <div className={`rounded-2xl p-4 ${
                        msg.role === "user" 
                          ? "bg-indigo-600/80 text-white ml-auto" 
                          : "glass-panel text-white/90"
                      }`}>
                        {msg.image_url && (
                          <img src={msg.image_url} alt="Attached" className="max-w-xs rounded-lg mb-3" />
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-4 animate-slide-up">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="glass-panel rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-white/60">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Réflexion en cours...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Image Generation Mode */
            <div className="max-w-2xl mx-auto py-10 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center mb-4">
                  <Wand2 className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Générateur d'images IA</h2>
                <p className="text-white/50">Décrivez l'image que vous souhaitez créer</p>
              </div>

              {generatedImage && (
                <div className="mb-6 glass-panel p-4 rounded-2xl">
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

              <div className="glass-panel rounded-2xl p-6">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ex: Un logo moderne pour une agence digitale, style minimaliste, couleurs bleu et violet..."
                  className="w-full h-32 bg-transparent border-none resize-none text-white placeholder-white/30 focus:outline-none"
                />
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-white/40">Gemini Nano Banana</p>
                  <Button 
                    onClick={handleGenerateImage}
                    disabled={!input.trim() || generatingImage}
                    className="btn-neon bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Générer
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
          <div className="p-4 border-t border-white/5">
            <div className="max-w-4xl mx-auto">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 flex items-start gap-2">
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-white/20" />
                    <button
                      onClick={removeAttachedImage}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-3">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageAttach}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-indigo-500/50 transition-all"
                  title="Joindre une image"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={attachedImage ? "Décrivez ce que vous voulez savoir sur cette image..." : "Posez votre question..."}
                    className="input-neon pr-12 py-6"
                    disabled={loading}
                  />
                </div>

                <Button
                  onClick={handleSend}
                  disabled={loading || (!input.trim() && !attachedImage)}
                  className="btn-neon h-12 px-6"
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
