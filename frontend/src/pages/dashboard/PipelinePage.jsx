import { useState, useEffect } from "react";
import { Plus, Euro, Calendar, User, MoreVertical, Trash2, Archive, Edit } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "../../components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { dashboardAPI, opportunitiesAPI, contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const PipelinePage = () => {
  const [pipeline, setPipeline] = useState({});
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formData, setFormData] = useState({
    contact_id: "",
    title: "",
    amount: "",
    probability: 50,
    status: "nouveau",
    offer_type: "",
    expected_close_date: "",
    notes: ""
  });

  const columns = [
    { id: "nouveau", label: "Nouveau", color: "#3B82F6" },
    { id: "qualifié", label: "Qualifié", color: "#8B5CF6" },
    { id: "devis_envoyé", label: "Devis envoyé", color: "#F59E0B" },
    { id: "gagné", label: "Gagné", color: "#10B981" },
    { id: "perdu", label: "Perdu", color: "#EF4444" }
  ];

  const fetchData = async () => {
    try {
      const [pipelineRes, contactsRes] = await Promise.all([
        dashboardAPI.getPipeline(),
        contactsAPI.getAll()
      ]);
      setPipeline(pipelineRes.data);
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
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };
      
      if (editingOpp) {
        await opportunitiesAPI.update(editingOpp.id, data);
        toast.success("Opportunité mise à jour");
      } else {
        await opportunitiesAPI.create(data);
        toast.success("Opportunité créée");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleStatusChange = async (oppId, newStatus) => {
    try {
      await opportunitiesAPI.update(oppId, { status: newStatus });
      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (oppId) => {
    if (!window.confirm("Supprimer cette opportunité ?")) return;
    try {
      await opportunitiesAPI.delete(oppId);
      toast.success("Opportunité supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleArchive = async (oppId) => {
    try {
      await opportunitiesAPI.update(oppId, { archived: true });
      toast.success("Opportunité archivée");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleUnarchive = async (oppId) => {
    try {
      await opportunitiesAPI.update(oppId, { archived: false });
      toast.success("Opportunité restaurée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const openEditDialog = (opp) => {
    setEditingOpp(opp);
    setFormData({
      contact_id: opp.contact_id || "",
      title: opp.title,
      amount: opp.amount?.toString() || "",
      probability: opp.probability || 50,
      status: opp.status,
      offer_type: opp.offer_type || "",
      expected_close_date: opp.expected_close_date || "",
      notes: opp.notes || ""
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      contact_id: "",
      title: "",
      amount: "",
      probability: 50,
      status: "nouveau",
      offer_type: "",
      expected_close_date: "",
      notes: ""
    });
    setEditingOpp(null);
  };

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : "";
  };

  return (
    <div data-testid="pipeline-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Pipeline</h1>
          <p className="text-[#666666] text-sm">Gérez vos opportunités commerciales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-opportunity-btn"
              onClick={resetForm}
              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle opportunité
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-[#E5E5E5] max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#1A1A1A]">
                {editingOpp ? "Modifier l'opportunité" : "Nouvelle opportunité"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label className="text-[#1A1A1A]">Titre *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Ex: Site web vitrine"
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Montant (€) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                    placeholder="1000"
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Probabilité (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({...formData, probability: parseInt(e.target.value)})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Type d'offre</Label>
                  <Select
                    value={formData.offer_type}
                    onValueChange={(value) => setFormData({...formData, offer_type: value})}
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#E5E5E5]">
                      <SelectItem value="site_web">Site Web 90€/mois</SelectItem>
                      <SelectItem value="cm">Community Management</SelectItem>
                      <SelectItem value="photo">Photographie</SelectItem>
                      <SelectItem value="video">Vidéographie</SelectItem>
                      <SelectItem value="ads">Publicité Digitale</SelectItem>
                      <SelectItem value="pack_360">Pack 360°</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Date de clôture prévue</Label>
                  <Input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})}
                    className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                  />
                </div>
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
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#CE0202] hover:bg-[#B00202] text-white">
                  {editingOpp ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Board */}
      {loading ? (
        <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4">
          <div className="flex gap-4 min-w-max">
            {columns.map((col) => (
              <div key={col.id} className="flex-shrink-0 w-72">
                <div className="h-96 bg-[#E5E5E5] animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex gap-4 min-w-max">
            {columns.map((column) => {
              // Filter out archived opportunities unless showArchived is true
              const columnOpps = (pipeline[column.id] || []).filter(opp => showArchived || !opp.archived);
              
              return (
              <div 
                key={column.id}
                data-testid={`pipeline-column-${column.id}`}
                className="flex-shrink-0 w-72"
              >
                <div className="bg-white rounded-lg border border-[#E5E5E5] h-full">
                  <div className="p-4 border-b border-[#E5E5E5]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        <span className="text-[#1A1A1A] text-sm font-medium">
                          {column.label}
                        </span>
                        <Badge variant="secondary" className="bg-[#F8F8F8] text-[#666666]">
                          {columnOpps.length}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[#666666] text-xs font-mono mt-1">
                      {columnOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0).toLocaleString()}€
                    </p>
                  </div>
                  <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
                    {columnOpps.map((opp) => (
                      <div
                        key={opp.id}
                        data-testid={`opportunity-${opp.id}`}
                        className={`bg-[#F8F8F8] rounded-lg p-3 border border-[#E5E5E5] ${opp.archived ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[#1A1A1A] font-medium text-sm flex-1">{opp.title}</h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-1 -mt-1">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border-[#E5E5E5]">
                              <DropdownMenuItem onClick={() => openEditDialog(opp)}>
                                <Edit className="w-4 h-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              {opp.archived ? (
                                <DropdownMenuItem onClick={() => handleUnarchive(opp.id)}>
                                  <Archive className="w-4 h-4 mr-2" /> Restaurer
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleArchive(opp.id)}>
                                  <Archive className="w-4 h-4 mr-2" /> Archiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(opp.id)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#666666] mb-2 mt-1">
                          <User className="w-3 h-3" />
                          <span>
                            {opp.contact?.first_name} {opp.contact?.last_name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#CE0202] font-bold text-sm">
                            {opp.amount?.toLocaleString()}€
                          </span>
                          <Badge className="bg-[#E5E5E5] text-[#666666] text-xs">
                            {opp.probability}%
                          </Badge>
                        </div>
                        {opp.expected_close_date && (
                          <div className="flex items-center gap-1 text-xs text-[#666666] mt-2">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(opp.expected_close_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {/* Quick status change */}
                        <Select
                          value={opp.status}
                          onValueChange={(value) => handleStatusChange(opp.id, value)}
                        >
                          <SelectTrigger className="mt-3 h-8 text-xs bg-white border-[#E5E5E5] text-[#1A1A1A]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#E5E5E5]">
                            {columns.map((col) => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {columnOpps.length === 0 && (
                      <p className="text-[#666666] text-xs text-center py-8">
                        Aucune opportunité
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Show archived toggle */}
      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="text-[#666666]"
        >
          <Archive className="w-4 h-4 mr-2" />
          {showArchived ? "Masquer les archivées" : "Afficher les archivées"}
        </Button>
      </div>
    </div>
  );
};

export default PipelinePage;
