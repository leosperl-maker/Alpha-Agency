import { useState, useEffect } from "react";
import {
  Mail, Trash2, CheckCircle2, AlertTriangle, Loader2, Unplug, Link2
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const MoltBotGmailSection = () => {
  const [gmailStatus, setGmailStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkGmailStatus();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      toast.success("Gmail connecté avec succès !");
      window.history.replaceState({}, '', window.location.pathname);
      checkGmailStatus();
    } else if (params.get('gmail') === 'error') {
      toast.error(`Erreur Gmail: ${params.get('message')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("alpha_token");
    return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const checkGmailStatus = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/status`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGmailStatus(data);
        if (data.connected && !data.needs_reauth) loadStats();
      }
    } catch (error) {
      console.error("Gmail status error:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/auth`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      toast.error("Erreur de connexion Gmail");
    }
  };

  const disconnectGmail = async () => {
    if (!confirm("Déconnecter Gmail ?")) return;
    try {
      await fetch(`${API}/api/moltbot/gmail/disconnect`, { method: "DELETE", headers: getAuthHeaders() });
      setGmailStatus({ connected: false });
      toast.success("Gmail déconnecté");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/stats`, { headers: getAuthHeaders() });
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const cleanInbox = async (mode = "soft") => {
    setIsCleaning(true);
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/clean`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ mode, max_emails: 50 })
      });
      if (res.ok) {
        toast.success("Nettoyage lancé !");
        setTimeout(loadStats, 5000);
      }
    } catch (error) {
      toast.error("Erreur lors du nettoyage");
    } finally {
      setIsCleaning(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-white/50" />
          <span className="text-white/50 text-xs">Gmail...</span>
        </div>
      </div>
    );
  }

  // Not connected
  if (!gmailStatus?.connected) {
    return (
      <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
        <h3 className="text-white font-medium mb-2 flex items-center gap-2 text-xs">
          <Mail className="w-3.5 h-3.5 text-red-400" />
          Gmail
        </h3>
        <p className="text-white/50 text-[10px] mb-2">
          Nettoyage auto des newsletters
        </p>
        <Button
          onClick={connectGmail}
          size="sm"
          className="w-full h-7 text-[10px] bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          data-testid="connect-gmail-btn"
        >
          <Link2 className="w-3 h-3 mr-1" />
          Connecter Gmail
        </Button>
      </div>
    );
  }

  // Needs reauth
  if (gmailStatus?.needs_reauth) {
    return (
      <div className="bg-yellow-500/10 rounded-lg p-2.5 border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-400 text-xs font-medium">Reconnexion requise</span>
        </div>
        <Button onClick={connectGmail} size="sm" className="w-full h-7 text-[10px]">
          Reconnecter
        </Button>
      </div>
    );
  }

  // Connected - Compact sidebar version
  return (
    <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 space-y-2" data-testid="gmail-connected-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Mail className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-white text-[10px] font-medium truncate max-w-[80px]">
                {gmailStatus.email?.split('@')[0]}
              </span>
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
            </div>
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={disconnectGmail}
          className="h-5 w-5 p-0 text-white/40 hover:text-red-400"
        >
          <Unplug className="w-3 h-3" />
        </Button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-1">
          <div className="bg-white/5 rounded p-1 text-center">
            <p className="text-[10px] font-bold text-green-400">{stats.action_breakdown?.clean || 0}</p>
            <p className="text-white/40 text-[7px]">Nettoyés</p>
          </div>
          <div className="bg-white/5 rounded p-1 text-center">
            <p className="text-[10px] font-bold text-blue-400">{stats.action_breakdown?.unsubscribe || 0}</p>
            <p className="text-white/40 text-[7px]">Désabo</p>
          </div>
          <div className="bg-white/5 rounded p-1 text-center">
            <p className="text-[10px] font-bold text-purple-400">{stats.action_breakdown?.send || 0}</p>
            <p className="text-white/40 text-[7px]">Envoyés</p>
          </div>
        </div>
      )}

      {/* Quick Clean Button */}
      <Button
        size="sm"
        onClick={() => cleanInbox("soft")}
        disabled={isCleaning}
        className="w-full h-6 text-[9px] bg-gradient-to-r from-red-600/80 to-orange-600/80 hover:from-red-500 hover:to-orange-500"
      >
        {isCleaning ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Nettoyage...
          </>
        ) : (
          <>
            <Trash2 className="w-3 h-3 mr-1" />
            Nettoyer inbox
          </>
        )}
      </Button>
    </div>
  );
};

export default MoltBotGmailSection;
