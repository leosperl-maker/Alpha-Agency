import { useState, useEffect, useCallback } from "react";
import { 
  Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, MoreVertical, Trash2, Edit, 
  Calendar, Filter, ArrowUpRight, ArrowDownRight, Upload, Download, Settings2,
  Tag, FileSpreadsheet, Search, ChevronRight, X, Check, Loader2, AlertCircle,
  Banknote, CreditCard, Receipt, Target, RefreshCw
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import { budgetAPI, contactsAPI, invoicesAPI } from "../../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { useDropzone } from "react-dropzone";

// ForecastTab Component for Budget Prévisionnel (Phase 3)
const ForecastTab = ({ selectedMonth, categories, getCategoryById, getAllCategories, formatCurrency }) => {
  const [forecasts, setForecasts] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForecast, setEditingForecast] = useState(null);
  const [form, setForm] = useState({ month: selectedMonth, category_id: "", type: "expense", planned_amount: "", description: "" });
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState("");

  const fetchForecastData = async () => {
    setLoading(true);
    try {
      const [forecastsRes, comparisonRes] = await Promise.all([
        budgetAPI.getForecasts({ month: selectedMonth }),
        budgetAPI.getForecastComparison(selectedMonth)
      ]);
      setForecasts(forecastsRes.data);
      setComparison(comparisonRes.data);
    } catch (error) {
      console.error("Error fetching forecasts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, [selectedMonth]);

  const handleSaveForecast = async () => {
    if (!form.category_id || !form.planned_amount) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    try {
      await budgetAPI.createForecast({
        ...form,
        month: selectedMonth,
        planned_amount: parseFloat(form.planned_amount)
      });
      toast.success("Prévision enregistrée");
      setDialogOpen(false);
      setForm({ month: selectedMonth, category_id: "", type: "expense", planned_amount: "", description: "" });
      fetchForecastData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDeleteForecast = async (id) => {
    if (!window.confirm("Supprimer cette prévision ?")) return;
    try {
      await budgetAPI.deleteForecast(id);
      toast.success("Prévision supprimée");
      fetchForecastData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCopyForecasts = async () => {
    if (!targetMonth) {
      toast.error("Sélectionnez un mois cible");
      return;
    }
    try {
      const result = await budgetAPI.copyForecast(selectedMonth, targetMonth);
      toast.success(result.data.message);
      setCopyDialogOpen(false);
      setTargetMonth("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const getVarianceColor = (variance, type) => {
    if (type === "expense") {
      if (variance > 0) return "text-red-600"; // Over budget
      if (variance < 0) return "text-green-600"; // Under budget
    } else {
      if (variance > 0) return "text-green-600"; // Above target
      if (variance < 0) return "text-red-600"; // Below target
    }
    return "text-[#666666]";
  };

  const allCategories = [...getAllCategories("expense"), ...getAllCategories("income")];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Budget prévisionnel</h3>
          <p className="text-sm text-[#666666]">Comparez vos prévisions avec le réel</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCopyDialogOpen(true)}
            disabled={forecasts.length === 0}
          >
            <Download className="w-4 h-4 mr-2" /> Copier vers autre mois
          </Button>
          <Button 
            onClick={() => { 
              setForm({ month: selectedMonth, category_id: "", type: "expense", planned_amount: "", description: "" }); 
              setDialogOpen(true); 
            }}
            className="bg-[#CE0202] hover:bg-[#B00202] text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter prévision
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Revenus prévus</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(comparison.totals.planned_income)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#666666]">Réel</p>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{formatCurrency(comparison.totals.actual_income)}</p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, (comparison.totals.actual_income / comparison.totals.planned_income) * 100 || 0)}%` }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Dépenses prévues</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(comparison.totals.planned_expense)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#666666]">Réel</p>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{formatCurrency(comparison.totals.actual_expense)}</p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${comparison.totals.actual_expense > comparison.totals.planned_expense ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (comparison.totals.actual_expense / comparison.totals.planned_expense) * 100 || 0)}%` }}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666666]">Solde prévu</p>
                  <p className={`text-2xl font-bold ${comparison.totals.planned_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(comparison.totals.planned_balance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#666666]">Solde réel</p>
                  <p className={`text-lg font-semibold ${comparison.totals.actual_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(comparison.totals.actual_balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {comparison?.alerts?.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Alertes de dépassement</p>
                <ul className="mt-2 space-y-1">
                  {comparison.alerts.map((alert, idx) => {
                    const cat = getCategoryById(alert.category_id);
                    return (
                      <li key={idx} className="text-sm text-red-700">
                        <strong>{cat?.name || alert.category_id}</strong>: dépassement de {Math.abs(alert.variance_percent).toFixed(0)}% 
                        ({formatCurrency(alert.actual)} vs {formatCurrency(alert.planned)} prévu)
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <Card className="bg-white border-[#E5E5E5]">
        <CardHeader>
          <CardTitle className="text-[#1A1A1A] text-lg">Prévu vs Réel par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          {forecasts.length === 0 ? (
            <div className="text-center py-8 text-[#666666]">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Aucune prévision pour ce mois</p>
              <p className="text-sm mt-1">Ajoutez des prévisions budgétaires pour suivre vos objectifs</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E5]">
                    <th className="text-left py-3 px-2 text-[#666666] font-medium text-sm">Catégorie</th>
                    <th className="text-left py-3 px-2 text-[#666666] font-medium text-sm">Type</th>
                    <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">Prévu</th>
                    <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">Réel</th>
                    <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">Écart</th>
                    <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">%</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {comparison?.comparison?.map((item, idx) => {
                    const cat = getCategoryById(item.category_id);
                    return (
                      <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-[#F8F8F8]">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color || "#666" }} />
                            <span className="text-[#1A1A1A]">{cat?.name || item.category_id}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={item.type === "income" ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}>
                            {item.type === "income" ? "Revenu" : "Dépense"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-[#1A1A1A]">{formatCurrency(item.planned)}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#1A1A1A]">{formatCurrency(item.actual)}</td>
                        <td className={`py-3 px-2 text-right font-mono ${getVarianceColor(item.variance, item.type)}`}>
                          {item.variance > 0 ? "+" : ""}{formatCurrency(item.variance)}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${getVarianceColor(item.variance, item.type)}`}>
                          {item.variance > 0 ? "+" : ""}{item.variance_percent}%
                        </td>
                        <td className="py-3 px-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 h-7 w-7 p-0"
                            onClick={() => {
                              const forecast = forecasts.find(f => f.category_id === item.category_id);
                              if (forecast) handleDeleteForecast(forecast.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Forecast Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Nouvelle prévision</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v, category_id: ""})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="expense">Dépense</SelectItem>
                  <SelectItem value="income">Revenu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({...form, category_id: v})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {getAllCategories(form.type).map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Montant prévu (€) *</Label>
              <Input
                type="number"
                value={form.planned_amount}
                onChange={(e) => setForm({...form, planned_amount: e.target.value})}
                placeholder="0.00"
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="Ex: Budget marketing mensuel"
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveForecast} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Copier les prévisions</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-[#666666]">
              Copier les prévisions de {selectedMonth} vers :
            </p>
            <Input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="bg-[#F8F8F8] border-[#E5E5E5]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCopyForecasts} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              Copier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// CashflowTab Component for Budget Cashflow (Phase 4)
const CashflowTab = ({ formatCurrency }) => {
  const [cashflowData, setCashflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startMonth, setStartMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthsToShow, setMonthsToShow] = useState(6);

  const fetchCashflowData = async () => {
    setLoading(true);
    try {
      const res = await cashflowAPI.getProjection(startMonth, monthsToShow);
      setCashflowData(res.data);
    } catch (error) {
      console.error("Error fetching cashflow:", error);
      toast.error("Erreur lors du chargement du cashflow");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashflowData();
  }, [startMonth, monthsToShow]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
      </div>
    );
  }

  const chartData = cashflowData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Projection de trésorerie</h3>
          <p className="text-sm text-[#666666]">Visualisez l'évolution de votre cashflow sur plusieurs mois</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
            className="bg-[#F8F8F8] border-[#E5E5E5] w-40"
          />
          <Select value={monthsToShow.toString()} onValueChange={(v) => setMonthsToShow(parseInt(v))}>
            <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5] w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="3">3 mois</SelectItem>
              <SelectItem value="6">6 mois</SelectItem>
              <SelectItem value="12">12 mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {cashflowData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="pt-6">
              <p className="text-sm text-[#666666]">Revenus totaux</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(cashflowData.summary.total_income)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="pt-6">
              <p className="text-sm text-[#666666]">Dépenses totales</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(cashflowData.summary.total_expense)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="pt-6">
              <p className="text-sm text-[#666666]">Flux net moyen/mois</p>
              <p className={`text-2xl font-bold ${cashflowData.summary.avg_monthly_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cashflowData.summary.avg_monthly_flow)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="pt-6">
              <p className="text-sm text-[#666666]">Solde final projeté</p>
              <p className={`text-2xl font-bold ${cashflowData.summary.ending_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cashflowData.summary.ending_balance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {cashflowData?.alerts?.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Alertes de trésorerie</p>
                <ul className="mt-2 space-y-1">
                  {cashflowData.alerts.map((alert, idx) => (
                    <li key={idx} className="text-sm text-red-700">{alert.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cashflow Chart */}
      <Card className="bg-white border-[#E5E5E5]">
        <CardHeader>
          <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#CE0202]" />
            Évolution du cashflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CE0202" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#CE0202" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="label" tick={{ fill: '#666666', fontSize: 12 }} />
              <YAxis tick={{ fill: '#666666', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
              <Tooltip 
                formatter={(value, name) => [formatCurrency(value), name === "cumulative_balance" ? "Solde cumulé" : name === "net_flow" ? "Flux net" : name]}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px' }} 
              />
              <Legend formatter={(value) => value === "cumulative_balance" ? "Solde cumulé" : value === "net_flow" ? "Flux net mensuel" : value} />
              <Area 
                type="monotone" 
                dataKey="cumulative_balance" 
                name="cumulative_balance"
                stroke="#CE0202" 
                fillOpacity={1} 
                fill="url(#colorCumulative)" 
              />
              <Line 
                type="monotone" 
                dataKey="net_flow" 
                name="net_flow"
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Details Table */}
      <Card className="bg-white border-[#E5E5E5]">
        <CardHeader>
          <CardTitle className="text-[#1A1A1A] text-lg">Détails mensuels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E5E5]">
                  <th className="text-left py-3 px-2 text-[#666666] font-medium text-sm">Mois</th>
                  <th className="text-center py-3 px-2 text-[#666666] font-medium text-sm">Type</th>
                  <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">Revenus</th>
                  <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">Dépenses</th>
                  <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">Flux net</th>
                  <th className="text-right py-3 px-2 text-[#666666] font-medium text-sm">Solde cumulé</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#E5E5E5] hover:bg-[#F8F8F8]">
                    <td className="py-3 px-2 text-[#1A1A1A] font-medium">{row.label}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge variant="outline" className={row.data_type === "forecast" ? "text-blue-600 border-blue-200" : "text-green-600 border-green-200"}>
                        {row.data_type === "forecast" ? "Prévu" : "Réel"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-green-600">{formatCurrency(row.income)}</td>
                    <td className="py-3 px-2 text-right font-mono text-red-600">{formatCurrency(row.expense)}</td>
                    <td className={`py-3 px-2 text-right font-mono ${row.net_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.net_flow >= 0 ? "+" : ""}{formatCurrency(row.net_flow)}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono font-bold ${row.cumulative_balance >= 0 ? 'text-[#1A1A1A]' : 'text-red-600'}`}>
                      {formatCurrency(row.cumulative_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BudgetPage = () => {
  // Core state
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Data state
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [summary, setSummary] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  
  // Filter state
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  
  // Dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  
  // Form state
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "expense", color: "#CE0202", icon: "tag" });
  const [ruleForm, setRuleForm] = useState({ pattern: "", category_id: "", subcategory_id: "" });
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    label: "",
    amount: "",
    type: "debit",
    category_id: "",
    tags: [],
    notes: ""
  });

  // Default categories (used if no custom categories exist)
  const defaultCategories = {
    income: [
      { id: "default_ca_client", name: "CA Client", color: "#10B981", icon: "receipt" },
      { id: "default_freelance", name: "Freelance", color: "#3B82F6", icon: "briefcase" },
      { id: "default_autre_revenu", name: "Autre revenu", color: "#6B7280", icon: "coins" }
    ],
    expense: [
      { id: "default_marketing", name: "Marketing", color: "#EF4444", icon: "megaphone" },
      { id: "default_outils", name: "Outils", color: "#8B5CF6", icon: "wrench" },
      { id: "default_abonnements", name: "Abonnements", color: "#F59E0B", icon: "credit-card" },
      { id: "default_loyer", name: "Loyer / Bureau", color: "#EC4899", icon: "building" },
      { id: "default_formation", name: "Formation", color: "#3B82F6", icon: "graduation-cap" },
      { id: "default_deplacement", name: "Déplacements", color: "#10B981", icon: "car" },
      { id: "default_autre_depense", name: "Autre dépense", color: "#6B7280", icon: "receipt" }
    ]
  };

  // Predefined colors for categories
  const categoryColors = [
    "#CE0202", "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981", 
    "#14B8A6", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
    "#D946EF", "#EC4899", "#F43F5E", "#6B7280"
  ];

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, catRes, rulesRes, summaryRes, monthlyRes, contactsRes, invoicesRes] = await Promise.all([
        budgetAPI.getTransactions({ month: selectedMonth }),
        budgetAPI.getCategories(),
        budgetAPI.getRules(),
        budgetAPI.getTransactionsSummary({ month: selectedMonth }),
        budgetAPI.getMonthlyChart(selectedYear),
        contactsAPI.getAll(),
        invoicesAPI.getAll()
      ]);
      
      setTransactions(transRes.data);
      setCategories(catRes.data);
      setRules(rulesRes.data);
      setSummary(summaryRes.data);
      setMonthlyData(monthlyRes.data);
      setContacts(contactsRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  // Get all categories (custom + defaults)
  const getAllCategories = (type = null) => {
    const customCats = categories.filter(c => !type || c.type === type);
    const defaultCats = type ? defaultCategories[type] || [] : [...defaultCategories.income, ...defaultCategories.expense];
    
    // Merge, preferring custom categories
    const customIds = customCats.map(c => c.id);
    const filteredDefaults = defaultCats.filter(d => !customIds.includes(d.id));
    
    return [...customCats, ...filteredDefaults];
  };

  const getCategoryById = (id) => {
    return getAllCategories().find(c => c.id === id);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Months for selector
  const months = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    });
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
    if (searchQuery && !t.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Import handlers
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setImportFile(acceptedFiles[0]);
      setImportResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    try {
      const result = await budgetAPI.importTransactions(importFile);
      setImportResult(result.data);
      toast.success(result.data.message);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'import");
      setImportResult({ error: true, message: error.message });
    } finally {
      setImporting(false);
    }
  };

  // Category handlers
  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await budgetAPI.updateCategory(editingCategory.id, categoryForm);
        toast.success("Catégorie mise à jour");
      } else {
        await budgetAPI.createCategory(categoryForm);
        toast.success("Catégorie créée");
      }
      setCategoryDialogOpen(false);
      setCategoryForm({ name: "", type: "expense", color: "#CE0202", icon: "tag" });
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    try {
      await budgetAPI.deleteCategory(id);
      toast.success("Catégorie supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  // Rule handlers
  const handleSaveRule = async () => {
    if (!ruleForm.pattern || !ruleForm.category_id) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    try {
      await budgetAPI.createRule({
        ...ruleForm,
        match_type: ruleForm.match_type || "contains",
        apply_to_type: ruleForm.apply_to_type || null
      });
      toast.success("Règle créée");
      setRuleDialogOpen(false);
      setRuleForm({ pattern: "", category_id: "", match_type: "contains", apply_to_type: "" });
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await budgetAPI.deleteRule(id);
      toast.success("Règle supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleApplyRules = async () => {
    try {
      const result = await budgetAPI.applyRules(selectedMonth);
      toast.success(result.data.message || `${result.data.categorized} transactions catégorisées`);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'application des règles");
    }
  };

  // Transaction handlers
  const handleSaveTransaction = async () => {
    if (!transactionForm.label || !transactionForm.amount) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    
    try {
      const data = {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount)
      };
      
      if (editingTransaction) {
        await budgetAPI.updateTransaction(editingTransaction.id, data);
        toast.success("Transaction mise à jour");
      } else {
        await budgetAPI.createTransaction(data);
        toast.success("Transaction créée");
      }
      setTransactionDialogOpen(false);
      resetTransactionForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm("Supprimer cette transaction ?")) return;
    try {
      await budgetAPI.deleteTransaction(id);
      toast.success("Transaction supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCategorizeTransaction = async (transactionId, categoryId) => {
    try {
      await budgetAPI.updateTransaction(transactionId, { category_id: categoryId });
      toast.success("Catégorie assignée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      date: new Date().toISOString().slice(0, 10),
      label: "",
      amount: "",
      type: "debit",
      category_id: "",
      tags: [],
      notes: ""
    });
    setEditingTransaction(null);
  };

  const openEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      date: transaction.date,
      label: transaction.label,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category_id: transaction.category_id || "",
      tags: transaction.tags || [],
      notes: transaction.notes || ""
    });
    setTransactionDialogOpen(true);
  };

  // Pie chart data for expenses by category
  const expensePieData = Object.entries(summary.by_category || {})
    .filter(([key]) => {
      const trans = transactions.filter(t => t.category_id === key && t.type === "debit");
      return trans.length > 0;
    })
    .map(([key, data]) => {
      const category = getCategoryById(key);
      return {
        name: category?.name || "Non catégorisé",
        value: data.debit || 0,
        color: category?.color || "#6B7280"
      };
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#F8F8F8] min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Budget & Trésorerie</h1>
          <p className="text-[#666666]">Pilotage financier de votre activité</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-white border-[#E5E5E5]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white max-h-60">
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="border-[#CE0202] text-[#CE0202]">
            <Upload className="w-4 h-4 mr-2" /> Importer
          </Button>
          
          <Button onClick={() => { resetTransactionForm(); setTransactionDialogOpen(true); }} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
            <Plus className="w-4 h-4 mr-2" /> Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Revenus</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(summary.total_credit || 0)}</p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-green-100">
                <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Dépenses</p>
                <p className="text-xl md:text-2xl font-bold text-red-600">{formatCurrency(summary.total_debit || 0)}</p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-red-100">
                <ArrowDownRight className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Résultat</p>
                <p className={`text-xl md:text-2xl font-bold ${(summary.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.balance || 0)}
                </p>
              </div>
              <div className={`p-2 md:p-3 rounded-full ${(summary.balance || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <Wallet className={`w-5 h-5 md:w-6 md:h-6 ${(summary.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#666666]">Non catégorisé</p>
                <p className="text-xl md:text-2xl font-bold text-orange-600">{summary.uncategorized_count || 0}</p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-orange-100">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-[#E5E5E5] p-1 flex-wrap h-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4 mr-2" /> Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            <Receipt className="w-4 h-4 mr-2" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            <Tag className="w-4 h-4 mr-2" /> Catégories
          </TabsTrigger>
          <TabsTrigger value="rules" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            <Settings2 className="w-4 h-4 mr-2" /> Règles auto
          </TabsTrigger>
          <TabsTrigger value="forecast" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            <Target className="w-4 h-4 mr-2" /> Prévisionnel
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Evolution Chart */}
            <Card className="bg-white border-[#E5E5E5]">
              <CardHeader>
                <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#CE0202]" />
                  Évolution mensuelle {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                    <XAxis dataKey="name" tick={{ fill: '#666666', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#666666', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="income" name="Revenus" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" name="Dépenses" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Breakdown Pie */}
            <Card className="bg-white border-[#E5E5E5]">
              <CardHeader>
                <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-[#CE0202]" />
                  Répartition des dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: '#666666' }}
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-[#666666]">
                    <div className="text-center">
                      <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucune dépense ce mois</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Expense Categories */}
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader>
              <CardTitle className="text-[#1A1A1A] text-lg">Top dépenses par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expensePieData.sort((a, b) => b.value - a.value).slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[#1A1A1A]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${Math.min((item.value / (summary.total_debit || 1)) * 100, 100)}%`,
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-[#1A1A1A] w-24 text-right">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                ))}
                {expensePieData.length === 0 && (
                  <p className="text-center text-[#666666] py-4">Aucune donnée disponible</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-[#E5E5E5]"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] bg-white border-[#E5E5E5]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Tout</SelectItem>
                <SelectItem value="credit">Revenus</SelectItem>
                <SelectItem value="debit">Dépenses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px] bg-white border-[#E5E5E5]">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="uncategorized">Non catégorisé</SelectItem>
                {getAllCategories().map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="p-0">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-[#666666]">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Aucune transaction</p>
                  <Button onClick={() => setImportDialogOpen(true)} variant="outline" className="mt-4">
                    <Upload className="w-4 h-4 mr-2" /> Importer un relevé
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5E5]">
                  {filteredTransactions.map(transaction => {
                    const category = getCategoryById(transaction.category_id);
                    const isCredit = transaction.type === "credit";
                    
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-4 hover:bg-[#F8F8F8] transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
                            {isCredit ? (
                              <ArrowUpRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#1A1A1A] truncate">{transaction.label}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {category ? (
                                <Badge variant="outline" className="text-xs" style={{ borderColor: category.color, color: category.color }}>
                                  {category.name}
                                </Badge>
                              ) : (
                                <Select onValueChange={(v) => handleCategorizeTransaction(transaction.id, v)}>
                                  <SelectTrigger className="h-6 text-xs bg-orange-50 border-orange-200 text-orange-600 w-auto">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    <span>Catégoriser</span>
                                  </SelectTrigger>
                                  <SelectContent className="bg-white">
                                    {getAllCategories(isCredit ? "income" : "expense").map(cat => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                          {cat.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <span className="text-xs text-[#666666]">{formatDate(transaction.date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                            {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border-[#E5E5E5]">
                              <DropdownMenuItem onClick={() => openEditTransaction(transaction)}>
                                <Edit className="w-4 h-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteTransaction(transaction.id)} className="text-red-600">
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
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", type: "expense", color: "#CE0202", icon: "tag" }); setCategoryDialogOpen(true); }} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              <Plus className="w-4 h-4 mr-2" /> Nouvelle catégorie
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Categories */}
            <Card className="bg-white border-[#E5E5E5]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-green-600" />
                  Revenus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getAllCategories("income").map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F8F8F8] border border-[#E5E5E5]">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-[#1A1A1A]">{cat.name}</span>
                      </div>
                      {!cat.id.startsWith("default_") && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon || "tag" }); setCategoryDialogOpen(true); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Expense Categories */}
            <Card className="bg-white border-[#E5E5E5]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-red-600" />
                  Dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getAllCategories("expense").map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F8F8F8] border border-[#E5E5E5]">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-[#1A1A1A]">{cat.name}</span>
                      </div>
                      {!cat.id.startsWith("default_") && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon || "tag" }); setCategoryDialogOpen(true); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="bg-white border-[#E5E5E5]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[#1A1A1A] text-lg">Règles d'auto-catégorisation</CardTitle>
                <p className="text-sm text-[#666666]">Catégorisez automatiquement vos transactions importées</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleApplyRules}
                  className="border-[#CE0202] text-[#CE0202]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Appliquer les règles
                </Button>
                <Button onClick={() => { setRuleForm({ pattern: "", category_id: "", match_type: "contains", apply_to_type: "" }); setRuleDialogOpen(true); }} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
                  <Plus className="w-4 h-4 mr-2" /> Nouvelle règle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-[#666666]">
                  <Settings2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Aucune règle configurée</p>
                  <p className="text-sm mt-1">Les règles permettent de catégoriser automatiquement vos transactions bancaires</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map(rule => {
                    const category = getCategoryById(rule.category_id);
                    const matchTypeLabels = {
                      contains: "contient",
                      starts_with: "commence par",
                      ends_with: "finit par",
                      exact: "est exactement",
                      regex: "correspond au pattern"
                    };
                    return (
                      <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F8F8F8] border border-[#E5E5E5]">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="text-sm text-[#666666]">Si libellé {matchTypeLabels[rule.match_type] || "contient"}</div>
                          <Badge variant="outline" className="font-mono">&quot;{rule.pattern}&quot;</Badge>
                          {rule.apply_to_type && (
                            <Badge variant="secondary" className="text-xs">
                              {rule.apply_to_type === "credit" ? "Revenus" : "Dépenses"} uniquement
                            </Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-[#666666]" />
                          {category && (
                            <Badge style={{ backgroundColor: category.color + "20", color: category.color, borderColor: category.color }}>
                              {category.name}
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteRule(rule.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Tab (Prévisionnel) */}
        <TabsContent value="forecast" className="space-y-6">
          <ForecastTab 
            selectedMonth={selectedMonth}
            categories={categories}
            getCategoryById={getCategoryById}
            getAllCategories={getAllCategories}
            formatCurrency={formatCurrency}
          />
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#CE0202]" />
              Importer des transactions
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-[#CE0202] bg-[#CE0202]/5' : 'border-[#E5E5E5] hover:border-[#CE0202]'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-[#666666]" />
              {importFile ? (
                <div>
                  <p className="text-[#1A1A1A] font-medium">{importFile.name}</p>
                  <p className="text-sm text-[#666666]">{(importFile.size / 1024).toFixed(1)} Ko</p>
                </div>
              ) : (
                <div>
                  <p className="text-[#1A1A1A]">Glissez votre fichier CSV ici</p>
                  <p className="text-sm text-[#666666]">ou cliquez pour sélectionner</p>
                </div>
              )}
            </div>

            {importResult && (
              <div className={`p-4 rounded-lg ${importResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {importResult.error ? (
                  <p>{importResult.message}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium">{importResult.message}</p>
                    {importResult.duplicates > 0 && (
                      <p className="text-sm">{importResult.duplicates} doublons ignorés</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="bg-[#F8F8F8] rounded-lg p-4">
              <p className="text-sm font-medium text-[#1A1A1A] mb-2">Format attendu</p>
              <p className="text-xs text-[#666666]">Fichier CSV avec les colonnes: Date, Libellé, Montant (ou Crédit/Débit séparés)</p>
              <p className="text-xs text-[#666666] mt-1">Formats de date acceptés: JJ/MM/AAAA, AAAA-MM-JJ</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); setImportResult(null); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || importing}
              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">
              {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                placeholder="Ex: Marketing digital"
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={categoryForm.type} onValueChange={(v) => setCategoryForm({...categoryForm, type: v})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="income">Revenu</SelectItem>
                  <SelectItem value="expense">Dépense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {categoryColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCategoryForm({...categoryForm, color})}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${categoryForm.color === color ? 'border-[#1A1A1A] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveCategory} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              {editingCategory ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Nouvelle règle d'auto-catégorisation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de correspondance</Label>
              <Select value={ruleForm.match_type || "contains"} onValueChange={(v) => setRuleForm({...ruleForm, match_type: v})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="contains">Contient</SelectItem>
                  <SelectItem value="starts_with">Commence par</SelectItem>
                  <SelectItem value="ends_with">Finit par</SelectItem>
                  <SelectItem value="exact">Est exactement</SelectItem>
                  <SelectItem value="regex">Expression régulière</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Texte à rechercher *</Label>
              <Input
                value={ruleForm.pattern}
                onChange={(e) => setRuleForm({...ruleForm, pattern: e.target.value})}
                placeholder="Ex: META, OVH, AMAZON..."
                className="bg-[#F8F8F8] border-[#E5E5E5] font-mono"
              />
              <p className="text-xs text-[#666666]">La recherche n'est pas sensible à la casse</p>
            </div>

            <div className="space-y-2">
              <Label>Appliquer aux</Label>
              <Select value={ruleForm.apply_to_type || "all"} onValueChange={(v) => setRuleForm({...ruleForm, apply_to_type: v === "all" ? "" : v})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue placeholder="Toutes les transactions" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Toutes les transactions</SelectItem>
                  <SelectItem value="credit">Revenus uniquement</SelectItem>
                  <SelectItem value="debit">Dépenses uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Assigner à la catégorie *</Label>
              <Select value={ruleForm.category_id} onValueChange={(v) => setRuleForm({...ruleForm, category_id: v})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {getAllCategories().map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveRule} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              Créer la règle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">
              {editingTransaction ? "Modifier la transaction" : "Nouvelle transaction"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={transactionForm.type === "credit" ? "default" : "outline"}
                onClick={() => setTransactionForm({...transactionForm, type: "credit", category_id: ""})}
                className={transactionForm.type === "credit" ? "flex-1 bg-green-600 hover:bg-green-700" : "flex-1"}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" /> Revenu
              </Button>
              <Button
                type="button"
                variant={transactionForm.type === "debit" ? "default" : "outline"}
                onClick={() => setTransactionForm({...transactionForm, type: "debit", category_id: ""})}
                className={transactionForm.type === "debit" ? "flex-1 bg-red-600 hover:bg-red-700" : "flex-1"}
              >
                <ArrowDownRight className="w-4 h-4 mr-2" /> Dépense
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Libellé *</Label>
              <Input
                value={transactionForm.label}
                onChange={(e) => setTransactionForm({...transactionForm, label: e.target.value})}
                placeholder="Description de la transaction"
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Montant *</Label>
              <Input
                type="number"
                step="0.01"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                placeholder="0.00"
                className="bg-[#F8F8F8] border-[#E5E5E5] font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={transactionForm.category_id} onValueChange={(v) => setTransactionForm({...transactionForm, category_id: v})}>
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {getAllCategories(transactionForm.type === "credit" ? "income" : "expense").map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                placeholder="Notes optionnelles..."
                className="bg-[#F8F8F8] border-[#E5E5E5]"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransactionDialogOpen(false); resetTransactionForm(); }}>Annuler</Button>
            <Button onClick={handleSaveTransaction} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
              {editingTransaction ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetPage;
