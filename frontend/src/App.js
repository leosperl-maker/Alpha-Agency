import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Contexts
import { ThemeProvider } from "./contexts/ThemeContext";

// Components (coquille, chargée immédiatement)
import ScrollToTop from "./components/ScrollToTop";
import CustomDomainHandler from "./components/CustomDomainHandler";
import MainLayout from "./components/MainLayout";

// Chargées immédiatement : première peinture publique + login (léger)
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/dashboard/LoginPage";

// Code-splitting par route : chaque page part dans son propre chunk.
// Le CRM admin (21 pages, ~22k lignes) ne pèse plus sur le site vitrine, et vice-versa.

// Pages vitrine
const AgencyPage = lazy(() => import("./pages/AgencyPage"));
const OffersPage = lazy(() => import("./pages/OffersPage"));
const PortfolioPageNew = lazy(() => import("./pages/PortfolioPageNew"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

// Dashboard
const DashboardLayout = lazy(() => import("./pages/dashboard/DashboardLayout"));
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const NeoPage = lazy(() => import("./pages/dashboard/NeoPage"));
const ContactsPage = lazy(() => import("./pages/dashboard/ContactsPage"));
const PipelinePage = lazy(() => import("./pages/dashboard/PipelinePage"));
const InvoicesPage = lazy(() => import("./pages/dashboard/InvoicesPage"));
const PortfolioManagePage = lazy(() => import("./pages/dashboard/PortfolioManagePageNew"));
const DemandesPage = lazy(() => import("./pages/dashboard/DemandesPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const DocumentsPage = lazy(() => import("./pages/dashboard/DocumentsPage"));
const TransfersPage = lazy(() => import("./pages/dashboard/TransfersPage"));
const BudgetPage = lazy(() => import("./pages/dashboard/BudgetPage"));
const BackupPage = lazy(() => import("./pages/dashboard/BackupPage"));
const UsersPage = lazy(() => import("./pages/dashboard/UsersPage"));
const AIAssistantPage = lazy(() => import("./pages/dashboard/AIAssistantPageNew"));
const NewsPage = lazy(() => import("./pages/dashboard/NewsPage"));
const BlogAdminPage = lazy(() => import("./pages/dashboard/BlogAdminPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const ThingsPage = lazy(() => import("./pages/dashboard/ThingsPage"));
const AgendaPage = lazy(() => import("./pages/dashboard/AgendaPage"));
const EditorialCalendarPage = lazy(() => import("./pages/dashboard/EditorialCalendarPage"));
const MultilinkPage = lazy(() => import("./pages/dashboard/MultilinkPage"));

// Pages publiques annexes
const TransferDownloadPage = lazy(() => import("./pages/TransferDownloadPage"));
const LinkBioPage = lazy(() => import("./pages/public/LinkBioPage"));
const WidgetPage = lazy(() => import("./pages/WidgetPage"));

// Fallback discret pendant le chargement d'un chunk (thème-aware via tokens CSS)
function RouteLoader() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center"
      role="status"
      aria-label="Chargement"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

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
            <Suspense fallback={<RouteLoader />}>
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
            <Route path="neo" element={<NeoPage />} />
            <Route path="demandes" element={<DemandesPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="facturation" element={<InvoicesPage />} />
            <Route path="devis" element={<Navigate to="/admin/facturation?tab=devis" replace />} />
            <Route path="factures" element={<Navigate to="/admin/facturation?tab=facture" replace />} />
            <Route path="realisations" element={<PortfolioManagePage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="transferts" element={<TransfersPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="sauvegardes" element={<BackupPage />} />
            <Route path="utilisateurs" element={<UsersPage />} />
            <Route path="assistant" element={<AIAssistantPage />} />
            <Route path="actualites" element={<NewsPage />} />
            <Route path="blog" element={<BlogAdminPage />} />
            <Route path="parametres" element={<SettingsPage />} />
            <Route path="things" element={<ThingsPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="editorial" element={<EditorialCalendarPage />} />
            <Route path="multilink" element={<MultilinkPage />} />
          </Route>

          {/* PWA Widget Page for iPhone */}
          <Route path="/widget" element={<WidgetPage />} />

          {/* Public Multilink Pages */}
          <Route path="/lien-bio/:slug" element={<LinkBioPage />} />

          {/* Public transfer download page */}
          <Route path="/transfer/:transferId" element={<TransferDownloadPage />} />
        </Routes>
            </Suspense>
          </CustomDomainHandler>
        </BrowserRouter>
    </div>
    </ThemeProvider>
  );
}

export default App;
