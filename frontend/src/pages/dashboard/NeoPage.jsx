import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, AlertTriangle, FileText, Flame, Activity, Radar, Sparkles } from "lucide-react";
import AssistantChat from "../../components/AssistantChat";
import AssistantOrb from "../../components/AssistantOrb";
import api from "../../lib/api";

const fmtEur = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} €`;

/** Envoie un prompt à Néo dans le chat déjà monté sur cette page (action 1 clic). */
const askNeo = (prompt) => window.dispatchEvent(new CustomEvent("neo:prompt", { detail: { prompt } }));

const SIGNAL_ICON = {
  invoice_overdue: AlertTriangle, deal_stagnant: Activity, quote_pending: FileText,
  task_overdue: AlertTriangle, hot_lead: Flame,
};

/**
 * Page Néo « plein écran » (QG de Néo) — ouverte au clic sur la bulle rouge.
 * À gauche : le chat Néo en grand (AssistantChat variant="page", toute sa logique réutilisée).
 * À droite : les infos de Néo en direct (santé, trésorerie, priorités du jour).
 */
const NeoPage = () => {
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState(null);
  const [health, setHealth] = useState(null);
  const [signals, setSignals] = useState(null); // null = chargement, [] = rien à signaler

  useEffect(() => {
    let alive = true;
    api.get("/neo/checkin").then((r) => { if (alive) setCheckin(r.data); }).catch(() => {});
    api.get("/neo/health-score").then((r) => { if (alive) setHealth(r.data); }).catch(() => {});
    api.get("/neo/signals").then((r) => { if (alive) setSignals(r.data?.signals || []); }).catch(() => { if (alive) setSignals([]); });
    return () => { alive = false; };
  }, []);

  const score = health?.score ?? checkin?.score;
  const label = health?.label ?? checkin?.label;
  const scoreColor = score == null ? "text-muted-foreground"
    : score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
  const priorities = checkin?.priorities || [];

  return (
    <div className="flex gap-4 h-[calc(100vh-7.5rem)] min-h-[460px]">
      {/* Chat Néo plein écran */}
      <div className="flex-1 min-w-0 rounded-2xl border border-border overflow-hidden shadow-elev">
        <AssistantChat open variant="page" onOpenChange={(v) => { if (!v) navigate("/admin"); }} />
      </div>

      {/* QG de Néo : ses infos en direct (desktop) */}
      <aside className="hidden lg:flex flex-col w-80 shrink-0 gap-3 overflow-y-auto pr-0.5">
        {/* Mot de Néo (le QG prend vie) */}
        {checkin?.message && (
          <div className="rounded-2xl border border-primary/20 bg-brand-soft p-4">
            <div className="flex items-center gap-2 mb-1.5"><AssistantOrb size={18} /><span className="text-xs font-semibold text-primary">Néo</span></div>
            <p className="text-sm text-foreground/90 leading-relaxed">{checkin.message}</p>
          </div>
        )}
        {/* Radar de Néo : signaux détectés, action en 1 clic */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Radar className="w-4 h-4 text-primary" /> Radar
            </div>
            {signals?.length > 0 && (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{signals.length}</span>
            )}
          </div>
          {signals === null ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-secondary/60" />)}
            </div>
          ) : signals.length === 0 ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-success" /> Rien sur le radar. Tout est sous contrôle.
            </p>
          ) : (
            <ul className="space-y-2">
              {signals.slice(0, 6).map((s) => {
                const Icon = SIGNAL_ICON[s.type] || AlertTriangle;
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${s.severity === "high" ? "text-danger" : "text-warning"}`} />
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground/85" title={s.message}>{s.title}</span>
                    <button
                      onClick={() => askNeo(s.neo_prompt)}
                      className="flex-shrink-0 rounded-md bg-brand-soft px-2 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      Traiter
                    </button>
                  </li>
                );
              })}
              {signals.length > 6 && (
                <li>
                  <button
                    onClick={() => askNeo("Passe en revue tous les signaux du radar (impayés, deals qui stagnent, devis sans réponse, tâches en retard, leads chauds) et propose-moi un plan d'action priorisé.")}
                    className="text-[11px] text-primary hover:underline"
                  >
                    + {signals.length - 6} autres — demander le plan d'action complet
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Santé de l'agence */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="w-4 h-4 text-primary" /> Santé de l'agence
            </div>
            <span className={`text-2xl font-bold ${scoreColor}`}>
              {score ?? "—"}<span className="text-xs text-muted-foreground font-medium">/100</span>
            </span>
          </div>
          {label && <p className="text-xs text-muted-foreground mt-1 capitalize">{label}</p>}
        </div>

        {/* Trésorerie du mois */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="w-4 h-4 text-primary" /> Trésorerie (ce mois)
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Solde</span>
            <span className={`font-semibold ${(health?.balance ?? 0) >= 0 ? "text-success" : "text-danger"}`}>{fmtEur(health?.balance)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Impayés</span>
            <span className="font-medium text-foreground">{health?.overdue_count || 0} · {fmtEur(health?.overdue_total)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Devis en attente</span>
            <span className="font-medium text-foreground">{health?.pending_devis || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Leads chauds</span>
            <span className="font-medium text-foreground">{health?.hot_leads || 0}</span>
          </div>
        </div>

        {/* Priorités du jour */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <AssistantOrb size={18} /> Priorités du jour
          </div>
          {priorities.length ? (
            <ul className="space-y-1.5">
              {priorities.map((p, i) => (
                <li key={i} className="text-xs text-foreground/85 flex gap-2"><span className="text-primary">•</span>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{checkin?.message || "Rien d'urgent. Avance sur le fond."}</p>
          )}
        </div>
      </aside>
    </div>
  );
};

export default NeoPage;
