import { useState, useEffect } from "react";
import { Plus, Receipt, Download, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { invoicesAPI, contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [formData, setFormData] = useState({
    contact_id: "",
    due_date: "",
    notes: ""
  });

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
    try {
      await invoicesAPI.create({
        contact_id: formData.contact_id,
        due_date: formData.due_date,
        notes: formData.notes,
        items: items.filter(item => item.description && item.unit_price > 0)
      });
      toast.success("Facture créée");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleStatusUpdate = async (invoiceId, status) => {
    try {
      await invoicesAPI.updateStatus(invoiceId, status);
      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const resetForm = () => {
    setFormData({ contact_id: "", due_date: "", notes: "" });
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === "quantity" || field === "unit_price" ? parseFloat(value) || 0 : value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      en_attente: { class: "bg-yellow-100 text-yellow-700", icon: Clock },
      payée: { class: "bg-green-100 text-green-700", icon: CheckCircle },
      en_retard: { class: "bg-red-100 text-red-700", icon: AlertTriangle },
      annulée: { class: "bg-gray-100 text-gray-600", icon: null }
    };
    return styles[status] || styles.en_attente;
  };

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : "Contact inconnu";
  };

  // Calculate totals
  const totalPending = invoices
    .filter(i => i.status === "en_attente")
    .reduce((sum, i) => sum + (i.total || 0), 0);
  
  const totalPaid = invoices
    .filter(i => i.status === "payée")
    .reduce((sum, i) => sum + (i.total || 0), 0);

  return (
    <div data-testid="invoices-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Factures</h1>
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
          <DialogContent className="bg-white border-[#E5E5E5] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1A1A1A]">Nouvelle facture</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Contact *</Label>
                  <Select
                    value={formData.contact_id}
                    onValueChange={(value) => setFormData({...formData, contact_id: value})}
                    required
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue placeholder="Sélectionner un contact" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
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
              </div>

              {/* Items */}
              <div className="space-y-3">
                <Label className="text-[#1A1A1A]">Lignes de la facture</Label>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Prix €"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                        className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={addItem}
                  className="text-[#CE0202]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </div>

              {/* Total */}
              <div className="text-right p-4 bg-[#F8F8F8] rounded-lg border border-[#E5E5E5]">
                <p className="text-[#666666] text-sm">Sous-total HT</p>
                <p className="text-2xl font-bold text-[#1A1A1A] font-mono">
                  {calculateTotal().toLocaleString()}€
                </p>
                <p className="text-[#666666] text-sm">
                  + TVA (8.5%) = {(calculateTotal() * 1.085).toLocaleString()}€ TTC
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#CE0202] hover:bg-[#B00202] text-white">
                  Créer la facture
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-[#666666] text-sm">En attente</p>
              <p className="text-xl font-bold text-[#1A1A1A] font-mono">{totalPending.toLocaleString()}€</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-[#666666] text-sm">Payées</p>
              <p className="text-xl font-bold text-[#1A1A1A] font-mono">{totalPaid.toLocaleString()}€</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[#666666] text-sm">En retard</p>
              <p className="text-xl font-bold text-[#1A1A1A] font-mono">
                {invoices.filter(i => i.status === "en_retard").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-12 text-center">
          <Receipt className="w-12 h-12 text-[#666666] mx-auto mb-4" />
          <p className="text-[#666666]">Aucune facture créée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const statusInfo = getStatusBadge(invoice.status);
            return (
              <div 
                key={invoice.id}
                data-testid={`invoice-${invoice.id}`}
                className="bg-white rounded-lg border border-[#E5E5E5] p-4 hover:border-[#CE0202]/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#CE0202]/10 rounded-lg flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-[#CE0202]" />
                    </div>
                    <div>
                      <h3 className="text-[#1A1A1A] font-semibold">
                        {invoice.invoice_number}
                      </h3>
                      <p className="text-sm text-[#666666]">
                        {getContactName(invoice.contact_id)}
                      </p>
                      <p className="text-xs text-[#666666]">
                        Échéance : {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : 'Non définie'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#1A1A1A] font-mono">
                        {invoice.total?.toLocaleString()}€
                      </p>
                      <Badge className={statusInfo.class}>
                        {invoice.status?.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={invoicesAPI.downloadPDF(invoice.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm" className="text-[#666666] hover:text-[#1A1A1A]">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                      {invoice.status === "en_attente" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusUpdate(invoice.id, "payée")}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
