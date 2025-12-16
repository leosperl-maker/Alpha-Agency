import { useState, useEffect } from "react";
import { Plus, CreditCard, Calendar, User, CheckCircle, XCircle, PauseCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { subscriptionsAPI, contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    contact_id: "",
    plan_name: "Site Web 90€/mois",
    amount: 90,
    billing_cycle: "monthly",
    start_date: ""
  });

  const fetchData = async () => {
    try {
      const [subsRes, contactsRes] = await Promise.all([
        subscriptionsAPI.getAll(),
        contactsAPI.getAll()
      ]);
      setSubscriptions(subsRes.data);
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
      await subscriptionsAPI.create({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success("Abonnement créé");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleStatusUpdate = async (subId, status) => {
    try {
      await subscriptionsAPI.updateStatus(subId, status);
      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const resetForm = () => {
    setFormData({
      contact_id: "",
      plan_name: "Site Web 90€/mois",
      amount: 90,
      billing_cycle: "monthly",
      start_date: ""
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      actif: { class: "bg-green-500/20 text-green-500", icon: CheckCircle },
      suspendu: { class: "bg-yellow-500/20 text-yellow-500", icon: PauseCircle },
      annulé: { class: "bg-red-500/20 text-red-500", icon: XCircle },
      expiré: { class: "bg-gray-500/20 text-gray-400", icon: XCircle }
    };
    return styles[status] || styles.actif;
  };

  const getContactName = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact ? `${contact.first_name} ${contact.last_name}` : "Contact inconnu";
  };

  const plans = [
    { name: "Site Web 90€/mois", amount: 90 },
    { name: "Site Web Premium", amount: 150 },
    { name: "Community Management Starter", amount: 300 },
    { name: "Community Management Pro", amount: 500 },
    { name: "Pack 360°", amount: 800 }
  ];

  // Calculate MRR
  const mrr = subscriptions
    .filter(s => s.status === "actif")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const activeCount = subscriptions.filter(s => s.status === "actif").length;

  return (
    <div data-testid="subscriptions-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Abonnements</h1>
          <p className="text-[#A1A1AA]">{subscriptions.length} abonnements au total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-subscription-btn"
              onClick={resetForm}
              className="bg-[#6A0F1A] hover:bg-[#8B1422] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel abonnement
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0A0A0A] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Nouvel abonnement</DialogTitle>
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
                <Label>Plan *</Label>
                <Select
                  value={formData.plan_name}
                  onValueChange={(value) => {
                    const plan = plans.find(p => p.name === value);
                    setFormData({
                      ...formData, 
                      plan_name: value,
                      amount: plan?.amount || 90
                    });
                  }}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-white/10">
                    {plans.map((plan) => (
                      <SelectItem key={plan.name} value={plan.name}>
                        {plan.name} - {plan.amount}€/mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montant (€/mois)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="bg-black/50 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="bg-black/50 border-white/10"
                  />
                </div>
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

      {/* MRR Card */}
      <Card className="card-dashboard bg-gradient-to-br from-[#6A0F1A]/20 to-transparent border-[#6A0F1A]/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#A1A1AA] text-sm">Revenus Récurrents Mensuels (MRR)</p>
              <p className="text-4xl font-bold text-white font-mono">{mrr.toLocaleString()}€</p>
              <p className="text-[#A1A1AA] text-sm mt-1">
                {activeCount} abonnement{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-16 h-16 bg-[#6A0F1A]/20 rounded-full flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-[#6A0F1A]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/5 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="card-dashboard">
          <CardContent className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
            <p className="text-[#A1A1AA]">Aucun abonnement créé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const statusInfo = getStatusBadge(sub.status);
            return (
              <Card 
                key={sub.id}
                data-testid={`subscription-${sub.id}`}
                className="card-dashboard hover:border-[#6A0F1A]/30 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#6A0F1A]/20 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-[#6A0F1A]" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">
                          {sub.plan_name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                          <User className="w-3 h-3" />
                          <span>{getContactName(sub.contact_id)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Prochaine facturation : {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('fr-FR') : 'Non définie'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-white font-mono">
                          {sub.amount?.toLocaleString()}€<span className="text-sm text-[#A1A1AA]">/mois</span>
                        </p>
                        <Badge className={statusInfo.class}>
                          {sub.status}
                        </Badge>
                      </div>
                      <Select
                        value={sub.status}
                        onValueChange={(value) => handleStatusUpdate(sub.id, value)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs bg-black/30 border-white/5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A0A0A] border-white/10">
                          <SelectItem value="actif">Actif</SelectItem>
                          <SelectItem value="suspendu">Suspendu</SelectItem>
                          <SelectItem value="annulé">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
