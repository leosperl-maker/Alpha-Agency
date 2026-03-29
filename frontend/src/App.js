import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Contexts
import { ThemeProvider } from "./contexts/ThemeContext";

// Components
import ScrollToTop from "./components/ScrollToTop";
import CustomDomainHandler from "./components/CustomDomainHandler";

// Pages vitrine
import HomePage from "./pages/HomePage";
import AgencyPage from "./pages/AgencyPage";
import OffersPage from "./pages/OffersPage";
import PortfolioPageNew from "./pages/PortfolioPageNew";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import ContactPage from "./pages/ContactPage";
import LegalPage from "./pages/LegalPage";

// Dashboard pages
import LoginPage from "./pages/dashboard/LoginPage";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import ContactsPage from "./pages/dashboard/ContactsPage";
import PipelinePage from "./pages/dashboard/PipelinePage";
import InvoicesPage from "./pages/dashboard/InvoicesPage";
import PortfolioManagePage from "./pages/dashboard/PortfolioManagePageNew";
import DemandesPage from "./pages/dashboard/DemandesPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import DocumentsPage from "./pages/dashboard/DocumentsPage";
import TasksPage from "./pages/dashboard/TasksPage";
import BudgetPage from "./pages/dashboard/BudgetPage";
import BackupPage from "./pages/dashboard/BackupPage";
import UsersPage from "./pages/dashboard/UsersPage";
import AIAssistantPage from "./pages/dashboard/AIAssistantPageNew";
import NewsPage from "./pages/dashboard/NewsPage";
import SocialMediaPage from "./pages/dashboard/SocialMediaPageNew";
import BlogAdminPage from "./pages/dashboard/BlogAdminPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ThingsPage from "./pages/dashboard/ThingsPage";
import AgendaPage from "./pages/dashboard/AgendaPage";
import EditorialCalendarPage from "./pages/dashboard/EditorialCalendarPage";
import MultilinkPage from "./pages/dashboard/MultilinkPage";
import InstagramStoryPage from "./pages/dashboard/InstagramStoryPage";
import NurturingPage from "./pages/dashboard/NurturingPage";

// Public pages
import TransferDownloadPage from "./pages/TransferDownloadPage";
import LinkBioPage from "./pages/public/LinkBioPage";
import WidgetPage from "./pages/WidgetPage";

// Layout
import MainLayout from "./components/MainLayout";

function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              color: '#1E293B',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            },
          }}
        />
        <BrowserRouter>
          <CustomDomainHandler>
            <ScrollToTop />
            <Routes>
            {/* Site vitrine */}
            <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/agence" element={<AgencyPage />} />
            <Route path="/offres" element={<OffersPage />} />
            <Route path="/realisations" element={<PortfolioPageNew />} />
            <Route path="/realisations/:slug" element={<PortfolioPageNew />} />
            <Route path="/actualites" element={<BlogPage />} />
            <Route path="/actualites/:slug" element={<BlogPostPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/mentions-legales" element={<LegalPage type="mentions" />} />
            <Route path="/confidentialite" element={<LegalPage type="privacy" />} />
            <Route path="/cookies" element={<LegalPage type="cookies" />} />
          </Route>
          
          {/* Dashboard - Accès caché */}
          <Route path="/alpha-admin-2024" element={<LoginPage />} />
          <Route path="/alpha-admin-2024/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="demandes" element={<DemandesPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="facturation" element={<InvoicesPage />} />
            <Route path="devis" element={<Navigate to="/admin/facturation?tab=devis" replace />} />
            <Route path="factures" element={<Navigate to="/admin/facturation?tab=facture" replace />} />
            <Route path="realisations" element={<PortfolioManagePage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="taches" element={<TasksPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="sauvegardes" element={<BackupPage />} />
            <Route path="utilisateurs" element={<UsersPage />} />
            <Route path="assistant" element={<AIAssistantPage />} />
            <Route path="actualites" element={<NewsPage />} />
            <Route path="blog" element={<BlogAdminPage />} />
            <Route path="social-media" element={<SocialMediaPage />} />
            <Route path="parametres" element={<SettingsPage />} />
            <Route path="things" element={<ThingsPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="editorial" element={<EditorialCalendarPage />} />
            <Route path="multilink" element={<MultilinkPage />} />
            <Route path="instagram-stories" element={<InstagramStoryPage />} />
            <Route path="nurturing" element={<NurturingPage />} />
          </Route>
          
          {/* PWA Widget Page for iPhone */}
          <Route path="/widget" element={<WidgetPage />} />
          
          {/* Public Multilink Pages */}
          <Route path="/lien-bio/:slug" element={<LinkBioPage />} />
          
          {/* Public transfer download page */}
          <Route path="/transfer/:transferId" element={<TransferDownloadPage />} />
        </Routes>
          </CustomDomainHandler>
        </BrowserRouter>
    </div>
    </ThemeProvider>
  );
}

export default App;
