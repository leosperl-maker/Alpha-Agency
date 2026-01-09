import { useState, useEffect } from "react";
import {
  Mail, MessageSquare, Users, BarChart3, Plus, Send, Calendar,
  Loader2, Trash2, Eye, Clock, CheckCircle, AlertCircle, RefreshCw,
  ChevronRight, Inbox, List, Settings2, Search, Filter, MoreVertical,
  Edit, Copy, ExternalLink, PhoneCall
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { toast } from "sonner";
import { campaignsAPI } from "../../lib/api";

// Status badge colors
const statusColors = {
  draft: { bg: "bg-gray-100", text: "text-gray-700" },
  scheduled: { bg: "bg-blue-100", text: "text-blue-700" },
  queued: { bg: "bg-yellow-100", text: "text-yellow-700" },
  sent: { bg: "bg-green-100", text: "text-green-700" },
  error: { bg: "bg-red-100", text: "text-red-700" },
};

const statusLabels = {
  draft: "Brouillon",
  scheduled: "Programmée",
  queued: "En attente",
  sent: "Envoyée",
  error: "Erreur",
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ==================== EMAIL CAMPAIGNS TAB ====================

const EmailCampaignsTab = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    html_content: "",
    sender_email: "contact@alphagency.fr",
    sender_name: "Alpha Agency",
  });
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignsAPI.getEmailCampaigns({ limit: 50 });
      setCampaigns(res.data.campaigns || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Erreur lors du chargement des campagnes");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await campaignsAPI.getTemplates();
      setTemplates(res.data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleSelectTemplate = async (templateId) => {
    try {
      const res = await campaignsAPI.getTemplate(templateId);
      const template = res.data;
      setSelectedTemplate(template);
      setFormData({
        ...formData,
        subject: template.subject_template,
        html_content: template.html_content,
        name: `Campagne ${template.name} - ${new Date().toLocaleDateString('fr-FR')}`
      });
      setShowTemplatesDialog(false);
      setShowCreateDialog(true);
    } catch (error) {
      toast.error("Erreur lors du chargement du template");
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.subject || !formData.html_content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    setCreating(true);
    try {
      await campaignsAPI.createEmailCampaign(formData);
      toast.success("Campagne créée avec succès");
      setShowCreateDialog(false);
      setFormData({
        name: "",
        subject: "",
        html_content: "",
        sender_email: "contact@alphagency.fr",
        sender_name: "Alpha Agency",
      });
      setSelectedTemplate(null);
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleSendNow = async (campaignId) => {
    setSending(true);
    try {
      await campaignsAPI.sendEmailCampaignNow(campaignId);
      toast.success("Campagne envoyée avec succès");
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (campaignId) => {
    try {
      await campaignsAPI.deleteEmailCampaign(campaignId);
      toast.success("Campagne supprimée");
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Campagnes Email</h3>
          <p className="text-sm text-[#666666]">Créez et gérez vos campagnes d'emailing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaigns} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#CE0202] hover:bg-[#B00202]">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle campagne
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer une campagne email</DialogTitle>
                <DialogDescription>
                  Configurez votre nouvelle campagne email marketing
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Nom de la campagne *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Newsletter Janvier 2026"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Objet de l'email *</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex: 🎉 Nos nouveautés du mois !"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nom de l'expéditeur</label>
                    <Input
                      value={formData.sender_name}
                      onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email de l'expéditeur</label>
                    <Input
                      value={formData.sender_email}
                      onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Contenu HTML *</label>
                  <Textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    placeholder="<html><body>Votre contenu email ici...</body></html>"
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-[#999999] mt-1">
                    Collez votre code HTML ou utilisez un outil comme Stripo, Unlayer, etc.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreate} disabled={creating} className="bg-[#CE0202] hover:bg-[#B00202]">
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer la campagne
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-[#E5E5E5]" />
            <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">Aucune campagne</h4>
            <p className="text-[#666666] mb-4">Créez votre première campagne email</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-[#CE0202] hover:bg-[#B00202]">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle campagne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campagne</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const status = campaign.status || "draft";
                const colors = statusColors[status] || statusColors.draft;
                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{campaign.name}</p>
                        <p className="text-sm text-[#666666]">{campaign.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${colors.bg} ${colors.text} border-0`}>
                        {statusLabels[status] || status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#666666]">
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedCampaign(campaign)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir les détails
                          </DropdownMenuItem>
                          {status === "draft" && (
                            <>
                              <DropdownMenuItem onClick={() => handleSendNow(campaign.id)}>
                                <Send className="w-4 h-4 mr-2" />
                                Envoyer maintenant
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="w-4 h-4 mr-2" />
                                Programmer
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(campaign.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

// ==================== SMS CAMPAIGNS TAB ====================

const SMSCampaignsTab = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    sender: "AlphaAg",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await campaignsAPI.getSMSCampaigns({ limit: 50 });
      setCampaigns(res.data.campaigns || []);
    } catch (error) {
      console.error("Error fetching SMS campaigns:", error);
      toast.error("Erreur lors du chargement des campagnes SMS");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (formData.content.length > 160) {
      toast.error("Le contenu SMS ne doit pas dépasser 160 caractères");
      return;
    }
    
    setCreating(true);
    try {
      await campaignsAPI.createSMSCampaign(formData);
      toast.success("Campagne SMS créée avec succès");
      setShowCreateDialog(false);
      setFormData({ name: "", content: "", sender: "AlphaAg" });
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleSendNow = async (campaignId) => {
    try {
      await campaignsAPI.sendSMSCampaignNow(campaignId);
      toast.success("Campagne SMS envoyée");
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    }
  };

  const handleDelete = async (campaignId) => {
    try {
      await campaignsAPI.deleteSMSCampaign(campaignId);
      toast.success("Campagne SMS supprimée");
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Campagnes SMS</h3>
          <p className="text-sm text-[#666666]">Envoyez des SMS marketing à vos contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCampaigns} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#CE0202] hover:bg-[#B00202]">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle campagne SMS
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une campagne SMS</DialogTitle>
                <DialogDescription>
                  Maximum 160 caractères par SMS
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Nom de la campagne *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Promo Janvier"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nom de l'expéditeur (max 11 car.)</label>
                  <Input
                    value={formData.sender}
                    onChange={(e) => setFormData({ ...formData, sender: e.target.value.slice(0, 11) })}
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Message * ({formData.content.length}/160)
                  </label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Votre message SMS..."
                    rows={4}
                    maxLength={160}
                  />
                  {formData.content.length > 140 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Attention : {160 - formData.content.length} caractères restants
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreate} disabled={creating} className="bg-[#CE0202] hover:bg-[#B00202]">
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer la campagne
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SMS Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-[#E5E5E5]" />
            <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">Aucune campagne SMS</h4>
            <p className="text-[#666666] mb-4">Créez votre première campagne SMS</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-[#CE0202] hover:bg-[#B00202]">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle campagne SMS
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campagne</TableHead>
                <TableHead>Expéditeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const status = campaign.status || "draft";
                const colors = statusColors[status] || statusColors.draft;
                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{campaign.name}</p>
                        <p className="text-sm text-[#666666] truncate max-w-xs">{campaign.content}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#666666]">{campaign.sender}</TableCell>
                    <TableCell>
                      <Badge className={`${colors.bg} ${colors.text} border-0`}>
                        {statusLabels[status] || status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#666666]">
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {status === "draft" && (
                            <DropdownMenuItem onClick={() => handleSendNow(campaign.id)}>
                              <Send className="w-4 h-4 mr-2" />
                              Envoyer maintenant
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(campaign.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

// ==================== CONTACTS TAB ====================

const ContactsTab = () => {
  const [contacts, setContacts] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    company: "",
  });
  const [listFormData, setListFormData] = useState({ name: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contactsRes, listsRes] = await Promise.all([
        campaignsAPI.getContacts({ limit: 50 }),
        campaignsAPI.getLists({ limit: 50 }),
      ]);
      setContacts(contactsRes.data.contacts || []);
      setLists(listsRes.data.lists || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Erreur lors du chargement des contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async () => {
    if (!formData.email) {
      toast.error("L'email est obligatoire");
      return;
    }
    
    setCreating(true);
    try {
      await campaignsAPI.createContact(formData);
      toast.success("Contact créé avec succès");
      setShowCreateDialog(false);
      setFormData({ email: "", first_name: "", last_name: "", phone: "", company: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateList = async () => {
    if (!listFormData.name) {
      toast.error("Le nom est obligatoire");
      return;
    }
    
    setCreating(true);
    try {
      await campaignsAPI.createList(listFormData);
      toast.success("Liste créée avec succès");
      setShowListDialog(false);
      setListFormData({ name: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteContact = async (identifier) => {
    try {
      await campaignsAPI.deleteContact(identifier);
      toast.success("Contact supprimé");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const handleDeleteList = async (listId) => {
    try {
      await campaignsAPI.deleteList(listId);
      toast.success("Liste supprimée");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      {/* Lists Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]">Listes de contacts</h3>
            <p className="text-sm text-[#666666]">Organisez vos contacts en listes</p>
          </div>
          <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle liste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une liste</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Nom de la liste *</label>
                  <Input
                    value={listFormData.name}
                    onChange={(e) => setListFormData({ ...listFormData, name: e.target.value })}
                    placeholder="Ex: Clients VIP"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowListDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateList} disabled={creating} className="bg-[#CE0202] hover:bg-[#B00202]">
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {lists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => (
              <Card key={list.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#CE0202]/10 flex items-center justify-center">
                        <List className="w-5 h-5 text-[#CE0202]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{list.name}</p>
                        <p className="text-sm text-[#666666]">{list.uniqueSubscribers || 0} contacts</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteList(list.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-[#666666]">
              Aucune liste créée
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contacts Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-[#1A1A1A]">Contacts Brevo</h3>
            <p className="text-sm text-[#666666]">Gérez vos contacts marketing</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#CE0202] hover:bg-[#B00202]">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Prénom</label>
                      <Input
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nom</label>
                      <Input
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+33612345678"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Société</label>
                    <Input
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateContact} disabled={creating} className="bg-[#CE0202] hover:bg-[#B00202]">
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Ajouter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
          </div>
        ) : contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-[#E5E5E5]" />
              <h4 className="text-lg font-medium text-[#1A1A1A] mb-2">Aucun contact</h4>
              <p className="text-[#666666] mb-4">Ajoutez vos premiers contacts Brevo</p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-[#CE0202] hover:bg-[#B00202]">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.email || contact.id}>
                    <TableCell className="font-medium">{contact.email}</TableCell>
                    <TableCell>
                      {contact.attributes?.PRENOM || contact.attributes?.FIRSTNAME || ""}{" "}
                      {contact.attributes?.NOM || contact.attributes?.LASTNAME || ""}
                    </TableCell>
                    <TableCell className="text-[#666666]">
                      {contact.attributes?.SMS || contact.attributes?.PHONE || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.email)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};

// ==================== STATISTICS TAB ====================

const StatisticsTab = () => {
  const [emailStats, setEmailStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await campaignsAPI.getEmailStatistics();
      setEmailStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[#1A1A1A]">Statistiques des campagnes</h3>
        <p className="text-sm text-[#666666]">Suivez les performances de vos campagnes</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Emails envoyés</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {emailStats?.requests || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Send className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Délivrés</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {emailStats?.delivered || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Ouvertures</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {emailStats?.opens || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Clics</p>
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    {emailStats?.clicks || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conseils pour améliorer vos campagnes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-[#666666]">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Personnalisez vos objets d'email pour augmenter le taux d'ouverture</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Envoyez vos campagnes entre 9h et 11h pour de meilleurs résultats</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Segmentez vos listes pour des messages plus ciblés</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Testez vos emails avant l'envoi avec la fonction "Email test"</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== MAIN PAGE COMPONENT ====================

const CampaignsPage = () => {
  const [activeTab, setActiveTab] = useState("email");

  return (
    <div data-testid="campaigns-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#CE0202] flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              Campagnes Marketing
            </h1>
            <p className="text-[#666666] text-sm mt-1 ml-13">
              Créez et gérez vos campagnes Email et SMS via Brevo
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-[#E5E5E5] p-1 w-full sm:w-auto">
          <TabsTrigger
            value="email"
            className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white px-4"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger
            value="sms"
            className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white px-4"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger
            value="contacts"
            className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white px-4"
          >
            <Users className="w-4 h-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white px-4"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <EmailCampaignsTab />
        </TabsContent>

        <TabsContent value="sms">
          <SMSCampaignsTab />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>

        <TabsContent value="stats">
          <StatisticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignsPage;
