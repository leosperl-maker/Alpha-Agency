import { useState, useRef, useEffect } from "react";
import {
  Mic, MicOff, Loader2, CheckCircle, XCircle, User, ListTodo,
  FileText, Calendar, Receipt, Sparkles, Volume2, History, Trash2,
  AlertCircle, RefreshCw, Play, Square, Send
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const VoiceCRMPage = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("alpha_token");
    return { "Authorization": `Bearer ${token}` };
  };

  useEffect(() => {
    loadHistory();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/api/audio/history?limit=10`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.transcriptions || []);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setResult(null);
      setTranscription("");
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success("🎙️ Enregistrement démarré");
    } catch (error) {
      toast.error("Impossible d'accéder au microphone");
      console.error("Microphone error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      toast.info("Enregistrement terminé");
    }
  };

  const processAudio = async () => {
    if (!audioBlob) {
      toast.error("Aucun audio à traiter");
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Transcribe
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      
      const transcribeRes = await fetch(`${API}/api/audio/transcribe?language=fr`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData
      });

      if (!transcribeRes.ok) {
        throw new Error("Erreur lors de la transcription");
      }

      const transcribeData = await transcribeRes.json();
      
      if (!transcribeData.success || !transcribeData.text) {
        throw new Error(transcribeData.error || "Transcription échouée");
      }

      setTranscription(transcribeData.text);
      
      // Step 2: Process with Voice-to-CRM
      await processVoiceCommand(transcribeData.text);
      
    } catch (error) {
      toast.error(error.message || "Erreur lors du traitement");
      console.error("Processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processVoiceCommand = async (text) => {
    try {
      const res = await fetch(`${API}/api/audio/voice-to-crm`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ audio_text: text })
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        toast.success(`✅ ${data.message}`);
        loadHistory();
      } else {
        toast.warning(data.message);
      }
    } catch (error) {
      toast.error("Erreur lors de l'analyse");
      console.error("Voice-to-CRM error:", error);
    }
  };

  const processManualText = async () => {
    if (!manualText.trim()) {
      toast.error("Veuillez entrer du texte");
      return;
    }

    setIsProcessing(true);
    setTranscription(manualText);
    await processVoiceCommand(manualText);
    setIsProcessing(false);
    setManualText("");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "contact": return <User className="w-5 h-5 text-blue-400" />;
      case "task": return <ListTodo className="w-5 h-5 text-green-400" />;
      case "note": return <FileText className="w-5 h-5 text-yellow-400" />;
      case "appointment": return <Calendar className="w-5 h-5 text-purple-400" />;
      case "invoice": return <Receipt className="w-5 h-5 text-orange-400" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case "contact": return "Nouveau contact";
      case "task": return "Nouvelle tâche";
      case "note": return "Nouvelle note";
      case "appointment": return "Nouveau RDV";
      case "invoice": return "Nouveau devis/facture";
      default: return "Action inconnue";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-500" />
            Voice-to-CRM
          </h1>
          <p className="text-white/60 mt-2">
            Créez des entrées CRM automatiquement avec votre voix
          </p>
        </div>

        {/* Main Recording Card */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-6">
              
              {/* Recording Button */}
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 scale-110" 
                      : "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                  data-testid="record-button"
                >
                  {isProcessing ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-12 h-12 text-white" />
                  ) : (
                    <Mic className="w-12 h-12 text-white" />
                  )}
                </button>
              </div>

              {/* Recording Timer */}
              {isRecording && (
                <div className="text-3xl font-mono text-white">
                  {formatTime(recordingTime)}
                </div>
              )}

              {/* Instructions */}
              <div className="text-center text-white/60">
                {isRecording ? (
                  <p className="text-red-400 animate-pulse">
                    🔴 Enregistrement en cours... Cliquez pour arrêter
                  </p>
                ) : isProcessing ? (
                  <p className="text-purple-400">
                    ⚡ Analyse en cours...
                  </p>
                ) : (
                  <p>
                    Appuyez sur le bouton pour enregistrer une commande vocale
                  </p>
                )}
              </div>

              {/* Process Button */}
              {audioBlob && !isRecording && (
                <Button
                  onClick={processAudio}
                  disabled={isProcessing}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  data-testid="process-button"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Analyser et créer
                    </>
                  )}
                </Button>
              )}

              {/* Manual Input Toggle */}
              <Button
                variant="ghost"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-white/50 hover:text-white"
              >
                {showManualInput ? "Masquer saisie manuelle" : "Ou saisir manuellement"}
              </Button>

              {/* Manual Input */}
              {showManualInput && (
                <div className="w-full space-y-3">
                  <Textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Ex: Nouveau contact Jean Dupont de Acme Corp, téléphone 0601020304"
                    className="bg-white/5 border-white/10 text-white min-h-[100px]"
                  />
                  <Button
                    onClick={processManualText}
                    disabled={isProcessing || !manualText.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-500"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyser le texte
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcription Result */}
        {transcription && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-blue-400" />
                Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80 italic">"{transcription}"</p>
            </CardContent>
          </Card>
        )}

        {/* Result Card */}
        {result && (
          <Card className={`border ${
            result.success ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  result.success ? "bg-green-500/20" : "bg-yellow-500/20"
                }`}>
                  {result.success ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-yellow-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {result.action && getActionIcon(result.action)}
                    <h3 className="text-lg font-semibold text-white">
                      {result.action ? getActionLabel(result.action) : "Résultat"}
                    </h3>
                  </div>
                  
                  <p className="text-white/70 mb-3">{result.message}</p>
                  
                  {/* Details */}
                  {result.details && (
                    <div className="bg-black/20 rounded-lg p-3 space-y-1">
                      {Object.entries(result.details).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex">
                            <span className="text-white/50 w-32 text-sm">{key}:</span>
                            <span className="text-white/90 text-sm">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Example Commands */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Exemples de commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: User, text: "Nouveau contact Marie Martin, email marie@example.com", color: "blue" },
                { icon: ListTodo, text: "Créer une tâche urgente : rappeler le client Dupont", color: "green" },
                { icon: Calendar, text: "Rendez-vous avec Jean demain à 14h pendant 1 heure", color: "purple" },
                { icon: Receipt, text: "Devis de 2500 euros pour création de site web client Acme", color: "orange" },
                { icon: FileText, text: "Note importante : le client préfère être contacté le matin", color: "yellow" }
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setManualText(example.text);
                    setShowManualInput(true);
                  }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group"
                >
                  <example.icon className={`w-5 h-5 text-${example.color}-400 mt-0.5 flex-shrink-0`} />
                  <span className="text-white/60 group-hover:text-white/80 text-sm">
                    "{example.text}"
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-white/50" />
                Historique récent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item, i) => (
                  <div 
                    key={item.id || i} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-black/20"
                  >
                    <Volume2 className="w-4 h-4 text-white/40 flex-shrink-0" />
                    <p className="text-white/70 text-sm flex-1 line-clamp-1">
                      {item.text}
                    </p>
                    <span className="text-white/30 text-xs whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VoiceCRMPage;
