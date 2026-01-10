import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Users, Kanban, FileText, Receipt, CreditCard, Settings,
  LogOut, Menu, X, Image, Inbox, FileCheck, CheckSquare, Wallet, Database,
  UserCog, Bot, Newspaper, Share2, Tag, Mail, ChevronLeft, Bell, Search,
  User, ChevronDown, AlertCircle, Clock, FileWarning, UserPlus
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import FloatingAIChat from "../../components/FloatingAIChat";
import { tasksAPI, contactsAPI, invoicesAPI } from "../../lib/api";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  }, [navigate]);

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
    { path: "/admin/facturation", icon: Receipt, label: "Facturation" },
    { path: "/admin/budget", icon: Wallet, label: "Budget" },
    { path: "/admin/abonnements", icon: CreditCard, label: "Abonnements" },
    { path: "/admin/realisations", icon: Image, label: "Réalisations" },
    { path: "/admin/tags", icon: Tag, label: "Tags" },
    { path: "/admin/documents", icon: FileCheck, label: "Documents" },
    { path: "/admin/sauvegardes", icon: Database, label: "Sauvegardes" },
    { path: "/admin/assistant", icon: Bot, label: "Assistant IA" },
    { path: "/admin/actualites", icon: Newspaper, label: "Actualités" },
    { path: "/admin/blog", icon: FileText, label: "Blog" },
    { path: "/admin/social-media", icon: Share2, label: "Social Media" },
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
            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Navigation - with proper scroll */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r" />
                  )}
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                  {sidebarOpen && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 backdrop-blur-xl rounded-lg text-white text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-white/10">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user?.name || 'Admin'}</p>
                <p className="text-white/40 text-xs truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
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
        lg:hidden fixed inset-y-0 left-0 z-50 w-72
        bg-black/90 backdrop-blur-2xl border-r border-white/10
        transform transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-black/40 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 lg:px-6">
          {/* Left: Mobile menu + Page title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white"
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
            {/* Search - Hidden on mobile */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="Rechercher..." 
                className="w-64 pl-10 bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-indigo-500/50"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Avatar - Desktop */}
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <span className="text-white/80 text-sm font-medium hidden lg:block">{user?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 relative z-10">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Chat */}
      <FloatingAIChat />
    </div>
  );
};

export default DashboardLayout;
