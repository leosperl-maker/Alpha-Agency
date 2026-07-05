import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Loader2, CheckCircle2, History, SquarePen, Trash2, Sunrise, Clock, ThumbsUp, ThumbsDown, Mic, Volume2, VolumeX, Square, AudioLines, Paperclip, Cpu, Copy, Check } from "lucide-react";
import { aiEnhancedAPI, neoAPI } from "../lib/api";
import AssistantOrb from "./AssistantOrb";
import NeoVoiceMode from "./NeoVoiceMode";

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

// Rend les URLs cliquables (liens fichiers/devis) et affiche les images générées
const renderContent = (text) => {
  if (!text) return text;
  return String(text).split(/(https?:\/\/[^\s]+)/g).map((p, i) => {
    if (!/^https?:\/\//.test(p)) return p;
    if (/\/neo\/image\/|\.(png|jpe?g|webp|gif)(\?|$)/i.test(p)) {
      return <img key={i} src={p} alt="visuel généré par Néo" className="mt-2 rounded-xl max-w-full border border-border" />;
    }
    return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline break-all font-medium">{p}</a>;
  });
};

/**
 * Néo — l'associé co-gérant IA d'Alpha Agency. Conversationnel, connecté au vrai CRM,
 * agit via function calling natif (/api/neo/chat). Les actions sortantes/irréversibles
 * passent par une validation humaine (boutons Valider / Annuler). Slide-over thémé.
 */
const AssistantChat = ({ open, onOpenChange, seed, variant = "panel" }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkSec, setThinkSec] = useState(0); // chrono "Néo réfléchit Xs" (montre qu'il bosse encore)
  const [convId, setConvId] = useState(null);
  const [resolved, setResolved] = useState({}); // action_id -> 'done' | 'cancelled'
  const [fb, setFb] = useState({});        // msgIndex -> 'up' | 'down-open' | 'sent'
  const [fbNote, setFbNote] = useState({}); // msgIndex -> texte de correction
  const [attachments, setAttachments] = useState([]); // [{name, mime_type, data}]
  const [copiedIdx, setCopiedIdx] = useState(null); // index du message copié (feedback visuel)
  const [brain, setBrain] = useState(() => { try { return localStorage.getItem("neoBrain") || "auto"; } catch { return "auto"; } });
  const [brainUsed, setBrainUsed] = useState(null); // en mode auto : quel cerveau a été choisi (dernier message)
  // Cycle : Auto -> Gemini -> Claude -> Auto. Auto = Néo choisit selon la complexité/l'enjeu.
  const toggleBrain = useCallback(() => {
    setBrain((b) => { const nb = b === "auto" ? "gemini" : b === "gemini" ? "claude" : "auto"; try { localStorage.setItem("neoBrain", nb); } catch (e) { /* noop */ } return nb; });
  }, []);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null); // AbortController de la requête en cours (bouton Stop)

  const handleFiles = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      if (f.size > 15 * 1024 * 1024) return; // 15 Mo max
      const reader = new FileReader();
      reader.onload = () => setAttachments((a) => [...a, { name: f.name, mime_type: f.type || "application/octet-stream", data: reader.result }]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Chrono de réflexion : repart de 0 à chaque requête, s'incrémente tant que Néo travaille
  useEffect(() => {
    if (!loading) { setThinkSec(0); return undefined; }
    setThinkSec(0);
    const t = setInterval(() => setThinkSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // Met à jour le message assistant EN COURS d'écriture (le streaming), où qu'il soit.
  const patchStreaming = useCallback((patch) => {
    setMessages((prev) => {
      const copy = [...prev];
      let i = -1;
      for (let k = copy.length - 1; k >= 0; k--) { if (copy[k].role === "assistant" && copy[k].streaming) { i = k; break; } }
      if (i < 0) for (let k = copy.length - 1; k >= 0; k--) { if (copy[k].role === "assistant") { i = k; break; } }
      if (i < 0) return prev;
      copy[i] = typeof patch === "function" ? patch(copy[i]) : { ...copy[i], ...patch };
      return copy;
    });
  }, []);

  const send = useCallback(async (text) => {
    const typed = (text ?? input).trim();
    const atts = attachments;
    if ((!typed && atts.length === 0) || loading) return;
    const content = typed || "Analyse ce fichier.";
    const label = atts.length ? `${content}\n📎 ${atts.map((a) => a.name).join(", ")}` : content;
    const userMsg = { role: "user", content: label };
    const history = [...messages, userMsg];
    // Placeholder assistant : il va s'écrire au fil de l'eau (streaming).
    setMessages([...history, { role: "assistant", content: "", streaming: true, steps: [], actionsDone: [], pending: [] }]);
    setInput("");
    setAttachments([]);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const payload = {
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      conversation_id: convId,
      attachments: atts.length ? atts : undefined,
      brain,
    };

    let gotContent = false; // a-t-on reçu du texte / une étape via le flux ?
    const onEvent = (ev) => {
      if (!ev || !ev.type) return;
      switch (ev.type) {
        case "meta":
          if (ev.conversation_id) setConvId(ev.conversation_id);
          if (ev.brain) setBrainUsed(ev.brain);
          break;
        case "text":
          gotContent = true;
          patchStreaming((m) => ({ ...m, content: (m.content || "") + (ev.delta || "") }));
          break;
        case "tool":
          gotContent = true;
          if (ev.phase === "start") {
            patchStreaming((m) => ({ ...m, steps: [...(m.steps || []), { name: ev.name, label: ev.label, done: false }] }));
          } else {
            patchStreaming((m) => {
              const steps = [...(m.steps || [])];
              for (let k = steps.length - 1; k >= 0; k--) {
                if (steps[k].name === ev.name && !steps[k].done) { steps[k] = { ...steps[k], done: true, ok: ev.ok !== false, label: ev.label || steps[k].label }; break; }
              }
              return { ...m, steps };
            });
          }
          break;
        case "pending":
          patchStreaming((m) => ((m.pending || []).some((p) => p.action_id === ev.action_id)
            ? m : { ...m, pending: [...(m.pending || []), { action_id: ev.action_id, name: ev.name, args: ev.args }] }));
          break;
        case "done":
          patchStreaming((m) => {
            const merged = [...(m.pending || [])];
            (ev.pending_actions || []).forEach((p) => { if (!merged.some((x) => x.action_id === p.action_id)) merged.push(p); });
            return { ...m, streaming: false, actionsDone: ev.actions_done || m.actionsDone || [], pending: merged };
          });
          break;
        case "error":
          throw new Error(ev.detail || "stream_error"); // -> déclenche le fallback non-stream
        default:
          break;
      }
    };

    try {
      await neoAPI.streamChat(payload, { signal: controller.signal, onEvent });
      patchStreaming((m) => ({ ...m, streaming: false }));
      if (!gotContent) throw new Error("stream_empty"); // flux vide -> tente le fallback
    } catch (error) {
      if (error.name === "AbortError" || controller.signal.aborted) {
        patchStreaming((m) => ({ ...m, streaming: false, content: m.content ? `${m.content}\n\n⏹️ Arrêté.` : "⏹️ Arrêté." }));
      } else {
        // Fallback : ancien endpoint non-stream (robustesse — ne jamais casser ce qui marche).
        try {
          const res = await neoAPI.chat(payload, { signal: controller.signal });
          const d = res.data || {};
          if (d.conversation_id) setConvId(d.conversation_id);
          patchStreaming((m) => ({
            ...m, streaming: false, steps: [], content: d.message || m.content || "…",
            actionsDone: d.actions_done || [], pending: d.pending_actions || [],
          }));
        } catch (e2) {
          if (e2.code === "ERR_CANCELED" || e2.name === "CanceledError" || controller.signal.aborted) {
            patchStreaming((m) => ({ ...m, streaming: false, content: m.content || "⏹️ Arrêté." }));
          } else {
            const detail = e2.response?.data?.detail;
            patchStreaming((m) => ({
              ...m, streaming: false, error: true,
              content: detail ? `⚠️ ${detail}` : "⚠️ Néo est indisponible pour l'instant (connexion au serveur impossible). Réessaie une fois en ligne.",
            }));
          }
        }
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }, [input, loading, messages, convId, attachments, brain, patchStreaming]);

  const stop = useCallback(() => { try { abortRef.current?.abort(); } catch (e) { /* noop */ } }, []);

  const copyMsg = useCallback((text, i) => {
    try {
      navigator.clipboard.writeText(text || "");
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500);
    } catch (e) { /* noop */ }
  }, []);

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

  // ====== Voix de Néo : dictée (navigateur) + synthèse vocale premium (ElevenLabs) ======
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false); // mode vocal plein écran (Operator)
  const [voiceOn, setVoiceOn] = useState(() => { try { return localStorage.getItem("neoVoice") === "1"; } catch { return false; } });
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const speakSeqRef = useRef(0);
  const lastSpokenRef = useRef(-1);
  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);

  // Action « 1 clic » : un signal (Radar, notification) peut envoyer un prompt à Néo.
  // - événement window "neo:prompt" quand le chat est déjà monté (page Néo, panneau ouvert)
  // - sessionStorage "neo_prompt_pending" quand on arrive d'une autre page (notification)
  useEffect(() => {
    if (!open) return undefined;
    try {
      const p = sessionStorage.getItem("neo_prompt_pending");
      if (p) { sessionStorage.removeItem("neo_prompt_pending"); setTimeout(() => sendRef.current(p), 250); }
    } catch (e) { /* noop */ }
    const onPrompt = (e) => { const p = e?.detail?.prompt; if (p) sendRef.current(p); };
    window.addEventListener("neo:prompt", onPrompt);
    return () => window.removeEventListener("neo:prompt", onPrompt);
  }, [open]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { try { audioRef.current.pause(); } catch (e) { /* noop */ } audioRef.current = null; }
    setSpeakingIdx(null);
  }, []);

  // texte -> voix de Néo (ElevenLabs via /api/neo/tts)
  const speak = useCallback(async (text, idx) => {
    if (!text) return;
    stopAudio();
    const seq = ++speakSeqRef.current;
    const myIdx = idx ?? -1;
    setSpeakingIdx(myIdx);
    try {
      let savedVoice; try { savedVoice = localStorage.getItem("neoVoiceId") || undefined; } catch (e) { savedVoice = undefined; }
      const res = await neoAPI.tts(text, savedVoice);
      if (seq !== speakSeqRef.current) return; // une lecture plus récente a pris le relais
      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      audioRef.current = audio;
      const done = () => { setSpeakingIdx((s) => (s === myIdx ? null : s)); URL.revokeObjectURL(url); };
      audio.onended = done;
      audio.onerror = done;
      await audio.play();
    } catch (e) { setSpeakingIdx(null); }
  }, [stopAudio]);

  const toggleVoice = useCallback(() => {
    setVoiceOn((v) => {
      const nv = !v;
      try { localStorage.setItem("neoVoice", nv ? "1" : "0"); } catch (e) { /* noop */ }
      if (nv) lastSpokenRef.current = messages.length - 1; // ne pas relire l'historique en activant
      else stopAudio();
      return nv;
    });
  }, [stopAudio, messages.length]);

  // micro -> dictée (Web Speech API, fr-FR). À la phrase finale : envoi automatique (mains-libres).
  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("La dictée vocale n'est pas supportée par ce navigateur (essaie Chrome ou Safari)."); return; }
    if (listening) { try { recognitionRef.current?.stop(); } catch (e) { /* noop */ } setListening(false); return; }
    let rec = recognitionRef.current;
    if (!rec) {
      rec = new SR();
      rec.lang = "fr-FR";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e) => {
        let interim = "", final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript;
        }
        if (interim) setInput(interim);
        if (final) {
          setInput("");
          setListening(false);
          try { rec.stop(); } catch (e2) { /* noop */ }
          sendRef.current(final.trim());
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
    }
    setInput("");
    try { rec.start(); setListening(true); } catch (e) { /* déjà démarré */ }
  }, [listening]);

  // lecture auto de la dernière réponse de Néo quand la voix est activée
  useEffect(() => {
    if (!voiceOn || voiceMode) return; // le mode vocal plein écran gère seul l'audio (sinon double/triple voix)
    const i = messages.length - 1;
    if (i < 0) return;
    const m = messages[i];
    if (m.role === "assistant" && !m.error && m.content && !m.streaming && i > lastSpokenRef.current) {
      lastSpokenRef.current = i;
      speak(m.content, i);
    }
  }, [messages, voiceOn, speak]);

  // nettoyage à la fermeture du composant
  useEffect(() => () => { stopAudio(); try { recognitionRef.current?.abort(); } catch (e) { /* noop */ } }, [stopAudio]);

  // ====== Historique des conversations (mémoire) ======
  const [historyOpen, setHistoryOpen] = useState(false);
  const [convList, setConvList] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try { const r = await neoAPI.listConversations(); setConvList(r.data?.conversations || []); }
    catch (e) { setConvList([]); }
    finally { setHistLoading(false); }
  }, []);
  const openHistory = useCallback(() => { setHistoryOpen(true); loadHistory(); }, [loadHistory]);
  const openConv = useCallback(async (id) => {
    try {
      const r = await neoAPI.getConversation(id);
      const conv = r.data || {};
      setMessages((conv.messages || []).map((m) => ({ role: m.role, content: m.content })));
      setConvId(conv.id || id);
      setHistoryOpen(false);
    } catch (e) { /* ignore */ }
  }, []);
  const newConv = useCallback(() => { setMessages([]); setConvId(null); setHistoryOpen(false); }, []);
  const delConv = useCallback(async (id, e) => {
    e.stopPropagation();
    try { await neoAPI.deleteConversation(id); setConvList((l) => l.filter((c) => c.id !== id)); }
    catch (err) { /* ignore */ }
  }, []);

  if (!open) return null;
  const isPage = variant === "page";
  // « Néo réfléchit… » : seulement AVANT que le flux n'écrive (1er token/étape) ; ensuite la bulle live prend le relais.
  const lastMsg = messages[messages.length - 1];
  const showThinking = loading && (!lastMsg || lastMsg.role !== "assistant" || (!lastMsg.content && !(lastMsg.steps && lastMsg.steps.length)));

  return (
    <>
      <div className={isPage ? "relative h-full w-full" : "fixed inset-0 z-[60]"}>
      {/* Overlay (slide-over uniquement) */}
      {!isPage && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />}

      {/* Conteneur : plein écran en mode page, slide-over à droite sinon */}
      <div className={isPage
          ? "relative h-full w-full bg-card flex flex-col"
          : "absolute inset-y-0 right-0 w-full sm:w-[440px] bg-card border-l border-border shadow-pop flex flex-col"}
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
            <button onClick={toggleBrain}
              title={`Cerveau : ${brain === "auto" ? "Auto (Néo choisit selon la complexité)" : brain === "claude" ? "Claude" : "Gemini"}${brain === "auto" && brainUsed ? ` — dernier : ${brainUsed === "claude" ? "Claude" : "Gemini"}` : ""} — cliquer pour changer`}
              className="flex items-center gap-1 px-2 h-8 rounded-xl text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Cpu className="w-3.5 h-3.5" />{brain === "auto" ? "Auto" : brain === "claude" ? "Claude" : "Gemini"}
              {brain === "auto" && brainUsed && <span className="opacity-50">·{brainUsed === "claude" ? "C" : "G"}</span>}
            </button>
            <button onClick={() => setVoiceMode(true)} title="Mode vocal plein écran"
              className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-colors">
              <AudioLines className="w-4 h-4" />
            </button>
            <button onClick={toggleVoice} title={voiceOn ? "Couper la voix de Néo" : "Activer la voix de Néo"}
              className={`p-2 rounded-xl transition-colors ${voiceOn ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={openHistory} title="Historique des conversations"
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <History className="w-4 h-4" />
            </button>
            {messages.length > 0 && (
              <button onClick={newConv} title="Nouvelle conversation"
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <SquarePen className="w-4 h-4" />
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
            messages.map((m, i) => {
              // Placeholder assistant encore vide (avant le 1er token/étape) -> couvert par la bulle « réfléchit ».
              if (m.role === "assistant" && m.streaming && !m.content && !(m.steps && m.steps.length)) return null;
              return (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <AssistantOrb size={26} pulse={m.streaming} className="mt-0.5" />}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : m.error
                      ? "bg-danger-soft text-danger rounded-bl-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                }`}>
                  {m.steps?.length > 0 && (
                    <div className="mb-1.5 space-y-1">
                      {m.steps.map((s, si) => {
                        const isAgent = s.name === "consult_agent"; // mission déléguée à un sous-agent → étape mise en avant
                        return (
                          <div key={si}
                               className={`flex items-center gap-1.5 text-xs ${isAgent ? "rounded-lg bg-brand-soft px-2 py-1 font-medium" : ""} ${s.done ? (s.ok === false ? "text-danger" : (isAgent ? "text-primary/80" : "text-muted-foreground")) : "text-primary"}`}>
                            {s.done ? (s.ok === false ? <X className="w-3 h-3 flex-shrink-0" /> : <Check className="w-3 h-3 flex-shrink-0" />) : <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />}
                            {isAgent && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_6px_rgba(225,29,46,0.8)]" />}
                            <span>{s.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {renderContent(m.content)}
                  {m.streaming && m.content && <span className="inline-block w-1.5 h-3.5 ml-0.5 align-[-2px] bg-primary/70 animate-pulse rounded-sm" />}
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
                  {m.role === "assistant" && !m.error && m.content && !m.streaming && (
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
                          <button onClick={() => copyMsg(m.content, i)} title="Copier le message" className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                            {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => (speakingIdx === i ? stopAudio() : speak(m.content, i))} title={speakingIdx === i ? "Arrêter" : "Écouter"} className="text-muted-foreground hover:text-primary transition-colors">
                            {speakingIdx === i ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })
          )}
          {showThinking && (
            <div className="flex gap-2.5">
              <AssistantOrb size={26} pulse className="mt-0.5" />
              <div className="bg-secondary rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground tabular-nums">Néo réfléchit… {thinkSec}s</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border flex-shrink-0">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attachments.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-secondary rounded-lg px-2 py-1 text-foreground">
                  <Paperclip className="w-3 h-3" /><span className="max-w-[150px] truncate">{a.name}</span>
                  <button onClick={() => setAttachments((att) => att.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-danger"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl bg-background border border-border focus-within:border-primary/40 transition-colors p-1.5 pl-2">
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.docx,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" multiple className="hidden" onChange={handleFiles} />
            <button onClick={() => fileInputRef.current?.click()} title="Joindre une image ou un PDF"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder={listening ? "À l'écoute…" : "Demande-moi, dis-moi quoi faire, ou parle 🎙️"}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm resize-none max-h-32 py-1.5"
            />
            <button onClick={toggleMic} title={listening ? "Arrêter la dictée" : "Parler à Néo"}
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                listening ? "bg-danger text-white animate-pulse" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              <Mic className="w-4 h-4" />
            </button>
            {loading ? (
              <button onClick={stop} title="Arrêter Néo"
                className="w-9 h-9 rounded-xl bg-danger text-white flex items-center justify-center flex-shrink-0 hover:brightness-110 transition-all">
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            ) : (
              <button onClick={() => send()} disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:brightness-110 transition-all">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {historyOpen && (
          <div className="absolute inset-0 bg-card flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="flex items-center justify-between px-4 h-16 border-b border-border flex-shrink-0">
              <h2 className="text-foreground font-semibold text-sm">Conversations</h2>
              <button onClick={() => setHistoryOpen(false)} title="Fermer" className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 flex-shrink-0">
              <button onClick={newConv} className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all">
                <SquarePen className="w-4 h-4" /> Nouvelle conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
              {histLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : convList.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Aucune conversation pour l'instant.</p>
              ) : convList.map((c) => (
                <div key={c.id} onClick={() => openConv(c.id)} role="button" tabIndex={0}
                  className="group rounded-xl px-3 py-2.5 hover:bg-secondary cursor-pointer flex items-start gap-2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate font-medium">{c.title}</p>
                    {c.preview && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.preview}</p>}
                  </div>
                  <button onClick={(e) => delConv(c.id, e)} title="Supprimer" className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all flex-shrink-0 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      <NeoVoiceMode
        open={voiceMode}
        onClose={() => setVoiceMode(false)}
        messages={messages}
        convId={convId}
        brain={brain}
        onConvId={setConvId}
        onExchange={(u, a) => setMessages((prev) => [...prev, u, a])}
      />
    </>
  );
};

export default AssistantChat;
