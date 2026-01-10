import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Send, Download, ArrowRight, Trash2, Eye, Receipt } from "lucide-react";
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
import { quotesAPI, contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const QuotesPage = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [formData, setFormData] = useState({
    contact_id: "",
    valid_until: "",
    notes: ""
  });

  const fetchData = async () => {
    try {
      const [quotesRes, contactsRes] = await Promise.all([
        quotesAPI.getAll(),
        contactsAPI.getAll()
      ]);
      setQuotes(quotesRes.data);
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
      await quotesAPI.create({
        contact_id: formData.contact_id,
        valid_until: formData.valid_until,
        notes: formData.notes,
        items: items.filter(item => item.description && item.unit_price > 0)
      });
      toast.success("Devis créé");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleSend = async (quoteId) => {
    try {
      await quotesAPI.send(quoteId);
      toast.success("Devis envoyé par email");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleConvertToInvoice = async (quoteId) => {
    try {
      const response = await quotesAPI.convertToInvoice(quoteId);
      const invoiceNumber = response.data?.invoice_number || '';
      toast.success(`Facture ${invoiceNumber} créée à partir du devis`, {
        action: {
          label: "Voir la facture",
          onClick: () => navigate('/admin/factures')
        }
      });
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la conversion en facture");
    }
  };

  const resetForm = () => {
    setFormData({ contact_id: "", valid_until: "", notes: "" });
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

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      brouillon: "bg-gray-100 text-gray-600",
      envoyé: "bg-blue-100 text-blue-700",
      accepté: "bg-green-100 text-green-700",
      refusé: "bg-red-100 text-red-700",
      expiré: "bg-yellow-100 text-yellow-700"
    };
    return styles[status] || styles.brouillon;
  };

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : "Contact inconnu";
  };

  return (
    <div data-testid="quotes-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Devis</h1>
          <p className="text-white/60 text-sm">{quotes.length} devis au total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-quote-btn"
              onClick={resetForm}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau devis
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Nouveau devis</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Contact *</Label>
                  <Select
                    value={formData.contact_id}
                    onValueChange={(value) => setFormData({...formData, contact_id: value})}
                    required
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Sélectionner un contact" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/5 backdrop-blur-xl border-white/10">
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Date de validité</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <Label className="text-white">Lignes du devis</Label>
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Prix €"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-400"
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={addItem}
                  className="text-indigo-400"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </div>

              {/* Total */}
              <div className="text-right p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-white/60 text-sm">Sous-total HT</p>
                <p className="text-2xl font-bold text-white font-mono">
                  {calculateTotal().toLocaleString()}€
                </p>
                <p className="text-white/60 text-sm">
                  + TVA (8.5%) = {(calculateTotal() * 1.085).toLocaleString()}€ TTC
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  Créer le devis
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quotes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-12 text-center">
          <FileText className="w-12 h-12 text-white/60 mx-auto mb-4" />
          <p className="text-white/60">Aucun devis créé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div 
              key={quote.id}
              data-testid={`quote-${quote.id}`}
              className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-4 hover:border-indigo-500/50/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">
                      {quote.quote_number}
                    </h3>
                    <p className="text-sm text-white/60">
                      {getContactName(quote.contact_id)}
                    </p>
                    <p className="text-xs text-white/60">
                      Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-white font-mono">
                      {quote.total?.toLocaleString()}€
                    </p>
                    <Badge className={getStatusBadge(quote.status)}>
                      {quote.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={quotesAPI.downloadPDF(quote.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {quote.status === "brouillon" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSend(quote.id)}
                        className="text-white/60 hover:text-white"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    {quote.status === "envoyé" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConvertToInvoice(quote.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Convertir en facture"
                      >
                        <Receipt className="w-4 h-4 mr-1" />
                        <span className="text-xs hidden sm:inline">Facturer</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotesPage;
