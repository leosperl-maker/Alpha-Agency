import { useState, useEffect } from "react";
import { 
  Bot, ExternalLink, MessageSquare, Zap, Settings, 
  Smartphone, Send, CheckCircle2, ArrowRight, Loader2,
  RefreshCw, AlertCircle, Globe, Key, Copy, Check
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const MoltBotPage = () => {
  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // MoltBot configuration state
  const [config, setConfig] = useState({
    enabled: false,
    webhookUrl: "",
    apiKey: "",
    telegramToken: "",
    whatsappConnected: false
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${API}/api/settings`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.moltbot) {
          setConfig(data.moltbot);
          setBotStatus(data.moltbot.enabled ? "connected" : "disconnected");
        }
      }
    } catch (error) {
      console.error("Error loading MoltBot config:", error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${API}/api/settings`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ moltbot: config })
      });
      if (res.ok) {
        toast.success("Configuration MoltBot enregistrée");
        setBotStatus(config.enabled ? "connected" : "disconnected");
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Assistant IA Autonome",
      description: "MoltBot répond automatiquement à vos clients 24/7 sur Telegram et WhatsApp"
    },
    {
      icon: Zap,
      title: "Automatisation CRM",
      description: "Créez des contacts, tâches et opportunités directement depuis les conversations"
    },
    {
      icon: Globe,
      title: "Multi-plateforme",
      description: "Un seul bot connecté à Telegram, WhatsApp et votre CRM Alpha Agency"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Lancer MoltBot sur Emergent",
      description: "Accédez à emergent.sh et sélectionnez le chip MoltBot",
      action: (
        <a 
          href="https://app.emergent.sh/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm"
        >
          Ouvrir Emergent <ExternalLink className="w-4 h-4" />
        </a>
      )
    },
    {
      number: "2",
      title: "Configurer les canaux",
      description: "Connectez Telegram et/ou WhatsApp à votre bot MoltBot",
      action: null
    },
    {
      number: "3",
      title: "Intégrer avec le CRM",
      description: "Utilisez le webhook ci-dessous pour synchroniser les données",
      action: null
    },
    {
      number: "4",
      title: "Publier le bot",
      description: "Publiez votre bot pour qu'il reste actif 24/7",
      action: null
    }
  ];

  return (
    <div data-testid="moltbot-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">MoltBot</h1>
            <p className="text-white/60 text-sm">Assistant IA autonome pour votre CRM</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
            botStatus === "connected" 
              ? "bg-green-500/20 text-green-400 border border-green-500/30" 
              : "bg-white/5 text-white/50 border border-white/10"
          }`}>
            <div className={`w-2 h-2 rounded-full ${botStatus === "connected" ? "bg-green-400 animate-pulse" : "bg-white/30"}`} />
            {botStatus === "connected" ? "Connecté" : "Non connecté"}
          </div>
          
          <a
            href="https://app.emergent.sh/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir MoltBot
            </Button>
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature, idx) => (
          <div 
            key={idx}
            className="glass-panel p-5 rounded-xl hover:border-violet-500/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-3">
              <feature.icon className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
            <p className="text-white/50 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Steps */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-400" />
            Configuration
          </h2>
          
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-violet-400 font-bold text-sm">{step.number}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">{step.title}</h4>
                  <p className="text-white/50 text-sm mb-1">{step.description}</p>
                  {step.action}
                </div>
              </div>
            ))}
          </div>

          {/* Webhook URL */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <label className="text-white/70 text-sm mb-2 block">Webhook URL pour MoltBot</label>
            <div className="flex gap-2">
              <Input 
                value={`${API}/api/moltbot/webhook`}
                readOnly
                className="bg-black/30 border-white/10 text-white/80 font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(`${API}/api/moltbot/webhook`)}
                className="border-white/10 hover:bg-white/10"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-white/40 text-xs mt-2">
              Utilisez cette URL dans MoltBot pour envoyer les données vers votre CRM
            </p>
          </div>
        </div>

        {/* Integration Settings */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-violet-400" />
            Paramètres d'intégration
          </h2>

          <div className="space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <p className="text-white font-medium">Activer l'intégration</p>
                <p className="text-white/50 text-xs">Synchroniser les données avec MoltBot</p>
              </div>
              <button
                onClick={() => setConfig({...config, enabled: !config.enabled})}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  config.enabled ? 'bg-violet-600' : 'bg-white/20'
                }`}
              >
                <div className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all ${
                  config.enabled ? 'left-6' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* Telegram Token */}
            <div>
              <label className="text-white/70 text-sm mb-2 block">Token Telegram (optionnel)</label>
              <Input 
                type="password"
                placeholder="123456:ABC-DEF1234..."
                value={config.telegramToken}
                onChange={(e) => setConfig({...config, telegramToken: e.target.value})}
                className="bg-black/30 border-white/10 text-white"
              />
              <p className="text-white/40 text-xs mt-1">
                Obtenez un token via @BotFather sur Telegram
              </p>
            </div>

            {/* WhatsApp Status */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">WhatsApp</p>
                    <p className="text-white/50 text-xs">
                      {config.whatsappConnected ? "Connecté" : "Non connecté"}
                    </p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  config.whatsappConnected ? "bg-green-400" : "bg-white/30"
                }`} />
              </div>
              <p className="text-white/40 text-xs mt-2">
                Connectez WhatsApp directement depuis l'interface MoltBot
              </p>
            </div>

            {/* Save Button */}
            <Button 
              onClick={saveConfig}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Enregistrer la configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Cas d'utilisation avec le CRM
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Support client automatisé",
              description: "Répondez aux questions fréquentes 24/7",
              icon: MessageSquare
            },
            {
              title: "Création de leads",
              description: "Capturez les contacts depuis les conversations",
              icon: Send
            },
            {
              title: "Rappels & Notifications",
              description: "Envoyez des alertes pour RDV et tâches",
              icon: RefreshCw
            },
            {
              title: "Qualification automatique",
              description: "Pré-qualifiez les prospects avant contact",
              icon: CheckCircle2
            }
          ].map((useCase, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all">
              <useCase.icon className="w-6 h-6 text-violet-400 mb-2" />
              <h4 className="text-white font-medium text-sm">{useCase.title}</h4>
              <p className="text-white/50 text-xs mt-1">{useCase.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-xl p-6 border border-violet-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-violet-400 flex-shrink-0" />
            <div>
              <h3 className="text-white font-semibold">Besoin d'aide ?</h3>
              <p className="text-white/60 text-sm">
                Consultez le tutoriel complet pour configurer MoltBot avec votre CRM
              </p>
            </div>
          </div>
          <a
            href="https://emergent.sh/tutorial/moltbot-on-emergent"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="border-violet-500/30 hover:bg-violet-500/20 text-white">
              Voir le tutoriel
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MoltBotPage;
