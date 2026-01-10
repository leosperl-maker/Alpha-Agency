import { useState, useEffect } from "react";
import { 
  Plus, CheckCircle, Clock, AlertCircle, Calendar, MoreVertical, Trash2, Edit, 
  Flag, Search, User, GripVertical, Settings2, Target, Eye
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "../../components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "../../components/ui/select";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from "../../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { tasksAPI, contactsAPI } from "../../lib/api";

// Drag and drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Default task columns
const DEFAULT_TASK_COLUMNS = [
  { id: "todo", label: "À faire", color: "#6B7280" },
  { id: "in_progress", label: "En cours", color: "#3B82F6" },
  { id: "done", label: "Terminé", color: "#10B981" }
];

const priorityConfig = {
  low: { label: "Basse", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Moyenne", color: "bg-amber-500/20 text-amber-400" },
  high: { label: "Haute", color: "bg-orange-500/20 text-orange-400" },
  urgent: { label: "Urgente", color: "bg-red-500/20 text-red-400" }
};

const categories = [
  { value: "general", label: "Général" },
  { value: "client", label: "Client" },
  { value: "projet", label: "Projet" },
  { value: "admin", label: "Administratif" },
  { value: "marketing", label: "Marketing" },
  { value: "dev", label: "Développement" }
];

// Sortable Task Card Component
const SortableTaskCard = ({ task, onEdit, onDelete, onStatusChange, onViewDetails, contacts, columns }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    data: { type: 'task', task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const isOverdue = task.due_date && task.due_date !== "" && new Date(task.due_date) < new Date() && task.status !== "done";
  
  const getContactName = (contactId) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return null;
    return `${contact.first_name} ${contact.last_name}${contact.company ? ` (${contact.company})` : ''}`;
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-3 hover:shadow-md transition-all ${
        isDragging ? 'shadow-xl ring-2 ring-[#CE0202]' : ''
      } ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}
      data-testid={`task-${task.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <div 
            {...attributes}
            {...listeners}
            className="drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 mt-0.5 hover:bg-white/5 rounded flex-shrink-0"
            data-testid={`drag-handle-task-${task.id}`}
          >
            <GripVertical className="w-4 h-4 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-white text-sm ${task.status === 'done' ? 'line-through text-white/60' : ''}`}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-white/60 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`task-menu-${task.id}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a2e]" align="end">
            <DropdownMenuItem onClick={() => onEdit(task)} data-testid={`task-edit-${task.id}`}>
              <Edit className="w-4 h-4 mr-2" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewDetails(task)} data-testid={`task-view-${task.id}`}>
              <Eye className="w-4 h-4 mr-2" /> Voir détails
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {columns.filter(c => c.id !== task.status).map(col => (
              <DropdownMenuItem 
                key={col.id}
                onClick={() => onStatusChange(task.id, col.id)}
              >
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: col.color }} />
                {col.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600" data-testid={`task-delete-${task.id}`}>
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
          <Badge className={`${isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-gray-100 text-gray-600'} border-none text-xs`}>
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(task.due_date).toLocaleDateString('fr-FR')}
          </Badge>
        )}
      </div>
      {/* Contact associé */}
      {task.contact_id && getContactName(task.contact_id) && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-xs text-white/60 flex items-center gap-1">
            <User className="w-3 h-3" />
            {getContactName(task.contact_id)}
          </p>
        </div>
      )}
    </div>
  );
};

