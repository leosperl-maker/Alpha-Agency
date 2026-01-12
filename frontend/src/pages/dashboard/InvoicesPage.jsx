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
  Percent,
  CheckSquare,
  Square,
  X
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
  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Phase 2: After creation dialog
  const [phase2DialogOpen, setPhase2DialogOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  
  // Email dialog with confirmation
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailInvoice, setEmailInvoice] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // New contact dialog
  const [newContactDialogOpen, setNewContactDialogOpen] = useState(false);
  const [newContactData, setNewContactData] = useState({
    first_name: "", last_name: "", email: "", phone: "", company: "", 
    position: "", address: "", city: "", postal_code: "", country: "France",
    type: "client", status: "actif", notes: ""
  });
  const [savingContact, setSavingContact] = useState(false);
  
  const [items, setItems] = useState([{ title: "", description: "", quantity: 1, unit_price: 0, discount: 0, discountType: "percent" }]);
  const [globalDiscount, setGlobalDiscount] = useState({ type: "percent", value: 0 }); // type: "percent" or "fixed"
  const [invoiceSettings, setInvoiceSettings] = useState(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    contact_id: "",
    due_date: "",
    payment_terms: "30",
    notes: "",
    conditions: "",
    bank_details: ""
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
    brouillon: { label: "Brouillon", color: "bg-white/10 text-white/60", icon: FileText },
    en_attente: { label: "En attente", color: "bg-blue-500/20 text-blue-400", icon: Clock },
    envoyee: { label: "Envoyée", color: "bg-purple-500/20 text-purple-400", icon: Mail },
    "partiellement_payée": { label: "Partiel", color: "bg-orange-500/20 text-orange-400", icon: PiggyBank },
    "payée": { label: "Payée", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
    en_retard: { label: "En retard", color: "bg-red-500/20 text-red-400", icon: AlertTriangle },
    annulee: { label: "Annulée", color: "bg-gray-100 text-gray-500", icon: XCircle },
    // Aliases for backward compatibility
    payee: { label: "Payée", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  };

  const paymentMethods = {
    virement: { label: "Virement", icon: Banknote },
    cheque: { label: "Chèque", icon: FileText },
    carte: { label: "Carte bancaire", icon: CreditCard },
    especes: { label: "Espèces", icon: Euro }
  };

  const fetchData = async () => {
    try {
      const [invoicesRes, contactsRes, servicesRes, settingsRes] = await Promise.all([
        invoicesAPI.getAll(),
        contactsAPI.getAll(),
        servicesAPI.getAll(),
        api.get('/settings/invoice').catch(() => ({ data: null }))
      ]);
      setInvoices(invoicesRes.data);
      setContacts(contactsRes.data);
      setSavedServices(servicesRes.data);
      if (settingsRes.data) {
        setInvoiceSettings(settingsRes.data);
      }
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
      discount: 0,
      discountType: "percent"
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
          discount: parseFloat(item.discount) || 0,
          discountType: item.discountType || "percent"
        })),
        global_discount: globalDiscount
      };

      if (editingInvoice) {
        await invoicesAPI.update(editingInvoice.id, payload);
        toast.success(`${documentType === 'devis' ? 'Devis' : 'Facture'} mise à jour`);
        setSheetOpen(false);
        resetForm();
      } else {
        const response = await invoicesAPI.create(payload);
        const newInvoice = response.data;
        toast.success(`${documentType === 'devis' ? 'Devis' : 'Facture'} créée`);
        
        // Open Phase 2 dialog with the created invoice
        setCreatedInvoice(newInvoice);
        setSheetOpen(false);
        setPhase2DialogOpen(true);
        resetForm();
      }
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

  const openEmailDialog = (invoice) => {
    const contact = contacts.find(c => c.id === invoice.contact_id);
    setEmailInvoice(invoice);
    setEmailRecipient(contact?.email || "");
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailRecipient || !emailInvoice) {
      toast.error("Adresse email requise");
      return;
    }
    
    setSendingEmail(true);
    const toastId = toast.loading("Envoi de l'email en cours...");
    try {
      const type = emailInvoice.document_type === 'devis' ? 'devis' : 'facture';
      await api.post(`/invoices/${emailInvoice.id}/send-email`, {
        recipient_email: emailRecipient,
        document_type: type
      });
      toast.dismiss(toastId);
      toast.success(`Email envoyé à ${emailRecipient}`);
      setEmailDialogOpen(false);
      setEmailInvoice(null);
      setEmailRecipient("");
      fetchData(); // Refresh to update status
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Email error:', error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleChangeStatus = async (invoice) => {
    const statuses = ['brouillon', 'envoyée', 'payée', 'annulée'];
    const currentIndex = statuses.indexOf(invoice.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    try {
      await api.put(`/invoices/${invoice.id}/status`, { status: nextStatus });
      toast.success(`Statut changé en "${statusConfig[nextStatus]?.label || nextStatus}"`);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors du changement de statut");
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

  const handleConvertToInvoice = async (devis) => {
    try {
      const newInvoice = {
        contact_id: devis.contact_id,
        due_date: "",
        payment_terms: devis.payment_terms || "30",
        notes: devis.notes,
        conditions: devis.conditions,
        bank_details: devis.bank_details,
        items: devis.items,
        document_type: "facture"
      };
      await invoicesAPI.create(newInvoice);
      toast.success("Devis converti en facture");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la conversion");
    }
  };

  const resetForm = () => {
    setFormData({
      contact_id: "",
      due_date: "",
      payment_terms: invoiceSettings?.default_payment_terms || "30",
      notes: "",
      conditions: invoiceSettings?.default_conditions || "",
      bank_details: invoiceSettings?.bank_details || ""
    });
    setItems([{ title: "", description: "", quantity: 1, unit_price: 0, discount: 0, discountType: "percent" }]);
    setGlobalDiscount({ type: "percent", value: 0 });
    setEditingInvoice(null);
  };

  // Create new contact from invoice form
  const handleCreateNewContact = async () => {
    if (!newContactData.first_name && !newContactData.last_name && !newContactData.company) {
      toast.error("Veuillez renseigner au moins un nom ou une entreprise");
      return;
    }
    
    setSavingContact(true);
    try {
      const response = await contactsAPI.create(newContactData);
      const newContact = response.data;
      
      // Refresh contacts list and select the new contact
      const contactsRes = await contactsAPI.getAll();
      setContacts(contactsRes.data);
      setFormData(prev => ({ ...prev, contact_id: newContact.id }));
      
      toast.success("Contact créé et sélectionné");
      setNewContactDialogOpen(false);
      setNewContactData({
        first_name: "", last_name: "", email: "", phone: "", company: "", 
        position: "", address: "", city: "", postal_code: "", country: "France",
        type: "client", status: "actif", notes: ""
      });
    } catch (error) {
      toast.error("Erreur lors de la création du contact");
    } finally {
      setSavingContact(false);
    }
  };

  const saveSettings = async () => {
    try {
      await api.put('/settings/invoice', {
        ...invoiceSettings,
        default_conditions: invoiceSettings?.default_conditions || formData.conditions,
        bank_details: invoiceSettings?.bank_details || formData.bank_details,
      });
      // Also update formData with the new settings
      setFormData(prev => ({
        ...prev,
        conditions: invoiceSettings?.default_conditions || prev.conditions,
        bank_details: invoiceSettings?.bank_details || prev.bank_details
      }));
      toast.success("Paramètres enregistrés");
      setSettingsDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
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
          discount: item.discount || 0,
          discountType: item.discountType || "percent"
        }))
      : [{ title: "", description: "", quantity: 1, unit_price: 0, discount: 0, discountType: "percent" }];
    setItems(loadedItems);
    setGlobalDiscount(invoice.global_discount || { type: "percent", value: 0 });
    setSheetOpen(true);
  };

  const openViewDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = async (invoice) => {
    const toastId = toast.loading("Préparation du PDF...");
    try {
      const type = invoice.document_type === 'devis' ? 'devis' : 'facture';
      await invoicesAPI.downloadPDF(invoice.id, invoice.invoice_number, type);
      toast.dismiss(toastId);
      toast.success("PDF téléchargé !");
    } catch (error) {
      toast.dismiss(toastId);
      console.error('PDF download error:', error);
      toast.error("Erreur lors du téléchargement du PDF. Réessayez.");
    }
  };

  // Multi-selection functions
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(inv => inv.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);
    const toastId = toast.loading(`Téléchargement de ${selectedIds.length} document(s)...`);
    
    let success = 0;
    for (const id of selectedIds) {
      const invoice = invoices.find(inv => inv.id === id);
      if (invoice) {
        try {
          const type = invoice.document_type === 'devis' ? 'devis' : 'facture';
          await invoicesAPI.downloadPDF(invoice.id, invoice.invoice_number, type);
          success++;
          await new Promise(r => setTimeout(r, 300)); // Small delay between downloads
        } catch (e) {
          console.error('Download failed for', invoice.invoice_number);
        }
      }
    }
    
    toast.dismiss(toastId);
    toast.success(`${success}/${selectedIds.length} PDF téléchargés`);
    setSelectedIds([]);
    setIsDownloading(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error("Aucun document sélectionné");
      return;
    }
    
    const confirmDelete = window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} document(s) ? Cette action est irréversible.`);
    if (!confirmDelete) {
      return;
    }
    
    const toastId = toast.loading(`Suppression de ${selectedIds.length} document(s)...`);
    let success = 0;
    let errors = 0;
    
    for (const id of selectedIds) {
      try {
        await invoicesAPI.delete(id);
        success++;
      } catch (e) {
        console.error('Delete failed for', id, e);
        errors++;
      }
    }
    
    toast.dismiss(toastId);
    if (errors > 0) {
      toast.error(`${errors} erreur(s) lors de la suppression`);
    }
    if (success > 0) {
      toast.success(`${success} document(s) supprimé(s)`);
    }
    setSelectedIds([]);
    fetchData();
  };

  const addItem = () => {
    setItems([...items, { title: "", description: "", quantity: 1, unit_price: 0, discount: 0, discountType: "percent" }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === "quantity" || field === "unit_price" || field === "discount") {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateLineDiscount = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = item.discount || 0;
    if (item.discountType === "fixed") {
      return Math.min(discount, subtotal); // Can't discount more than the subtotal
    }
    return subtotal * (discount / 100);
  };

  const calculateLineTotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    return Math.max(0, subtotal - calculateLineDiscount(item)); // Never negative
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

  // Invoice Preview Component - uses invoiceSettings for real-time preview
  const InvoicePreview = ({ settings = invoiceSettings }) => {
    const contact = getContact(formData.contact_id);
    const today = new Date().toLocaleDateString('fr-FR');
    const dueDate = formData.due_date ? formatDate(formData.due_date) : "-";
    
    // Use settings or fallback to defaults - ALL FIELDS from settings
    const companyName = settings?.company_name || COMPANY_INFO.name;
    const companyAddress = settings?.company_address || `${COMPANY_INFO.address}, ${COMPANY_INFO.city}`;
    const companyPhone = settings?.company_phone || COMPANY_INFO.phone;
    const companyEmail = settings?.company_email || COMPANY_INFO.email;
    const companySiret = settings?.company_siret || COMPANY_INFO.siret;
    const companyVat = settings?.company_vat || COMPANY_INFO.tva;
    
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg overflow-hidden h-full">
        <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">Aperçu</span>
          <Badge variant="outline" className="text-xs">
            {documentType === 'devis' ? 'DEVIS' : 'FACTURE'}
          </Badge>
        </div>
        <div className="p-6 text-xs overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Header with Logo */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <img src={COMPANY_INFO.logo} alt="Alpha Agency" className="h-12 mb-2" />
              <p className="text-[8px] text-white/60">{COMPANY_INFO.tagline}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-indigo-400 mb-1">
                {documentType === 'devis' ? 'DEVIS' : 'FACTURE'}
              </h2>
              <p className="text-white/60">N° {editingInvoice?.invoice_number || 'NOUVEAU'}</p>
              <p className="text-white/60">Date: {today}</p>
            </div>
          </div>

          {/* Company & Client Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 p-3 rounded">
              <p className="font-bold text-white mb-1">{companyName}</p>
              <p className="text-white/60">{companyAddress}</p>
              <p className="text-white/60">Tél: {companyPhone}</p>
              <p className="text-white/60">{companyEmail}</p>
              <p className="text-white/60 mt-1">SIRET: {companySiret}</p>
              {companyVat && <p className="text-white/60">TVA: {companyVat}</p>}
            </div>
            <div className="bg-white/5 p-3 rounded">
              <p className="font-bold text-white/60 mb-1">DESTINATAIRE</p>
              {contact ? (
                <>
                  <p className="font-bold text-white">{contact.first_name} {contact.last_name}</p>
                  {contact.company && <p className="text-white/60">{contact.company}</p>}
                  {contact.email && <p className="text-white/60">{contact.email}</p>}
                  {contact.phone && <p className="text-white/60">Tél: {contact.phone}</p>}
                </>
              ) : (
                <p className="text-white/40 italic">Sélectionnez un client</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 mb-4 text-[10px]">
            <div className="bg-indigo-600/10 px-3 py-1 rounded">
              <span className="text-indigo-400 font-medium">Date d&apos;émission:</span> {today}
            </div>
            <div className="bg-indigo-600/10 px-3 py-1 rounded">
              <span className="text-indigo-400 font-medium">Échéance:</span> {dueDate}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-4">
            <thead>
              <tr className="bg-[#1A1A1A] text-white">
                <th className="text-left p-2 text-[10px]">Désignation</th>
                <th className="text-center p-2 text-[10px] w-12">Qté</th>
                <th className="text-right p-2 text-[10px] w-16">P.U. HT</th>
                <th className="text-center p-2 text-[10px] w-16">Remise</th>
                <th className="text-right p-2 text-[10px] w-20">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => i.title || i.description).map((item, index) => (
                <tr key={index} className="border-b border-white/10">
                  <td className="p-2 text-[10px]">
                    {item.title && <div className="font-semibold">{item.title}</div>}
                    {item.description && <div className="text-white/60 whitespace-pre-wrap">{item.description}</div>}
                  </td>
                  <td className="p-2 text-[10px] text-center">{item.quantity}</td>
                  <td className="p-2 text-[10px] text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="p-2 text-[10px] text-center text-indigo-400">
                    {item.discount > 0 
                      ? (item.discountType === "fixed" 
                          ? `-${formatCurrency(item.discount)}` 
                          : `-${item.discount}%`)
                      : '-'}
                  </td>
                  <td className="p-2 text-[10px] text-right font-medium">{formatCurrency(calculateLineTotal(item))}</td>
                </tr>
              ))}
              {items.filter(i => i.title || i.description).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-white/40 italic">
                    Ajoutez des lignes à votre {documentType}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-4">
            <div className="w-56">
              <div className="flex justify-between py-1 text-[10px]">
                <span className="text-white/60">Sous-total HT</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              {globalDiscount.value > 0 && (
                <>
                  <div className="flex justify-between py-1 text-[10px] text-indigo-400">
                    <span>Remise globale {globalDiscount.type === "percent" ? `(${globalDiscount.value}%)` : ''}</span>
                    <span>-{formatCurrency(calculateGlobalDiscountAmount())}</span>
                  </div>
                  <div className="flex justify-between py-1 text-[10px]">
                    <span className="text-white/60">Sous-total après remise</span>
                    <span>{formatCurrency(calculateSubtotalAfterDiscount())}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-1 text-[10px]">
                <span className="text-white/60">TVA (8.5%)</span>
                <span>{formatCurrency(calculateTVA())}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold border-t-2 border-indigo-500/50 mt-1">
                <span>Total TTC</span>
                <span className="text-indigo-400">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Conditions */}
          {(settings?.default_conditions || formData.conditions) && (
            <div className="bg-white/5 p-3 rounded mb-4">
              <p className="font-bold text-[10px] mb-1">Conditions de paiement:</p>
              <p className="text-[10px] text-white/60 whitespace-pre-wrap">{settings?.default_conditions || formData.conditions}</p>
            </div>
          )}
          
          {/* Bank Details */}
          {(settings?.bank_details || formData.bank_details) && (
            <div className="bg-white/5 p-3 rounded mb-4">
              <p className="font-bold text-[10px] mb-1">Détails du paiement:</p>
              <p className="text-[10px] text-white/60">Bénéficiaire: {companyName}</p>
              <p className="text-[10px] text-white/60 whitespace-pre-wrap font-mono">{settings?.bank_details || formData.bank_details}</p>
            </div>
          )}

          {/* Notes */}
          {formData.notes && (
            <div className="bg-white/5 p-3 rounded mb-4">
              <p className="font-bold text-[10px] mb-1">Notes:</p>
              <p className="text-[10px] text-white/60 whitespace-pre-wrap">{formData.notes}</p>
            </div>
          )}
          
          {/* Signature for devis */}
          {documentType === 'devis' && (
            <div className="border-t border-white/10 pt-4 mt-4">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-bold text-[10px] mb-2">Pour Alpha Agency</p>
                  <div className="h-12 border-b border-white/30"></div>
                </div>
                <div>
                  <p className="font-bold text-[10px] mb-2">{settings?.signature_text || "Bon pour accord, le client"}</p>
                  <div className="h-12 border-b border-white/30"></div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="text-[7px] text-white/40 text-center">
              <p>{companyName} - {companyAddress}</p>
              <p>SIRET: {companySiret} | TVA: {companyVat}</p>
              <p className="mt-1">En cas de retard de paiement: pénalités au taux légal x3 + 40€ de frais de recouvrement.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
        </div>
      </div>
    );
  };

  return (
    <div data-testid="invoices-page" className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Facturation</h1>
          <p className="text-white/60 text-xs sm:text-sm">{invoices.length} documents</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setServicesDialogOpen(true)}
            className="border-white/10 h-8 px-2 sm:px-3"
          >
            <Package className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsDialogOpen(true)}
            className="border-white/10 h-8 px-2 sm:px-3"
            title="Paramètres facturation"
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 px-2 sm:px-3">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                <span className="hidden sm:inline text-xs">Nouveau</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
              <DropdownMenuItem onClick={() => openCreateSheet('facture')} className="cursor-pointer text-xs">
                <Receipt className="w-3 h-3 mr-2" />
                Facture
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreateSheet('devis')} className="cursor-pointer text-xs">
                <FileText className="w-3 h-3 mr-2" />
                Devis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg flex-shrink-0">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/60 text-[10px]">Attente</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500/20 rounded-lg flex-shrink-0">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/60 text-[10px]">Payées</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/20 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/60 text-[10px]">Retard</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">{formatCurrency(totalOverdue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-indigo-500/20 p-2 sm:p-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg flex-shrink-0">
              <Euro className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/60 text-[10px]">Total</p>
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {formatCurrency(invoices.reduce((sum, i) => sum + (i.total || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-white/60" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 sm:pl-10 bg-white/5 backdrop-blur-xl border-white/10 text-white h-8 sm:h-9 text-xs sm:text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-24 sm:w-36 bg-white/5 backdrop-blur-xl border-white/10 text-white h-8 sm:h-9 text-xs sm:text-sm">
            <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10">
            <SelectItem value="all" className="text-xs">Tous</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key} className="text-xs">{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-8 text-center">
          <Receipt className="w-10 h-10 text-white/60 mx-auto mb-3" />
          <p className="text-white/60 text-sm">
            {searchQuery || filterStatus !== "all" ? "Aucun document" : "Aucun document créé"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-2">
            {/* Mobile Bulk actions bar */}
            {selectedIds.length > 0 && (
              <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-lg px-3 py-2 flex items-center gap-2 sticky top-0 z-10">
                <span className="text-xs text-white">{selectedIds.length} sélectionné(s)</span>
                <Button size="sm" variant="ghost" onClick={handleBulkDownload} disabled={isDownloading} className="text-white hover:bg-white/10 h-7 px-2">
                  <Download className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="text-red-400 hover:bg-red-500/10 h-7 px-2">
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="text-white/60 hover:bg-white/10 h-7 px-2 ml-auto">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            {filteredInvoices.map((invoice) => {
              const status = statusConfig[invoice.status] || statusConfig.brouillon;
              const StatusIcon = status.icon;
              const totalPaid = invoice.total_paid || 0;
              const isDevis = invoice.invoice_number?.startsWith('DEV-') || invoice.document_type === 'devis';
              const isSelected = selectedIds.includes(invoice.id);
              return (
                <div key={invoice.id} className={`bg-white/5 backdrop-blur-xl rounded-lg border ${isSelected ? 'border-indigo-500' : 'border-white/10'} p-4`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleSelect(invoice.id)} className="mt-0.5 text-white/60 hover:text-white">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${invoice.invoice_number?.startsWith('DEV-') ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {invoice.invoice_number?.startsWith('DEV-') ? 'DEVIS' : 'FACTURE'}
                          </span>
                          <span className="font-mono font-medium text-white text-sm">{invoice.invoice_number}</span>
                        </div>
                        <p className="text-xs text-white/60 mt-0.5">{formatDate(invoice.created_at)}</p>
                      </div>
                    </div>
                    <Badge className={`${status.color} text-xs`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="font-medium text-white text-sm ml-7">{getContactName(invoice.contact_id)}</p>
                  {getContactCompany(invoice.contact_id) && (
                    <p className="text-xs text-white/50 ml-7">{getContactCompany(invoice.contact_id)}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <div>
                      <p className="text-xs text-white/50">Total</p>
                      <p className="font-mono font-bold text-white">{formatCurrency(invoice.total)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/50">Payé</p>
                      <p className={`font-mono text-sm ${totalPaid >= invoice.total ? 'text-green-400' : 'text-white/60'}`}>
                        {formatCurrency(totalPaid)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10" onClick={() => handleDownloadPDF(invoice)} title="Télécharger">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => openEmailDialog(invoice)} title="Envoyer par email">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4 text-white/60" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                          <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }} className="text-white">
                            <Eye className="w-4 h-4 mr-2" /> Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeStatus(invoice)} className="text-white">
                            <Clock className="w-4 h-4 mr-2" /> Changer statut
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPaymentDialog(invoice)} className="text-green-400">
                            <CreditCard className="w-4 h-4 mr-2" /> Paiement
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden overflow-x-auto">
            {/* Bulk actions bar */}
            {selectedIds.length > 0 && (
              <div className="bg-indigo-600/20 border-b border-indigo-500/30 px-4 py-2 flex items-center gap-3">
                <span className="text-sm text-white">{selectedIds.length} sélectionné(s)</span>
                <Button size="sm" variant="ghost" onClick={handleBulkDownload} disabled={isDownloading} className="text-white hover:bg-white/10">
                  <Download className="w-4 h-4 mr-1" /> Télécharger
                </Button>
                <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="text-white/60 hover:bg-white/10 ml-auto">
                  Annuler
                </Button>
              </div>
            )}
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <button onClick={toggleSelectAll} className="text-white/60 hover:text-white">
                      {selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? 
                        <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase">Numéro</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase hidden md:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase hidden lg:table-cell">Échéance</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Montant</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Payé</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-white/60 uppercase">Statut</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-white/60 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status] || statusConfig.brouillon;
                  const StatusIcon = status.icon;
                  const totalPaid = invoice.total_paid || 0;
                  const remaining = (invoice.total || 0) - totalPaid;
                  const paymentProgress = invoice.total > 0 ? (totalPaid / invoice.total) * 100 : 0;
                  // Use invoice_number prefix as source of truth
                  const isDevis = invoice.invoice_number?.startsWith('DEV-');
                  const isSelected = selectedIds.includes(invoice.id);
                  return (
                    <tr key={invoice.id} className={`hover:bg-white/5 transition-colors ${isSelected ? 'bg-indigo-600/10' : ''}`}>
                      <td className="w-10 px-3 py-4">
                        <button onClick={() => toggleSelect(invoice.id)} className="text-white/60 hover:text-white">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${isDevis ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isDevis ? 'DEVIS' : 'FACTURE'}
                          </span>
                          <span className="font-mono font-medium text-white text-sm">{invoice.invoice_number}</span>
                        </div>
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
                      <td className="px-4 py-4 text-sm text-white/60 hidden lg:table-cell">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-mono font-bold text-white text-sm">{formatCurrency(invoice.total)}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`font-mono text-sm ${totalPaid >= invoice.total ? 'text-green-400 font-bold' : 'text-white/60'}`}>
                            {formatCurrency(totalPaid)}
                          </span>
                          {invoice.total > 0 && totalPaid > 0 && totalPaid < invoice.total && (
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10" onClick={() => handleDownloadPDF(invoice)} title="Télécharger PDF">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => openEmailDialog(invoice)} title="Envoyer par email">
                            <Mail className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4 text-white/60" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10 w-48">
                              <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }} className="text-white">
                                <Eye className="w-4 h-4 mr-2" /> Voir le document
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeStatus(invoice)} className="text-white">
                                <Clock className="w-4 h-4 mr-2" /> Changer statut
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(invoice)} className="text-white">
                                <Copy className="w-4 h-4 mr-2" /> Dupliquer
                              </DropdownMenuItem>
                              {invoice.document_type === 'devis' && invoice.status !== 'payée' && (
                                <DropdownMenuItem onClick={() => handleConvertToInvoice(invoice)} className="text-green-400">
                                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Convertir en facture
                              </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem onClick={() => openPaymentDialog(invoice)} className="text-green-400">
                                <CreditCard className="w-4 h-4 mr-2" /> Enregistrer paiement
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem onClick={() => openEditSheet(invoice)} className="text-white">
                                <Edit className="w-4 h-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-red-400">
                                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create/Edit Sheet with Preview */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[1400px] p-0 bg-white/5 overflow-hidden">
          <div className="flex h-full">
            {/* Form Side - Full width on mobile, 50% on desktop */}
            <div className="w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto bg-white/5 backdrop-blur-xl border-r border-white/10">
              <SheetHeader className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-white flex items-center gap-2">
                    {documentType === 'devis' ? <FileText className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                    {editingInvoice ? `Modifier ${documentType === 'devis' ? 'le devis' : 'la facture'}` : `Nouvelle ${documentType === 'devis' ? 'devis' : 'facture'}`}
                  </SheetTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsDialogOpen(true)}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                    title="Paramètres du document"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </div>
              </SheetHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Client & Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Client *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.contact_id}
                        onValueChange={(value) => {
                          if (value === "new") {
                            setNewContactDialogOpen(true);
                          } else {
                            setFormData({...formData, contact_id: value});
                          }
                        }}
                        required
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                          <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-white/10 max-h-60">
                          <SelectItem value="new" className="text-indigo-400 font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Créer un nouveau client
                            </div>
                          </SelectItem>
                          <div className="border-t border-white/10 my-1"></div>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.first_name} {contact.last_name}
                              {contact.company && <span className="text-white/60 ml-1">({contact.company})</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Échéance</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                {/* Saved Services */}
                {savedServices.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-medium text-white">Services enregistrés</span>
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
                            <span className="ml-1 text-white/60">({formatCurrency(service.price)})</span>
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-white font-semibold">Lignes de facturation</Label>
                    <Button type="button" variant="ghost" onClick={addItem} className="text-indigo-400">
                      <Plus className="w-4 h-4 mr-1" /> Ajouter une ligne
                    </Button>
                  </div>
                  
                  {items.map((item, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/60">Ligne {index + 1}</span>
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
                        className="bg-white/5 backdrop-blur-xl border-white/10 text-white font-semibold"
                      />
                      <Textarea
                        placeholder="Description détaillée (optionnel)"
                        value={item.description || ""}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="bg-white/5 backdrop-blur-xl border-white/10 text-white text-sm"
                        rows={2}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-white/60">Quantité</Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            className="bg-white/5 backdrop-blur-xl border-white/10 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/60">Prix HT (€)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                            className="bg-white/5 backdrop-blur-xl border-white/10 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/60">Remise</Label>
                          <div className="flex gap-1">
                            <Select
                              value={item.discountType || "percent"}
                              onValueChange={(v) => updateItem(index, "discountType", v)}
                            >
                              <SelectTrigger className="w-16 bg-white/5 backdrop-blur-xl border-white/10 px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1a1a2e]">
                                <SelectItem value="percent">%</SelectItem>
                                <SelectItem value="fixed">€</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min="0"
                              step={item.discountType === "fixed" ? "0.01" : "1"}
                              placeholder="0"
                              value={item.discount || 0}
                              onChange={(e) => updateItem(index, "discount", e.target.value)}
                              className="flex-1 bg-white/5 backdrop-blur-xl border-white/10 text-white"
                            />
                          </div>
                        </div>
                      </div>
                      {(item.title || item.description) && item.unit_price > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-indigo-400">
                            {item.discount > 0 && (
                              <>Remise: -{formatCurrency(calculateLineDiscount(item))} {item.discountType === "percent" ? `(${item.discount}%)` : ''}</>
                            )}
                          </span>
                          <span className="font-medium text-white">
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
                    <Label className="text-white font-semibold flex items-center gap-2">
                      <Percent className="w-4 h-4 text-indigo-400" />
                      Remise globale
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={globalDiscount.type}
                      onValueChange={(v) => setGlobalDiscount({ ...globalDiscount, type: v })}
                    >
                      <SelectTrigger className="w-32 bg-white/5 backdrop-blur-xl border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a2e]">
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
                      className="flex-1 bg-white/5 backdrop-blur-xl border-white/10 text-white"
                    />
                  </div>
                  {globalDiscount.value > 0 && (
                    <div className="mt-2 text-sm text-indigo-400 font-medium">
                      Remise appliquée: -{formatCurrency(calculateGlobalDiscountAmount())}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-white">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
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
                    <div className="flex justify-between py-1 text-indigo-400">
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
                    <span className="font-mono text-indigo-400">{formatCurrency(calculateTotal())}</span>
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
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
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

      {/* Settings Dialog - Full Page Style like Qonto */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 max-w-6xl h-[90vh] p-0 flex flex-col">
          <div className="flex flex-1 min-h-0">
            {/* Left Panel - Settings with SCROLL */}
            <div className="w-full lg:w-1/2 flex flex-col min-h-0">
              <DialogHeader className="p-6 pb-4 border-b border-white/10 flex-shrink-0">
                <DialogTitle className="text-white flex items-center gap-2 text-xl">
                  <Settings className="w-6 h-6 text-indigo-400" />
                  Paramètres de facturation
                </DialogTitle>
                <p className="text-white/50 text-sm">Configurez les valeurs par défaut pour vos documents</p>
              </DialogHeader>
              
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Numbering Section */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Numérotation automatique
                </h3>
                <p className="text-white/50 text-xs">Assurez-vous que vos documents portent un numéro unique et séquentiel.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                    <Label className="text-white text-sm font-medium">Factures</Label>
                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs">Préfixe</Label>
                      <Input
                        value={invoiceSettings?.invoice_prefix || "FAC-(AAAA)-"}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, invoice_prefix: e.target.value})}
                        className="bg-white/5 border-white/10 text-white text-sm"
                        placeholder="FAC-(AAAA)-"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs">Prochain numéro</Label>
                      <Input
                        type="number"
                        value={invoiceSettings?.invoice_next_number || "1"}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, invoice_next_number: e.target.value})}
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                    <p className="text-xs text-indigo-400">Aperçu: FAC-2026-001</p>
                  </div>
                  
                  <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                    <Label className="text-white text-sm font-medium">Devis</Label>
                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs">Préfixe</Label>
                      <Input
                        value={invoiceSettings?.quote_prefix || "DEV-(AAAA)-"}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, quote_prefix: e.target.value})}
                        className="bg-white/5 border-white/10 text-white text-sm"
                        placeholder="DEV-(AAAA)-"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs">Prochain numéro</Label>
                      <Input
                        type="number"
                        value={invoiceSettings?.quote_next_number || "1"}
                        onChange={(e) => setInvoiceSettings({...invoiceSettings, quote_next_number: e.target.value})}
                        className="bg-white/5 border-white/10 text-white text-sm"
                      />
                    </div>
                    <p className="text-xs text-indigo-400">Aperçu: DEV-2026-001</p>
                  </div>
                </div>
              </div>
              
              {/* Company Info Section */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  Informations entreprise
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Nom de l'entreprise</Label>
                    <Input
                      value={invoiceSettings?.company_name || ""}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, company_name: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="Alpha Agency"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Email</Label>
                    <Input
                      value={invoiceSettings?.company_email || ""}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, company_email: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="contact@alphagency.fr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Adresse complète</Label>
                    <Input
                      value={invoiceSettings?.company_address || ""}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, company_address: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="Immeuble Carat, Jarry, 97122 Baie-Mahault"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Téléphone</Label>
                    <Input
                      value={invoiceSettings?.company_phone || ""}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, company_phone: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="06 90 55 30 18"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">SIRET</Label>
                    <Input
                      value={invoiceSettings?.company_siret || ""}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, company_siret: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="91255383100013"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">N° TVA Intracommunautaire</Label>
                    <Input
                      value={invoiceSettings?.company_vat || ""}
                      onChange={(e) => setInvoiceSettings({...invoiceSettings, company_vat: e.target.value})}
                      className="bg-white/5 border-white/10 text-white text-sm"
                      placeholder="FR47912553831"
                    />
                  </div>
                </div>
              </div>
              
              {/* Conditions Section */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Conditions de règlement</h3>
                <Textarea
                  value={invoiceSettings?.default_conditions || formData.conditions || ""}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, default_conditions: e.target.value})}
                  placeholder="• Ce devis est valable 30 jours...
• Paiement par virement bancaire..."
                  className="bg-white/5 border-white/10 text-white min-h-[120px] text-sm"
                />
              </div>
              
              {/* Bank Details Section */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Coordonnées bancaires</h3>
                <Textarea
                  value={invoiceSettings?.bank_details || formData.bank_details || ""}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, bank_details: e.target.value})}
                  placeholder="IBAN : FR76 ...
BIC/SWIFT : ...
BANQUE : ..."
                  className="bg-white/5 border-white/10 text-white min-h-[80px] text-sm"
                />
              </div>
              
              {/* Signature Text */}
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Texte avant signature (devis)</h3>
                <Input
                  value={invoiceSettings?.signature_text || "Bon pour accord"}
                  onChange={(e) => setInvoiceSettings({...invoiceSettings, signature_text: e.target.value})}
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
              </div>
              </div>
              
              {/* Action Buttons - Fixed at bottom */}
              <div className="flex gap-3 p-6 border-t border-white/10 flex-shrink-0 bg-[#0f0f1a]">
                <Button variant="outline" onClick={() => setSettingsDialogOpen(false)} className="flex-1 border-white/10 text-white hover:bg-white/5">
                  Annuler
                </Button>
                <Button onClick={saveSettings} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  <Save className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
              </div>
            </div>
            
            {/* Right Panel - Preview */}
            <div className="hidden lg:block lg:w-1/2 bg-white/5 border-l border-white/10 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-white font-semibold">Aperçu du document</h3>
                <div className="flex gap-2">
                  <Button 
                    variant={documentType === 'devis' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setDocumentType('devis')}
                    className={documentType === 'devis' ? 'bg-indigo-600' : 'border-white/10 text-white hover:bg-white/5'}
                  >
                    Devis
                  </Button>
                  <Button 
                    variant={documentType === 'facture' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setDocumentType('facture')}
                    className={documentType === 'facture' ? 'bg-indigo-600' : 'border-white/10 text-white hover:bg-white/5'}
                  >
                    Facture
                  </Button>
                </div>
              </div>
              
              {/* Full Preview */}
              <div className="bg-white rounded-lg shadow-lg p-6 text-black text-xs" style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%' }}>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <img src={COMPANY_INFO.logo} alt="Logo" className="h-10 mb-2" />
                    <p className="text-[8px] text-gray-500">{COMPANY_INFO.tagline}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-lg font-bold text-red-600 mb-1">
                      {documentType === 'devis' ? 'DEVIS' : 'FACTURE'}
                    </h2>
                    <p className="text-gray-600">N° {documentType === 'devis' ? (invoiceSettings?.quote_prefix || 'DEV-') : (invoiceSettings?.invoice_prefix || 'FAC-')}2026-001</p>
                    <p className="text-gray-600">Date: {new Date().toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                
                {/* Company & Client Side by Side */}
                <div className="flex justify-between mb-6 text-[10px]">
                  <div className="w-[45%]">
                    <p className="font-bold text-gray-800 mb-1">{invoiceSettings?.company_name || COMPANY_INFO.name}</p>
                    <p className="text-gray-600">{invoiceSettings?.company_address || `${COMPANY_INFO.address}, ${COMPANY_INFO.city}`}</p>
                    <p className="text-gray-600">Tél: {COMPANY_INFO.phone}</p>
                    <p className="text-gray-600">{COMPANY_INFO.email}</p>
                  </div>
                  <div className="w-[45%] text-right">
                    <p className="font-bold text-red-600 mb-1">DESTINATAIRE</p>
                    <p className="font-semibold text-gray-800">Nom du client</p>
                    <p className="text-gray-600">Entreprise</p>
                    <p className="text-gray-600">client@email.com</p>
                  </div>
                </div>
                
                {/* Items Table */}
                <table className="w-full mb-4 text-[9px]">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="p-2 text-left">Désignation</th>
                      <th className="p-2 text-center w-10">Qté</th>
                      <th className="p-2 text-right w-16">P.U. HT</th>
                      <th className="p-2 text-right w-14">TVA</th>
                      <th className="p-2 text-right w-16">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="p-2">
                        <div className="font-semibold">Prestation exemple</div>
                        <div className="text-gray-500 text-[8px]">Description du service</div>
                      </td>
                      <td className="p-2 text-center">1</td>
                      <td className="p-2 text-right">500,00 €</td>
                      <td className="p-2 text-right text-[8px]">8.5%<br/>(42,50 €)</td>
                      <td className="p-2 text-right font-semibold">500,00 €</td>
                    </tr>
                  </tbody>
                </table>
                
                {/* Totals */}
                <div className="flex justify-end mb-4">
                  <div className="w-48 text-[10px]">
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span>Total HT</span>
                      <span>500,00 €</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-200">
                      <span>TVA (8.5%)</span>
                      <span>42,50 €</span>
                    </div>
                    <div className="flex justify-between py-1 font-bold text-red-600">
                      <span>Total TTC</span>
                      <span>542,50 €</span>
                    </div>
                  </div>
                </div>
                
                {/* Conditions */}
                {invoiceSettings?.default_conditions && (
                  <div className="text-[8px] text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                    <p className="font-bold mb-1">Conditions de règlement:</p>
                    <p className="whitespace-pre-wrap">{invoiceSettings.default_conditions}</p>
                  </div>
                )}
                
                {/* Bank Details */}
                {invoiceSettings?.bank_details && (
                  <div className="text-[8px] text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                    <p className="font-bold mb-1">Détails du paiement:</p>
                    <p>Bénéficiaire: {COMPANY_INFO.name}</p>
                    <p className="whitespace-pre-wrap">{invoiceSettings.bank_details}</p>
                  </div>
                )}
                
                {/* Signature for quotes */}
                {documentType === 'devis' && (
                  <div className="text-[9px] text-gray-600 mt-4 pt-4 border-t">
                    <p className="font-bold mb-2">{invoiceSettings?.signature_text || "Bon pour accord"}</p>
                    <div className="w-48 border-b border-gray-400 h-8"></div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="border-t mt-4 pt-3 text-[7px] text-gray-500 text-center">
                  <p>{invoiceSettings?.company_name || COMPANY_INFO.name} - {invoiceSettings?.company_address || `${COMPANY_INFO.address}, ${COMPANY_INFO.city}`}</p>
                  <p>SIRET: {invoiceSettings?.company_siret || COMPANY_INFO.siret} | TVA: {invoiceSettings?.company_vat || COMPANY_INFO.tva}</p>
                  <p className="mt-1">En cas de retard de paiement: pénalités au taux légal x3 + 40€ de frais de recouvrement.</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Services Management Dialog */}
      <Dialog open={servicesDialogOpen} onOpenChange={setServicesDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Services enregistrés
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add New Service */}
            <div className="bg-white/5 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-white">Ajouter un nouveau service</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-white/60">Titre du service *</Label>
                  <Input
                    placeholder="Ex: Site web vitrine, Logo professionnel, Community Management..."
                    value={newService.title}
                    onChange={(e) => setNewService({...newService, title: e.target.value})}
                    className="bg-white/5 backdrop-blur-xl border-white/10 font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs text-white/60">Description détaillée</Label>
                  <Textarea
                    placeholder="Décrivez en détail ce que comprend ce service : fonctionnalités incluses, livrables, délais, etc."
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                    className="bg-white/5 backdrop-blur-xl border-white/10 min-h-[100px]"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-white/60">Prix HT (€) *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newService.price || ""}
                      onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value) || 0})}
                      className="bg-white/5 backdrop-blur-xl border-white/10"
                    />
                  </div>
                  <Button 
                    onClick={handleAddService} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
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
                <p className="text-center text-white/60 py-4">Aucun service enregistré</p>
              ) : (
                savedServices.map((service) => (
                  <div key={service.id} className="p-4 bg-white/5 rounded-lg">
                    {editingService?.id === service.id ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-white/60">Titre</Label>
                          <Input
                            value={editingService.title}
                            onChange={(e) => setEditingService({...editingService, title: e.target.value})}
                            className="bg-white/5 backdrop-blur-xl border-white/10 font-bold"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-white/60">Description</Label>
                          <Textarea
                            value={editingService.description || ""}
                            onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                            className="bg-white/5 backdrop-blur-xl border-white/10"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-white/60">Prix HT (€)</Label>
                            <Input
                              type="number"
                              value={editingService.price}
                              onChange={(e) => setEditingService({...editingService, price: parseFloat(e.target.value) || 0})}
                              className="bg-white/5 backdrop-blur-xl border-white/10"
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
                          <p className="font-bold text-white">{service.title}</p>
                          {service.description && (
                            <p className="text-sm text-white/60 mt-1 whitespace-pre-wrap">{service.description}</p>
                          )}
                          <p className="text-lg text-indigo-400 font-mono mt-2">{formatCurrency(service.price)}</p>
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
        <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white">
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
                    <p className="text-sm text-white/60">Client</p>
                    <p className="font-medium text-white">{getContactName(selectedInvoice.contact_id)}</p>
                    {getContactCompany(selectedInvoice.contact_id) && (
                      <p className="text-sm text-white/60">{getContactCompany(selectedInvoice.contact_id)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">Date d'émission</p>
                    <p className="font-medium text-white">{formatDate(selectedInvoice.created_at)}</p>
                    <p className="text-sm text-white/60 mt-2">Échéance</p>
                    <p className="font-medium text-white">{formatDate(selectedInvoice.due_date)}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-white/60">Description</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-white/60">Qté</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-white/60">Prix unitaire</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-white/60">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {selectedInvoice.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-white">{item.description}</td>
                          <td className="px-4 py-3 text-center text-white/60">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/60">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-mono text-white">{formatCurrency(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Sous-total HT</span>
                      <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">TVA (8.5%)</span>
                      <span className="font-mono">{formatCurrency(selectedInvoice.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                      <span className="text-white">Total TTC</span>
                      <span className="font-mono text-indigo-400">{formatCurrency(selectedInvoice.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Payments Section */}
                {selectedInvoice.status !== 'brouillon' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-400" />
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
                          className="text-indigo-400 border-indigo-500/50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Ajouter
                        </Button>
                      )}
                    </div>

                    {/* Payment Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-xs text-white/60">Total facture</p>
                        <p className="font-mono font-bold text-white">{formatCurrency(selectedInvoice.total)}</p>
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
                      <div className="border border-white/10 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-white/5">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium text-white/60">Date</th>
                              <th className="text-left px-4 py-2 text-xs font-medium text-white/60">Méthode</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-white/60">Montant</th>
                              <th className="text-right px-4 py-2 text-xs font-medium text-white/60">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E5E5]">
                            {selectedInvoice.payments.map((payment) => {
                              const method = paymentMethods[payment.payment_method] || paymentMethods.virement;
                              const MethodIcon = method.icon;
                              return (
                                <tr key={payment.id} className="hover:bg-white/5">
                                  <td className="px-4 py-3 text-sm text-white">
                                    {formatDate(payment.payment_date)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm text-white/60">
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
                      <div className="text-center py-6 text-white/60 bg-white/5 rounded-lg">
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
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

      {/* Email Confirmation Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-400" />
              Envoyer par email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              {emailInvoice?.document_type === 'devis' ? 'Devis' : 'Facture'} {emailInvoice?.invoice_number}
            </p>
            <div className="space-y-2">
              <Label className="text-white">Adresse email du destinataire</Label>
              <Input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="client@email.com"
              />
            </div>
            <p className="text-xs text-white/50">
              Une copie sera envoyée à leo.sperl@alphagency.com
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)} className="border-white/10 text-white hover:bg-white/5">
              Annuler
            </Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail || !emailRecipient} className="bg-emerald-600 hover:bg-emerald-700">
              {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 2: After Creation Dialog */}
      <Dialog open={phase2DialogOpen} onOpenChange={setPhase2DialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              {createdInvoice?.document_type === 'devis' ? 'Devis' : 'Facture'} créé{createdInvoice?.document_type === 'devis' ? '' : 'e'} !
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white font-mono text-lg">{createdInvoice?.invoice_number}</p>
              <p className="text-white/60 text-sm mt-1">
                {getContactName(createdInvoice?.contact_id)} • {formatCurrency(createdInvoice?.total || 0)}
              </p>
            </div>
            
            <p className="text-white/70 text-sm">Que souhaitez-vous faire ?</p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  const contact = contacts.find(c => c.id === createdInvoice?.contact_id);
                  setEmailInvoice(createdInvoice);
                  setEmailRecipient(contact?.email || "");
                  setPhase2DialogOpen(false);
                  setEmailDialogOpen(true);
                }}
                className="w-full justify-start bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30"
              >
                <Mail className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Envoyer par email</p>
                  <p className="text-xs text-emerald-400/70">Envoyer le document au client</p>
                </div>
              </Button>
              
              <Button 
                onClick={async () => {
                  if (createdInvoice) {
                    const type = createdInvoice.document_type === 'devis' ? 'devis' : 'facture';
                    await invoicesAPI.downloadPDF(createdInvoice.id, createdInvoice.invoice_number, type);
                    toast.success("PDF téléchargé");
                  }
                }}
                className="w-full justify-start bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-600/30"
              >
                <Download className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Télécharger le PDF</p>
                  <p className="text-xs text-indigo-400/70">Sauvegarder sur votre appareil</p>
                </div>
              </Button>
              
              <Button 
                onClick={() => {
                  if (createdInvoice) {
                    setSelectedInvoice(createdInvoice);
                    setPhase2DialogOpen(false);
                    setViewDialogOpen(true);
                  }
                }}
                className="w-full justify-start bg-white/5 hover:bg-white/10 text-white border border-white/10"
              >
                <Eye className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Voir l'aperçu</p>
                  <p className="text-xs text-white/50">Prévisualiser le document</p>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhase2DialogOpen(false)} className="border-white/10 text-white hover:bg-white/5">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Contact Dialog */}
      <Dialog open={newContactDialogOpen} onOpenChange={setNewContactDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              Nouveau client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Prénom</Label>
                <Input
                  value={newContactData.first_name}
                  onChange={(e) => setNewContactData({...newContactData, first_name: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Nom</Label>
                <Input
                  value={newContactData.last_name}
                  onChange={(e) => setNewContactData({...newContactData, last_name: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Entreprise</Label>
              <Input
                value={newContactData.company}
                onChange={(e) => setNewContactData({...newContactData, company: e.target.value})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Email</Label>
                <Input
                  type="email"
                  value={newContactData.email}
                  onChange={(e) => setNewContactData({...newContactData, email: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Téléphone</Label>
                <Input
                  value={newContactData.phone}
                  onChange={(e) => setNewContactData({...newContactData, phone: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Adresse</Label>
              <Input
                value={newContactData.address}
                onChange={(e) => setNewContactData({...newContactData, address: e.target.value})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Code postal</Label>
                <Input
                  value={newContactData.postal_code}
                  onChange={(e) => setNewContactData({...newContactData, postal_code: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Ville</Label>
                <Input
                  value={newContactData.city}
                  onChange={(e) => setNewContactData({...newContactData, city: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Pays</Label>
                <Input
                  value={newContactData.country}
                  onChange={(e) => setNewContactData({...newContactData, country: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewContactDialogOpen(false)} className="border-white/10 text-white hover:bg-white/5">
              Annuler
            </Button>
            <Button onClick={handleCreateNewContact} disabled={savingContact} className="bg-indigo-600 hover:bg-indigo-700">
              {savingContact ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Créer et sélectionner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPage;
