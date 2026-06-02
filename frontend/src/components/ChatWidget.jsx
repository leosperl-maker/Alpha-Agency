import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const API = process.env.REACT_APP_BACKEND_URL || "";

// Orbe assistant (dégradé rouge marque, CSS pur) — cohérent avec l'orbe admin.
const Orb = ({ className = "" }) => (
  <span className={`relative inline-flex items-center justify-center ${className}`}>
    <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FF4257] via-[#E11D2E] to-[#7A0A18]" />
    <span className="absolute inset-[3px] rounded-full bg-gradient-to-tr from-white/30 to-transparent" />
  </span>
);

const GREETING =
  "Bonjour, je suis l'assistant d'Alpha Agency. Dites-moi votre projet (site web, réseaux sociaux, identité visuelle...) et je vous oriente.";

const SUGGESTIONS = [
  "Je veux un site web",
  "Gérer mes réseaux sociaux",
  "Créer mon logo",
  "Demander un devis",
];

const ChatWidget = () => {
  const reduce = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const openChat = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: GREETING }]);
    }
    setTimeout(() => inputRef.current?.focus(), 350);
  };

  const send = useCallback(
    async (text) => {
      const content = (text ?? input).trim();
      if (!content || loading) return;

      const history = [...messages, { role: "user", content }];
      setMessages(history);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(`${API}/api/public/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            session_id: sessionId,
          }),
        });
        const data = await res.json();
        if (data.session_id) setSessionId(data.session_id);
        if (data.lead_captured) setLeadCaptured(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || "..." },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Désolé, j'ai un souci de connexion. Écrivez-nous à leo.sperl@alphagency.fr ou au +596 696 44 73 53.",
          },
        ]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [input, loading, messages, sessionId]
  );

  return (
    <>
      {/* Lanceur */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { scale: 0, opacity: 0 }}
            onClick={openChat}
            aria-label="Ouvrir l'assistant Alpha Agency"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#E11D2E] pl-3 pr-5 py-3 shadow-[0_10px_40px_-8px_rgba(225,29,46,0.7)] transition-transform hover:scale-[1.03] active:scale-95"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Orb className="w-8 h-8" />
            <span className="text-white font-semibold text-sm hidden sm:block">
              Discuter avec nous
            </span>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white">
              <span className="absolute inset-[3px] rounded-full bg-[#E11D2E] animate-pulse" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Fenêtre */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            data-lenis-prevent
            className="fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0507]/95 backdrop-blur-xl shadow-2xl w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2.5rem)]"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Halo marque */}
            <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#E11D2E]/20 blur-3xl" />

            {/* En-tête */}
            <div className="relative flex items-center justify-between px-4 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Orb className="w-9 h-9" />
                <div>
                  <h3 className="text-white font-display font-semibold text-sm leading-tight">
                    Assistant Alpha
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-white/50 text-[11px]">En ligne</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div data-lenis-prevent className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#E11D2E] text-white rounded-br-md"
                        : "bg-white/[0.06] text-white/90 border border-white/10 rounded-bl-md"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.06] border border-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span
                          key={d}
                          className="w-1.5 h-1.5 bg-[#E11D2E] rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {leadCaptured && (
                <div className="flex justify-center pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" /> Demande transmise à l'équipe
                  </span>
                </div>
              )}

              {/* Suggestions au démarrage */}
              {messages.length <= 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-[#E11D2E]/15 text-white/70 hover:text-white text-xs border border-white/10 hover:border-[#E11D2E]/40 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Saisie */}
            <div
              className="relative p-3 border-t border-white/10"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Votre message..."
                  className="flex-1 px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-full text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#E11D2E]/50"
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  aria-label="Envoyer"
                  className="w-10 h-10 flex-shrink-0 bg-[#E11D2E] hover:bg-[#c4162a] rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-center text-[10px] text-white/30 mt-2 flex items-center justify-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Assistant IA Alpha Agency · Guadeloupe
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
