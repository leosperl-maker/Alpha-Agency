import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, MicOff, Loader2 } from "lucide-react";
import { neoAPI } from "../lib/api";

/**
 * Mode vocal « Operator » plein écran pour Néo — façon ChatGPT/Gemini Live.
 * Orbe XL centré, audio-réactif : se déforme quand Néo parle, calme quand il écoute.
 * Boucle mains-libres : tu parles -> Néo réfléchit -> Néo répond en voix -> il réécoute.
 * Partage la conversation (messages/convId) avec le chat texte via onExchange.
 */
const NeoVoiceMode = ({ open, onClose, messages = [], convId, onConvId, onExchange }) => {
  const [phase, setPhase] = useState("idle"); // idle | listening | thinking | speaking | error
  const [transcript, setTranscript] = useState(""); // ce que TU dis (live)
  const [caption, setCaption] = useState("");        // ce que NÉO répond
  const [errMsg, setErrMsg] = useState("");

  const recRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const orbRef = useRef(null);
  const runningRef = useRef(false);   // la boucle vocale est-elle active
  const phaseRef = useRef("idle");
  const histRef = useRef(messages);   // historique courant (sans re-render)

  useEffect(() => { histRef.current = messages; }, [messages]);
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
    if (audioRef.current) { try { audioRef.current.pause(); } catch (e) {} audioRef.current = null; }
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
      const res = await neoAPI.tts(text);
      if (!runningRef.current) return;
      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      audioRef.current = audio;
      // chaîne Web Audio pour l'analyse d'amplitude
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") await ctx.resume();
        const srcNode = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        srcNode.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
        rafRef.current = requestAnimationFrame(animateOrb);
      } catch (e) { /* pas d'analyse audio -> on joue quand même */ }
      const finish = () => {
        URL.revokeObjectURL(url);
        resetOrb();
        if (runningRef.current) startListeningRef.current?.();
      };
      audio.onended = finish;
      audio.onerror = finish;
      await audio.play();
    } catch (e) {
      resetOrb();
      if (runningRef.current) startListeningRef.current?.();
    }
  }, [animateOrb, resetOrb]);

  // ---- Une réplique : envoie au moteur Néo puis fait parler ----
  const handleUtterance = useCallback(async (text) => {
    const content = (text || "").trim();
    if (!content) { startListeningRef.current?.(); return; }
    setPhaseBoth("thinking");
    setCaption("");
    const userMsg = { role: "user", content };
    const history = [...histRef.current, userMsg];
    histRef.current = history;
    try {
      const res = await neoAPI.chat({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        conversation_id: convId,
        mode: "voice",
      });
      const d = res.data || {};
      if (d.conversation_id) onConvId?.(d.conversation_id);
      const reply = d.message || "…";
      const assistantMsg = { role: "assistant", content: reply, actionsDone: d.actions_done || [], pending: d.pending_actions || [] };
      histRef.current = [...history, assistantMsg];
      onExchange?.(userMsg, assistantMsg);
      setCaption(reply);
      if (!runningRef.current) return;
      await speak(reply);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const msg = detail ? `Souci : ${detail}` : "Je n'arrive pas à joindre le serveur, là.";
      setCaption(msg);
      if (runningRef.current) await speak(msg);
    }
  }, [convId, onConvId, onExchange, speak]);

  const startListening = useCallback(() => {
    if (!runningRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErrMsg("La reconnaissance vocale n'est pas supportée par ce navigateur (essaie Chrome)."); setPhaseBoth("error"); return; }
    stopAudio();
    setTranscript("");
    let rec = recRef.current;
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
        if (interim) setTranscript(interim);
        if (final) {
          setTranscript(final.trim());
          try { rec.stop(); } catch (e2) {}
          handleUtterance(final.trim());
        }
      };
      rec.onend = () => {
        // si on est resté en écoute sans rien capter, on relance doucement
        if (runningRef.current && phaseRef.current === "listening") {
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

  // tap sur l'orbe : interrompre Néo (s'il parle) et réécouter tout de suite
  const onOrbTap = useCallback(() => {
    if (!runningRef.current) return;
    if (phaseRef.current === "speaking") { stopAudio(); startListeningRef.current?.(); }
    else if (phaseRef.current === "listening") { stopRecognition(); /* relance via onend */ }
  }, [stopAudio, stopRecognition]);

  // ---- cycle de vie : ouverture / fermeture ----
  const teardown = useCallback(() => {
    runningRef.current = false;
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
      const t = setTimeout(() => startListeningRef.current?.(), 250);
      return () => clearTimeout(t);
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
    phase === "error" ? errMsg : "Un instant…";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-between overflow-hidden"
      style={{ background: "radial-gradient(120% 90% at 50% 12%, #2a0a12 0%, #160309 55%, #0a0205 100%)",
               paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* halo de fond */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 40% at 50% 45%, rgba(225,29,46,0.18) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="relative w-full flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-white/90 font-semibold tracking-tight">Néo</span>
          <span className="text-white/40 text-xs">· mode vocal</span>
        </div>
        <button onClick={onClose} title="Quitter le mode vocal"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Orbe central */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center gap-8 px-6">
        <button onClick={onOrbTap} className="relative outline-none" aria-label="Interagir avec Néo">
          <span
            ref={orbRef}
            className={`block rounded-full will-change-transform ${phase === "listening" || phase === "idle" ? "neo-orb-breathe" : ""} ${phase === "thinking" ? "neo-orb-think" : ""}`}
            style={{
              width: 200, height: 200,
              background: "radial-gradient(120% 120% at 32% 26%, #FF8A98 0%, #E11D2E 42%, #7A0F2B 76%, #2C0610 100%)",
              boxShadow: "0 0 60px 16px rgba(225,29,46,0.35), inset 0 3px 6px rgba(255,255,255,0.45), inset 0 -6px 14px rgba(0,0,0,0.4)",
            }}
          />
        </button>

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
