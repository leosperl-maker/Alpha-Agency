import { useState, useEffect } from "react";
import { Plus, Euro, Calendar, User, MoreVertical, Trash2, Archive, Edit, Settings2, GripVertical, Palette, X, Check } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
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
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { dashboardAPI, opportunitiesAPI, contactsAPI, pipelineColumnsAPI } from "../../lib/api";
import { toast } from "sonner";

const PipelinePage = () => {
  const [pipeline, setPipeline] = useState({});
  const [contacts, setContacts] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [columnForm, setColumnForm] = useState({ id: "", label: "", color: "#3B82F6" });
  
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

  // Predefined colors for columns
  const columnColors = [
    "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444",
    "#EC4899", "#06B6D4", "#F97316", "#84CC16", "#6366F1"
  ];

  const fetchData = async () => {
    try {
      const [pipelineRes, contactsRes, columnsRes] = await Promise.all([
        dashboardAPI.getPipeline(),
        contactsAPI.getAll(),
        pipelineColumnsAPI.getAll()
      ]);
      setPipeline(pipelineRes.data);
      setContacts(contactsRes.data);
      setColumns(columnsRes.data);
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
      status: columns.length > 0 ? columns[0].id : "nouveau",
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

  // Column management handlers
  const openColumnDialog = (column = null) => {
    if (column) {
      setEditingColumn(column);
      setColumnForm({ id: column.id, label: column.label, color: column.color });
    } else {
      setEditingColumn(null);
      setColumnForm({ id: "", label: "", color: "#3B82F6" });
    }
    setColumnDialogOpen(true);
  };

  const handleSaveColumn = async () => {
    if (!columnForm.label.trim()) {
      toast.error("Le nom de la colonne est requis");
      return;
    }

    try {
      if (editingColumn) {
        // Update existing column
        await pipelineColumnsAPI.update(editingColumn.id, {
          label: columnForm.label,
          color: columnForm.color
        });
        toast.success("Colonne mise à jour");
      } else {
        // Create new column - generate ID from label
        const columnId = columnForm.label
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
        
        if (!columnId) {
          toast.error("Nom de colonne invalide");
          return;
        }

        await pipelineColumnsAPI.create({
          id: columnId,
          label: columnForm.label,
          color: columnForm.color
        });
        toast.success("Colonne créée");
      }
      setColumnDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleDeleteColumn = async (columnId) => {
    const column = columns.find(c => c.id === columnId);
    const oppsCount = (pipeline[columnId] || []).length;
    
    const message = oppsCount > 0 
      ? `Supprimer la colonne "${column?.label}" ? Les ${oppsCount} opportunité(s) seront déplacées vers la première colonne.`
      : `Supprimer la colonne "${column?.label}" ?`;
    
    if (!window.confirm(message)) return;
    
    try {
      await pipelineColumnsAPI.delete(columnId);
      toast.success("Colonne supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleInitializeColumns = async () => {
    try {
      await pipelineColumnsAPI.initialize();
      toast.success("Colonnes initialisées");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  return (
    <div data-testid="pipeline-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Pipeline</h1>
          <p className="text-[#666666] text-sm">Gérez vos opportunités commerciales</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Column management button */}
          <Button 
            variant="outline" 
            onClick={() => openColumnDialog()}
            className="border-[#CE0202] text-[#CE0202]"
            data-testid="add-column-btn"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Ajouter une étape
          </Button>
          
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
            <DialogContent className="bg-white border-[#E5E5E5] max-w-lg max-h-[90vh] overflow-y-auto">
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
      </div>

      {/* Pipeline Board */}
      {loading ? (
        <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4">
          <div className="flex gap-4 min-w-max">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex-shrink-0 w-72">
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
                      {/* Column actions menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-4 h-4 text-[#666666]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white border-[#E5E5E5]">
                          <DropdownMenuItem onClick={() => openColumnDialog(column)}>
                            <Edit className="w-4 h-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteColumn(column.id)} 
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Column Dialog */}
      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">
              {editingColumn ? "Modifier l'étape" : "Nouvelle étape du pipeline"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Nom de l'étape *</Label>
              <Input
                value={columnForm.label}
                onChange={(e) => setColumnForm({...columnForm, label: e.target.value})}
                placeholder="Ex: Négociation, Contrat signé..."
                className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {columnColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setColumnForm({...columnForm, color})}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${columnForm.color === color ? 'border-[#1A1A1A] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-[#F8F8F8] rounded-lg border border-[#E5E5E5]">
              <p className="text-xs text-[#666666] mb-2">Aperçu</p>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: columnForm.color }}
                />
                <span className="text-[#1A1A1A] text-sm font-medium">
                  {columnForm.label || "Nom de l'étape"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveColumn} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              {editingColumn ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelinePage;
