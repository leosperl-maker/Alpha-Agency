import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, Loader2, AlertCircle, Sparkles, User, 
  MessageSquare, Trash2, RefreshCw, Settings2, Info,
  Users, PieChart, FileText, Wallet, BarChart3, Plus,
  History, ChevronLeft, Edit2, Check, X, Clock
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "../../components/ui/select";
import { toast } from "sonner";
import { aiAPI } from "../../lib/api";

const AIAssistantPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [contextType, setContextType] = useState("general");
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch AI status and conversations on mount
  useEffect(() => {
    fetchStatus();
    fetchConversations();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStatus = async () => {
    try {
      const res = await aiAPI.getStatus();
      setStatus(res.data);
    } catch (error) {
      console.error("Error fetching AI status:", error);
    }
  };

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await aiAPI.getConversations();
      setConversations(res.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId) => {
    try {
      const res = await aiAPI.getConversation(conversationId);
      setCurrentConversationId(conversationId);
      // Convert stored messages to the format we need
      const msgs = res.data.messages || [];
      setMessages(msgs.map(m => ({
        role: m.role,
        content: m.content
      })));
      setContextType(res.data.context_type || "general");
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Erreur lors du chargement de la conversation");
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setContextType("general");
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await aiAPI.chatWithConversation({
        conversation_id: currentConversationId,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        context_type: contextType === "general" ? null : contextType,
        context_id: null
      });

      setMessages([...newMessages, {
        role: "assistant",
        content: response.data.message
      }]);

      // Update conversation ID if new
      if (!currentConversationId && response.data.conversation_id) {
        setCurrentConversationId(response.data.conversation_id);
        fetchConversations(); // Refresh list
      }

      // Update usage status
      if (response.data.usage) {
        setStatus(prev => ({
          ...prev,
          calls_today: response.data.usage.calls_today,
          remaining: response.data.usage.remaining
        }));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Erreur lors de la communication avec l'assistant";
      toast.error(errorMessage);
      
      // Remove the user message if error
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearCurrentChat = async () => {
    if (currentConversationId) {
      try {
        await aiAPI.deleteConversation(currentConversationId);
        toast.success("Conversation supprimée");
        fetchConversations();
        startNewConversation();
      } catch (error) {
        toast.error("Erreur lors de la suppression");
      }
    } else {
      setMessages([]);
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette conversation ?")) return;
    
    try {
      await aiAPI.deleteConversation(convId);
      toast.success("Conversation supprimée");
      fetchConversations();
      if (convId === currentConversationId) {
        startNewConversation();
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const startEditingTitle = (conv, e) => {
    e.stopPropagation();
    setEditingTitle(conv.id);
    setNewTitle(conv.title);
  };

  const saveTitle = async (convId, e) => {
    e.stopPropagation();
    if (!newTitle.trim()) return;
    
    try {
      await aiAPI.updateConversation(convId, newTitle.trim());
      setEditingTitle(null);
      fetchConversations();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const cancelEditTitle = (e) => {
    e.stopPropagation();
    setEditingTitle(null);
    setNewTitle("");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const contextOptions = [
    { value: "general", label: "Général", icon: MessageSquare },
    { value: "contacts", label: "Contacts", icon: Users },
    { value: "pipeline", label: "Pipeline", icon: PieChart },
    { value: "invoices", label: "Facturation", icon: FileText },
    { value: "budget", label: "Budget", icon: Wallet },
  ];

  // Suggested prompts
  const suggestedPrompts = [
    "Analyse mon pipeline et donne-moi des conseils",
    "Quelles sont les factures en retard ?",
    "Comment améliorer mon taux de conversion ?",
    "Résume l'activité commerciale du mois",
    "Quels clients devrais-je relancer ?"
  ];

  if (status && !status.enabled) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="bg-white border-[#E5E5E5] max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Assistant IA désactivé</h3>
            <p className="text-[#666666]">
              L'assistant IA est temporairement désactivé ou la clé API n'est pas configurée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="ai-assistant-page" className="h-[calc(100vh-120px)] flex gap-4">
      {/* Sidebar - Conversation History */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <Card className="bg-white border-[#E5E5E5] h-full flex flex-col">
          <CardHeader className="pb-2 border-b border-[#E5E5E5]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#1A1A1A] flex items-center gap-2">
                <History className="w-4 h-4" />
                Historique
              </CardTitle>
              <Button
                size="sm"
                onClick={startNewConversation}
                className="h-7 bg-[#CE0202] hover:bg-[#B00202] text-white"
              >
                <Plus className="w-3 h-3 mr-1" />
                Nouveau
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#CE0202]" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 text-[#666666]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Aucune conversation</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group p-2 rounded-lg cursor-pointer transition-colors ${
                      currentConversationId === conv.id
                        ? 'bg-[#CE0202]/10 border border-[#CE0202]/20'
                        : 'hover:bg-[#F8F8F8]'
                    }`}
                  >
                    {editingTitle === conv.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => saveTitle(conv.id, e)}>
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditTitle}>
                          <X className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate flex-1">
                            {conv.title}
                          </p>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => startEditingTitle(conv, e)}
                            >
                              <Edit2 className="w-3 h-3 text-[#666666]" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => deleteConversation(conv.id, e)}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-[#999999]" />
                          <span className="text-xs text-[#666666]">{formatDate(conv.updated_at || conv.created_at)}</span>
                          {conv.messages?.length > 0 && (
                            <span className="text-xs text-[#999999]">
                              • {conv.messages.length} msg
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Toggle Sidebar Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <History className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <Bot className="w-6 h-6 text-[#CE0202]" />
                Assistant IA
              </h1>
              <p className="text-[#666666] text-xs">Propulsé par Perplexity AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {status && (
              <Badge variant="outline" className="text-[#666666] text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                {status.remaining}/{status.daily_limit} restantes
              </Badge>
            )}
            
            {/* Context Selector */}
            <Select value={contextType} onValueChange={setContextType}>
              <SelectTrigger className="w-36 h-8 bg-white border-[#E5E5E5] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {contextOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="w-3 h-3" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearCurrentChat}
              disabled={messages.length === 0 && !currentConversationId}
              className="h-8"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Effacer
            </Button>
          </div>
        </div>

        {/* Chat Card */}
        <Card className="bg-white border-[#E5E5E5] flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center mb-4">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
                  Bonjour ! Je suis votre assistant IA
                </h3>
                <p className="text-[#666666] text-sm max-w-md mb-6">
                  Je peux vous aider à analyser vos données, gérer vos clients, 
                  et prendre de meilleures décisions commerciales.
                </p>
                
                {/* Suggested prompts */}
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(prompt)}
                      className="px-3 py-1.5 text-xs bg-[#F8F8F8] hover:bg-[#E5E5E5] text-[#666666] rounded-full transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-[#CE0202] text-white"
                          : "bg-[#F8F8F8] text-[#1A1A1A]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-[#F8F8F8] rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-[#666666]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Réflexion en cours...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-[#E5E5E5]">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question..."
                disabled={loading || (status && status.remaining <= 0)}
                className="flex-1 bg-[#F8F8F8] border-[#E5E5E5]"
                maxLength={status?.max_message_length || 2000}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading || (status && status.remaining <= 0)}
                className="bg-[#CE0202] hover:bg-[#B00202] text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            {input.length > 0 && status && (
              <p className="text-xs text-[#666666] mt-1">
                {input.length}/{status.max_message_length} caractères
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AIAssistantPage;
