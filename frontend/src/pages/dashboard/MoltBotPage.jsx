import { useState, useEffect, useRef } from "react";
import { 
  Bot, Send, Settings, Phone,
  FileText, Calendar, Users, DollarSign, CheckSquare, Search,
  Sparkles, TrendingUp, Zap,
  ExternalLink, X, ChevronDown, ChevronUp, Menu
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const MoltBotPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Settings
  const [settings, setSettings] = useState({
    adminPhone: "",
    morningBriefing: true,
    eveningRecap: true,
    notifyNewLeads: true,
    notifyPayments: true
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
        text: "Bonjour ! 👋 Je suis MoltBot, votre assistant IA. Je peux gérer vos contacts, créer des devis, planifier des RDV et bien plus.\n\nTapez \"aide\" pour voir toutes les commandes.",
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
      if (lowerText.includes("ca") || lowerText.includes("chiffre") || lowerText.includes("revenue") || lowerText.includes("stats")) {
        const res = await fetch(`${API}/api/moltbot/stats?period=month`, { headers });
        const data = await res.json();
        return `📊 **Stats du mois**\n\n💰 CA: ${data.revenue?.current?.toLocaleString('fr-FR') || 0}€\n📝 Devis en attente: ${data.revenue?.pending_count || 0}\n👥 Nouveaux contacts: ${data.contacts?.new || 0}\n✅ Tâches terminées: ${data.tasks?.completed || 0}`;
      }

      if (lowerText.includes("briefing") || lowerText.includes("journée") || lowerText.includes("aujourd'hui")) {
        const res = await fetch(`${API}/api/moltbot/briefing`, { headers });
        const data = await res.json();
        let response = `☀️ **Briefing du jour**\n\n`;
        response += `📋 ${data.tasks?.count || 0} tâches en cours\n`;
        response += `📅 ${data.appointments?.count || 0} RDV aujourd'hui\n`;
        response += `💰 CA du mois: ${data.stats?.ca_month?.toLocaleString('fr-FR') || 0}€\n`;
        if (data.alerts?.length) {
          response += `\n⚠️ Alertes: ${data.alerts.join(', ')}`;
        }
        return response;
      }

      // === TASKS ===
      if (lowerText.includes("tâche") || lowerText.includes("task") || lowerText.includes("todo")) {
        if (lowerText.includes("ajoute") || lowerText.includes("crée") || lowerText.includes("nouvelle")) {
          const taskTitle = text.replace(/ajoute|crée|une|nouvelle|tâche|task|todo|:/gi, '').trim();
          if (taskTitle) {
            const res = await fetch(`${API}/api/moltbot/tasks`, {
              method: "POST",
              headers,
              body: JSON.stringify({ title: taskTitle, priority: "medium" })
            });
            const data = await res.json();
            return `✅ Tâche créée: "${data.title}"`;
          }
          return "Précisez le titre de la tâche:\n\"Ajoute une tâche: Appeler client Martin\"";
        }

        if (lowerText.includes("terminé") || lowerText.includes("fini") || lowerText.includes("complété")) {
          const taskTitle = text.replace(/terminé|fini|complété|:/gi, '').trim();
          const res = await fetch(`${API}/api/moltbot/tasks/complete`, {
            method: "POST",
            headers,
            body: JSON.stringify({ search: taskTitle })
          });
          if (res.ok) {
            return `✅ Tâche marquée comme terminée !`;
          }
          return "Tâche non trouvée. Vérifiez le titre.";
        }

        const res = await fetch(`${API}/api/moltbot/tasks`, { headers });
        const data = await res.json();
        if (data.tasks?.length) {
          let response = "📋 **Vos tâches:**\n\n";
          data.tasks.slice(0, 8).forEach(task => {
            const icon = task.status === "completed" ? "✅" : task.priority === "high" ? "🔴" : "⚪";
            response += `${icon} ${task.title}\n`;
          });
          return response;
        }
        return "📋 Aucune tâche en cours. Dites \"Ajoute une tâche: ...\" pour en créer une.";
      }

      // === CONTACTS ===
      if (lowerText.includes("contact") || lowerText.includes("client") || lowerText.includes("lead")) {
        if (lowerText.includes("nouveau") || lowerText.includes("récent")) {
          const res = await fetch(`${API}/api/moltbot/contacts?recent=true&limit=5`, { headers });
          const data = await res.json();
          if (data.contacts?.length) {
            let response = "👥 **Derniers contacts:**\n\n";
            data.contacts.forEach(c => {
              response += `• ${c.first_name} ${c.last_name} ${c.company ? `(${c.company})` : ''}\n`;
            });
            return response;
          }
          return "Aucun contact récent trouvé.";
        }

        const searchTerm = text.replace(/contact|client|lead|trouve|cherche|le|la/gi, '').trim();
        if (searchTerm) {
          const res = await fetch(`${API}/api/moltbot/contacts?search=${encodeURIComponent(searchTerm)}`, { headers });
          const data = await res.json();
          if (data.contacts?.length) {
            const c = data.contacts[0];
            return `👤 **${c.first_name} ${c.last_name}**\n\n${c.company ? `🏢 ${c.company}\n` : ''}${c.email ? `📧 ${c.email}\n` : ''}${c.phone ? `📱 ${c.phone}\n` : ''}`;
          }
          return `Aucun contact trouvé pour "${searchTerm}"`;
        }
      }

      // === INVOICES ===
      if (lowerText.includes("devis") || lowerText.includes("facture")) {
        if (lowerText.includes("crée") || lowerText.includes("nouveau")) {
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
            return `✅ **${lowerText.includes("facture") ? "Facture" : "Devis"} créé !**\n\n📄 N° ${data.number}\n👤 ${clientName}\n💰 ${data.total?.toLocaleString('fr-FR')}€ TTC`;
          }
          return "Exemple: \"Crée un devis de 3000€ pour Dupont, création site web\"";
        }

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
        return "📅 Aucun RDV prévu.";
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
          response += `**Contacts:** `;
          response += data.results.contacts.map(c => `${c.first_name} ${c.last_name}`).join(', ') + '\n';
        }
        if (data.results?.invoices?.length) {
          hasResults = true;
          response += `**Devis/Factures:** `;
          response += data.results.invoices.map(i => i.number).join(', ') + '\n';
        }

        return hasResults ? response : `Aucun résultat pour "${searchTerm}"`;
      }

      // === HELP ===
      if (lowerText.includes("aide") || lowerText.includes("help") || lowerText.includes("commande")) {
        return `🤖 **Commandes MoltBot:**\n
📊 "CA du mois" / "Stats" / "Briefing"
👥 "Cherche client Dupont" / "Nouveaux contacts"
📋 "Mes tâches" / "Ajoute tâche: ..." / "Terminé: ..."
📄 "Crée devis de X€ pour..." / "Liste devis"
📅 "Mes RDV"
🔍 "Recherche Dupont"`;
      }

      // Default
      return "Je n'ai pas compris. Dites \"aide\" pour voir les commandes disponibles.";

    } catch (error) {
      console.error("Error:", error);
      return "Erreur. Réessayez ou dites \"aide\".";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { type: "user", text: userMessage, time: new Date() }]);
    setLoading(true);

    const response = await processCommand(userMessage);
    
    setMessages(prev => [...prev, { type: "bot", text: response, time: new Date() }]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const quickActions = [
    { label: "📊 Stats", command: "Stats du mois" },
    { label: "📋 Tâches", command: "Mes tâches" },
    { label: "📅 RDV", command: "Mes RDV" },
    { label: "📄 Devis", command: "Liste des devis" },
    { label: "☀️ Briefing", command: "Briefing" },
    { label: "❓ Aide", command: "Aide" },
  ];

  return (
    <div data-testid="moltbot-page" className="h-full flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold">MoltBot</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSidebar(!showSidebar)}
          className="text-white/70"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-violet-600/10 to-purple-600/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">MoltBot</h1>
                <p className="text-white/50 text-xs">Assistant IA intégré au CRM</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs">En ligne</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Briefing Banner */}
          {briefing && showBriefing && (
            <div className="mx-3 mt-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white/80 text-sm truncate">
                      📋 {briefing.tasks?.count || 0} tâches • 📅 {briefing.appointments?.count || 0} RDV • 💰 {briefing.stats?.ca_month?.toLocaleString('fr-FR') || 0}€
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowBriefing(false)} className="text-white/50 hover:text-white ml-2 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%]`}>
                  <div
                    className={`px-3 py-2 rounded-xl text-sm ${
                      msg.type === "user"
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-sm"
                        : "bg-white/5 text-white/90 rounded-bl-sm border border-white/10"
                    }`}
                  >
                    <p className="whitespace-pre-line break-words">{msg.text}</p>
                  </div>
                  <p className={`text-[10px] text-white/40 mt-0.5 ${msg.type === "user" ? "text-right" : "text-left"}`}>
                    {msg.time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 px-3 py-2 rounded-xl rounded-bl-sm border border-white/10">
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
          <div className="px-3 py-2 border-t border-white/10 overflow-x-auto">
            <div className="flex gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(action.command);
                    setTimeout(() => sendMessage(), 100);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs whitespace-nowrap transition-colors border border-white/10"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Votre message..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40 text-sm h-9"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 h-9 px-3"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`
          ${showSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          fixed lg:relative right-0 top-0 lg:top-auto h-full lg:h-auto
          w-72 lg:w-64 xl:w-72
          bg-[#0a0a12] lg:bg-transparent
          border-l border-white/10
          p-3 space-y-3 overflow-y-auto
          transition-transform duration-300 ease-in-out
          z-50 lg:z-auto
        `}>
          {/* Close button mobile - bien visible */}
          <div className="flex justify-between items-center lg:hidden mb-3 pb-3 border-b border-white/20">
            <span className="text-white font-semibold">Infos</span>
            <button 
              onClick={() => setShowSidebar(false)} 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                Stats du mois
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-white/5">
                  <p className="text-white/50 text-[10px]">CA</p>
                  <p className="text-white font-semibold text-sm">{stats.revenue?.current?.toLocaleString('fr-FR') || 0}€</p>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <p className="text-white/50 text-[10px]">Contacts</p>
                  <p className="text-white font-semibold text-sm">{stats.contacts?.new || 0}</p>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <p className="text-white/50 text-[10px]">Tâches</p>
                  <p className="text-white font-semibold text-sm">{stats.tasks?.pending || 0}</p>
                </div>
                <div className="p-2 rounded bg-white/5">
                  <p className="text-white/50 text-[10px]">RDV</p>
                  <p className="text-white font-semibold text-sm">{stats.appointments?.upcoming || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-violet-400" />
                Paramètres
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-white/70 text-xs">Téléphone WhatsApp</label>
                  <Input
                    placeholder="+590690..."
                    value={settings.adminPhone}
                    onChange={(e) => setSettings({ ...settings, adminPhone: e.target.value })}
                    className="mt-1 bg-white/5 border-white/10 text-white text-sm h-8"
                  />
                </div>
                
                {[
                  { key: 'morningBriefing', label: 'Briefing matin' },
                  { key: 'eveningRecap', label: 'Récap soir' },
                  { key: 'notifyNewLeads', label: 'Alertes leads' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-white/70 text-xs">{label}</span>
                    <button
                      onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
                      className={`w-8 h-4 rounded-full relative transition-colors ${
                        settings[key] ? 'bg-violet-600' : 'bg-white/20'
                      }`}
                    >
                      <div className={`absolute w-3 h-3 rounded-full bg-white top-0.5 transition-all ${
                        settings[key] ? 'left-4' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                ))}

                <Button size="sm" className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white text-xs h-8">
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <h3 className="text-white font-medium mb-2 flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-green-400" />
              WhatsApp
            </h3>
            <p className="text-white/50 text-xs mb-2">
              Contrôlez le CRM via WhatsApp.
            </p>
            <a href="/admin/whatsapp">
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-500 text-xs h-8">
                <ExternalLink className="w-3 h-3 mr-1" />
                Configurer
              </Button>
            </a>
          </div>

          {/* Tips */}
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <h3 className="text-white font-medium mb-2 text-sm">💡 Astuces</h3>
            <ul className="text-white/60 text-xs space-y-1">
              <li>• "Crée un devis de 2000€ pour Dupont"</li>
              <li>• "Ajoute une tâche: Rappeler client"</li>
              <li>• "Cherche le client Martin"</li>
              <li>• "CA du mois"</li>
            </ul>
          </div>
        </div>

        {/* Overlay for mobile sidebar */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </div>
    </div>
  );
};

export default MoltBotPage;
