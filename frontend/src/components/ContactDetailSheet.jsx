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
import { 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  FileText,
  Receipt,
  CheckSquare,
  TrendingUp,
  Euro,
  ExternalLink,
  User,
  MapPin,
  Briefcase,
  StickyNote,
  Clock,
  AlertCircle
} from "lucide-react";
import { contactsAPI, quotesAPI, invoicesAPI } from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ContactDetailSheet = ({ open, onOpenChange, contactId }) => {
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && contactId) {
      fetchData();
    }
  }, [open, contactId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactRes, historyRes] = await Promise.all([
        contactsAPI.getOne(contactId),
        contactsAPI.getHistory(contactId)
      ]);
      setContact(contactRes.data);
      setHistory(historyRes.data);
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
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const statusColors = {
    nouveau: "bg-blue-100 text-blue-700",
    contacté: "bg-purple-100 text-purple-700",
    qualifié: "bg-yellow-100 text-yellow-700",
    proposition: "bg-orange-100 text-orange-700",
    négociation: "bg-pink-100 text-pink-700",
    gagné: "bg-green-100 text-green-700",
    perdu: "bg-red-100 text-red-700"
  };

  const scoreColors = {
    froid: "bg-blue-100 text-blue-700",
    tiède: "bg-yellow-100 text-yellow-700",
    chaud: "bg-red-100 text-red-700"
  };

  const quoteStatusColors = {
    brouillon: "bg-gray-100 text-gray-700",
    envoyé: "bg-blue-100 text-blue-700",
    accepté: "bg-green-100 text-green-700",
    refusé: "bg-red-100 text-red-700"
  };

  const invoiceStatusColors = {
    brouillon: "bg-gray-100 text-gray-700",
    en_attente: "bg-blue-100 text-blue-700",
    envoyee: "bg-purple-100 text-purple-700",
    "partiellement_payée": "bg-orange-100 text-orange-700",
    "payée": "bg-green-100 text-green-700",
    payee: "bg-green-100 text-green-700",
    en_retard: "bg-red-100 text-red-700",
    annulee: "bg-gray-100 text-gray-500"
  };

  const taskPriorityColors = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700"
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

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] p-0 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CE0202]"></div>
          </div>
        ) : contact ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#CE0202] to-[#a00000] text-white p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{contact.first_name} {contact.last_name}</h2>
                  {contact.company && (
                    <p className="text-white/80 flex items-center gap-1 mt-1">
                      <Building className="w-4 h-4" />
                      {contact.company}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge className={statusColors[contact.status] || "bg-gray-100 text-gray-700"}>
                      {contact.status}
                    </Badge>
                    <Badge className={scoreColors[contact.score] || "bg-gray-100 text-gray-700"}>
                      {contact.score}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="px-6 py-4 border-b border-[#E5E5E5] grid grid-cols-2 gap-4 bg-[#F8F8F8]">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-[#666666] hover:text-[#CE0202]">
                  <Mail className="w-4 h-4" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-[#666666] hover:text-[#CE0202]">
                  <Phone className="w-4 h-4" />
                  {contact.phone}
                </a>
              )}
              {contact.city && (
                <div className="flex items-center gap-2 text-sm text-[#666666]">
                  <MapPin className="w-4 h-4" />
                  {contact.city}
                </div>
              )}
              {contact.poste && (
                <div className="flex items-center gap-2 text-sm text-[#666666]">
                  <Briefcase className="w-4 h-4" />
                  {contact.poste}
                </div>
              )}
            </div>

            {/* Summary Cards */}
            {history?.summary && (
              <div className="px-6 py-4 grid grid-cols-4 gap-3 border-b border-[#E5E5E5]">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{history.summary.total_quotes}</p>
                  <p className="text-xs text-blue-600">Devis</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{history.summary.total_invoices}</p>
                  <p className="text-xs text-purple-600">Factures</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{formatCurrency(history.summary.total_paid)}</p>
                  <p className="text-xs text-green-600">Payé</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(history.summary.total_remaining)}</p>
                  <p className="text-xs text-orange-600">Dû</p>
                </div>
              </div>
            )}

            {/* Tabs for History */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="quotes" className="h-full flex flex-col">
                <TabsList className="px-6 py-2 bg-white border-b border-[#E5E5E5] justify-start gap-2">
                  <TabsTrigger value="quotes" className="data-[state=active]:bg-[#CE0202]/10 data-[state=active]:text-[#CE0202]">
                    <FileText className="w-4 h-4 mr-1" />
                    Devis ({history?.quotes?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="data-[state=active]:bg-[#CE0202]/10 data-[state=active]:text-[#CE0202]">
                    <Receipt className="w-4 h-4 mr-1" />
                    Factures ({history?.invoices?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="data-[state=active]:bg-[#CE0202]/10 data-[state=active]:text-[#CE0202]">
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Tâches ({history?.tasks?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="info" className="data-[state=active]:bg-[#CE0202]/10 data-[state=active]:text-[#CE0202]">
                    <StickyNote className="w-4 h-4 mr-1" />
                    Notes
                  </TabsTrigger>
                </TabsList>

                {/* Quotes Tab */}
                <TabsContent value="quotes" className="flex-1 overflow-y-auto p-4 space-y-3">
                  {history?.quotes?.length === 0 ? (
                    <div className="text-center py-8 text-[#666666]">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucun devis pour ce contact</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => { onOpenChange(false); navigate('/admin/devis'); }}
                      >
                        Créer un devis
                      </Button>
                    </div>
                  ) : (
                    history?.quotes?.map((quote) => (
                      <div key={quote.id} className="p-4 bg-[#F8F8F8] rounded-lg hover:bg-[#F0F0F0] transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono font-medium text-[#1A1A1A]">{quote.quote_number}</p>
                            <p className="text-sm text-[#666666] flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(quote.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(quote.total)}</p>
                            <Badge className={`mt-1 ${quoteStatusColors[quote.status] || "bg-gray-100"}`}>
                              {quote.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDownloadQuotePDF(quote)}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Invoices Tab */}
                <TabsContent value="invoices" className="flex-1 overflow-y-auto p-4 space-y-3">
                  {history?.invoices?.length === 0 ? (
                    <div className="text-center py-8 text-[#666666]">
                      <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucune facture pour ce contact</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => { onOpenChange(false); navigate('/admin/factures'); }}
                      >
                        Créer une facture
                      </Button>
                    </div>
                  ) : (
                    history?.invoices?.map((invoice) => (
                      <div key={invoice.id} className="p-4 bg-[#F8F8F8] rounded-lg hover:bg-[#F0F0F0] transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono font-medium text-[#1A1A1A]">{invoice.invoice_number}</p>
                            <p className="text-sm text-[#666666] flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(invoice.created_at)}
                            </p>
                            {invoice.due_date && (
                              <p className="text-xs text-[#666666] mt-1">
                                Échéance: {formatDate(invoice.due_date)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(invoice.total)}</p>
                            {invoice.total_paid > 0 && (
                              <p className="text-xs text-green-600 font-mono">
                                Payé: {formatCurrency(invoice.total_paid)}
                              </p>
                            )}
                            <Badge className={`mt-1 ${invoiceStatusColors[invoice.status] || "bg-gray-100"}`}>
                              {invoice.status === "payée" || invoice.status === "payee" ? "Payée" : 
                               invoice.status === "partiellement_payée" ? "Partiel" : 
                               invoice.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDownloadInvoicePDF(invoice)}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="flex-1 overflow-y-auto p-4 space-y-3">
                  {history?.tasks?.length === 0 ? (
                    <div className="text-center py-8 text-[#666666]">
                      <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucune tâche pour ce contact</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => { onOpenChange(false); navigate('/admin/taches'); }}
                      >
                        Créer une tâche
                      </Button>
                    </div>
                  ) : (
                    history?.tasks?.map((task) => (
                      <div key={task.id} className="p-4 bg-[#F8F8F8] rounded-lg hover:bg-[#F0F0F0] transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-[#1A1A1A]">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-[#666666] mt-1 line-clamp-2">{task.description}</p>
                            )}
                            {task.due_date && (
                              <p className="text-xs text-[#666666] mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Échéance: {formatDate(task.due_date)}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            <Badge className={taskPriorityColors[task.priority] || "bg-gray-100"}>
                              {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                            </Badge>
                            <Badge className={`mt-1 ${task.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {task.status === 'done' ? 'Terminée' : task.status === 'in_progress' ? 'En cours' : 'À faire'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Info/Notes Tab */}
                <TabsContent value="info" className="flex-1 overflow-y-auto p-4 space-y-4">
                  {contact.note && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <StickyNote className="w-4 h-4" />
                        Notes
                      </p>
                      <p className="text-sm text-yellow-700 whitespace-pre-wrap">{contact.note}</p>
                    </div>
                  )}
                  
                  {contact.infos_sup && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Informations supplémentaires
                      </p>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">{contact.infos_sup}</p>
                    </div>
                  )}

                  {contact.budget && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                        <Euro className="w-4 h-4" />
                        Budget
                      </p>
                      <p className="text-sm text-green-700">{contact.budget}</p>
                    </div>
                  )}

                  {contact.project_type && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Type de projet
                      </p>
                      <p className="text-sm text-purple-700">{contact.project_type}</p>
                    </div>
                  )}

                  {!contact.note && !contact.infos_sup && !contact.budget && !contact.project_type && (
                    <div className="text-center py-8 text-[#666666]">
                      <StickyNote className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucune note ou information supplémentaire</p>
                    </div>
                  )}

                  <div className="p-4 bg-[#F8F8F8] rounded-lg">
                    <p className="text-xs text-[#666666]">
                      Contact créé le {formatDate(contact.created_at)}
                      {contact.updated_at && ` • Dernière mise à jour: ${formatDate(contact.updated_at)}`}
                    </p>
                    {contact.source && (
                      <p className="text-xs text-[#666666] mt-1">Source: {contact.source}</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#666666]">
            Contact non trouvé
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ContactDetailSheet;
