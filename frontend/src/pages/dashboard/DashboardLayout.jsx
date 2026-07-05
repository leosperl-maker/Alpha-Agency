import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Kanban, FileText, Receipt, Settings,
  LogOut, X, Image, Inbox, FileCheck, CheckSquare, Wallet, Database,
  UserCog, Newspaper, Share2, Search, Send, MoreHorizontal,
  ChevronDown, UserPlus, Sun, Moon, Monitor,
  Calendar, CalendarDays, Link2, Command,
  FileSearch, Contact, Briefcase, Keyboard, Instagram, Wifi, WifiOff
} from "lucide-react";
import NotificationCenter from "../../components/NotificationCenter";
import AssistantOrb from "../../components/AssistantOrb";
import AssistantChat from "../../components/AssistantChat";
import api, { tasksAPI, contactsAPI, invoicesAPI, opportunitiesAPI } from "../../lib/api";
import { useTheme } from "../../contexts/ThemeContext";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { isOnline, wasOffline } = useOnlineStatus();
  const [user, setUser] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);        // mobile "Plus" sheet
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Command palette (⌘K / AI bar)
  const commandInputRef = useRef(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandResults, setCommandResults] = useState([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [lastKeyPressed, setLastKeyPressed] = useState(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const openAssistant = useCallback(() => navigate("/admin/neo"), [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("alpha_token");
    const userData = localStorage.getItem("alpha_user");
    if (!token) { navigate("/admin/login"); return; }
    if (userData) setUser(JSON.parse(userData));
  }, [navigate]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Lock body scroll while the mobile sheet is open
  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  // ================== COMMAND PALETTE / AI BAR ==================
  const openCommand = useCallback(() => {
    setCommandPaletteOpen(true);
    setCommandQuery("");
    setTimeout(() => commandInputRef.current?.focus(), 60);
  }, []);

  const allNavigationItems = [
    { id: 'nav-dashboard', type: 'Navigation', title: "Aujourd'hui", icon: LayoutDashboard, action: () => navigate('/admin'), keywords: 'dashboard accueil home vue ensemble' },
    { id: 'nav-contacts', type: 'Navigation', title: "Contacts", icon: Users, action: () => navigate('/admin/contacts'), keywords: 'clients prospects' },
    { id: 'nav-pipeline', type: 'Navigation', title: "Pipeline", icon: Kanban, action: () => navigate('/admin/pipeline'), keywords: 'deals opportunités kanban commercial ventes' },
    { id: 'nav-agenda', type: 'Navigation', title: "Agenda / RDV", icon: Calendar, action: () => navigate('/admin/agenda'), keywords: 'calendrier rendez-vous' },
    { id: 'nav-editorial', type: 'Navigation', title: "Calendrier Éditorial", icon: CalendarDays, action: () => navigate('/admin/editorial'), keywords: 'posts publications' },
    { id: 'nav-multilink', type: 'Navigation', title: "Multilink", icon: Link2, action: () => navigate('/admin/multilink'), keywords: 'bio links page' },
    { id: 'nav-transfers', type: 'Navigation', title: "Transferts", icon: Send, action: () => navigate('/admin/transferts'), keywords: 'wetransfer fichiers partage envoi client' },
    { id: 'nav-invoices', type: 'Navigation', title: "Facturation", icon: Receipt, action: () => navigate('/admin/facturation'), keywords: 'factures devis' },
    { id: 'nav-budget', type: 'Navigation', title: "Budget", icon: Wallet, action: () => navigate('/admin/budget'), keywords: 'finances argent' },
    { id: 'nav-settings', type: 'Navigation', title: "Paramètres", icon: Settings, action: () => navigate('/admin/parametres'), keywords: 'config configuration' },
  ];

  const quickActionItems = [
    { id: 'action-contact', type: 'Action rapide', title: "Créer un contact", icon: UserPlus, action: () => { setCommandPaletteOpen(false); navigate('/admin/contacts'); }, keywords: 'nouveau client' },
    { id: 'action-invoice', type: 'Action rapide', title: "Créer une facture", icon: Receipt, action: () => { setCommandPaletteOpen(false); navigate('/admin/facturation'); }, keywords: 'nouvelle facture devis' },
  ];

  const performGlobalSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setCommandResults([...allNavigationItems.slice(0, 6), ...quickActionItems]);
      setSelectedCommandIndex(0);
      return;
    }
    setIsSearching(true);
    const q = query.toLowerCase();
    const navResults = allNavigationItems.filter(i => i.title.toLowerCase().includes(q) || i.keywords.toLowerCase().includes(q));
    const actionResults = quickActionItems.filter(i => i.title.toLowerCase().includes(q) || i.keywords.toLowerCase().includes(q));
    let dbResults = [];
    try {
      // Recherche globale : contacts, factures/devis, deals, tâches (filtre côté client
      // pour deals/tâches : listes courtes, et l'API n'a pas de paramètre search)
      const [contactsRes, invoicesRes, oppsRes, tasksRes, docsRes] = await Promise.all([
        contactsAPI.getAll({ search: query }).catch(() => ({ data: [] })),
        invoicesAPI.getAll({ search: query }).catch(() => ({ data: [] })),
        opportunitiesAPI.getAll().catch(() => ({ data: [] })),
        tasksAPI.getAll().catch(() => ({ data: [] })),
        api.get('/documents', { params: { search: query, flat: true } }).catch(() => ({ data: [] })),
      ]);
      (contactsRes.data || []).slice(0, 3).forEach(c => dbResults.push({
        id: `contact-${c.id}`, type: 'Contact', title: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email,
        subtitle: c.company || c.email, icon: Contact, action: () => { setCommandPaletteOpen(false); navigate('/admin/contacts'); }
      }));
      (invoicesRes.data || []).slice(0, 2).forEach(i => dbResults.push({
        id: `invoice-${i.id}`, type: 'Facture', title: i.number || `Facture ${i.client_name}`,
        subtitle: `${i.total?.toFixed(2) || 0}€`, icon: Receipt, action: () => { setCommandPaletteOpen(false); navigate('/admin/facturation'); }
      }));
      (Array.isArray(oppsRes.data) ? oppsRes.data : [])
        .filter(o => (o.title || '').toLowerCase().includes(q)).slice(0, 3).forEach(o => dbResults.push({
          id: `deal-${o.id}`, type: 'Deal', title: o.title,
          subtitle: `${Math.round(o.amount || 0)}€ · ${o.stage}`, icon: Kanban,
          action: () => { setCommandPaletteOpen(false); navigate('/admin/pipeline'); }
        }));
      (Array.isArray(tasksRes.data) ? tasksRes.data : [])
        .filter(t => (t.status !== 'done' && t.status !== 'cancelled') && (t.title || '').toLowerCase().includes(q))
        .slice(0, 3).forEach(t => dbResults.push({
          id: `task-${t.id}`, type: 'Tâche', title: t.title,
          subtitle: t.due_date ? `échéance ${t.due_date.slice(0, 10)}` : null, icon: CheckSquare,
          action: () => { setCommandPaletteOpen(false); navigate('/admin/things'); }
        }));
      (Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data?.documents || []))
        .slice(0, 3).forEach(d => dbResults.push({
          id: `doc-${d.id}`, type: 'Document', title: d.name || d.filename || 'Document',
          subtitle: d.file_type || d.folder_name || null, icon: FileSearch,
          action: () => { setCommandPaletteOpen(false); navigate('/admin/documents'); }
        }));
    } catch (e) { /* offline / no backend */ }
    setCommandResults([...navResults, ...actionResults, ...dbResults]);
    setSelectedCommandIndex(0);
    setIsSearching(false);
  }, [navigate]);

  // Seed default results (nav + quick actions) whenever the assistant opens
  useEffect(() => {
    if (commandPaletteOpen) performGlobalSearch("");
  }, [commandPaletteOpen, performGlobalSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(p => !p); setCommandQuery(""); performGlobalSearch(""); }
      if (e.key === 'Escape' && commandPaletteOpen) setCommandPaletteOpen(false);
      if (commandPaletteOpen) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCommandIndex(p => p < commandResults.length - 1 ? p + 1 : 0); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCommandIndex(p => p > 0 ? p - 1 : commandResults.length - 1); }
        if (e.key === 'Enter' && commandResults[selectedCommandIndex]) { e.preventDefault(); commandResults[selectedCommandIndex].action(); setCommandPaletteOpen(false); }
      }
      if (!commandPaletteOpen && !e.target.closest('input, textarea, [contenteditable="true"]')) {
        if (e.key === '?' && e.shiftKey) { e.preventDefault(); setShowShortcutsHelp(p => !p); }
        if (lastKeyPressed === 'g') {
          const g = { 'd': '/admin', 'c': '/admin/contacts', 'f': '/admin/facturation', 'e': '/admin/editorial', 'm': '/admin/multilink', 'b': '/admin/budget' };
          if (g[e.key.toLowerCase()]) { e.preventDefault(); navigate(g[e.key.toLowerCase()]); setLastKeyPressed(null); return; }
        }
        if (e.key === 'g') { setLastKeyPressed('g'); setTimeout(() => setLastKeyPressed(null), 1000); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, commandResults, selectedCommandIndex, performGlobalSearch, lastKeyPressed, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("alpha_token");
    localStorage.removeItem("alpha_user");
    navigate("/admin/login");
  };

  // ================== NAVIGATION MODEL ==================
  const navGroups = [
    { label: "Pilotage", items: [
      { path: "/admin", icon: LayoutDashboard, label: "Aujourd'hui", end: true },
      { path: "/admin/demandes", icon: Inbox, label: "Demandes" },
      { path: "/admin/contacts", icon: Users, label: "Contacts" },
      { path: "/admin/pipeline", icon: Kanban, label: "Pipeline" },
      { path: "/admin/agenda", icon: Calendar, label: "Agenda" },
    ]},
    { label: "Finances", items: [
      { path: "/admin/facturation", icon: Receipt, label: "Facturation" },
      { path: "/admin/budget", icon: Wallet, label: "Budget" },
    ]},
    { label: "Contenu", items: [
      { path: "/admin/actualites", icon: Newspaper, label: "Actualités" },
      { path: "/admin/blog", icon: FileText, label: "Blog" },
      { path: "/admin/editorial", icon: CalendarDays, label: "Éditorial" },
      { path: "/admin/multilink", icon: Link2, label: "Multilink" },
    ]},
    { label: "Atelier", items: [
      { path: "/admin/realisations", icon: Image, label: "Réalisations" },
      { path: "/admin/documents", icon: FileCheck, label: "Documents" },
      { path: "/admin/transferts", icon: Send, label: "Transferts" },
      { path: "/admin/sauvegardes", icon: Database, label: "Sauvegardes" },
      ...(user?.role === 'super_admin' ? [{ path: "/admin/utilisateurs", icon: UserCog, label: "Utilisateurs" }] : []),
      { path: "/admin/parametres", icon: Settings, label: "Paramètres" },
    ]},
  ];
  const navItems = navGroups.flatMap(g => g.items);
  const currentPage = navItems.find(i => i.end ? location.pathname === i.path : location.pathname.startsWith(i.path));

  // Mobile bottom-bar tabs (5 slots, center = AI)
  const tabHome = { path: "/admin", icon: LayoutDashboard, label: "Aujourd'hui", end: true };
  const tabContacts = { path: "/admin/contacts", icon: Users, label: "Contacts" };
  const tabInvoices = { path: "/admin/facturation", icon: Receipt, label: "Factures" };

  const isDark = resolvedTheme === 'dark';
  const logoSrc = process.env.PUBLIC_URL + (isDark ? "/logo-header-white.png" : "/logo-header-black.png");
  const themeOptions = [
    { value: 'system', label: 'Auto', icon: Monitor },
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
  ];
  const isTabActive = (tab) => tab.end ? location.pathname === tab.path : location.pathname.startsWith(tab.path);

  return (
    <div className="admin-body relative min-h-screen bg-background text-foreground">

      {/* ===================== DESKTOP RAIL (slim, expand on hover) ===================== */}
      <aside className="group/rail hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 w-[78px] hover:w-64 hover:shadow-pop bg-card border-r border-border overflow-hidden transition-[width] duration-200 ease-out">
        {/* Brand */}
        <button onClick={() => navigate('/admin')} className="h-16 flex items-center gap-3 px-[18px] w-full flex-shrink-0" title="Alpha Agency">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E11D2E] to-[#7A0F2B] flex items-center justify-center shadow-elev flex-shrink-0">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="font-bold text-foreground text-lg whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity">Alpha<span className="text-primary">.</span></span>
        </button>

        {/* AI launcher */}
        <button onClick={openAssistant} title="Assistant IA"
          className="mx-2 mb-2 h-11 px-[9px] rounded-2xl flex items-center gap-3 hover:bg-secondary transition-colors flex-shrink-0">
          <AssistantOrb size={26} pulse />
          <span className="text-sm font-medium text-foreground whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity">Assistant</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 w-full overflow-y-auto overflow-x-hidden px-2 py-1 min-h-0">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="px-3 h-6 flex items-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.end} title={item.label}
                    className={({ isActive }) => `relative flex items-center gap-3 h-11 px-[11px] rounded-2xl transition-colors ${
                      isActive ? 'bg-brand-soft text-primary font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}>
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />}
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Theme + profile */}
        <div className="w-full px-2 py-3 space-y-1 border-t border-border flex-shrink-0">
          <button onClick={toggleTheme} title={isDark ? 'Thème clair' : 'Thème sombre'}
            className="w-full h-11 px-[11px] rounded-2xl flex items-center gap-3 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity">{isDark ? 'Thème clair' : 'Thème sombre'}</span>
          </button>
          <button onClick={() => navigate('/admin/parametres')} title={user?.name || 'Profil'}
            className="w-full h-12 px-[7px] rounded-2xl flex items-center gap-3 hover:bg-secondary transition-colors">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E11D2E] to-[#7A0F2B] flex items-center justify-center text-white font-semibold flex-shrink-0">{user?.name?.charAt(0) || 'A'}</span>
            <span className="min-w-0 text-left opacity-0 group-hover/rail:opacity-100 transition-opacity">
              <span className="block text-sm font-medium text-foreground truncate">{user?.name || 'Admin'}</span>
              <span className="block text-xs text-muted-foreground truncate">{user?.role || 'Profil'}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ===================== MAIN COLUMN ===================== */}
      <div className="lg:pl-[78px] min-w-0 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-3 px-4 lg:px-6 h-16">
            {/* Brand (mobile) + page title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E11D2E] to-[#7A0F2B] flex items-center justify-center lg:hidden flex-shrink-0">
                <span className="text-white font-bold">A</span>
              </div>
              <h1 className="text-foreground font-semibold text-base lg:text-lg leading-tight truncate">{currentPage?.label || 'Aujourd\'hui'}</h1>
            </div>

            {/* AI command bar (center) — tablet & desktop → opens the assistant */}
            <button onClick={openAssistant}
              className="hidden md:flex flex-1 max-w-xl mx-auto items-center gap-2.5 h-10 px-3.5 rounded-2xl bg-secondary border border-border text-muted-foreground hover:border-primary/40 hover:bg-card transition-all">
              <AssistantOrb size={18} />
              <span className="text-sm flex-1 text-left truncate">Demander à l'assistant…</span>
              <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 bg-background/60 border border-border rounded text-[10px] flex-shrink-0" title="Recherche rapide">
                <Command className="w-3 h-3" />K
              </kbd>
            </button>

            {/* Right actions */}
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto md:ml-0">
              <button onClick={openCommand} title="Assistant / recherche"
                className="md:hidden p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button onClick={toggleTheme} title={isDark ? 'Thème clair' : 'Thème sombre'}
                className="lg:hidden p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <NotificationCenter />
              <div ref={profileRef} className="relative hidden sm:block">
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-xl hover:bg-secondary transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E11D2E] to-[#7A0F2B] flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
                </button>
                {profileOpen && (
                  <div className="absolute top-full right-0 mt-2 w-60 bg-popover border border-border rounded-2xl overflow-hidden shadow-pop z-50">
                    <div className="p-3 border-b border-border">
                      <p className="text-foreground font-medium text-sm">{user?.name || 'Admin'}</p>
                      <p className="text-muted-foreground text-xs truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button onClick={() => { navigate('/admin/parametres'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-secondary rounded-lg transition-colors text-foreground text-sm">
                        <Settings className="w-4 h-4" /> Paramètres
                      </button>
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="px-2 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Apparence</p>
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary">
                          {themeOptions.map(opt => (
                            <button key={opt.value} onClick={() => setTheme(opt.value)}
                              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all ${theme === opt.value ? 'bg-card text-primary shadow-elev' : 'text-muted-foreground hover:text-foreground'}`}>
                              <opt.icon className="w-4 h-4" /> {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-2 mt-2 hover:bg-danger-soft rounded-lg transition-colors text-danger text-sm">
                        <LogOut className="w-4 h-4" /> Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connectivity banners */}
          {!isOnline && (
            <div className="bg-warning text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
              <WifiOff className="w-3.5 h-3.5" /> Mode hors ligne
            </div>
          )}
          {isOnline && wasOffline && (
            <div className="bg-success text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
              <Wifi className="w-3.5 h-3.5" /> Connexion rétablie
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6 pb-28 lg:pb-8 relative z-10">
          <Outlet context={{ openCommand, openAssistant }} />
        </main>
      </div>

      {/* ===================== MOBILE BOTTOM TAB BAR ===================== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 items-end h-16 px-1">
          <BottomTab tab={tabHome} active={isTabActive(tabHome)} onClick={() => navigate(tabHome.path)} />
          <BottomTab tab={tabContacts} active={isTabActive(tabContacts)} onClick={() => navigate(tabContacts.path)} />
          {/* Center AI */}
          <div className="flex justify-center">
            <button onClick={openAssistant} aria-label="Assistant IA" className="-mt-6 active:scale-95 transition-transform">
              <span className="block rounded-full shadow-pop"><AssistantOrb size={56} pulse /></span>
              <span className="block text-[10px] font-medium text-primary mt-0.5">Assistant</span>
            </button>
          </div>
          <BottomTab tab={tabInvoices} active={isTabActive(tabInvoices)} onClick={() => navigate(tabInvoices.path)} />
          <button onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 h-full text-muted-foreground active:text-foreground">
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        </div>
      </nav>

      {/* ===================== MOBILE "PLUS" SHEET ===================== */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-card border-t border-border rounded-t-3xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
            <div className="sticky top-0 bg-card pt-3 pb-2 px-5 flex items-center justify-between border-b border-border">
              <img src={logoSrc} alt="Alpha Agency" className="h-7 w-auto" />
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-5">
              {navGroups.map(group => (
                <div key={group.label}>
                  <p className="px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{group.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map(item => (
                      <NavLink key={item.path} to={item.path} end={item.end} onClick={() => setMoreOpen(false)}
                        className={({ isActive }) => `flex flex-col items-center gap-2 py-3.5 rounded-2xl border text-center transition-colors ${
                          isActive ? 'bg-brand-soft border-primary/30 text-primary' : 'bg-secondary border-transparent text-foreground/80 hover:text-foreground'
                        }`}>
                        <item.icon className="w-5 h-5" />
                        <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
              {/* Appearance + logout */}
              <div className="pt-1">
                <p className="px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Apparence</p>
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-secondary">
                  {themeOptions.map(opt => (
                    <button key={opt.value} onClick={() => setTheme(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${theme === opt.value ? 'bg-card text-primary shadow-elev' : 'text-muted-foreground'}`}>
                      <opt.icon className="w-4 h-4" /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-soft text-primary font-medium">
                <LogOut className="w-5 h-5" /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ASSISTANT IA (chat Gemini) ===================== */}
      <AssistantChat open={assistantOpen} onOpenChange={setAssistantOpen} />

      {/* ===================== COMMAND PALETTE (recherche ⌘K) ===================== */}
      <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
        <DialogContent className="bg-popover/95 backdrop-blur-xl border-border text-foreground p-0 max-w-xl overflow-hidden shadow-pop">
          <DialogTitle className="sr-only">Recherche et commandes</DialogTitle>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <AssistantOrb size={22} />
            <input ref={commandInputRef} value={commandQuery}
              onChange={(e) => { setCommandQuery(e.target.value); performGlobalSearch(e.target.value); }}
              placeholder="Demander à l'assistant ou rechercher…"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base" autoFocus />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-secondary rounded text-muted-foreground text-xs"><Command className="w-3 h-3" />K</kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" /> Recherche…
              </div>
            ) : commandResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Aucun résultat pour "{commandQuery}"</p>
              </div>
            ) : (
              <div className="space-y-1">
                {['Navigation', 'Action rapide', 'Contact', 'Deal', 'Tâche', 'Facture', 'Document', 'Opportunité'].map(type => {
                  const items = commandResults.filter(r => r.type === type);
                  if (items.length === 0) return null;
                  return (
                    <div key={type}>
                      <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{type}</p>
                      {items.map((result) => {
                        const idx = commandResults.indexOf(result);
                        const Icon = result.icon;
                        return (
                          <button key={result.id}
                            onClick={() => { result.action(); setCommandPaletteOpen(false); }}
                            onMouseEnter={() => setSelectedCommandIndex(idx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${selectedCommandIndex === idx ? 'bg-brand-soft text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedCommandIndex === idx ? 'bg-brand-soft' : 'bg-secondary'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{result.title}</p>
                              {result.subtitle && <p className="text-xs text-muted-foreground">{result.subtitle}</p>}
                            </div>
                            {selectedCommandIndex === idx && <kbd className="px-2 py-0.5 bg-secondary rounded text-muted-foreground text-xs">Entrée</kbd>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-border bg-secondary/50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-secondary rounded">↑↓</kbd> Naviguer</span>
              <span className="hidden sm:flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-secondary rounded">↵</kbd> Ouvrir</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-secondary rounded">Échap</kbd> Fermer</span>
            </div>
            <button onClick={() => { setCommandPaletteOpen(false); setShowShortcutsHelp(true); }} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Keyboard className="w-3 h-3" /><span className="hidden sm:inline">Raccourcis</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================== SHORTCUTS HELP ===================== */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="bg-popover/95 backdrop-blur-xl border-border text-foreground shadow-pop max-w-lg">
          <DialogTitle className="sr-only">Raccourcis clavier</DialogTitle>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E11D2E] to-[#7A0F2B] flex items-center justify-center"><Keyboard className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Raccourcis clavier</h2>
              <p className="text-xs text-muted-foreground">Navigue plus vite dans l'application</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Global</p>
              <div className="space-y-1.5">
                {[{ keys: ['⌘', 'K'], label: 'Assistant / recherche' }, { keys: ['?'], label: 'Cette aide' }, { keys: ['Échap'], label: 'Fermer' }].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary">
                    <span className="text-sm text-foreground/80">{s.label}</span>
                    <div className="flex items-center gap-1">{s.keys.map((k, j) => <kbd key={j} className="px-2 py-0.5 bg-secondary rounded text-muted-foreground text-xs min-w-[24px] text-center">{k}</kbd>)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Aller à (G puis…)</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[{ key: 'D', label: "Aujourd'hui" }, { key: 'C', label: 'Contacts' }, { key: 'F', label: 'Facturation' }, { key: 'E', label: 'Éditorial' }, { key: 'M', label: 'Multilink' }, { key: 'B', label: 'Budget' }].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary">
                    <span className="text-xs text-foreground/80">{s.label}</span>
                    <div className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-secondary rounded text-muted-foreground text-[10px]">G</kbd><kbd className="px-1.5 py-0.5 bg-secondary rounded text-muted-foreground text-[10px]">{s.key}</kbd></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Mobile bottom-bar tab
const BottomTab = ({ tab, active, onClick }) => (
  <button onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 h-full transition-colors ${active ? 'text-primary' : 'text-muted-foreground active:text-foreground'}`}>
    <tab.icon className="w-5 h-5" />
    <span className="text-[10px] font-medium">{tab.label}</span>
  </button>
);

export default DashboardLayout;
