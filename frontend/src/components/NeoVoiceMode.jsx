import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, MicOff, Loader2, ChevronDown, Check, FileText, UserPlus, CheckSquare, Clock, Send, Euro, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { neoAPI } from "../lib/api";

const IS_IOS = typeof navigator !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent || "");
const SILENCE_MS = 2500; // délai de silence avant d'envoyer (laisse Léo respirer/réfléchir sans le couper)

// Cartes contextuelles « Jarvis » : ce que Néo a fait -> une carte visuelle animée
const ACTION_CARDS = {
  create_quote: { icon: FileText, label: "Devis créé" },
  create_contact: { icon: UserPlus, label: "Fiche contact créée" },
  create_task: { icon: CheckSquare, label: "Tâche créée" },
  schedule_followup: { icon: Clock, label: "Relance programmée" },
  draft_followup_email: { icon: Send, label: "Email préparé" },
  send_followup: { icon: Send, label: "Relance à valider" },
  set_contact_status: { icon: UserPlus, label: "Statut contact mis à jour" },
  crm_create: { icon: Sparkles, label: "Créé dans le CRM" },
  crm_update: { icon: Sparkles, label: "Mise à jour CRM" },
};

// Construit les cartes à afficher à partir de la réponse de Néo (actions + entités détectées)
const deriveCards = (reply, actionsDone, pending) => {
  const cards = [];
  (actionsDone || []).forEach((a, i) => {
    const c = ACTION_CARDS[a.name] || { icon: Sparkles, label: (a.name || "Action").replace(/_/g, " ") };
    cards.push({ id: `a${i}`, icon: c.icon, label: c.label, kind: "done" });
  });
  (pending || []).forEach((p, i) => cards.push({ id: `p${i}`, icon: Clock, label: "À valider", kind: "pending" }));
  const money = (reply || "").match(/(\d[\d ., ]{1,12})\s*€/);
  if (money) cards.push({ id: "money", icon: Euro, label: `${money[1].trim()} €`, kind: "info" });
  const num = (reply || "").match(/\b(?:DEV|FAC)-\d{4}-\d+/);
  if (num) cards.push({ id: "num", icon: FileText, label: num[0], kind: "info" });
  return cards.slice(0, 5);
};

/**
 * Mode vocal « Operator » plein écran pour Néo — façon ChatGPT/Gemini Live.
 * Orbe XL centré, audio-réactif : se déforme quand Néo parle, calme quand il écoute.
 * Boucle mains-libres : tu parles -> Néo réfléchit -> Néo répond en voix -> il réécoute.
 * Partage la conversation (messages/convId) avec le chat texte via onExchange.
 */
