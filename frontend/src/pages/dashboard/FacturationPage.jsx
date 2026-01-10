import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Plus, 
  FileText, 
  Receipt, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Euro,
  Loader2,
  XCircle,
  CreditCard,
  Banknote,
  CalendarDays,
  PiggyBank,
  ArrowRightLeft,
  Send,
  Check,
  Package
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { quotesAPI, invoicesAPI, contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const FacturationPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'devis';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Stats
  const [stats, setStats] = useState({
    totalQuotes: 0,
    totalInvoices: 0,
    pendingQuotes: 0,
    pendingInvoices: 0,
    totalQuoted: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    totalDue: 0
  });

  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "virement",
    notes: ""
  });
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesRes, invoicesRes, contactsRes] = await Promise.all([
        quotesAPI.getAll(),
        invoicesAPI.getAll(),
        contactsAPI.getAll()
      ]);
      
      setQuotes(quotesRes.data);
      setInvoices(invoicesRes.data);
      setContacts(contactsRes.data);
      
      // Calculate stats
      const totalQuoted = quotesRes.data.reduce((sum, q) => sum + (q.total || 0), 0);
      const totalInvoiced = invoicesRes.data.reduce((sum, i) => sum + (i.total || 0), 0);
      const totalPaid = invoicesRes.data.reduce((sum, i) => sum + (i.total_paid || 0), 0);
      
      setStats({
        totalQuotes: quotesRes.data.length,
        totalInvoices: invoicesRes.data.length,
        pendingQuotes: quotesRes.data.filter(q => q.status === 'envoyé').length,
        pendingInvoices: invoicesRes.data.filter(i => ['en_attente', 'envoyee', 'partiellement_payée'].includes(i.status)).length,
        totalQuoted,
        totalInvoiced,
        totalPaid,
        totalDue: totalInvoiced - totalPaid
      });
    } catch (error) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : "Client inconnu";
  };

  const getContactCompany = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.company || "";
  };

  // Quote functions
  const handleConvertToInvoice = async (quoteId) => {
    try {
      const response = await quotesAPI.convertToInvoice(quoteId);
      const invoiceNumber = response.data?.invoice_number || '';
      toast.success(`Facture ${invoiceNumber} créée`, {
        action: {
          label: "Voir",
          onClick: () => setActiveTab('factures')
        }
      });
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la conversion");
    }
  };

  const handleDownloadQuotePDF = async (quote) => {
    try {
      await quotesAPI.downloadPDF(quote.id, quote.quote_number);
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleDeleteQuote = async (quoteId) => {
    if (!window.confirm("Supprimer ce devis ?")) return;
    try {
      await quotesAPI.delete(quoteId);
      toast.success("Devis supprimé");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleQuoteStatusUpdate = async (quoteId, status) => {
    try {
      await quotesAPI.update(quoteId, { status });
      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Invoice functions
  const handleDownloadInvoicePDF = async (invoice) => {
    try {
      await invoicesAPI.downloadPDF(invoice.id, invoice.invoice_number);
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm("Supprimer cette facture ?")) return;
    try {
      await invoicesAPI.delete(invoiceId);
      toast.success("Facture supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleInvoiceStatusUpdate = async (invoiceId, status) => {
    try {
      await invoicesAPI.updateStatus(invoiceId, status);
      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Payment functions
  const openPaymentDialog = (invoice) => {
    setSelectedInvoiceForPayment(invoice);
    const remaining = (invoice.total || 0) - (invoice.total_paid || 0);
    setPaymentForm({
      amount: remaining > 0 ? remaining.toFixed(2) : "",
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: "virement",
      notes: ""
    });
    setPaymentDialogOpen(true);
  };

  const handleAddPayment = async () => {
    if (!selectedInvoiceForPayment || !paymentForm.amount) {
      toast.error("Veuillez saisir un montant");
      return;
    }
    setSavingPayment(true);
    try {
      const response = await invoicesAPI.addPayment(selectedInvoiceForPayment.id, {
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes
      });
      toast.success(`Paiement enregistré`);
      setPaymentDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingPayment(false);
    }
  };

  // Quote status config
  const quoteStatusConfig = {
    brouillon: { label: "Brouillon", color: "bg-white/10 text-white/60" },
    envoyé: { label: "Envoyé", color: "bg-blue-500/20 text-blue-400" },
    accepté: { label: "Accepté", color: "bg-green-500/20 text-green-400" },
    refusé: { label: "Refusé", color: "bg-red-500/20 text-red-400" }
  };

  // Invoice status config  
  const invoiceStatusConfig = {
    brouillon: { label: "Brouillon", color: "bg-white/10 text-white/60", icon: FileText },
    en_attente: { label: "En attente", color: "bg-blue-500/20 text-blue-400", icon: Clock },
    envoyee: { label: "Envoyée", color: "bg-purple-500/20 text-purple-400", icon: Mail },
    "partiellement_payée": { label: "Partiel", color: "bg-orange-500/20 text-orange-400", icon: PiggyBank },
    "payée": { label: "Payée", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
    payee: { label: "Payée", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
    en_retard: { label: "En retard", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
    annulee: { label: "Annulée", color: "bg-gray-100 text-gray-500", icon: XCircle }
  };

  const paymentMethods = {
    virement: { label: "Virement", icon: Banknote },
    cheque: { label: "Chèque", icon: FileText },
    carte: { label: "Carte bancaire", icon: CreditCard },
    especes: { label: "Espèces", icon: Euro }
  };

  // Filtered data
  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = getContactName(q.contact_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.quote_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = getContactName(i.contact_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Facturation</h1>
            <p className="text-white/60 text-xs sm:text-sm">Gérez vos devis et factures</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => navigate('/admin/factures?action=services')}
            variant="outline"
            className="border-white/10 text-white/60 hover:bg-white/5 flex-1 sm:flex-none text-sm"
          >
            <Package className="w-4 h-4 mr-1 sm:mr-2" />
            Services
          </Button>
          <Button
            onClick={() => navigate('/admin/factures?action=new&type=devis')}
            variant="outline"
            className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/10 flex-1 sm:flex-none text-sm"
          >
            <FileText className="w-4 h-4 mr-1 sm:mr-2" />
            Devis
          </Button>
          <Button
            onClick={() => navigate('/admin/factures?action=new&type=facture')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1 sm:flex-none text-sm"
          >
            <Receipt className="w-4 h-4 mr-1 sm:mr-2" />
            Facture
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex-shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalQuotes}</p>
              <p className="text-[10px] sm:text-xs text-white/60 truncate">Devis ({stats.pendingQuotes} en att.)</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex-shrink-0 bg-purple-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalInvoices}</p>
              <p className="text-[10px] sm:text-xs text-white/60 truncate">Factures ({stats.pendingInvoices} en cours)</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex-shrink-0 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg font-bold text-green-600 truncate">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-[10px] sm:text-xs text-white/60">Encaissé</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex-shrink-0 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg font-bold text-orange-600 truncate">{formatCurrency(stats.totalDue)}</p>
              <p className="text-[10px] sm:text-xs text-white/60">À encaisser</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col gap-3 mb-4">
          <TabsList className="bg-white/5 p-1 w-full sm:w-auto">
            <TabsTrigger 
              value="devis" 
              className="flex-1 sm:flex-none data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Devis ({quotes.length})
            </TabsTrigger>
            <TabsTrigger 
              value="factures"
              className="flex-1 sm:flex-none data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs sm:text-sm"
            >
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Factures ({invoices.length})
            </TabsTrigger>
          </TabsList>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 backdrop-blur-xl border-white/10 w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32 bg-white/5 backdrop-blur-xl border-white/10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                <SelectItem value="all">Tous</SelectItem>
                {activeTab === 'devis' ? (
                  <>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="envoyé">Envoyé</SelectItem>
                    <SelectItem value="accepté">Accepté</SelectItem>
                    <SelectItem value="refusé">Refusé</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="envoyee">Envoyée</SelectItem>
                    <SelectItem value="partiellement_payée">Partiel</SelectItem>
                    <SelectItem value="payée">Payée</SelectItem>
                    <SelectItem value="en_retard">En retard</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quotes Tab */}
        <TabsContent value="devis" className="mt-0">
          <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase">Numéro</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase hidden md:table-cell">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Montant</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-white/60 uppercase">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/60">
                      Aucun devis trouvé
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((quote) => {
                    const status = quoteStatusConfig[quote.status] || quoteStatusConfig.brouillon;
                    return (
                      <tr key={quote.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-mono font-medium text-white text-sm">{quote.quote_number}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-white text-sm">{getContactName(quote.contact_id)}</p>
                            {getContactCompany(quote.contact_id) && (
                              <p className="text-xs text-white/60">{getContactCompany(quote.contact_id)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-white/60 hidden md:table-cell">
                          {formatDate(quote.created_at)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-mono font-bold text-white text-sm">{formatCurrency(quote.total)}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className={status.color}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {quote.status === "envoyé" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleConvertToInvoice(quote.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-2"
                                title="Convertir en facture"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white/5 backdrop-blur-xl border-white/10">
                                <DropdownMenuItem onClick={() => navigate(`/admin/factures?action=view&id=${quote.id}&type=devis`)} className="cursor-pointer">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadQuotePDF(quote)} className="cursor-pointer">
                                  <Download className="w-4 h-4 mr-2" />
                                  PDF
                                </DropdownMenuItem>
                                {quote.status === "brouillon" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleQuoteStatusUpdate(quote.id, "envoyé")}
                                    className="cursor-pointer text-blue-600"
                                  >
                                    <Send className="w-4 h-4 mr-2" />
                                    Envoyer
                                  </DropdownMenuItem>
                                )}
                                {quote.status === "envoyé" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleConvertToInvoice(quote.id)}
                                    className="cursor-pointer text-green-600"
                                  >
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Facturer
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteQuote(quote.id)}
                                  className="cursor-pointer text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="factures" className="mt-0">
          <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase">Numéro</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase hidden md:table-cell">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Montant</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Payé</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-white/60 uppercase">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/60">
                      Aucune facture trouvée
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const status = invoiceStatusConfig[invoice.status] || invoiceStatusConfig.brouillon;
                    const StatusIcon = status.icon || FileText;
                    const totalPaid = invoice.total_paid || 0;
                    const remaining = (invoice.total || 0) - totalPaid;
                    const paymentProgress = invoice.total > 0 ? (totalPaid / invoice.total) * 100 : 0;
                    const isPaid = invoice.status === 'payée' || invoice.status === 'payee';
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4">
                          <span className="font-mono font-medium text-white text-sm">{invoice.invoice_number}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-white text-sm">{getContactName(invoice.contact_id)}</p>
                            {getContactCompany(invoice.contact_id) && (
                              <p className="text-xs text-white/60">{getContactCompany(invoice.contact_id)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-white/60 hidden md:table-cell">
                          {formatDate(invoice.created_at)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-mono font-bold text-white text-sm">{formatCurrency(invoice.total)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`font-mono text-sm ${isPaid ? 'text-green-600 font-bold' : 'text-white/60'}`}>
                              {formatCurrency(totalPaid)}
                            </span>
                            {invoice.total > 0 && totalPaid > 0 && totalPaid < invoice.total && (
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-orange-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                                />
                              </div>
                            )}
                            {remaining > 0 && !isPaid && invoice.status !== 'brouillon' && invoice.status !== 'annulee' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs text-indigo-400 hover:text-indigo-400 hover:bg-indigo-600/10"
                                onClick={() => openPaymentDialog(invoice)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Paiement
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className={`${status.color} flex items-center gap-1 w-fit mx-auto`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/5 backdrop-blur-xl border-white/10">
                              <DropdownMenuItem onClick={() => navigate(`/admin/factures?action=view&id=${invoice.id}&type=facture`)} className="cursor-pointer">
                                <Eye className="w-4 h-4 mr-2" />
                                Voir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadInvoicePDF(invoice)} className="cursor-pointer">
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </DropdownMenuItem>
                              {!isPaid && invoice.status !== 'brouillon' && invoice.status !== 'annulee' && (
                                <DropdownMenuItem 
                                  onClick={() => openPaymentDialog(invoice)}
                                  className="cursor-pointer text-indigo-400"
                                >
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Paiement
                                </DropdownMenuItem>
                              )}
                              {!isPaid && (
                                <DropdownMenuItem 
                                  onClick={() => handleInvoiceStatusUpdate(invoice.id, "payée")}
                                  className="cursor-pointer text-green-600"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Marquer payée
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                className="cursor-pointer text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Enregistrer un paiement
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoiceForPayment && (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Facture</span>
                  <span className="font-mono font-medium">{selectedInvoiceForPayment.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Total TTC</span>
                  <span className="font-mono">{formatCurrency(selectedInvoiceForPayment.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Déjà payé</span>
                  <span className="font-mono text-green-600">{formatCurrency(selectedInvoiceForPayment.total_paid || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2">
                  <span className="text-white">Reste à payer</span>
                  <span className="font-mono text-indigo-400">
                    {formatCurrency((selectedInvoiceForPayment.total || 0) - (selectedInvoiceForPayment.total_paid || 0))}
                  </span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Montant *</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Date du paiement *</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                    <Input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Méthode de paiement</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {Object.entries(paymentMethods).map(([key, method]) => {
                        const Icon = method.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {method.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Notes (optionnel)</Label>
                  <Textarea
                    placeholder="Référence de virement, numéro de chèque..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleAddPayment}
                  disabled={savingPayment || !paymentForm.amount}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FacturationPage;
