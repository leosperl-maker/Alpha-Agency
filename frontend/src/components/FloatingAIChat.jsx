import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { 
  Bot, Send, Loader2, X, Minimize2, 
  MessageSquare, Sparkles, User, ChevronDown
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
  const messagesEndRef = useRef(null);
  
  // Draggable state
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Check if we should hide (on assistant page)
  const shouldHide = location.pathname === "/admin/assistant";

  // Fetch AI status on mount
  useEffect(() => {
    if (shouldHide) return;
    const fetchData = async () => {
      try {
        const statusRes = await aiAPI.getStatus();
        setStatus(statusRes.data);
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await aiAPI.chat({
        messages: [...messages, userMessage],
        context_type: "general"
      });

      const assistantMessage = {
        role: "assistant",
        content: res.data.message
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (res.data.usage) {
        setStatus(prev => ({
          ...prev,
          remaining: res.data.usage.remaining
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur de communication");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (shouldHide) return null;

  // Drag handlers for touch and mouse
  const handleDragStart = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: position.x ?? window.innerWidth - rect.width - 24,
        posY: position.y ?? window.innerHeight - rect.height - 24
      };
    }
    setIsDragging(true);
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    
    const newX = Math.max(24, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
    const newY = Math.max(24, Math.min(window.innerHeight - 80, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Calculate button style
  const getButtonStyle = () => {
    if (position.x !== null && position.y !== null) {
      return { left: position.x, top: position.y, right: 'auto', bottom: 'auto' };
    }
    return {}; // Use CSS default positioning
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          ref={dragRef}
          onClick={() => !isDragging && setIsOpen(true)}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={getButtonStyle()}
          className={`fixed ${position.x === null ? 'bottom-24 right-6' : ''} z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all duration-300 flex items-center justify-center group touch-none ${isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-110 cursor-grab'}`}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkles className="w-6 h-6 relative z-10" />
          {status?.remaining > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-xs font-bold flex items-center justify-center border-2 border-[#0a0a12]">
              {status.remaining > 99 ? '99+' : status.remaining}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-120px)] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 flex flex-col bg-[#0a0a12] border border-white/10">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Assistant Alpha</h3>
                <p className="text-white/70 text-xs">{status?.remaining || 0} requêtes restantes</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Effacer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center mb-3">
                    <Bot className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-white/50 text-sm">
                    Comment puis-je vous aider ?
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
                      <div className={`rounded-xl px-3 py-2 text-sm ${
                        msg.role === "user" 
                          ? "bg-indigo-600 text-white" 
                          : "bg-white/5 border border-white/10 text-white/90"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-md bg-cyan-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-black/40">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Votre message..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder-white/30 text-sm focus:border-indigo-500/50"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                size="icon"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex-shrink-0"
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
    </>
  );
};

export default FloatingAIChat;
