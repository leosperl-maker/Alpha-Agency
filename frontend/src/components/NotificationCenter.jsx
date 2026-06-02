import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, FileWarning, UserPlus, CheckCheck } from "lucide-react";
import { invoicesAPI, contactsAPI } from "../lib/api";

/**
 * Notifications derived from real, already-working CRM data
 * (overdue invoices, overdue tasks, new leads). No dependency on a
 * separate /api/notifications endpoint or WebSocket. Theme-aware.
 */
const NotificationCenter = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const load = useCallback(async () => {
    const next = [];
    try {
      const [invoicesRes, contactsRes] = await Promise.all([
        invoicesAPI.getAll({ status: "pending,overdue" }).catch(() => ({ data: [] })),
        contactsAPI.getAll({ type: "lead" }).catch(() => ({ data: [] })),
      ]);

      (invoicesRes.data || []).filter(i => i.status === "overdue").slice(0, 4).forEach(i => next.push({
        id: `invoice-${i.id}`, type: "danger", icon: FileWarning,
        title: "Facture en retard", message: `${i.number || "Facture"} · ${i.total?.toFixed(0) || 0}€`,
        link: "/admin/facturation",
      }));

      (contactsRes.data || []).slice(0, 4).forEach(c => next.push({
        id: `lead-${c.id}`, type: "info", icon: UserPlus,
        title: "Nouveau lead", message: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email,
        link: "/admin/contacts",
      }));
    } catch (e) { /* offline / no backend → empty */ }
    setItems(next);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const visible = items.filter(i => !dismissed.has(i.id));
  const count = visible.length;

  const tone = {
    danger: "bg-danger-soft text-danger",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
  };

  const open = (item) => {
    setDismissed(prev => new Set(prev).add(item.id));
    setIsOpen(false);
    if (item.link) navigate(item.link);
  };

  const clearAll = () => setDismissed(new Set(items.map(i => i.id)));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        data-testid="notification-bell"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-2xl shadow-pop overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-foreground font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button onClick={clearAll} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {count === 0 ? (
              <div className="py-10 text-center">
                <div className="w-11 h-11 rounded-2xl bg-success-soft text-success flex items-center justify-center mx-auto mb-2">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <p className="text-foreground text-sm font-medium">Tout est calme</p>
                <p className="text-muted-foreground text-xs">Aucune notification en attente.</p>
              </div>
            ) : (
              visible.map((n) => (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tone[n.type]}`}>
                    <n.icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{n.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">{n.message}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
