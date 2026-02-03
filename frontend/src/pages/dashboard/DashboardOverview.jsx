import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  PieChartIcon,
  Calendar,
  Plus,
  ArrowRight,
  Sparkles,
  Link2,
  Share2,
  Instagram,
  Facebook,
  Linkedin,
  MessageSquare,
  Eye,
  MousePointerClick,
  Zap,
  Bot,
  Hash,
  Timer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { dashboardAPI, tasksAPI, budgetAPI } from "../../lib/api";
import api from "../../lib/api";
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
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [multilinkStats, setMultilinkStats] = useState(null);
  const [hotLeads, setHotLeads] = useState([]);
  const [churnAlerts, setChurnAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');

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

        // Fetch upcoming events
        try {
          const eventsRes = await api.get('/agenda/events', { 
            params: { start_date: new Date().toISOString().split('T')[0], limit: 3 }
          });
          setUpcomingEvents(eventsRes.data?.slice(0, 3) || []);
        } catch (e) { console.log('No events API'); }

        // Fetch scheduled posts
        try {
          const postsRes = await api.get('/editorial/posts', { 
            params: { status: 'scheduled', limit: 3 }
          });
          setScheduledPosts(postsRes.data?.slice(0, 3) || []);
        } catch (e) { console.log('No posts API'); }

        // Fetch multilink stats
        try {
          const pagesRes = await api.get('/multilink/pages');
          if (pagesRes.data?.length > 0) {
            const totalViews = pagesRes.data.reduce((sum, p) => sum + (p.total_views || 0), 0);
            const totalClicks = pagesRes.data.reduce((sum, p) => sum + (p.total_clicks || 0), 0);
            setMultilinkStats({ 
              pages: pagesRes.data.length, 
              views: totalViews, 
              clicks: totalClicks 
            });
          }
        } catch (e) { console.log('No multilink API'); }

        // Fetch hot leads (Lead Scoring)
        try {
          const leadsRes = await api.get('/analytics/lead-scores', { params: { limit: 5 } });
          const hot = (leadsRes.data?.leads || []).filter(l => l.score >= 60).slice(0, 5);
          setHotLeads(hot);
        } catch (e) { console.log('No lead scoring API'); }

        // Fetch churn alerts
        try {
          const churnRes = await api.get('/analytics/churn-alerts', { params: { limit: 5 } });
          setChurnAlerts((churnRes.data?.alerts || []).slice(0, 5));
        } catch (e) { console.log('No churn alerts API'); }

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

  // Quick actions
  const quickActions = [
    { icon: Users, label: 'Contact', color: 'from-blue-500 to-cyan-500', action: () => navigate('/admin/contacts') },
    { icon: CheckSquare, label: 'Tâche', color: 'from-amber-500 to-orange-500', action: () => navigate('/admin/taches') },
    { icon: Receipt, label: 'Facture', color: 'from-green-500 to-emerald-500', action: () => navigate('/admin/facturation') },
    { icon: Share2, label: 'Publier', color: 'from-pink-500 to-rose-500', action: () => navigate('/admin/editorial') },
    { icon: Link2, label: 'Multilink', color: 'from-indigo-500 to-violet-500', action: () => navigate('/admin/multilink') },
    { icon: Bot, label: 'MoltBot', color: 'from-violet-500 to-purple-500', action: () => navigate('/admin/moltbot') },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white/5 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white/5 animate-pulse rounded-2xl border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-overview" className="space-y-4 sm:space-y-6 pb-20">
      {/* Welcome Header - Mobile Optimized */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border border-white/10 p-4 sm:p-6">
        <div className="flex flex-row items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
              {greeting} 👋
            </h1>
            <p className="text-white/60 text-sm sm:text-base mt-0.5 sm:mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Button 
            onClick={() => navigate('/admin/moltbot')}
            className="bg-gradient-to-r from-violet-600/80 to-purple-600/80 hover:from-violet-600 hover:to-purple-600 text-white border-0 text-xs sm:text-sm px-2 sm:px-4"
            size="sm"
          >
            <Sparkles className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">MoltBot</span>
          </Button>
        </div>

        {/* Quick Stats Strip - Horizontal scroll on mobile */}
        <div className="mt-4 sm:mt-6 flex sm:grid sm:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {[
            { label: 'Pipeline', value: formatCurrency(stats?.opportunities?.pipeline_value || 0), icon: Target, color: 'text-purple-400' },
            { label: 'Facturé', value: formatCurrency(stats?.invoices?.total_invoiced || 0), icon: Euro, color: 'text-green-400' },
            { label: 'Tâches', value: taskStats?.in_progress || 0, icon: Clock, color: 'text-blue-400' },
            { label: 'Contacts', value: stats?.contacts?.total || 0, icon: Users, color: 'text-pink-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 rounded-lg sm:rounded-xl p-2.5 sm:p-3 backdrop-blur-sm flex-shrink-0 min-w-[100px] sm:min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                <stat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.color}`} />
                <span className="text-white/50 text-[10px] sm:text-xs">{stat.label}</span>
              </div>
              <p className="text-white font-bold text-base sm:text-lg">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <span className="text-white/40 text-xs sm:text-sm whitespace-nowrap mr-1 sm:mr-2 hidden sm:inline">Accès rapide:</span>
        {quickActions.map((action, i) => (
          <button
            key={i}
            onClick={action.action}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg sm:rounded-xl transition-all whitespace-nowrap group flex-shrink-0"
          >
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center`}>
              <action.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </div>
            <span className="text-white/70 text-xs sm:text-sm group-hover:text-white">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {mainKPIs.map((kpi, index) => (
          <div key={kpi.title}>
            <Link to={kpi.link}>
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer h-full rounded-xl sm:rounded-2xl group">
                <CardContent className="p-2.5 sm:p-5">
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-[10px] sm:text-sm mb-0.5 sm:mb-1 truncate">{kpi.title}</p>
                      <p className="text-base sm:text-2xl font-bold text-white font-mono">{kpi.value}</p>
                      <p className="text-[9px] sm:text-xs text-white/40 mt-0.5 sm:mt-1 truncate">{kpi.subValue}</p>
                    </div>
                    <div 
                      className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${kpi.color}25` }}
                    >
                      <kpi.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        ))}
      </div>

      {/* Secondary KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {secondaryKPIs.map((kpi, index) => (
          <div key={kpi.title}>
            <Link to={kpi.link}>
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full rounded-xl sm:rounded-2xl group">
                <CardContent className="p-2.5 sm:p-5">
                  <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-[10px] sm:text-sm mb-0.5 sm:mb-1 truncate">{kpi.title}</p>
                      <p className="text-base sm:text-2xl font-bold text-white font-mono">{kpi.value}</p>
                      <p className="text-[9px] sm:text-xs text-white/40 mt-0.5 sm:mt-1 truncate">{kpi.subValue}</p>
                    </div>
                    <div 
                      className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${kpi.color}25` }}
                    >
                      <kpi.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Leads Trend Chart */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl sm:rounded-2xl">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              Évolution des leads
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leadsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={10} tickMargin={5} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} width={30} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '12px' }}
                  formatter={(value) => [value, 'Leads']}
                />
                <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl sm:rounded-2xl">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              Répartition Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
            <div className="flex items-center">
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '12px' }}
                    formatter={(value, name) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[45%] space-y-1.5 sm:space-y-2">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs sm:text-sm text-white/60">{item.name}</span>
                    </div>
                    <span className="font-bold text-white text-xs sm:text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Invoice Status & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Invoice Status */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-xl sm:rounded-2xl">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              Statut Factures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoiceStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-white/60">{item.name}</span>
                  </div>
                  <span className="font-bold text-white">{item.value}</span>
                </div>
              ))}
              <div className="pt-3 mt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/80">Total facturé</span>
                  <span className="font-bold text-indigo-400">{formatCurrency(stats?.invoices?.total_invoiced || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-400" />
              Tâches récentes
            </CardTitle>
            <Link to="/admin/taches" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-white/50 text-center py-6">Aucune tâche</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'done' ? 'bg-green-500' : 
                        task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} />
                      <span className={`text-sm ${task.status === 'done' ? 'line-through text-white/40' : 'text-white/90'}`}>
                        {task.title}
                      </span>
                    </div>
                    <Badge className={`text-xs border ${
                      task.priority === 'urgent' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      task.priority === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                      task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                      'bg-white/10 text-white/60 border-white/20'
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
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Progression des tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-white font-mono">
                  {taskStats?.completion_rate || 0}%
                </div>
                <p className="text-white/50 text-sm">Complétion</p>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-500" /> À faire
                  </span>
                  <span className="font-bold text-white">{taskStats?.todo || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> En cours
                  </span>
                  <span className="font-bold text-white">{taskStats?.in_progress || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" /> Terminées
                  </span>
                  <span className="font-bold text-green-400">{taskStats?.done || 0}</span>
                </div>
                {taskStats?.overdue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> En retard
                    </span>
                    <span className="font-bold text-red-400">{taskStats.overdue}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Summary */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400" />
              Budget du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                  <ArrowUp className="w-4 h-4" />
                  <span className="text-xs">Revenus</span>
                </div>
                <p className="text-lg font-bold text-green-400">{formatCurrency(budgetSummary?.total_income || 0)}</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                  <ArrowDown className="w-4 h-4" />
                  <span className="text-xs">Dépenses</span>
                </div>
                <p className="text-lg font-bold text-red-400">{formatCurrency(budgetSummary?.total_expense || 0)}</p>
              </div>
              <div className={`text-center p-3 rounded-xl ${(budgetSummary?.balance || 0) >= 0 ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-orange-500/10 border border-orange-500/20'}`}>
                <div className={`flex items-center justify-center gap-1 mb-1 ${(budgetSummary?.balance || 0) >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                  <Euro className="w-4 h-4" />
                  <span className="text-xs">Solde</span>
                </div>
                <p className={`text-lg font-bold ${(budgetSummary?.balance || 0) >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                  {formatCurrency(budgetSummary?.balance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fifth Row - Upcoming Events, Scheduled Posts, Multilink Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Prochains RDV
            </CardTitle>
            <Link to="/admin/agenda" className="text-xs text-indigo-400 hover:text-indigo-300">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Aucun événement à venir</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/admin/agenda')}
                  className="mt-2 text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-3 h-3 mr-1" /> Ajouter un RDV
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event, i) => (
                  <div key={event.id || i} className="flex items-start gap-3 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex flex-col items-center justify-center text-amber-400">
                      <span className="text-xs font-bold">{new Date(event.start_date || event.date).getDate()}</span>
                      <span className="text-[10px] uppercase">{new Date(event.start_date || event.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{event.title}</p>
                      <p className="text-white/40 text-xs truncate">
                        {event.start_time || '09:00'} {event.location && `• ${event.location}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Posts */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Share2 className="w-4 h-4 text-pink-400" />
              Posts programmés
            </CardTitle>
            <Link to="/admin/editorial" className="text-xs text-indigo-400 hover:text-indigo-300">
              Voir tout →
            </Link>
          </CardHeader>
          <CardContent>
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-6">
                <Share2 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Aucun post programmé</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/admin/editorial')}
                  className="mt-2 text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-3 h-3 mr-1" /> Programmer un post
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledPosts.map((post, i) => (
                  <div key={post.id || i} className="flex items-start gap-3 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      {post.networks?.includes('instagram') ? <Instagram className="w-4 h-4 text-pink-400" /> :
                       post.networks?.includes('facebook') ? <Facebook className="w-4 h-4 text-blue-400" /> :
                       post.networks?.includes('linkedin') ? <Linkedin className="w-4 h-4 text-blue-500" /> :
                       <Share2 className="w-4 h-4 text-pink-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{post.title || 'Post sans titre'}</p>
                      <p className="text-white/40 text-xs">
                        {post.scheduled_date && new Date(post.scheduled_date).toLocaleDateString('fr-FR')} {post.scheduled_time || ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Multilink Stats */}
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              Multilink
            </CardTitle>
            <Link to="/admin/multilink" className="text-xs text-indigo-400 hover:text-indigo-300">
              Gérer →
            </Link>
          </CardHeader>
          <CardContent>
            {!multilinkStats ? (
              <div className="text-center py-6">
                <Link2 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">Aucune page créée</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/admin/multilink')}
                  className="mt-2 text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-3 h-3 mr-1" /> Créer une page
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 bg-indigo-500/10 rounded-xl">
                    <p className="text-2xl font-bold text-indigo-400">{multilinkStats.pages}</p>
                    <p className="text-white/40 text-xs">Pages</p>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-xl">
                    <Eye className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-400">{multilinkStats.views}</p>
                    <p className="text-white/40 text-xs">Vues</p>
                  </div>
                  <div className="text-center p-3 bg-amber-500/10 rounded-xl">
                    <MousePointerClick className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-400">{multilinkStats.clicks}</p>
                    <p className="text-white/40 text-xs">Clics</p>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Taux de clic</span>
                    <span className="text-indigo-400 font-bold">
                      {multilinkStats.views > 0 ? ((multilinkStats.clicks / multilinkStats.views) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Promo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-pink-600/20 border border-white/10 p-6">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-white font-semibold text-lg">MoltBot disponible</h3>
            <p className="text-white/60 text-sm">Gérez votre CRM par commandes: créez des devis, planifiez des RDV, suivez vos tâches et bien plus</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/admin/editorial')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Hash className="w-4 h-4 mr-2" />
              Hashtags
            </Button>
            <Button 
              onClick={() => navigate('/admin/moltbot')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
            >
              <Bot className="w-4 h-4 mr-2" />
              Ouvrir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
