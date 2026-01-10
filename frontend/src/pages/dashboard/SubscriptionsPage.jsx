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
      actif: { class: "bg-green-500/20 text-green-400", icon: CheckCircle },
      suspendu: { class: "bg-amber-500/20 text-amber-400", icon: PauseCircle },
      annulé: { class: "bg-red-500/20 text-red-400", icon: XCircle },
      expiré: { class: "bg-white/10 text-white/60", icon: XCircle }
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
          <h1 className="text-2xl font-bold text-white">Abonnements</h1>
          <p className="text-white/60 text-sm">{subscriptions.length} abonnements au total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-subscription-btn"
              onClick={resetForm}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvel abonnement
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/5 backdrop-blur-xl border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Nouvel abonnement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Contact *</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(value) => setFormData({...formData, contact_id: value})}
                  required
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionner un contact" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/5 backdrop-blur-xl border-white/10">
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Plan *</Label>
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
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/5 backdrop-blur-xl border-white/10">
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
                  <Label className="text-white">Montant (€/mois)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Date de début</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* MRR Card */}
      <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-[#CE0202]/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Revenus Récurrents Mensuels (MRR)</p>
            <p className="text-4xl font-bold text-white font-mono">{mrr.toLocaleString()}€</p>
            <p className="text-white/60 text-sm mt-1">
              {activeCount} abonnement{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="w-16 h-16 bg-indigo-600/10 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#E5E5E5] animate-pulse rounded-lg" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-12 text-center">
          <CreditCard className="w-12 h-12 text-white/60 mx-auto mb-4" />
          <p className="text-white/60">Aucun abonnement créé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const statusInfo = getStatusBadge(sub.status);
            return (
              <div 
                key={sub.id}
                data-testid={`subscription-${sub.id}`}
                className="bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-4 hover:border-[#CE0202]/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {sub.plan_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <User className="w-3 h-3" />
                        <span>{getContactName(sub.contact_id)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/60">
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
                        {sub.amount?.toLocaleString()}€<span className="text-sm text-white/60">/mois</span>
                      </p>
                      <Badge className={statusInfo.class}>
                        {sub.status}
                      </Badge>
                    </div>
                    <Select
                      value={sub.status}
                      onValueChange={(value) => handleStatusUpdate(sub.id, value)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/5 backdrop-blur-xl border-white/10">
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="suspendu">Suspendu</SelectItem>
                        <SelectItem value="annulé">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
