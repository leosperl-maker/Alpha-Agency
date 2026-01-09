import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Bot, Send, Loader2, X, Minimize2, Maximize2, 
  MessageSquare, Sparkles, User
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import { aiAPI } from "../lib/api";

const FloatingAIChat = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const bubbleRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check if we should hide (on assistant page)
  const shouldHide = location.pathname === "/admin/assistant";

  // Initialize position on mount
  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 80
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // Fetch AI status
  useEffect(() => {
    if (shouldHide) return;
    const fetchStatus = async () => {
      try {
        const res = await aiAPI.getStatus();
        setStatus(res.data);
      } catch (error) {
        console.error("Error fetching AI status:", error);
      }
    };
    fetchStatus();
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const chatMessages = newMessages.filter(m => m.role === "user" || m.role === "assistant");
      
      const response = await aiAPI.chat({
        messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
        context_type: null,
        context_id: null
      });

      setMessages([...newMessages, {
        role: "assistant",
        content: response.data.message
      }]);

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

  const toggleChat = () => {
    if (!isOpen) {
      setIsMinimized(false);
    }
    setIsOpen(!isOpen);
  };

  // Don't render on assistant page
  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Floating Bubble */}
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
        <div 
          onClick={(e) => {
            if (!isDragging) {
              e.stopPropagation();
              toggleChat();
            }
          }}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            isOpen 
              ? 'bg-[#1A1A1A]' 
              : 'bg-gradient-to-br from-[#CE0202] to-[#8B0000]'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Bot className="w-7 h-7 text-white" />
          )}
        </div>
        
        {!isOpen && status?.remaining > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div 
          className="fixed z-[9998] w-[380px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden"
          style={{
            right: Math.max(16, window.innerWidth - position.x - 380),
            bottom: Math.max(16, window.innerHeight - position.y + 20),
            maxHeight: 'calc(100vh - 120px)'
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#CE0202] to-[#8B0000] p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistant IA</h3>
                  <p className="text-xs text-white/80">Perplexity • {status?.remaining || 0} requêtes</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="h-[350px] p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <p className="text-[#1A1A1A] font-medium text-sm mb-1">Comment puis-je vous aider ?</p>
                <p className="text-[#666666] text-xs max-w-[240px]">
                  Posez-moi vos questions sur vos clients, votre pipeline, vos factures...
                </p>
                
                <div className="mt-4 space-y-2 w-full">
                  {["Résume mon pipeline", "Factures en attente ?", "Tâches urgentes"].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(prompt)}
                      className="w-full px-3 py-2 text-xs bg-[#F8F8F8] hover:bg-[#E5E5E5] text-[#666666] rounded-lg transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
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
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        msg.role === "user"
                          ? "bg-[#CE0202] text-white"
                          : "bg-[#F8F8F8] text-[#1A1A1A]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-[#F8F8F8] rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-[#CE0202]" />
                        <span className="text-xs text-[#666666]">Réflexion...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-[#E5E5E5] bg-white">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Votre question..."
                disabled={loading || (status && status.remaining <= 0)}
                className="flex-1 text-sm bg-[#F8F8F8] border-[#E5E5E5] h-9"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading || (status && status.remaining <= 0)}
                className="bg-[#CE0202] hover:bg-[#B00202] text-white h-9 w-9 p-0"
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

      {/* Minimized state */}
      {isOpen && isMinimized && (
        <div 
          className="fixed z-[9998] bg-white rounded-xl shadow-lg border border-[#E5E5E5] p-3 cursor-pointer hover:shadow-xl transition-shadow"
          style={{
            right: Math.max(16, window.innerWidth - position.x - 200),
            bottom: Math.max(16, window.innerHeight - position.y + 20)
          }}
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Assistant IA</p>
              <p className="text-xs text-[#666666]">{messages.length} messages</p>
            </div>
            <Maximize2 className="w-4 h-4 text-[#666666]" />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAIChat;
