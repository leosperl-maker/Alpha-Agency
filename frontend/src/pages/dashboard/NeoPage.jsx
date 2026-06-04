import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, AlertTriangle, FileText, Flame, Activity } from "lucide-react";
import AssistantChat from "../../components/AssistantChat";
import AssistantOrb from "../../components/AssistantOrb";
import api from "../../lib/api";

const fmtEur = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} €`;

/**
 * Page Néo « plein écran » (QG de Néo) — ouverte au clic sur la bulle rouge.
 * À gauche : le chat Néo en grand (AssistantChat variant="page", toute sa logique réutilisée).
 * À droite : les infos de Néo en direct (santé, trésorerie, priorités du jour).
 */
const NeoPage = () => {
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/neo/checkin").then((r) => { if (alive) setCheckin(r.data); }).catch(() => {});
    api.get("/neo/health-score").then((r) => { if (alive) setHealth(r.data); }).catch(() => {});
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
