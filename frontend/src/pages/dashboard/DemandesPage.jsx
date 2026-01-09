import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Inbox, Eye, Trash2, Mail, Phone, Building, Calendar, MessageSquare, 
  ChevronRight, Search, Filter, Clock, CheckCircle, AlertCircle, User
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const DemandesPage = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Status configuration
  const statusConfig = {
    nouveau: { label: "Non traité", color: "bg-blue-100 text-blue-700", icon: Clock },
    contacté: { label: "Contacté", color: "bg-yellow-100 text-yellow-700", icon: Phone },
    qualifié: { label: "Qualifié", color: "bg-purple-100 text-purple-700", icon: CheckCircle },
    converti: { label: "Converti", color: "bg-green-100 text-green-700", icon: CheckCircle },
    perdu: { label: "Perdu", color: "bg-red-100 text-red-700", icon: AlertCircle }
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      const response = await contactsAPI.getAll();
      const websiteLeads = response.data.filter(c => c.source === "website");
      setDemandes(websiteLeads);
    } catch (error) {
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  // Filter demandes
  const filteredDemandes = demandes.filter(demande => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = `${demande.first_name} ${demande.last_name}`.toLowerCase().includes(query);
      const matchesEmail = demande.email?.toLowerCase().includes(query);
      const matchesCompany = demande.company?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail && !matchesCompany) return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && demande.status !== statusFilter) return false;
    
    return true;
  });

  // Calculate stats
  const stats = {
    total: demandes.length,
    nonTraite: demandes.filter(d => d.status === "nouveau" || !d.status).length,
    contacte: demandes.filter(d => d.status === "contacté").length,
    qualifie: demandes.filter(d => d.status === "qualifié").length,
    converti: demandes.filter(d => d.status === "converti").length
  };

  const handleViewDemande = (demande) => {
    setSelectedDemande(demande);
    setDialogOpen(true);
  };

  const handleDeleteDemande = async (id) => {
    if (!window.confirm("Supprimer cette demande ?")) return;
    try {
      await contactsAPI.delete(id);
      toast.success("Demande supprimée");
      fetchDemandes();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await contactsAPI.update(id, { status: newStatus });
      toast.success("Statut mis à jour");
      fetchDemandes();
      if (selectedDemande?.id === id) {
        setSelectedDemande({ ...selectedDemande, status: newStatus });
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProjectTypeLabel = (type) => {
    const types = {
      site_vitrine: "Site vitrine",
      site_ecommerce: "Site e-commerce",
      community_management: "Community Management",
      photo: "Photo",
      video: "Vidéo",
      infographie: "Infographie",
      ads: "Publicité digitale",
      pack_360: "Pack 360°",
      autre: "Autre"
    };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.nouveau;
    return config.color;
  };

  return (
    <div data-testid="demandes-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Demandes</h1>
          <p className="text-[#666666]">Gérez les demandes reçues via le formulaire de contact</p>
        </div>
        <Badge className="bg-[#CE0202]/10 text-[#CE0202] border-[#CE0202]/20">
          {demandes.length} demande{demandes.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#CE0202]/10">
                <Inbox className="w-5 h-5 text-[#CE0202]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</p>
                <p className="text-xs text-[#666666]">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.nonTraite}</p>
                <p className="text-xs text-[#666666]">Non traité</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Phone className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.contacte}</p>
                <p className="text-xs text-[#666666]">Contacté</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.qualifie}</p>
                <p className="text-xs text-[#666666]">Qualifié</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.converti}</p>
                <p className="text-xs text-[#666666]">Converti</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email ou entreprise..."
            className="pl-10 bg-white border-[#E5E5E5]"
            data-testid="search-demandes"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-[#E5E5E5]" data-testid="filter-status">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E5E5E5]">
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="nouveau">Non traité</SelectItem>
            <SelectItem value="contacté">Contacté</SelectItem>
            <SelectItem value="qualifié">Qualifié</SelectItem>
            <SelectItem value="converti">Converti</SelectItem>
            <SelectItem value="perdu">Perdu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Demandes List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredDemandes.length === 0 ? (
        <Card className="bg-white border border-[#E5E5E5]">
          <CardContent className="py-16 text-center">
            <Inbox className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">
              {searchQuery || statusFilter !== "all" ? "Aucun résultat" : "Aucune demande"}
            </h3>
            <p className="text-[#666666]">
              {searchQuery || statusFilter !== "all" 
                ? "Essayez de modifier vos filtres"
                : "Les demandes soumises via le formulaire de contact apparaîtront ici."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDemandes.map((demande, index) => (
            <motion.div
              key={demande.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="bg-white border border-[#E5E5E5] cursor-pointer hover:border-[#CE0202]/50 transition-colors shadow-sm"
                onClick={() => handleViewDemande(demande)}
                data-testid={`demande-${demande.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-[#1A1A1A]">
                          {demande.first_name} {demande.last_name}
                        </h3>
                        <Badge className={getStatusBadge(demande.status)}>
                          {statusConfig[demande.status]?.label || "Non traité"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[#666666]">
                        {demande.company && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {demande.company}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {demande.email}
                        </span>
                        {demande.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {demande.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <Badge className="bg-[#CE0202]/10 text-[#CE0202] border-none">
                          {getProjectTypeLabel(demande.project_type)}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-[#666666]">
                          <Calendar className="w-3 h-3" />
                          {formatDate(demande.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDemande(demande.id);
                        }}
                        className="text-[#666666] hover:text-red-500 hover:bg-red-50"
                        data-testid={`delete-demande-${demande.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-5 h-5 text-[#A1A1AA]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] text-[#1A1A1A] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <User className="w-6 h-6" />
              {selectedDemande?.first_name} {selectedDemande?.last_name}
            </DialogTitle>
            <DialogDescription className="text-[#666666]">
              Reçue le {selectedDemande && formatDate(selectedDemande.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDemande && (
            <div className="space-y-6 mt-4">
              {/* Status Selector */}
              <div className="bg-[#F8F8F8] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1A1A1A]">Statut</span>
                  <Select 
                    value={selectedDemande.status || "nouveau"} 
                    onValueChange={(v) => handleStatusUpdate(selectedDemande.id, v)}
                  >
                    <SelectTrigger className="w-40 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="nouveau">Non traité</SelectItem>
                      <SelectItem value="contacté">Contacté</SelectItem>
                      <SelectItem value="qualifié">Qualifié</SelectItem>
                      <SelectItem value="converti">Converti</SelectItem>
                      <SelectItem value="perdu">Perdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-[#666666] uppercase">Email</p>
                  <a href={`mailto:${selectedDemande.email}`} className="text-[#1A1A1A] hover:text-[#CE0202]">
                    {selectedDemande.email}
                  </a>
                </div>
                {selectedDemande.phone && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#666666] uppercase">Téléphone</p>
                    <a href={`tel:${selectedDemande.phone}`} className="text-[#1A1A1A] hover:text-[#CE0202]">
                      {selectedDemande.phone}
                    </a>
                  </div>
                )}
                {selectedDemande.company && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#666666] uppercase">Entreprise</p>
                    <p className="text-[#1A1A1A]">{selectedDemande.company}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-[#666666] uppercase">Type de projet</p>
                  <Badge className="bg-[#CE0202]/10 text-[#CE0202] border-none">
                    {getProjectTypeLabel(selectedDemande.project_type)}
                  </Badge>
                </div>
              </div>

              {selectedDemande.budget && (
                <div className="space-y-1">
                  <p className="text-xs text-[#666666] uppercase">Budget</p>
                  <p className="text-[#1A1A1A]">{selectedDemande.budget}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-[#666666] uppercase flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Message
                </p>
                <div className="bg-[#F8F8F8] p-4 rounded-lg border border-[#E5E5E5]">
                  <p className="text-[#1A1A1A] whitespace-pre-wrap">
                    {selectedDemande.message || "Aucun message"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
                <Button
                  className="flex-1 bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white"
                  onClick={() => window.location.href = `mailto:${selectedDemande.email}`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Répondre par email
                </Button>
                {selectedDemande.phone && (
                  <Button
                    variant="outline"
                    className="flex-1 border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F8F8F8]"
                    onClick={() => window.location.href = `tel:${selectedDemande.phone}`}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemandesPage;
