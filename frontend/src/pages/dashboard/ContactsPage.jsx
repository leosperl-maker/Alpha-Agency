import { useState, useEffect } from "react";
import {
  Plus, Search, Filter, Mail, Phone, Building, Calendar, Trash2,
  Edit, Upload, Briefcase, DollarSign, FileText, Info, Eye
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { contactsAPI } from "../../lib/api";
import { toast } from "sonner";
import ImportContactsDialog from "../../components/ImportContactsDialog";
import ContactDetailSheet from "../../components/ContactDetailSheet";

const STATUS_LABEL = {
  nouveau: "Nouveau", prospect: "Prospect", qualifie: "Qualifié",
  en_discussion: "En discussion", client: "Client", vip: "VIP",
  inactif: "Inactif", perdu: "Perdu",
};
const STATUS_TONE = {
  nouveau: "bg-info-soft text-info", prospect: "bg-info-soft text-info",
  qualifie: "bg-brand-soft text-primary", en_discussion: "bg-warning-soft text-warning",
  client: "bg-success-soft text-success", vip: "bg-brand-soft text-primary",
  inactif: "bg-secondary text-muted-foreground", perdu: "bg-danger-soft text-danger",
};
const SCORE_TONE = {
  chaud: "bg-danger-soft text-danger", chaude: "bg-danger-soft text-danger",
  tiède: "bg-warning-soft text-warning", tiede: "bg-warning-soft text-warning",
  froid: "bg-info-soft text-info",
};

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
    first_name: "", last_name: "", email: "", phone: "", company: "", city: "",
    poste: "", project_type: "", budget: "", note: "", infos_sup: "",
    status: "nouveau", score: "tiède", siret: "", company_address: "", company_activite: ""
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

  useEffect(() => { fetchContacts(); }, [filterStatus]); // eslint-disable-line

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
      first_name: "", last_name: "", email: "", phone: "", company: "", city: "",
      poste: "", project_type: "", budget: "", note: "", infos_sup: "",
      status: "nouveau", score: "tiède", siret: "", company_address: "", company_activite: ""
    });
    setEditingContact(null);
  };

  const openEditDialog = (contact) => {
    setEditingContact(contact);
    setFormData({
      ...contact,
      city: contact.city || "", poste: contact.poste || "", budget: contact.budget || "",
      note: contact.note || "", infos_sup: contact.infos_sup || "",
    });
    setDialogOpen(true);
  };

  const openDetail = (id) => { setSelectedContactId(id); setDetailSheetOpen(true); };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return dateStr; }
  };

  const lookupSiret = async () => {
    if (!formData.siret) { toast.error("Entrez un SIRET ou SIREN"); return; }
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/societe/company/${formData.siret}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          setFormData(prev => ({
            ...prev,
            company: data.company.nom || prev.company,
            city: data.company.ville || prev.city,
            company_address: `${data.company.adresse || ""} ${data.company.code_postal || ""} ${data.company.ville || ""}`.trim(),
            company_activite: data.company.activite || ""
          }));
          toast.success(`Entreprise trouvée: ${data.company.nom}`);
        }
      } else { toast.error("Entreprise non trouvée"); }
    } catch { toast.error("Erreur recherche entreprise"); }
  };

  const filteredContacts = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q);
  });

  const clientCount = contacts.filter(c => c.status === "client" || c.status === "vip").length;

  return (
    <div data-testid="contacts-page" className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Contacts</h1>
          <p className="text-muted-foreground text-sm">{contacts.length} contacts · {clientCount} clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="border-border">
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Importer</span>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-contact-btn" onClick={resetForm}>
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau contact</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editingContact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {editingContact && (
                  <div className="p-3 bg-secondary rounded-xl flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Créé le : <strong className="text-foreground">{formatDate(editingContact.created_at)}</strong></span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Entreprise</Label>
                    <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Building className="w-3 h-3" /> SIRET / SIREN</Label>
                  <div className="flex gap-2">
                    <Input value={formData.siret || ""} onChange={(e) => setFormData({ ...formData, siret: e.target.value })} placeholder="Ex : 12345678901234" className="flex-1" />
                    <Button type="button" variant="outline" onClick={lookupSiret} className="border-border"><Search className="w-4 h-4" /></Button>
                  </div>
                  {formData.company_address && <p className="text-xs text-muted-foreground mt-1">📍 {formData.company_address}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Poste</Label>
                    <Input value={formData.poste} onChange={(e) => setFormData({ ...formData, poste: e.target.value })} placeholder="Ex : Gérant" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget</Label>
                  <Input value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="Ex : 5 000 € - 10 000 €" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Score</Label>
                    <Select value={formData.score} onValueChange={(v) => setFormData({ ...formData, score: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chaud">Chaud</SelectItem>
                        <SelectItem value="tiède">Tiède</SelectItem>
                        <SelectItem value="froid">Froid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><FileText className="w-3 h-3" /> Note</Label>
                  <Textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Notes sur ce contact…" rows={3} className="resize-none" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Info className="w-3 h-3" /> Informations supplémentaires</Label>
                  <Textarea value={formData.infos_sup} onChange={(e) => setFormData({ ...formData, infos_sup: e.target.value })} placeholder="Informations diverses…" rows={3} className="resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" className="border-border" onClick={() => setDialogOpen(false)}>Annuler</Button>
                  <Button type="submit">{editingContact ? "Mettre à jour" : "Créer"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="search-contacts" placeholder="Rechercher un contact…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">{[1, 2, 3, 4].map(i => <div key={i} className="h-[72px] bg-card border border-border animate-pulse rounded-2xl" />)}</div>
      ) : filteredContacts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Aucun contact trouvé</p>
          <Button onClick={resetForm} className="mt-3"><Plus className="w-4 h-4 mr-2" /> Créer un contact</Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              data-testid={`contact-${contact.id}`}
              onClick={() => openDetail(contact.id)}
              className="group bg-card border border-border rounded-2xl p-3.5 sm:p-4 hover:border-primary/30 hover:shadow-elev transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E11D2E] to-[#7A0F2B] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-foreground font-semibold truncate">{contact.first_name} {contact.last_name}</h3>
                    <Badge className={`${STATUS_TONE[contact.status] || STATUS_TONE.nouveau} border-0 text-[11px] hidden sm:inline-flex`}>{STATUS_LABEL[contact.status] || contact.status}</Badge>
                    {contact.score && <Badge className={`${SCORE_TONE[contact.score] || SCORE_TONE.tiède} border-0 text-[11px] hidden sm:inline-flex`}>{contact.score}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground mt-0.5 min-w-0">
                    <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{contact.email}</span>
                    {contact.company && <span className="hidden md:flex items-center gap-1 truncate"><Building className="w-3 h-3 flex-shrink-0" />{contact.company}</span>}
                    {contact.phone && <span className="hidden lg:flex items-center gap-1 truncate"><Phone className="w-3 h-3 flex-shrink-0" />{contact.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => openDetail(contact.id)} className="h-9 w-9 p-0 text-muted-foreground hover:text-primary" title="Voir"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(contact)} className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground" title="Modifier"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)} className="h-9 w-9 p-0 text-muted-foreground hover:text-danger" title="Supprimer"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {/* Mobile badges */}
              <div className="flex sm:hidden flex-wrap gap-1.5 mt-3">
                <Badge className={`${STATUS_TONE[contact.status] || STATUS_TONE.nouveau} border-0 text-[11px]`}>{STATUS_LABEL[contact.status] || contact.status}</Badge>
                {contact.score && <Badge className={`${SCORE_TONE[contact.score] || SCORE_TONE.tiède} border-0 text-[11px]`}>{contact.score}</Badge>}
                {contact.company && <Badge variant="outline" className="text-[11px] border-border"><Building className="w-3 h-3 mr-1" />{contact.company}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      <ImportContactsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImportSuccess={() => { fetchContacts(); toast.success("Import terminé avec succès"); }} />
      <ContactDetailSheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen} contactId={selectedContactId} />
    </div>
  );
};

export default ContactsPage;
