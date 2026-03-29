import { useState, useEffect } from "react";
import {
  Mail, Play, Pause, Trash2, Edit, Plus, CheckCircle, Clock,
  Users, Send, Eye, ChevronRight, Settings, FileText, Zap,
  Target, BarChart2, Loader2, AlertCircle, X, Save, ArrowLeft
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const NurturingPage = () => {
  const [sequences, setSequences] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [activeTab, setActiveTab] = useState("sequences");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "manual",
    trigger_value: "",
    steps: [{ subject: "", body_html: "", delay_days: 0, delay_hours: 0 }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("alpha_token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const loadData = async () => {
    try {
      const [seqRes, enrollRes, templatesRes, analyticsRes] = await Promise.all([
        fetch(`${API}/api/nurturing/sequences`, { headers: getAuthHeaders() }),
        fetch(`${API}/api/nurturing/enrollments?limit=20`, { headers: getAuthHeaders() }),
        fetch(`${API}/api/nurturing/templates`, { headers: getAuthHeaders() }),
        fetch(`${API}/api/nurturing/analytics?period=month`, { headers: getAuthHeaders() })
      ]);

      if (seqRes.ok) {
        const data = await seqRes.json();
        setSequences(data.sequences || []);
      }
      if (enrollRes.ok) {
        const data = await enrollRes.json();
        setEnrollments(data.enrollments || []);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSequence = async () => {
    if (!formData.name || formData.steps.length === 0) {
      toast.error("Nom et au moins une étape requis");
      return;
    }

    try {
      const res = await fetch(`${API}/api/nurturing/sequences`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success("Séquence créée !");
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Erreur lors de la création");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  const toggleSequenceStatus = async (sequenceId, currentStatus) => {
    const endpoint = currentStatus === "active" ? "pause" : "activate";
    try {
      const res = await fetch(`${API}/api/nurturing/sequences/${sequenceId}/${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        toast.success(endpoint === "activate" ? "Séquence activée" : "Séquence en pause");
        loadData();
      }
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const deleteSequence = async (sequenceId) => {
    if (!confirm("Supprimer cette séquence ?")) return;
    
    try {
      const res = await fetch(`${API}/api/nurturing/sequences/${sequenceId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        toast.success("Séquence supprimée");
        loadData();
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const cancelEnrollment = async (enrollmentId) => {
    try {
      await fetch(`${API}/api/nurturing/enrollments/${enrollmentId}/cancel`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      toast.success("Inscription annulée");
      loadData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, { subject: "", body_html: "", delay_days: 1, delay_hours: 0 }]
    }));
  };

  const removeStep = (index) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => i === index ? { ...step, [field]: value } : step)
    }));
  };

  const useTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === prev.steps.length - 1 
          ? { ...step, subject: template.subject, body_html: template.body_html }
          : step
      )
    }));
    toast.success(`Template "${template.name}" appliqué`);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      trigger_type: "manual",
      trigger_value: "",
      steps: [{ subject: "", body_html: "", delay_days: 0, delay_hours: 0 }]
    });
  };

  const getTriggerLabel = (type) => {
    const labels = {
      lead_created: "Nouveau lead",
      lead_score_above: "Score lead > X",
      lead_score_below: "Score lead < X",
      no_activity: "Sans activité depuis X jours",
      quote_sent: "Devis envoyé",
      quote_viewed: "Devis consulté",
      quote_rejected: "Devis refusé",
      manual: "Manuel",
      scheduled: "Programmé"
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-500",
      active: "bg-green-500",
      paused: "bg-yellow-500",
      archived: "bg-gray-700",
      completed: "bg-blue-500",
      failed: "bg-red-500",
      cancelled: "bg-gray-500"
    };
    const labels = {
      draft: "Brouillon",
      active: "Active",
      paused: "Pause",
      archived: "Archivée",
      completed: "Terminée",
      failed: "Échouée",
      cancelled: "Annulée"
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || "bg-gray-500"} text-slate-900`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Mail className="w-8 h-8 text-purple-500" />
              Automatisations Nurturing
            </h1>
            <p className="text-slate-500 mt-1">Séquences email automatisées pour convertir vos leads</p>
          </div>
          
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            data-testid="create-sequence-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Séquence
          </Button>
        </div>

        {/* Stats */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-purple-400">{sequences.filter(s => s.status === "active").length}</p>
              <p className="text-slate-500 text-sm">Séquences actives</p>
            </div>
            <div className="glass-panel rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{analytics.active_enrollments}</p>
              <p className="text-slate-500 text-sm">Contacts en cours</p>
            </div>
            <div className="glass-panel rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{analytics.emails_sent}</p>
              <p className="text-slate-500 text-sm">Emails envoyés (mois)</p>
            </div>
            <div className="glass-panel rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{analytics.delivery_rate?.toFixed(0) || 0}%</p>
              <p className="text-slate-500 text-sm">Taux de délivrabilité</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          {[
            { id: "sequences", label: "Séquences", icon: Zap },
            { id: "enrollments", label: "Inscriptions", icon: Users },
            { id: "templates", label: "Templates", icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? "bg-purple-100 text-purple-700" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sequences Tab */}
        {activeTab === "sequences" && (
          <div className="space-y-4">
            {sequences.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center">
                <Mail className="w-16 h-16 text-slate-900/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune séquence</h3>
                <p className="text-slate-500 mb-6">Créez votre première séquence d'emails automatisés</p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une séquence
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sequences.map(seq => (
                  <div key={seq.id} className="glass-panel rounded-xl p-4 hover:bg-slate-50 transition-colors" data-testid={`sequence-${seq.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-slate-900 font-semibold">{seq.name}</h3>
                        <p className="text-slate-400 text-sm">{getTriggerLabel(seq.trigger_type)}</p>
                      </div>
                      {getStatusBadge(seq.status)}
                    </div>
                    
                    <p className="text-slate-500 text-sm mb-3 line-clamp-2">{seq.description || "Aucune description"}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {seq.steps?.length || 0} emails
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {seq.stats?.enrolled || 0} inscrits
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={seq.status === "active" ? "outline" : "default"}
                        onClick={() => toggleSequenceStatus(seq.id, seq.status)}
                        className={seq.status === "active" ? "" : "bg-green-600 hover:bg-green-500"}
                      >
                        {seq.status === "active" ? (
                          <><Pause className="w-3 h-3 mr-1" /> Pause</>
                        ) : (
                          <><Play className="w-3 h-3 mr-1" /> Activer</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSequence(seq.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enrollments Tab */}
        {activeTab === "enrollments" && (
          <div className="glass-panel rounded-xl overflow-hidden">
            {enrollments.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-900/20 mx-auto mb-3" />
                <p className="text-slate-500">Aucune inscription active</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {enrollments.map(enrollment => (
                  <div key={enrollment.id} className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-medium">
                        {enrollment.contact?.first_name} {enrollment.contact?.last_name}
                      </p>
                      <p className="text-slate-500 text-sm">{enrollment.sequence_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-600 text-sm">Étape {enrollment.current_step + 1}</p>
                      {getStatusBadge(enrollment.status)}
                    </div>
                    {enrollment.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => cancelEnrollment(enrollment.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <div key={template.id} className="glass-panel rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-slate-900 font-semibold">{template.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {template.category}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => { setShowCreateModal(true); useTemplate(template); }}>
                    Utiliser
                  </Button>
                </div>
                <p className="text-slate-500 text-sm mb-2">Sujet: {template.subject}</p>
                <div 
                  className="text-slate-400 text-xs line-clamp-3 p-2 bg-black/20 rounded"
                  dangerouslySetInnerHTML={{ __html: template.body_html }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-50 rounded-xl p-6 w-full max-w-3xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-purple-500" />
                Nouvelle Séquence
              </h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-600 text-sm block mb-1">Nom de la séquence *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Onboarding nouveaux leads"
                    className="bg-white border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-sm block mb-1">Déclencheur</label>
                  <select
                    value={formData.trigger_type}
                    onChange={(e) => setFormData(p => ({ ...p, trigger_type: e.target.value }))}
                    className="w-full p-2 rounded-lg bg-white border border-slate-200 text-slate-900"
                  >
                    <option value="manual" className="bg-gray-900">Manuel</option>
                    <option value="lead_created" className="bg-gray-900">Nouveau lead créé</option>
                    <option value="lead_score_above" className="bg-gray-900">Score lead supérieur à...</option>
                    <option value="no_activity" className="bg-gray-900">Sans activité depuis...</option>
                    <option value="quote_sent" className="bg-gray-900">Devis envoyé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 text-sm block mb-1">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Décrivez l'objectif de cette séquence"
                  className="bg-white border-slate-200"
                />
              </div>

              {/* Email Steps */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-900 font-semibold">Étapes de la séquence</h3>
                  <Button size="sm" variant="outline" onClick={addStep}>
                    <Plus className="w-3 h-3 mr-1" /> Ajouter étape
                  </Button>
                </div>

                {formData.steps.map((step, index) => (
                  <div key={index} className="p-4 rounded-lg bg-white mb-4 relative">
                    <div className="absolute -left-3 top-4 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    
                    {index > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-500 text-sm">Attendre</span>
                        <Input
                          type="number"
                          min="0"
                          value={step.delay_days}
                          onChange={(e) => updateStep(index, "delay_days", parseInt(e.target.value) || 0)}
                          className="w-16 bg-slate-100 border-slate-200 text-center"
                        />
                        <span className="text-slate-500 text-sm">jour(s)</span>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={step.delay_hours}
                          onChange={(e) => updateStep(index, "delay_hours", parseInt(e.target.value) || 0)}
                          className="w-16 bg-slate-100 border-slate-200 text-center"
                        />
                        <span className="text-slate-500 text-sm">heure(s)</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="text-slate-500 text-xs">Sujet de l'email</label>
                        <Input
                          value={step.subject}
                          onChange={(e) => updateStep(index, "subject", e.target.value)}
                          placeholder="Ex: Bienvenue {{first_name}} !"
                          className="bg-slate-100 border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 text-xs">Contenu HTML</label>
                        <textarea
                          value={step.body_html}
                          onChange={(e) => updateStep(index, "body_html", e.target.value)}
                          placeholder="<h2>Bonjour {{first_name}},</h2><p>...</p>"
                          rows={4}
                          className="w-full p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-sm resize-none"
                        />
                        <p className="text-slate-400 text-xs mt-1">
                          Variables: {"{{first_name}}"}, {"{{last_name}}"}, {"{{company}}"}, {"{{email}}"}
                        </p>
                      </div>
                    </div>

                    {formData.steps.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 text-red-400 hover:text-red-300"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                Annuler
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-500" onClick={createSequence}>
                <Save className="w-4 h-4 mr-2" />
                Créer la séquence
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurturingPage;
