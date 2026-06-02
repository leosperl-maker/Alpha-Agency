import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Loader2, CheckCircle2, Eraser } from "lucide-react";
import { aiEnhancedAPI } from "../lib/api";
import AssistantOrb from "./AssistantOrb";

const MODEL = "gemini-2.5-flash";
const SUGGESTIONS = [
  "Quelles factures sont en retard ?",
  "Qui je dois relancer en priorité ?",
  "Crée une tâche : rappeler demain",
  "Écris un email de relance",
];

/**
 * Admin AI assistant — conversational, context-aware (real CRM data) and
 * able to act (create task/quote, update contact) via /api/ai-enhanced/chat.
 * Runs on Gemini (server-side). Theme-aware slide-over.
 */
const AssistantChat = ({ open, onOpenChange, seed }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await aiEnhancedAPI.chat({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        model: MODEL,
        enable_actions: true,
        include_context: true,
        conversation_id: convId,
      });
      if (res.data.conversation_id) setConvId(res.data.conversation_id);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: res.data.message || "…",
        action: res.data.action_executed?.success ? res.data.action_executed.message : null,
      }]);
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: detail
          ? `⚠️ ${detail}`
          : "⚠️ Assistant indisponible pour l'instant (connexion au serveur impossible). Réessaie une fois en ligne.",
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, convId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      {/* Slide-over */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-[440px] bg-card border-l border-border shadow-pop flex flex-col"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <AssistantOrb size={34} pulse={loading} />
            <div>
              <h2 className="text-foreground font-semibold text-sm leading-tight">Assistant Alpha</h2>
              <p className="text-muted-foreground text-[11px] leading-tight">Gemini · connecté à ton CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setConvId(null); }} title="Effacer"
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Eraser className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => onOpenChange(false)} title="Fermer"
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <AssistantOrb size={56} pulse />
              <p className="mt-4 text-foreground font-medium">Comment puis-je t'aider ?</p>
              <p className="text-muted-foreground text-sm mt-1">Pose une question sur ton CRM, ou demande-moi d'agir.</p>
              <div className="mt-5 grid grid-cols-1 gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-muted border border-transparent hover:border-border text-sm text-foreground/85 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <AssistantOrb size={26} className="mt-0.5" />}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : m.error
                      ? "bg-danger-soft text-danger rounded-bl-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                }`}>
                  {m.content}
                  {m.action && (
                    <div className="mt-2 flex items-center gap-1.5 text-success text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {m.action}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-2.5">
              <AssistantOrb size={26} className="mt-0.5" />
              <div className="bg-secondary rounded-2xl rounded-bl-md px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex items-end gap-2 rounded-2xl bg-background border border-border focus-within:border-primary/40 transition-colors p-1.5 pl-3.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Demande-moi, ou dis-moi quoi faire…"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm resize-none max-h-32 py-1.5"
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:brightness-110 transition-all">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantChat;
