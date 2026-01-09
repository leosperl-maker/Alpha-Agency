import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Bot, Send, Loader2, X, Minimize2, 
  MessageSquare, Sparkles, User, History, ChevronLeft
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import { aiAPI } from "../lib/api";

const FloatingAIChat = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const bubbleRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check if we should hide (on assistant page)
  const shouldHide = location.pathname === "/admin/assistant";

  // Initialize position on mount
  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 100
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // Fetch AI status and conversations
  useEffect(() => {
    if (shouldHide) return;
    const fetchData = async () => {
      try {
        const [statusRes, convRes] = await Promise.all([
          aiAPI.getStatus(),
          aiAPI.getConversations(10)
        ]);
        setStatus(statusRes.data);
        setConversations(convRes.data);
        
        // Load most recent conversation if exists
        if (convRes.data.length > 0) {
          const latest = convRes.data[0];
          setCurrentConversationId(latest.id);
          setMessages((latest.messages || []).map(m => ({ role: m.role, content: m.content })));
        }
      } catch (error) {
        console.error("Error fetching AI status:", error);
      }
    };
    fetchData();
  }, [shouldHide]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle drag start
  const handleDragStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    
    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  // Handle drag move
  useEffect(() => {
    const handleDragMove = (e) => {
      if (!isDragging) return;
      
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      
      let newX = clientX - dragOffset.x;
      let newY = clientY - dragOffset.y;
      
      const bubbleSize = 64;
      newX = Math.max(0, Math.min(newX, window.innerWidth - bubbleSize));
      newY = Math.max(0, Math.min(newY, window.innerHeight - bubbleSize));
      
      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, dragOffset]);

  const loadConversation = async (conv) => {
    setCurrentConversationId(conv.id);
    setMessages((conv.messages || []).map(m => ({ role: m.role, content: m.content })));
    setShowHistory(false);
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setShowHistory(false);
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
        context_type: null,
        context_id: null
      });

      setMessages([...newMessages, {
        role: "assistant",
        content: response.data.message
      }]);

      // Update conversation ID if new
      if (!currentConversationId && response.data.conversation_id) {
        setCurrentConversationId(response.data.conversation_id);
        // Refresh conversations list
        const convRes = await aiAPI.getConversations(10);
        setConversations(convRes.data);
      }

      if (response.data.usage) {
        setStatus(prev => ({
          ...prev,
          calls_today: response.data.usage.calls_today,
          remaining: response.data.usage.remaining
        }));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Erreur de communication";
      toast.error(errorMessage);
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

  const closeChat = () => {
    setIsOpen(false);
    setShowHistory(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Don't render on assistant page
  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Floating Bubble - Only shown when chat is closed */}
      {!isOpen && (
        <div
          ref={bubbleRef}
          className={`fixed z-[9999] cursor-pointer transition-transform select-none ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
          style={{
            left: position.x,
            top: position.y,
            touchAction: 'none'
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <button 
            onClick={(e) => {
              if (!isDragging) {
                e.stopPropagation();
                setIsOpen(true);
              }
            }}
            className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all bg-gradient-to-br from-[#CE0202] to-[#8B0000] hover:shadow-xl"
          >
            <Bot className="w-7 h-7 text-white" />
          </button>
          
          {/* Notification dot */}
          {status && status.remaining > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          )}
        </div>
      )}

      {/* Chat Window - Positioned fixed bottom right */}
      {isOpen && (
        <div
          className="fixed z-[9998] bottom-4 right-4 bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden w-[360px] sm:w-[400px]"
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#CE0202] to-[#8B0000] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showHistory && (
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <Bot className="w-5 h-5" />
              <span className="font-medium text-sm">
                {showHistory ? 'Historique' : 'Assistant IA'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!showHistory && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Historique"
                >
                  <History className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={closeChat}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showHistory ? (
            // History View
            <div className="flex flex-col" style={{ height: '450px' }}>
              <div className="p-3 border-b border-[#E5E5E5]">
                <Button
                  size="sm"
                  onClick={startNewConversation}
                  className="w-full h-9 bg-[#CE0202] hover:bg-[#B00202] text-white text-sm"
                >
                  Nouvelle conversation
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[#E5E5E5]" />
                      <p className="text-sm text-[#666666]">Aucune conversation</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentConversationId === conv.id
                            ? 'bg-[#CE0202]/10 border border-[#CE0202]/30'
                            : 'hover:bg-[#F8F8F8] border border-transparent'
                        }`}
                      >
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{conv.title}</p>
                        <p className="text-xs text-[#666666] mt-1">
                          {formatDate(conv.updated_at || conv.created_at)} • {conv.messages?.length || 0} msg
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Chat View
            <div className="flex flex-col" style={{ height: '450px' }}>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center mb-4">
                      <Bot className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-[#1A1A1A] font-medium mb-1">Bonjour !</p>
                    <p className="text-sm text-[#666666]">
                      Comment puis-je vous aider ?
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                            msg.role === "user"
                              ? "bg-[#CE0202] text-white"
                              : "bg-[#F8F8F8] text-[#1A1A1A]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        {msg.role === "user" && (
                          <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {loading && (
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-[#F8F8F8] rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#CE0202]" />
                            <span className="text-sm text-[#666666]">Réflexion...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Usage indicator */}
              {status && (
                <div className="px-4 py-2 bg-[#F8F8F8] border-t border-[#E5E5E5]">
                  <div className="flex items-center justify-between text-xs text-[#666666]">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#CE0202]" />
                      {status.remaining}/{status.daily_limit} requêtes
                    </span>
                    <span>Perplexity AI</span>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-[#E5E5E5] bg-white">
                <div className="flex gap-2 items-center">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Votre message..."
                    disabled={loading || (status && status.remaining <= 0)}
                    className="flex-1 h-10 text-sm bg-[#F8F8F8] border-[#E5E5E5] focus:border-[#CE0202] focus:ring-[#CE0202]/20"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || loading || (status && status.remaining <= 0)}
                    size="sm"
                    className="h-10 w-10 p-0 bg-[#CE0202] hover:bg-[#B00202] text-white rounded-full"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingAIChat;
