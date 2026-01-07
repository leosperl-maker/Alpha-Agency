import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, 
  TrendingUp, 
  FileText, 
  Receipt, 
  CreditCard,
  ArrowUp,
  ArrowDown,
  Euro,
  Target,
  CheckSquare,
  Wallet,
  Clock,
  AlertCircle,
  Percent,
  BarChart3,
  PieChartIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { dashboardAPI, tasksAPI, budgetAPI } from "../../lib/api";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsRes, taskStatsRes, budgetRes, tasksRes] = await Promise.all([
          dashboardAPI.getStats(),
          tasksAPI.getStats(),
          budgetAPI.getSummary(),
          tasksAPI.getAll({ limit: 5 })
        ]);
        setStats(statsRes.data);
        setTaskStats(taskStatsRes.data);
        setBudgetSummary(budgetRes.data);
        setRecentTasks(tasksRes.data.slice(0, 5));
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const formatCurrency = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M€`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k€`;
    return `${amount?.toFixed(0) || 0}€`;
  };

  // Main CRM KPIs - Row 1
  const mainKPIs = [
    {
      title: "Contacts",
      value: stats?.contacts?.total || 0,
      subValue: `${stats?.contacts?.new_leads || 0} nouveaux leads`,
      icon: Users,
      color: "#CE0202",
      link: "/admin/contacts"
    },
    {
      title: "Pipeline",
      value: formatCurrency(stats?.opportunities?.pipeline_value || 0),
      subValue: `${stats?.opportunities?.total || 0} opportunités`,
      icon: Target,
      color: "#8B5CF6",
      link: "/admin/pipeline"
    },
    {
      title: "Devis en cours",
      value: stats?.quotes?.pending || 0,
      subValue: `${stats?.quotes?.accepted || 0} acceptés`,
      icon: FileText,
      color: "#F59E0B",
      link: "/admin/devis"
    },
    {
      title: "CA Facturé",
      value: formatCurrency(stats?.invoices?.total_invoiced || 0),
      subValue: `${formatCurrency(stats?.invoices?.total_paid || 0)} encaissé`,
      icon: Euro,
      color: "#10B981",
      link: "/admin/factures"
    }
  ];

  // Secondary KPIs - Row 2
  const secondaryKPIs = [
    {
      title: "Factures en attente",
      value: (stats?.invoices?.brouillon || 0) + (stats?.invoices?.pending || 0),
      subValue: stats?.invoices?.overdue > 0 ? `${stats.invoices.overdue} en retard` : "Aucune en retard",
      icon: Receipt,
      color: stats?.invoices?.overdue > 0 ? "#EF4444" : "#F59E0B",
      link: "/admin/factures"
    },
    {
      title: "CA Signé",
      value: formatCurrency(stats?.opportunities?.signed_revenue || 0),
      subValue: `${stats?.opportunities?.won || 0} affaires gagnées`,
      icon: TrendingUp,
      color: "#10B981",
      link: "/admin/pipeline"
    },
    {
      title: "Taux de conversion",
      value: `${stats?.kpis?.conversion_rate || 0}%`,
      subValue: "Lead → Client",
      icon: Percent,
      color: "#3B82F6",
      link: "/admin/contacts"
    },
    {
      title: "MRR",
      value: formatCurrency(stats?.mrr || 0),
      subValue: "Abonnements actifs",
      icon: CreditCard,
      color: "#8B5CF6",
      link: "/admin/abonnements"
    }
  ];

  // Leads trend data
  const leadsTrend = stats?.leads_trend?.length > 0 ? stats.leads_trend : [
    { name: "Jan", leads: 0 },
    { name: "Fév", leads: 0 },
    { name: "Mar", leads: 0 },
    { name: "Avr", leads: 0 },
    { name: "Mai", leads: 0 },
    { name: "Juin", leads: 0 }
  ];

  // Pipeline stages data
  const pipelineData = stats?.pipeline_stages?.length > 0 ? stats.pipeline_stages : [
    { name: "Nouveau", value: 0, color: "#3B82F6" },
    { name: "Qualifié", value: 0, color: "#8B5CF6" },
    { name: "Devis", value: 0, color: "#F59E0B" },
    { name: "Gagné", value: 0, color: "#10B981" }
  ];

  // Invoice status for bar chart
  const invoiceStatusData = [
    { name: "Brouillon", value: stats?.invoices?.brouillon || 0, color: "#9CA3AF" },
    { name: "En attente", value: stats?.invoices?.pending || 0, color: "#F59E0B" },
    { name: "En retard", value: stats?.invoices?.overdue || 0, color: "#EF4444" },
    { name: "Payées", value: stats?.invoices?.paid || 0, color: "#10B981" }
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-overview" className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-[#F8F8F8]">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">Vue d'ensemble</h1>
        <p className="text-[#666666] text-sm sm:text-base">Bienvenue sur votre dashboard Alpha Agency</p>
      </div>

      {/* Main KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {mainKPIs.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link to={kpi.link}>
              <Card className="bg-white border border-[#E5E5E5] shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#666666] text-xs sm:text-sm mb-1 truncate">{kpi.title}</p>
                      <p className="text-lg sm:text-2xl font-bold text-[#1A1A1A] font-mono">{kpi.value}</p>
                      <p className="text-[10px] sm:text-xs text-[#666666] mt-1 truncate">{kpi.subValue}</p>
                    </div>
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${kpi.color}15` }}
                    >
                      <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Secondary KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {secondaryKPIs.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
          >
            <Link to={kpi.link}>
              <Card className="bg-white border border-[#E5E5E5] shadow-sm hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#666666] text-xs sm:text-sm mb-1 truncate">{kpi.title}</p>
                      <p className="text-lg sm:text-2xl font-bold text-[#1A1A1A] font-mono">{kpi.value}</p>
                      <p className="text-[10px] sm:text-xs text-[#666666] mt-1 truncate">{kpi.subValue}</p>
                    </div>
                    <div 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${kpi.color}15` }}
                    >
                      <kpi.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Trend Chart */}
        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#CE0202]" />
              Évolution des leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="name" stroke="#666666" fontSize={12} />
                <YAxis stroke="#666666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px' }}
                  formatter={(value) => [value, 'Leads']}
                />
                <Bar dataKey="leads" fill="#CE0202" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#8B5CF6]" />
              Répartition Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px' }}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] space-y-2">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-[#666666]">{item.name}</span>
                    </div>
                    <span className="font-bold text-[#1A1A1A]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Invoice Status & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Status */}
        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#F59E0B]" />
              Statut Factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoiceStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-[#666666]">{item.name}</span>
                  </div>
                  <span className="font-bold text-[#1A1A1A]">{item.value}</span>
                </div>
              ))}
              <div className="pt-3 mt-3 border-t border-[#E5E5E5]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1A1A1A]">Total facturé</span>
                  <span className="font-bold text-[#CE0202]">{formatCurrency(stats?.invoices?.total_invoiced || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="bg-white border border-[#E5E5E5] shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#3B82F6]" />
              Tâches récentes
            </CardTitle>
            <Link to="/admin/taches" className="text-sm text-[#CE0202] hover:underline">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-[#666666] text-center py-6">Aucune tâche</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[#F8F8F8] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'done' ? 'bg-green-500' : 
                        task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <span className={`text-sm ${task.status === 'done' ? 'line-through text-[#666666]' : 'text-[#1A1A1A]'}`}>
                        {task.title}
                      </span>
                    </div>
                    <Badge className={`text-xs border-none ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority === 'urgent' ? 'Urgent' : 
                       task.priority === 'high' ? 'Haute' :
                       task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fourth Row - Task Stats & Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Progression */}
        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              Progression des tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#1A1A1A] font-mono">
                  {taskStats?.completion_rate || 0}%
                </div>
                <p className="text-[#666666] text-sm">Complétion</p>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666] flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400" /> À faire
                  </span>
                  <span className="font-bold">{taskStats?.todo || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666] flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> En cours
                  </span>
                  <span className="font-bold">{taskStats?.in_progress || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666666] flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" /> Terminées
                  </span>
                  <span className="font-bold text-green-600">{taskStats?.done || 0}</span>
                </div>
                {taskStats?.overdue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> En retard
                    </span>
                    <span className="font-bold text-red-600">{taskStats.overdue}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#8B5CF6]" />
              Budget du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <ArrowUp className="w-4 h-4" />
                  <span className="text-xs">Revenus</span>
                </div>
                <p className="text-lg font-bold text-green-700">{formatCurrency(budgetSummary?.total_income || 0)}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <ArrowDown className="w-4 h-4" />
                  <span className="text-xs">Dépenses</span>
                </div>
                <p className="text-lg font-bold text-red-700">{formatCurrency(budgetSummary?.total_expense || 0)}</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${(budgetSummary?.balance || 0) >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <div className={`flex items-center justify-center gap-1 mb-1 ${(budgetSummary?.balance || 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  <Euro className="w-4 h-4" />
                  <span className="text-xs">Solde</span>
                </div>
                <p className={`text-lg font-bold ${(budgetSummary?.balance || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {formatCurrency(budgetSummary?.balance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
