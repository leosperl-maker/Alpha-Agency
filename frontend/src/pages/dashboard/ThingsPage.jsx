import { useState, useEffect, useCallback } from "react";
import { 
  Plus, Check, Circle, Star, Calendar, Clock, Trash2, Archive,
  ChevronRight, Sun, Moon, Sparkles, Tag, MoreHorizontal, Edit2,
  CheckCircle2, X, RotateCcw, Filter, Search, CalendarDays
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu";
import { ScrollArea } from "../../components/ui/scroll-area";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Things-style todo app
const ThingsPage = () => {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState("today"); // today, upcoming, anytime, completed, logbook
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("alpha-things-todos");
    if (saved) {
      let loadedTodos = JSON.parse(saved);
      
      // REPORT AUTOMATIQUE: Reporter les tâches non terminées des jours passés à aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      loadedTodos = loadedTodos.map(todo => {
        // Si la tâche a une date passée, n'est pas terminée et n'est pas archivée
        if (todo.dueDate && todo.dueDate < today && !todo.completed && !todo.archived) {
          // Reporter à aujourd'hui
          return {
            ...todo,
            dueDate: today,
            rescheduledFrom: todo.dueDate, // Garder une trace de la date originale
            rescheduledAt: new Date().toISOString()
          };
        }
        return todo;
      });
      
      setTodos(loadedTodos);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("alpha-things-todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (!newTodo.trim()) return;
    
    const todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      starred: false,
      archived: false,
      createdAt: new Date().toISOString(),
      dueDate: filter === "today" ? new Date().toISOString().split('T')[0] : null,
      tags: []
    };
    
    setTodos(prev => [todo, ...prev]);
    setNewTodo("");
    toast.success("Tâche ajoutée");
  };

  const toggleComplete = (id) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        const isNowCompleted = !t.completed;
        return { 
          ...t, 
          completed: isNowCompleted, 
          // Garder dans les archives quand terminé (historique visible)
          archived: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : null 
        };
      }
      return t;
    }));
    toast.success("Tâche mise à jour");
  };

  const toggleStar = (id) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, starred: !t.starred } : t
    ));
  };

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    toast.success("Tâche supprimée");
  };

  const archiveTodo = (id) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, archived: true } : t
    ));
    toast.success("Tâche archivée");
  };

  const restoreTodo = (id) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, archived: false, completed: false } : t
    ));
    toast.success("Tâche restaurée");
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    setTodos(prev => prev.map(t => 
      t.id === editingId ? { ...t, text: editText.trim() } : t
    ));
    setEditingId(null);
    setEditText("");
  };

  const setDueDate = (id, date) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, dueDate: date } : t
    ));
  };

  // Filter todos
  const today = new Date().toISOString().split('T')[0];
  
  const filteredTodos = todos.filter(t => {
    if (searchQuery && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (t.archived && filter !== "logbook") return false;
    
    switch (filter) {
      case "today":
        return t.dueDate === today && !t.completed;
      case "upcoming":
        return t.dueDate && t.dueDate > today && !t.completed;
      case "anytime":
        return !t.dueDate && !t.completed;
      case "completed":
        return t.completed && !t.archived;
      case "logbook":
        return t.archived;
      case "starred":
        return t.starred && !t.completed;
      default:
        return !t.completed && !t.archived;
    }
  });

  // Stats
  const todayCount = todos.filter(t => t.dueDate === today && !t.completed && !t.archived).length;
  const upcomingCount = todos.filter(t => t.dueDate && t.dueDate > today && !t.completed && !t.archived).length;
  const completedToday = todos.filter(t => t.completed && t.completedAt?.startsWith(today)).length;

  const filterOptions = [
    { id: "today", label: "Aujourd'hui", icon: Sun, count: todayCount, color: "text-amber-400" },
    { id: "upcoming", label: "Prochainement", icon: CalendarDays, count: upcomingCount, color: "text-orange-400" },
    { id: "anytime", label: "À tout moment", icon: Sparkles, count: todos.filter(t => !t.dueDate && !t.completed && !t.archived).length, color: "text-cyan-400" },
    { id: "starred", label: "Favoris", icon: Star, count: todos.filter(t => t.starred && !t.completed).length, color: "text-yellow-400" },
    { id: "completed", label: "Terminées", icon: CheckCircle2, count: todos.filter(t => t.completed && !t.archived).length, color: "text-green-400" },
    { id: "logbook", label: "Archives", icon: Archive, count: todos.filter(t => t.archived).length, color: "text-slate-400" },
  ];

  const getFilterConfig = () => filterOptions.find(f => f.id === filter) || filterOptions[0];
  const FilterIcon = getFilterConfig().icon;

  return (
    <div data-testid="things-page" className="h-full flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 p-4 hidden md:block">
        <div className="space-y-1">
          {filterOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                filter === opt.id 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <opt.icon className={`w-5 h-5 ${opt.color}`} />
                <span className="font-medium">{opt.label}</span>
              </div>
              {opt.count > 0 && (
                <span className={`text-sm ${filter === opt.id ? "text-slate-900" : "text-slate-400"}`}>
                  {opt.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Today's Progress */}
        <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
          <h3 className="text-slate-500 text-xs uppercase tracking-wider mb-2">Progression du jour</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900">{completedToday}</span>
            <span className="text-slate-400 text-sm mb-1">terminées</span>
          </div>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${todayCount + completedToday > 0 ? (completedToday / (todayCount + completedToday)) * 100 : 0}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-4 md:p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FilterIcon className={`w-6 h-6 ${getFilterConfig().color}`} />
              <h1 className="text-2xl font-bold text-slate-900">{getFilterConfig().label}</h1>
            </div>
            
            {/* Mobile filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-900">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-50 border-slate-200">
                {filterOptions.map(opt => (
                  <DropdownMenuItem 
                    key={opt.id}
                    onClick={() => setFilter(opt.id)}
                    className="text-slate-700 focus:bg-slate-100"
                  >
                    <opt.icon className={`w-4 h-4 mr-2 ${opt.color}`} />
                    {opt.label}
                    {opt.count > 0 && <span className="ml-auto text-slate-400">{opt.count}</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Add new todo */}
          {filter !== "logbook" && filter !== "completed" && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTodo()}
                  placeholder={filter === "today" ? "Nouvelle tâche pour aujourd'hui..." : "Nouvelle tâche..."}
                  className="pl-12 h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl"
                />
              </div>
              <Button 
                onClick={addTodo}
                disabled={!newTodo.trim()}
                className="h-12 px-6 bg-indigo-600 hover:bg-indigo-500 rounded-xl"
              >
                Ajouter
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg"
            />
          </div>

          {/* Mobile Progress */}
          <div className="md:hidden mt-3 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-slate-500 text-sm">{completedToday} terminées aujourd'hui</span>
            </div>
            <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                style={{ width: `${todayCount + completedToday > 0 ? (completedToday / (todayCount + completedToday)) * 100 : 0}%` }}
              />
            </div>
          </div>
        </header>

        {/* Todo List */}
        <ScrollArea className="flex-1 p-4 md:p-6">
          <AnimatePresence mode="popLayout">
            {filteredTodos.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4">
                  <FilterIcon className={`w-8 h-8 ${getFilterConfig().color} opacity-50`} />
                </div>
                <h3 className="text-slate-900 font-medium mb-1">Aucune tâche</h3>
                <p className="text-slate-500 text-sm">
                  {filter === "logbook" ? "Les tâches archivées apparaîtront ici" : "Ajoutez une nouvelle tâche pour commencer"}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {filteredTodos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`group flex items-center gap-3 p-4 rounded-xl border transition-all ${
                      todo.completed 
                        ? "bg-white border-slate-200" 
                        : "bg-white border-slate-200 hover:border-slate-200"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(todo.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        todo.completed 
                          ? "bg-green-500 border-green-500" 
                          : "border-white/30 hover:border-indigo-500"
                      }`}
                    >
                      {todo.completed && <Check className="w-3.5 h-3.5 text-slate-900" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {editingId === todo.id ? (
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={saveEdit}
                          autoFocus
                          className="bg-slate-100 border-indigo-500/50 h-8"
                        />
                      ) : (
                        <p className={`text-slate-900 ${todo.completed ? "line-through text-slate-400" : ""}`}>
                          {todo.text}
                        </p>
                      )}
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-2 mt-1">
                        {todo.dueDate && (
                          <span className={`text-xs flex items-center gap-1 ${
                            todo.dueDate < today && !todo.completed ? "text-red-400" : "text-slate-400"
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(todo.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        {todo.completedAt && (
                          <span className="text-xs text-green-400/60 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Terminé {new Date(todo.completedAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStar(todo.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          todo.starred ? "text-yellow-400" : "text-slate-400 hover:text-yellow-400"
                        }`}
                      >
                        <Star className="w-4 h-4" fill={todo.starred ? "currentColor" : "none"} />
                      </button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-50 border-slate-200">
                          <DropdownMenuItem onClick={() => startEdit(todo)} className="text-slate-700">
                            <Edit2 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDueDate(todo.id, today)} className="text-slate-700">
                            <Sun className="w-4 h-4 mr-2" />
                            Aujourd'hui
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDueDate(todo.id, null)} className="text-slate-700">
                            <Sparkles className="w-4 h-4 mr-2" />
                            À tout moment
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          {todo.archived ? (
                            <DropdownMenuItem onClick={() => restoreTodo(todo.id)} className="text-blue-400">
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restaurer
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => archiveTodo(todo.id)} className="text-slate-500">
                              <Archive className="w-4 h-4 mr-2" />
                              Archiver
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => deleteTodo(todo.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </main>
    </div>
  );
};

export default ThingsPage;
