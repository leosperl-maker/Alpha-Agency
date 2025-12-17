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
    <div data-testid="dashboard-layout" className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#F8F8F8] border-r border-[#E5E5E5] transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E5E5E5]">
          <span className="text-2xl font-bold font-['Syne']">
            <span className="text-[#CE0202]">A</span>
            <span className="text-[#1A1A1A]">lpha</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#666666] hover:text-[#1A1A1A]"
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
                    ? "bg-[#CE0202] text-white"
                    : "text-[#666666] hover:text-[#1A1A1A] hover:bg-[#E5E5E5]"
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E5E5E5]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#CE0202]/10 rounded-full flex items-center justify-center">
              <span className="text-[#CE0202] font-bold">
                {user?.full_name?.charAt(0) || "A"}
              </span>
            </div>
            <div>
              <p className="text-[#1A1A1A] font-medium text-sm">{user?.full_name || "Admin"}</p>
              <p className="text-[#666666] text-xs">{user?.email || ""}</p>
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
        <div className="p-6 bg-[#F8F8F8] min-h-[calc(100vh-4rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