// Droppable Column Component
const DroppableTaskColumn = ({ column, children, onEdit, onDelete, tasksCount, tasks }) => {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({ 
    id: column.id,
    data: { type: 'column', column }
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', columnId: column.id }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColumnDragging ? 0.5 : 1,
  };

  const statusIcons = {
    todo: Clock,
    in_progress: Clock,
    done: CheckCircle
  };
  const StatusIcon = statusIcons[column.id] || Clock;

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      style={style}
      data-testid={`task-column-${column.id}`}
      className={`flex-shrink-0 w-full md:w-[340px] ${isOver ? 'ring-2 ring-[#CE0202] ring-opacity-50' : ''}`}
    >
      <div className={`bg-white/5 backdrop-blur-xl rounded-xl border shadow-sm h-full transition-all ${
        isOver ? 'border-indigo-500/50 bg-indigo-600/5' : 'border-white/10'
      }`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/5 rounded"
              >
                <GripVertical className="w-4 h-4 text-white/60" />
              </button>
              <div 
                className={`p-1.5 rounded-lg`}
                style={{ backgroundColor: `${column.color}20` }}
              >
                <StatusIcon className="w-4 h-4" style={{ color: column.color }} />
              </div>
              <span className="text-white text-sm font-semibold">
                {column.label}
              </span>
              <Badge variant="secondary" className="bg-white/5 text-white/60 text-xs">
                {tasksCount}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-4 h-4 text-white/60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                <DropdownMenuItem onClick={() => onEdit(column)}>
                  <Edit className="w-4 h-4 mr-2" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(column.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="p-3 space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto">
          <SortableContext 
            items={tasks.map(t => t.id)} 
            strategy={verticalListSortingStrategy}
          >
            {children}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};

// Task Detail Sheet Component
const TaskDetailSheet = ({ task, open, onOpenChange, onEdit, contacts, columns }) => {
  if (!task) return null;
  
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
  const contact = contacts?.find(c => c.id === task.contact_id);
  const column = columns.find(c => c.id === task.status);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-white/5 backdrop-blur-xl w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className={`text-xl text-white ${task.status === 'done' ? 'line-through' : ''}`}>
                {task.title}
              </SheetTitle>
            </div>
            <Badge 
              className="text-xs"
              style={{ backgroundColor: `${column?.color}20`, color: column?.color, border: `1px solid ${column?.color}40` }}
            >
              {column?.label || task.status}
            </Badge>
          </div>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Priority and Category */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`${priority.color} border-none`}>
              <Flag className="w-3 h-3 mr-1" />
              {priority.label}
            </Badge>
            {task.category && (
              <Badge variant="outline">
                {categories.find(c => c.value === task.category)?.label || task.category}
              </Badge>
            )}
            {isOverdue && (
              <Badge className="bg-red-500/20 text-red-400">
                <AlertCircle className="w-3 h-3 mr-1" /> En retard
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
              <p className="text-sm text-white/60 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-3">
              <Calendar className={`w-5 h-5 ${isOverdue ? 'text-red-500' : 'text-white/60'}`} />
              <div>
                <p className="text-xs text-white/60">Date d'échéance</p>
                <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-white'}`}>
                  {new Date(task.due_date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Contact */}
          {contact && (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-xs text-white/60">Contact associé</p>
                <p className="text-sm font-medium text-white">
                  {contact.first_name} {contact.last_name}
                  {contact.company && <span className="text-white/60"> • {contact.company}</span>}
                </p>
              </div>
            </div>
          )}

          {/* Created date */}
          {task.created_at && (
            <div className="text-xs text-white/60">
              Créée le {new Date(task.created_at).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10">
          <Button
            onClick={() => { onOpenChange(false); onEdit(task); }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [columns, setColumns] = useState(DEFAULT_TASK_COLUMNS);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [columnForm, setColumnForm] = useState({ id: "", label: "", color: "#3B82F6" });
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    category: "general",
    due_date: "",
    contact_id: ""
  });

  const columnColors = [
    "#6B7280", "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316"
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load saved columns from localStorage
  useEffect(() => {
    const savedColumns = localStorage.getItem('task_columns');
    if (savedColumns) {
      try {
        setColumns(JSON.parse(savedColumns));
      } catch (e) {
        setColumns(DEFAULT_TASK_COLUMNS);
      }
    }
  }, []);

  // Save columns to localStorage when they change
  const saveColumns = (newColumns) => {
    setColumns(newColumns);
    localStorage.setItem('task_columns', JSON.stringify(newColumns));
  };

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

  // Find which column contains a task
  const findColumnForTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status || null;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    if (active.data.current?.type === 'task') {
      setActiveItem(active.data.current.task);
    } else if (active.data.current?.type === 'column') {
      setActiveItem(active.data.current.column);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle column reordering
    if (activeData?.type === 'column' && columns.some(c => c.id === over.id)) {
      if (active.id !== over.id) {
        const oldIndex = columns.findIndex((col) => col.id === active.id);
        const newIndex = columns.findIndex((col) => col.id === over.id);
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        saveColumns(newColumns);
        toast.success("Ordre des colonnes mis à jour");
      }
      return;
    }

    // Handle task movement
    if (activeData?.type === 'task') {
      const taskId = active.id;
      let targetColumnId = null;

      if (overData?.type === 'column') {
        targetColumnId = overData.columnId?.replace('column-', '') || over.id.replace('column-', '');
      } else if (overData?.type === 'task') {
        targetColumnId = findColumnForTask(over.id);
      } else {
        targetColumnId = over.id.startsWith('column-') ? over.id.replace('column-', '') : null;
      }

      if (!targetColumnId) return;

      const sourceColumnId = findColumnForTask(taskId);
      
      if (sourceColumnId && targetColumnId && sourceColumnId !== targetColumnId) {
        try {
          await tasksAPI.update(taskId, { status: targetColumnId });
          toast.success("Tâche déplacée");
          fetchData();
        } catch (error) {
          toast.error("Erreur lors du déplacement");
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
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

  const openViewDetails = (task) => {
    setSelectedTask(task);
    setDetailSheetOpen(true);
  };

  // Column management
  const openColumnDialog = (column = null) => {
    if (column) {
      setEditingColumn(column);
      setColumnForm({ id: column.id, label: column.label, color: column.color });
    } else {
      setEditingColumn(null);
      setColumnForm({ id: "", label: "", color: "#3B82F6" });
    }
    setColumnDialogOpen(true);
  };

  const handleSaveColumn = () => {
    if (!columnForm.label.trim()) {
      toast.error("Nom requis");
      return;
    }

    let newColumns;
    if (editingColumn) {
      newColumns = columns.map(col => 
        col.id === editingColumn.id 
          ? { ...col, label: columnForm.label, color: columnForm.color }
          : col
      );
      toast.success("Colonne mise à jour");
    } else {
      const newId = columnForm.label.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      
      if (columns.some(c => c.id === newId)) {
        toast.error("Une colonne avec ce nom existe déjà");
        return;
      }
      
      newColumns = [...columns, { id: newId, label: columnForm.label, color: columnForm.color }];
      toast.success("Colonne créée");
    }
    
    saveColumns(newColumns);
    setColumnDialogOpen(false);
  };

  const handleDeleteColumn = (columnId) => {
    const column = columns.find(c => c.id === columnId);
    const tasksInColumn = tasks.filter(t => t.status === columnId);
    
    if (tasksInColumn.length > 0) {
      toast.error(`Impossible de supprimer: ${tasksInColumn.length} tâche(s) dans cette colonne`);
      return;
    }
    
    if (!window.confirm(`Supprimer la colonne "${column?.label}" ?`)) return;
    
    const newColumns = columns.filter(c => c.id !== columnId);
    saveColumns(newColumns);
    toast.success("Colonne supprimée");
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Group tasks by status
  const getTasksByColumn = (columnId) => {
    return filteredTasks.filter(t => t.status === columnId);
  };

  // Calculate overdue count
  const overdueCount = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  ).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-hidden" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Tâches</h1>
          <p className="text-white/60 text-xs sm:text-sm">Gérez vos tâches et projets</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => openColumnDialog()} 
            className="border-indigo-500/50 text-indigo-400 flex-1 sm:flex-none text-sm"
          >
            <Settings2 className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Colonnes</span>
            <span className="sm:hidden">Config</span>
          </Button>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1 sm:flex-none text-sm"
          >
            <Plus className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Nouvelle tâche</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gray-100 flex-shrink-0">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.todo || 0}</p>
                <p className="text-[10px] sm:text-xs text-white/60">À faire</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 flex-shrink-0">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.in_progress || 0}</p>
                <p className="text-[10px] sm:text-xs text-white/60">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-100 flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.done || 0}</p>
                <p className="text-[10px] sm:text-xs text-white/60">Terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-100 flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-white">{overdueCount}</p>
                <p className="text-[10px] sm:text-xs text-white/60">En retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 col-span-2 sm:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600/10 flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-white">{stats.completion_rate || 0}%</p>
                <p className="text-[10px] sm:text-xs text-white/60">Complétion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 bg-white/5 backdrop-blur-xl border-white/10 w-full"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-36 bg-white/5 backdrop-blur-xl border-white/10">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e]">
            <SelectItem value="all">Toutes</SelectItem>
            {Object.entries(priorityConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="-mx-3 sm:-mx-4 md:-mx-6">
          <div 
            className="overflow-x-auto pb-4 px-3 sm:px-4 md:px-6"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 sm:gap-4" style={{ width: 'fit-content' }}>
              {columns.map((column) => {
                const columnTasks = getTasksByColumn(column.id);
                
                return (
                  <DroppableTaskColumn
                    key={column.id}
                    column={column}
                    onEdit={openColumnDialog}
                    onDelete={handleDeleteColumn}
                    tasksCount={columnTasks.length}
                    tasks={columnTasks}
                  >
                    {columnTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onViewDetails={openViewDetails}
                        contacts={contacts}
                        columns={columns}
                      />
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-white/60">
                        <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Aucune tâche</p>
                      </div>
                    )}
                  </DroppableTaskColumn>
                );
              })}
            </div>
          </SortableContext>
        </div>
        </div>
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && activeId && (
            <div className="opacity-90">
              {activeItem.label ? (
                <div className="w-80 bg-white/5 backdrop-blur-xl rounded-xl border-2 border-indigo-500/50 shadow-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeItem.color }} />
                    <span className="text-white text-sm font-semibold">{activeItem.label}</span>
                  </div>
                </div>
              ) : (
                <div className="w-72 bg-white/5 backdrop-blur-xl rounded-lg border-2 border-indigo-500/50 shadow-xl p-3">
                  <p className="font-medium text-white text-sm">{activeItem.title}</p>
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTask ? "Modifier la tâche" : "Nouvelle tâche"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Titre de la tâche"
                required
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Description détaillée..."
                rows={3}
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Priorité</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e]">
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-white">Catégorie</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e]">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Statut</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e]">
                  {columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                        {col.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Date d'échéance</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white flex items-center gap-1">
                <User className="w-3 h-3" />
                Contact associé (facultatif)
              </Label>
              <Select 
                value={formData.contact_id || "none"} 
                onValueChange={(v) => setFormData({...formData, contact_id: v === "none" ? "" : v})}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Aucun contact" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] max-h-60">
                  <SelectItem value="none">— Aucun contact —</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.company && <span className="text-white/60 ml-1">({contact.company})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                {editingTask ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Column Dialog */}
      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Modifier la colonne" : "Nouvelle colonne"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input 
                value={columnForm.label} 
                onChange={(e) => setColumnForm({...columnForm, label: e.target.value})} 
                placeholder="Ex: En revue" 
                className="bg-white/5 border-white/10" 
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {columnColors.map(color => (
                  <button 
                    key={color} 
                    type="button" 
                    onClick={() => setColumnForm({...columnForm, color})} 
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      columnForm.color === color ? 'border-[#1A1A1A] scale-110' : 'border-transparent'
                    }`} 
                    style={{ backgroundColor: color }} 
                  />
                ))}
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-xs text-white/60 mb-2">Aperçu</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: columnForm.color }} />
                <span className="text-sm font-medium">{columnForm.label || "Nom de la colonne"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveColumn} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {editingColumn ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={openEditDialog}
        contacts={contacts}
        columns={columns}
      />
    </div>
  );
};

export default TasksPage;
