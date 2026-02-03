import { useState, useEffect } from "react";
import {
  Mail, Inbox, Trash2, Archive, MailX, RefreshCw, Settings, CheckCircle2,
  AlertTriangle, XCircle, Play, Pause, Filter, ChevronDown, ChevronUp,
  Send, FileText, Clock, Loader2, Unplug, Link2
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const MoltBotGmailSection = () => {
  const [gmailStatus, setGmailStatus] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaningMode, setCleaningMode] = useState("soft");
  const [cleaning, setCleaning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [emailFilter, setEmailFilter] = useState("all");

  useEffect(() => {
    checkGmailStatus();
    
    // Check URL for OAuth callback
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
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const checkGmailStatus = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/status`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setGmailStatus(data);
        
        if (data.connected && !data.needs_reauth) {
          loadEmails();
          loadStats();
        }
      }
    } catch (error) {
      console.error("Gmail status error:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/auth`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      toast.error("Erreur de connexion Gmail");
    }
  };

  const disconnectGmail = async () => {
    if (!confirm("Déconnecter Gmail ? MoltBot ne pourra plus gérer vos emails.")) return;
    
    try {
      await fetch(`${API}/api/moltbot/gmail/disconnect`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      setGmailStatus({ connected: false });
      setEmails([]);
      toast.success("Gmail déconnecté");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const loadEmails = async (query = "") => {
    try {
      let q = query;
      if (emailFilter === "newsletters") q = "has:unsubscribe";
      else if (emailFilter === "promotions") q = "category:promotions";
      else if (emailFilter === "unread") q = "is:unread";
      
      const res = await fetch(`${API}/api/moltbot/gmail/emails?query=${encodeURIComponent(q)}&max_results=30`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.messages || []);
      }
    } catch (error) {
      console.error("Error loading emails:", error);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/stats`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/logs?limit=50`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  const cleanInbox = async () => {
    if (!confirm(`Lancer le nettoyage en mode "${cleaningMode}" ? Cette action labellise et archive les newsletters.`)) return;
    
    setCleaning(true);
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/clean`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ mode: cleaningMode, max_emails: 50 })
      });
      
      if (res.ok) {
        toast.success("Nettoyage lancé ! Cela peut prendre quelques minutes.");
        // Reload after a delay
        setTimeout(() => {
          loadEmails();
          loadStats();
        }, 5000);
      }
    } catch (error) {
      toast.error("Erreur lors du nettoyage");
    } finally {
      setCleaning(false);
    }
  };

  const unsubscribeSelected = async () => {
    const newsletterEmails = emails.filter(e => e.has_unsubscribe && !e.is_whitelisted);
    if (newsletterEmails.length === 0) {
      toast.info("Aucune newsletter à désabonner");
      return;
    }
    
    if (!confirm(`Désabonner de ${newsletterEmails.length} newsletters ?`)) return;
    
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/unsubscribe`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message_ids: newsletterEmails.map(e => e.id) })
      });
      
      if (res.ok) {
        toast.success("Désabonnement lancé !");
      }
    } catch (error) {
      toast.error("Erreur lors du désabonnement");
    }
  };

  const viewEmail = async (messageId) => {
    try {
      const res = await fetch(`${API}/api/moltbot/gmail/emails/${messageId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedEmail(data);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement de l'email");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // Not connected state
  if (!gmailStatus?.connected) {
    return (
      <div className="glass-panel rounded-xl p-6" data-testid="gmail-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Gmail</h3>
            <p className="text-white/60 text-sm">Gérer intelligemment votre boîte mail</p>
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
          <p className="text-white/70 text-sm mb-3">
            Connectez Gmail pour permettre à MoltBot de :
          </p>
          <ul className="text-white/60 text-sm space-y-1 mb-4">
            <li>• Nettoyer automatiquement les newsletters</li>
            <li>• Se désabonner des emails indésirables</li>
            <li>• Protéger vos emails importants</li>
            <li>• Rédiger des réponses automatiques</li>
          </ul>
        </div>
        
        <Button
          onClick={connectGmail}
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          data-testid="connect-gmail-btn"
        >
          <Link2 className="w-4 h-4 mr-2" />
          Connecter Gmail
        </Button>
      </div>
    );
  }

  // Need reauth
  if (gmailStatus?.needs_reauth) {
    return (
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
          <div>
            <h3 className="text-lg font-semibold text-white">Reconnexion requise</h3>
            <p className="text-white/60 text-sm">Votre session Gmail a expiré</p>
          </div>
        </div>
        <Button onClick={connectGmail} className="w-full">
          Reconnecter Gmail
        </Button>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-4" data-testid="gmail-connected-section">
      {/* Header with status */}
      <div className="glass-panel rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium">{gmailStatus.email}</h3>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-white/50 text-xs">
                {gmailStatus.messages_total?.toLocaleString()} emails • {gmailStatus.threads_total?.toLocaleString()} threads
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadEmails()}
              className="border-white/20"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={disconnectGmail}
            >
              <Unplug className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-panel rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{stats.total_actions}</p>
            <p className="text-white/50 text-xs">Actions totales</p>
          </div>
          <div className="glass-panel rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.action_breakdown?.clean || 0}</p>
            <p className="text-white/50 text-xs">Emails nettoyés</p>
          </div>
          <div className="glass-panel rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.action_breakdown?.unsubscribe || 0}</p>
            <p className="text-white/50 text-xs">Désabonnements</p>
          </div>
          <div className="glass-panel rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.action_breakdown?.send || 0}</p>
            <p className="text-white/50 text-xs">Emails envoyés</p>
          </div>
        </div>
      )}

      {/* Cleaning Controls */}
      <div className="glass-panel rounded-xl p-4">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          Nettoyage intelligent
        </h4>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-white/60 text-xs block mb-1">Mode de nettoyage</label>
            <select
              value={cleaningMode}
              onChange={(e) => setCleaningMode(e.target.value)}
              className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
              data-testid="cleaning-mode-select"
            >
              <option value="soft" className="bg-gray-900">🛡️ Soft - Label + Archive (recommandé)</option>
              <option value="medium" className="bg-gray-900">⚠️ Medium - Suppression différée 30j</option>
              <option value="hard" className="bg-gray-900">🔴 Hard - Suppression immédiate</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={cleanInbox}
              disabled={cleaning}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              data-testid="clean-inbox-btn"
            >
              {cleaning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Nettoyer
            </Button>
            
            <Button
              onClick={unsubscribeSelected}
              variant="outline"
              className="border-white/20"
              data-testid="unsubscribe-btn"
            >
              <MailX className="w-4 h-4 mr-2" />
              Désabonner
            </Button>
          </div>
        </div>
        
        <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-300 text-xs">
            ⚠️ Mode Soft recommandé : archive les newsletters sans supprimer. Vos emails importants (banques, clients, factures) sont protégés.
          </p>
        </div>
      </div>

      {/* Email Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "all", label: "Tous", icon: Inbox },
          { id: "newsletters", label: "Newsletters", icon: FileText },
          { id: "promotions", label: "Promos", icon: Mail },
          { id: "unread", label: "Non lus", icon: Clock }
        ].map(filter => (
          <Button
            key={filter.id}
            size="sm"
            variant={emailFilter === filter.id ? "default" : "outline"}
            onClick={() => { setEmailFilter(filter.id); loadEmails(); }}
            className={emailFilter === filter.id ? "" : "border-white/20 text-white/70"}
          >
            <filter.icon className="w-3 h-3 mr-1" />
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Email List */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          {emails.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">Aucun email trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => viewEmail(email.id)}
                  className="p-3 hover:bg-white/5 cursor-pointer transition-colors"
                  data-testid={`email-row-${email.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {email.is_whitelisted ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" title="Protégé" />
                      ) : email.is_newsletter ? (
                        <MailX className="w-4 h-4 text-orange-400" title="Newsletter" />
                      ) : (
                        <Mail className="w-4 h-4 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-medium truncate">{email.from_address}</p>
                        <span className="text-white/40 text-xs flex-shrink-0">
                          {new Date(email.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm truncate">{email.subject}</p>
                      <p className="text-white/40 text-xs truncate">{email.snippet}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {email.has_unsubscribe && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                            Désabonnable
                          </span>
                        )}
                        {email.is_whitelisted && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
                            Protégé
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logs Toggle */}
      <Button
        variant="ghost"
        onClick={() => { setShowLogs(!showLogs); if (!showLogs) loadLogs(); }}
        className="w-full text-white/60 hover:text-white"
      >
        {showLogs ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
        Journal des actions ({logs.length})
      </Button>

      {/* Logs Section */}
      {showLogs && (
        <div className="glass-panel rounded-xl p-4 max-h-[300px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-white/50 text-center py-4">Aucune action enregistrée</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-white/5">
                  <div className={`w-2 h-2 rounded-full ${
                    log.action === 'clean' ? 'bg-green-400' :
                    log.action === 'unsubscribe' ? 'bg-blue-400' :
                    log.action === 'send' ? 'bg-purple-400' : 'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm capitalize">{log.action}</p>
                    <p className="text-white/50 text-xs truncate">
                      {log.details?.from || log.details?.to || log.message_id}
                    </p>
                  </div>
                  <span className="text-white/40 text-xs">
                    {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedEmail.subject}</h3>
                <p className="text-white/60 text-sm">{selectedEmail.from_address}</p>
                <p className="text-white/40 text-xs">{selectedEmail.date}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedEmail(null)}
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex gap-2 mb-4">
              {selectedEmail.is_whitelisted && (
                <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-300">
                  ✅ Protégé (liste blanche)
                </span>
              )}
              {selectedEmail.is_newsletter && (
                <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300">
                  📰 Newsletter détectée
                </span>
              )}
              {selectedEmail.unsubscribe_url && (
                <a
                  href={selectedEmail.unsubscribe_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                >
                  🔗 Se désabonner
                </a>
              )}
            </div>
            
            <div className="p-4 rounded-lg bg-white/5 text-white/80 text-sm whitespace-pre-wrap">
              {selectedEmail.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoltBotGmailSection;
