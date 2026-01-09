import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  FileText, 
  Receipt, 
  CreditCard, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Image,
  Inbox,
  FileCheck,
  CheckSquare,
  Wallet,
  Database,
  UserCog,
  Bot,
  Newspaper,
  CalendarDays,
  Share2,
  Tag,
  Mail
} from "lucide-react";
import { Button } from "../../components/ui/button";
import FloatingAIChat from "../../components/FloatingAIChat";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Navigation items - some restricted to super_admin
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
  ];

  // Add Users management for super_admin only
  const navItems = user?.role === 'super_admin' 
    ? [...baseNavItems, { path: "/admin/utilisateurs", icon: UserCog, label: "Utilisateurs" }, { path: "/admin/parametres", icon: Settings, label: "Paramètres" }]
    : [...baseNavItems, { path: "/admin/parametres", icon: Settings, label: "Paramètres" }];

  return (
    <div data-testid="dashboard-layout" className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#F8F8F8] border-r border-[#E5E5E5] transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo - Fixed Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E5E5E5] flex-shrink-0">
          <img 
            src="https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/tttfxeo1_Logo%20Header.png"
            alt="Alpha Agency"
            className="h-10 w-auto"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#666666] hover:text-[#1A1A1A]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto pb-32">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]/g, "")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#CE0202] text-white"
                    : "text-[#666666] hover:text-[#1A1A1A] hover:bg-[#E5E5E5]"
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User & Logout - Fixed Footer */}
        <div className="p-4 border-t border-[#E5E5E5] bg-[#F8F8F8] flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#CE0202]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[#CE0202] font-bold">
                {user?.full_name?.charAt(0) || "A"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[#1A1A1A] font-medium text-sm truncate">{user?.full_name || "Admin"}</p>
              <p className="text-[#666666] text-xs truncate">{user?.email || ""}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            data-testid="logout-btn"
            variant="ghost"
            className="w-full justify-start text-[#666666] hover:text-[#1A1A1A] hover:bg-[#E5E5E5]"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#666666] hover:text-[#1A1A1A]"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2 text-sm">
            <a href="/" target="_blank" className="text-[#666666] hover:text-[#CE0202] flex items-center gap-1">
              Voir le site
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Page content */}
        <div className="p-3 sm:p-4 md:p-6 bg-[#F8F8F8] min-h-[calc(100vh-4rem)] overflow-x-auto">
          <Outlet />
        </div>
      </main>
      
      {/* Floating AI Chat Bubble */}
      <FloatingAIChat />
    </div>
  );
};

export default DashboardLayout;
