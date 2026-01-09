import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, Loader2, AlertCircle, Sparkles, User, 
  MessageSquare, Trash2, RefreshCw, Settings2, Info,
  Users, PieChart, FileText, Wallet, BarChart3
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
  const [contextType, setContextType] = useState("");
  const messagesEndRef = useRef(null);

  // Fetch AI status on mount
  useEffect(() => {
    fetchStatus();
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await aiAPI.chat({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        context_type: contextType || null,
        context_id: null
      });

      setMessages([...newMessages, {
        role: "assistant",
        content: response.data.message
      }]);

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

  const clearChat = () => {
    setMessages([]);
  };

  const contextOptions = [
    { value: "", label: "Général", icon: MessageSquare },
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
    <div data-testid="ai-assistant-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <Bot className="w-7 h-7 text-[#CE0202]" />
            Assistant IA
          </h1>
          <p className="text-[#666666] text-sm">Propulsé par Perplexity AI</p>
        </div>
        
        {status && (
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-[#666666]">
              <Sparkles className="w-3 h-3 mr-1" />
              {status.remaining}/{status.daily_limit} requêtes restantes
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Effacer
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="bg-white border-[#E5E5E5] h-[calc(100vh-280px)] flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
                    Bonjour ! Je suis votre assistant IA
                  </h3>
                  <p className="text-[#666666] max-w-md mb-6">
                    Je peux vous aider à analyser vos données, gérer vos clients, 
                    et prendre de meilleures décisions commerciales.
                  </p>
                  
                  {/* Suggested prompts */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(prompt)}
                        className="px-3 py-1.5 text-sm bg-[#F8F8F8] hover:bg-[#E5E5E5] text-[#666666] rounded-full transition-colors"
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

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Context Selector */}
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#1A1A1A] flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Contexte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={contextType} onValueChange={setContextType}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue placeholder="Sélectionner le contexte" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {contextOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#666666] mt-2">
                Le contexte enrichit les réponses avec vos données
              </p>
            </CardContent>
          </Card>

          {/* Usage Info */}
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#1A1A1A] flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Utilisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {status && (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#666666]">Requêtes aujourd'hui</span>
                      <span className="text-[#1A1A1A] font-medium">
                        {status.calls_today}/{status.daily_limit}
                      </span>
                    </div>
                    <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#CE0202] transition-all"
                        style={{ width: `${(status.calls_today / status.daily_limit) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#666666]">
                    Limite réinitialisée chaque jour à minuit
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-[#F8F8F8] border-[#E5E5E5]">
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-[#CE0202] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A] mb-1">Conseils</p>
                  <ul className="text-xs text-[#666666] space-y-1">
                    <li>• Sélectionnez un contexte pour des réponses plus précises</li>
                    <li>• Posez des questions spécifiques sur vos données</li>
                    <li>• L'assistant peut suggérer des actions à faire</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
