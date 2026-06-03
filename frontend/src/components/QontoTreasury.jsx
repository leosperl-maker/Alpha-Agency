import { useState, useEffect } from "react";
import api from "../lib/api";
import { Landmark, ArrowDownLeft, ArrowUpRight, RefreshCw, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// Dashboard de trésorerie temps réel (Qonto) — KPI + évolution + répartition + comptes + transactions.
const TYPE_LABEL = {
  transfer: "Virement", income: "Encaissement", card: "Carte", direct_debit: "Prélèvement",
  qonto_fee: "Frais Qonto", swift_income: "Virement int.", cheque: "Chèque", recall: "Rejet", pagopa: "Paiement",
};
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtFull = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); } catch { return ""; } };
const monthLabel = (m) => { try { return new Date(m + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "short" }); } catch { return m; } };

const KPI = ({ label, value, accent, icon: Icon }) => (
  <div className="rounded-2xl border border-border bg-card p-4 min-w-0">
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs"><Icon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{label}</span></div>
    <p className={`mt-1 text-xl sm:text-2xl font-bold truncate ${accent}`}>{value}</p>
  </div>
);

const QontoTreasury = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/neo/treasury").then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="rounded-2xl border border-border bg-card h-64 animate-pulse mb-6" />;
  if (!data?.connected) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 mb-6 text-sm text-muted-foreground">
        Trésorerie Qonto non connectée.
      </div>
    );
  }

  const { total_balance = 0, accounts = [], transactions = [], monthly = [], by_type = [] } = data;
  // KPIs = dernier mois avec activité (le mois calendaire courant peut être vide)
  const last = monthly[monthly.length - 1] || { income: 0, expense: 0, month: "" };
  const mIncome = last.income || 0, mExpense = last.expense || 0, net = mIncome - mExpense;
  const mLabel = last.month ? monthLabel(last.month) : "mois";
  const chartData = monthly.map((m) => ({ mois: monthLabel(m.month), Encaissements: m.income, Dépenses: m.expense }));
  const maxType = Math.max(1, ...by_type.map((t) => t.amount));

  return (
    <div className="space-y-4 mb-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Solde total" value={fmt(total_balance)} accent="text-foreground" icon={Wallet} />
        <KPI label={`CA encaissé (${mLabel})`} value={fmt(mIncome)} accent="text-success" icon={TrendingUp} />
        <KPI label={`Dépenses (${mLabel})`} value={fmt(mExpense)} accent="text-danger" icon={TrendingDown} />
        <KPI label={`Net (${mLabel})`} value={fmt(net)} accent={net >= 0 ? "text-success" : "text-danger"} icon={Landmark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Évolution */}
        <div className="rounded-2xl border border-border bg-card p-4 min-w-0">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Évolution <span className="text-[10px] text-muted-foreground font-normal">(hors virements internes)</span></h3>
          {chartData.length ? (
            <div className="w-full h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="neoRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                    <linearGradient id="neoDep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E11D2E" stopOpacity={0.35} /><stop offset="100%" stopColor="#E11D2E" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => fmtFull(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="Encaissements" stroke="#16a34a" fill="url(#neoRev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Dépenses" stroke="#E11D2E" fill="url(#neoDep)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground py-10 text-center">Pas encore de données.</p>}
        </div>

        {/* Répartition des dépenses */}
        <div className="rounded-2xl border border-border bg-card p-4 min-w-0">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-danger" /> Répartition des dépenses</h3>
          {by_type.length ? (
            <div className="space-y-3">
              {by_type.slice(0, 6).map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1 gap-2">
                    <span className="text-foreground truncate">{TYPE_LABEL[t.type] || t.type}</span>
                    <span className="text-muted-foreground flex-shrink-0">{fmtFull(t.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((t.amount / maxType) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground py-10 text-center">Pas encore de dépenses.</p>}
        </div>
      </div>

      {/* Comptes + transactions */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Landmark className="w-5 h-5 text-primary flex-shrink-0" />
            <h3 className="font-bold text-foreground truncate">Trésorerie · Qonto</h3>
          </div>
          <button onClick={load} title="Rafraîchir" className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {accounts.map((a, i) => (
            <div key={i} className="rounded-xl bg-popover border border-border p-2.5 min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{a.name}</p>
              <p className="text-sm font-semibold text-foreground">{fmtFull(a.balance)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Dernières opérations</p>
        <div className="space-y-0.5 max-h-96 overflow-y-auto pr-1">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Aucune opération récente.</p>
          ) : transactions.map((t, i) => {
            const credit = t.side === "credit";
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${credit ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground"}`}>
                  {credit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{t.label || "Opération"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{fmtDate(t.date)} · {TYPE_LABEL[t.type] || t.type || "—"} · {t.account}</p>
                </div>
                <p className={`text-sm font-semibold flex-shrink-0 ${credit ? "text-success" : "text-foreground"}`}>
                  {credit ? "+" : "−"}{fmtFull(t.amount)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QontoTreasury;
