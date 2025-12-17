import { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit, 
  Eye,
  Archive,
  FileCheck,
  MoreVertical,
  X,
  Loader2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { documentsAPI } from "../../lib/api";
import { toast } from "sonner";

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "",
    template_id: "",
    internal_name: "",
    client_name: "",
    client_company: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    start_date: "",
    end_date: "",
    duration: "",
    tarif: "",
    description: "",
    status: "brouillon"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsRes, typesRes] = await Promise.all([
        documentsAPI.getAll(),
        documentsAPI.getTypes()
      ]);
      setDocuments(docsRes.data);
      setDocumentTypes(typesRes.data);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "",
      template_id: "",
      internal_name: "",
      client_name: "",
      client_company: "",
      client_email: "",
      client_phone: "",
      client_address: "",
      start_date: "",
      end_date: "",
      duration: "",
      tarif: "",
      description: "",
      status: "brouillon"
    });
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await documentsAPI.create(formData);
      toast.success("Document créé avec succès");
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    if (!selectedDocument) return;
    
    try {
      setSaving(true);
      await documentsAPI.update(selectedDocument.id, formData);
      toast.success("Document mis à jour");
      setShowEditModal(false);
      setSelectedDocument(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Supprimer "${doc.internal_name}" ?`)) return;
    
    try {
      await documentsAPI.delete(doc.id);
      toast.success("Document supprimé");
      loadData();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDownloadPDF = async (doc) => {
    try {
      setDownloading(doc.id);
      const response = await documentsAPI.getPDF(doc.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.internal_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF téléchargé");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  const openEditModal = (doc) => {
    setSelectedDocument(doc);
    setFormData({
      type: doc.type,
      template_id: doc.template_id,
      internal_name: doc.internal_name,
      client_name: doc.client_name || "",
      client_company: doc.client_company || "",
      client_email: doc.client_email || "",
      client_phone: doc.client_phone || "",
      client_address: doc.client_address || "",
      start_date: doc.start_date || "",
      end_date: doc.end_date || "",
      duration: doc.duration || "",
      tarif: doc.tarif || "",
      description: doc.description || "",
      status: doc.status || "brouillon"
    });
    setShowEditModal(true);
  };

  const openViewModal = (doc) => {
    setSelectedDocument(doc);
    setShowViewModal(true);
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.internal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.client_company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || doc.type === filterType;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Get available templates for selected type
  const getTemplatesForType = (type) => {
    return documentTypes[type]?.templates || [];
  };

  const getStatusBadge = (status) => {
    const styles = {
      brouillon: "bg-yellow-100 text-yellow-800",
      finalisé: "bg-green-100 text-green-800",
      archivé: "bg-gray-100 text-gray-600"
    };
    const labels = {
      brouillon: "Brouillon",
      finalisé: "Finalisé",
      archivé: "Archivé"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.brouillon}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type, typeName) => {
    const styles = {
      lettre_mission: "bg-blue-100 text-blue-800",
      fiche_contact: "bg-purple-100 text-purple-800"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || "bg-gray-100 text-gray-600"}`}>
        {typeName || type}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
      </div>
    );
  }

  return (
    <div data-testid="documents-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Documents</h1>
          <p className="text-[#666666] text-sm mt-1">
            Gérez vos lettres de mission et fiches de contact
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-[#CE0202] hover:bg-[#B00202] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau document
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E5E5E5] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <Input
              placeholder="Rechercher un document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#F8F8F8] border-[#E5E5E5]"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-48 bg-[#F8F8F8] border-[#E5E5E5]">
              <Filter className="w-4 h-4 mr-2 text-[#666666]" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(documentTypes).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48 bg-[#F8F8F8] border-[#E5E5E5]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="finalisé">Finalisé</SelectItem>
              <SelectItem value="archivé">Archivé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-[#E5E5E5] mx-auto mb-4" />
            <p className="text-[#666666]">
              {searchTerm || filterType !== "all" || filterStatus !== "all"
                ? "Aucun document trouvé"
                : "Aucun document créé"}
            </p>
            {!searchTerm && filterType === "all" && filterStatus === "all" && (
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un document
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F8F8] border-b border-[#E5E5E5]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase tracking-wider">
                    Document
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#666666] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-[#666666] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#F8F8F8] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#CE0202]/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#CE0202]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{doc.internal_name}</p>
                          <p className="text-xs text-[#666666]">{doc.template_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(doc.type, doc.type_name)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[#1A1A1A]">{doc.client_name || "-"}</p>
                      {doc.client_company && (
                        <p className="text-xs text-[#666666]">{doc.client_company}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#666666]">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-[#E5E5E5]">
                          <DropdownMenuItem 
                            onClick={() => openViewModal(doc)}
                            className="cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openEditModal(doc)}
                            className="cursor-pointer"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDownloadPDF(doc)}
                            className="cursor-pointer"
                            disabled={downloading === doc.id}
                          >
                            {downloading === doc.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteDocument(doc)}
                            className="cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Nouveau document</DialogTitle>
            <DialogDescription className="text-[#666666]">
              Créez un nouveau document à partir d'un modèle
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateDocument} className="space-y-6">
            {/* Type & Template */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de document *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, type: value, template_id: "" }));
                  }}
                >
                  <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(documentTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modèle *</Label>
                <Select 
                  value={formData.template_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
                  disabled={!formData.type}
                >
                  <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                    <SelectValue placeholder="Sélectionnez un modèle" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {getTemplatesForType(formData.type).map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Internal Name */}
            <div className="space-y-2">
              <Label>Nom interne du document *</Label>
              <Input
                value={formData.internal_name}
                onChange={(e) => setFormData(prev => ({ ...prev, internal_name: e.target.value }))}
                placeholder="Ex: LM_ClientX_SiteWeb_2024"
                className="bg-[#F8F8F8] border-[#E5E5E5]"
                required
              />
            </div>

            {/* Client Info */}
            <div className="border-t border-[#E5E5E5] pt-4">
              <h3 className="font-medium text-[#1A1A1A] mb-4">Informations client</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du client *</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                    placeholder="Nom complet"
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entreprise</Label>
                  <Input
                    value={formData.client_company}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_company: e.target.value }))}
                    placeholder="Nom de l'entreprise"
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                    placeholder="email@example.com"
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.client_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                    placeholder="0690 00 00 00"
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label>Adresse</Label>
                <Input
                  value={formData.client_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                  placeholder="Adresse complète"
                  className="bg-[#F8F8F8] border-[#E5E5E5]"
                />
              </div>
            </div>

            {/* Mission Info */}
            <div className="border-t border-[#E5E5E5] pt-4">
              <h3 className="font-medium text-[#1A1A1A] mb-4">Détails de la mission</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="Ex: 3 mois"
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Tarif</Label>
                  <Input
                    value={formData.tarif}
                    onChange={(e) => setFormData(prev => ({ ...prev, tarif: e.target.value }))}
                    placeholder="Ex: 1500€ HT"
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="brouillon">Brouillon</SelectItem>
                      <SelectItem value="finalisé">Finalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label>Description / Notes</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de la mission, notes importantes..."
                  rows={4}
                  className="bg-[#F8F8F8] border-[#E5E5E5]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.type || !formData.template_id || !formData.internal_name || !formData.client_name}
                className="bg-[#CE0202] hover:bg-[#B00202] text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le document"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Modifier le document</DialogTitle>
            <DialogDescription className="text-[#666666]">
              Modifiez les informations du document
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateDocument} className="space-y-6">
            {/* Internal Name */}
            <div className="space-y-2">
              <Label>Nom interne du document *</Label>
              <Input
                value={formData.internal_name}
                onChange={(e) => setFormData(prev => ({ ...prev, internal_name: e.target.value }))}
                className="bg-[#F8F8F8] border-[#E5E5E5]"
                required
              />
            </div>

            {/* Client Info */}
            <div className="border-t border-[#E5E5E5] pt-4">
              <h3 className="font-medium text-[#1A1A1A] mb-4">Informations client</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du client *</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entreprise</Label>
                  <Input
                    value={formData.client_company}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_company: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.client_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label>Adresse</Label>
                <Input
                  value={formData.client_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                  className="bg-[#F8F8F8] border-[#E5E5E5]"
                />
              </div>
            </div>

            {/* Mission Info */}
            <div className="border-t border-[#E5E5E5] pt-4">
              <h3 className="font-medium text-[#1A1A1A] mb-4">Détails de la mission</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée</Label>
                  <Input
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Tarif</Label>
                  <Input
                    value={formData.tarif}
                    onChange={(e) => setFormData(prev => ({ ...prev, tarif: e.target.value }))}
                    className="bg-[#F8F8F8] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="brouillon">Brouillon</SelectItem>
                      <SelectItem value="finalisé">Finalisé</SelectItem>
                      <SelectItem value="archivé">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label>Description / Notes</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="bg-[#F8F8F8] border-[#E5E5E5]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.internal_name || !formData.client_name}
                className="bg-[#CE0202] hover:bg-[#B00202] text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">{selectedDocument?.internal_name}</DialogTitle>
            <div className="flex gap-2 mt-2">
              {selectedDocument && getTypeBadge(selectedDocument.type, selectedDocument.type_name)}
              {selectedDocument && getStatusBadge(selectedDocument.status)}
            </div>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-6">
              {/* Template */}
              <div className="bg-[#F8F8F8] rounded-lg p-4">
                <p className="text-sm text-[#666666]">Modèle utilisé</p>
                <p className="font-medium text-[#1A1A1A]">{selectedDocument.template_name}</p>
              </div>

              {/* Client Info */}
              <div className="space-y-3">
                <h3 className="font-medium text-[#1A1A1A]">Informations client</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#666666]">Nom</p>
                    <p className="text-[#1A1A1A]">{selectedDocument.client_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#666666]">Entreprise</p>
                    <p className="text-[#1A1A1A]">{selectedDocument.client_company || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#666666]">Email</p>
                    <p className="text-[#1A1A1A]">{selectedDocument.client_email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#666666]">Téléphone</p>
                    <p className="text-[#1A1A1A]">{selectedDocument.client_phone || "-"}</p>
                  </div>
                </div>
                {selectedDocument.client_address && (
                  <div>
                    <p className="text-sm text-[#666666]">Adresse</p>
                    <p className="text-[#1A1A1A]">{selectedDocument.client_address}</p>
                  </div>
                )}
              </div>

              {/* Mission Info */}
              <div className="space-y-3">
                <h3 className="font-medium text-[#1A1A1A]">Détails de la mission</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#666666]">Date de début</p>
                    <p className="text-[#1A1A1A]">{formatDate(selectedDocument.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#666666]">Date de fin</p>
                    <p className="text-[#1A1A1A]">{formatDate(selectedDocument.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#666666]">Durée</p>
                    <p className="text-[#1A1A1A]">{selectedDocument.duration || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#666666]">Tarif</p>
                  <p className="text-[#1A1A1A]">{selectedDocument.tarif || "-"}</p>
                </div>
                {selectedDocument.description && (
                  <div>
                    <p className="text-sm text-[#666666]">Description</p>
                    <p className="text-[#1A1A1A] whitespace-pre-wrap">{selectedDocument.description}</p>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="border-t border-[#E5E5E5] pt-4 text-sm text-[#666666]">
                <p>Créé le {formatDate(selectedDocument.created_at)}</p>
                {selectedDocument.updated_at && (
                  <p>Modifié le {formatDate(selectedDocument.updated_at)}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowViewModal(false)}
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                setShowViewModal(false);
                if (selectedDocument) openEditModal(selectedDocument);
              }}
              variant="outline"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button
              onClick={() => selectedDocument && handleDownloadPDF(selectedDocument)}
              disabled={downloading === selectedDocument?.id}
              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
            >
              {downloading === selectedDocument?.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Télécharger PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
