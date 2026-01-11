import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Plus, Minus, ZoomIn, ZoomOut, Trash2, Edit2, Save, X,
  Circle, Square, Diamond, Hexagon, Move, Maximize2, Download,
  Palette, Type, Link2, ArrowRight, RotateCcw, Layers, Eye
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import { toast } from "sonner";

// Node colors with gradients
const NODE_COLORS = [
  { name: "Indigo", bg: "bg-indigo-600", gradient: "url(#gradient-indigo)", border: "border-indigo-500", text: "text-indigo-100", hex: "#6366f1" },
  { name: "Purple", bg: "bg-purple-600", gradient: "url(#gradient-purple)", border: "border-purple-500", text: "text-purple-100", hex: "#9333ea" },
  { name: "Blue", bg: "bg-blue-600", gradient: "url(#gradient-blue)", border: "border-blue-500", text: "text-blue-100", hex: "#2563eb" },
  { name: "Cyan", bg: "bg-cyan-600", gradient: "url(#gradient-cyan)", border: "border-cyan-500", text: "text-cyan-100", hex: "#0891b2" },
  { name: "Green", bg: "bg-green-600", gradient: "url(#gradient-green)", border: "border-green-500", text: "text-green-100", hex: "#16a34a" },
  { name: "Yellow", bg: "bg-amber-500", gradient: "url(#gradient-yellow)", border: "border-amber-400", text: "text-amber-100", hex: "#f59e0b" },
  { name: "Orange", bg: "bg-orange-600", gradient: "url(#gradient-orange)", border: "border-orange-500", text: "text-orange-100", hex: "#ea580c" },
  { name: "Red", bg: "bg-red-600", gradient: "url(#gradient-red)", border: "border-red-500", text: "text-red-100", hex: "#dc2626" },
  { name: "Pink", bg: "bg-pink-600", gradient: "url(#gradient-pink)", border: "border-pink-500", text: "text-pink-100", hex: "#db2777" },
  { name: "Gray", bg: "bg-gray-600", gradient: "url(#gradient-gray)", border: "border-gray-500", text: "text-gray-100", hex: "#4b5563" },
];

// Initial mindmap data
const createInitialData = () => ({
  id: "root",
  text: "Idée Centrale",
  color: 0,
  x: 400,
  y: 300,
  children: []
});

