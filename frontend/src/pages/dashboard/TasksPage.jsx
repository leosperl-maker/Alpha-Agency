import { useState, useEffect } from "react";
import { Plus, CheckCircle, Clock, AlertCircle, Calendar, MoreVertical, Trash2, Edit, Flag, ChevronDown, Search, Filter, User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { tasksAPI, contactsAPI } from "../../lib/api";

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    category: "general",
    due_date: "",
    contact_id: ""
  });

  const statusConfig = {
    todo: { label: "À faire", color: "bg-gray-100 text-gray-700", icon: Clock },
    in_progress: { label: "En cours", color: "bg-blue-100 text-blue-700", icon: Clock },
    done: { label: "Terminé", color: "bg-green-100 text-green-700", icon: CheckCircle }
  };

  const priorityConfig = {
    low: { label: "Basse", color: "bg-gray-100 text-gray-600" },
    medium: { label: "Moyenne", color: "bg-yellow-100 text-yellow-700" },
    high: { label: "Haute", color: "bg-orange-100 text-orange-700" },
    urgent: { label: "Urgente", color: "bg-red-100 text-red-700" }
  };

  const categories = [
    { value: "general", label: "Général" },
    { value: "client", label: "Client" },
    { value: "projet", label: "Projet" },
    { value: "admin", label: "Administratif" },
    { value: "marketing", label: "Marketing" },
    { value: "dev", label: "Développement" }
  ];

  useEffect(() => {
    fetchData();
    fetchContacts();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        tasksAPI.getAll(),
        tasksAPI.getStats()
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getAll();
      setContacts(response.data);
    } catch (error) {
      console.error("Erreur chargement contacts:", error);
    }
  };

  // Get contact name by ID
  const getContactName = (contactId) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return null;
    return `${contact.first_name} ${contact.last_name}${contact.company ? ` (${contact.company})` : ''}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - don't send empty contact_id
      const dataToSend = { ...formData };
      if (!dataToSend.contact_id) {
        delete dataToSend.contact_id;
      }
      
      if (editingTask) {
        await tasksAPI.update(editingTask.id, dataToSend);
        toast.success("Tâche mise à jour");
      } else {
        await tasksAPI.create(dataToSend);
        toast.success("Tâche créée");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    try {
      await tasksAPI.delete(id);
      toast.success("Tâche supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      category: "general",
      due_date: "",
      contact_id: ""
    });
    setEditingTask(null);
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      category: task.category || "general",
      due_date: task.due_date || "",
      contact_id: task.contact_id || ""
    });
    setDialogOpen(true);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group tasks by status for kanban view
  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === "todo"),
    in_progress: filteredTasks.filter(t => t.status === "in_progress"),
    done: filteredTasks.filter(t => t.status === "done")
  };

  const TaskCard = ({ task }) => {
    const priority = priorityConfig[task.priority] || priorityConfig.medium;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
    
    return (
      <div className={`bg-white border border-[#E5E5E5] rounded-lg p-3 mb-2 hover:shadow-md transition-shadow ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-[#1A1A1A] text-sm ${task.status === 'done' ? 'line-through text-[#666666]' : ''}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-[#666666] mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white">
              <DropdownMenuItem onClick={() => openEditDialog(task)}>
                <Edit className="w-4 h-4 mr-2" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {task.status !== "todo" && (
                <DropdownMenuItem onClick={() => handleStatusChange(task.id, "todo")}>
                  À faire
                </DropdownMenuItem>
              )}
              {task.status !== "in_progress" && (
                <DropdownMenuItem onClick={() => handleStatusChange(task.id, "in_progress")}>
                  En cours
                </DropdownMenuItem>
              )}
              {task.status !== "done" && (
                <DropdownMenuItem onClick={() => handleStatusChange(task.id, "done")}>
                  Terminé
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge className={`${priority.color} border-none text-xs`}>
            <Flag className="w-3 h-3 mr-1" />
            {priority.label}
          </Badge>
          {task.category && (
            <Badge variant="outline" className="text-xs">
              {categories.find(c => c.value === task.category)?.label || task.category}
            </Badge>
          )}
          {task.due_date && (
            <Badge className={`${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'} border-none text-xs`}>
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(task.due_date).toLocaleDateString('fr-FR')}
            </Badge>
          )}
        </div>
        {/* Contact associé */}
        {task.contact_id && getContactName(task.contact_id) && (
          <div className="mt-2 pt-2 border-t border-[#E5E5E5]">
            <p className="text-xs text-[#666666] flex items-center gap-1">
              <User className="w-3 h-3" />
              {getContactName(task.contact_id)}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="p-6 bg-[#F8F8F8] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Tâches</h1>
          <p className="text-[#666666]">Gérez vos tâches et projets</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-[#CE0202] hover:bg-[#B00202] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle tâche
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.todo || 0}</p>
                <p className="text-xs text-[#666666]">À faire</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.in_progress || 0}</p>
                <p className="text-xs text-[#666666]">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.done || 0}</p>
                <p className="text-xs text-[#666666]">Terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.overdue || 0}</p>
                <p className="text-xs text-[#666666]">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#CE0202]/10">
                <CheckCircle className="w-5 h-5 text-[#CE0202]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{stats.completion_rate || 0}%</p>
                <p className="text-xs text-[#666666]">Complétion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-[#E5E5E5]"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-white border-[#E5E5E5]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="todo">À faire</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="done">Terminé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px] bg-white border-[#E5E5E5]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[900px] md:min-w-0">
        {Object.entries(statusConfig).map(([status, config]) => {
          const StatusIcon = config.icon;
          const statusTasks = tasksByStatus[status] || [];
          
          return (
            <div key={status} className="bg-white rounded-lg border border-[#E5E5E5] p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${config.color} border-none`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  <span className="text-sm text-[#666666]">{statusTasks.length}</span>
                </div>
              </div>
              
              <div className="space-y-2 min-h-[200px]">
                {statusTasks.length === 0 ? (
                  <p className="text-sm text-[#666666] text-center py-8">Aucune tâche</p>
                ) : (
                  statusTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Overdue Tasks Section */}
      {tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-700">Tâches en retard ({tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasks
              .filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done")
              .map(task => <TaskCard key={`overdue-${task.id}`} task={task} />)
            }
          </div>
        </div>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">
              {editingTask ? "Modifier la tâche" : "Nouvelle tâche"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Titre de la tâche"
                required
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description détaillée..."
                rows={3}
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Priorité</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Catégorie</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#1A1A1A]">Date d'échéance</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="bg-[#F8F8F8] border-[#E5E5E5]"
              />
            </div>

            {/* Contact associé (facultatif) */}
            <div className="space-y-2">
              <Label className="text-[#1A1A1A] flex items-center gap-1">
                <User className="w-3 h-3" />
                Contact associé (facultatif)
              </Label>
              <Select 
                value={formData.contact_id || "none"} 
                onValueChange={(v) => setFormData({...formData, contact_id: v === "none" ? "" : v})}
              >
                <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                  <SelectValue placeholder="Aucun contact" />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  <SelectItem value="none">— Aucun contact —</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.company && <span className="text-[#666666] ml-1">({contact.company})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {editingTask && (
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Statut</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-[#CE0202] hover:bg-[#B00202] text-white">
                {editingTask ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
