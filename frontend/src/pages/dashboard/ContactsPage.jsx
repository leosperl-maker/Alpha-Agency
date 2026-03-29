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
import ContactDetailSheet from "../../components/ContactDetailSheet";

const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
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
    score: "tiède",
    siret: "",
    company_address: "",
    company_activite: ""
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
      nouveau: "bg-blue-100 text-blue-700 border border-blue-200",
      qualifie: "bg-purple-100 text-purple-700 border border-purple-200",
      en_discussion: "bg-amber-100 text-amber-700 border border-amber-200",
      client: "bg-green-100 text-green-700 border border-green-200",
      perdu: "bg-red-100 text-red-700 border border-red-200"
    };
    return styles[status] || styles.nouveau;
  };

  const getScoreBadge = (score) => {
    const styles = {
      chaud: "bg-red-100 text-red-700 border border-red-200",
      tiede: "bg-amber-100 text-amber-700 border border-amber-200",
      froid: "bg-blue-100 text-blue-700 border border-blue-200"
    };
    return styles[score] || styles.tiede;
  };

  return (
    <div data-testid="contacts-page" className="space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500 text-xs sm:text-sm">{contacts.length} contacts au total</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="border-indigo-500/50 text-indigo-600 hover:bg-indigo-50 flex-1 sm:flex-none text-sm"
          >
            <Upload className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Importer</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                data-testid="add-contact-btn"
                onClick={resetForm}
                className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1 sm:flex-none text-sm"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau contact</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                {editingContact ? "Modifier le contact" : "Nouveau contact"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date de création (lecture seule) */}
              {editingContact && (
                <div className="p-3 bg-white rounded-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-500">
                    Créé le: <strong className="text-slate-900">{formatDate(editingContact.created_at)}</strong>
                  </span>
                </div>
              )}
              
              {/* Prénom / Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900">Prénom *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900">Nom *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-slate-900">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-white border-slate-200 text-slate-900"
                />
              </div>

              {/* Téléphone / Entreprise */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900">Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900">Entreprise</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              {/* SIRET/SIREN */}
              <div className="space-y-2">
                <Label className="text-slate-900 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  SIRET / SIREN
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.siret || ""}
                    onChange={(e) => setFormData({...formData, siret: e.target.value})}
                    placeholder="Ex: 12345678901234"
                    className="bg-white border-slate-200 text-slate-900 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!formData.siret) {
                        toast.error("Entrez un SIRET ou SIREN");
                        return;
                      }
                      try {
                        const token = localStorage.getItem("alpha_token");
                        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/societe/company/${formData.siret}`, {
                          headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (data.company) {
                            setFormData({
                              ...formData,
                              company: data.company.nom || formData.company,
                              city: data.company.ville || formData.city,
                              company_address: `${data.company.adresse || ""} ${data.company.code_postal || ""} ${data.company.ville || ""}`.trim(),
                              company_activite: data.company.activite || ""
                            });
                            toast.success(`Entreprise trouvée: ${data.company.nom}`);
                          }
                        } else {
                          toast.error("Entreprise non trouvée");
                        }
                      } catch (err) {
                        toast.error("Erreur recherche entreprise");
                      }
                    }}
                    className="border-indigo-500/50 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                {formData.company_address && (
                  <p className="text-xs text-slate-500 mt-1">📍 {formData.company_address}</p>
                )}
              </div>

              {/* Poste / Ville */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    Poste
                  </Label>
                  <Input
                    value={formData.poste}
                    onChange={(e) => setFormData({...formData, poste: e.target.value})}
                    placeholder="Ex: Directeur commercial"
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900">Ville</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label className="text-slate-900 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Budget
                </Label>
                <Input
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  placeholder="Ex: 5 000 € - 10 000 €"
                  className="bg-white border-slate-200 text-slate-900"
                />
              </div>

              {/* Statut / Score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
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
                  <Label className="text-slate-900">Score</Label>
                  <Select
                    value={formData.score}
                    onValueChange={(value) => setFormData({...formData, score: value})}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="chaud">Chaud</SelectItem>
                      <SelectItem value="tiède">Tiède</SelectItem>
                      <SelectItem value="froid">Froid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label className="text-slate-900 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Note
                </Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  placeholder="Notes sur ce contact..."
                  rows={3}
                  className="bg-white border-slate-200 text-slate-900 resize-none"
                />
              </div>

              {/* Informations supplémentaires */}
              <div className="space-y-2">
                <Label className="text-slate-900 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Informations supplémentaires
                </Label>
                <Textarea
                  value={formData.infos_sup}
                  onChange={(e) => setFormData({...formData, infos_sup: e.target.value})}
                  placeholder="Informations diverses..."
                  rows={3}
                  className="bg-white border-slate-200 text-slate-900 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
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
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            data-testid="search-contacts"
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white shadow-sm border-slate-200 text-slate-900 w-full"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40 bg-white shadow-sm border-slate-200 text-slate-900">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem value="all">Tous</SelectItem>
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
        <div className="bg-white shadow-sm rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Aucun contact trouvé</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredContacts.map((contact) => (
            <div 
              key={contact.id}
              data-testid={`contact-${contact.id}`}
              className="bg-white shadow-sm rounded-lg border border-slate-200 p-3 sm:p-4 hover:border-indigo-500/50/30 transition-colors"
            >
              {/* Mobile Layout */}
              <div className="flex flex-col sm:hidden gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold text-sm">
                        {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-900 font-semibold text-sm truncate">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedContactId(contact.id);
                        setDetailSheetOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(contact)}
                      className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${getStatusBadge(contact.status)} text-xs`}>
                    {contact.status}
                  </Badge>
                  <Badge className={`${getScoreBadge(contact.score)} text-xs`}>
                    {contact.score}
                  </Badge>
                  {contact.company && (
                    <Badge variant="outline" className="text-xs">
                      <Building className="w-3 h-3 mr-1" />
                      {contact.company}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-bold">
                      {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold">
                      {contact.first_name} {contact.last_name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
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
                      onClick={() => {
                        setSelectedContactId(contact.id);
                        setDetailSheetOpen(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-600 hover:bg-indigo-50"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(contact)}
                      className="text-slate-500 hover:text-slate-900"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-slate-500 hover:text-red-500"
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

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        contactId={selectedContactId}
      />
    </div>
  );
};

export default ContactsPage;
