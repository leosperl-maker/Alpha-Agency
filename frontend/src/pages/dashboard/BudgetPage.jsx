import { useState, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, MoreVertical, Trash2, Edit, Calendar, DollarSign, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { budgetAPI } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const BudgetPage = () => {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterType, setFilterType] = useState("all");
  
  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().slice(0, 10)
  });

  const incomeCategories = [
    { value: "salaire", label: "Salaire", color: "#10B981" },
    { value: "freelance", label: "Freelance", color: "#3B82F6" },
    { value: "investissement", label: "Investissement", color: "#8B5CF6" },
    { value: "vente", label: "Vente", color: "#F59E0B" },
    { value: "autre_revenu", label: "Autre revenu", color: "#6B7280" }
  ];

  const expenseCategories = [
    { value: "loyer", label: "Loyer", color: "#EF4444" },
    { value: "alimentation", label: "Alimentation", color: "#F97316" },
    { value: "transport", label: "Transport", color: "#F59E0B" },
    { value: "abonnements", label: "Abonnements", color: "#8B5CF6" },
    { value: "loisirs", label: "Loisirs", color: "#EC4899" },
    { value: "sante", label: "Santé", color: "#10B981" },
    { value: "education", label: "Éducation", color: "#3B82F6" },
    { value: "shopping", label: "Shopping", color: "#6366F1" },
    { value: "factures", label: "Factures", color: "#EF4444" },
    { value: "autre_depense", label: "Autre dépense", color: "#6B7280" }
  ];

  const allCategories = [...incomeCategories, ...expenseCategories];

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, summaryRes, chartRes] = await Promise.all([
        budgetAPI.getAll({ month: selectedMonth }),
        budgetAPI.getSummary(selectedMonth),
        budgetAPI.getMonthlyChart(new Date().getFullYear())
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
      setMonthlyData(chartRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };
      
      if (editingEntry) {
        await budgetAPI.update(editingEntry.id, data);
        toast.success("Entrée mise à jour");
      } else {
        await budgetAPI.create(data);
        toast.success("Entrée ajoutée");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette entrée ?")) return;
    try {
      await budgetAPI.delete(id);
      toast.success("Entrée supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const resetForm = () => {
    setFormData({
      type: "expense",
      amount: "",
      category: "",
      description: "",
      date: new Date().toISOString().slice(0, 10)
    });
    setEditingEntry(null);
  };

  const openEditDialog = (entry) => {
    setEditingEntry(entry);
    setFormData({
      type: entry.type,
      amount: entry.amount.toString(),
      category: entry.category,
      description: entry.description || "",
      date: entry.date
    });
    setDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    if (filterType !== "all" && entry.type !== filterType) return false;
    return true;
  });

  // Prepare pie chart data
  const pieData = formData.type === "income" 
    ? Object.entries(summary.income_by_category || {}).map(([key, value]) => ({
        name: incomeCategories.find(c => c.value === key)?.label || key,
        value,
        color: incomeCategories.find(c => c.value === key)?.color || "#6B7280"
      }))
    : Object.entries(summary.expense_by_category || {}).map(([key, value]) => ({
        name: expenseCategories.find(c => c.value === key)?.label || key,
        value,
        color: expenseCategories.find(c => c.value === key)?.color || "#6B7280"
      }));

  // Months for selector
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="p-6 bg-[#F8F8F8] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Budget</h1>
          <p className="text-[#666666]">Gérez vos revenus et dépenses</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-white border-[#E5E5E5]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Revenus</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_income || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <ArrowUpRight className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Dépenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_expense || 0)}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <ArrowDownRight className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Solde</p>
                <p className={`text-2xl font-bold ${(summary.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.balance || 0)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${(summary.balance || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <Wallet className={`w-6 h-6 ${(summary.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Transactions</p>
                <p className="text-2xl font-bold text-[#1A1A1A]">{summary.entries_count || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-[#CE0202]/10">
                <PiggyBank className="w-6 h-6 text-[#CE0202]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Bar Chart */}
        <Card className="bg-white border-[#E5E5E5]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] text-lg">Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="name" tick={{ fill: '#666666', fontSize: 12 }} />
                <YAxis tick={{ fill: '#666666', fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5E5' }}
                />
                <Legend />
                <Bar dataKey="income" name="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Dépenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie */}
        <Card className="bg-white border-[#E5E5E5]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] text-lg">Répartition des dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(summary.expense_by_category || {}).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(summary.expense_by_category || {}).map(([key, value]) => ({
                      name: expenseCategories.find(c => c.value === key)?.label || key,
                      value,
                      color: expenseCategories.find(c => c.value === key)?.color || "#6B7280"
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {Object.entries(summary.expense_by_category || {}).map(([key], index) => (
                      <Cell key={index} fill={expenseCategories.find(c => c.value === key)?.color || "#6B7280"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-[#666666]">
                Aucune donnée ce mois
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="bg-white border-[#E5E5E5]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#1A1A1A] text-lg">Transactions</CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] bg-[#F8F8F8] border-[#E5E5E5]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Tout</SelectItem>
              <SelectItem value="income">Revenus</SelectItem>
              <SelectItem value="expense">Dépenses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <p className="text-center text-[#666666] py-8">Aucune transaction ce mois</p>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map(entry => {
                const category = allCategories.find(c => c.value === entry.category);
                const isIncome = entry.type === "income";
                
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F8F8F8] border border-[#E5E5E5]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isIncome ? (
                          <ArrowUpRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{entry.description || category?.label || entry.category}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs" style={{ borderColor: category?.color, color: category?.color }}>
                            {category?.label || entry.category}
                          </Badge>
                          <span className="text-xs text-[#666666]">
                            {new Date(entry.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white">
                          <DropdownMenuItem onClick={() => openEditDialog(entry)}>
                            <Edit className="w-4 h-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(entry.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">
              {editingEntry ? "Modifier l'entrée" : "Nouvelle entrée"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === "income" ? "default" : "outline"}
                onClick={() => setFormData({...formData, type: "income", category: ""})}
                className={formData.type === "income" ? "flex-1 bg-green-600 hover:bg-green-700" : "flex-1"}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" /> Revenu
              </Button>
              <Button
                type="button"
                variant={formData.type === "expense" ? "default" : "outline"}
                onClick={() => setFormData({...formData, type: "expense", category: ""})}
                className={formData.type === "expense" ? "flex-1 bg-red-600 hover:bg-red-700" : "flex-1"}
              >
                <ArrowDownRight className="w-4 h-4 mr-2" /> Dépense
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Montant *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                  className="pl-9 bg-[#F8F8F8] border-[#E5E5E5]"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Catégorie *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {(formData.type === "income" ? incomeCategories : expenseCategories).map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description (optionnel)"
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-[#CE0202] hover:bg-[#B00202] text-white">
                {editingEntry ? "Mettre à jour" : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage;
