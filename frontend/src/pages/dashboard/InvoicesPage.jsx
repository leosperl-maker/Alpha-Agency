import { useState, useEffect } from "react";
import { 
  Plus, 
  Receipt, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Send,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Euro,
  Calendar,
  Building,
  FileText,
  Loader2,
  Copy,
  Printer,
  XCircle
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
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { invoicesAPI, contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const TVA_RATE = 0.085; // 8.5% TVA Guadeloupe

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [formData, setFormData] = useState({
    contact_id: "",
    due_date: "",
    payment_terms: "30",
    notes: "",
    conditions: "Paiement par virement bancaire ou chèque à l'ordre de Alpha Agency.",
    bank_details: "IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX\nBIC: XXXXXXXX"
  });

  const statusConfig = {
    brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: FileText },
    en_attente: { label: "En attente", color: "bg-blue-100 text-blue-700", icon: Clock },
    envoyee: { label: "Envoyée", color: "bg-purple-100 text-purple-700", icon: Mail },
    payee: { label: "Payée", color: "bg-green-100 text-green-700", icon: CheckCircle },
    en_retard: { label: "En retard", color: "bg-red-100 text-red-700", icon: AlertTriangle },
    annulee: { label: "Annulée", color: "bg-gray-100 text-gray-500", icon: XCircle }
  };

  const fetchData = async () => {
    try {
      const [invoicesRes, contactsRes] = await Promise.all([
        invoicesAPI.getAll(),
        contactsAPI.getAll()
      ]);
      setInvoices(invoicesRes.data);
      setContacts(contactsRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const validItems = items.filter(item => item.description && item.unit_price > 0);
      const payload = {
        ...formData,
        items: validItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price)
        }))
      };

      if (editingInvoice) {
        await invoicesAPI.update(editingInvoice.id, payload);
        toast.success("Facture mise à jour");
      } else {
        await invoicesAPI.create(payload);
        toast.success("Facture créée");
      }
      setDialogOpen(false);
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
    if (!window.confirm("Supprimer cette facture ?")) return;
    try {
      await invoicesAPI.delete(id);
      toast.success("Facture supprimée");
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
      toast.success("Facture dupliquée");
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
      conditions: "Paiement par virement bancaire ou chèque à l'ordre de Alpha Agency.",
      bank_details: "IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX\nBIC: XXXXXXXX"
    });
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setEditingInvoice(null);
  };

  const openEditDialog = (invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      contact_id: invoice.contact_id,
      due_date: invoice.due_date?.split('T')[0] || "",
      payment_terms: invoice.payment_terms || "30",
      notes: invoice.notes || "",
      conditions: invoice.conditions || "",
      bank_details: invoice.bank_details || ""
    });
    setItems(invoice.items?.length > 0 ? invoice.items : [{ description: "", quantity: 1, unit_price: 0 }]);
    setDialogOpen(true);
  };

  const openViewDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
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

  const calculateSubtotal = (invoiceItems = items) => {
    return invoiceItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTVA = (invoiceItems = items) => {
    return calculateSubtotal(invoiceItems) * TVA_RATE;
  };

  const calculateTotal = (invoiceItems = items) => {
    return calculateSubtotal(invoiceItems) + calculateTVA(invoiceItems);
  };

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : "Contact inconnu";
  };

  const getContactCompany = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
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
    .filter(i => i.status === "payee")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const totalOverdue = invoices
    .filter(i => i.status === "en_retard")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  return (
    <div data-testid="invoices-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Facturation</h1>
          <p className="text-[#666666] text-sm">{invoices.length} factures au total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-invoice-btn"
              onClick={resetForm}
              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-[#E5E5E5] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1A1A1A]">
                {editingInvoice ? `Modifier la facture ${editingInvoice.invoice_number}` : "Nouvelle facture"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Client *</Label>
                  <Select
                    value={formData.contact_id}
                    onValueChange={(value) => setFormData({...formData, contact_id: value})}
                    required
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          <div>
                            <span>{contact.first_name} {contact.last_name}</span>
                            {contact.company && (
                              <span className="text-[#666666] text-xs ml-2">({contact.company})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Date d'échéance</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Délai de paiement</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => setFormData({...formData, payment_terms: value})}
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
                      <SelectItem value="0">Paiement immédiat</SelectItem>
                      <SelectItem value="15">15 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="45">45 jours</SelectItem>
                      <SelectItem value="60">60 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[#1A1A1A] font-semibold">Lignes de la facture</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addItem}
                    className="text-[#CE0202] hover:text-[#B00202]"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une ligne
                  </Button>
                </div>
                
                <div className="bg-[#F8F8F8] rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[#666666] uppercase">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qté</div>
                    <div className="col-span-3 text-right">Prix unitaire HT</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <Input
                          placeholder="Description du service/produit"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          className="bg-white border-[#E5E5E5] text-[#1A1A1A] text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                            className="bg-white border-[#E5E5E5] text-[#1A1A1A] pr-8 text-right"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666]">€</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-600 h-8 w-8 p-0"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-[#1A1A1A] text-white rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Sous-total HT</span>
                    <span className="font-mono">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">TVA (8.5%)</span>
                    <span className="font-mono">{formatCurrency(calculateTVA())}</span>
                  </div>
                  <div className="border-t border-white/20 pt-2 flex justify-between text-xl font-bold">
                    <span>Total TTC</span>
                    <span className="font-mono text-[#CE0202]">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Notes (visible sur la facture)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                    rows={3}
                    placeholder="Notes ou mentions spéciales..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Conditions de paiement</Label>
                  <Textarea
                    value={formData.conditions}
                    onChange={(e) => setFormData({...formData, conditions: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Coordonnées bancaires</Label>
                <Textarea
                  value={formData.bank_details}
                  onChange={(e) => setFormData({...formData, bank_details: e.target.value})}
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A] font-mono text-sm"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving || !formData.contact_id}
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    editingInvoice ? "Mettre à jour" : "Créer la facture"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
            {searchQuery || filterStatus !== "all" ? "Aucune facture trouvée" : "Aucune facture créée"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase">Numéro</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase">Client</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase">Échéance</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-[#666666] uppercase">Montant TTC</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-[#666666] uppercase">Statut</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-[#666666] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status] || statusConfig.brouillon;
                const StatusIcon = status.icon;
                return (
                  <tr key={invoice.id} className="hover:bg-[#F8F8F8] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-[#1A1A1A]">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{getContactName(invoice.contact_id)}</p>
                        {getContactCompany(invoice.contact_id) && (
                          <p className="text-xs text-[#666666]">{getContactCompany(invoice.contact_id)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#666666]">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#666666]">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-bold text-[#1A1A1A]">{formatCurrency(invoice.total)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={`${status.color} border-none`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
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
                          <DropdownMenuItem onClick={() => openEditDialog(invoice)} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(invoice)} className="cursor-pointer">
                            <Copy className="w-4 h-4 mr-2" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => window.open(invoicesAPI.downloadPDF(invoice.id), '_blank')}
                            className="cursor-pointer"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {invoice.status !== "payee" && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(invoice.id, "payee")}
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
                          {!["annulee", "payee"].includes(invoice.status) && (
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

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-[#1A1A1A]">
                    Facture {selectedInvoice.invoice_number}
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

                {/* Notes */}
                {selectedInvoice.notes && (
                  <div className="bg-[#F8F8F8] rounded-lg p-4">
                    <p className="text-sm text-[#666666] mb-1">Notes</p>
                    <p className="text-[#1A1A1A]">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Fermer
                </Button>
                <Button 
                  onClick={() => window.open(invoicesAPI.downloadPDF(selectedInvoice.id), '_blank')}
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
    </div>
  );
};

export default InvoicesPage;
