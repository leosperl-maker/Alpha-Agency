import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, FileWarning, UserPlus, CheckCheck, Radar, Sparkles, BellRing, Loader2 } from "lucide-react";
import api, { invoicesAPI, contactsAPI } from "../lib/api";

// clé VAPID (base64 url-safe) → Uint8Array pour pushManager.subscribe
const urlB64ToUint8 = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

/**
 * Notifications = celles du serveur (db.notifications : briefings et signaux de Néo,
 * déposées par le moteur proactif) + celles dérivées des données CRM déjà chargées
 * (factures en retard, nouveaux leads). Theme-aware.
 * Une notification portant un `neo_prompt` se traite en 1 clic : on ouvre le QG de
 * Néo et le prompt part tout seul (relais sessionStorage lu par AssistantChat).
 */
const NotificationCenter = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  // Web Push : "off" (activable) | "on" (abonné) | "unavailable" (pas de clés/API) | "busy"
  const [pushState, setPushState] = useState("unavailable");

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        const cfg = (await api.get("/push/config")).data;
        if (!cfg?.configured) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushState(sub ? "on" : "off");
      } catch (e) { /* push indisponible : bouton masqué */ }
    })();
  }, []);

  const enablePush = async () => {
    setPushState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState("off"); return; }
      const cfg = (await api.get("/push/config")).data;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(cfg.public_key),
      });
      await api.post("/push/subscribe", { subscription: sub.toJSON(), device_label: navigator.userAgent.slice(0, 80) });
      setPushState("on");
      api.post("/push/test").catch(() => {});
    } catch (e) {
      setPushState("off");
    }
  };

  const load = useCallback(async () => {
    const next = [];
    try {
      const [serverRes, invoicesRes, contactsRes] = await Promise.all([
        api.get("/notifications/", { params: { limit: 15, unread_only: true } }).catch(() => ({ data: { notifications: [] } })),
        invoicesAPI.getAll({ status: "pending,overdue" }).catch(() => ({ data: [] })),
        contactsAPI.getAll({ type: "lead" }).catch(() => ({ data: [] })),
      ]);

      // 1) Notifications serveur (Néo : signaux du radar, briefings)
      (serverRes.data?.notifications || []).forEach((n) => {
        const isSignal = n.type === "neo_signal";
        next.push({
          id: n.id, serverId: n.id,
          type: isSignal ? (n.priority === "high" ? "danger" : "warning") : "info",
          icon: isSignal ? Radar : Sparkles,
          title: n.title, message: n.message,
          neoPrompt: n.data?.neo_prompt || null,
          link: isSignal ? "/admin/neo" : null,
        });
      });

      // 2) Dérivées des données CRM (comportement historique conservé)
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
    if (item.serverId) {
      api.put(`/notifications/${item.serverId}/read`).catch(() => {}); // marquage lu, jamais bloquant
    }
    if (item.neoPrompt) {
      try { sessionStorage.setItem("neo_prompt_pending", item.neoPrompt); } catch (e) { /* noop */ }
      navigate("/admin/neo");
      return;
    }
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

          {/* Web Push (PWA iPhone/Android) : proposé seulement si le serveur a des clés VAPID */}
          {pushState !== "unavailable" && (
            <div className="border-t border-border px-3 py-2">
              {pushState === "on" ? (
                <p className="flex items-center gap-1.5 text-xs text-success">
                  <BellRing className="w-3.5 h-3.5" /> Notifications push actives sur cet appareil
                </p>
              ) : (
                <button onClick={enablePush} disabled={pushState === "busy"}
                        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-primary hover:underline disabled:opacity-50">
                  {pushState === "busy" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                  Activer les notifications push sur cet appareil (iPhone : app installée sur l'écran d'accueil)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
