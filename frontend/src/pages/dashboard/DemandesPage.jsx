import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Inbox, Eye, Trash2, Mail, Phone, Building, Calendar, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const DemandesPage = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchDemandes();
  }, []);

  const fetchDemandes = async () => {
    try {
      const response = await contactsAPI.getAll();
      // Filter to show only website leads (source: website)
      const websiteLeads = response.data.filter(c => c.source === "website");
      setDemandes(websiteLeads);
    } catch (error) {
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
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
    const styles = {
      nouveau: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      contacté: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      qualifié: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      converti: "bg-green-500/20 text-green-400 border-green-500/30"
    };
    return styles[status] || styles.nouveau;
  };

  return (
    <div data-testid="demandes-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Demandes</h1>
          <p className="text-[#A1A1AA]">Gérez les demandes reçues via le formulaire de contact</p>
        </div>
        <Badge className="bg-[#CE0202]/20 text-[#CE0202] border-[#CE0202]/30">
          {demandes.length} demande{demandes.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Demandes List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : demandes.length === 0 ? (
        <Card className="card-dashboard">
          <CardContent className="py-16 text-center">
            <Inbox className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Aucune demande</h3>
            <p className="text-[#A1A1AA]">
              Les demandes soumises via le formulaire de contact apparaîtront ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {demandes.map((demande, index) => (
            <motion.div
              key={demande.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="card-dashboard cursor-pointer hover:border-[#CE0202]/50 transition-colors"
                onClick={() => handleViewDemande(demande)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">
                          {demande.first_name} {demande.last_name}
                        </h3>
                        <Badge className={getStatusBadge(demande.status)}>
                          {demande.status || "nouveau"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[#A1A1AA]">
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
                        <span className="flex items-center gap-1 text-xs text-[#A1A1AA]">
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
                        className="text-[#A1A1AA] hover:text-red-500 hover:bg-red-500/10"
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
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedDemande?.first_name} {selectedDemande?.last_name}
            </DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Reçue le {selectedDemande && formatDate(selectedDemande.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDemande && (
            <div className="space-y-6 mt-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-[#A1A1AA] uppercase">Email</p>
                  <a href={`mailto:${selectedDemande.email}`} className="text-white hover:text-[#CE0202]">
                    {selectedDemande.email}
                  </a>
                </div>
                {selectedDemande.phone && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#A1A1AA] uppercase">Téléphone</p>
                    <a href={`tel:${selectedDemande.phone}`} className="text-white hover:text-[#CE0202]">
                      {selectedDemande.phone}
                    </a>
                  </div>
                )}
                {selectedDemande.company && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#A1A1AA] uppercase">Entreprise</p>
                    <p className="text-white">{selectedDemande.company}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-[#A1A1AA] uppercase">Type de projet</p>
                  <Badge className="bg-[#CE0202]/10 text-[#CE0202] border-none">
                    {getProjectTypeLabel(selectedDemande.project_type)}
                  </Badge>
                </div>
              </div>

              {selectedDemande.budget && (
                <div className="space-y-1">
                  <p className="text-xs text-[#A1A1AA] uppercase">Budget</p>
                  <p className="text-white">{selectedDemande.budget}</p>
                </div>
              )}

              {/* Message */}
              <div className="space-y-2">
                <p className="text-xs text-[#A1A1AA] uppercase flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Message
                </p>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <p className="text-white whitespace-pre-wrap">
                    {selectedDemande.message || "Aucun message"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
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
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
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
