import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (open && contactId) {
      fetchData();
    }
  }, [open, contactId]);

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
    nouveau: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
    contacté: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
    qualifié: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
    proposition: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
    négociation: { bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
    en_discussion: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
    client: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
    gagné: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
    perdu: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" }
  };

  const scoreColors = {
    froid: { bg: "bg-blue-100", text: "text-blue-700", icon: "❄️" },
    tiède: { bg: "bg-yellow-100", text: "text-yellow-700", icon: "🌤️" },
    chaud: { bg: "bg-red-100", text: "text-red-700", icon: "🔥" }
  };

  const quoteStatusColors = {
    brouillon: "bg-white/10 text-white/80",
    envoyé: "bg-blue-500/20 text-blue-400",
    accepté: "bg-green-500/20 text-green-400",
    refusé: "bg-red-500/20 text-red-400"
  };

  const invoiceStatusColors = {
    brouillon: "bg-white/10 text-white/80",
    en_attente: "bg-blue-500/20 text-blue-400",
    envoyee: "bg-purple-500/20 text-purple-400",
    "partiellement_payée": "bg-orange-500/20 text-orange-400",
    "payée": "bg-green-500/20 text-green-400",
    payee: "bg-green-500/20 text-green-400",
    en_retard: "bg-red-500/20 text-red-400",
    annulee: "bg-white/10 text-white/50"
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

  // Generate timeline items from history
  const getTimelineItems = () => {
    if (!history) return [];
    
    const items = [];
    
    // Add quotes to timeline
    history.quotes?.forEach(quote => {
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
    history.invoices?.forEach(invoice => {
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
    history.tasks?.forEach(task => {
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
    
    // Add opportunities to timeline
    history.opportunities?.forEach(opp => {
      items.push({
        type: 'opportunity',
        date: opp.created_at,
        title: opp.title,
        subtitle: formatCurrency(opp.amount),
        status: opp.stage,
        icon: Target,
        color: 'orange',
        data: opp
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[500px] md:max-w-[600px] p-0 bg-[#0a0a14] border-l border-white/10 overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : contact ? (
          <div className="flex flex-col h-full">
            {/* Header - Glassmorphic Style */}
            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white p-4 sm:p-6">
              {/* Quick Actions */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-1">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                >
                  <Star className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                  onClick={() => navigate(`/admin/contacts?edit=${contact.id}`)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold truncate">
                    {contact.first_name} {contact.last_name}
                  </h2>
                  {contact.company && (
                    <p className="text-white/80 flex items-center gap-1.5 mt-0.5 text-sm">
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
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5/10 hover:bg-white/5/20 rounded-lg transition-colors text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Email</span>
                  </a>
                )}
                {contact.phone && (
                  <a 
                    href={`tel:${contact.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5/10 hover:bg-white/5/20 rounded-lg transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">Appeler</span>
                  </a>
                )}
                <Button
                  size="sm"
                  className="flex-1 bg-white/5 text-[#CE0202] hover:bg-white/5/90 text-sm"
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
              <div className="grid grid-cols-4 gap-2 p-3 sm:p-4 bg-white/5 border-b border-white/10">
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-white">{history.summary.quotes || 0}</p>
                  <p className="text-[10px] sm:text-xs text-white/60">Devis</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-white">{history.summary.invoices || 0}</p>
                  <p className="text-[10px] sm:text-xs text-white/60">Factures</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-[#CE0202]">{formatCurrency(history.summary.total_revenue || 0).replace('€', '')}</p>
                  <p className="text-[10px] sm:text-xs text-white/60">CA</p>
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-white">{history.summary.tasks || 0}</p>
                  <p className="text-[10px] sm:text-xs text-white/60">Tâches</p>
                </div>
              </div>
            )}

            {/* Tabs - Pipedrive Style */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-4 mx-3 sm:mx-4 mt-3 bg-white/5 h-9">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white/5 text-xs sm:text-sm px-1 sm:px-2">
                  <User className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Profil</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-white/5 text-xs sm:text-sm px-1 sm:px-2">
                  <History className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Activité</span>
                </TabsTrigger>
                <TabsTrigger value="deals" className="data-[state=active]:bg-white/5 text-xs sm:text-sm px-1 sm:px-2">
                  <DollarSign className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Affaires</span>
                </TabsTrigger>
                <TabsTrigger value="docs" className="data-[state=active]:bg-white/5 text-xs sm:text-sm px-1 sm:px-2">
                  <FileText className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="editorial" className="data-[state=active]:bg-white/5 text-xs sm:text-sm px-1 sm:px-2">
                  <CalendarDays className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Éditorial</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pt-3">
                    {/* Contact Details Card */}
                    <Card className="border-white/10">
                      <CardContent className="p-3 sm:p-4 space-y-3">
                        <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                          <User className="w-4 h-4 text-[#CE0202]" />
                          Informations
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-white/60 flex-shrink-0" />
                              <span className="text-white truncate">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-white/60 flex-shrink-0" />
                              <span className="text-white">{contact.phone}</span>
                            </div>
                          )}
                          {contact.city && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-white/60 flex-shrink-0" />
                              <span className="text-white">{contact.city}</span>
                            </div>
                          )}
                          {contact.poste && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="w-4 h-4 text-white/60 flex-shrink-0" />
                              <span className="text-white">{contact.poste}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-white/60 flex-shrink-0" />
                            <span className="text-white/60">Créé le {formatDate(contact.created_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Notes Card */}
                    {contact.note && (
                      <Card className="border-white/10">
                        <CardContent className="p-3 sm:p-4">
                          <h3 className="font-semibold text-sm text-white flex items-center gap-2 mb-2">
                            <StickyNote className="w-4 h-4 text-[#CE0202]" />
                            Notes
                          </h3>
                          <p className="text-sm text-white/60 whitespace-pre-wrap">{contact.note}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Project Type Card */}
                    {contact.project_type && (
                      <Card className="border-white/10">
                        <CardContent className="p-3 sm:p-4">
                          <h3 className="font-semibold text-sm text-white flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-[#CE0202]" />
                            Projet
                          </h3>
                          <Badge variant="outline">{contact.project_type}</Badge>
                          {contact.budget && (
                            <p className="text-sm text-white/60 mt-2">
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
                        <p className="text-white/60 text-sm">Aucune activité</p>
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
                                  <div className="bg-white/5 rounded-lg border border-white/10 p-3 hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm text-white truncate">{item.title}</p>
                                        <p className="text-xs text-white/60">{item.subtitle}</p>
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

              {/* Deals Tab */}
              <TabsContent value="deals" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pt-3">
                    {/* Opportunities */}
                    <div>
                      <h3 className="font-semibold text-sm text-white flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-[#CE0202]" />
                        Opportunités
                      </h3>
                      {history?.opportunities?.length > 0 ? (
                        <div className="space-y-2">
                          {history.opportunities.map((opp) => (
                            <Card key={opp.id} className="border-white/10 cursor-pointer hover:border-[#CE0202]/30 transition-colors">
                              <CardContent className="p-3 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-white truncate">{opp.title}</p>
                                  <p className="text-xs text-white/60">{opp.stage}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-bold text-[#CE0202]">{formatCurrency(opp.amount)}</p>
                                  <p className="text-[10px] text-white/60">{opp.probability}%</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-white/60 text-center py-4">Aucune opportunité</p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="docs" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pt-3">
                    {/* Quotes */}
                    <div>
                      <h3 className="font-semibold text-sm text-white flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-blue-600" />
                        Devis ({history?.quotes?.length || 0})
                      </h3>
                      {history?.quotes?.length > 0 ? (
                        <div className="space-y-2">
                          {history.quotes.map((quote) => (
                            <Card key={quote.id} className="border-white/10">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm text-white">{quote.quote_number}</p>
                                    <p className="text-xs text-white/60">{formatDate(quote.created_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={quoteStatusColors[quote.status] || "bg-white/10 text-white/80"}>
                                      {quote.status}
                                    </Badge>
                                    <span className="font-bold text-sm text-white">{formatCurrency(quote.total_ttc)}</span>
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
                        <p className="text-sm text-white/60 text-center py-4">Aucun devis</p>
                      )}
                    </div>

                    {/* Invoices */}
                    <div>
                      <h3 className="font-semibold text-sm text-white flex items-center gap-2 mb-3">
                        <Receipt className="w-4 h-4 text-purple-600" />
                        Factures ({history?.invoices?.length || 0})
                      </h3>
                      {history?.invoices?.length > 0 ? (
                        <div className="space-y-2">
                          {history.invoices.map((invoice) => (
                            <Card key={invoice.id} className="border-white/10">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm text-white">{invoice.invoice_number}</p>
                                    <p className="text-xs text-white/60">{formatDate(invoice.created_at)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={invoiceStatusColors[invoice.status] || "bg-white/10 text-white/80"}>
                                      {invoice.status}
                                    </Badge>
                                    <span className="font-bold text-sm text-white">{formatCurrency(invoice.total_ttc)}</span>
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
                        <p className="text-sm text-white/60 text-center py-4">Aucune facture</p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Editorial Calendar Tab */}
              <TabsContent value="editorial" className="flex-1 overflow-hidden mt-0 px-3 sm:px-4 pb-4">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pt-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">Calendriers Éditoriaux</h3>
                      <Button
                        size="sm"
                        onClick={() => navigate('/admin/editorial')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Nouveau
                      </Button>
                    </div>

                    {editorialCalendars.length > 0 ? (
                      <div className="space-y-3">
                        {editorialCalendars.map((calendar) => (
                          <Card key={calendar.id} className="border-white/10 hover:border-white/20 transition-colors cursor-pointer" onClick={() => navigate('/admin/editorial')}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: calendar.color || '#6366f1' }}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-medium truncate">{calendar.title}</h4>
                                  {calendar.description && (
                                    <p className="text-white/60 text-sm truncate">{calendar.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="border-white/20 text-white/60">
                                  {calendar.post_count || 0} posts
                                </Badge>
                                <ChevronRight className="w-4 h-4 text-white/40" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-white/10 border-dashed">
                        <CardContent className="p-8 text-center">
                          <CalendarDays className="w-12 h-12 mx-auto text-white/20 mb-3" />
                          <p className="text-white/60 mb-4">Aucun calendrier éditorial pour ce contact</p>
                          <Button
                            size="sm"
                            onClick={() => navigate('/admin/editorial')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
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
            <p className="text-white/60">Contact non trouvé</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ContactDetailSheet;
