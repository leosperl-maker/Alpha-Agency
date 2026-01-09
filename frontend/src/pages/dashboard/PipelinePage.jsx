import { useState, useEffect, useRef } from "react";
import { 
  Plus, Euro, Calendar, User, MoreVertical, Trash2, Archive, Edit, 
  Settings2, GripVertical, Phone, Mail, Clock, AlertCircle, 
  TrendingUp, Filter, Search, ChevronDown, Eye, CalendarClock,
  Target, DollarSign, Users, BarChart3, X, MessageSquare, FileText
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "../../components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { dashboardAPI, opportunitiesAPI, contactsAPI, pipelineColumnsAPI } from "../../lib/api";
import { toast } from "sonner";

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

// Pipeline Stats Component
const PipelineStats = ({ pipeline, columns }) => {
  const totalValue = columns.reduce((sum, col) => {
    const colOpps = pipeline[col.id] || [];
    return sum + colOpps.reduce((s, o) => s + (o.amount || 0), 0);
  }, 0);
  
  const totalDeals = columns.reduce((sum, col) => sum + (pipeline[col.id]?.length || 0), 0);
  const wonDeals = (pipeline['gagne'] || []).length;
  const lostDeals = (pipeline['perdu'] || []).length;
  const conversionRate = totalDeals > 0 ? Math.round((wonDeals / (wonDeals + lostDeals || 1)) * 100) : 0;
  
  const avgDealValue = totalDeals > 0 ? totalValue / totalDeals : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-white border-[#E5E5E5]">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-[#666666]">Valeur pipeline</p>
              <p className="text-lg font-bold text-[#1A1A1A]">{totalValue.toLocaleString()}€</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-[#E5E5E5]">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-[#666666]">Affaires actives</p>
              <p className="text-lg font-bold text-[#1A1A1A]">{totalDeals}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-[#E5E5E5]">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-[#666666]">Taux conversion</p>
              <p className="text-lg font-bold text-[#1A1A1A]">{conversionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-[#E5E5E5]">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-[#666666]">Valeur moyenne</p>
              <p className="text-lg font-bold text-[#1A1A1A]">{Math.round(avgDealValue).toLocaleString()}€</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Sortable Deal Card Component
const SortableDealCard = ({ opp, columns, onEdit, onArchive, onUnarchive, onDelete, onStatusChange, onViewDetails }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: opp.id,
    data: { type: 'card', opp }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const isOverdue = opp.expected_close_date && new Date(opp.expected_close_date) < new Date() && !['gagne', 'perdu'].includes(opp.status);
  const daysUntilClose = opp.expected_close_date 
    ? Math.ceil((new Date(opp.expected_close_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`opportunity-${opp.id}`}
      className={`bg-white rounded-lg border transition-all hover:shadow-md ${
        isDragging ? 'shadow-xl ring-2 ring-[#CE0202]' : ''
      } ${
        opp.archived ? 'opacity-60 border-[#E5E5E5]' : 
        isOverdue ? 'border-red-300 bg-red-50/50' : 'border-[#E5E5E5]'
      }`}
    >
      {/* Card Header with Drag Handle */}
      <div className="p-3 border-b border-[#E5E5E5]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Drag Handle */}
            <div 
              {...attributes}
              {...listeners}
              className="drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 mt-0.5 hover:bg-[#F8F8F8] rounded flex-shrink-0"
              data-testid={`drag-handle-${opp.id}`}
            >
              <GripVertical className="w-4 h-4 text-[#999999]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[#1A1A1A] font-semibold text-sm truncate">{opp.title}</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <User className="w-3 h-3 text-[#666666]" />
                <span className="text-xs text-[#666666] truncate">
                  {opp.contact?.first_name} {opp.contact?.last_name}
                </span>
                {opp.contact?.company && (
                  <span className="text-xs text-[#999999]">• {opp.contact?.company}</span>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mr-1 -mt-1" data-testid={`opp-menu-${opp.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border-[#E5E5E5]" align="end">
              <DropdownMenuItem onClick={() => onEdit(opp)} data-testid={`opp-edit-${opp.id}`}>
                <Edit className="w-4 h-4 mr-2" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewDetails(opp)} data-testid={`opp-view-${opp.id}`}>
                <Eye className="w-4 h-4 mr-2" /> Voir détails
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {opp.archived ? (
                <DropdownMenuItem onClick={() => onUnarchive(opp.id)} data-testid={`opp-restore-${opp.id}`}>
                  <Archive className="w-4 h-4 mr-2" /> Restaurer
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onArchive(opp.id)} data-testid={`opp-archive-${opp.id}`}>
                  <Archive className="w-4 h-4 mr-2" /> Archiver
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(opp.id)} className="text-red-600" data-testid={`opp-delete-${opp.id}`}>
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3">
        {/* Amount and Probability */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#CE0202] font-bold text-lg">
            {opp.amount?.toLocaleString()}€
          </span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#CE0202] rounded-full transition-all"
                style={{ width: `${opp.probability || 0}%` }}
              />
            </div>
            <span className="text-xs text-[#666666] font-medium">{opp.probability}%</span>
          </div>
        </div>

        {/* Tags / Info */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {opp.offer_type && (
            <Badge variant="outline" className="text-xs bg-[#F8F8F8] border-[#E5E5E5]">
              {opp.offer_type === 'site_web' ? 'Site Web' : 
               opp.offer_type === 'cm' ? 'CM' :
               opp.offer_type === 'photo' ? 'Photo' :
               opp.offer_type === 'video' ? 'Vidéo' :
               opp.offer_type === 'ads' ? 'Ads' :
               opp.offer_type === 'pack_360' ? 'Pack 360°' : opp.offer_type}
            </Badge>
          )}
          {isOverdue && (
            <Badge className="text-xs bg-red-100 text-red-700 border-red-200">
              <AlertCircle className="w-3 h-3 mr-1" /> En retard
            </Badge>
          )}
        </div>

        {/* Date and Next Action */}
        <div className="space-y-2">
          {opp.expected_close_date && (
            <div className={`flex items-center gap-2 text-xs ${isOverdue ? 'text-red-600' : 'text-[#666666]'}`}>
              <CalendarClock className="w-3.5 h-3.5" />
              <span>
                {new Date(opp.expected_close_date).toLocaleDateString('fr-FR')}
                {daysUntilClose !== null && !isOverdue && daysUntilClose <= 7 && (
                  <span className="ml-1 text-orange-600">({daysUntilClose}j)</span>
                )}
              </span>
            </div>
          )}
          
          {opp.next_action && (
            <div className="flex items-center gap-2 text-xs text-[#666666]">
              <Clock className="w-3.5 h-3.5" />
              <span className="truncate">{opp.next_action}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Droppable Column Component
const DroppableColumn = ({ column, children, onEdit, onDelete, oppsCount, totalAmount, opportunities }) => {
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

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      style={style}
      data-testid={`pipeline-column-${column.id}`}
      className={`flex-shrink-0 w-[300px] md:w-80 ${isOver ? 'ring-2 ring-[#CE0202] ring-opacity-50' : ''}`}
    >
      <div className={`bg-white rounded-xl border shadow-sm h-full transition-all ${
        isOver ? 'border-[#CE0202] bg-[#CE0202]/5' : 'border-[#E5E5E5]'
      }`}>
        <div className="p-4 border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-[#F8F8F8] rounded"
              >
                <GripVertical className="w-4 h-4 text-[#666666]" />
              </button>
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <span className="text-[#1A1A1A] text-sm font-semibold">
                {column.label}
              </span>
              <Badge variant="secondary" className="bg-[#F8F8F8] text-[#666666] text-xs">
                {oppsCount}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-4 h-4 text-[#666666]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border-[#E5E5E5]">
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
          <div className="flex items-center justify-between mt-2">
            <span className="text-[#CE0202] font-bold text-lg">
              {totalAmount.toLocaleString()}€
            </span>
          </div>
        </div>
        <div className="p-3 space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto">
          <SortableContext 
            items={opportunities.map(o => o.id)} 
            strategy={verticalListSortingStrategy}
          >
            {children}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};

// Opportunity Detail Sheet Component
const OpportunityDetailSheet = ({ opp, open, onOpenChange, columns, onEdit, contacts }) => {
  if (!opp) return null;
  
  const isOverdue = opp.expected_close_date && new Date(opp.expected_close_date) < new Date() && !['gagne', 'perdu'].includes(opp.status);
  const contact = opp.contact || contacts?.find(c => c.id === opp.contact_id);
  const column = columns.find(c => c.id === opp.status);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-white w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-[#E5E5E5]">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl text-[#1A1A1A]">{opp.title}</SheetTitle>
              <p className="text-sm text-[#666666] mt-1">{contact?.first_name} {contact?.last_name}</p>
            </div>
            <Badge 
              className="text-xs"
              style={{ backgroundColor: `${column?.color}20`, color: column?.color, border: `1px solid ${column?.color}40` }}
            >
              {column?.label || opp.status}
            </Badge>
          </div>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Amount */}
          <div className="bg-[#F8F8F8] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#666666] uppercase">Montant</p>
                <p className="text-2xl font-bold text-[#CE0202]">{opp.amount?.toLocaleString()}€</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#666666] uppercase">Probabilité</p>
                <p className="text-xl font-bold text-[#1A1A1A]">{opp.probability}%</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#CE0202] rounded-full transition-all"
                style={{ width: `${opp.probability || 0}%` }}
              />
            </div>
          </div>

          {/* Contact Info */}
          {contact && (
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Contact
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[#666666]">
                  <User className="w-4 h-4" />
                  <span>{contact.first_name} {contact.last_name}</span>
                </div>
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-[#666666] hover:text-[#CE0202]">
                    <Mail className="w-4 h-4" />
                    <span>{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-[#666666] hover:text-[#CE0202]">
                    <Phone className="w-4 h-4" />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-[#666666]">
                    <FileText className="w-4 h-4" />
                    <span>{contact.company}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Détails
            </h3>
            <div className="space-y-3 text-sm">
              {opp.offer_type && (
                <div className="flex justify-between">
                  <span className="text-[#666666]">Type d'offre</span>
                  <Badge variant="outline" className="bg-[#F8F8F8]">
                    {opp.offer_type === 'site_web' ? 'Site Web' : 
                     opp.offer_type === 'cm' ? 'CM' :
                     opp.offer_type === 'photo' ? 'Photo' :
                     opp.offer_type === 'video' ? 'Vidéo' :
                     opp.offer_type === 'ads' ? 'Ads' :
                     opp.offer_type === 'pack_360' ? 'Pack 360°' : opp.offer_type}
                  </Badge>
                </div>
              )}
              {opp.expected_close_date && (
                <div className="flex justify-between">
                  <span className="text-[#666666]">Date de clôture prévue</span>
                  <span className={isOverdue ? 'text-red-600 font-medium' : 'text-[#1A1A1A]'}>
                    {new Date(opp.expected_close_date).toLocaleDateString('fr-FR')}
                    {isOverdue && <AlertCircle className="inline w-3 h-3 ml-1" />}
                  </span>
                </div>
              )}
              {opp.created_at && (
                <div className="flex justify-between">
                  <span className="text-[#666666]">Créée le</span>
                  <span className="text-[#1A1A1A]">
                    {new Date(opp.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Next Action */}
          {opp.next_action && (
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Prochaine action
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                {opp.next_action}
              </div>
            </div>
          )}

          {/* Notes */}
          {opp.notes && (
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Notes
              </h3>
              <div className="bg-[#F8F8F8] rounded-lg p-3 text-sm text-[#666666] whitespace-pre-wrap">
                {opp.notes}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[#E5E5E5] flex gap-3">
          <Button
            onClick={() => { onOpenChange(false); onEdit(opp); }}
            className="flex-1 bg-[#CE0202] hover:bg-[#B00202] text-white"
          >
            <Edit className="w-4 h-4 mr-2" /> Modifier
          </Button>
          {contact?.email && (
            <Button
              variant="outline"
              onClick={() => window.location.href = `mailto:${contact.email}`}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" /> Email
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const PipelinePage = () => {
  const [pipeline, setPipeline] = useState({});
  const [contacts, setContacts] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [columnForm, setColumnForm] = useState({ id: "", label: "", color: "#3B82F6" });
  const [activeId, setActiveId] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const scrollContainerRef = useRef(null);
  
  const [formData, setFormData] = useState({
    contact_id: "",
    title: "",
    amount: "",
    probability: 50,
    status: "nouveau",
    offer_type: "",
    expected_close_date: "",
    next_action: "",
    notes: ""
  });

  const columnColors = [
    "#3B82F6", "#8B5CF6", "#06B6D4", "#F59E0B", "#EC4899",
    "#10B981", "#EF4444", "#F97316", "#84CC16", "#6366F1"
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = async () => {
    try {
      const [pipelineRes, contactsRes, columnsRes] = await Promise.all([
        dashboardAPI.getPipeline(),
        contactsAPI.getAll(),
        pipelineColumnsAPI.getAll()
      ]);
      setPipeline(pipelineRes.data);
      setContacts(contactsRes.data);
      setColumns(columnsRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Find which column contains an opportunity
  const findColumnForOpp = (oppId) => {
    for (const [columnId, opps] of Object.entries(pipeline)) {
      if (opps.some(o => o.id === oppId)) {
        return columnId;
      }
    }
    return null;
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Check if it's a card or column
    if (active.data.current?.type === 'card') {
      setActiveItem(active.data.current.opp);
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
        setColumns(newColumns);

        try {
          await pipelineColumnsAPI.reorder(newColumns.map(col => col.id));
          toast.success("Ordre mis à jour");
        } catch (error) {
          toast.error("Erreur");
          fetchData();
        }
      }
      return;
    }

    // Handle card movement
    if (activeData?.type === 'card') {
      const oppId = active.id;
      let targetColumnId = null;

      // Determine target column
      if (overData?.type === 'column') {
        targetColumnId = overData.columnId?.replace('column-', '') || over.id.replace('column-', '');
      } else if (overData?.type === 'card') {
        // Dropped on another card - find its column
        targetColumnId = findColumnForOpp(over.id);
      } else {
        // Check if over.id is a column ID
        targetColumnId = over.id.startsWith('column-') ? over.id.replace('column-', '') : null;
      }

      if (!targetColumnId) return;

      const sourceColumnId = findColumnForOpp(oppId);
      
      if (sourceColumnId && targetColumnId && sourceColumnId !== targetColumnId) {
        // Move card to different column
        try {
          await opportunitiesAPI.update(oppId, { status: targetColumnId });
          toast.success("Affaire déplacée");
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
      const data = { ...formData, amount: parseFloat(formData.amount) };
      
      if (editingOpp) {
        await opportunitiesAPI.update(editingOpp.id, data);
        toast.success("Affaire mise à jour");
      } else {
        await opportunitiesAPI.create(data);
        toast.success("Affaire créée");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleStatusChange = async (oppId, newStatus) => {
    try {
      await opportunitiesAPI.update(oppId, { status: newStatus });
      toast.success("Statut mis à jour");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (oppId) => {
    if (!window.confirm("Supprimer cette affaire ?")) return;
    try {
      await opportunitiesAPI.delete(oppId);
      toast.success("Affaire supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleArchive = async (oppId) => {
    try {
      await opportunitiesAPI.update(oppId, { archived: true });
      toast.success("Affaire archivée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleUnarchive = async (oppId) => {
    try {
      await opportunitiesAPI.update(oppId, { archived: false });
      toast.success("Affaire restaurée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const openEditDialog = (opp) => {
    setEditingOpp(opp);
    setFormData({
      contact_id: opp.contact_id || "",
      title: opp.title,
      amount: opp.amount?.toString() || "",
      probability: opp.probability || 50,
      status: opp.status,
      offer_type: opp.offer_type || "",
      expected_close_date: opp.expected_close_date || "",
      next_action: opp.next_action || "",
      notes: opp.notes || ""
    });
    setDialogOpen(true);
  };

  const openViewDetails = (opp) => {
    setSelectedOpp(opp);
    setDetailSheetOpen(true);
  };

  const resetForm = () => {
    setFormData({
      contact_id: "",
      title: "",
      amount: "",
      probability: 50,
      status: columns.length > 0 ? columns[0].id : "nouveau",
      offer_type: "",
      expected_close_date: "",
      next_action: "",
      notes: ""
    });
    setEditingOpp(null);
  };

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

  const handleSaveColumn = async () => {
    if (!columnForm.label.trim()) {
      toast.error("Nom requis");
      return;
    }
    try {
      if (editingColumn) {
        await pipelineColumnsAPI.update(editingColumn.id, {
          label: columnForm.label,
          color: columnForm.color
        });
        toast.success("Étape mise à jour");
      } else {
        const columnId = columnForm.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
        await pipelineColumnsAPI.create({ id: columnId, label: columnForm.label, color: columnForm.color });
        toast.success("Étape créée");
      }
      setColumnDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    }
  };

  const handleDeleteColumn = async (columnId) => {
    const column = columns.find(c => c.id === columnId);
    if (!window.confirm(`Supprimer "${column?.label}" ?`)) return;
    try {
      await pipelineColumnsAPI.delete(columnId);
      toast.success("Étape supprimée");
      fetchData();
    } catch (error) {
      toast.error("Erreur");
    }
  };

  // Filter opportunities
  const filterOpportunities = (opps) => {
    return opps.filter(opp => {
      if (!showArchived && opp.archived) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = opp.title?.toLowerCase().includes(query);
        const matchesContact = `${opp.contact?.first_name} ${opp.contact?.last_name}`.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContact) return false;
      }
      return true;
    });
  };

  return (
    <div data-testid="pipeline-page" className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Pipeline</h1>
            <p className="text-[#666666] text-xs sm:text-sm">Gérez vos affaires commerciales</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => openColumnDialog()} className="border-[#CE0202] text-[#CE0202] flex-1 sm:flex-none text-sm">
              <Settings2 className="w-4 h-4 mr-1 sm:mr-2" /> 
              <span className="hidden sm:inline">Étapes</span>
              <span className="sm:hidden">Config</span>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-[#CE0202] hover:bg-[#B00202] text-white flex-1 sm:flex-none text-sm">
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" /> 
                  <span className="hidden sm:inline">Nouvelle affaire</span>
                  <span className="sm:hidden">Ajouter</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-white border-[#E5E5E5] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#1A1A1A]">
                  {editingOpp ? "Modifier l'affaire" : "Nouvelle affaire"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Contact *</Label>
                  <Select value={formData.contact_id} onValueChange={(v) => setFormData({...formData, contact_id: v})} required>
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required placeholder="Ex: Site web vitrine" className="bg-[#F8F8F8] border-[#E5E5E5]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Montant (€) *</Label>
                    <Input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required placeholder="1000" className="bg-[#F8F8F8] border-[#E5E5E5]" />
                  </div>
                  <div className="space-y-2">
                    <Label>Probabilité (%)</Label>
                    <Input type="number" min="0" max="100" value={formData.probability} onChange={(e) => setFormData({...formData, probability: parseInt(e.target.value) || 0})} className="bg-[#F8F8F8] border-[#E5E5E5]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type d'offre</Label>
                    <Select value={formData.offer_type} onValueChange={(v) => setFormData({...formData, offer_type: v})}>
                      <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="site_web">Site Web</SelectItem>
                        <SelectItem value="cm">Community Management</SelectItem>
                        <SelectItem value="photo">Photographie</SelectItem>
                        <SelectItem value="video">Vidéographie</SelectItem>
                        <SelectItem value="ads">Publicité Digitale</SelectItem>
                        <SelectItem value="pack_360">Pack 360°</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date de clôture</Label>
                    <Input type="date" value={formData.expected_close_date} onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})} className="bg-[#F8F8F8] border-[#E5E5E5]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="bg-[#F8F8F8] border-[#E5E5E5]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {columns.map((col) => (
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
                  <Label>Prochaine action</Label>
                  <Input value={formData.next_action} onChange={(e) => setFormData({...formData, next_action: e.target.value})} placeholder="Ex: Appeler pour suivi" className="bg-[#F8F8F8] border-[#E5E5E5]" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="bg-[#F8F8F8] border-[#E5E5E5]" rows={2} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Annuler</Button>
                  <Button type="submit" className="bg-[#CE0202] hover:bg-[#B00202] text-white">{editingOpp ? "Mettre à jour" : "Créer"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {!loading && <PipelineStats pipeline={pipeline} columns={columns} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une affaire..."
            className="pl-9 bg-white border-[#E5E5E5]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className={`${showArchived ? "bg-[#F8F8F8]" : ""} w-full sm:w-auto`}
        >
          <Archive className="w-4 h-4 mr-2" />
          {showArchived ? "Masquer archivées" : "Voir archivées"}
        </Button>
      </div>

      {/* Pipeline Board - Scrollable horizontally */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1,2,3,4,5,6,7].map((i) => (
            <div key={i} className="flex-shrink-0 w-80">
              <div className="h-96 bg-[#E5E5E5] animate-pulse rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div 
              ref={scrollContainerRef}
              className="pipeline-scroll -mx-6 px-6"
              style={{ WebkitOverflowScrolling: 'touch' }}
              data-pipeline-scroll="true"
            >
              <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-4" style={{ width: 'fit-content', minWidth: '100%' }}>
                  {columns.map((column) => {
                    const columnOpps = filterOpportunities(pipeline[column.id] || []);
                    const totalAmount = columnOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
                    
                    return (
                      <DroppableColumn
                        key={column.id}
                        column={column}
                        onEdit={openColumnDialog}
                        onDelete={handleDeleteColumn}
                        oppsCount={columnOpps.length}
                        totalAmount={totalAmount}
                        opportunities={columnOpps}
                      >
                        {columnOpps.map((opp) => (
                          <SortableDealCard
                            key={opp.id}
                            opp={opp}
                            columns={columns}
                            onEdit={openEditDialog}
                            onArchive={handleArchive}
                            onUnarchive={handleUnarchive}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                            onViewDetails={openViewDetails}
                          />
                        ))}
                        {columnOpps.length === 0 && (
                          <div className="text-center py-8 text-[#666666]">
                            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Aucune affaire</p>
                          </div>
                        )}
                      </DroppableColumn>
                    );
                  })}
                </div>
              </SortableContext>
            </div>
          
            <DragOverlay>
              {activeItem && activeId && (
                <div className="opacity-90">
                  {activeItem.label ? (
                    <div className="w-80 bg-white rounded-xl border-2 border-[#CE0202] shadow-xl p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeItem.color }} />
                        <span className="text-[#1A1A1A] text-sm font-semibold">{activeItem.label}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-72 bg-white rounded-lg border-2 border-[#CE0202] shadow-xl p-3">
                      <h4 className="text-[#1A1A1A] font-semibold text-sm truncate">{activeItem.title}</h4>
                      <p className="text-[#CE0202] font-bold mt-2">{activeItem.amount?.toLocaleString()}€</p>
                    </div>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        
          <div className="mt-4 -mx-6 px-6">
            <div className="relative h-3 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div 
                id="pipeline-custom-scrollbar"
                className="absolute h-full w-[30%] bg-gradient-to-r from-[#CE0202] to-[#B00202] rounded-full cursor-pointer"
                style={{ marginLeft: '0%' }}
              />
            </div>
            <p className="text-xs text-[#999999] text-center mt-1">
              ← Faites défiler horizontalement pour voir toutes les colonnes →
            </p>
          </div>
        </div>
      )}

      {/* Column Dialog */}
      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-md">
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Modifier l'étape" : "Nouvelle étape"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={columnForm.label} onChange={(e) => setColumnForm({...columnForm, label: e.target.value})} placeholder="Ex: Négociation" className="bg-[#F8F8F8] border-[#E5E5E5]" />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {columnColors.map(color => (
                  <button key={color} type="button" onClick={() => setColumnForm({...columnForm, color})} className={`w-8 h-8 rounded-full border-2 transition-all ${columnForm.color === color ? 'border-[#1A1A1A] scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="p-4 bg-[#F8F8F8] rounded-lg">
              <p className="text-xs text-[#666666] mb-2">Aperçu</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: columnForm.color }} />
                <span className="text-sm font-medium">{columnForm.label || "Nom de l'étape"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveColumn} className="bg-[#CE0202] hover:bg-[#B00202] text-white">{editingColumn ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opportunity Detail Sheet */}
      <OpportunityDetailSheet
        opp={selectedOpp}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        columns={columns}
        onEdit={openEditDialog}
        contacts={contacts}
      />
    </div>
  );
};

export default PipelinePage;
