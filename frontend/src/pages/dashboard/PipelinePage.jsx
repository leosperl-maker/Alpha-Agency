import { useState, useEffect } from "react";
import { Plus, Euro, Calendar, User } from "lucide-react";
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
      await opportunitiesAPI.create({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success("Opportunité créée");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la création");
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
  };

  const getColumnTotal = (columnId) => {
    const opps = pipeline[columnId] || [];
    return opps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
  };

  return (
    <div data-testid="pipeline-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Pipeline</h1>
          <p className="text-[#A1A1AA]">Gérez vos opportunités commerciales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-opportunity-btn"
              onClick={resetForm}
              className="bg-[#6A0F1A] hover:bg-[#8B1422] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle opportunité
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0A0A] border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Nouvelle opportunité</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Contact *</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(value) => setFormData({...formData, contact_id: value})}
                  required
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue placeholder="Sélectionner un contact" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10">
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Ex: Site web vitrine"
                  className="bg-black/50 border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montant (€) *</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                    placeholder="1000"
                    className="bg-black/50 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Probabilité (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({...formData, probability: parseInt(e.target.value)})}
                    className="bg-black/50 border-white/10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type d'offre</Label>
                  <Select
                    value={formData.offer_type}
                    onValueChange={(value) => setFormData({...formData, offer_type: value})}
                  >
                    <SelectTrigger className="bg-black/50 border-white/10">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-white/10">
                      <SelectItem value="site_web">Site Web 90€/mois</SelectItem>
                      <SelectItem value="cm">Community Management</SelectItem>
                      <SelectItem value="photo">Photography</SelectItem>
                      <SelectItem value="video">Vidéography</SelectItem>
                      <SelectItem value="ads">Publicité Digitale</SelectItem>
                      <SelectItem value="pack_360">Pack 360°</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date de clôture prévue</Label>
                  <Input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})}
                    className="bg-black/50 border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="bg-black/50 border-white/10"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-[#6A0F1A] hover:bg-[#8B1422]">
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className="h-96 bg-white/5 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div 
              key={column.id}
              data-testid={`pipeline-column-${column.id}`}
              className="flex-shrink-0 w-72"
            >
              <Card className="pipeline-column h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <CardTitle className="text-white text-sm font-medium">
                        {column.label}
                      </CardTitle>
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        {(pipeline[column.id] || []).length}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[#A1A1AA] text-xs font-mono">
                    {getColumnTotal(column.id).toLocaleString()}€
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(pipeline[column.id] || []).map((opp) => (
                    <div
                      key={opp.id}
                      data-testid={`opportunity-${opp.id}`}
                      className="pipeline-card"
                    >
                      <h4 className="text-white font-medium text-sm mb-2">{opp.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-[#A1A1AA] mb-2">
                        <User className="w-3 h-3" />
                        <span>
                          {opp.contact?.first_name} {opp.contact?.last_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6A0F1A] font-bold text-sm">
                          {opp.amount?.toLocaleString()}€
                        </span>
                        <Badge className="bg-white/10 text-white text-xs">
                          {opp.probability}%
                        </Badge>
                      </div>
                      {opp.expected_close_date && (
                        <div className="flex items-center gap-1 text-xs text-[#A1A1AA] mt-2">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(opp.expected_close_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      {/* Quick status change */}
                      <Select
                        value={opp.status}
                        onValueChange={(value) => handleStatusChange(opp.id, value)}
                      >
                        <SelectTrigger className="mt-3 h-8 text-xs bg-black/30 border-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A0A0A] border-white/10">
                          {columns.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {(pipeline[column.id] || []).length === 0 && (
                    <p className="text-[#A1A1AA] text-xs text-center py-8">
                      Aucune opportunité
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PipelinePage;
