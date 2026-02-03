import { useState, useEffect, useRef } from "react";
import { 
  Phone, QrCode, Wifi, WifiOff, RefreshCw, CheckCircle2, 
  AlertCircle, Send, MessageSquare, Settings, Bell, Clock,
  User, Loader2, X, Camera, Edit2, Upload
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const WhatsAppConfigPage = () => {
  const [status, setStatus] = useState({ connected: false });
  const [profile, setProfile] = useState({ name: "", profile_picture: null });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    adminPhone: "",
    morningBriefing: true,
    morningTime: "08:00",
    eveningRecap: true,
    eveningTime: "18:00",
    notifyNewLeads: true,
    notifyPayments: true
  });
  const [testMessage, setTestMessage] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadStatus();
    loadConfig();
    loadProfile();
    // Poll for status updates
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API}/api/whatsapp/status`);
      const data = await res.json();
      setStatus(data);
      
      // If not connected, try to get QR code
      if (!data.connected) {
        const qrRes = await fetch(`${API}/api/whatsapp/qr`);
        const qrData = await qrRes.json();
        setQrCode(qrData.qr);
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error("Error loading status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch(`${API}/api/whatsapp/profile`);
      const data = await res.json();
      if (data.connected) {
        setProfile(data);
        setNewProfileName(data.name || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const updateProfileName = async () => {
    if (!newProfileName.trim()) {
      toast.error("Entrez un nom valide");
      return;
    }
    
    try {
      const res = await fetch(`${API}/api/whatsapp/profile/name?name=${encodeURIComponent(newProfileName)}`, {
        method: "POST",
        headers: { 
          "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
        }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Nom de profil mis à jour !");
        setProfile(prev => ({ ...prev, name: newProfileName }));
        setEditingName(false);
        loadStatus();
      } else {
        toast.error(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du nom");
    }
  };

  const handlePictureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }
    
    setUploadingPicture(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
        
        const res = await fetch(`${API}/api/whatsapp/profile/picture`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
          },
          body: JSON.stringify({ image_base64: base64 })
        });
        
        const data = await res.json();
        
        if (data.success) {
          toast.success("Photo de profil mise à jour !");
          loadProfile();
        } else {
          toast.error(data.error || "Erreur lors de la mise à jour");
        }
        setUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Erreur lors de l'upload");
      setUploadingPicture(false);
    }
  };

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${API}/api/whatsapp/config`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Map backend snake_case to frontend camelCase
        setConfig({
          adminPhone: data.admin_phone || "",
          morningBriefing: data.morning_briefing ?? true,
          morningTime: data.morning_time || "08:00",
          eveningRecap: data.evening_recap ?? true,
          eveningTime: data.evening_time || "18:00",
          notifyNewLeads: data.notify_new_leads ?? true,
          notifyPayments: data.notify_payments ?? true
        });
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const saveConfig = async () => {
    try {
      const res = await fetch(`${API}/api/whatsapp/config`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
        },
        body: JSON.stringify({
          admin_phone: config.adminPhone,
          morning_briefing: config.morningBriefing,
          morning_time: config.morningTime,
          evening_recap: config.eveningRecap,
          evening_time: config.eveningTime,
          notify_new_leads: config.notifyNewLeads,
          notify_payments: config.notifyPayments
        })
      });
      
      if (res.ok) {
        toast.success("Configuration sauvegardée");
      }
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast.error("Entrez un numéro et un message");
      return;
    }
    
    try {
      const res = await fetch(`${API}/api/whatsapp/send`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
        },
        body: JSON.stringify({
          phone_number: testPhone,
          message: testMessage
        })
      });
      
      if (res.ok) {
        toast.success("Message envoyé !");
        setTestMessage("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur d'envoi");
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

  return (
    <div data-testid="whatsapp-config-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center shadow-lg">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">WhatsApp Business</h1>
            <p className="text-white/60 text-sm">Connectez MoltBot à votre WhatsApp</p>
          </div>
        </div>
        
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${
          status.connected 
            ? "bg-green-500/20 text-green-400 border border-green-500/30" 
            : "bg-red-500/20 text-red-400 border border-red-500/30"
        }`}>
          {status.connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {status.connected ? "Connecté" : "Déconnecté"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Status / QR Code */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-green-400" />
            Connexion
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            </div>
          ) : status.connected ? (
            <div className="text-center py-6">
              {/* Profile Picture */}
              <div className="relative w-24 h-24 mx-auto mb-4 group">
                {profile.profile_picture ? (
                  <img 
                    src={profile.profile_picture} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-green-500/30"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center border-4 border-green-500/30">
                    <User className="w-10 h-10 text-green-400" />
                  </div>
                )}
                
                {/* Upload overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {uploadingPicture ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePictureUpload}
                  className="hidden"
                />
              </div>
              
              {/* Profile Name */}
              {editingName ? (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Input
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Nom du profil"
                    className="w-48 bg-white/5 border-white/10 text-white text-center"
                    onKeyDown={(e) => e.key === 'Enter' && updateProfileName()}
                  />
                  <Button size="sm" onClick={updateProfileName} className="bg-green-600 hover:bg-green-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-white font-semibold text-lg">
                    {profile.name || status.name || "WhatsApp"}
                  </h3>
                  <button
                    onClick={() => {
                      setNewProfileName(profile.name || status.name || "");
                      setEditingName(true);
                    }}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <p className="text-white/40 text-sm">
                {status.phone_number && `+${status.phone_number}`}
              </p>
              
              <p className="text-white/30 text-xs mt-4">
                Dernière connexion : {status.last_connected 
                  ? new Date(status.last_connected).toLocaleString('fr-FR')
                  : 'N/A'
                }
              </p>
              
              <p className="text-green-400/60 text-xs mt-2">
                💡 Cliquez sur la photo ou le nom pour modifier
              </p>
            </div>
          ) : qrCode ? (
            <div className="text-center">
              <p className="text-white/70 mb-4">
                Scannez ce QR code avec WhatsApp
              </p>
              <div className="bg-white p-4 rounded-xl inline-block">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-white/50 text-sm mt-4">
                WhatsApp → Menu → Appareils connectés → Connecter un appareil
              </p>
              <Button 
                onClick={loadStatus}
                variant="ghost"
                className="mt-4 text-white/70"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-white/70 mb-4">
                QR code en cours de génération...
              </p>
              <Button 
                onClick={loadStatus}
                className="bg-green-600 hover:bg-green-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-400" />
            Configuration
          </h2>

          <div className="space-y-4">
            {/* Admin Phone */}
            <div>
              <label className="text-white/70 text-sm mb-1 block">
                Votre numéro WhatsApp (admin)
              </label>
              <Input
                placeholder="+590690123456"
                value={config.adminPhone}
                onChange={(e) => setConfig({ ...config, adminPhone: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-white/40 text-xs mt-1">
                Ce numéro recevra les briefings et aura accès aux commandes CRM
              </p>
            </div>

            {/* Morning Briefing */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white text-sm">Briefing matin</p>
                  <p className="text-white/40 text-xs">Tâches et RDV du jour</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={config.morningTime}
                  onChange={(e) => setConfig({ ...config, morningTime: e.target.value })}
                  className="w-24 bg-white/5 border-white/10 text-white text-sm"
                  disabled={!config.morningBriefing}
                />
                <button
                  onClick={() => setConfig({ ...config, morningBriefing: !config.morningBriefing })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    config.morningBriefing ? 'bg-green-600' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                    config.morningBriefing ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Evening Recap */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white text-sm">Récap soir</p>
                  <p className="text-white/40 text-xs">Bilan de la journée</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={config.eveningTime}
                  onChange={(e) => setConfig({ ...config, eveningTime: e.target.value })}
                  className="w-24 bg-white/5 border-white/10 text-white text-sm"
                  disabled={!config.eveningRecap}
                />
                <button
                  onClick={() => setConfig({ ...config, eveningRecap: !config.eveningRecap })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    config.eveningRecap ? 'bg-green-600' : 'bg-white/20'
                  }`}
                >
                  <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                    config.eveningRecap ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white text-sm">Alertes nouveaux leads</p>
                </div>
              </div>
              <button
                onClick={() => setConfig({ ...config, notifyNewLeads: !config.notifyNewLeads })}
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  config.notifyNewLeads ? 'bg-green-600' : 'bg-white/20'
                }`}
              >
                <div className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${
                  config.notifyNewLeads ? 'left-5' : 'left-0.5'
                }`} />
              </button>
            </div>

            <Button 
              onClick={saveConfig}
              className="w-full bg-green-600 hover:bg-green-500"
            >
              Sauvegarder la configuration
            </Button>
          </div>
        </div>
      </div>

      {/* Test Briefings */}
      {status.connected && (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Tester les briefings automatisés
          </h2>
          
          <p className="text-white/60 text-sm mb-4">
            Envoyez un briefing ou récap de test au numéro admin configuré.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={async () => {
                try {
                  const res = await fetch(`${API}/api/whatsapp/test-briefing?briefing_type=morning`, {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
                    }
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success("Briefing matin envoyé !");
                  } else {
                    toast.error(data.error || "Erreur d'envoi");
                  }
                } catch (err) {
                  toast.error("Erreur lors de l'envoi");
                }
              }}
              variant="outline"
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            >
              <Clock className="w-4 h-4 mr-2" />
              Envoyer Briefing Matin
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const res = await fetch(`${API}/api/whatsapp/test-briefing?briefing_type=evening`, {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
                    }
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success("Récap soir envoyé !");
                  } else {
                    toast.error(data.error || "Erreur d'envoi");
                  }
                } catch (err) {
                  toast.error("Erreur lors de l'envoi");
                }
              }}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Clock className="w-4 h-4 mr-2" />
              Envoyer Récap Soir
            </Button>
          </div>
        </div>
      )}

      {/* Test Message */}
      {status.connected && (
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-green-400" />
            Envoyer un message test
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Numéro (+590690...)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="md:w-48 bg-white/5 border-white/10 text-white"
            />
            <Input
              placeholder="Message test..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 bg-white/5 border-white/10 text-white"
            />
            <Button 
              onClick={sendTestMessage}
              className="bg-green-600 hover:bg-green-500"
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          💡 Comment ça marche ?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
              <span className="text-green-400 font-bold">1</span>
            </div>
            <h4 className="text-white font-medium mb-1">Connectez</h4>
            <p className="text-white/50 text-sm">
              Scannez le QR code avec votre WhatsApp
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
              <span className="text-green-400 font-bold">2</span>
            </div>
            <h4 className="text-white font-medium mb-1">Configurez</h4>
            <p className="text-white/50 text-sm">
              Entrez votre numéro admin et activez les notifications
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
              <span className="text-green-400 font-bold">3</span>
            </div>
            <h4 className="text-white font-medium mb-1">Utilisez</h4>
            <p className="text-white/50 text-sm">
              Envoyez "aide" sur WhatsApp pour voir les commandes
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <h4 className="text-green-400 font-medium mb-2">Commandes disponibles :</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <span className="text-white/70">"CA du mois"</span>
            <span className="text-white/70">"Mes tâches"</span>
            <span className="text-white/70">"Briefing"</span>
            <span className="text-white/70">"Récap"</span>
            <span className="text-white/70">"Crée tâche: ..."</span>
            <span className="text-white/70">"Cherche contact: ..."</span>
            <span className="text-white/70">"Crée devis 500€ pour X"</span>
            <span className="text-white/70">"Aide"</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Business Cloud API Section */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          WhatsApp Business Cloud API (Officiel)
        </h2>
        
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
          <p className="text-blue-300 text-sm mb-2">
            <strong>Alternative officielle à Baileys</strong> - API Meta pour les entreprises
          </p>
          <ul className="text-white/60 text-xs space-y-1">
            <li>✅ Pas de QR code à scanner</li>
            <li>✅ Numéro dédié sans téléphone physique</li>
            <li>✅ 1000 messages gratuits/mois</li>
            <li>⚠️ Nécessite vérification business Meta</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-white/70 text-sm block mb-1">Phone Number ID</label>
            <Input
              placeholder="123456789012345"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-white/70 text-sm block mb-1">Business Account ID</label>
            <Input
              placeholder="987654321098765"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-white/70 text-sm block mb-1">Access Token</label>
            <Input
              type="password"
              placeholder="EAAxxxxxxx..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-500"
            disabled
          >
            Configurer (Bientôt disponible)
          </Button>
          
          <p className="text-white/40 text-xs text-center">
            Obtenez vos credentials sur{" "}
            <a 
              href="https://developers.facebook.com/apps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Meta for Developers
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConfigPage;
