import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Users, FileText, Receipt, Calendar,
  DollarSign, Target, Clock, CheckCircle, BarChart3, PieChart,
  Download, RefreshCw, Filter, ChevronDown, Activity, ArrowUpRight
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const AnalyticsDashboardPage = () => {
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [revenueChart, setRevenueChart] = useState(null);
  const [leadsFunnel, setLeadsFunnel] = useState(null);
  const [topClients, setTopClients] = useState(null);
  const [activityTimeline, setActivityTimeline] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("alpha_token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    loadAllData();
  }, [period]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboard(),
        loadRevenueChart(),
        loadLeadsFunnel(),
        loadTopClients(),
        loadActivityTimeline()
      ]);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Erreur lors du chargement des analytics");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    const res = await fetch(`${API}/api/analytics/dashboard?period=${period}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) setDashboardData(await res.json());
  };

  const loadRevenueChart = async () => {
    const granularity = period === "year" ? "month" : period === "quarter" ? "week" : "day";
    const res = await fetch(`${API}/api/analytics/revenue-chart?period=${period}&granularity=${granularity}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) setRevenueChart(await res.json());
  };

  const loadLeadsFunnel = async () => {
    const res = await fetch(`${API}/api/analytics/leads-funnel?period=${period}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) setLeadsFunnel(await res.json());
  };

  const loadTopClients = async () => {
    const res = await fetch(`${API}/api/analytics/top-clients?period=${period}&limit=5`, {
      headers: getAuthHeaders()
    });
    if (res.ok) setTopClients(await res.json());
  };

  const loadActivityTimeline = async () => {
    const res = await fetch(`${API}/api/analytics/activity-timeline?limit=10`, {
      headers: getAuthHeaders()
    });
    if (res.ok) setActivityTimeline(await res.json());
  };

  const exportData = async (format) => {
    try {
      const res = await fetch(`${API}/api/analytics/export?period=${period}&format=${format}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (format === "csv") {
          const blob = new Blob([data.content], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.filename;
          a.click();
          toast.success("Export CSV téléchargé");
        } else {
          toast.success("Données exportées");
        }
      }
    } catch (error) {
      toast.error("Erreur lors de l'export");
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const getChangePercent = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const periodLabels = {
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    quarter: "Ce trimestre",
    year: "Cette année"
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-violet-500" />
              Analytics Dashboard
            </h1>
            <p className="text-white/50 text-sm mt-1">Vue d'ensemble de votre activité</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="quarter">Ce trimestre</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAllData()}
              className="border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData("csv")}
              className="border-white/10"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    (dashboardData.revenue?.current || 0) >= (dashboardData.revenue?.previous || 0) 
                      ? "text-green-400" : "text-red-400"
                  }`}>
                    {(dashboardData.revenue?.current || 0) >= (dashboardData.revenue?.previous || 0) 
                      ? <TrendingUp className="w-3 h-3" /> 
                      : <TrendingDown className="w-3 h-3" />
                    }
                    {getChangePercent(dashboardData.revenue?.current || 0, dashboardData.revenue?.previous || 0)}%
                  </div>
                </div>
                <p className="text-2xl font-bold text-white mt-3">
                  {formatCurrency(dashboardData.revenue?.current || 0)}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Chiffre d'affaires • {periodLabels[period]}
                </p>
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    (dashboardData.contacts?.new || 0) >= (dashboardData.contacts?.previous || 0) 
                      ? "text-green-400" : "text-red-400"
                  }`}>
                    {(dashboardData.contacts?.new || 0) >= (dashboardData.contacts?.previous || 0) 
                      ? <TrendingUp className="w-3 h-3" /> 
                      : <TrendingDown className="w-3 h-3" />
                    }
                    {getChangePercent(dashboardData.contacts?.new || 0, dashboardData.contacts?.previous || 0)}%
                  </div>
                </div>
                <p className="text-2xl font-bold text-white mt-3">
                  {dashboardData.contacts?.new || 0}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Nouveaux contacts • {periodLabels[period]}
                </p>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-xs text-purple-400">
                    {dashboardData.documents?.conversion_rate || 0}% conversion
                  </div>
                </div>
                <p className="text-2xl font-bold text-white mt-3">
                  {(dashboardData.documents?.invoices || 0) + (dashboardData.documents?.quotes || 0)}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {dashboardData.documents?.invoices || 0} factures • {dashboardData.documents?.quotes || 0} devis
                </p>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <CheckCircle className="w-5 h-5 text-amber-400" />
                  </div>
                  {(dashboardData.tasks?.overdue || 0) > 0 && (
                    <div className="text-xs text-red-400">
                      {dashboardData.tasks?.overdue || 0} en retard
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold text-white mt-3">
                  {dashboardData.tasks?.completed || 0}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Tâches complétées • {dashboardData.tasks?.pending || 0} en cours
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Chart */}
          <Card className="lg:col-span-2 bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Évolution du CA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChart && revenueChart.current.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple bar representation */}
                  <div className="flex items-end gap-1 h-32">
                    {revenueChart.current.slice(-14).map((d, i) => {
                      const maxVal = Math.max(...revenueChart.current.map(x => x.revenue));
                      const height = maxVal > 0 ? (d.revenue / maxVal * 100) : 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-500 hover:to-green-300 transition-colors relative group"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        >
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            {formatCurrency(d.revenue)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-white/40 text-[10px]">
                    <span>{revenueChart.current[0]?.date}</span>
                    <span>{revenueChart.current[revenueChart.current.length - 1]?.date}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-white/50 text-sm">Total période</span>
                    <span className="text-white font-bold">{formatCurrency(revenueChart.total_current)}</span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-white/40 text-sm">
                  Aucune donnée pour cette période
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leads Funnel */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                Entonnoir des leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadsFunnel && leadsFunnel.funnel.length > 0 ? (
                <div className="space-y-2">
                  {leadsFunnel.funnel.map((stage, i) => {
                    const maxCount = Math.max(...leadsFunnel.funnel.map(s => s.count));
                    const width = maxCount > 0 ? (stage.count / maxCount * 100) : 0;
                    return (
                      <div key={stage.stage} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/70">{stage.label}</span>
                          <span className="text-white font-medium">{stage.count}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(width, 2)}%` }}
                          />
                        </div>
                        {stage.conversion_rate > 0 && (
                          <p className="text-[10px] text-white/40 text-right">
                            {stage.conversion_rate}% conversion
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-white/40 text-sm">
                  Aucun lead
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Clients */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Top Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topClients && topClients.clients.length > 0 ? (
                <div className="space-y-3">
                  {topClients.clients.map((client, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-amber-500 text-black" :
                          i === 1 ? "bg-gray-400 text-black" :
                          i === 2 ? "bg-amber-700 text-white" :
                          "bg-white/10 text-white/50"
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{client.name}</p>
                          <p className="text-white/40 text-xs">{client.invoices} factures</p>
                        </div>
                      </div>
                      <p className="text-white font-bold">{formatCurrency(client.revenue)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-white/40 text-sm">
                  Aucun client
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityTimeline && activityTimeline.activities.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activityTimeline.activities.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        activity.type === "contact" ? "bg-blue-500/20" :
                        activity.type === "invoice" ? "bg-green-500/20" :
                        "bg-amber-500/20"
                      }`}>
                        {activity.type === "contact" ? <Users className="w-3 h-3 text-blue-400" /> :
                         activity.type === "invoice" ? <FileText className="w-3 h-3 text-green-400" /> :
                         <CheckCircle className="w-3 h-3 text-amber-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm truncate">{activity.message}</p>
                        <p className="text-white/30 text-[10px]">
                          {activity.date ? new Date(activity.date).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                          }) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-white/40 text-sm">
                  Aucune activité récente
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
