import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCircle, AlertTriangle, Mail, Mic, Users, DollarSign, Clock, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const wsRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    connectWebSocket();
    
    // Create audio element for notification sound
    audioRef.current = new Audio("/notification.mp3");
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("alpha_token");
    return { "Authorization": `Bearer ${token}`, "X-User-Id": "admin" };
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API}/api/notifications?limit=30`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const connectWebSocket = () => {
    // Si API est vide (déploiement Railway), construire l'URL WS relative au domaine courant
    let wsUrl;
    if (API) {
      wsUrl = API.replace("http", "ws") + "/api/notifications/ws/admin";
    } else {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${proto}//${window.location.host}/api/notifications/ws/admin`;
    }
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log("Notification WebSocket connected");
      };
      
      wsRef.current.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        handleNewNotification(notification);
      };
      
      wsRef.current.onclose = () => {
        console.log("WebSocket closed, reconnecting in 5s...");
        setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("WebSocket connection failed:", error);
    }
  };

  const handleNewNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
    
    // Play sound
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    
    // Show toast
    toast(notification.title, {
      description: notification.message,
      icon: getNotificationIcon(notification.type),
      duration: 5000
    });
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API}/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: getAuthHeaders()
      });
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_by: [...(n.read_by || []), "admin"] } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read-all`, {
        method: "PUT",
        headers: getAuthHeaders()
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read_by: [...(n.read_by || []), "admin"] })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await fetch(`${API}/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "lead_new": return <Users className="w-4 h-4 text-blue-400" />;
      case "payment_received": return <DollarSign className="w-4 h-4 text-green-400" />;
      case "email_processed": return <Mail className="w-4 h-4 text-red-400" />;
      case "voice_crm": return <Mic className="w-4 h-4 text-purple-400" />;
      case "churn_alert": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "task_due": return <Clock className="w-4 h-4 text-orange-400" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const isUnread = (notification) => {
    return !notification.read_by?.includes("admin");
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-[#1a1a2e] border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h3 className="text-slate-900 font-semibold text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Tout marquer lu
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[50vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-10 h-10 text-slate-900/20 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer ${
                      isUnread(notif) ? "bg-violet-500/5" : ""
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${isUnread(notif) ? "text-slate-900" : "text-slate-600"}`}>
                            {notif.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="p-1 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(notif.created_at).toLocaleString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                      {isUnread(notif) && (
                        <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`text-xs px-2 py-1 rounded ${soundEnabled ? "text-green-400" : "text-slate-400"}`}
              >
                {soundEnabled ? "🔔 Son activé" : "🔕 Son désactivé"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
