import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone,
  Building,
  Calendar,
  Trash2,
  Edit,
  Upload,
  Briefcase,
  DollarSign,
  FileText,
  Info,
  Eye
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { contactsAPI } from "../../lib/api";
import { toast } from "sonner";
import ImportContactsDialog from "../../components/ImportContactsDialog";

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    city: "",
    poste: "",
    project_type: "",
    budget: "",
    note: "",
    infos_sup: "",
    status: "nouveau",
    score: "tiède"
  });

  const fetchContacts = async () => {
    try {
      const params = {};
      if (filterStatus !== "all") params.status = filterStatus;
      const response = await contactsAPI.getAll(params);
      setContacts(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactsAPI.update(editingContact.id, formData);
        toast.success("Contact mis à jour");
      } else {
        await contactsAPI.create(formData);
        toast.success("Contact créé");
      }
      setDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce contact ?")) return;
    try {
      await contactsAPI.delete(id);
      toast.success("Contact supprimé");
      fetchContacts();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      city: "",
      poste: "",
      project_type: "",
      budget: "",
      note: "",
      infos_sup: "",
      status: "nouveau",
      score: "tiède"
    });
    setEditingContact(null);
  };

  const openEditDialog = (contact) => {
    setEditingContact(contact);
    setFormData({
      ...contact,
      city: contact.city || "",
      poste: contact.poste || "",
      budget: contact.budget || "",
      note: contact.note || "",
      infos_sup: contact.infos_sup || "",
    });
    setDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.first_name?.toLowerCase().includes(searchLower) ||
      contact.last_name?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const styles = {
      nouveau: "bg-blue-100 text-blue-700",
      qualifie: "bg-purple-100 text-purple-700",
      en_discussion: "bg-yellow-100 text-yellow-700",
      client: "bg-green-100 text-green-700",
      perdu: "bg-red-100 text-red-700"
    };
    return styles[status] || styles.nouveau;
  };

  const getScoreBadge = (score) => {
    const styles = {
      chaud: "bg-red-100 text-red-700",
      tiede: "bg-yellow-100 text-yellow-700",
      froid: "bg-blue-100 text-blue-700"
    };
    return styles[score] || styles.tiede;
  };

  return (
    <div data-testid="contacts-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Contacts</h1>
          <p className="text-[#666666] text-sm">{contacts.length} contacts au total</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="border-[#CE0202] text-[#CE0202] hover:bg-[#CE0202]/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Importer</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="add-contact-btn"
                onClick={resetForm}
                className="bg-[#CE0202] hover:bg-[#B00202] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Nouveau contact</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-white border-[#E5E5E5] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1A1A1A]">
                {editingContact ? "Modifier le contact" : "Nouveau contact"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date de création (lecture seule) */}
              {editingContact && (
                <div className="p-3 bg-[#F8F8F8] rounded-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#666666]" />
                  <span className="text-sm text-[#666666]">
                    Créé le: <strong className="text-[#1A1A1A]">{formatDate(editingContact.created_at)}</strong>
                  </span>
                </div>
              )}
              
              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Prénom *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Nom *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>

              {/* Téléphone / Entreprise */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Entreprise</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Poste / Ville */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A] flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    Poste
                  </Label>
                  <Input
                    value={formData.poste}
                    onChange={(e) => setFormData({...formData, poste: e.target.value})}
                    placeholder="Ex: Directeur commercial"
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Ville</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A] flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Budget
                </Label>
                <Input
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  placeholder="Ex: 5 000 € - 10 000 €"
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>

              {/* Statut / Score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
                      <SelectItem value="nouveau">Nouveau</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="qualifie">Qualifié</SelectItem>
                      <SelectItem value="en_discussion">En discussion</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="perdu">Perdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Score</Label>
                  <Select
                    value={formData.score}
                    onValueChange={(value) => setFormData({...formData, score: value})}
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
                      <SelectItem value="chaud">Chaud</SelectItem>
                      <SelectItem value="tiède">Tiède</SelectItem>
                      <SelectItem value="froid">Froid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A] flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Note
                </Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Notes sur ce contact..."
                  rows={3}
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A] resize-none"
                />
              </div>

              {/* Informations supplémentaires */}
              <div className="space-y-2">
                <Label className="text-[#1A1A1A] flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Informations supplémentaires
                </Label>
                <Textarea
                  value={formData.infos_sup}
                  onChange={(e) => setFormData({...formData, infos_sup: e.target.value})}
                  placeholder="Informations diverses..."
                  rows={3}
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#CE0202] hover:bg-[#B00202] text-white">
                  {editingContact ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        {/* Import Dialog */}
        <ImportContactsDialog 
          open={importDialogOpen} 
          onOpenChange={setImportDialogOpen}
          onImportSuccess={() => {
            fetchContacts();
            toast.success("Import terminé avec succès");
          }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <Input
            data-testid="search-contacts"
            placeholder="Rechercher un contact..."
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
            <SelectItem value="nouveau">Nouveau</SelectItem>
            <SelectItem value="qualifie">Qualifié</SelectItem>
            <SelectItem value="en_discussion">En discussion</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="perdu">Perdu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-12 text-center">
          <p className="text-[#666666]">Aucun contact trouvé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContacts.map((contact) => (
            <div 
              key={contact.id}
              data-testid={`contact-${contact.id}`}
              className="bg-white rounded-lg border border-[#E5E5E5] p-4 hover:border-[#CE0202]/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#CE0202]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#CE0202] font-bold">
                      {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[#1A1A1A] font-semibold">
                      {contact.first_name} {contact.last_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-[#666666]">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </span>
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.company && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {contact.company}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <Badge className={getStatusBadge(contact.status)}>
                      {contact.status}
                    </Badge>
                    <Badge className={getScoreBadge(contact.score)}>
                      {contact.score}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(contact)}
                      className="text-[#666666] hover:text-[#1A1A1A]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-[#666666] hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default ContactsPage;