const MindMapPage = () => {
  const [mindmap, setMindmap] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editText, setEditText] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const [maps, setMaps] = useState([]);
  const [currentMapId, setCurrentMapId] = useState(null);
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const canvasRef = useRef(null);

  // Load maps from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("alpha-mindmaps");
    if (saved) {
      const parsed = JSON.parse(saved);
      setMaps(parsed);
      if (parsed.length > 0) {
        setCurrentMapId(parsed[0].id);
        setMindmap(parsed[0].data);
      } else {
        createNewMap("Ma première carte");
      }
    } else {
      createNewMap("Ma première carte");
    }
  }, []);

  // Save maps to localStorage
  useEffect(() => {
    if (maps.length > 0) {
      localStorage.setItem("alpha-mindmaps", JSON.stringify(maps));
    }
  }, [maps]);

  // Update current map when mindmap changes
  useEffect(() => {
    if (currentMapId && mindmap) {
      setMaps(prev => prev.map(m => 
        m.id === currentMapId ? { ...m, data: mindmap } : m
      ));
    }
  }, [mindmap, currentMapId]);

  const createNewMap = (name) => {
    const newMap = {
      id: Date.now().toString(),
      name: name || "Nouvelle carte",
      data: createInitialData(),
      createdAt: new Date().toISOString()
    };
    setMaps(prev => [...prev, newMap]);
    setCurrentMapId(newMap.id);
    setMindmap(newMap.data);
    setShowNewMapDialog(false);
    setNewMapName("");
  };

  const switchMap = (mapId) => {
    const map = maps.find(m => m.id === mapId);
    if (map) {
      setCurrentMapId(mapId);
      setMindmap(map.data);
      setSelectedNode(null);
    }
  };

  const deleteMap = (mapId) => {
    setMaps(prev => prev.filter(m => m.id !== mapId));
    if (currentMapId === mapId) {
      const remaining = maps.filter(m => m.id !== mapId);
      if (remaining.length > 0) {
        switchMap(remaining[0].id);
      } else {
        createNewMap("Nouvelle carte");
      }
    }
    toast.success("Carte supprimée");
  };

  // Find node by id recursively
  const findNode = useCallback((node, id) => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  // Find parent of node
  const findParent = useCallback((node, childId, parent = null) => {
    if (node.id === childId) return parent;
    for (const child of node.children || []) {
      const found = findParent(child, childId, node);
      if (found) return found;
    }
    return null;
  }, []);

  // Add child node
  const addChild = (parentId) => {
    const updateNode = (node) => {
      if (node.id === parentId) {
        const angle = (node.children?.length || 0) * (Math.PI / 4);
        const distance = 150;
        return {
          ...node,
          children: [
            ...(node.children || []),
            {
              id: Date.now().toString(),
              text: "Nouvelle idée",
              color: (node.color + 1) % NODE_COLORS.length,
              x: node.x + Math.cos(angle) * distance,
              y: node.y + Math.sin(angle) * distance,
              children: []
            }
          ]
        };
      }
      return {
        ...node,
        children: node.children?.map(updateNode) || []
      };
    };
    setMindmap(prev => updateNode(prev));
  };

  // Delete node
  const deleteNode = (nodeId) => {
    if (nodeId === mindmap.id) {
      toast.error("Impossible de supprimer le nœud central");
      return;
    }
    
    const removeNode = (node) => {
      return {
        ...node,
        children: node.children?.filter(c => c.id !== nodeId).map(removeNode) || []
      };
    };
    setMindmap(prev => removeNode(prev));
    setSelectedNode(null);
    toast.success("Nœud supprimé");
  };

  // Update node text
  const updateNodeText = (nodeId, text) => {
    const updateNode = (node) => {
      if (node.id === nodeId) {
        return { ...node, text };
      }
      return {
        ...node,
        children: node.children?.map(updateNode) || []
      };
    };
    setMindmap(prev => updateNode(prev));
    setEditingNode(null);
  };

  // Update node color
  const updateNodeColor = (nodeId, colorIndex) => {
    const updateNode = (node) => {
      if (node.id === nodeId) {
        return { ...node, color: colorIndex };
      }
      return {
        ...node,
        children: node.children?.map(updateNode) || []
      };
    };
    setMindmap(prev => updateNode(prev));
  };

  // Update node position
  const updateNodePosition = (nodeId, x, y) => {
    const updateNode = (node) => {
      if (node.id === nodeId) {
        return { ...node, x, y };
      }
      return {
        ...node,
        children: node.children?.map(updateNode) || []
      };
    };
    setMindmap(prev => updateNode(prev));
  };

  // Handle canvas mouse events for panning
  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains('mindmap-canvas')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isDragging && !draggingNode) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (draggingNode) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      updateNodePosition(draggingNode, x, y);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggingNode(null);
  };

  // Touch event handlers for mobile
  const handleCanvasTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (e.target === canvasRef.current || e.target.classList.contains('mindmap-canvas')) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
        setSelectedNode(null);
      }
    }
  };

  const handleCanvasTouchMove = (e) => {
    if (e.touches.length === 1 && (isDragging || draggingNode)) {
      e.preventDefault();
      const touch = e.touches[0];
      if (isDragging && !draggingNode) {
        setPan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
      }
      if (draggingNode) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (touch.clientX - rect.left - pan.x) / zoom;
        const y = (touch.clientY - rect.top - pan.y) / zoom;
        updateNodePosition(draggingNode, x, y);
      }
    }
  };

  const handleCanvasTouchEnd = () => {
    setIsDragging(false);
    setDraggingNode(null);
  };

  // Generate curved path between two points (Bézier curve)
  const generateCurvedPath = (x1, y1, x2, y2) => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Control point offset based on distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curvature = Math.min(distance * 0.3, 80);
    
    // Determine curve direction based on relative position
    let cx1, cy1, cx2, cy2;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal-ish connection
      cx1 = x1 + dx * 0.4;
      cy1 = y1;
      cx2 = x2 - dx * 0.4;
      cy2 = y2;
    } else {
      // Vertical-ish connection
      cx1 = x1;
      cy1 = y1 + dy * 0.4;
      cx2 = x2;
      cy2 = y2 - dy * 0.4;
    }
    
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  };

  // Render node recursively
  const renderNode = (node, depth = 0) => {
    const color = NODE_COLORS[node.color] || NODE_COLORS[0];
    const isSelected = selectedNode === node.id;
    const isEditing = editingNode === node.id;
    const isRoot = node.id === mindmap.id;
    const nodeWidth = isRoot ? 180 : 160;
    const nodeHeight = isRoot ? 60 : 50;

    return (
      <g key={node.id}>
        {/* Curved lines to children with gradient */}
        {node.children?.map(child => {
          const childColor = NODE_COLORS[child.color] || NODE_COLORS[0];
          return (
            <g key={`line-${node.id}-${child.id}`}>
              {/* Glow effect */}
              <path
                d={generateCurvedPath(node.x, node.y, child.x, child.y)}
                fill="none"
                stroke={color.hex}
                strokeWidth={6}
                strokeOpacity={0.15}
                strokeLinecap="round"
              />
              {/* Main line */}
              <path
                d={generateCurvedPath(node.x, node.y, child.x, child.y)}
                fill="none"
                stroke={`url(#line-gradient-${node.id}-${child.id})`}
                strokeWidth={2.5}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              {/* Gradient definition for this line */}
              <defs>
                <linearGradient id={`line-gradient-${node.id}-${child.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={color.hex} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={childColor.hex} stopOpacity="0.8" />
                </linearGradient>
              </defs>
            </g>
          );
        })}
        
        {/* Node */}
        <g
          transform={`translate(${node.x}, ${node.y})`}
          style={{ cursor: "pointer" }}
          className="transition-transform duration-200 hover:scale-105"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingNode(node.id);
            setSelectedNode(node.id);
          }}
          onDoubleClick={() => {
            setEditingNode(node.id);
            setEditText(node.text);
          }}
        >
          {/* Shadow */}
          <ellipse
            cx={3}
            cy={5}
            rx={nodeWidth / 2 - 5}
            ry={nodeHeight / 2 - 3}
            fill="rgba(0,0,0,0.3)"
            style={{ filter: "blur(8px)" }}
          />
          
          {/* Glow effect when selected */}
          {isSelected && (
            <ellipse
              cx={0}
              cy={0}
              rx={nodeWidth / 2 + 8}
              ry={nodeHeight / 2 + 8}
              fill="none"
              stroke={color.hex}
              strokeWidth={3}
              strokeOpacity={0.4}
              style={{ filter: "blur(4px)" }}
            />
          )}
          
          {/* Node background with gradient */}
          <rect
            x={-nodeWidth / 2}
            y={-nodeHeight / 2}
            width={nodeWidth}
            height={nodeHeight}
            rx={isRoot ? nodeHeight / 2 : 16}
            fill={color.hex}
            stroke={isSelected ? "white" : "rgba(255,255,255,0.2)"}
            strokeWidth={isSelected ? 2.5 : 1}
            style={{ 
              filter: isSelected ? `drop-shadow(0 0 20px ${color.hex})` : "none",
            }}
          />
          
          {/* Inner highlight */}
          <rect
            x={-nodeWidth / 2 + 2}
            y={-nodeHeight / 2 + 2}
            width={nodeWidth - 4}
            height={nodeHeight / 2 - 4}
            rx={isRoot ? (nodeHeight / 2) - 2 : 14}
            fill="rgba(255,255,255,0.15)"
          />
          
          {/* Node text */}
          <text
            x={0}
            y={isRoot ? 6 : 5}
            textAnchor="middle"
            fill="white"
            fontSize={isRoot ? 16 : 14}
            fontWeight={isRoot ? 600 : 500}
            style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            {node.text.length > 20 ? node.text.slice(0, 20) + "..." : node.text}
          </text>
          
          {/* Add child indicator */}
          {isSelected && (
            <g transform={`translate(${nodeWidth / 2 + 15}, 0)`}>
              <circle
                r={12}
                fill="rgba(99, 102, 241, 0.9)"
                stroke="white"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  addChild(node.id);
                }}
              />
              <text
                x={0}
                y={5}
                textAnchor="middle"
                fill="white"
                fontSize={16}
                fontWeight="bold"
                style={{ pointerEvents: "none" }}
              >
                +
              </text>
            </g>
          )}
        </g>
        
        {/* Render children */}
        {node.children?.map(child => renderNode(child, depth + 1))}
      </g>
    );
  };

  const currentMap = maps.find(m => m.id === currentMapId);

  if (!mindmap) return null;

  return (
    <div data-testid="mindmap-page" className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <header className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <h1 className="text-lg sm:text-xl font-bold text-white">Mind Map</h1>
          
          {/* Map selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-white/20 text-white text-xs sm:text-sm">
                <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="truncate max-w-[100px] sm:max-w-[150px]">{currentMap?.name || "Sélectionner"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-56">
              <DropdownMenuLabel className="text-white/50">Mes cartes</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {maps.map(map => (
                <DropdownMenuItem 
                  key={map.id}
                  onClick={() => switchMap(map.id)}
                  className={`text-white/80 ${currentMapId === map.id ? "bg-white/10" : ""}`}
                >
                  {map.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => setShowNewMapDialog(true)} className="text-indigo-400">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle carte
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
              className="p-1.5 sm:p-2 rounded hover:bg-white/10 text-white/60 hover:text-white"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-1.5 sm:px-2 text-white/60 text-xs sm:text-sm min-w-[40px] sm:min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2, z + 0.25))}
              className="p-1.5 sm:p-2 rounded hover:bg-white/10 text-white/60 hover:text-white"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Reset view */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="border-white/20 text-white/60 hover:text-white h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* Add node to selected */}
          {selectedNode && (
            <Button
              size="sm"
              onClick={() => addChild(selectedNode)}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          )}
        </div>
      </header>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 overflow-hidden bg-[#050510] mindmap-canvas relative touch-none"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#050510] to-[#0a0a20]" />
        
        {/* Radial glow effect */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)"
          }}
        />
        
        {/* Dot grid background */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        />

        {/* SVG Canvas */}
        <svg 
          width="100%" 
          height="100%" 
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0"
          }}
        >
          {/* SVG Definitions for gradients and filters */}
          <defs>
            {NODE_COLORS.map((color, i) => (
              <linearGradient key={`gradient-${i}`} id={`gradient-${color.name.toLowerCase()}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color.hex} stopOpacity="1" />
                <stop offset="100%" stopColor={color.hex} stopOpacity="0.7" />
              </linearGradient>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {renderNode(mindmap)}
        </svg>

        {/* Selected node toolbar */}
        {selectedNode && (
          <div 
            className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl"
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => addChild(selectedNode)}
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 px-2 sm:px-3"
            >
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Enfant</span>
            </Button>

            {/* Color picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0">
                  <Palette className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                <div className="grid grid-cols-5 gap-1 p-2">
                  {NODE_COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => updateNodeColor(selectedNode, i)}
                      className={`w-6 h-6 rounded ${color.bg} hover:ring-2 ring-white/50`}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const node = findNode(mindmap, selectedNode);
                if (node) {
                  setEditingNode(selectedNode);
                  setEditText(node.text);
                }
              }}
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>

            {selectedNode !== mindmap.id && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteNode(selectedNode)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingNode} onOpenChange={() => setEditingNode(null)}>
        <DialogContent className="bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le nœud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Texte</Label>
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateNodeText(editingNode, editText);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNode(null)} className="border-white/20 text-white">
              Annuler
            </Button>
            <Button onClick={() => updateNodeText(editingNode, editText)} className="bg-indigo-600">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Map Dialog */}
      <Dialog open={showNewMapDialog} onOpenChange={setShowNewMapDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Nouvelle carte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Nom de la carte</Label>
              <Input
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="Ma carte mentale"
                className="bg-white/5 border-white/10 text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMapName.trim()) {
                    createNewMap(newMapName);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMapDialog(false)} className="border-white/20 text-white">
              Annuler
            </Button>
            <Button 
              onClick={() => createNewMap(newMapName)} 
              disabled={!newMapName.trim()}
              className="bg-indigo-600"
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MindMapPage;
