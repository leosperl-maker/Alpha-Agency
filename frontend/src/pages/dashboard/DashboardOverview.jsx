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
  Euro,
  Target,
  CheckSquare,
  Wallet,
  Clock,
  AlertCircle
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
  Bar
} from "recharts";

const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardAPI.getStats();
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const kpiCards = [
    {
      title: "Contacts",
      value: stats?.contacts?.total || 0,
      subValue: `${stats?.contacts?.new_leads || 0} nouveaux`,
      icon: Users,
      color: "#CE0202",
      trend: "up"
    },
    {
      title: "Pipeline",
      value: `${(stats?.opportunities?.pipeline_value || 0).toLocaleString()}€`,
      subValue: `${stats?.opportunities?.total || 0} opportunités`,
      icon: Target,
      color: "#8B5CF6",
      trend: "up"
    },
    {
      title: "Factures",
      value: stats?.invoices?.paid || 0,
      subValue: `${stats?.invoices?.pending || 0} en attente`,
      icon: Receipt,
      color: "#F59E0B",
      trend: "neutral"
    },
    {
      title: "CA Facturé",
      value: `${(stats?.invoices?.total_paid || 0).toLocaleString()}€`,
      subValue: `${(stats?.invoices?.total_invoiced || 0).toLocaleString()}€ total`,
      icon: Euro,
      color: "#10B981",
      trend: "up"
    }
  ];

  // Use real data from API if available, otherwise use placeholder
  const leadsTrend = stats?.leads_trend?.length > 0 ? stats.leads_trend : [
    { name: "Jan", leads: 0 },
    { name: "Fév", leads: 0 },
    { name: "Mar", leads: 0 },
    { name: "Avr", leads: 0 },
    { name: "Mai", leads: 0 },
    { name: "Juin", leads: 0 }
  ];

  const pipelineData = stats?.pipeline_stages?.length > 0 ? stats.pipeline_stages : [
    { name: "Nouveau", value: 0, color: "#3B82F6" },
    { name: "Qualifié", value: 0, color: "#8B5CF6" },
    { name: "Devis", value: 0, color: "#F59E0B" },
    { name: "Gagné", value: 0, color: "#10B981" }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-overview" className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Vue d'ensemble</h1>
        <p className="text-[#666666]">Bienvenue sur votre dashboard Alpha Agency</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              data-testid={`kpi-${index}`}
              className="bg-white border border-[#E5E5E5] shadow-sm"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[#666666] text-sm mb-1">{kpi.title}</p>
                    <p className="text-3xl font-bold text-[#1A1A1A] font-mono">{kpi.value}</p>
                    <p className="text-xs text-[#666666] mt-1">{kpi.subValue}</p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${kpi.color}15` }}
                  >
                    <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
                  </div>
                </div>
                {kpi.trend === "up" && (
                  <div className="flex items-center gap-1 mt-3 text-green-600 text-xs">
                    <ArrowUp className="w-3 h-3" />
                    <span>+12% ce mois</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Trend */}
        <Card data-testid="leads-chart" className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] text-lg">Évolution des leads</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={leadsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="name" stroke="#666666" fontSize={12} />
                <YAxis stroke="#666666" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#CE0202" 
                  strokeWidth={2}
                  dot={{ fill: '#CE0202', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card data-testid="pipeline-chart" className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] text-lg">Répartition Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E5E5E5',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pipelineData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[#666666]">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#F59E0B]" />
              Factures en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1A1A1A] font-mono">
              {stats?.invoices?.pending || 0}
            </div>
            {stats?.invoices?.overdue > 0 && (
              <p className="text-red-500 text-sm mt-2">
                {stats.invoices.overdue} en retard
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <Euro className="w-5 h-5 text-[#10B981]" />
              CA Signé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1A1A1A] font-mono">
              {(stats?.opportunities?.signed_revenue || 0).toLocaleString()}€
            </div>
            <p className="text-[#666666] text-sm mt-2">Ce mois</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E5E5E5] shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#8B5CF6]" />
              Taux de conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#1A1A1A] font-mono">
              {stats?.kpis?.conversion_rate || 0}%
            </div>
            <p className="text-[#666666] text-sm mt-2">Lead → Client</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
