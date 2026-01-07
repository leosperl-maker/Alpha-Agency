import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

// Components
import ScrollToTop from "./components/ScrollToTop";

// Pages vitrine
import HomePage from "./pages/HomePage";
import AgencyPage from "./pages/AgencyPage";
import OffersPage from "./pages/OffersPage";
import PortfolioPage from "./pages/PortfolioPage";
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
import QuotesPage from "./pages/dashboard/QuotesPage";
import InvoicesPage from "./pages/dashboard/InvoicesPage";
import SubscriptionsPage from "./pages/dashboard/SubscriptionsPage";
import PortfolioManagePage from "./pages/dashboard/PortfolioManagePage";
import DemandesPage from "./pages/dashboard/DemandesPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import DocumentsPage from "./pages/dashboard/DocumentsPage";

// Layout
import MainLayout from "./components/MainLayout";

function App() {
  return (
    <div className="App">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#0A0A0A',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#E1E1E1',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Site vitrine */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/agence" element={<AgencyPage />} />
            <Route path="/offres" element={<OffersPage />} />
            <Route path="/realisations" element={<PortfolioPage />} />
            <Route path="/actualites" element={<BlogPage />} />
            <Route path="/actualites/:slug" element={<BlogPostPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/mentions-legales" element={<LegalPage type="mentions" />} />
            <Route path="/confidentialite" element={<LegalPage type="privacy" />} />
            <Route path="/cookies" element={<LegalPage type="cookies" />} />
          </Route>
          
          {/* Dashboard - Accès caché */}
          <Route path="/alpha-admin-2024" element={<LoginPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="demandes" element={<DemandesPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="pipeline" element={<PipelinePage />} />
            <Route path="devis" element={<QuotesPage />} />
            <Route path="factures" element={<InvoicesPage />} />
            <Route path="abonnements" element={<SubscriptionsPage />} />
            <Route path="realisations" element={<PortfolioManagePage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="parametres" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
