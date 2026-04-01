import { useState, useEffect, useCallback, useRef } from "react";
import { 
  FolderPlus, Upload, Trash2, MoreVertical, File, Folder, 
  FileText, FileSpreadsheet, FileImage, FileVideo, FileAudio,
  Archive, Download, ChevronRight, ChevronDown, Search, Grid, List,
  FolderOpen, Plus, X, Pencil, Save, HardDrive, 
  Clock, CheckCircle2, Eye, Star, StarOff, Info, Settings,
  Move, Copy, Share2, Link, LayoutGrid, SlidersHorizontal, Bot, Sparkles, Wand2, Menu
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose 
} from "../../components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Progress } from "../../components/ui/progress";
import { toast } from "sonner";
import { fileManagerAPI, documentAIAPI } from "../../lib/api";

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderTree, setFolderTree] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([{ id: null, name: "Mon Drive" }]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  
  // Modals
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [moveModal, setMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [renameModal, setRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [detailsPanel, setDetailsPanel] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState(null);
  
  // MoltBot AI states
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Storage quota (configurable)
  const STORAGE_QUOTA_GB = 15; // 15 GB default like Google Drive

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, docsRes, statsRes, treeRes] = await Promise.all([
        fileManagerAPI.getFolders(currentFolder),
        fileManagerAPI.getAll({ folder_id: currentFolder, search: searchQuery || undefined }),
        fileManagerAPI.getStats(),
        fileManagerAPI.getFolderTree()
      ]);
      setFolders(foldersRes.data || []);
      setDocuments(docsRes.data || []);
      setStats(statsRes.data);
      setFolderTree(treeRes.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [currentFolder, searchQuery]);

  // Fetch AI suggestions
  const fetchAiSuggestions = async () => {
    try {
      const res = await documentAIAPI.getSuggestions();
      setAiSuggestions(res.data?.suggestions || []);
    } catch (error) {
      console.error("AI suggestions error:", error);
    }
  };

  // Analyze document with MoltBot
  const analyzeWithMoltBot = async (documentId) => {
    setAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await documentAIAPI.analyzeDocument(documentId);
      setAiAnalysis(res.data);
      if (res.data?.success) {
        toast.success("Analyse terminée !");
      } else {
        toast.error(res.data?.error || "Échec de l'analyse");
      }
    } catch (error) {
      toast.error("Erreur lors de l'analyse");
      console.error("Analysis error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Apply AI classification
  const applyAiClassification = async (documentId) => {
    try {
      const res = await documentAIAPI.autoClassify(documentId, true);
      if (res.data?.changes_applied) {
        toast.success(`Fichier renommé et déplacé vers "${res.data.new_folder_name}"`);
        fetchData();
        setAiAnalysis(null);
      }
    } catch (error) {
      toast.error("Erreur lors de l'application");
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate storage usage
  const getStorageUsage = () => {
    if (!stats) return { used: 0, total: STORAGE_QUOTA_GB * 1024 * 1024 * 1024, percentage: 0 };
    const usedBytes = stats.total_size || 0;
    const totalBytes = STORAGE_QUOTA_GB * 1024 * 1024 * 1024;
    return {
      used: usedBytes,
      total: totalBytes,
      percentage: (usedBytes / totalBytes) * 100
    };
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "Ko", "Mo", "Go", "To"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  // Navigate to folder
  const navigateToFolder = async (folderId, folderName) => {
    if (folderId === null) {
      setCurrentFolder(null);
      setBreadcrumb([{ id: null, name: "Mon Drive" }]);
    } else {
      setCurrentFolder(folderId);
      const newBreadcrumb = [{ id: null, name: "Mon Drive" }];
      const findPath = (folders, targetId, path = []) => {
        for (const folder of folders) {
          if (folder.id === targetId) {
            return [...path, { id: folder.id, name: folder.name }];
          }
          if (folder.children?.length) {
            const found = findPath(folder.children, targetId, [...path, { id: folder.id, name: folder.name }]);
            if (found) return found;
          }
        }
        return null;
      };
      const path = findPath(folderTree, folderId);
      if (path) {
        newBreadcrumb.push(...path);
      } else {
        newBreadcrumb.push({ id: folderId, name: folderName });
      }
      setBreadcrumb(newBreadcrumb);
    }
    setSelectedItems([]);
    setSelectedForDetails(null);
  };

  // Toggle folder expand in sidebar
  const toggleFolderExpand = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fileManagerAPI.createFolder({
        name: newFolderName.trim(),
        parent_id: currentFolder
      });
      toast.success("Dossier créé");
      setNewFolderModal(false);
      setNewFolderName("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };

  // Upload files
  const handleUpload = async (files) => {
    setUploading(true);
    setUploadProgress(files.map(f => ({ name: f.name, status: "pending", progress: 0 })));
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => prev.map((p, idx) => 
        idx === i ? { ...p, status: "uploading" } : p
      ));
      
      try {
        await fileManagerAPI.upload(file, currentFolder);
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: "done", progress: 100 } : p
        ));
      } catch (error) {
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: "error" } : p
        ));
      }
    }
    
    toast.success(`${files.length} fichier(s) uploadé(s)`);
    setUploading(false);
    setUploadModal(false);
    setUploadProgress([]);
    fetchData();
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      handleUpload(files);
    }
  };

  // Delete items
  const handleDelete = async (type, id) => {
    if (!confirm("Supprimer cet élément ?")) return;
    try {
      if (type === "folder") {
        await fileManagerAPI.deleteFolder(id, true);
        toast.success("Dossier supprimé");
      } else {
        await fileManagerAPI.delete(id);
        toast.success("Fichier supprimé");
      }
      fetchData();
      if (selectedForDetails?.id === id) {
        setSelectedForDetails(null);
        setDetailsPanel(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedItems.length} élément(s) ?`)) return;
    try {
      const docIds = selectedItems.filter(i => i.type === "document").map(i => i.id);
      if (docIds.length) {
        await fileManagerAPI.bulkDelete(docIds);
      }
      for (const item of selectedItems.filter(i => i.type === "folder")) {
        await fileManagerAPI.deleteFolder(item.id, true);
      }
      toast.success(`${selectedItems.length} élément(s) supprimé(s)`);
      setSelectedItems([]);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Move items
  const handleMove = async () => {
    try {
      const docIds = selectedItems.filter(i => i.type === "document").map(i => i.id);
      if (docIds.length) {
        await fileManagerAPI.move(docIds, moveTarget);
      }
      toast.success(`${docIds.length} fichier(s) déplacé(s)`);
      setMoveModal(false);
      setMoveTarget(null);
      setSelectedItems([]);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors du déplacement");
    }
  };

  // Rename
  const openRenameModal = (type, item) => {
    setRenameItem({ type, ...item });
    setNewName(item.name);
    setRenameModal(true);
  };

  const handleRename = async () => {
    if (!newName.trim() || !renameItem) return;
    setRenaming(true);
    try {
      if (renameItem.type === "folder") {
        await fileManagerAPI.updateFolder(renameItem.id, { name: newName.trim() });
      } else {
        await fileManagerAPI.update(renameItem.id, { name: newName.trim() });
      }
      toast.success("Renommé avec succès");
      setRenameModal(false);
      setRenameItem(null);
      setNewName("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors du renommage");
    } finally {
      setRenaming(false);
    }
  };

  // Selection
  const toggleSelect = (type, id, item) => {
    const key = `${type}-${id}`;
    if (selectedItems.some(i => `${i.type}-${i.id}` === key)) {
      setSelectedItems(prev => prev.filter(i => `${i.type}-${i.id}` !== key));
    } else {
      setSelectedItems(prev => [...prev, { type, id, ...item }]);
    }
  };

  const isSelected = (type, id) => selectedItems.some(i => i.type === type && i.id === id);

  // File icon
  const getFileIcon = (fileType) => {
    const icons = {
      image: FileImage,
      document: FileText,
      spreadsheet: FileSpreadsheet,
      video: FileVideo,
      audio: FileAudio,
      archive: Archive,
      other: File
    };
    return icons[fileType] || File;
  };

  const getFileColor = (fileType) => {
    const colors = {
      image: "text-pink-400",
      document: "text-blue-400",
      spreadsheet: "text-green-400",
      video: "text-purple-400",
      audio: "text-orange-400",
      archive: "text-amber-400",
      other: "text-gray-400"
    };
    return colors[fileType] || "text-gray-400";
  };

  // Render folder tree for sidebar
  const renderSidebarTree = (items, level = 0) => {
    return items.map(folder => {
      const hasChildren = folder.children?.length > 0;
      const isExpanded = expandedFolders.has(folder.id);
      const isActive = currentFolder === folder.id;
      
      return (
        <div key={folder.id}>
          <div
            className={`flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
              isActive ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50 text-slate-600"
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleFolderExpand(folder.id); }}
                className="p-0.5 hover:bg-slate-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <button
              onClick={() => navigateToFolder(folder.id, folder.name)}
              className="flex items-center gap-2 flex-1 text-left truncate"
            >
              <Folder className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-600" : "text-yellow-500"}`} />
              <span className="truncate text-sm">{folder.name}</span>
            </button>
          </div>
          {hasChildren && isExpanded && renderSidebarTree(folder.children, level + 1)}
        </div>
      );
    });
  };

  // Render folder tree for move modal
  const renderMoveTree = (items, level = 0) => {
    return items.map(folder => (
      <div key={folder.id}>
        <button
          onClick={() => setMoveTarget(folder.id)}
          className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
            moveTarget === folder.id ? "bg-indigo-600/30 border border-indigo-500/50" : "hover:bg-slate-50"
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          <Folder className="w-4 h-4 text-yellow-500" />
          <span className="text-slate-900 text-sm">{folder.name}</span>
        </button>
        {folder.children?.length > 0 && renderMoveTree(folder.children, level + 1)}
      </div>
    ));
  };

  const storage = getStorageUsage();

  return (
    <div 
      data-testid="documents-page" 
      className="h-full flex flex-col lg:flex-row overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 lg:hidden">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-slate-900" />
          </button>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <span className="text-slate-900 font-semibold">Documents</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setUploadModal(true)}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg"
          >
            <Plus className="w-4 h-4 text-slate-900" />
          </button>
        </div>
      </div>

      {/* Sidebar - Desktop always visible, Mobile as overlay */}
      <aside className={`
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative left-0 top-0 h-full
        w-64 lg:w-56 xl:w-64
        bg-slate-50 lg:bg-transparent
        border-r border-slate-200
        flex flex-col
        transition-transform duration-300 ease-in-out
        z-50 lg:z-auto
      `}>
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 lg:hidden">
          <span className="text-slate-900 font-semibold">Mon Drive</span>
          <button 
            onClick={() => setShowMobileSidebar(false)}
            className="p-2 bg-slate-100 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-900" />
          </button>
        </div>

        {/* New button */}
        <div className="p-3">
          <Button
            onClick={() => { setUploadModal(true); setShowMobileSidebar(false); }}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 shadow-lg rounded-xl"
          >
            <Plus className="w-5 h-5" />
            <span className="ml-2">Nouveau</span>
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {/* Mon Drive */}
            <button
              onClick={() => { navigateToFolder(null, "Mon Drive"); setShowMobileSidebar(false); }}
              className={`w-full flex items-center gap-3 py-2 px-3 rounded-xl transition-colors ${
                currentFolder === null ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              <HardDrive className="w-5 h-5" />
              <span className="text-sm font-medium">Mon Drive</span>
            </button>

            {/* Folder tree */}
            {folderTree.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {renderSidebarTree(folderTree)}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Storage info */}
        <div className="p-3 border-t border-slate-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Espace</span>
              <span className="text-slate-700">{formatSize(storage.used)} / {STORAGE_QUOTA_GB} Go</span>
            </div>
            <Progress value={storage.percentage} className="h-1.5 bg-slate-100" />
            <p className="text-[10px] text-slate-400">
              {stats?.total_documents || 0} fichiers • {stats?.total_folders || 0} dossiers
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header - Desktop only */}
        <header className="hidden lg:flex items-center justify-between gap-4 p-3 border-b border-slate-200">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto flex-shrink-0">
            {breadcrumb.map((item, idx) => (
              <div key={item.id || 'root'} className="flex items-center">
                {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-400 mx-1 flex-shrink-0" />}
                <button
                  onClick={() => navigateToFolder(item.id, item.name)}
                  className={`px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap ${
                    idx === breadcrumb.length - 1 ? "text-slate-900 font-medium" : "text-slate-500"
                  }`}
                >
                  {item.name}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative w-48 xl:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-full h-8 text-sm"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-900"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Info toggle */}
            <button
              onClick={() => setDetailsPanel(!detailsPanel)}
              className={`p-2 rounded-lg transition-colors hidden xl:block ${detailsPanel ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
            >
              <Info className="w-4 h-4" />
            </button>
            
            {/* MoltBot AI toggle */}
            <button
              onClick={() => { setShowAiPanel(!showAiPanel); if (!showAiPanel) fetchAiSuggestions(); }}
              className={`p-2 rounded-lg transition-colors ${showAiPanel ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
              title="MoltBot AI - Classification intelligente"
            >
              <Bot className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Toolbar for actions */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 bg-slate-100">
          <Button
            onClick={() => setNewFolderModal(true)}
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Nouveau dossier
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files);
              if (files.length) handleUpload(files);
            }}
          />
          
          {selectedItems.length > 0 && (
            <>
              <div className="w-px h-6 bg-white/20" />
              <span className="text-slate-500 text-sm">{selectedItems.length} sélectionné(s)</span>
              <Button
                onClick={() => setMoveModal(true)}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <Move className="w-4 h-4 mr-1" />
                Déplacer
              </Button>
              <Button
                onClick={handleBulkDelete}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Supprimer
              </Button>
              <Button
                onClick={() => setSelectedItems([])}
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Files/Folders list */}
          <div className={`flex-1 overflow-auto p-4 ${dragOver ? "bg-indigo-600/10 border-2 border-dashed border-indigo-500" : ""}`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : folders.length === 0 && documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-6">
                  {dragOver ? (
                    <Upload className="w-10 h-10 text-indigo-600 animate-bounce" />
                  ) : (
                    <FolderOpen className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <h3 className="text-slate-900 font-medium mb-2 text-lg">
                  {dragOver ? "Déposez vos fichiers ici" : "Ce dossier est vide"}
                </h3>
                <p className="text-slate-500 text-sm mb-6 max-w-sm">
                  Glissez-déposez des fichiers ou utilisez le bouton "Nouveau" pour ajouter du contenu
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setNewFolderModal(true)} variant="outline" className="border-slate-200 text-slate-900">
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Créer un dossier
                  </Button>
                  <Button onClick={() => setUploadModal(true)} className="bg-indigo-600">
                    <Upload className="w-4 h-4 mr-2" />
                    Importer des fichiers
                  </Button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="space-y-6">
                {/* Folders section */}
                {folders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-3 px-1">Dossiers</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {folders.map(folder => (
                        <div
                          key={folder.id}
                          data-testid={`folder-${folder.id}`}
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              toggleSelect("folder", folder.id, folder);
                            } else {
                              navigateToFolder(folder.id, folder.name);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedForDetails({ type: "folder", ...folder });
                            setDetailsPanel(true);
                          }}
                          className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${
                            isSelected("folder", folder.id)
                              ? "bg-indigo-50 border-indigo-500/50"
                              : "bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Folder className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 text-sm font-medium truncate">{folder.name}</p>
                              <p className="text-slate-400 text-xs">
                                {folder.file_count || 0} fichiers
                              </p>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="w-4 h-4 text-slate-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-50 border-slate-200 z-50">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigateToFolder(folder.id, folder.name); }} className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                <FolderOpen className="w-4 h-4 mr-2" />
                                Ouvrir
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameModal("folder", folder); }} className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                <Pencil className="w-4 h-4 mr-2" />
                                Renommer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete("folder", folder.id); }} className="text-red-400 focus:bg-red-500/20 focus:text-red-400">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Files section */}
                {documents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-3 px-1">Fichiers</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {documents.map(doc => {
                        const FileIcon = getFileIcon(doc.file_type);
                        return (
                          <div
                            key={doc.id}
                            data-testid={`document-${doc.id}`}
                            onClick={(e) => {
                              if (e.ctrlKey || e.metaKey) {
                                toggleSelect("document", doc.id, doc);
                              } else {
                                setSelectedForDetails({ type: "document", ...doc });
                                setDetailsPanel(true);
                              }
                            }}
                            onDoubleClick={() => setPreviewDoc(doc)}
                            className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${
                              isSelected("document", doc.id)
                                ? "bg-indigo-50 border-indigo-500/50"
                                : "bg-white border-slate-200 hover:bg-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex flex-col items-center text-center">
                              {doc.file_type === "image" && doc.url ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden mb-2 bg-slate-100">
                                  <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <FileIcon className={`w-12 h-12 mb-2 ${getFileColor(doc.file_type)}`} />
                              )}
                              <p className="text-slate-900 text-sm font-medium truncate w-full" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-slate-400 text-xs mt-1">{doc.size_formatted}</p>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="w-4 h-4 text-slate-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-slate-50 border-slate-200 z-50">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }} className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Aperçu
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                  <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-2" />
                                    Télécharger
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameModal("document", doc); }} className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Renommer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete("document", doc.id); }} className="text-red-400 focus:bg-red-500/20 focus:text-red-400">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* List View */
              <div className="bg-white backdrop-blur-xl rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-4 text-slate-500 text-sm font-medium">Nom</th>
                      <th className="text-left p-4 text-slate-500 text-sm font-medium hidden md:table-cell">Propriétaire</th>
                      <th className="text-left p-4 text-slate-500 text-sm font-medium hidden sm:table-cell">Dernière modification</th>
                      <th className="text-left p-4 text-slate-500 text-sm font-medium hidden lg:table-cell">Taille</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {folders.map(folder => (
                      <tr
                        key={folder.id}
                        onClick={() => navigateToFolder(folder.id, folder.name)}
                        className={`border-b border-slate-200 cursor-pointer transition-colors ${
                          isSelected("folder", folder.id) ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Folder className="w-5 h-5 text-yellow-500" />
                            <span className="text-slate-900 font-medium">{folder.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-sm hidden md:table-cell">moi</td>
                        <td className="p-4 text-slate-500 text-sm hidden sm:table-cell">
                          {new Date(folder.updated_at || folder.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="p-4 text-slate-500 text-sm hidden lg:table-cell">—</td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-slate-100">
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-50 border-slate-200 z-50">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameModal("folder", folder); }} className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                <Pencil className="w-4 h-4 mr-2" />
                                Renommer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete("folder", folder.id); }} className="text-red-400 focus:bg-red-500/20 focus:text-red-400">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {documents.map(doc => {
                      const FileIcon = getFileIcon(doc.file_type);
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => { setSelectedForDetails({ type: "document", ...doc }); setDetailsPanel(true); }}
                          onDoubleClick={() => setPreviewDoc(doc)}
                          className={`border-b border-slate-200 cursor-pointer transition-colors ${
                            isSelected("document", doc.id) ? "bg-indigo-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <FileIcon className={`w-5 h-5 ${getFileColor(doc.file_type)}`} />
                              <span className="text-slate-900">{doc.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-500 text-sm hidden md:table-cell">moi</td>
                          <td className="p-4 text-slate-500 text-sm hidden sm:table-cell">
                            {new Date(doc.updated_at || doc.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="p-4 text-slate-500 text-sm hidden lg:table-cell">{doc.size_formatted}</td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-slate-100">
                                  <MoreVertical className="w-4 h-4 text-slate-400" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-slate-50 border-slate-200 z-50">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }} className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                  <Eye className="w-4 h-4 mr-2" />
                                  Aperçu
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                  <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-2" />
                                    Télécharger
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameModal("document", doc); }} className="text-slate-700 focus:bg-slate-100 focus:text-slate-900">
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Renommer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete("document", doc.id); }} className="text-red-400 focus:bg-red-500/20 focus:text-red-400">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Details panel */}
          {detailsPanel && (
            <aside className="w-80 border-l border-slate-200 bg-slate-100 flex-shrink-0 overflow-auto">
              {selectedForDetails ? (
                <div className="p-4">
                  {/* Preview thumbnail */}
                  <div className="aspect-video bg-white rounded-xl flex items-center justify-center mb-4 overflow-hidden">
                    {selectedForDetails.type === "folder" ? (
                      <Folder className="w-16 h-16 text-yellow-500" />
                    ) : selectedForDetails.file_type === "image" && selectedForDetails.url ? (
                      <img src={selectedForDetails.url} alt={selectedForDetails.name} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className={`w-16 h-16 ${getFileColor(selectedForDetails.file_type)}`} />
                    )}
                  </div>

                  <h3 className="text-slate-900 font-medium mb-4 break-words">{selectedForDetails.name}</h3>

                  <div className="space-y-4">
                    {selectedForDetails.type === "document" && (
                      <>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Type</p>
                          <p className="text-slate-900 text-sm capitalize">{selectedForDetails.file_type}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Taille</p>
                          <p className="text-slate-900 text-sm">{selectedForDetails.size_formatted}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Créé le</p>
                      <p className="text-slate-900 text-sm">
                        {new Date(selectedForDetails.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    {selectedForDetails.type === "folder" && (
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Contenu</p>
                        <p className="text-slate-900 text-sm">{selectedForDetails.file_count || 0} fichiers</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 space-y-2">
                    {selectedForDetails.type === "document" && (
                      <>
                        {/* MoltBot AI Analysis */}
                        <Button
                          onClick={() => analyzeWithMoltBot(selectedForDetails.id)}
                          disabled={analyzing}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                        >
                          {analyzing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Analyse en cours...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4 mr-2" />
                              Analyser avec MoltBot
                            </>
                          )}
                        </Button>
                        
                        {/* AI Analysis Results */}
                        {aiAnalysis && aiAnalysis.success && (
                          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-3">
                            <div className="flex items-center gap-2 text-purple-400">
                              <Sparkles className="w-4 h-4" />
                              <span className="text-sm font-medium">Résultat de l'analyse</span>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-slate-500">Type :</span>
                                <span className="text-slate-900 ml-2 capitalize">{aiAnalysis.document_type}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Nom suggéré :</span>
                                <p className="text-slate-900 text-xs break-words">{aiAnalysis.suggested_name}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Dossier :</span>
                                <span className="text-slate-900 ml-2">{aiAnalysis.suggested_folder}</span>
                              </div>
                              {aiAnalysis.summary && (
                                <div>
                                  <span className="text-slate-500">Résumé :</span>
                                  <p className="text-slate-700 text-xs mt-1">{aiAnalysis.summary}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500">Confiance :</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                    style={{ width: `${(aiAnalysis.confidence || 0) * 100}%` }}
                                  />
                                </div>
                                <span className="text-slate-500 text-xs">{Math.round((aiAnalysis.confidence || 0) * 100)}%</span>
                              </div>
                            </div>
                            
                            <Button
                              onClick={() => applyAiClassification(selectedForDetails.id)}
                              size="sm"
                              className="w-full bg-purple-600 hover:bg-purple-500"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Appliquer les suggestions
                            </Button>
                          </div>
                        )}
                        
                        <Button
                          onClick={() => setPreviewDoc(selectedForDetails)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Aperçu
                        </Button>
                        <Button asChild variant="outline" className="w-full border-slate-200 text-slate-900">
                          <a href={selectedForDetails.url} download={selectedForDetails.name}>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </a>
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => openRenameModal(selectedForDetails.type, selectedForDetails)}
                      variant="outline"
                      className="w-full border-slate-200 text-slate-900"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Renommer
                    </Button>
                    <Button
                      onClick={() => handleDelete(selectedForDetails.type, selectedForDetails.id)}
                      variant="outline"
                      className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center p-4">
                  <div>
                    <Info className="w-12 h-12 mx-auto text-slate-900/20 mb-4" />
                    <p className="text-slate-500 text-sm">Sélectionnez un fichier ou un dossier pour voir ses détails</p>
                  </div>
                </div>
              )}
            </aside>
          )}
          
          {/* MoltBot AI Panel */}
          {showAiPanel && (
            <aside className="w-80 border-l border-slate-200 bg-gradient-to-b from-purple-900/20 to-black/20 flex-shrink-0 overflow-auto">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                    <Bot className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-medium">MoltBot AI</h3>
                    <p className="text-slate-500 text-xs">Classification intelligente</p>
                  </div>
                </div>
                
                {aiSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-slate-500 text-sm">
                      {aiSuggestions.filter(s => s.needs_analysis).length} fichier(s) à analyser
                    </p>
                    
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 pr-2">
                        {aiSuggestions.map((suggestion) => (
                          <div 
                            key={suggestion.document_id}
                            className="p-3 bg-white rounded-lg border border-slate-200 hover:border-purple-500/50 transition-colors"
                          >
                            <p className="text-slate-900 text-sm truncate mb-2">{suggestion.original_name || 'Sans nom'}</p>
                            
                            {suggestion.needs_analysis ? (
                              <Button
                                onClick={() => analyzeWithMoltBot(suggestion.document_id)}
                                size="sm"
                                variant="outline"
                                className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                                disabled={analyzing}
                              >
                                <Wand2 className="w-3 h-3 mr-1" />
                                Analyser
                              </Button>
                            ) : (
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Suggéré :</span>
                                  <span className="text-purple-400">{suggestion.document_type}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-500">Dossier :</span>
                                  <span className="text-slate-700">{suggestion.suggested_folder}</span>
                                </div>
                                <Button
                                  onClick={() => applyAiClassification(suggestion.document_id)}
                                  size="sm"
                                  className="w-full mt-2 bg-purple-600/50 hover:bg-purple-600"
                                >
                                  Appliquer
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 mx-auto text-purple-400/50 mb-4" />
                    <p className="text-slate-500 text-sm">Tous vos fichiers sont classés !</p>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* New Folder Modal */}
      <Dialog open={newFolderModal} onOpenChange={setNewFolderModal}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Dossier sans titre"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="bg-white border-slate-200 text-slate-900"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-slate-200 text-slate-900">Annuler</Button>
            </DialogClose>
            <Button onClick={handleCreateFolder} className="bg-indigo-600">Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={uploadModal} onOpenChange={setUploadModal}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 max-w-xl">
          <DialogHeader>
            <DialogTitle>Importer des fichiers</DialogTitle>
          </DialogHeader>
          
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-500/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              if (files.length) handleUpload(files);
            }}
          >
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-500 mb-2">Glissez-déposez vos fichiers ici</p>
            <p className="text-slate-400 text-sm mb-4">ou</p>
            <Button
              onClick={() => document.getElementById('modal-file-input').click()}
              variant="outline"
              className="border-slate-200 text-slate-900"
              disabled={uploading}
            >
              Parcourir
            </Button>
            <input
              id="modal-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if (files.length) handleUpload(files);
              }}
            />
          </div>

          {uploadProgress.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadProgress.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                  <File className="w-4 h-4 text-slate-500" />
                  <span className="flex-1 text-sm text-slate-900 truncate">{file.name}</span>
                  {file.status === "uploading" && (
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {file.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                  {file.status === "error" && <X className="w-4 h-4 text-red-400" />}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Move Modal */}
      <Dialog open={moveModal} onOpenChange={setMoveModal}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle>Déplacer vers</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-64">
            <div className="space-y-1">
              <button
                onClick={() => setMoveTarget(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  moveTarget === null ? "bg-indigo-600/30 border border-indigo-500/50" : "hover:bg-slate-50"
                }`}
              >
                <HardDrive className="w-5 h-5 text-slate-500" />
                <span className="text-slate-900">Mon Drive</span>
              </button>
              {renderMoveTree(folderTree)}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-slate-200 text-slate-900">Annuler</Button>
            </DialogClose>
            <Button onClick={handleMove} className="bg-indigo-600">Déplacer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              {previewDoc?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewDoc && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center">
                {previewDoc.file_type === "image" && previewDoc.url && (
                  <img src={previewDoc.url} alt={previewDoc.name} className="max-h-[60vh] max-w-full object-contain" />
                )}
                {previewDoc.file_type === "video" && previewDoc.url && (
                  <video src={previewDoc.url} controls className="max-h-[60vh] max-w-full" />
                )}
                {previewDoc.file_type === "audio" && previewDoc.url && (
                  <div className="w-full p-8">
                    <FileAudio className="w-16 h-16 mx-auto text-pink-400 mb-4" />
                    <audio src={previewDoc.url} controls className="w-full" />
                  </div>
                )}
                {(previewDoc.content_type?.includes('pdf') || previewDoc.file_type === "document") && previewDoc.url && (
                  <div className="w-full h-[60vh]">
                    <iframe src={previewDoc.url} className="w-full h-full border-0" title={previewDoc.name} />
                  </div>
                )}
                {!['image', 'video', 'audio', 'document'].includes(previewDoc.file_type) && !previewDoc.content_type?.includes('pdf') && (
                  <div className="text-center p-8">
                    <File className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                    <p className="text-slate-500">Aperçu non disponible</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button asChild className="flex-1 bg-indigo-600">
                  <a href={previewDoc.url} download={previewDoc.name}>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
                <Button onClick={() => { openRenameModal("document", previewDoc); setPreviewDoc(null); }} variant="outline" className="border-slate-200 text-slate-900">
                  <Pencil className="w-4 h-4 mr-2" />
                  Renommer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={renameModal} onOpenChange={(open) => { if (!open) { setRenameModal(false); setRenameItem(null); setNewName(""); } }}>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle>Renommer</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nouveau nom"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-white border-slate-200 text-slate-900"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-slate-200 text-slate-900" disabled={renaming}>Annuler</Button>
            </DialogClose>
            <Button onClick={handleRename} className="bg-indigo-600" disabled={renaming || !newName.trim()}>
              {renaming ? "..." : "Renommer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
