import { useState, useEffect } from "react";
import { 
  CheckSquare, Calendar, DollarSign, Users, Bell, 
  ChevronRight, RefreshCw, Clock, AlertCircle, TrendingUp,
  Plus, Check, X
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const WidgetPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const headers = { 
        "Authorization": `Bearer ${token}`,
        "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
      };

      // Load briefing data
      const res = await fetch(`${API}/api/moltbot/briefing`, { headers });
      if (res.ok) {
        const briefing = await res.json();
        
        // Load stats
        const statsRes = await fetch(`${API}/api/moltbot/stats?period=month`, { headers });
        const stats = statsRes.ok ? await statsRes.json() : null;

        setData({ briefing, stats });
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error loading widget data:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId) => {
    try {
      const token = localStorage.getItem("alpha_token");
      await fetch(`${API}/api/moltbot/tasks/${taskId}/complete`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "X-MoltBot-Secret": "moltbot-alpha-secret-2024"
        }
      });
      loadData(); // Refresh
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const { briefing, stats } = data || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Alpha CRM</h1>
          <p className="text-white/60 text-sm">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button 
          onClick={loadData}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <RefreshCw className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-white/60 text-xs">CA du mois</span>
          </div>
          <p className="text-white text-xl font-bold">
            {stats?.revenue?.current?.toLocaleString('fr-FR') || 0}€
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white/60 text-xs">Nouveaux leads</span>
          </div>
          <p className="text-white text-xl font-bold">
            {stats?.contacts?.new || 0}
          </p>
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-violet-400" />
            <h2 className="text-white font-semibold">Tâches du jour</h2>
          </div>
          <span className="text-white/50 text-sm">{briefing?.tasks?.count || 0}</span>
        </div>
        
        <div className="space-y-2">
          {briefing?.tasks?.items?.length > 0 ? (
            briefing.tasks.items.slice(0, 5).map((task, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <button
                  onClick={() => completeTask(task.id)}
                  className="w-6 h-6 rounded-full border-2 border-violet-400 flex items-center justify-center hover:bg-violet-400/20 transition-colors"
                >
                  {task.status === "done" && <Check className="w-4 h-4 text-violet-400" />}
                </button>
                <div className="flex-1">
                  <p className={`text-white text-sm ${task.status === "done" ? "line-through opacity-50" : ""}`}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  task.priority === "urgent" ? "bg-red-400" :
                  task.priority === "high" ? "bg-orange-400" : "bg-green-400"
                }`} />
              </div>
            ))
          ) : (
            <p className="text-white/50 text-sm text-center py-4">
              ✅ Aucune tâche pour aujourd'hui
            </p>
          )}
        </div>

        <a 
          href="/admin/tasks"
          className="flex items-center justify-center gap-2 mt-3 py-2 rounded-xl bg-white/5 text-white/70 text-sm hover:bg-white/10 transition-colors"
        >
          Voir toutes les tâches
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>

      {/* Today's Appointments */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold">RDV du jour</h2>
          </div>
          <span className="text-white/50 text-sm">{briefing?.appointments?.count || 0}</span>
        </div>

        <div className="space-y-2">
          {briefing?.appointments?.items?.length > 0 ? (
            briefing.appointments.items.map((rdv, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex flex-col items-center justify-center">
                  <span className="text-blue-400 text-xs font-bold">
                    {new Date(rdv.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{rdv.title}</p>
                  {rdv.location && (
                    <p className="text-white/40 text-xs mt-0.5">{rdv.location}</p>
                  )}
                </div>
                {rdv.visio && (
                  <a 
                    href={rdv.visio_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium"
                  >
                    Rejoindre
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="text-white/50 text-sm text-center py-4">
              📅 Aucun RDV aujourd'hui
            </p>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(briefing?.alerts?.overdue_invoices?.length > 0 || briefing?.alerts?.new_leads > 0) && (
        <div className="bg-amber-500/20 backdrop-blur-sm rounded-2xl p-4 border border-amber-500/30 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold">Alertes</h2>
          </div>
          
          {briefing?.alerts?.new_leads > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 mb-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm">
                {briefing.alerts.new_leads} nouveau(x) lead(s)
              </span>
            </div>
          )}
          
          {briefing?.alerts?.overdue_invoices?.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
              <DollarSign className="w-4 h-4 text-red-400" />
              <span className="text-white text-sm">
                {briefing.alerts.overdue_invoices.length} facture(s) en retard
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <a href="/admin/contacts" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/10 border border-white/10">
          <Users className="w-5 h-5 text-blue-400" />
          <span className="text-white/70 text-xs">Contacts</span>
        </a>
        <a href="/admin/tasks" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/10 border border-white/10">
          <CheckSquare className="w-5 h-5 text-violet-400" />
          <span className="text-white/70 text-xs">Tâches</span>
        </a>
        <a href="/admin/invoices" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/10 border border-white/10">
          <DollarSign className="w-5 h-5 text-green-400" />
          <span className="text-white/70 text-xs">Devis</span>
        </a>
        <a href="/admin/moltbot" className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/10 border border-white/10">
          <Bell className="w-5 h-5 text-amber-400" />
          <span className="text-white/70 text-xs">MoltBot</span>
        </a>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <p className="text-center text-white/30 text-xs">
          Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* Install PWA hint */}
      <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-white/50 text-xs text-center">
          💡 Ajoutez cette page à l'écran d'accueil pour un accès rapide
        </p>
      </div>
    </div>
  );
};

export default WidgetPage;
