import { useState, useEffect } from "react";
import api from "../lib/api";
import { Landmark, ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";

// Tableau de trésorerie temps réel (Qonto) — soldes par compte + transactions/virements.
const TYPE_LABEL = {
  transfer: "Virement", income: "Encaissement", card: "Carte", direct_debit: "Prélèvement",
  qonto_fee: "Frais Qonto", swift_income: "Virement int.", cheque: "Chèque", recall: "Rejet",
};
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
  catch { return ""; }
};

const QontoTreasury = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/neo/treasury")
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card h-32 animate-pulse mb-4 sm:mb-6" />;
  }
  if (!data?.connected) return null; // Qonto non connecté -> on n'affiche rien

  const { total_balance, accounts = [], transactions = [] } = data;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 mb-4 sm:mb-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="w-5 h-5 text-primary flex-shrink-0" />
          <h2 className="font-bold text-foreground truncate">Trésorerie · Qonto</h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{fmt(total_balance)}</p>
            <p className="text-[10px] text-muted-foreground">solde total · {accounts.length} comptes</p>
          </div>
          <button onClick={load} title="Rafraîchir" className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Soldes par compte */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {accounts.map((a, i) => (
          <div key={i} className="rounded-xl bg-popover border border-border p-2.5 min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">{a.name}</p>
            <p className="text-sm font-semibold text-foreground">{fmt(a.balance)}</p>
          </div>
        ))}
      </div>

      {/* Dernières opérations */}
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Dernières opérations</p>
      <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
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
                <p className="text-[11px] text-muted-foreground truncate">
                  {fmtDate(t.date)} · {TYPE_LABEL[t.type] || t.type || "—"} · {t.account}
                </p>
              </div>
              <p className={`text-sm font-semibold flex-shrink-0 ${credit ? "text-success" : "text-foreground"}`}>
                {credit ? "+" : "−"}{fmt(t.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QontoTreasury;
