import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Target, TrendingUp, Trophy, Loader2, MoreHorizontal,
  Pencil, Archive, Trash2, User, CalendarClock, AlertTriangle, GripVertical,
} from "lucide-react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Label } from "../../components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { opportunitiesAPI, contactsAPI } from "../../lib/api";
import { toast } from "sonner";

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const CLOSED_STAGES = ["gagne", "perdu"];
const STAGNANT_DAYS = 14; // au-delà : le deal "stagne" (badge + signal Néo)

const daysSince = (iso) => {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d)) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const emptyForm = {
  title: "", contact_id: "", amount: "", stage: "nouveau",
  expected_close_date: "", notes: "", source: "",
};

// ==================== Carte deal (draggable) ====================

const DealCard = ({ opp, contactName, stage, onEdit, onArchive, onDelete, dragging }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opp.id,
    data: { opp },
  });
  const stagnant = !CLOSED_STAGES.includes(opp.stage) && daysSince(opp.updated_at) >= STAGNANT_DAYS;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`group rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-30" : ""
      } ${dragging ? "shadow-xl ring-2 ring-primary/40 rotate-2" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          className="mt-0.5 -ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          aria-label={`Déplacer ${opp.title}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{opp.title}</p>
          {contactName && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" /> {contactName}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {opp.amount > 0 && (
              <span className="text-sm font-semibold tabular-nums text-foreground">{EUR.format(opp.amount)}</span>
            )}
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
              {stage?.probability ?? opp.probability ?? 0}%
            </Badge>
            {stagnant && (
              <Badge className="h-5 gap-1 bg-warning-soft px-1.5 text-[10px] text-warning">
                <AlertTriangle className="h-3 w-3" /> {daysSince(opp.updated_at)}j
              </Badge>
            )}
            {opp.expected_close_date && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {new Date(opp.expected_close_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>
        </div>
        {!dragging && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                aria-label="Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(opp)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(opp)}>
                <Archive className="mr-2 h-4 w-4" /> Archiver
              </DropdownMenuItem>
              <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => onDelete(opp)}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

// ==================== Colonne (droppable) ====================

const StageColumn = ({ stage, opps, contactsById, onEdit, onArchive, onDelete }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { stage } });
  const subtotal = opps.reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="flex w-[280px] flex-shrink-0 snap-start flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: stage.color }} />
        <h3 className="truncate text-sm font-semibold text-foreground">{stage.label}</h3>
        <span className="text-xs tabular-nums text-muted-foreground">{opps.length}</span>
        {subtotal > 0 && (
          <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">{EUR.format(subtotal)}</span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-2xl border p-2 transition-colors ${
          isOver ? "border-primary/50 bg-primary/5" : "border-transparent bg-secondary/40"
        }`}
      >
        <AnimatePresence initial={false}>
          {opps.map((opp) => (
            <motion.div
              key={opp.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
            >
              <DealCard
                opp={opp}
                stage={stage}
                contactName={contactsById[opp.contact_id]}
                onEdit={onEdit}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {opps.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/60 py-6 text-xs text-muted-foreground/60">
            Déposer un deal ici
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== KPI ====================

const Kpi = ({ icon: Icon, label, value, tone = "text-foreground" }) => (
  <div className="kpi-card flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
    <div className="rounded-xl bg-secondary p-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`truncate text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  </div>
);

// ==================== Page ====================

const PipelinePage = () => {
  const [stages, setStages] = useState([]);
  const [opps, setOpps] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeOpp, setActiveOpp] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const fetchAll = useCallback(async () => {
    try {
      const [cfg, list, cts] = await Promise.all([
        opportunitiesAPI.getPipelineConfig(),
        opportunitiesAPI.getAll(),
        contactsAPI.getAll(),
      ]);
      setStages(cfg.data?.stages || []);
      setOpps(Array.isArray(list.data) ? list.data : []);
      setContacts(Array.isArray(cts.data) ? cts.data : []);
    } catch (e) {
      toast.error("Erreur lors du chargement du pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const contactsById = useMemo(() => {
    const m = {};
    for (const c of contacts) {
      m[c.id] = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company || c.email;
    }
    return m;
  }, [contacts]);

  const byStage = useMemo(() => {
    const m = Object.fromEntries(stages.map((s) => [s.id, []]));
    for (const o of opps) {
      (m[o.stage] || (m[o.stage] = [])).push(o);
    }
    return m;
  }, [stages, opps]);

  const kpis = useMemo(() => {
    const open = opps.filter((o) => !CLOSED_STAGES.includes(o.stage));
    const stageProb = Object.fromEntries(stages.map((s) => [s.id, s.probability ?? 0]));
    const total = open.reduce((s, o) => s + (o.amount || 0), 0);
    const weighted = open.reduce((s, o) => s + (o.amount || 0) * ((stageProb[o.stage] ?? o.probability ?? 0) / 100), 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const wonThisMonth = opps
      .filter((o) => o.stage === "gagne" && new Date(o.updated_at) >= monthStart)
      .reduce((s, o) => s + (o.amount || 0), 0);
    return { total, weighted, wonThisMonth, openCount: open.length };
  }, [opps, stages]);

  // ---------- Drag & drop ----------
  const onDragStart = (e) => setActiveOpp(e.active.data.current?.opp || null);

  const onDragEnd = async (e) => {
    setActiveOpp(null);
    const opp = e.active.data.current?.opp;
    const targetStage = e.over?.data?.current?.stage;
    if (!opp || !targetStage || opp.stage === targetStage.id) return;

    const prev = opps;
    const probability = targetStage.probability ?? opp.probability ?? 0;
    // Optimiste : on bouge tout de suite, on annule si le serveur refuse.
    setOpps((cur) => cur.map((o) =>
      o.id === opp.id ? { ...o, stage: targetStage.id, probability, updated_at: new Date().toISOString() } : o
    ));
    try {
      await opportunitiesAPI.update(opp.id, { stage: targetStage.id, probability });
      if (targetStage.id === "gagne") toast.success(`Deal gagné : ${opp.title} 🎉`);
      else if (targetStage.id === "perdu") toast(`Deal perdu : ${opp.title}`);
    } catch (err) {
      setOpps(prev);
      toast.error("Déplacement refusé par le serveur");
    }
  };

  // ---------- CRUD ----------
  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (opp) => {
    setEditing(opp);
    setForm({
      title: opp.title || "", contact_id: opp.contact_id || "", amount: opp.amount ?? "",
      stage: opp.stage || "nouveau", expected_close_date: (opp.expected_close_date || "").slice(0, 10),
      notes: opp.notes || "", source: opp.source || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Un titre est requis"); return; }
    setSaving(true);
    const payload = {
      ...form,
      amount: form.amount === "" ? 0 : Number(form.amount),
      contact_id: form.contact_id || null,
      expected_close_date: form.expected_close_date || null,
      probability: stages.find((s) => s.id === form.stage)?.probability,
    };
    try {
      if (editing) {
        await opportunitiesAPI.update(editing.id, payload);
        toast.success("Deal mis à jour");
      } else {
        await opportunitiesAPI.create(payload);
        toast.success("Deal créé");
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (opp) => {
    try {
      await opportunitiesAPI.update(opp.id, { archived: true });
      setOpps((cur) => cur.filter((o) => o.id !== opp.id));
      toast.success("Deal archivé");
    } catch { toast.error("Erreur lors de l'archivage"); }
  };

  const handleDelete = async (opp) => {
    if (!window.confirm(`Supprimer définitivement « ${opp.title} » ? (préférer Archiver)`)) return;
    try {
      await opportunitiesAPI.delete(opp.id);
      setOpps((cur) => cur.filter((o) => o.id !== opp.id));
      toast.success("Deal supprimé");
    } catch { toast.error("Erreur lors de la suppression"); }
  };

  // ---------- Rendu ----------
  if (loading) {
    return (
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-secondary/60" />)}
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => <div key={i} className="h-[420px] w-[280px] flex-shrink-0 animate-pulse rounded-2xl bg-secondary/60" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-1">
      {/* En-tête + KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Vos deals, de la prise de contact au closing.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nouveau deal
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Target} label="En cours" value={EUR.format(kpis.total)} />
        <Kpi icon={TrendingUp} label="Pondéré" value={EUR.format(kpis.weighted)} />
        <Kpi icon={Trophy} label="Gagné ce mois" value={EUR.format(kpis.wonThisMonth)} tone="text-success" />
        <Kpi icon={Loader2} label="Deals ouverts" value={kpis.openCount} />
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveOpp(null)}>
        <div className="-mx-1 flex flex-1 snap-x gap-3 overflow-x-auto px-1 pb-4">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              opps={byStage[stage.id] || []}
              contactsById={contactsById}
              onEdit={openEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeOpp ? (
            <DealCard
              opp={activeOpp}
              stage={stages.find((s) => s.id === activeOpp.stage)}
              contactName={contactsById[activeOpp.contact_id]}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le deal" : "Nouveau deal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="deal-title">Titre *</Label>
              <Input id="deal-title" value={form.title} placeholder="Site vitrine — Hôtel Karibea"
                     onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deal-amount">Montant (€ HT)</Label>
                <Input id="deal-amount" type="number" min="0" step="50" value={form.amount}
                       onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Étape</Label>
                <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Select value={form.contact_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, contact_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Associer un contact" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}{c.company ? ` · ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="deal-close">Clôture prévue</Label>
                <Input id="deal-close" type="date" value={form.expected_close_date}
                       onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deal-source">Source</Label>
                <Input id="deal-source" value={form.source} placeholder="Site, bouche-à-oreille…"
                       onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-notes">Notes</Label>
              <Textarea id="deal-notes" rows={3} value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Enregistrer" : "Créer le deal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelinePage;
