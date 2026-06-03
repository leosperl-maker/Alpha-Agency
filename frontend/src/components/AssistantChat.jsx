import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Loader2, CheckCircle2, Eraser, Sunrise, Clock, ThumbsUp, ThumbsDown } from "lucide-react";
import { aiEnhancedAPI, neoAPI } from "../lib/api";
import AssistantOrb from "./AssistantOrb";

const SUGGESTIONS = [
  "Qui je dois relancer en priorité ?",
  "Où en est ma trésorerie ce mois ?",
  "Quelles factures sont en retard ?",
  "Trouve mes leads chauds et prépare une relance",
];
// Libellés FR des actions qui demandent ta validation (garde-fous Néo)
const ACTION_LABELS = {
  send_followup: "Envoyer la relance par email",
  merge_contacts: "Fusionner les fiches en doublon",
};

/**
 * Néo — l'associé co-gérant IA d'Alpha Agency. Conversationnel, connecté au vrai CRM,
 * agit via function calling natif (/api/neo/chat). Les actions sortantes/irréversibles
 * passent par une validation humaine (boutons Valider / Annuler). Slide-over thémé.
 */
const AssistantChat = ({ open, onOpenChange, seed }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(null);
  const [resolved, setResolved] = useState({}); // action_id -> 'done' | 'cancelled'
  const [fb, setFb] = useState({});        // msgIndex -> 'up' | 'down-open' | 'sent'
  const [fbNote, setFbNote] = useState({}); // msgIndex -> texte de correction
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
      const res = await neoAPI.chat({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        conversation_id: convId,
      });
      const d = res.data || {};
      if (d.conversation_id) setConvId(d.conversation_id);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: d.message || "…",
        actionsDone: d.actions_done || [],
        pending: d.pending_actions || [],
      }]);
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: detail
          ? `⚠️ ${detail}`
          : "⚠️ Néo est indisponible pour l'instant (connexion au serveur impossible). Réessaie une fois en ligne.",
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, convId]);

  const resolveAction = useCallback(async (actionId, name, confirm) => {
    if (resolved[actionId]) return;
    setResolved((r) => ({ ...r, [actionId]: confirm ? "doing" : "cancelled" }));
    try {
      if (confirm) {
        const res = await neoAPI.confirmAction(actionId);
        setResolved((r) => ({ ...r, [actionId]: "done" }));
        setMessages((prev) => [...prev, { role: "assistant", content: res.data?.message || "✅ Action exécutée." }]);
      } else {
        await neoAPI.cancelAction(actionId);
        setMessages((prev) => [...prev, { role: "assistant", content: "Action annulée." }]);
      }
    } catch (error) {
      setResolved((r) => { const c = { ...r }; delete c[actionId]; return c; });
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Impossible de traiter l'action (connexion).", error: true }]);
    }
  }, [resolved]);

  // Apprentissage : 👍/👎 (+ note) sur les réponses de Néo
  const sendFeedback = useCallback(async (i, rating, note) => {
    setFb((s) => ({ ...s, [i]: "sent" }));
    try {
      await neoAPI.feedback({ rating, note: note || "", message: messages[i]?.content || "", conversation_id: convId });
    } catch (e) { /* feedback best-effort */ }
  }, [messages, convId]);

  const loadBriefing = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await aiEnhancedAPI.briefing();
      const { brief, items = [] } = res.data || {};
      const sev = { danger: "🔴", warning: "🟠", info: "🔵" };
      const list = items
        .map((it) => `${sev[it.severity] || "•"} ${it.label}${it.detail ? ` — ${it.detail}` : ""}`)
        .join("\n");
      const content = [brief, list].filter(Boolean).join("\n\n") || "Tout est sous contrôle aujourd'hui.";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: detail ? `⚠️ ${detail}` : "⚠️ Briefing indisponible pour l'instant (connexion serveur).",
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

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
              <h2 className="text-foreground font-semibold text-sm leading-tight">Néo</h2>
              <p className="text-muted-foreground text-[11px] leading-tight">Ton associé IA · connecté au CRM</p>
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
              <div className="mt-5 w-full max-w-sm">
                <button onClick={loadBriefing}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all">
                  <Sunrise className="w-4 h-4" /> Mon briefing du matin
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 w-full max-w-sm">
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
                  {m.actionsDone?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-success text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {m.actionsDone.length} action{m.actionsDone.length > 1 ? "s" : ""} effectuée{m.actionsDone.length > 1 ? "s" : ""}
                    </div>
                  )}
                  {(m.pending || []).map((p) => (
                    <div key={p.action_id} className="mt-2.5 rounded-xl border border-warning/40 bg-warning-soft p-2.5">
                      <p className="text-xs text-warning font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> À valider : {ACTION_LABELS[p.name] || p.name}
                      </p>
                      {resolved[p.action_id] === "done" ? (
                        <p className="mt-1.5 text-xs text-success font-medium">✅ Validé et exécuté.</p>
                      ) : resolved[p.action_id] === "cancelled" ? (
                        <p className="mt-1.5 text-xs text-muted-foreground">Annulé.</p>
                      ) : (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => resolveAction(p.action_id, p.name, true)} disabled={resolved[p.action_id] === "doing"}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-success text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50">
                            {resolved[p.action_id] === "doing" ? "…" : "Valider"}
                          </button>
                          <button onClick={() => resolveAction(p.action_id, p.name, false)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-muted transition-colors">
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {m.role === "assistant" && !m.error && m.content && (
                    <div className="mt-2 pt-1.5 border-t border-border/50">
                      {fb[i] === "sent" ? (
                        <span className="text-[11px] text-muted-foreground">Merci, c'est noté ✓</span>
                      ) : fb[i] === "down-open" ? (
                        <div className="flex items-center gap-1.5">
                          <input value={fbNote[i] || ""} onChange={(e) => setFbNote((s) => ({ ...s, [i]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") sendFeedback(i, "down", fbNote[i]); }}
                            placeholder="Qu'est-ce qui n'allait pas ?"
                            className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none" />
                          <button onClick={() => sendFeedback(i, "down", fbNote[i])} className="px-2 py-1 rounded-lg bg-primary text-white text-xs font-medium flex-shrink-0">Envoyer</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">Utile ?</span>
                          <button onClick={() => sendFeedback(i, "up")} title="Bonne réponse" className="text-muted-foreground hover:text-success transition-colors"><ThumbsUp className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFb((s) => ({ ...s, [i]: "down-open" }))} title="À améliorer" className="text-muted-foreground hover:text-danger transition-colors"><ThumbsDown className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
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
