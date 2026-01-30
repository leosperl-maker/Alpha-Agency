import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, X, UserPlus, Receipt, FileText, CheckSquare, 
  FolderPlus, Calendar, Mail, Briefcase, Link2, Share2, Bot, Zap
} from "lucide-react";
import { Button } from "./ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { contactsAPI, invoicesAPI, tasksAPI, opportunitiesAPI } from "../lib/api";

const QuickActions = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Draggable state
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Form states
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [invoiceForm, setInvoiceForm] = useState({ client_name: "", amount: "", description: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium" });
  const [opportunityForm, setOpportunityForm] = useState({ name: "", amount: "", company: "" });

  const quickActions = [
    { id: "contact", icon: UserPlus, label: "Nouveau contact", color: "from-blue-500 to-cyan-500" },
    { id: "task", icon: CheckSquare, label: "Nouvelle tâche", color: "from-amber-500 to-orange-500" },
    { id: "invoice", icon: Receipt, label: "Nouvelle facture", color: "from-green-500 to-emerald-500" },
    { id: "opportunity", icon: Briefcase, label: "Nouvelle opportunité", color: "from-purple-500 to-pink-500" },
    { id: "multilink", icon: Link2, label: "Multilink", color: "from-indigo-500 to-violet-500", navigate: "/admin/multilink" },
    { id: "social", icon: Share2, label: "Publier", color: "from-pink-500 to-rose-500", navigate: "/admin/social-media" },
    { id: "assistant", icon: Bot, label: "Assistant IA", color: "from-cyan-500 to-teal-500", navigate: "/admin/assistant" },
  ];

  const handleAction = (action) => {
    if (action.navigate) {
      navigate(action.navigate);
      setIsOpen(false);
    } else {
      setActiveModal(action.id);
      setIsOpen(false);
    }
  };

  const resetForms = () => {
    setContactForm({ name: "", email: "", phone: "", company: "" });
    setInvoiceForm({ client_name: "", amount: "", description: "" });
    setTaskForm({ title: "", description: "", priority: "medium" });
    setOpportunityForm({ name: "", amount: "", company: "" });
  };

  // Drag handlers for touch and mouse
  const handleDragStart = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: position.x ?? window.innerWidth - rect.width - 24,
        posY: position.y ?? window.innerHeight - rect.height - 24
      };
    }
    setIsDragging(true);
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    
    const newX = Math.max(24, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
    const newY = Math.max(24, Math.min(window.innerHeight - 80, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Calculate button style
  const getButtonStyle = () => {
    if (position.x !== null && position.y !== null) {
      return { left: position.x, top: position.y, right: 'auto', bottom: 'auto' };
    }
    return {}; // Use CSS default positioning
  };

  const closeModal = () => {
    setActiveModal(null);
    resetForms();
  };

  // Create contact
  const createContact = async () => {
    if (!contactForm.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setLoading(true);
    try {
      await contactsAPI.create(contactForm);
      toast.success("Contact créé !");
      closeModal();
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  // Create invoice
  const createInvoice = async () => {
    if (!invoiceForm.client_name.trim() || !invoiceForm.amount) {
      toast.error("Le client et le montant sont requis");
      return;
    }
    setLoading(true);
    try {
      await invoicesAPI.create({
        client_name: invoiceForm.client_name,
        items: [{ description: invoiceForm.description || "Prestation", quantity: 1, unit_price: parseFloat(invoiceForm.amount) }],
        status: "draft"
      });
      toast.success("Facture créée !");
      closeModal();
      navigate("/admin/facturation");
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  // Create task
  const createTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    setLoading(true);
    try {
      await tasksAPI.create({
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        status: "todo"
      });
      toast.success("Tâche créée !");
      closeModal();
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  // Create opportunity
  const createOpportunity = async () => {
    if (!opportunityForm.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setLoading(true);
    try {
      await opportunitiesAPI.create({
        name: opportunityForm.name,
        amount: parseFloat(opportunityForm.amount) || 0,
        company: opportunityForm.company,
        status: "Nouveau"
      });
      toast.success("Opportunité créée !");
      closeModal();
      navigate("/admin/pipeline");
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div 
        className={`fixed ${position.x === null ? 'bottom-6 right-6' : ''} z-50`}
        style={getButtonStyle()}
      >
        <Button
          ref={dragRef}
          onClick={() => !isDragging && setIsOpen(!isOpen)}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className={`
            w-14 h-14 rounded-full shadow-lg transition-all duration-300 touch-none
            ${isOpen 
              ? "bg-white/10 backdrop-blur-xl rotate-45" 
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
            }
            ${isDragging ? 'scale-110 cursor-grabbing' : 'cursor-grab'}
          `}
          data-testid="quick-actions-button"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </Button>

        {/* Actions Menu */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div className="bg-black/90 backdrop-blur-2xl rounded-2xl border border-white/10 p-2 shadow-2xl min-w-[220px]">
              <p className="px-4 py-2 text-[10px] uppercase tracking-wider text-white/30 font-medium">
                Actions rapides
              </p>
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all"
                    style={{ animationDelay: `${index * 50}ms` }}
                    data-testid={`quick-action-${action.id}`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      <Dialog open={activeModal === "contact"} onOpenChange={() => closeModal()}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              Nouveau contact rapide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Jean Dupont"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="jean@example.com"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Entreprise</Label>
              <Input
                value={contactForm.company}
                onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Nom de l'entreprise"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} className="border-white/20">Annuler</Button>
            <Button onClick={createContact} disabled={loading} className="bg-indigo-600">
              {loading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      <Dialog open={activeModal === "invoice"} onOpenChange={() => closeModal()}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              Nouvelle facture rapide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Input
                value={invoiceForm.client_name}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Nom du client"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Montant HT *</Label>
              <Input
                type="number"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="1000"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la prestation"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} className="border-white/20">Annuler</Button>
            <Button onClick={createInvoice} disabled={loading} className="bg-indigo-600">
              {loading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={activeModal === "task"} onOpenChange={() => closeModal()}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              Nouvelle tâche rapide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titre de la tâche"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description optionnelle"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={taskForm.priority} onValueChange={(v) => setTaskForm(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10">
                  <SelectItem value="low" className="text-white">Basse</SelectItem>
                  <SelectItem value="medium" className="text-white">Moyenne</SelectItem>
                  <SelectItem value="high" className="text-white">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} className="border-white/20">Annuler</Button>
            <Button onClick={createTask} disabled={loading} className="bg-indigo-600">
              {loading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opportunity Modal */}
      <Dialog open={activeModal === "opportunity"} onOpenChange={() => closeModal()}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              Nouvelle opportunité rapide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={opportunityForm.name}
                onChange={(e) => setOpportunityForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nom de l'opportunité"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Montant estimé (€)</Label>
              <Input
                type="number"
                value={opportunityForm.amount}
                onChange={(e) => setOpportunityForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="5000"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label>Entreprise</Label>
              <Input
                value={opportunityForm.company}
                onChange={(e) => setOpportunityForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Nom de l'entreprise"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} className="border-white/20">Annuler</Button>
            <Button onClick={createOpportunity} disabled={loading} className="bg-indigo-600">
              {loading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickActions;
