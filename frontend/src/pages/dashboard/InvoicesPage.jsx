import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Plus, 
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
  FileText,
  Loader2,
  Copy,
  XCircle,
  Save,
  Package,
  Settings,
  ChevronRight,
  Check,
  CreditCard,
  Banknote,
  CalendarDays,
  PiggyBank,
  ArrowRightLeft,
  Percent
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { invoicesAPI, contactsAPI, servicesAPI } from "../../lib/api";
import api from "../../lib/api";
import { toast } from "sonner";

const TVA_RATE = 0.085; // 8.5% TVA Guadeloupe

// Company Info
const COMPANY_INFO = {
  name: "Alpha Agency",
  tagline: "Agence de communication 360°",
  address: "Immeuble Hibiscus, Route de Montebello",
  city: "97170 Petit-Bourg, Guadeloupe",
  phone: "06 90 55 30 18",
  email: "contact@alphagency.fr",
  website: "www.alphagency.fr",
  siret: "XXX XXX XXX XXXXX",
  tva: "FR XX XXX XXX XXX",
  logo: "https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/tttfxeo1_Logo%20Header.png"
};

const InvoicesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [savedServices, setSavedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [documentType, setDocumentType] = useState("facture"); // facture or devis
  const [newService, setNewService] = useState({ title: "", description: "", price: 0 });
  const [editingService, setEditingService] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "virement",
    notes: ""
  });
  const [savingPayment, setSavingPayment] = useState(false);
  
  const [items, setItems] = useState([{ title: "", description: "", quantity: 1, unit_price: 0, discount: 0 }]);
  const [globalDiscount, setGlobalDiscount] = useState({ type: "percent", value: 0 }); // type: "percent" or "fixed"
  const [formData, setFormData] = useState({
    contact_id: "",
    due_date: "",
    payment_terms: "30",
    notes: "",
    conditions: "Paiement par virement bancaire ou chèque à l'ordre de Alpha Agency.\nEn cas de retard de paiement, des pénalités de 3 fois le taux d'intérêt légal seront appliquées.",
    bank_details: "IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX\nBIC: XXXXXXXX\nBanque: Crédit Agricole Guadeloupe"
  });

  // Handle URL parameters for opening dialogs
  useEffect(() => {
    const action = searchParams.get('action');
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (action === 'new') {
      setDocumentType(type === 'devis' ? 'devis' : 'facture');
      setSheetOpen(true);
      // Clear URL params after opening
      setSearchParams({});
    } else if (action === 'services') {
      setServicesDialogOpen(true);
      setSearchParams({});
    } else if (action === 'view' && id) {
      // Find the invoice/quote by id and open view dialog
      const findAndView = async () => {
        try {
          const response = await invoicesAPI.getAll();
          const allDocs = response.data;
          const doc = allDocs.find(d => d.id === id);
          if (doc) {
            setSelectedInvoice(doc);
            setViewDialogOpen(true);
          }
        } catch (error) {
          console.error("Error loading document:", error);
        }
        setSearchParams({});
      };
      findAndView();
    }
  }, [searchParams, setSearchParams]);

  const statusConfig = {
    brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: FileText },
    en_attente: { label: "En attente", color: "bg-blue-100 text-blue-700", icon: Clock },
    envoyee: { label: "Envoyée", color: "bg-purple-100 text-purple-700", icon: Mail },
    "partiellement_payée": { label: "Partiel", color: "bg-orange-100 text-orange-700", icon: PiggyBank },
    "payée": { label: "Payée", color: "bg-green-100 text-green-700", icon: CheckCircle },
    en_retard: { label: "En retard", color: "bg-red-100 text-red-700", icon: AlertTriangle },
    annulee: { label: "Annulée", color: "bg-gray-100 text-gray-500", icon: XCircle },
    // Aliases for backward compatibility
    payee: { label: "Payée", color: "bg-green-100 text-green-700", icon: CheckCircle },
  };

  const paymentMethods = {
    virement: { label: "Virement", icon: Banknote },
    cheque: { label: "Chèque", icon: FileText },
    carte: { label: "Carte bancaire", icon: CreditCard },
    especes: { label: "Espèces", icon: Euro }
  };

  const fetchData = async () => {
    try {
      const [invoicesRes, contactsRes, servicesRes] = await Promise.all([
        invoicesAPI.getAll(),
        contactsAPI.getAll(),
        servicesAPI.getAll()
      ]);
      setInvoices(invoicesRes.data);
      setContacts(contactsRes.data);
      setSavedServices(servicesRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddService = async () => {
    if (!newService.title || !newService.price) {
      toast.error("Veuillez remplir le titre et le prix");
      return;
    }
    try {
      await servicesAPI.create(newService);
      setNewService({ title: "", description: "", price: 0 });
      toast.success("Service enregistré");
      // Refresh services
      const servicesRes = await servicesAPI.getAll();
      setSavedServices(servicesRes.data);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du service");
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    try {
      await servicesAPI.update(editingService.id, {
        title: editingService.title,
        description: editingService.description,
        price: editingService.price
      });
      setEditingService(null);
      toast.success("Service mis à jour");
      // Refresh services
      const servicesRes = await servicesAPI.getAll();
      setSavedServices(servicesRes.data);
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm("Supprimer ce service ?")) return;
    try {
      await servicesAPI.delete(id);
      toast.success("Service supprimé");
      // Refresh services
      const servicesRes = await servicesAPI.getAll();
      setSavedServices(servicesRes.data);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
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
      toast.success(`Paiement enregistré - ${response.data.status === 'payée' ? 'Facture soldée !' : `Reste: ${formatCurrency(response.data.remaining)}`}`);
      setPaymentDialogOpen(false);
      setSelectedInvoiceForPayment(null);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (invoiceId, paymentId) => {
    if (!window.confirm("Supprimer ce paiement ?")) return;
    try {
      await invoicesAPI.deletePayment(invoiceId, paymentId);
      toast.success("Paiement supprimé");
      fetchData();
      // Refresh the selected invoice if viewing it
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        const updatedInvoice = await invoicesAPI.getOne(invoiceId);
        setSelectedInvoice(updatedInvoice.data);
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const addServiceToInvoice = (service) => {
    setItems([...items, {
      title: service.title,
      description: service.description || "",
      quantity: 1,
      unit_price: parseFloat(service.price),
      discount: 0
    }]);
    toast.success("Service ajouté à la facture");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validItems = items.filter(item => (item.title || item.description) && item.unit_price > 0);
      const payload = {
        ...formData,
        document_type: documentType,
        items: validItems.map(item => ({
          title: item.title || "",
          description: item.description || "",
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount) || 0
        })),
        global_discount: globalDiscount
      };

      if (editingInvoice) {
        await invoicesAPI.update(editingInvoice.id, payload);
        toast.success(`${documentType === 'devis' ? 'Devis' : 'Facture'} mise à jour`);
      } else {
        await invoicesAPI.create(payload);
        toast.success(`${documentType === 'devis' ? 'Devis' : 'Facture'} créée`);
      }
      setSheetOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (invoiceId, status) => {
    try {
      await invoicesAPI.updateStatus(invoiceId, status);
      toast.success(`Statut mis à jour : ${statusConfig[status]?.label}`);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await invoicesAPI.delete(id);
      toast.success("Document supprimé");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDuplicate = async (invoice) => {
    try {
      const newInvoice = {
        contact_id: invoice.contact_id,
        due_date: "",
        payment_terms: invoice.payment_terms || "30",
        notes: invoice.notes,
        conditions: invoice.conditions,
        bank_details: invoice.bank_details,
        items: invoice.items
      };
      await invoicesAPI.create(newInvoice);
      toast.success("Document dupliqué");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la duplication");
    }
  };

  const resetForm = () => {
    setFormData({
      contact_id: "",
      due_date: "",
      payment_terms: "30",
      notes: "",
      conditions: "Paiement par virement bancaire ou chèque à l'ordre de Alpha Agency.\nEn cas de retard de paiement, des pénalités de 3 fois le taux d'intérêt légal seront appliquées.",
      bank_details: "IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX\nBIC: XXXXXXXX\nBanque: Crédit Agricole Guadeloupe"
    });
    setItems([{ title: "", description: "", quantity: 1, unit_price: 0, discount: 0 }]);
    setGlobalDiscount({ type: "percent", value: 0 });
    setEditingInvoice(null);
  };

  const openCreateSheet = (type) => {
    resetForm();
    setDocumentType(type);
    setSheetOpen(true);
  };

  const openEditSheet = (invoice) => {
    setEditingInvoice(invoice);
    setDocumentType(invoice.document_type || 'facture');
    setFormData({
      contact_id: invoice.contact_id,
      due_date: invoice.due_date?.split('T')[0] || "",
      payment_terms: invoice.payment_terms || "30",
      notes: invoice.notes || "",
      conditions: invoice.conditions || "",
      bank_details: invoice.bank_details || ""
    });
    // Map items to ensure all fields exist
    const loadedItems = invoice.items?.length > 0 
      ? invoice.items.map(item => ({
          title: item.title || "",
          description: item.description || "",
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          discount: item.discount || 0
        }))
      : [{ title: "", description: "", quantity: 1, unit_price: 0, discount: 0 }];
    setItems(loadedItems);
    setGlobalDiscount(invoice.global_discount || { type: "percent", value: 0 });
    setSheetOpen(true);
  };

  const openViewDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      toast.info("Préparation du PDF...");
      const type = invoice.document_type === 'devis' ? 'devis' : 'facture';
      await invoicesAPI.downloadPDF(invoice.id, invoice.invoice_number, type);
      toast.success("PDF téléchargé");
    } catch (error) {
      toast.error("Erreur lors du téléchargement du PDF");
    }
  };

  const addItem = () => {
    setItems([...items, { title: "", description: "", quantity: 1, unit_price: 0, discount: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === "quantity" || field === "unit_price" ? parseFloat(value) || 0 : value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateLineTotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = item.discount || 0;
    return subtotal - (subtotal * discount / 100);
  };

  const calculateSubtotal = (invoiceItems = items) => {
    return invoiceItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateGlobalDiscountAmount = (invoiceItems = items) => {
    const subtotal = calculateSubtotal(invoiceItems);
    if (globalDiscount.type === "percent") {
      return subtotal * (globalDiscount.value / 100);
    }
    return globalDiscount.value || 0;
  };

  const calculateSubtotalAfterDiscount = (invoiceItems = items) => {
    return calculateSubtotal(invoiceItems) - calculateGlobalDiscountAmount(invoiceItems);
  };

  const calculateTVA = (invoiceItems = items) => {
    return calculateSubtotalAfterDiscount(invoiceItems) * TVA_RATE;
  };

  const calculateTotal = (invoiceItems = items) => {
    return calculateSubtotalAfterDiscount(invoiceItems) + calculateTVA(invoiceItems);
  };

  const getContact = (contactId) => {
    return contacts.find(c => c.id === contactId);
  };

  const getContactName = (contactId) => {
    const contact = getContact(contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : "Client";
  };

  const getContactCompany = (contactId) => {
    const contact = getContact(contactId);
    return contact?.company || "";
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

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContactName(invoice.contact_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContactCompany(invoice.contact_id).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalPending = invoices
    .filter(i => ["en_attente", "envoyee"].includes(i.status))
    .reduce((sum, i) => sum + (i.total || 0), 0);
  
  const totalPaid = invoices
    .filter(i => i.status === "payée" || i.status === "payee")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const totalOverdue = invoices
    .filter(i => i.status === "en_retard")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  // Invoice Preview Component
  const InvoicePreview = () => {
    const contact = getContact(formData.contact_id);
    const today = new Date().toLocaleDateString('fr-FR');
    const dueDate = formData.due_date ? formatDate(formData.due_date) : "-";
    
    return (
      <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-lg overflow-hidden h-full">
        <div className="bg-[#F8F8F8] px-4 py-2 border-b border-[#E5E5E5] flex items-center justify-between">
          <span className="text-sm font-medium text-[#666666]">Aperçu</span>
          <Badge variant="outline" className="text-xs">
            {documentType === 'devis' ? 'DEVIS' : 'FACTURE'}
          </Badge>
        </div>
        <div className="p-6 text-xs overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Header with Logo */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <img src={COMPANY_INFO.logo} alt="Alpha Agency" className="h-12 mb-2" />
              <p className="text-[8px] text-[#666666]">{COMPANY_INFO.tagline}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-[#CE0202] mb-1">
                {documentType === 'devis' ? 'DEVIS' : 'FACTURE'}
              </h2>
              <p className="text-[#666666]">N° {editingInvoice?.invoice_number || 'NOUVEAU'}</p>
              <p className="text-[#666666]">Date: {today}</p>
            </div>
          </div>

          {/* Company & Client Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#F8F8F8] p-3 rounded">
              <p className="font-bold text-[#1A1A1A] mb-1">{COMPANY_INFO.name}</p>
              <p className="text-[#666666]">{COMPANY_INFO.address}</p>
              <p className="text-[#666666]">{COMPANY_INFO.city}</p>
              <p className="text-[#666666]">Tél: {COMPANY_INFO.phone}</p>
              <p className="text-[#666666]">{COMPANY_INFO.email}</p>
              <p className="text-[#666666] mt-1">SIRET: {COMPANY_INFO.siret}</p>
            </div>
            <div className="bg-[#F8F8F8] p-3 rounded">
              <p className="font-bold text-[#666666] mb-1">FACTURER À:</p>
              {contact ? (
                <>
                  <p className="font-bold text-[#1A1A1A]">{contact.first_name} {contact.last_name}</p>
                  {contact.company && <p className="text-[#666666]">{contact.company}</p>}
                  {contact.email && <p className="text-[#666666]">{contact.email}</p>}
                  {contact.phone && <p className="text-[#666666]">Tél: {contact.phone}</p>}
                </>
              ) : (
                <p className="text-[#999999] italic">Sélectionnez un client</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 mb-4 text-[10px]">
            <div className="bg-[#CE0202]/10 px-3 py-1 rounded">
              <span className="text-[#CE0202] font-medium">Date d'émission:</span> {today}
            </div>
            <div className="bg-[#CE0202]/10 px-3 py-1 rounded">
              <span className="text-[#CE0202] font-medium">Échéance:</span> {dueDate}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-4">
            <thead>
              <tr className="bg-[#1A1A1A] text-white">
                <th className="text-left p-2 text-[10px]">Désignation</th>
                <th className="text-center p-2 text-[10px] w-12">Qté</th>
                <th className="text-right p-2 text-[10px] w-16">P.U. HT</th>
                <th className="text-center p-2 text-[10px] w-12">Rem.</th>
                <th className="text-right p-2 text-[10px] w-20">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => i.title || i.description).map((item, index) => (
                <tr key={index} className="border-b border-[#E5E5E5]">
                  <td className="p-2 text-[10px]">
                    {item.title && <div className="font-semibold">{item.title}</div>}
                    {item.description && <div className="text-[#666666] whitespace-pre-wrap">{item.description}</div>}
                  </td>
                  <td className="p-2 text-[10px] text-center">{item.quantity}</td>
                  <td className="p-2 text-[10px] text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="p-2 text-[10px] text-center text-[#CE0202]">
                    {item.discount > 0 ? `-${item.discount}%` : '-'}
                  </td>
                  <td className="p-2 text-[10px] text-right font-medium">{formatCurrency(calculateLineTotal(item))}</td>
                </tr>
              ))}
              {items.filter(i => i.title || i.description).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-[#999999] italic">
                    Ajoutez des lignes à votre {documentType}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-4">
            <div className="w-48">
              <div className="flex justify-between py-1 text-[10px]">
                <span className="text-[#666666]">Sous-total HT</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between py-1 text-[10px]">
                <span className="text-[#666666]">TVA (8.5%)</span>
                <span>{formatCurrency(calculateTVA())}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold border-t-2 border-[#CE0202] mt-1">
                <span>Total TTC</span>
                <span className="text-[#CE0202]">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {formData.notes && (
            <div className="bg-[#F8F8F8] p-3 rounded mb-4">
              <p className="font-bold text-[10px] mb-1">Notes:</p>
              <p className="text-[10px] text-[#666666] whitespace-pre-wrap">{formData.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#E5E5E5] pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-[8px] text-[#666666]">
              <div>
                <p className="font-bold mb-1">Conditions de paiement:</p>
                <p className="whitespace-pre-wrap">{formData.conditions}</p>
              </div>
              <div>
                <p className="font-bold mb-1">Coordonnées bancaires:</p>
                <p className="whitespace-pre-wrap font-mono">{formData.bank_details}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="invoices-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Facturation</h1>
          <p className="text-[#666666] text-sm">{invoices.length} documents au total</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setServicesDialogOpen(true)}
            className="border-[#E5E5E5]"
          >
            <Package className="w-4 h-4 mr-2" />
            Services
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#CE0202] hover:bg-[#B00202] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau document
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-[#E5E5E5]">
              <DropdownMenuItem onClick={() => openCreateSheet('facture')} className="cursor-pointer">
                <Receipt className="w-4 h-4 mr-2" />
                Facture
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreateSheet('devis')} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                Devis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[#666666] text-xs">En attente</p>
              <p className="text-xl font-bold text-[#1A1A1A] font-mono">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-[#666666] text-xs">Payées</p>
              <p className="text-xl font-bold text-[#1A1A1A] font-mono">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[#666666] text-xs">En retard</p>
              <p className="text-xl font-bold text-[#1A1A1A] font-mono">{formatCurrency(totalOverdue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#CE0202]/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#CE0202]/10 rounded-lg flex items-center justify-center">
              <Euro className="w-5 h-5 text-[#CE0202]" />
            </div>
            <div>
              <p className="text-[#666666] text-xs">Total facturé</p>
              <p className="text-xl font-bold text-[#1A1A1A] font-mono">
                {formatCurrency(invoices.reduce((sum, i) => sum + (i.total || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <Input
            placeholder="Rechercher par numéro, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-[#E5E5E5] text-[#1A1A1A]"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-white border-[#E5E5E5] text-[#1A1A1A]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E5E5E5]">
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-12 text-center">
          <Receipt className="w-12 h-12 text-[#666666] mx-auto mb-4" />
          <p className="text-[#666666]">
            {searchQuery || filterStatus !== "all" ? "Aucun document trouvé" : "Aucun document créé"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666666] uppercase">Numéro</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666666] uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666666] uppercase hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#666666] uppercase hidden lg:table-cell">Échéance</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#666666] uppercase">Montant</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#666666] uppercase">Payé</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[#666666] uppercase">Statut</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#666666] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.brouillon;
                const StatusIcon = status.icon;
                const totalPaid = invoice.total_paid || 0;
                const remaining = (invoice.total || 0) - totalPaid;
                const paymentProgress = invoice.total > 0 ? (totalPaid / invoice.total) * 100 : 0;
                return (
                  <tr key={invoice.id} className="hover:bg-[#F8F8F8] transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-mono font-medium text-[#1A1A1A] text-sm">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-[#1A1A1A] text-sm">{getContactName(invoice.contact_id)}</p>
                        {getContactCompany(invoice.contact_id) && (
                          <p className="text-xs text-[#666666]">{getContactCompany(invoice.contact_id)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#666666] hidden md:table-cell">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#666666] hidden lg:table-cell">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-mono font-bold text-[#1A1A1A] text-sm">{formatCurrency(invoice.total)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-mono text-sm ${totalPaid >= invoice.total ? 'text-green-600 font-bold' : 'text-[#666666]'}`}>
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
                        {remaining > 0 && invoice.status !== 'brouillon' && invoice.status !== 'annulee' && invoice.status !== 'payée' && invoice.status !== 'payee' && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 px-2 text-xs text-[#CE0202] hover:text-[#CE0202] hover:bg-[#CE0202]/10"
                            onClick={() => openPaymentDialog(invoice)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Paiement
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Select
                        value={invoice.status}
                        onValueChange={(newStatus) => handleStatusUpdate(invoice.id, newStatus)}
                      >
                        <SelectTrigger className={`w-[120px] h-8 ${status.color} border-none text-xs`}>
                          <div className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            <span>{status.label}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#E5E5E5]">
                          {Object.entries(statusConfig).map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                              <SelectItem key={key} value={key} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-3 h-3" />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-[#E5E5E5]">
                          <DropdownMenuItem onClick={() => openViewDialog(invoice)} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditSheet(invoice)} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(invoice)} className="cursor-pointer">
                            <Copy className="w-4 h-4 mr-2" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDownloadPDF(invoice)}
                            className="cursor-pointer"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {invoice.status !== "payée" && invoice.status !== "payee" && invoice.status !== "brouillon" && invoice.status !== "annulee" && (
                            <DropdownMenuItem 
                              onClick={() => openPaymentDialog(invoice)}
                              className="cursor-pointer text-[#CE0202]"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Ajouter un paiement
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== "payée" && invoice.status !== "payee" && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(invoice.id, "payée")}
                              className="cursor-pointer text-green-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marquer comme payée
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "brouillon" && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(invoice.id, "envoyee")}
                              className="cursor-pointer text-purple-600"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Marquer comme envoyée
                            </DropdownMenuItem>
                          )}
                          {!["annulee", "payée", "payee"].includes(invoice.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(invoice.id, "annulee")}
                              className="cursor-pointer text-gray-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Annuler
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(invoice.id)}
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
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Sheet with Preview */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[1400px] p-0 bg-[#F8F8F8] overflow-hidden">
          <div className="flex h-full">
            {/* Form Side - Full width on mobile, 50% on desktop */}
            <div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto bg-white border-r border-[#E5E5E5]">
              <SheetHeader className="mb-4 sm:mb-6">
                <SheetTitle className="text-[#1A1A1A] flex items-center gap-2">
                  {documentType === 'devis' ? <FileText className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                  {editingInvoice ? `Modifier ${documentType === 'devis' ? 'le devis' : 'la facture'}` : `Nouvelle ${documentType === 'devis' ? 'devis' : 'facture'}`}
                </SheetTitle>
              </SheetHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Client & Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#1A1A1A]">Client *</Label>
                    <Select
                      value={formData.contact_id}
                      onValueChange={(value) => setFormData({...formData, contact_id: value})}
                      required
                    >
                      <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#E5E5E5]">
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name}
                            {contact.company && <span className="text-[#666666] ml-1">({contact.company})</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#1A1A1A]">Échéance</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                    />
                  </div>
                </div>

                {/* Saved Services */}
                {savedServices.length > 0 && (
                  <div className="bg-[#F8F8F8] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-[#CE0202]" />
                      <span className="text-sm font-medium text-[#1A1A1A]">Services enregistrés</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {savedServices.map((service) => (
                        <Button
                          key={service.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addServiceToInvoice(service)}
                          className="text-xs text-left h-auto py-2"
                          title={service.description}
                        >
                          <Plus className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span>
                            <span className="font-bold">{service.title}</span>
                            <span className="ml-1 text-[#666666]">({formatCurrency(service.price)})</span>
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#1A1A1A] font-semibold">Lignes de facturation</Label>
                    <Button type="button" variant="ghost" onClick={addItem} className="text-[#CE0202]">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter une ligne
                    </Button>
                  </div>
                  
                  {items.map((item, index) => (
                    <div key={index} className="bg-[#F8F8F8] rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#666666]">Ligne {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500 h-6 w-6 p-0"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Titre du service (ex: Création site web)"
                        value={item.title || ""}
                        onChange={(e) => updateItem(index, "title", e.target.value)}
                        className="bg-white border-[#E5E5E5] text-[#1A1A1A] font-semibold"
                      />
                      <Textarea
                        placeholder="Description détaillée (optionnel)"
                        value={item.description || ""}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="bg-white border-[#E5E5E5] text-[#1A1A1A] text-sm"
                        rows={2}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-[#666666]">Quantité</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#666666]">Prix HT (€)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                            className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#666666]">Remise (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder="0"
                            value={item.discount || 0}
                            onChange={(e) => updateItem(index, "discount", e.target.value)}
                            className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>
                      </div>
                      {(item.title || item.description) && item.unit_price > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#666666]">
                            {item.discount > 0 && `(-${item.discount}%)`}
                          </span>
                          <span className="font-medium text-[#1A1A1A]">
                            Total ligne: {formatCurrency(calculateLineTotal(item))}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Global Discount */}
                <div className="bg-gradient-to-r from-[#CE0202]/10 to-[#CE0202]/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-[#1A1A1A] font-semibold flex items-center gap-2">
                      <Percent className="w-4 h-4 text-[#CE0202]" />
                      Remise globale
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={globalDiscount.type}
                      onValueChange={(v) => setGlobalDiscount({ ...globalDiscount, type: v })}
                    >
                      <SelectTrigger className="w-32 bg-white border-[#E5E5E5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="fixed">€ fixe</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step={globalDiscount.type === "percent" ? "1" : "0.01"}
                      placeholder="0"
                      value={globalDiscount.value || ""}
                      onChange={(e) => setGlobalDiscount({ ...globalDiscount, value: parseFloat(e.target.value) || 0 })}
                      className="flex-1 bg-white border-[#E5E5E5] text-[#1A1A1A]"
                    />
                  </div>
                  {globalDiscount.value > 0 && (
                    <div className="mt-2 text-sm text-[#CE0202] font-medium">
                      Remise appliquée: -{formatCurrency(calculateGlobalDiscountAmount())}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                    rows={2}
                    placeholder="Notes visibles sur le document..."
                  />
                </div>

                {/* Totals */}
                <div className="bg-[#1A1A1A] text-white rounded-lg p-4">
                  <div className="flex justify-between py-1">
                    <span className="text-white/70">Sous-total HT</span>
                    <span className="font-mono">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {globalDiscount.value > 0 && (
                    <div className="flex justify-between py-1 text-[#CE0202]">
                      <span>Remise globale ({globalDiscount.type === "percent" ? `${globalDiscount.value}%` : "fixe"})</span>
                      <span className="font-mono">-{formatCurrency(calculateGlobalDiscountAmount())}</span>
                    </div>
                  )}
                  {globalDiscount.value > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-white/70">Sous-total après remise</span>
                      <span className="font-mono">{formatCurrency(calculateSubtotalAfterDiscount())}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-white/70">TVA (8.5%)</span>
                    <span className="font-mono">{formatCurrency(calculateTVA())}</span>
                  </div>
                  <div className="flex justify-between py-2 text-xl font-bold border-t border-white/20 mt-2">
                    <span>Total TTC</span>
                    <span className="font-mono text-[#CE0202]">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving || !formData.contact_id}
                    className="flex-1 bg-[#CE0202] hover:bg-[#B00202] text-white"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {editingInvoice ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Preview Side - Hidden on mobile, 50% on desktop */}
            <div className="hidden lg:block lg:w-1/2 p-4 overflow-y-auto">
              <InvoicePreview />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Services Management Dialog */}
      <Dialog open={servicesDialogOpen} onOpenChange={setServicesDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#CE0202]" />
              Services enregistrés
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add New Service */}
            <div className="bg-[#F8F8F8] rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-[#1A1A1A]">Ajouter un nouveau service</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-[#666666]">Titre du service *</Label>
                  <Input
                    placeholder="Ex: Site web vitrine, Logo professionnel, Community Management..."
                    value={newService.title}
                    onChange={(e) => setNewService({...newService, title: e.target.value})}
                    className="bg-white border-[#E5E5E5] font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#666666]">Description détaillée</Label>
                  <Textarea
                    placeholder="Décrivez en détail ce que comprend ce service : fonctionnalités incluses, livrables, délais, etc."
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                    className="bg-white border-[#E5E5E5] min-h-[100px]"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-[#666666]">Prix HT (€) *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newService.price || ""}
                      onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value) || 0})}
                      className="bg-white border-[#E5E5E5]"
                    />
                  </div>
                  <Button 
                    onClick={handleAddService} 
                    className="bg-[#CE0202] hover:bg-[#B00202] text-white"
                    disabled={!newService.title || !newService.price}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {savedServices.length === 0 ? (
                <p className="text-center text-[#666666] py-4">Aucun service enregistré</p>
              ) : (
                savedServices.map((service) => (
                  <div key={service.id} className="p-4 bg-[#F8F8F8] rounded-lg">
                    {editingService?.id === service.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-[#666666]">Titre</Label>
                          <Input
                            value={editingService.title}
                            onChange={(e) => setEditingService({...editingService, title: e.target.value})}
                            className="bg-white border-[#E5E5E5] font-bold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#666666]">Description</Label>
                          <Textarea
                            value={editingService.description || ""}
                            onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                            className="bg-white border-[#E5E5E5]"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-[#666666]">Prix HT (€)</Label>
                            <Input
                              type="number"
                              value={editingService.price}
                              onChange={(e) => setEditingService({...editingService, price: parseFloat(e.target.value) || 0})}
                              className="bg-white border-[#E5E5E5]"
                            />
                          </div>
                          <Button size="sm" onClick={handleUpdateService} className="bg-green-600 hover:bg-green-700 text-white">
                            <Check className="w-4 h-4 mr-1" /> Sauvegarder
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingService(null)}>
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-bold text-[#1A1A1A]">{service.title}</p>
                          {service.description && (
                            <p className="text-sm text-[#666666] mt-1 whitespace-pre-wrap">{service.description}</p>
                          )}
                          <p className="text-lg text-[#CE0202] font-mono mt-2">{formatCurrency(service.price)}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setEditingService(service)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteService(service.id)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-[#1A1A1A]">
                    {selectedInvoice.invoice_number}
                  </DialogTitle>
                  <Badge className={statusConfig[selectedInvoice.status]?.color}>
                    {statusConfig[selectedInvoice.status]?.label}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-[#666666]">Client</p>
                    <p className="font-medium text-[#1A1A1A]">{getContactName(selectedInvoice.contact_id)}</p>
                    {getContactCompany(selectedInvoice.contact_id) && (
                      <p className="text-sm text-[#666666]">{getContactCompany(selectedInvoice.contact_id)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#666666]">Date d'émission</p>
                    <p className="font-medium text-[#1A1A1A]">{formatDate(selectedInvoice.created_at)}</p>
                    <p className="text-sm text-[#666666] mt-2">Échéance</p>
                    <p className="font-medium text-[#1A1A1A]">{formatDate(selectedInvoice.due_date)}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F8F8F8]">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-[#666666]">Description</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-[#666666]">Qté</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-[#666666]">Prix unitaire</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-[#666666]">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {selectedInvoice.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-[#1A1A1A]">{item.description}</td>
                          <td className="px-4 py-3 text-center text-[#666666]">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-[#666666]">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-mono text-[#1A1A1A]">{formatCurrency(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#666666]">Sous-total HT</span>
                      <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#666666]">TVA (8.5%)</span>
                      <span className="font-mono">{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-[#E5E5E5] pt-2">
                      <span className="text-[#1A1A1A]">Total TTC</span>
                      <span className="font-mono text-[#CE0202]">{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Payments Section */}
                {selectedInvoice.status !== 'brouillon' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#CE0202]" />
                        Paiements
                      </h3>
                      {selectedInvoice.status !== 'payée' && selectedInvoice.status !== 'payee' && selectedInvoice.status !== 'annulee' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewDialogOpen(false);
                            openPaymentDialog(selectedInvoice);
                          }}
                          className="text-[#CE0202] border-[#CE0202]"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Ajouter
                        </Button>
                      )}
                    </div>

                    {/* Payment Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[#F8F8F8] rounded-lg p-3 text-center">
                        <p className="text-xs text-[#666666]">Total facture</p>
                        <p className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(selectedInvoice.total)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-600">Payé</p>
                        <p className="font-mono font-bold text-green-700">{formatCurrency(selectedInvoice.total_paid || 0)}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${(selectedInvoice.remaining || (selectedInvoice.total - (selectedInvoice.total_paid || 0))) > 0 ? 'bg-orange-50' : 'bg-green-50'}`}>
                        <p className={`text-xs ${(selectedInvoice.remaining || (selectedInvoice.total - (selectedInvoice.total_paid || 0))) > 0 ? 'text-orange-600' : 'text-green-600'}`}>Reste à payer</p>
                        <p className={`font-mono font-bold ${(selectedInvoice.remaining || (selectedInvoice.total - (selectedInvoice.total_paid || 0))) > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                          {formatCurrency(selectedInvoice.remaining || (selectedInvoice.total - (selectedInvoice.total_paid || 0)))}
                        </p>
                      </div>
                    </div>

                    {/* Payments List */}
                    {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                      <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-[#F8F8F8]">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium text-[#666666]">Date</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-[#666666]">Méthode</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-[#666666]">Montant</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-[#666666]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E5E5]">
                            {selectedInvoice.payments.map((payment) => {
                              const method = paymentMethods[payment.payment_method] || paymentMethods.virement;
                              const MethodIcon = method.icon;
                              return (
                                <tr key={payment.id} className="hover:bg-[#F8F8F8]">
                                  <td className="px-4 py-3 text-sm text-[#1A1A1A]">
                                    {formatDate(payment.payment_date)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm text-[#666666]">
                                      <MethodIcon className="w-4 h-4" />
                                      {method.label}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="font-mono font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeletePayment(selectedInvoice.id, payment.id)}
                                      className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-[#666666] bg-[#F8F8F8] rounded-lg">
                        <Banknote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aucun paiement enregistré</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Fermer
                </Button>
                <Button 
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#CE0202]" />
              Enregistrer un paiement
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoiceForPayment && (
            <div className="space-y-4">
              {/* Invoice Summary */}
              <div className="bg-[#F8F8F8] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">Facture</span>
                  <span className="font-mono font-medium">{selectedInvoiceForPayment.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">Total TTC</span>
                  <span className="font-mono">{formatCurrency(selectedInvoiceForPayment.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666]">Déjà payé</span>
                  <span className="font-mono text-green-600">{formatCurrency(selectedInvoiceForPayment.total_paid || 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-[#E5E5E5] pt-2">
                  <span className="text-[#1A1A1A]">Reste à payer</span>
                  <span className="font-mono text-[#CE0202]">
                    {formatCurrency((selectedInvoiceForPayment.total || 0) - (selectedInvoiceForPayment.total_paid || 0))}
                  </span>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Montant *</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="pl-10 bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Date du paiement *</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                    <Input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      className="pl-10 bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Méthode de paiement</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
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
                  <Label className="text-[#1A1A1A]">Notes (optionnel)</Label>
                  <Textarea
                    placeholder="Référence de virement, numéro de chèque..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
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
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white"
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

export default InvoicesPage;
