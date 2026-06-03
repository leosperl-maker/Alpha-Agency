import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  CalendarDays,
  FileText,
  Receipt,
  CheckSquare,
  TrendingUp,
  TrendingDown,
  Euro,
  ExternalLink,
  User,
  MapPin,
  Briefcase,
  StickyNote,
  Clock,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Pencil,
  Plus,
  History,
  DollarSign,
  Target,
  Activity,
  Send,
  Eye,
  Download,
  MoreVertical,
  Star,
  X,
  BarChart3,
  Users
} from "lucide-react";
import { contactsAPI, quotesAPI, invoicesAPI } from "../lib/api";
import api from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ContactDetailSheet = ({ open, onOpenChange, contactId }) => {
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [history, setHistory] = useState(null);
  const [editorialCalendars, setEditorialCalendars] = useState([]);
  const [financialData, setFinancialData] = useState(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (open && contactId) {
      fetchData();
    }
  }, [open, contactId]);

  // Fetch financial data when contact has SIRET
  useEffect(() => {
    if (contact?.siret) {
      fetchFinancialData(contact.siret);
    }
  }, [contact?.siret]);

  const fetchFinancialData = async (siret) => {
    if (!siret) return;
    setLoadingFinancials(true);
    try {
      const response = await api.get(`/societe/company/${siret}`);
      if (response.data?.success) {
        setFinancialData(response.data.company);
      }
    } catch (error) {
      console.log("No financial data available for this SIRET");
    } finally {
      setLoadingFinancials(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactRes, historyRes, calendarsRes] = await Promise.all([
        contactsAPI.getOne(contactId),
        contactsAPI.getHistory(contactId),
        api.get(`/editorial/contact/${contactId}/calendars`).catch(() => ({ data: [] }))
      ]);
      setContact(contactRes.data);
      setHistory(historyRes.data);
      setEditorialCalendars(calendarsRes.data || []);
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!contact) return;
    const next = !contact.favorite;
    setContact({ ...contact, favorite: next });
    try {
      await contactsAPI.update(contact.id, { favorite: next });
    } catch (e) {
      setContact({ ...contact, favorite: !next });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const statusColors = {
    nouveau: { bg: "bg-info-soft", text: "text-info", dot: "bg-info" },
    contacté: { bg: "bg-brand-soft", text: "text-primary", dot: "bg-brand" },
    qualifié: { bg: "bg-warning-soft", text: "text-warning", dot: "bg-warning" },
    proposition: { bg: "bg-warning-soft", text: "text-warning", dot: "bg-warning" },
    négociation: { bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
    en_discussion: { bg: "bg-brand-soft", text: "text-primary", dot: "bg-brand" },
    client: { bg: "bg-success-soft", text: "text-success", dot: "bg-success" },
    gagné: { bg: "bg-success-soft", text: "text-success", dot: "bg-success" },
    perdu: { bg: "bg-danger-soft", text: "text-danger", dot: "bg-danger" }
  };

  const scoreColors = {
    froid: { bg: "bg-info-soft", text: "text-info", icon: "❄️" },
    tiède: { bg: "bg-warning-soft", text: "text-warning", icon: "🌤️" },
    chaud: { bg: "bg-danger-soft", text: "text-danger", icon: "🔥" }
  };

  const quoteStatusColors = {
    brouillon: "bg-secondary text-foreground",
    envoyé: "bg-info-soft text-info",
    accepté: "bg-success-soft text-success",
    refusé: "bg-danger-soft text-danger"
  };

  const invoiceStatusColors = {
    brouillon: "bg-secondary text-foreground",
    en_attente: "bg-info-soft text-info",
    envoyee: "bg-brand-soft text-primary",
    "partiellement_payée": "bg-warning-soft text-orange-400",
    "payée": "bg-success-soft text-success",
    payee: "bg-success-soft text-success",
    en_retard: "bg-danger-soft text-danger",
    annulee: "bg-secondary text-muted-foreground"
  };

  const handleDownloadQuotePDF = async (quote) => {
    try {
      await quotesAPI.downloadPDF(quote.id, quote.quote_number);
      toast.success("PDF téléchargé");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleDownloadInvoicePDF = async (invoice) => {
    try {
      await invoicesAPI.downloadPDF(invoice.id, invoice.invoice_number);
      toast.success("PDF téléchargé");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  // Generate timeline items — fil unifié (lead, relance Néo, devis, factures, tâches)
  const getTimelineItems = () => {
    const items = [];

    // Fiche créée (point de départ du lead)
    if (contact?.created_at) {
      items.push({
        type: 'lead', date: contact.created_at, title: 'Fiche créée',
        subtitle: contact.source ? `Source : ${contact.source}` : 'Contact',
        icon: User, color: 'blue', data: {}
      });
    }
    // Relance envoyée par Néo
    if (contact?.last_followup_at) {
      items.push({
        type: 'relance', date: contact.last_followup_at, title: 'Relance envoyée',
        subtitle: 'Email', icon: Send, color: 'green', data: {}
      });
    }

    // Add quotes to timeline
    history?.quotes?.forEach(quote => {
      items.push({
        type: 'quote',
        date: quote.created_at,
        title: `Devis ${quote.quote_number}`,
        subtitle: formatCurrency(quote.total_ttc),
        status: quote.status,
        icon: FileText,
        color: 'blue',
        data: quote
      });
    });
    
    // Add invoices to timeline
    history?.invoices?.forEach(invoice => {
      items.push({
        type: 'invoice',
        date: invoice.created_at,
        title: `Facture ${invoice.invoice_number}`,
        subtitle: formatCurrency(invoice.total_ttc),
        status: invoice.status,
        icon: Receipt,
        color: 'purple',
        data: invoice
      });
    });
    
    // Add tasks to timeline
    history?.tasks?.forEach(task => {
      items.push({
        type: 'task',
        date: task.created_at,
        title: task.title,
        subtitle: task.status === 'done' ? 'Terminée' : 'En cours',
        status: task.status,
        icon: CheckSquare,
        color: task.status === 'done' ? 'green' : 'yellow',
        data: task
      });
    });
    
    // Sort by date descending
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (!open) return null;

  const statusConfig = statusColors[contact?.status] || statusColors.nouveau;
  const scoreConfig = scoreColors[contact?.score] || scoreColors.froid;
  const timeline = getTimelineItems();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 gap-0 bg-card border-border max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Fiche du contact</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : contact ? (
          <div className="flex flex-col">
            {/* Header - Glassmorphic Style */}
            <div className="relative bg-gradient-to-br from-[#E11D2E] via-[#9A1230] to-[#3A0A1B] text-white p-4 sm:p-6">
              {/* Quick Actions */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleFavorite}
                  title={contact.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  className={`hover:bg-white/15 h-8 w-8 p-0 ${contact.favorite ? "text-yellow-300 hover:text-yellow-200" : "text-white/80 hover:text-white"}`}
                >
                  <Star className={`w-4 h-4 ${contact.favorite ? "fill-yellow-300" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/15 h-8 w-8 p-0"
                  onClick={() => navigate(`/admin/contacts?edit=${contact.id}`)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded-md text-white/80 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-card/20 backdrop-blur rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">
                    {contact.first_name} {contact.last_name}
                  </h2>
                  {contact.company && (
                    <p className="text-foreground flex items-center gap-1.5 mt-0.5 text-sm">
                      <Building className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{contact.company}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge className={`${statusConfig.bg} ${statusConfig.text} text-xs`}>
                      {contact.status}
                    </Badge>
                    <Badge className={`${scoreConfig.bg} ${scoreConfig.text} text-xs`}>
                      {scoreConfig.icon} {contact.score}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick Contact Actions - Mobile Friendly */}
              <div className="flex gap-2 mt-4">
                {contact.email && (
                  <a 
                    href={`mailto:${contact.email}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-card/10 hover:bg-secondary/20 rounded-lg transition-colors text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Email</span>
                  </a>
                )}
                {contact.phone && (
                  <a 
                    href={`tel:${contact.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-card/10 hover:bg-secondary/20 rounded-lg transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">Appeler</span>
                  </a>
                )}
                <Button
                  size="sm"
                  className="flex-1 bg-card text-[#CE0202] hover:bg-secondary/90 text-sm"
                  onClick={() => navigate(`/admin/factures?action=new&type=devis&contact=${contact.id}`)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Nouveau devis</span>
                  <span className="sm:hidden">Devis</span>
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            {history?.summary && (
              <div className="grid grid-cols-4 gap-2 p-3 sm:p-4 bg-card border-b border-border">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-foreground">{history.summary.quotes || 0}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Devis</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-foreground">{history.summary.invoices || 0}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Factures</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-[#CE0202]">{formatCurrency(history.summary.total_revenue || 0).replace('€', '')}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">CA</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-foreground">{history.summary.tasks || 0}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Tâches</p>
                </div>
              </div>
            )}

            {/* Tabs - Pipedrive Style */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-5 mx-3 sm:mx-4 mt-3 bg-card h-9">
                <TabsTrigger value="overview" className="data-[state=active]:bg-card text-xs sm:text-sm px-1 sm:px-2">
                  <User className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Profil</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-card text-xs sm:text-sm px-1 sm:px-2">
                  <History className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Activité</span>
                </TabsTrigger>
                <TabsTrigger value="docs" className="data-[state=active]:bg-card text-xs sm:text-sm px-1 sm:px-2">
                  <FileText className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Docs</span>
                </TabsTrigger>
                {contact?.siret && (
                  <TabsTrigger value="finances" className="data-[state=active]:bg-card text-xs sm:text-sm px-1 sm:px-2">
                    <BarChart3 className="w-3.5 h-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Finances</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="editorial" className="data-[state=active]:bg-card text-xs sm:text-sm px-1 sm:px-2">
                  <CalendarDays className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Éditorial</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pt-3">
                    {/* Contact Details Card */}
                    <Card className="border-border">
                      <CardContent className="p-3 sm:p-4 space-y-3">
                        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                          <User className="w-4 h-4 text-[#CE0202]" />
                          Informations
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{contact.phone}</span>
                            </div>
                          )}
                          {contact.city && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{contact.city}</span>
                            </div>
                          )}
                          {contact.poste && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{contact.poste}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">Créé le {formatDate(contact.created_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Notes Card */}
                    {contact.note && (
                      <Card className="border-border">
                        <CardContent className="p-3 sm:p-4">
                          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
                            <StickyNote className="w-4 h-4 text-[#CE0202]" />
                            Notes
                          </h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.note}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Project Type Card */}
                    {contact.project_type && (
                      <Card className="border-border">
                        <CardContent className="p-3 sm:p-4">
                          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-[#CE0202]" />
                            Projet
                          </h3>
                          <Badge variant="outline">{contact.project_type}</Badge>
                          {contact.budget && (
                            <p className="text-sm text-muted-foreground mt-2">
                              Budget: <span className="font-semibold text-[#CE0202]">{contact.budget}</span>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Timeline Tab - Pipedrive Style */}
              <TabsContent value="timeline" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="pt-3">
                    {timeline.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-10 h-10 mx-auto text-[#E5E5E5] mb-3" />
                        <p className="text-muted-foreground text-sm">Aucune activité</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[#E5E5E5]" />
                        
                        <div className="space-y-4">
                          {timeline.map((item, idx) => {
                            const IconComponent = item.icon;
                            return (
                              <div key={idx} className="flex gap-3 relative">
                                {/* Icon dot */}
                                <div className={`w-10 h-10 rounded-full bg-${item.color}-100 flex items-center justify-center flex-shrink-0 z-10 border-2 border-white shadow-sm`}>
                                  <IconComponent className={`w-4 h-4 text-${item.color}-600`} />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0 pb-2">
                                  <div className="bg-card rounded-lg border border-border p-3 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                                      </div>
                                      {item.status && (
                                        <Badge className="text-[10px] flex-shrink-0">
                                          {item.status}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-[#999999] mt-2">
                                      {formatDateTime(item.date)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="docs" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pt-3">
                    {/* Quotes */}
                    <div>
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-info" />
                        Devis ({history?.quotes?.length || 0})
                      </h3>
                      {history?.quotes?.length > 0 ? (
                        <div className="space-y-2">
                          {history.quotes.map((quote) => (
                            <Card key={quote.id} className="border-border">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm text-foreground">{quote.quote_number}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(quote.created_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={quoteStatusColors[quote.status] || "bg-secondary text-foreground"}>
                                      {quote.status}
                                    </Badge>
                                    <span className="font-bold text-sm text-foreground">{formatCurrency(quote.total_ttc)}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleDownloadQuotePDF(quote)}
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Aucun devis</p>
                      )}
                    </div>

                    {/* Invoices */}
                    <div>
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-3">
                        <Receipt className="w-4 h-4 text-primary" />
                        Factures ({history?.invoices?.length || 0})
                      </h3>
                      {history?.invoices?.length > 0 ? (
                        <div className="space-y-2">
                          {history.invoices.map((invoice) => (
                            <Card key={invoice.id} className="border-border">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm text-foreground">{invoice.invoice_number}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(invoice.created_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={invoiceStatusColors[invoice.status] || "bg-secondary text-foreground"}>
                                      {invoice.status}
                                    </Badge>
                                    <span className="font-bold text-sm text-foreground">{formatCurrency(invoice.total_ttc)}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleDownloadInvoicePDF(invoice)}
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Aucune facture</p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Financial Data Tab - Societe.com */}
              {contact?.siret && (
                <TabsContent value="finances" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 pt-3">
                      {loadingFinancials ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : financialData ? (
                        <>
                          {/* Company Info */}
                          <Card className="border-border bg-gradient-to-br from-[#E11D2E]/15 to-[#7A0F2B]/15">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                                  <Building className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-bold text-foreground text-lg">{financialData.nom}</h3>
                                  <p className="text-muted-foreground text-sm">{financialData.forme_juridique}</p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant="outline" className="border-primary/40 text-primary">
                                      SIREN: {financialData.siren}
                                    </Badge>
                                    {financialData.siret && (
                                      <Badge variant="outline" className="border-primary/40 text-primary">
                                        SIRET: {financialData.siret}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Company Details */}
                              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                                {financialData.ville && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="w-4 h-4" />
                                    <span>{financialData.code_postal} {financialData.ville}</span>
                                  </div>
                                )}
                                {financialData.activite && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Briefcase className="w-4 h-4" />
                                    <span className="truncate">{financialData.activite}</span>
                                  </div>
                                )}
                                {financialData.tranche_effectif && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users className="w-4 h-4" />
                                    <span>{financialData.tranche_effectif}</span>
                                  </div>
                                )}
                                {financialData.capital_social > 0 && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Euro className="w-4 h-4" />
                                    <span>Capital: {formatCurrency(financialData.capital_social)}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Directors */}
                          {financialData.dirigeants && financialData.dirigeants.length > 0 && (
                            <Card className="border-border">
                              <CardContent className="p-4">
                                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                                  <User className="w-4 h-4 text-primary" />
                                  Dirigeants
                                </h3>
                                <div className="space-y-2">
                                  {financialData.dirigeants.map((d, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-card rounded-lg">
                                      <span className="text-foreground font-medium">{d.nom}</span>
                                      <Badge variant="outline" className="text-xs">{d.fonction}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Financial Statements - Bilans */}
                          {financialData.bilans && financialData.bilans.length > 0 && (
                            <Card className="border-border">
                              <CardContent className="p-4">
                                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                                  <BarChart3 className="w-4 h-4 text-success" />
                                  Bilans Publics
                                </h3>
                                <div className="space-y-3">
                                  {financialData.bilans.map((bilan, idx) => (
                                    <div key={idx} className="bg-card rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <Badge className="bg-brand-soft text-primary">{bilan.annee}</Badge>
                                        {idx > 0 && financialData.bilans[idx-1] && bilan.chiffre_affaires && financialData.bilans[idx-1].chiffre_affaires && (
                                          <div className="flex items-center gap-1 text-xs">
                                            {bilan.chiffre_affaires > financialData.bilans[idx-1].chiffre_affaires ? (
                                              <>
                                                <TrendingUp className="w-3 h-3 text-success" />
                                                <span className="text-success">
                                                  +{(((bilan.chiffre_affaires - financialData.bilans[idx-1].chiffre_affaires) / financialData.bilans[idx-1].chiffre_affaires) * 100).toFixed(1)}%
                                                </span>
                                              </>
                                            ) : (
                                              <>
                                                <TrendingDown className="w-3 h-3 text-danger" />
                                                <span className="text-danger">
                                                  {(((bilan.chiffre_affaires - financialData.bilans[idx-1].chiffre_affaires) / financialData.bilans[idx-1].chiffre_affaires) * 100).toFixed(1)}%
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        {bilan.chiffre_affaires !== null && bilan.chiffre_affaires !== undefined && (
                                          <div>
                                            <p className="text-muted-foreground text-xs">Chiffre d'affaires</p>
                                            <p className="text-foreground font-semibold">{formatCurrency(bilan.chiffre_affaires)}</p>
                                          </div>
                                        )}
                                        {bilan.resultat_net !== null && bilan.resultat_net !== undefined && (
                                          <div>
                                            <p className="text-muted-foreground text-xs">Résultat net</p>
                                            <p className={`font-semibold ${bilan.resultat_net >= 0 ? 'text-success' : 'text-danger'}`}>
                                              {formatCurrency(bilan.resultat_net)}
                                            </p>
                                          </div>
                                        )}
                                        {bilan.effectif && (
                                          <div>
                                            <p className="text-muted-foreground text-xs">Effectif</p>
                                            <p className="text-foreground">{bilan.effectif} salariés</p>
                                          </div>
                                        )}
                                        {bilan.ebitda !== null && bilan.ebitda !== undefined && (
                                          <div>
                                            <p className="text-muted-foreground text-xs">EBITDA</p>
                                            <p className={`font-semibold ${bilan.ebitda >= 0 ? 'text-success' : 'text-danger'}`}>
                                              {formatCurrency(bilan.ebitda)}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Link to Societe.com */}
                          <a
                            href={`https://www.societe.com/societe/${financialData.siren || contact.siret}.html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 p-3 bg-card hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-sm">Voir sur Societe.com</span>
                          </a>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <BarChart3 className="w-10 h-10 mx-auto text-foreground/20 mb-3" />
                          <p className="text-muted-foreground text-sm">Aucune donnée financière disponible</p>
                          <p className="text-muted-foreground text-xs mt-1">SIRET: {contact.siret}</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {/* Editorial Calendar Tab */}
              <TabsContent value="editorial" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-foreground font-medium">Calendriers Éditoriaux</h3>
                      <Button
                        size="sm"
                        onClick={() => navigate('/admin/editorial')}
                        className="bg-primary hover:brightness-110 text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Nouveau
                      </Button>
                    </div>

                    {editorialCalendars.length > 0 ? (
                      <div className="space-y-3">
                        {editorialCalendars.map((calendar) => (
                          <Card key={calendar.id} className="border-border hover:border-border transition-colors cursor-pointer" onClick={() => navigate('/admin/editorial')}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: calendar.color || '#6366f1' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-foreground font-medium truncate">{calendar.title}</h4>
                                  {calendar.description && (
                                    <p className="text-muted-foreground text-sm truncate">{calendar.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-border text-muted-foreground">
                                  {calendar.post_count || 0} posts
                                </Badge>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-border border-dashed">
                        <CardContent className="p-8 text-center">
                          <CalendarDays className="w-12 h-12 mx-auto text-foreground/20 mb-3" />
                          <p className="text-muted-foreground mb-4">Aucun calendrier éditorial pour ce contact</p>
                          <Button
                            size="sm"
                            onClick={() => navigate('/admin/editorial')}
                            className="bg-primary hover:brightness-110 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Créer un calendrier
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Contact non trouvé</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetailSheet;
