import { useState, useEffect } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  FileText, Receipt, Clock, Flame, TrendingDown, Calendar,
  ChevronRight, ShieldCheck, Send, ArrowRight, Users, Wallet, Sparkles, Radar, Kanban, Activity
} from "lucide-react";
import { dashboardAPI, tasksAPI, budgetAPI, opportunitiesAPI } from "../../lib/api";
import api from "../../lib/api";
import AssistantOrb from "../../components/AssistantOrb";

const TONE = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-primary",
};

const SUGGESTIONS = [
  "Relancer les impayés",
  "Qui je dois relancer ?",
  "Écris un post Instagram",
  "Crée un devis",
];

const QUICK_LINKS = [
  { label: "Contacts", icon: Users, to: "/admin/contacts", tone: "bg-info-soft text-info" },
  { label: "Devis", icon: FileText, to: "/admin/facturation?tab=devis", tone: "bg-brand-soft text-primary" },
  { label: "Factures", icon: Receipt, to: "/admin/facturation?tab=facture", tone: "bg-success-soft text-success" },
  { label: "Agenda", icon: Calendar, to: "/admin/agenda", tone: "bg-warning-soft text-warning" },
  { label: "Budget", icon: Wallet, to: "/admin/budget", tone: "bg-info-soft text-info" },
  { label: "Néo", icon: Sparkles, to: "/admin/neo", tone: "bg-brand-soft text-primary" },
];

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { openAssistant } = useOutletContext() || {};

  const [stats, setStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [hotLeads, setHotLeads] = useState([]);
  const [churnAlerts, setChurnAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [checkin, setCheckin] = useState(null); // check-in Néo (message + question + score /100)
  const [signals, setSignals] = useState(null); // radar Néo (null = pas encore chargé / API KO)
  const [pipeline, setPipeline] = useState(null); // {total, weighted, open}

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir");

    const fetchAllData = async () => {
      try {
        const [statsRes, taskStatsRes, budgetRes] = await Promise.all([
          dashboardAPI.getStats(),
          tasksAPI.getStats(),
          budgetAPI.getSummary(),
        ]);
        setStats(statsRes.data);
        setTaskStats(taskStatsRes.data);
        setBudgetSummary(budgetRes.data);

        try {
          const eventsRes = await api.get("/agenda/events", { params: { start_date: new Date().toISOString().split("T")[0], limit: 3 } });
          setUpcomingEvents(eventsRes.data?.slice(0, 3) || []);
        } catch (e) { /* optional */ }
        try {
          const leadsRes = await api.get("/analytics/lead-scores", { params: { limit: 5 } });
          setHotLeads((leadsRes.data?.leads || []).filter(l => l.score >= 60).slice(0, 3));
        } catch (e) { /* optional */ }
        try {
          const ci = await api.get("/neo/checkin");
          setCheckin(ci.data);
        } catch (e) { /* optional */ }
        try {
          const churnRes = await api.get("/analytics/churn-alerts", { params: { limit: 5 } });
          setChurnAlerts((churnRes.data?.alerts || []).slice(0, 3));
        } catch (e) { /* optional */ }
        try {
          const sigRes = await api.get("/neo/signals");
          if (Array.isArray(sigRes.data?.signals)) setSignals(sigRes.data.signals);
        } catch (e) { /* optional : repli sur la liste historique */ }
        try {
          const oppsRes = await opportunitiesAPI.getAll();
          const opps = (Array.isArray(oppsRes.data) ? oppsRes.data : []).filter(o => !["gagne", "perdu"].includes(o.stage));
          setPipeline({
            open: opps.length,
            total: opps.reduce((s, o) => s + (o.amount || 0), 0),
            weighted: opps.reduce((s, o) => s + (o.amount || 0) * ((o.probability || 0) / 100), 0),
          });
        } catch (e) { /* optional */ }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const formatCurrency = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M€`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k€`;
    return `${amount?.toFixed(0) || 0}€`;
  };

  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // ---- Build the prioritized action list (danger → warning → info) ----
  // Source primaire : le radar de Néo (moteur de signaux, mêmes règles que le QG).
  // Repli : la liste historique dérivée des stats si l'API signaux ne répond pas.
  const SIGNAL_META = {
    invoice_overdue: { icon: FileText, tone: "danger" },
    deal_stagnant: { icon: Activity, tone: "warning" },
    quote_pending: { icon: Receipt, tone: "info" },
    task_overdue: { icon: Clock, tone: "warning" },
    hot_lead: { icon: Flame, tone: "brand" },
  };
  const treatWithNeo = (prompt) => {
    try { sessionStorage.setItem("neo_prompt_pending", prompt); } catch (e) { /* noop */ }
    navigate("/admin/neo");
  };
  const actions = [];
  const overdueInv = stats?.invoices?.overdue || 0;
  const pendingQuotes = stats?.quotes?.pending || 0;
  if (signals) {
    signals.slice(0, 6).forEach((s) => {
      const meta = SIGNAL_META[s.type] || { icon: Radar, tone: s.severity === "high" ? "danger" : "info" };
      actions.push({
        id: s.id, icon: meta.icon, tone: s.severity === "high" ? (meta.tone === "info" ? "warning" : meta.tone) : meta.tone,
        label: s.title, sub: `${s.message} · Traiter avec Néo`,
        onClick: () => treatWithNeo(s.neo_prompt),
      });
    });
  } else {
    if (overdueInv > 0) actions.push({ id: "inv", icon: FileText, tone: "danger", label: `${overdueInv} facture${overdueInv > 1 ? "s" : ""} en retard à relancer`, sub: "Encaisse plus vite", link: "/admin/facturation" });
    hotLeads.forEach((l, i) => actions.push({ id: `lead-${i}`, icon: Flame, tone: "brand", label: `Rappeler ${l.contact_name || "un lead chaud"}`, sub: `Lead chaud · score ${l.score}`, link: l.contact_id ? `/admin/contacts/${l.contact_id}` : "/admin/contacts" }));
    if (pendingQuotes > 0) actions.push({ id: "quotes", icon: Receipt, tone: "info", label: `${pendingQuotes} devis en attente de réponse`, sub: "Relancer le client", link: "/admin/facturation" });
  }
  churnAlerts.forEach((c, i) => actions.push({ id: `churn-${i}`, icon: TrendingDown, tone: c.risk_level === "critical" ? "danger" : "warning", label: `Client à risque : ${c.contact_name || "Client"}`, sub: c.warning_signs?.[0] || `${c.days_since_contact || "?"}j sans contact`, link: c.contact_id ? `/admin/contacts/${c.contact_id}` : "/admin/contacts" }));
  upcomingEvents.forEach((e, i) => actions.push({ id: `evt-${i}`, icon: Calendar, tone: "info", label: e.title || "Rendez-vous", sub: `${e.start_time || ""}${e.location ? ` · ${e.location}` : ""}`.trim() || "Aujourd'hui", link: "/admin/agenda" }));

  const shownActions = actions.slice(0, 7);

  // ---- AI-style one-line brief ----
  const briefBits = [];
  if (overdueInv > 0) briefBits.push(`${overdueInv} facture${overdueInv > 1 ? "s" : ""} à relancer`);
  if (hotLeads.length > 0) briefBits.push(`${hotLeads.length} lead${hotLeads.length > 1 ? "s" : ""} chaud${hotLeads.length > 1 ? "s" : ""}`);
  if (pendingQuotes > 0) briefBits.push(`${pendingQuotes} devis en attente`);
  const briefText = briefBits.length
    ? `Aujourd'hui : ${briefBits.slice(0, 2).join(", ")}${briefBits.length > 2 ? `, +${briefBits.length - 2}` : ""}. Je m'en occupe ?`
    : "Rien d'urgent aujourd'hui. Demande-moi ce que tu veux, ou avance sur le fond.";

  const metrics = [
    { label: "CA encaissé", value: formatCurrency(stats?.invoices?.total_paid || 0) },
    { label: "MRR", value: formatCurrency(stats?.mrr || 0) },
    { label: "Contacts", value: `${stats?.contacts?.total || 0}` },
    { label: "Conversion", value: `${stats?.kpis?.conversion_rate || 0}%` },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="h-52 bg-card border border-border animate-pulse rounded-3xl" />
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card border border-border animate-pulse rounded-2xl" />)}
        </div>
        <div className="h-16 bg-card border border-border animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div data-testid="dashboard-overview" className="max-w-4xl mx-auto space-y-5">

      {/* ===== Assistant panel (assistant-first) ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full blur-3xl" style={{ background: "var(--brand-soft)" }} aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <AssistantOrb size={44} pulse />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground capitalize leading-tight">{dateLabel}</p>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">{greeting}, Léo</h1>
            </div>
            {checkin?.score != null && (
              <div className="flex-shrink-0 text-right" title={(checkin.priorities || []).join(" · ") || "Tout est sous contrôle"}>
                <div className={`text-2xl sm:text-3xl font-bold leading-none ${checkin.score >= 75 ? "text-success" : checkin.score >= 50 ? "text-warning" : "text-danger"}`}>
                  {checkin.score}<span className="text-sm text-muted-foreground font-medium">/100</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Santé · {checkin.label}</p>
              </div>
            )}
          </div>

          <p className="mt-3.5 text-foreground/85 text-sm sm:text-base leading-relaxed max-w-2xl">{checkin?.message || briefText}</p>
          {checkin?.question && (
            <p className="mt-1.5 text-sm text-primary font-medium max-w-2xl">{checkin.question}</p>
          )}

          {/* Conversation input → assistant */}
          <button
            onClick={openAssistant}
            className="mt-4 w-full flex items-center gap-3 h-12 pl-4 pr-2 rounded-2xl bg-background border border-border hover:border-primary/40 transition-all text-left group"
          >
            <span className="text-sm text-muted-foreground flex-1 truncate">Demande-moi, ou dis-moi quoi faire…</span>
            <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center group-hover:brightness-110 transition-all">
              <Send className="w-4 h-4" />
            </span>
          </button>

          {/* Suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={openAssistant}
                className="px-3 py-1.5 rounded-full bg-secondary hover:bg-muted border border-transparent hover:border-border text-foreground/80 hover:text-foreground text-xs transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Accès rapides (outils) ===== */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {QUICK_LINKS.map(q => (
          <button key={q.label} onClick={() => navigate(q.to)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-elev transition-all">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${q.tone}`}><q.icon className="w-5 h-5" /></span>
            <span className="text-[11px] font-medium text-foreground/80">{q.label}</span>
          </button>
        ))}
      </div>

      {/* ===== À faire maintenant ===== */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> À faire maintenant
          </h2>
          {actions.length > 0 && <span className="text-xs text-muted-foreground">{actions.length} priorité{actions.length > 1 ? "s" : ""}</span>}
        </div>

        {actions.length === 0 ? (
          <div className="flex items-center gap-3 p-5 rounded-2xl border border-border bg-card">
            <div className="w-11 h-11 rounded-xl bg-success-soft text-success flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-foreground font-medium text-sm">Tout est sous contrôle.</p>
              <p className="text-muted-foreground text-xs">Aucune relance, tâche en retard ou alerte. Demande à l'assistant ce que tu veux avancer.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shownActions.map(a => (
              <button key={a.id} onClick={() => (a.onClick ? a.onClick() : navigate(a.link))}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-elev transition-all text-left">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TONE[a.tone]}`}>
                  <a.icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.label}</p>
                  {a.sub && <p className="text-xs text-muted-foreground truncate">{a.sub}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
            {actions.length > shownActions.length && (
              <p className="text-center text-xs text-muted-foreground pt-1">+{actions.length - shownActions.length} autre{actions.length - shownActions.length > 1 ? "s" : ""}</p>
            )}
          </div>
        )}
      </section>

      {/* ===== KPIs (cartes) ===== */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Chiffres clés
          </h2>
          <Link to="/admin/budget" className="text-xs text-primary hover:underline flex items-center gap-0.5">
            Budget <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {metrics.map(m => (
            <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg sm:text-xl font-bold text-foreground font-mono mt-1">{m.value}</p>
            </div>
          ))}
          {budgetSummary && (
            <div className="rounded-2xl border border-border bg-card p-4 col-span-2 lg:col-span-1">
              <p className="text-xs text-muted-foreground">Solde du mois</p>
              <p className={`text-lg sm:text-xl font-bold font-mono mt-1 ${(budgetSummary?.balance || 0) >= 0 ? "text-success" : "text-warning"}`}>{formatCurrency(budgetSummary?.balance || 0)}</p>
            </div>
          )}
          {pipeline && pipeline.open > 0 && (
            <button onClick={() => navigate("/admin/pipeline")}
              className="rounded-2xl border border-border bg-card p-4 col-span-2 lg:col-span-1 text-left hover:border-primary/30 hover:shadow-elev transition-all">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Kanban className="w-3 h-3" /> Pipeline pondéré</p>
              <p className="text-lg sm:text-xl font-bold text-foreground font-mono mt-1">{formatCurrency(pipeline.weighted)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{pipeline.open} deal{pipeline.open > 1 ? "s" : ""} · {formatCurrency(pipeline.total)} au total</p>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
