import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, Kanban, FileText, Receipt, CreditCard, Settings,
  LogOut, Menu, X, Image, Inbox, FileCheck, CheckSquare, Wallet, Database,
  UserCog, Bot, Newspaper, Share2, Tag, Mail, ChevronLeft, Bell, Search,
  User, ChevronDown, AlertCircle, Clock, FileWarning, UserPlus, Sun, Moon,
  ListTodo, GitBranch, Send, Calendar, CalendarDays, Link2, Command, 
  FileSearch, Contact, Briefcase, DollarSign, Keyboard, HelpCircle,
  Wifi, WifiOff
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import FloatingAIChat from "../../components/FloatingAIChat";
import QuickActions from "../../components/QuickActions";
import { tasksAPI, contactsAPI, invoicesAPI, opportunitiesAPI } from "../../lib/api";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Dialog,
  DialogContent,
} from "../../components/ui/dialog";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, wasOffline } = useOnlineStatus();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Topbar states
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Refs for click outside
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const commandInputRef = useRef(null);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandResults, setCommandResults] = useState([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Keyboard shortcut state - MUST be declared before useEffect that uses them
  const [lastKeyPressed, setLastKeyPressed] = useState(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("alpha_token");
    const userData = localStorage.getItem("alpha_user");
    
    if (!token) {
      navigate("/admin/login");
      return;
    }
    
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Fetch notifications
    fetchNotifications();
  }, [navigate]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Fetch overdue tasks
      const tasksRes = await tasksAPI.getAll({ status: 'todo,in_progress' });
      const overdueTasks = (tasksRes.data || []).filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date();
      }).slice(0, 3);
      
      // Fetch overdue invoices
      const invoicesRes = await invoicesAPI.getAll({ status: 'pending,overdue' });
      const overdueInvoices = (invoicesRes.data || []).filter(i => i.status === 'overdue').slice(0, 3);
      
      // Fetch new leads (recent contacts)
      const contactsRes = await contactsAPI.getAll({ type: 'lead' });
      const recentLeads = (contactsRes.data || []).slice(0, 3);
      
      const notifs = [];
      
      overdueTasks.forEach(t => {
        notifs.push({
          id: `task-${t.id}`,
          type: 'task',
          title: 'Tâche en retard',
          message: t.title,
          icon: Clock,
          color: 'text-orange-400',
          link: '/admin/taches'
        });
      });
      
      overdueInvoices.forEach(i => {
        notifs.push({
          id: `invoice-${i.id}`,
          type: 'invoice',
          title: 'Facture impayée',
          message: `${i.number || 'Facture'} - ${i.total?.toFixed(2) || 0}€`,
          icon: FileWarning,
          color: 'text-red-400',
          link: '/admin/facturation'
        });
      });
      
      recentLeads.slice(0, 2).forEach(c => {
        notifs.push({
          id: `contact-${c.id}`,
          type: 'contact',
          title: 'Nouveau lead',
          message: `${c.first_name} ${c.last_name}`,
          icon: UserPlus,
          color: 'text-green-400',
          link: '/admin/contacts'
        });
      });
      
      setNotifications(notifs.slice(0, 5));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const [contactsRes, tasksRes] = await Promise.all([
        contactsAPI.getAll({ search: query }),
        tasksAPI.getAll({ search: query })
      ]);
      
      const results = [];
      (contactsRes.data || []).slice(0, 3).forEach(c => {
        results.push({
          id: `contact-${c.id}`,
          type: 'Contact',
          title: `${c.first_name} ${c.last_name}`,
          subtitle: c.company || c.email,
          icon: Users,
          link: '/admin/contacts'
        });
      });
      (tasksRes.data || []).slice(0, 3).forEach(t => {
        results.push({
          id: `task-${t.id}`,
          type: 'Tâche',
          title: t.title,
          subtitle: t.status,
          icon: CheckSquare,
          link: '/admin/taches'
        });
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  // ================== COMMAND PALETTE (⌘K) ==================
  
  // All searchable items
  const allNavigationItems = [
    { id: 'nav-dashboard', type: 'Navigation', title: "Vue d'ensemble", icon: LayoutDashboard, action: () => navigate('/admin'), keywords: 'dashboard accueil home' },
    { id: 'nav-contacts', type: 'Navigation', title: "Contacts", icon: Users, action: () => navigate('/admin/contacts'), keywords: 'clients prospects' },
    { id: 'nav-pipeline', type: 'Navigation', title: "Pipeline", icon: Kanban, action: () => navigate('/admin/pipeline'), keywords: 'ventes deals opportunités' },
    { id: 'nav-tasks', type: 'Navigation', title: "Tâches", icon: CheckSquare, action: () => navigate('/admin/taches'), keywords: 'todo list' },
    { id: 'nav-agenda', type: 'Navigation', title: "Agenda / RDV", icon: Calendar, action: () => navigate('/admin/agenda'), keywords: 'calendrier rendez-vous' },
    { id: 'nav-editorial', type: 'Navigation', title: "Calendrier Éditorial", icon: CalendarDays, action: () => navigate('/admin/editorial'), keywords: 'posts publications' },
    { id: 'nav-multilink', type: 'Navigation', title: "Multilink", icon: Link2, action: () => navigate('/admin/multilink'), keywords: 'bio links page' },
    { id: 'nav-invoices', type: 'Navigation', title: "Facturation", icon: Receipt, action: () => navigate('/admin/facturation'), keywords: 'factures devis' },
    { id: 'nav-budget', type: 'Navigation', title: "Budget", icon: Wallet, action: () => navigate('/admin/budget'), keywords: 'finances argent' },
    { id: 'nav-social', type: 'Navigation', title: "Social Media", icon: Share2, action: () => navigate('/admin/social-media'), keywords: 'réseaux sociaux instagram facebook' },
    { id: 'nav-moltbot', type: 'Navigation', title: "MoltBot", icon: Bot, action: () => navigate('/admin/moltbot'), keywords: 'ai chat gpt assistant ia' },
    { id: 'nav-settings', type: 'Navigation', title: "Paramètres", icon: Settings, action: () => navigate('/admin/parametres'), keywords: 'config configuration' },
  ];

  const quickActionItems = [
    { id: 'action-contact', type: 'Action rapide', title: "Créer un contact", icon: UserPlus, action: () => { setCommandPaletteOpen(false); /* trigger quick action */ }, keywords: 'nouveau client' },
    { id: 'action-task', type: 'Action rapide', title: "Créer une tâche", icon: CheckSquare, action: () => { setCommandPaletteOpen(false); }, keywords: 'nouvelle todo' },
    { id: 'action-invoice', type: 'Action rapide', title: "Créer une facture", icon: Receipt, action: () => { setCommandPaletteOpen(false); navigate('/admin/facturation'); }, keywords: 'nouvelle facture devis' },
    { id: 'action-opportunity', type: 'Action rapide', title: "Créer une opportunité", icon: Briefcase, action: () => { setCommandPaletteOpen(false); navigate('/admin/pipeline'); }, keywords: 'nouveau deal' },
  ];

  // Global search function
  const performGlobalSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setCommandResults([...allNavigationItems.slice(0, 5), ...quickActionItems]);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    
    // Filter navigation items
    const navResults = allNavigationItems.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) || 
      item.keywords.toLowerCase().includes(lowerQuery)
    );

    // Filter quick actions
    const actionResults = quickActionItems.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.keywords.toLowerCase().includes(lowerQuery)
    );

    // Search in database
    let dbResults = [];
    try {
      const [contactsRes, tasksRes, invoicesRes, opportunitiesRes] = await Promise.all([
        contactsAPI.getAll({ search: query }).catch(() => ({ data: [] })),
        tasksAPI.getAll({ search: query }).catch(() => ({ data: [] })),
        invoicesAPI.getAll({ search: query }).catch(() => ({ data: [] })),
        opportunitiesAPI.getAll({ search: query }).catch(() => ({ data: [] }))
      ]);

      (contactsRes.data || []).slice(0, 3).forEach(c => {
        dbResults.push({
          id: `contact-${c.id}`,
          type: 'Contact',
          title: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
          subtitle: c.company || c.email,
          icon: Contact,
          action: () => { setCommandPaletteOpen(false); navigate('/admin/contacts'); }
        });
      });

      (tasksRes.data || []).slice(0, 3).forEach(t => {
        dbResults.push({
          id: `task-${t.id}`,
          type: 'Tâche',
          title: t.title,
          subtitle: t.status === 'todo' ? 'À faire' : t.status === 'in_progress' ? 'En cours' : 'Terminée',
          icon: CheckSquare,
          action: () => { setCommandPaletteOpen(false); navigate('/admin/taches'); }
        });
      });

      (invoicesRes.data || []).slice(0, 2).forEach(i => {
        dbResults.push({
          id: `invoice-${i.id}`,
          type: 'Facture',
          title: i.number || `Facture ${i.client_name}`,
          subtitle: `${i.total?.toFixed(2) || 0}€`,
          icon: Receipt,
          action: () => { setCommandPaletteOpen(false); navigate('/admin/facturation'); }
        });
      });

      (opportunitiesRes.data || []).slice(0, 2).forEach(o => {
        dbResults.push({
          id: `opportunity-${o.id}`,
          type: 'Opportunité',
          title: o.name,
          subtitle: `${o.amount?.toFixed(0) || 0}€`,
          icon: Briefcase,
          action: () => { setCommandPaletteOpen(false); navigate('/admin/pipeline'); }
        });
      });
    } catch (error) {
      console.error("Search error:", error);
    }

    setCommandResults([...navResults, ...actionResults, ...dbResults]);
    setSelectedCommandIndex(0);
    setIsSearching(false);
  }, [navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ⌘K or Ctrl+K - Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        setCommandQuery("");
        performGlobalSearch("");
      }
      
      // Escape - Close palette
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }

      // Navigate results with arrow keys
      if (commandPaletteOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev < commandResults.length - 1 ? prev + 1 : 0
          );
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev > 0 ? prev - 1 : commandResults.length - 1
          );
        }
        if (e.key === 'Enter' && commandResults[selectedCommandIndex]) {
          e.preventDefault();
          commandResults[selectedCommandIndex].action();
          setCommandPaletteOpen(false);
        }
      }

      // Quick shortcuts (when palette closed and not in input/textarea)
      if (!commandPaletteOpen && !e.target.closest('input, textarea, [contenteditable="true"]')) {
        // Single key shortcuts
        if (e.key === '?' && e.shiftKey) {
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
        }
        
        // G + key sequences for navigation
        if (lastKeyPressed === 'g') {
          e.preventDefault();
          const gShortcuts = {
            'd': '/admin',           // Go Dashboard
            'c': '/admin/contacts',  // Go Contacts
            't': '/admin/taches',    // Go Tasks
            'p': '/admin/pipeline',  // Go Pipeline
            'a': '/admin/assistant', // Go Assistant
            'f': '/admin/facturation', // Go Facturation
            's': '/admin/social-media', // Go Social
            'e': '/admin/editorial', // Go Editorial
            'm': '/admin/multilink', // Go Multilink
            'b': '/admin/budget',    // Go Budget
          };
          
          if (gShortcuts[e.key.toLowerCase()]) {
            navigate(gShortcuts[e.key.toLowerCase()]);
            setLastKeyPressed(null);
            return;
          }
        }
        
        // Store last key for sequences
        if (e.key === 'g') {
          setLastKeyPressed('g');
          setTimeout(() => setLastKeyPressed(null), 1000); // Reset after 1s
        }

        // N for new (based on current page)
        if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
          // This will be handled by individual pages
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, commandResults, selectedCommandIndex, performGlobalSearch, lastKeyPressed, navigate]);

  // Focus input when palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => commandInputRef.current?.focus(), 100);
    }
  }, [commandPaletteOpen]);

  // ================== END COMMAND PALETTE ==================

  const handleLogout = () => {
    localStorage.removeItem("alpha_token");
    localStorage.removeItem("alpha_user");
    navigate("/admin/login");
  };

  // Navigation items
  const baseNavItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble", end: true },
    { path: "/admin/demandes", icon: Inbox, label: "Demandes" },
    { path: "/admin/contacts", icon: Users, label: "Contacts" },
    { path: "/admin/pipeline", icon: Kanban, label: "Pipeline" },
    { path: "/admin/taches", icon: CheckSquare, label: "Tâches" },
    { path: "/admin/things", icon: ListTodo, label: "Things" },
    { path: "/admin/agenda", icon: Calendar, label: "Agenda / RDV" },
    { path: "/admin/editorial", icon: CalendarDays, label: "Calendrier Éditorial" },
    { path: "/admin/multilink", icon: Link2, label: "Multilink" },
    { path: "/admin/facturation", icon: Receipt, label: "Facturation" },
    { path: "/admin/budget", icon: Wallet, label: "Budget" },
    { path: "/admin/abonnements", icon: CreditCard, label: "Abonnements" },
    { path: "/admin/realisations", icon: Image, label: "Réalisations" },
    { path: "/admin/mindmap", icon: GitBranch, label: "MindMap" },
    { path: "/admin/tags", icon: Tag, label: "Tags" },
    { path: "/admin/documents", icon: FileCheck, label: "Documents" },
    { path: "/admin/transfer", icon: Send, label: "Transfert" },
    { path: "/admin/sauvegardes", icon: Database, label: "Sauvegardes" },
    { path: "/admin/actualites", icon: Newspaper, label: "Actualités" },
    { path: "/admin/blog", icon: FileText, label: "Blog" },
    { path: "/admin/social-media", icon: Share2, label: "Social Media" },
    { path: "/admin/moltbot", icon: Bot, label: "MoltBot" },
    { path: "/admin/whatsapp", icon: Wifi, label: "WhatsApp" },
    { path: "/admin/campagnes", icon: Mail, label: "Campagnes" },
  ];

  const navItems = user?.role === 'super_admin' 
    ? [...baseNavItems, { path: "/admin/utilisateurs", icon: UserCog, label: "Utilisateurs" }, { path: "/admin/parametres", icon: Settings, label: "Paramètres" }]
    : [...baseNavItems, { path: "/admin/parametres", icon: Settings, label: "Paramètres" }];

  // Get current page title
  const currentPage = navItems.find(item => 
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <div data-testid="dashboard-layout" className="min-h-screen bg-[#02040A] flex overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar - Desktop */}
      <aside className={`
        hidden lg:flex flex-col fixed inset-y-0 left-0 z-40
        bg-black/60 backdrop-blur-2xl border-r border-white/10
        transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-20'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
          {sidebarOpen ? (
            <img 
              src="https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/tttfxeo1_Logo%20Header.png"
              alt="Alpha Agency"
              className="h-9 w-auto brightness-0 invert"
            />
          ) : (
            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav Items - Scrollable */}
        <nav className="flex-1 p-3 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                  ${isActive 
                    ? 'bg-indigo-600/20 text-indigo-400' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0`} />
                {sidebarOpen && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Section - Fixed at bottom */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/5 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-white/50 text-xs truncate">{user?.role || 'Utilisateur'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`
        lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col
        bg-black/90 backdrop-blur-2xl border-r border-white/10
        transform transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
          <img 
            src="https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/tttfxeo1_Logo%20Header.png"
            alt="Alpha Agency"
            className="h-8 w-auto brightness-0 invert"
          />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 min-h-0" style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.3) transparent'
        }}>
          <style>{`
            nav::-webkit-scrollbar { width: 6px; }
            nav::-webkit-scrollbar-track { background: transparent; }
            nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
          `}</style>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                ${isActive 
                  ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Top Bar - with safe area for iOS */}
        <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 lg:px-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)', minHeight: '4rem' }}>
          {/* Left: Mobile menu + Page title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-semibold text-lg">{currentPage?.label || 'Dashboard'}</h1>
              <p className="text-white/40 text-xs hidden sm:block">Alpha Agency CRM</p>
            </div>
          </div>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-3">
            {/* Search - Opens Command Palette */}
            <button 
              onClick={() => { setCommandPaletteOpen(true); setCommandQuery(""); performGlobalSearch(""); }}
              className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white/60 hover:bg-white/10 hover:border-white/20 transition-all w-48 lg:w-64"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm flex-1 text-left">Rechercher...</span>
              <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-white/5 rounded text-[10px]">
                <Command className="w-3 h-3" />K
              </kbd>
            </button>
            
            {/* Mobile Search Button */}
            <button 
              onClick={() => { setCommandPaletteOpen(true); setCommandQuery(""); performGlobalSearch(""); }}
              className="sm:hidden p-2 rounded-xl hover:bg-white/10 text-white/60"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                  <div className="p-3 border-b border-white/10">
                    <h3 className="text-white font-semibold text-sm">Notifications</h3>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-white/50 text-sm">
                      Aucune notification
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            navigate(notif.link);
                            setNotificationsOpen(false);
                          }}
                          className="w-full flex items-start gap-3 p-3 hover:bg-white/10 transition-colors text-left"
                        >
                          <div className={`p-1.5 rounded-lg bg-white/5 ${notif.color}`}>
                            <notif.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{notif.title}</p>
                            <p className="text-white/50 text-xs truncate">{notif.message}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      navigate('/admin/taches');
                      setNotificationsOpen(false);
                    }}
                    className="w-full p-2 text-center text-indigo-400 text-sm hover:bg-white/5 border-t border-white/10"
                  >
                    Voir tout
                  </button>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div ref={profileRef} className="relative hidden sm:block">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-3 border-l border-white/10 hover:bg-white/5 rounded-r-xl pr-2 py-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <span className="text-white/80 text-sm font-medium hidden lg:block">{user?.name?.split(' ')[0]}</span>
                <ChevronDown className="w-4 h-4 text-white/40" />
              </button>
              
              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-white font-medium text-sm">{user?.name || 'Admin'}</p>
                    <p className="text-white/50 text-xs">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        navigate('/admin/parametres');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Paramètres
                    </button>
                    <button
                      onClick={() => {
                        navigate('/admin/assistant');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 text-sm"
                    >
                      <Bot className="w-4 h-4" />
                      Assistant IA
                    </button>
                    
                    {/* Theme Toggle */}
                    <div className="border-t border-white/10 mt-1 pt-1">
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          <span>Thème {theme === 'dark' ? 'clair' : 'sombre'}</span>
                        </div>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-white/20'}`}>
                          <div className={`absolute w-3 h-3 rounded-full bg-white top-0.5 transition-all ${theme === 'dark' ? 'left-4' : 'left-0.5'}`} />
                        </div>
                      </button>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 text-sm mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="bg-amber-500/90 text-black px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            Mode hors ligne - Certaines fonctionnalités peuvent être limitées
          </div>
        )}
        
        {/* Back Online Indicator */}
        {isOnline && wasOffline && (
          <div className="bg-green-500/90 text-black px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top duration-300">
            <Wifi className="w-4 h-4" />
            Connexion rétablie
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 relative z-10">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Chat */}
      <FloatingAIChat />
      
      {/* Quick Actions Button */}
      <QuickActions />

      {/* Command Palette (⌘K) */}
      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogContent className="bg-[#0a0a12]/95 backdrop-blur-2xl border-white/10 p-0 max-w-xl overflow-hidden shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <Search className="w-5 h-5 text-white/40" />
            <input
              ref={commandInputRef}
              value={commandQuery}
              onChange={(e) => {
                setCommandQuery(e.target.value);
                performGlobalSearch(e.target.value);
              }}
              placeholder="Rechercher ou taper une commande..."
              className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-base"
              autoFocus
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-white/30 text-xs">
              <Command className="w-3 h-3" />K
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 text-white/40">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
                Recherche...
              </div>
            ) : commandResults.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Aucun résultat pour "{commandQuery}"</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Group by type */}
                {['Navigation', 'Action rapide', 'Contact', 'Tâche', 'Facture', 'Opportunité'].map(type => {
                  const items = commandResults.filter(r => r.type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type}>
                      <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/30 font-medium">
                        {type}
                      </p>
                      {items.map((result, idx) => {
                        const globalIndex = commandResults.indexOf(result);
                        const Icon = result.icon;
                        return (
                          <button
                            key={result.id}
                            onClick={() => {
                              result.action();
                              setCommandPaletteOpen(false);
                            }}
                            onMouseEnter={() => setSelectedCommandIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                              selectedCommandIndex === globalIndex 
                                ? 'bg-indigo-600/20 text-white' 
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              selectedCommandIndex === globalIndex ? 'bg-indigo-600/30' : 'bg-white/5'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-white/40">{result.subtitle}</p>
                              )}
                            </div>
                            {selectedCommandIndex === globalIndex && (
                              <kbd className="px-2 py-0.5 bg-white/5 rounded text-white/30 text-xs">
                                Entrée
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/30">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 rounded">↑↓</kbd> Naviguer</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 rounded">Entrée</kbd> Sélectionner</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white/5 rounded">Échap</kbd> Fermer</span>
            </div>
            <button 
              onClick={() => { setCommandPaletteOpen(false); setShowShortcutsHelp(true); }}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Keyboard className="w-3 h-3" />
              <span className="hidden sm:inline">Raccourcis</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="bg-[#0a0a12]/95 backdrop-blur-2xl border-white/10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Raccourcis clavier</h2>
              <p className="text-xs text-white/50">Naviguez plus rapidement dans l&apos;application</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Global shortcuts */}
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30 mb-2">Global</p>
              <div className="space-y-1.5">
                {[
                  { keys: ['⌘', 'K'], label: 'Recherche globale' },
                  { keys: ['?'], label: 'Afficher cette aide' },
                  { keys: ['Échap'], label: 'Fermer les modals' },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5">
                    <span className="text-sm text-white/70">{shortcut.label}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd key={j} className="px-2 py-0.5 bg-white/10 rounded text-white/60 text-xs min-w-[24px] text-center">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation shortcuts */}
            <div>
              <p className="text-xs uppercase tracking-wider text-white/30 mb-2">Navigation (G puis...)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'D', label: 'Dashboard' },
                  { key: 'C', label: 'Contacts' },
                  { key: 'T', label: 'Tâches' },
                  { key: 'P', label: 'Pipeline' },
                  { key: 'F', label: 'Facturation' },
                  { key: 'S', label: 'Social Media' },
                  { key: 'E', label: 'Éditorial' },
                  { key: 'M', label: 'Multilink' },
                  { key: 'A', label: 'MoltBot' },
                  { key: 'B', label: 'Budget' },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/5">
                    <span className="text-xs text-white/70">{shortcut.label}</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 text-[10px]">G</kbd>
                      <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 text-[10px]">{shortcut.key}</kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            <p className="text-xs text-white/30">
              Les raccourcis fonctionnent quand vous n&apos;êtes pas dans un champ de texte
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardLayout;
