import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, AlertTriangle, FileText, Flame, Activity, Radar, Sparkles, Brain, Pencil, Trash2, X, Check } from "lucide-react";
import AssistantChat from "../../components/AssistantChat";
import AssistantOrb from "../../components/AssistantOrb";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast } from "sonner";
import api from "../../lib/api";

const fmtEur = (n) => `${Math.round(n || 0).toLocaleString("fr-FR")} €`;

/** Envoie un prompt à Néo dans le chat déjà monté sur cette page (action 1 clic). */
const askNeo = (prompt) => window.dispatchEvent(new CustomEvent("neo:prompt", { detail: { prompt } }));

const SIGNAL_ICON = {
  invoice_overdue: AlertTriangle, deal_stagnant: Activity, quote_pending: FileText,
  task_overdue: AlertTriangle, hot_lead: Flame,
};

/** Panneau « Ce que Néo sait » : consulter, corriger, faire oublier (exigence Jarvis :
 *  la mémoire de l'IA n'est jamais une boîte noire). */
const MemoryDialog = ({ open, onOpenChange }) => {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null); // {id, content}

  const load = useCallback(() => {
    api.get("/neo/memory", { params: filter === "all" ? {} : { type: filter } })
      .then((r) => setData(r.data))
      .catch(() => toast.error("Impossible de charger la mémoire de Néo"));
  }, [filter]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const saveEdit = async () => {
    try {
      await api.put(`/neo/memory/${editing.id}`, { content: editing.content });
      toast.success("Souvenir corrigé");
      setEditing(null);
      load();
    } catch { toast.error("Correction refusée"); }
  };

  const forget = async (item) => {
    if (!window.confirm("Faire oublier ce souvenir à Néo ?")) return;
    try {
      await api.delete(`/neo/memory/${item.id}`);
      toast.success("Souvenir supprimé");
      load();
    } catch { toast.error("Suppression impossible"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Ce que Néo sait</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilter("all")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Tout {data ? `(${data.count})` : ""}
          </button>
          {(data?.types || []).map((t) => (
            <button key={t.key} onClick={() => setFilter(t.key)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${filter === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {data === null ? (
            [...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary/60" />)
          ) : data.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Rien ici pour l'instant.</p>
          ) : data.items.map((item) => (
            <div key={item.id} className="group rounded-xl border border-border bg-card p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {(data.types.find((t) => t.key === item.type) || {}).label || item.type}
                </span>
                {item.created_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
                <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setEditing({ id: item.id, content: item.content })}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Corriger">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => forget(item)}
                          className="rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Oublier">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              {editing?.id === item.id ? (
                <div className="space-y-2">
                  <textarea value={editing.content} rows={3} autoFocus
                            onChange={(e) => setEditing((s) => ({ ...s, content: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground" />
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setEditing(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Annuler">
                      <X className="h-4 w-4" />
                    </button>
                    <button onClick={saveEdit} className="rounded-md bg-primary p-1.5 text-primary-foreground" aria-label="Enregistrer">
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{item.content}</p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
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
  const [memoryOpen, setMemoryOpen] = useState(false);

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

        {/* Mémoire de Néo (consultable / corrigeable) */}
        <button
          onClick={() => setMemoryOpen(true)}
          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
        >
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Ce que Néo sait</span>
          <span className="ml-auto text-xs text-muted-foreground">consulter / corriger</span>
        </button>
        <MemoryDialog open={memoryOpen} onOpenChange={setMemoryOpen} />

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
