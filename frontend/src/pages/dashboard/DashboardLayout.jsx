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
  Inbox
} from "lucide-react";
import { Button } from "../../components/ui/button";

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

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble", end: true },
    { path: "/admin/demandes", icon: Inbox, label: "Demandes" },
    { path: "/admin/contacts", icon: Users, label: "Contacts" },
    { path: "/admin/pipeline", icon: Kanban, label: "Pipeline" },
    { path: "/admin/devis", icon: FileText, label: "Devis" },
    { path: "/admin/factures", icon: Receipt, label: "Factures" },
    { path: "/admin/abonnements", icon: CreditCard, label: "Abonnements" },
    { path: "/admin/realisations", icon: Image, label: "Réalisations" },
    { path: "/admin/parametres", icon: Settings, label: "Paramètres" }
  ];

  return (
    <div data-testid="dashboard-layout" className="min-h-screen bg-[#050505] flex">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-white/5 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
          <span className="text-2xl font-bold font-['Syne']">
            <span className="text-[#CE0202]">A</span>
            <span className="text-white">LPHA</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#A1A1AA] hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase().replace(/[^a-z]/g, "")}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#CE0202]/20 text-white border-l-2 border-[#CE0202]"
                    : "text-[#A1A1AA] hover:text-white hover:bg-white/5"
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#CE0202]/20 rounded-full flex items-center justify-center">
              <span className="text-[#CE0202] font-bold">
                {user?.full_name?.charAt(0) || "A"}
              </span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.full_name || "Admin"}</p>
              <p className="text-[#A1A1AA] text-xs">{user?.email || ""}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            data-testid="logout-btn"
            variant="ghost"
            className="w-full justify-start text-[#A1A1AA] hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="h-16 bg-[#0A0A0A] border-b border-white/5 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#A1A1AA] hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2 text-sm">
            <a href="/" target="_blank" className="text-[#A1A1AA] hover:text-white flex items-center gap-1">
              Voir le site
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