const NeoVoiceMode = ({ open, onClose, messages = [], convId, brain, onConvId, onExchange }) => {
  const [phase, setPhase] = useState("idle"); // idle | listening | thinking | speaking | error
  const [transcript, setTranscript] = useState(""); // ce que TU dis (live)
  const [caption, setCaption] = useState("");        // ce que NÉO répond
  const [errMsg, setErrMsg] = useState("");
  const [voices, setVoices] = useState([]);
  const [voiceId, setVoiceId] = useState(() => { try { return localStorage.getItem("neoVoiceId") || ""; } catch { return ""; } });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cards, setCards] = useState([]); // cartes contextuelles animées (façon Jarvis)

  const recRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const orbRef = useRef(null);
  const runningRef = useRef(false);   // la boucle vocale est-elle active
  const phaseRef = useRef("idle");
  const histRef = useRef(messages);   // historique courant (sans re-render)
  const voiceIdRef = useRef(voiceId);
  const audioElRef = useRef(null);   // <audio> persistant (clé pour débloquer l'audio iOS)
  const srcNodeRef = useRef(null);   // MediaElementSource (desktop, créé une seule fois)
  const lastUrlRef = useRef(null);
  const accumRef = useRef("");          // tout ce que Léo dit dans sa prise de parole en cours
  const committedRef = useRef("");      // segments figés avant un redémarrage de la reco (survit aux coupures ~60s)
  const silenceTimerRef = useRef(null); // timer de silence : on envoie quand Léo s'est vraiment tu
  const sendNowRef = useRef(null);      // pour forcer l'envoi (tap sur l'orbe = "j'ai fini")
  // V2 — TTS par phrases : Néo parle dès la 1ère phrase pendant que la suite streame.
  const ttsQueueRef = useRef([]);       // file des phrases à dire
  const ttsRunnerRef = useRef(false);   // un lecteur de file tourne-t-il ?
  const ttsResolveRef = useRef(null);   // pour débloquer la lecture en cours (barge-in)
  const streamDoneRef = useRef(false);  // le flux texte est-il terminé ?

  const getAudioEl = () => {
    if (!audioElRef.current) { const el = new Audio(); el.preload = "auto"; audioElRef.current = el; }
    return audioElRef.current;
  };
  // Débloque l'audio DANS un geste utilisateur (sinon iOS bloque play() hors-geste)
  const unlockAudio = () => {
    try {
      const el = getAudioEl();
      el.muted = true;
      el.src = "data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAAAAAAAAAAAAAA==";
      const p = el.play();
      if (p && p.then) p.then(() => { try { el.pause(); el.currentTime = 0; } catch (e) {} el.muted = false; }).catch(() => { el.muted = false; });
      if (audioCtxRef.current && audioCtxRef.current.resume) audioCtxRef.current.resume();
    } catch (e) { /* noop */ }
  };

  useEffect(() => { histRef.current = messages; }, [messages]);
  useEffect(() => { voiceIdRef.current = voiceId; }, [voiceId]);
  useEffect(() => {
    if (open && voices.length === 0) {
      neoAPI.voices().then((r) => setVoices(r.data?.voices || [])).catch(() => {});
    }
  }, [open, voices.length]);
  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };

  // ---- Orbe : animation pilotée par l'amplitude audio ----
  const animateOrb = useCallback(() => {
    const analyser = analyserRef.current;
    const orb = orbRef.current;
    if (!analyser || !orb) { rafRef.current = requestAnimationFrame(animateOrb); return; }
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i];
    const amp = Math.min(1, (sum / data.length) / 128); // 0..1
    const scale = 1 + amp * 0.5;
    orb.style.transform = `scale(${scale.toFixed(3)})`;
    orb.style.boxShadow = `0 0 ${(40 + amp * 180).toFixed(0)}px ${(12 + amp * 48).toFixed(0)}px rgba(225,29,46,${(0.35 + amp * 0.5).toFixed(2)})`;
    rafRef.current = requestAnimationFrame(animateOrb);
  }, []);

  const resetOrb = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (orbRef.current) { orbRef.current.style.transform = ""; orbRef.current.style.boxShadow = ""; }
  }, []);

  const stopAudio = useCallback(() => {
    ttsQueueRef.current = [];                 // vide la file (stoppe la suite à dire)
    if (audioElRef.current) { try { audioElRef.current.pause(); } catch (e) {} }
    try { ttsResolveRef.current?.(); } catch (e) {} // débloque la phrase en cours (barge-in)
    resetOrb();
  }, [resetOrb]);

  // ---- Reconnaissance vocale (dictée) ----
  const stopRecognition = useCallback(() => {
    if (recRef.current) { try { recRef.current.stop(); } catch (e) {} }
  }, []);

  // déclarations avancées pour cycle écoute -> réponse -> écoute
  const startListeningRef = useRef(null);

  // ---- Néo parle (ElevenLabs + orbe réactif) ----
  const speak = useCallback(async (text) => {
    if (!text) { startListeningRef.current?.(); return; }
    setPhaseBoth("speaking");
    try {
      const res = await neoAPI.tts(text, voiceIdRef.current || undefined);
      if (!runningRef.current) return;
      const el = getAudioEl();
      if (lastUrlRef.current) { try { URL.revokeObjectURL(lastUrlRef.current); } catch (e) {} }
      const url = URL.createObjectURL(res.data);
      lastUrlRef.current = url;
      el.muted = false;
      el.src = url;
      const finish = () => { resetOrb(); if (runningRef.current) startListeningRef.current?.(); };
      el.onended = finish;
      el.onerror = finish;
      // Analyse d'amplitude (orbe réactif) — desktop uniquement, source créée 1 seule fois sur l'élément persistant
      if (!IS_IOS) {
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          const ctx = audioCtxRef.current;
          if (ctx.state === "suspended") await ctx.resume();
          if (!srcNodeRef.current) {
            srcNodeRef.current = ctx.createMediaElementSource(el);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            srcNodeRef.current.connect(analyser);
            analyser.connect(ctx.destination);
            analyserRef.current = analyser;
          }
          rafRef.current = requestAnimationFrame(animateOrb);
        } catch (e) { analyserRef.current = null; }
      }
      await el.play();
    } catch (e) {
      resetOrb();
      if (runningRef.current) startListeningRef.current?.();
    }
  }, [animateOrb, resetOrb]);

  // ---- V2 : lecture d'UNE phrase (sans revenir à l'écoute) — brique de la file TTS ----
  const playTts = useCallback(async (text) => {
    if (!text || !runningRef.current) return;
    let res;
    try { res = await neoAPI.tts(text, voiceIdRef.current || undefined); }
    catch (e) { return; }
    if (!runningRef.current) return;
    const el = getAudioEl();
    if (lastUrlRef.current) { try { URL.revokeObjectURL(lastUrlRef.current); } catch (e) {} }
    const url = URL.createObjectURL(res.data);
    lastUrlRef.current = url;
    el.muted = false;
    el.src = url;
    if (!IS_IOS) {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") await ctx.resume();
        if (!srcNodeRef.current) {
          srcNodeRef.current = ctx.createMediaElementSource(el);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          srcNodeRef.current.connect(analyser);
          analyser.connect(ctx.destination);
          analyserRef.current = analyser;
        }
        rafRef.current = requestAnimationFrame(animateOrb);
      } catch (e) { analyserRef.current = null; }
    }
    await new Promise((resolve) => {
      let done = false;
      const fin = () => { if (done) return; done = true; ttsResolveRef.current = null; resolve(); };
      ttsResolveRef.current = fin;          // stopAudio() peut débloquer (barge-in)
      el.onended = fin;
      el.onerror = fin;
      el.play().catch(() => fin());
    });
  }, [animateOrb]);

  // ---- V2 : lecteur de file — joue les phrases en séquence dès qu'elles arrivent ----
  const startTtsRunner = useCallback(() => {
    if (ttsRunnerRef.current) return;
    ttsRunnerRef.current = true;
    setPhaseBoth("speaking");
    (async () => {
      while (runningRef.current && ttsQueueRef.current.length) {
        const next = ttsQueueRef.current.shift();
        await playTts(next);
      }
      ttsRunnerRef.current = false;
      if (runningRef.current && !ttsQueueRef.current.length) resetOrb();
    })();
  }, [playTts, resetOrb]);

  const enqueueTts = useCallback((text) => {
    const t = (text || "").trim();
    if (!t) return;
    ttsQueueRef.current.push(t);
    startTtsRunner();
  }, [startTtsRunner]);

  // attend que toute la file soit lue (auto-répare la course file/runner)
  const waitTtsDrain = useCallback(() => new Promise((resolve) => {
    const check = () => {
      if (!runningRef.current) return resolve();
      if (ttsQueueRef.current.length && !ttsRunnerRef.current) startTtsRunner();
      if (!ttsRunnerRef.current && !ttsQueueRef.current.length) return resolve();
      setTimeout(check, 80);
    };
    check();
  }), [startTtsRunner]);

  // changer la voix de Néo (persisté) + échantillon immédiat
  const pickVoice = useCallback((id) => {
    setVoiceId(id);
    voiceIdRef.current = id;
    try { localStorage.setItem("neoVoiceId", id); } catch (e) { /* noop */ }
    setPickerOpen(false);
    speak("Voilà ma nouvelle voix. On continue ?");
  }, [speak]);

  // ---- Une réplique : envoie au moteur Néo (EN STREAMING) puis fait parler ----
  // Le sous-titre s'écrit au fil de l'eau + les cartes « Jarvis » surgissent quand Néo agit.
  // V1 : le TTS se déclenche quand le texte est complet (V2 : par phrases dès le 1er point).
  const handleUtterance = useCallback(async (text) => {
    const content = (text || "").trim();
    if (!content) { startListeningRef.current?.(); return; }
    if (phaseRef.current === "thinking" || phaseRef.current === "speaking") return; // anti double-déclenchement (évite les voix superposées)
    setPhaseBoth("thinking");
    setCaption("");
    setCards([]);
    ttsQueueRef.current = [];        // file TTS propre pour cette réplique
    streamDoneRef.current = false;
    const userMsg = { role: "user", content };
    const history = [...histRef.current, userMsg];
    histRef.current = history;
    const payload = {
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      conversation_id: convId,
      mode: "voice",
      brain,
    };

    let replyAcc = "";
    let spokenLen = 0;        // longueur déjà mise en file pour la voix
    let actionsDone = [];
    let pendingActions = [];
    const liveCards = [];
    const pushCard = (c) => { liveCards.push(c); setCards(liveCards.slice(0, 5)); };
    // Découpe le texte au fil de l'eau en phrases complètes -> file TTS (Néo parle dès le 1er point).
    // On ne coupe qu'à une ponctuation SUIVIE d'un espace/fin (évite de couper "3580.50€").
    const feedTts = () => {
      const chunk = replyAcc.slice(spokenLen);
      let boundary = -1;
      const re = /[.!?…](\s|$)|\n/g;
      let m;
      while ((m = re.exec(chunk)) !== null) boundary = m.index + 1;
      if (boundary > 0) {
        const ready = chunk.slice(0, boundary).trim();
        if (ready.length >= 2) { enqueueTts(ready); spokenLen += boundary; }
      }
    };
    const onEvent = (ev) => {
      if (!ev || !ev.type) return;
      switch (ev.type) {
        case "meta": if (ev.conversation_id) onConvId?.(ev.conversation_id); break;
        case "text": replyAcc += ev.delta || ""; setCaption(replyAcc); feedTts(); break;
        case "tool":
          if (ev.phase === "done" && ev.ok !== false) {
            const c = ACTION_CARDS[ev.name];
            if (c) pushCard({ id: `t${liveCards.length}`, icon: c.icon, label: c.label, kind: "done" });
          }
          break;
        case "pending":
          pendingActions.push({ action_id: ev.action_id, name: ev.name, args: ev.args });
          pushCard({ id: `p${liveCards.length}`, icon: Clock, label: "À valider", kind: "pending" });
          break;
        case "done":
          actionsDone = ev.actions_done || [];
          pendingActions = ev.pending_actions || pendingActions;
          break;
        case "error": throw new Error(ev.detail || "stream_error");
        default: break;
      }
    };

    try {
      await neoAPI.streamChat(payload, { onEvent }); // pas de signal : le mode vocal pilote son cycle
      const reply = replyAcc || "…";
      const assistantMsg = { role: "assistant", content: reply, actionsDone, pending: pendingActions };
      histRef.current = [...history, assistantMsg];
      onExchange?.(userMsg, assistantMsg);
      setCaption(reply);
      setCards(deriveCards(reply, actionsDone, pendingActions));
      if (!runningRef.current) return;
      if (replyAcc.trim()) {
        const tail = replyAcc.slice(spokenLen).trim(); // dernier morceau pas encore mis en file
        if (tail) enqueueTts(tail);
        streamDoneRef.current = true;
        await waitTtsDrain();                          // attend la fin de toute la voix
        if (runningRef.current && phaseRef.current !== "listening") startListeningRef.current?.();
      } else {
        startListeningRef.current?.();                 // pas de texte (que des outils) -> réécoute
      }
    } catch (error) {
      // Fallback non-stream (robustesse — ne jamais casser le vocal qui marche).
      try {
        const res = await neoAPI.chat(payload);
        const d = res.data || {};
        if (d.conversation_id) onConvId?.(d.conversation_id);
        const reply = d.message || "…";
        const assistantMsg = { role: "assistant", content: reply, actionsDone: d.actions_done || [], pending: d.pending_actions || [] };
        histRef.current = [...history, assistantMsg];
        onExchange?.(userMsg, assistantMsg);
        setCaption(reply);
        setCards(deriveCards(reply, d.actions_done, d.pending_actions));
        if (!runningRef.current) return;
        await speak(reply); // one-shot (gère lui-même le retour à l'écoute)
      } catch (e2) {
        const detail = e2.response?.data?.detail;
        const msg = detail ? `Souci : ${detail}` : "Je n'arrive pas à joindre le serveur, là.";
        setCaption(msg);
        if (runningRef.current) await speak(msg);
      }
    }
  }, [convId, onConvId, onExchange, speak, brain, enqueueTts, waitTtsDrain]);

  const startListening = useCallback(() => {
    if (!runningRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErrMsg("La reconnaissance vocale n'est pas supportée par ce navigateur (essaie Chrome)."); setPhaseBoth("error"); return; }
    stopAudio();
    setTranscript("");
    setCards([]);
    accumRef.current = ""; committedRef.current = "";
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    let rec = recRef.current;
    if (!rec) {
      rec = new SR();
      rec.lang = "fr-FR";
      rec.interimResults = true;
      rec.continuous = true; // on garde l'écoute ouverte à travers les pauses (ne coupe plus Léo)
      const sendNow = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        const text = (accumRef.current || "").trim();
        if (!text || !runningRef.current || phaseRef.current !== "listening") return;
        committedRef.current = ""; accumRef.current = "";
        try { rec.stop(); } catch (e2) {}
        handleUtterance(text);
      };
      sendNowRef.current = sendNow;
      rec.onresult = (e) => {
        let sess = "";
        for (let i = 0; i < e.results.length; i++) sess += e.results[i][0].transcript;
        accumRef.current = (committedRef.current + " " + sess).trim();
        setTranscript(accumRef.current);
        // à chaque mot on repousse l'envoi : on n'envoie que quand Léo s'est tu SILENCE_MS
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(sendNow, SILENCE_MS);
      };
      rec.onend = () => {
        // la reco s'arrête (pause longue ou limite navigateur ~60s). Si Léo n'a pas fini,
        // on relance SANS perdre ce qu'il a déjà dit (committedRef garde l'accumulé)
        if (runningRef.current && phaseRef.current === "listening") {
          committedRef.current = accumRef.current;
          try { rec.start(); } catch (e) {}
        }
      };
      rec.onerror = (ev) => {
        if (ev.error === "no-speech" || ev.error === "aborted") return;
        if (ev.error === "not-allowed") { setErrMsg("Micro refusé. Autorise le micro dans le navigateur."); setPhaseBoth("error"); runningRef.current = false; }
      };
      recRef.current = rec;
    }
    setPhaseBoth("listening");
    try { rec.start(); } catch (e) { /* déjà démarré */ }
  }, [handleUtterance, stopAudio]);

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  // tap sur l'orbe : (dé)bloque l'audio iOS + démarre/interrompt
  const onOrbTap = useCallback(() => {
    if (!runningRef.current) return;
    unlockAudio(); // toujours dans un geste -> débloque l'audio iOS
    if (phaseRef.current === "idle") { startListeningRef.current?.(); return; }
    if (phaseRef.current === "speaking") { stopAudio(); startListeningRef.current?.(); }
    else if (phaseRef.current === "listening") { sendNowRef.current?.(); /* tap = « j'ai fini, envoie » */ }
  }, [stopAudio, stopRecognition]);

  // ---- cycle de vie : ouverture / fermeture ----
  const teardown = useCallback(() => {
    runningRef.current = false;
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    accumRef.current = ""; committedRef.current = "";
    stopRecognition();
    try { recRef.current?.abort(); } catch (e) {}
    recRef.current = null;
    stopAudio();
    setPhaseBoth("idle");
    setTranscript(""); setCaption(""); setErrMsg("");
  }, [stopRecognition, stopAudio]);

  useEffect(() => {
    if (open) {
      runningRef.current = true;
      setErrMsg("");
      if (IS_IOS) {
        setPhaseBoth("idle"); // iOS : attendre un tap sur l'orbe (geste) pour débloquer l'audio
      } else {
        const t = setTimeout(() => startListeningRef.current?.(), 250);
        return () => clearTimeout(t);
      }
    } else {
      teardown();
    }
  }, [open]);

  useEffect(() => () => teardown(), [teardown]);

  if (!open) return null;

  const status =
    phase === "listening" ? "Je t'écoute…" :
    phase === "thinking" ? "Néo réfléchit…" :
    phase === "speaking" ? "" :
    phase === "error" ? errMsg : "Touche l'orbe pour parler à Néo";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-between overflow-hidden"
      style={{ background: "radial-gradient(120% 90% at 50% 12%, #2a0a12 0%, #160309 55%, #0a0205 100%)",
               paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* halo de fond */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 40% at 50% 45%, rgba(225,29,46,0.18) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="relative w-full flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-white/90 font-semibold tracking-tight">Néo</span>
          <button onClick={() => setPickerOpen((v) => !v)} title="Changer la voix"
            className="flex items-center gap-1 text-white/70 hover:text-white text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 transition-colors max-w-[55vw]">
            <span className="truncate">{(voices.find((v) => v.voice_id === voiceId)?.name) || "Eric"}</span>
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>
        </div>
        <button onClick={onClose} title="Quitter le mode vocal"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
          <X className="w-5 h-5" />
        </button>
      </div>

      {pickerOpen && (
        <div className="absolute top-16 left-5 z-10 w-64 max-h-[52vh] overflow-y-auto rounded-2xl bg-[#1a0509]/95 backdrop-blur-md border border-white/15 shadow-pop p-1.5">
          {voices.length === 0 ? (
            <p className="text-white/50 text-xs p-3">Chargement des voix…</p>
          ) : voices.map((v) => (
            <button key={v.voice_id} onClick={() => pickVoice(v.voice_id)}
              className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-sm text-white/85 transition-colors">
              <span className="truncate">{v.name}</span>
              {voiceId === v.voice_id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}

      {/* Orbe central */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center gap-8 px-6">
        <button onClick={onOrbTap} className="relative outline-none" aria-label="Interagir avec Néo">
          <span
            ref={orbRef}
            className={`block rounded-full will-change-transform ${(phase === "listening" || phase === "idle" || (phase === "speaking" && IS_IOS)) ? "neo-orb-breathe" : ""} ${phase === "thinking" ? "neo-orb-think" : ""}`}
            style={{
              width: 200, height: 200,
              background: "radial-gradient(120% 120% at 32% 26%, #FF8A98 0%, #E11D2E 42%, #7A0F2B 76%, #2C0610 100%)",
              boxShadow: "0 0 60px 16px rgba(225,29,46,0.35), inset 0 3px 6px rgba(255,255,255,0.45), inset 0 -6px 14px rgba(0,0,0,0.4)",
            }}
          />
        </button>

        {/* Cartes contextuelles animées (façon Jarvis) — surgissent quand Néo agit/répond */}
        {cards.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
            <AnimatePresence>
              {cards.map((c, i) => (
                <motion.div key={c.id}
                  initial={{ opacity: 0, y: 16, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 320, damping: 22 }}
                  className={`flex items-center gap-2 rounded-2xl backdrop-blur-md border px-3 py-2 text-sm shadow-pop ${
                    c.kind === "pending" ? "bg-warning/15 border-warning/30 text-warning"
                    : c.kind === "done" ? "bg-success/15 border-success/30 text-white"
                    : "bg-white/10 border-white/15 text-white"}`}>
                  <c.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{c.label}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* statut + sous-titres */}
        <div className="relative text-center min-h-[72px] max-w-lg">
          {status && <p className="text-white/70 text-sm font-medium">{status}</p>}
          {caption && phase !== "error" && (
            <p className="mt-2 text-white text-lg leading-snug line-clamp-4">{caption}</p>
          )}
        </div>
      </div>

      {/* transcript live + indice */}
      <div className="relative w-full px-6 pb-8 flex flex-col items-center gap-3">
        {transcript && phase === "listening" && (
          <p className="text-white/55 text-sm italic max-w-lg text-center line-clamp-2">« {transcript} »</p>
        )}
        <div className="flex items-center gap-2 text-white/40 text-xs">
          {phase === "thinking" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
           phase === "listening" ? <Mic className="w-3.5 h-3.5" /> :
           phase === "speaking" ? <span className="w-3.5 h-3.5 inline-block rounded-full bg-danger animate-pulse" /> :
           <MicOff className="w-3.5 h-3.5" />}
          <span>{phase === "speaking" ? "Touche l'orbe pour répondre" : "Parle, Néo t'écoute"}</span>
        </div>
      </div>
    </div>
  );
};

export default NeoVoiceMode;
