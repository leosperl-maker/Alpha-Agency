import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, Mic, MicOff, Loader2, Settings, Phone, Mail,
  FileText, Calendar, Users, DollarSign, CheckSquare, Search,
  Sparkles, MessageSquare, Bell, Clock, TrendingUp, Zap,
  ExternalLink, Copy, Check, Plus, ArrowRight, RefreshCw,
  Volume2, VolumeX, Paperclip, Download, Eye, Trash2,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const MoltBotPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Settings
  const [settings, setSettings] = useState({
    adminPhone: "",
    morningBriefing: true,
    eveningRecap: true,
    briefingTime: "08:00",
    recapTime: "18:00",
    notifyNewLeads: true,
    notifyPayments: true,
    notifyOverdue: true
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      const headers = { 
        "Authorization": `Bearer ${token}`,
        "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
      };

      // Load stats
      const statsRes = await fetch(`${API}/api/moltbot/stats?period=month`, { headers });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Load briefing
      const briefingRes = await fetch(`${API}/api/moltbot/briefing`, { headers });
      if (briefingRes.ok) {
        const data = await briefingRes.json();
        setBriefing(data);
      }

      // Welcome message
      setMessages([{
        type: "bot",
        text: "Bonjour ! 👋 Je suis MoltBot, votre assistant IA intégré au CRM. Je peux vous aider à :\n\n• Gérer vos contacts et clients\n• Créer des devis et factures\n• Planifier des RDV\n• Suivre vos tâches\n• Rechercher des informations\n\nQue puis-je faire pour vous ?",
        time: new Date()
      }]);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const processCommand = async (text) => {
    const lowerText = text.toLowerCase();
    const token = localStorage.getItem("alpha_token");
    const headers = { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
    };

    try {
      // === STATS & BRIEFING ===
      if (lowerText.includes("ca") || lowerText.includes("chiffre") || lowerText.includes("revenue")) {
        const res = await fetch(`${API}/api/moltbot/stats?period=month`, { headers });
        const data = await res.json();
        return `📊 **Statistiques du mois**\n\n💰 CA: ${data.revenue?.current?.toLocaleString('fr-FR') || 0}€\n📝 Devis en attente: ${data.revenue?.pending_count || 0} (${data.revenue?.pending_quotes?.toLocaleString('fr-FR') || 0}€)\n👥 Nouveaux contacts: ${data.contacts?.new || 0}\n✅ Tâches terminées: ${data.tasks?.completed || 0}`;
      }

      if (lowerText.includes("briefing") || lowerText.includes("journée") || lowerText.includes("aujourd'hui")) {
        const res = await fetch(`${API}/api/moltbot/briefing`, { headers });
        const data = await res.json();
        let response = `☀️ **${data.greeting}**\n\n`;
        response += `📋 **Tâches:** ${data.tasks?.count || 0} à faire\n`;
        response += `📅 **RDV:** ${data.appointments?.count || 0} prévus\n`;
        if (data.alerts?.new_leads) response += `🆕 **Nouveaux leads:** ${data.alerts.new_leads}\n`;
        if (data.alerts?.overdue_invoices?.length) response += `⚠️ **Factures en retard:** ${data.alerts.overdue_invoices.length}\n`;
        response += `\n💰 **CA du mois:** ${data.stats?.ca_month?.toLocaleString('fr-FR') || 0}€`;
        return response;
      }

      if (lowerText.includes("recap") || lowerText.includes("récap") || lowerText.includes("bilan")) {
        const res = await fetch(`${API}/api/moltbot/recap`, { headers });
        const data = await res.json();
        let response = `🌙 **${data.summary}**\n\n`;
        response += `✅ **Terminées:** ${data.completed?.count || 0} tâches\n`;
        response += `⏳ **En attente:** ${data.remaining?.count || 0} tâches\n\n`;
        if (data.tomorrow?.appointments?.length) {
          response += `📅 **Demain:**\n`;
          data.tomorrow.appointments.forEach(rdv => {
            const time = new Date(rdv.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            response += `• ${time} - ${rdv.title}\n`;
          });
        }
        return response;
      }

      // === CONTACTS ===
      if (lowerText.includes("cherche") && (lowerText.includes("contact") || lowerText.includes("client"))) {
        const searchTerm = text.replace(/cherche|contact|client|le|la|les|un|une/gi, '').trim();
        const res = await fetch(`${API}/api/moltbot/contacts?search=${encodeURIComponent(searchTerm)}`, { headers });
        const data = await res.json();
        if (data.contacts?.length) {
          const contact = data.contacts[0];
          return `👤 **${contact.first_name} ${contact.last_name}**\n\n📧 ${contact.email || 'N/A'}\n📱 ${contact.phone || 'N/A'}\n🏢 ${contact.company || 'N/A'}\n🏷️ Status: ${contact.status || 'N/A'}`;
        }
        return "❌ Aucun contact trouvé avec ce nom.";
      }

      if (lowerText.includes("crée") && lowerText.includes("contact")) {
        return "Pour créer un contact, donnez-moi les informations suivantes:\n\n• Prénom et nom\n• Email\n• Téléphone\n• Entreprise (optionnel)\n\nExemple: \"Crée le contact Jean Dupont, jean@email.com, 0690123456\"";
      }

      if (lowerText.includes("nouveau") && (lowerText.includes("lead") || lowerText.includes("contact"))) {
        const res = await fetch(`${API}/api/moltbot/contacts?limit=5`, { headers });
        const data = await res.json();
        let response = "📥 **Derniers contacts:**\n\n";
        data.contacts?.slice(0, 5).forEach(c => {
          response += `• ${c.first_name} ${c.last_name} (${c.source || 'direct'})\n`;
        });
        return response;
      }

      // === TASKS ===
      if (lowerText.includes("tâche") || lowerText.includes("task") || lowerText.includes("à faire")) {
        if (lowerText.includes("crée") || lowerText.includes("ajoute") || lowerText.includes("nouvelle")) {
          const titleMatch = text.match(/(?:crée|ajoute|nouvelle)\s+(?:une\s+)?(?:tâche|task)?\s*[:\-]?\s*(.+?)(?:\s+pour\s+|$)/i);
          if (titleMatch) {
            const title = titleMatch[1].trim();
            const res = await fetch(`${API}/api/moltbot/tasks`, {
              method: "POST",
              headers,
              body: JSON.stringify({ title, priority: "medium" })
            });
            const data = await res.json();
            return `✅ Tâche créée: "${title}"\n\n🔔 Je vous rappellerai !`;
          }
          return "Pour créer une tâche, dites par exemple:\n\"Ajoute une tâche: Appeler le client Dupont\"";
        }

        if (lowerText.includes("terminé") || lowerText.includes("fait") || lowerText.includes("fini")) {
          const taskMatch = text.match(/(?:terminé|fait|fini)[:\-]?\s*(.+)/i);
          if (taskMatch) {
            const taskName = taskMatch[1].trim();
            const res = await fetch(`${API}/api/moltbot/tasks/${encodeURIComponent(taskName)}/complete`, {
              method: "PUT",
              headers
            });
            if (res.ok) {
              return `✅ Tâche "${taskName}" marquée comme terminée ! Bravo ! 🎉`;
            }
          }
        }

        // List tasks
        const res = await fetch(`${API}/api/moltbot/tasks?status=todo`, { headers });
        const data = await res.json();
        if (data.tasks?.length) {
          let response = "📋 **Vos tâches en cours:**\n\n";
          data.tasks.slice(0, 10).forEach((t, i) => {
            const priority = t.priority === "urgent" ? "🔴" : t.priority === "high" ? "🟠" : "🟢";
            response += `${priority} ${t.title}\n`;
          });
          return response;
        }
        return "✅ Aucune tâche en cours ! Vous êtes à jour.";
      }

      // === DEVIS / FACTURES ===
      if (lowerText.includes("devis") || lowerText.includes("facture")) {
        if (lowerText.includes("crée") || lowerText.includes("créer") || lowerText.includes("nouveau")) {
          // Parse: "Crée un devis de 3000€ pour Dupont, site vitrine"
          const match = text.match(/(\d+)\s*€?\s*(?:pour|client)?\s*([^,]+),?\s*(.+)?/i);
          if (match) {
            const amount = parseFloat(match[1]);
            const clientName = match[2].trim();
            const description = match[3]?.trim() || "Prestation";
            
            const res = await fetch(`${API}/api/moltbot/invoices`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                client_name: clientName,
                items: [{ description, quantity: 1, unit_price: amount }],
                type: lowerText.includes("facture") ? "facture" : "devis"
              })
            });
            const data = await res.json();
            return `✅ **${lowerText.includes("facture") ? "Facture" : "Devis"} créé !**\n\n📄 N° ${data.number}\n👤 Client: ${clientName}\n💰 Montant: ${data.total?.toLocaleString('fr-FR')}€ TTC\n\n📎 Je peux vous l'envoyer par email ou WhatsApp. Dites "envoie le devis à ${clientName}"`;
          }
          return "Pour créer un devis, dites par exemple:\n\"Crée un devis de 3000€ pour Dupont, création site web\"";
        }

        // List invoices
        const type = lowerText.includes("facture") ? "facture" : "devis";
        const res = await fetch(`${API}/api/moltbot/invoices?type=${type}`, { headers });
        const data = await res.json();
        if (data.invoices?.length) {
          let response = `📄 **Derniers ${type}s:**\n\n`;
          data.invoices.slice(0, 5).forEach(inv => {
            const status = inv.status === "paid" ? "✅" : inv.status === "sent" ? "📤" : "📝";
            response += `${status} ${inv.number} - ${inv.client_name} - ${inv.total?.toLocaleString('fr-FR')}€\n`;
          });
          return response;
        }
        return `Aucun ${type} trouvé.`;
      }

      // === RDV ===
      if (lowerText.includes("rdv") || lowerText.includes("rendez-vous") || lowerText.includes("meeting")) {
        if (lowerText.includes("crée") || lowerText.includes("planifie") || lowerText.includes("place")) {
          return "Pour créer un RDV, dites par exemple:\n\"Place un RDV avec Dupont le 15 février à 14h pour présentation devis\"\n\nJe peux aussi envoyer une invitation visio Google Meet !";
        }

        const res = await fetch(`${API}/api/moltbot/appointments?upcoming=true`, { headers });
        const data = await res.json();
        if (data.appointments?.length) {
          let response = "📅 **Prochains RDV:**\n\n";
          data.appointments.slice(0, 5).forEach(rdv => {
            const date = new Date(rdv.start_time);
            response += `• ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${rdv.title}\n`;
          });
          return response;
        }
        return "📅 Aucun RDV prévu. Dites \"Crée un RDV\" pour en planifier un !";
      }

      // === SEARCH ===
      if (lowerText.includes("recherche") || lowerText.includes("trouve") || lowerText.includes("cherche")) {
        const searchTerm = text.replace(/recherche|trouve|cherche|dans|le|la|les|tout/gi, '').trim();
        const res = await fetch(`${API}/api/moltbot/search`, {
          method: "POST",
          headers,
          body: JSON.stringify({ query: searchTerm, limit: 5 })
        });
        const data = await res.json();
        
        let response = `🔍 **Résultats pour "${searchTerm}":**\n\n`;
        let hasResults = false;

        if (data.results?.contacts?.length) {
          hasResults = true;
          response += `**Contacts:**\n`;
          data.results.contacts.forEach(c => {
            response += `• ${c.first_name} ${c.last_name}\n`;
          });
        }
        if (data.results?.invoices?.length) {
          hasResults = true;
          response += `\n**Devis/Factures:**\n`;
          data.results.invoices.forEach(i => {
            response += `• ${i.number} - ${i.client_name}\n`;
          });
        }
        if (data.results?.tasks?.length) {
          hasResults = true;
          response += `\n**Tâches:**\n`;
          data.results.tasks.forEach(t => {
            response += `• ${t.title}\n`;
          });
        }

        return hasResults ? response : `Aucun résultat trouvé pour "${searchTerm}"`;
      }

      // === DOCUMENTS ===
      if (lowerText.includes("document") || lowerText.includes("fichier") || lowerText.includes("contrat")) {
        const searchTerm = text.replace(/document|fichier|contrat|envoie|montre|trouve/gi, '').trim();
        const res = await fetch(`${API}/api/moltbot/documents?search=${encodeURIComponent(searchTerm)}`, { headers });
        const data = await res.json();
        if (data.documents?.length) {
          let response = "📁 **Documents trouvés:**\n\n";
          data.documents.slice(0, 5).forEach(doc => {
            response += `• ${doc.name}\n`;
          });
          return response;
        }
        return "Aucun document trouvé. Vérifiez l'orthographe ou uploadez le document dans l'onglet Documents.";
      }

      // === RAPPELS ===
      if (lowerText.includes("rappel") || lowerText.includes("rappelle")) {
        if (lowerText.includes("crée") || lowerText.includes("mets") || lowerText.includes("programme")) {
          return "Pour créer un rappel, dites par exemple:\n\"Rappelle-moi d'appeler Dupont demain à 10h\"";
        }
        const res = await fetch(`${API}/api/moltbot/reminders`, { headers });
        const data = await res.json();
        if (data.reminders?.length) {
          let response = "🔔 **Vos rappels:**\n\n";
          data.reminders.forEach(r => {
            const date = new Date(r.remind_at);
            response += `• ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${r.message}\n`;
          });
          return response;
        }
        return "Aucun rappel programmé.";
      }

      // === HELP ===
      if (lowerText.includes("aide") || lowerText.includes("help") || lowerText.includes("commande")) {
        return `🤖 **Commandes disponibles:**\n
📊 **Stats:** "CA du mois", "Stats", "Briefing"
👥 **Contacts:** "Cherche le client Dupont", "Nouveaux leads"
📋 **Tâches:** "Mes tâches", "Ajoute une tâche: ...", "Terminé: ..."
📄 **Devis:** "Crée un devis de X€ pour...", "Liste des devis"
📅 **RDV:** "Mes RDV", "Place un RDV..."
🔔 **Rappels:** "Rappelle-moi de...", "Mes rappels"
🔍 **Recherche:** "Recherche Dupont", "Trouve le contrat..."
📁 **Documents:** "Document Dupont", "Envoie le contrat..."`;
      }

      // Default response
      return "Je n'ai pas compris votre demande. Dites \"aide\" pour voir les commandes disponibles, ou posez votre question autrement.\n\nExemples:\n• \"CA du mois\"\n• \"Mes tâches\"\n• \"Crée un devis de 1500€ pour Dupont\"";

    } catch (error) {
      console.error("Error processing command:", error);
      return "Désolé, une erreur s'est produite. Réessayez ou dites \"aide\" pour voir les commandes disponibles.";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      type: "user",
      text: input,
      time: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      const response = await processCommand(userInput);
      setMessages(prev => [...prev, {
        type: "bot",
        text: response,
        time: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: "bot",
        text: "Désolé, une erreur s'est produite. Réessayez.",
        time: new Date()
      }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const quickActions = [
    { label: "📊 Stats du mois", command: "CA du mois" },
    { label: "📋 Mes tâches", command: "Mes tâches" },
    { label: "📅 Mes RDV", command: "Mes RDV" },
    { label: "📄 Derniers devis", command: "Liste des devis" },
    { label: "☀️ Briefing", command: "Briefing du jour" },
    { label: "🌙 Récap", command: "Récap de la journée" },
  ];

  return (
    <div data-testid="moltbot-page" className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-4">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-600/20 to-purple-600/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MoltBot</h1>
              <p className="text-white/60 text-sm">Assistant IA • Remplace l'assistant précédent</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm">En ligne</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Daily Briefing Banner */}
        {briefing && showBriefing && (
          <div className="mx-4 mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Briefing du jour</h3>
                  <p className="text-white/70 text-sm mt-1">
                    📋 {briefing.tasks?.count || 0} tâches • 
                    📅 {briefing.appointments?.count || 0} RDV • 
                    💰 {briefing.stats?.ca_month?.toLocaleString('fr-FR') || 0}€ ce mois
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBriefing(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] ${msg.type === "user" ? "" : ""}`}>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    msg.type === "user"
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-md"
                      : "bg-white/10 text-white rounded-bl-md border border-white/10"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                </div>
                <p className={`text-xs text-white/40 mt-1 ${msg.type === "user" ? "text-right" : "text-left"}`}>
                  {msg.time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-md border border-white/10">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-white/10 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(action.command);
                  setTimeout(() => sendMessage(), 100);
                }}
                className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm whitespace-nowrap transition-colors border border-white/10"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Tapez votre message... (ex: CA du mois, Crée un devis...)"
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar - Stats & Settings */}
      <div className="w-full lg:w-80 space-y-4">
        {/* Quick Stats */}
        {stats && (
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              Stats du mois
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white/50 text-xs">CA</p>
                <p className="text-white font-bold">{stats.revenue?.current?.toLocaleString('fr-FR') || 0}€</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white/50 text-xs">Nouveaux contacts</p>
                <p className="text-white font-bold">{stats.contacts?.new || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white/50 text-xs">Tâches en cours</p>
                <p className="text-white font-bold">{stats.tasks?.pending || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white/50 text-xs">RDV à venir</p>
                <p className="text-white font-bold">{stats.appointments?.upcoming || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-violet-400" />
              Paramètres MoltBot
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-white/70 text-sm">Téléphone admin (WhatsApp)</label>
                <Input
                  placeholder="+590690..."
                  value={settings.adminPhone}
                  onChange={(e) => setSettings({ ...settings, adminPhone: e.target.value })}
                  className="mt-1 bg-white/5 border-white/10 text-white"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Briefing matin</span>
                <button
                  onClick={() => setSettings({ ...settings, morningBriefing: !settings.morningBriefing })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    settings.morningBriefing ? 'bg-violet-600' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                    settings.morningBriefing ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Récap soir</span>
                <button
                  onClick={() => setSettings({ ...settings, eveningRecap: !settings.eveningRecap })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    settings.eveningRecap ? 'bg-violet-600' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                    settings.eveningRecap ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Alertes nouveaux leads</span>
                <button
                  onClick={() => setSettings({ ...settings, notifyNewLeads: !settings.notifyNewLeads })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    settings.notifyNewLeads ? 'bg-violet-600' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                    settings.notifyNewLeads ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>

              <Button className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white">
                Sauvegarder
              </Button>
            </div>
          </div>
        )}

        {/* WhatsApp Integration */}
        <div className="glass-panel rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-400" />
            Intégration WhatsApp
          </h3>
          <p className="text-white/50 text-sm mb-3">
            Connectez votre WhatsApp pour recevoir les briefings, alertes et contrôler le CRM par message.
          </p>
          <a
            href="https://app.emergent.sh/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="w-full bg-green-600 hover:bg-green-500">
              <ExternalLink className="w-4 h-4 mr-2" />
              Configurer MoltBot
            </Button>
          </a>
        </div>

        {/* Help */}
        <div className="glass-panel rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2">💡 Astuces</h3>
          <ul className="text-white/60 text-sm space-y-1">
            <li>• "Crée un devis de 2000€ pour Dupont"</li>
            <li>• "Ajoute une tâche: Rappeler client"</li>
            <li>• "Terminé: Appeler comptable"</li>
            <li>• "Cherche le client Martin"</li>
            <li>• "CA du mois"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MoltBotPage;
