import { useState, useEffect, useCallback } from "react";
import { 
  FolderPlus, Upload, Trash2, MoreVertical, File, Folder, 
  FileText, FileSpreadsheet, FileImage, FileVideo, FileAudio,
  Archive, Download, ChevronRight, Search, Grid, List,
  FolderOpen, Plus, X, Edit2, Move, Tag, Filter,
  HardDrive, Clock, CheckCircle2, Eye, Pencil, Save
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
import { toast } from "sonner";
import { fileManagerAPI } from "../../lib/api";

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderTree, setFolderTree] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([{ id: null, name: "Mes Documents" }]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Modals
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [moveModal, setMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  
  // Rename state
  const [renameModal, setRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate to folder
  const navigateToFolder = async (folderId, folderName) => {
    if (folderId === null) {
      setCurrentFolder(null);
      setBreadcrumb([{ id: null, name: "Mes Documents" }]);
    } else {
      setCurrentFolder(folderId);
      // Build breadcrumb
      const newBreadcrumb = [{ id: null, name: "Mes Documents" }];
      // Find path to folder
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
    setUploadProgress(files.map(f => ({ name: f.name, status: "pending" })));
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => prev.map((p, idx) => 
        idx === i ? { ...p, status: "uploading" } : p
      ));
      
      try {
        await fileManagerAPI.upload(file, currentFolder);
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: "done" } : p
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

  // Delete items
  const handleDelete = async (type, id) => {
    try {
      if (type === "folder") {
        await fileManagerAPI.deleteFolder(id, true);
        toast.success("Dossier supprimé");
      } else {
        await fileManagerAPI.delete(id);
        toast.success("Document supprimé");
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
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
      toast.success(`${docIds.length} document(s) déplacé(s)`);
      setMoveModal(false);
      setMoveTarget(null);
      setSelectedItems([]);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors du déplacement");
    }
  };

  // Rename item (folder or document)
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
        toast.success("Dossier renommé");
      } else {
        await fileManagerAPI.update(renameItem.id, { name: newName.trim() });
        toast.success("Document renommé");
      }
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

  // Check if file can be previewed
  const canPreview = (doc) => {
    if (!doc || !doc.url) return false;
    const previewableTypes = ['image', 'video', 'audio', 'document'];
    return previewableTypes.includes(doc.file_type) || 
           doc.content_type?.includes('pdf') ||
           doc.content_type?.includes('image') ||
           doc.content_type?.includes('video') ||
           doc.content_type?.includes('audio');
  };

  // Get file icon
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

  // Toggle selection
  const toggleSelect = (type, id) => {
    const key = `${type}-${id}`;
    if (selectedItems.some(i => `${i.type}-${i.id}` === key)) {
      setSelectedItems(prev => prev.filter(i => `${i.type}-${i.id}` !== key));
    } else {
      setSelectedItems(prev => [...prev, { type, id }]);
    }
  };

  const isSelected = (type, id) => selectedItems.some(i => i.type === type && i.id === id);

  function renderFolderTree(folders, level) {
    return folders.map(folder => (
      <div key={folder.id}>
        <button
          onClick={() => setMoveTarget(folder.id)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
            moveTarget === folder.id ? "bg-indigo-600/20 border border-indigo-500/50" : "hover:bg-white/5"
          }`}
          style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
        >
          <Folder className="w-5 h-5 text-indigo-400" />
          <span className="text-white">{folder.name}</span>
        </button>
        {folder.children?.length > 0 && renderFolderTree(folder.children, level + 1)}
      </div>
    ));
  }

  return (
    <div data-testid="documents-page" className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-white/50 text-sm">
            {stats?.total_documents || 0} fichiers • {stats?.total_folders || 0} dossiers • {stats?.total_size_formatted || "0 B"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setNewFolderModal(true)}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Nouveau dossier
          </Button>
          <Button
            onClick={() => setUploadModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            <Upload className="w-4 h-4 mr-2" />
            Uploader
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          {breadcrumb.map((item, idx) => (
            <div key={item.id || 'root'} className="flex items-center">
              {idx > 0 && <ChevronRight className="w-4 h-4 text-white/30 mx-1" />}
              <button
                onClick={() => navigateToFolder(item.id, item.name)}
                className={`px-2 py-1 rounded hover:bg-white/10 transition-colors whitespace-nowrap ${
                  idx === breadcrumb.length - 1 ? "text-white font-medium" : "text-white/60"
                }`}
              >
                {item.name}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder-white/40 rounded-lg"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selection actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
          <span className="text-white text-sm">{selectedItems.length} sélectionné(s)</span>
          <Button
            onClick={() => setMoveModal(true)}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
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
            className="text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : folders.length === 0 && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-white font-medium mb-1">Dossier vide</h3>
            <p className="text-white/50 text-sm mb-4">Uploadez des fichiers ou créez des dossiers</p>
            <div className="flex gap-3">
              <Button onClick={() => setNewFolderModal(true)} variant="outline" className="border-white/20 text-white">
                <FolderPlus className="w-4 h-4 mr-2" />
                Créer un dossier
              </Button>
              <Button onClick={() => setUploadModal(true)} className="bg-indigo-600">
                <Upload className="w-4 h-4 mr-2" />
                Uploader
              </Button>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Folders */}
            {folders.map(folder => (
              <div
                key={folder.id}
                data-testid={`folder-${folder.id}`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    toggleSelect("folder", folder.id);
                  } else {
                    navigateToFolder(folder.id, folder.name);
                  }
                }}
                className={`group relative p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected("folder", folder.id)
                    ? "bg-indigo-600/20 border-indigo-500/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <Folder className="w-12 h-12 text-indigo-400 mb-2" />
                  <p className="text-white text-sm font-medium truncate w-full">{folder.name}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {folder.file_count || 0} fichiers
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4 text-white/60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 z-50">
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); navigateToFolder(folder.id, folder.name); }}
                      className="text-white/80 focus:bg-white/10 focus:text-white"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Ouvrir
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); openRenameModal("folder", folder); }}
                      className="text-white/80 focus:bg-white/10 focus:text-white"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Renommer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); handleDelete("folder", folder.id); }}
                      className="text-red-400 focus:bg-red-500/20 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            
            {/* Documents */}
            {documents.map(doc => {
              const FileIcon = getFileIcon(doc.file_type);
              return (
                <div
                  key={doc.id}
                  data-testid={`document-${doc.id}`}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      toggleSelect("document", doc.id);
                    } else {
                      setPreviewDoc(doc);
                    }
                  }}
                  className={`group relative p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected("document", doc.id)
                      ? "bg-indigo-600/20 border-indigo-500/50"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    {doc.file_type === "image" && doc.url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden mb-2 bg-white/10">
                        <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <FileIcon className={`w-12 h-12 mb-2 ${
                        doc.file_type === "document" ? "text-blue-400" :
                        doc.file_type === "spreadsheet" ? "text-green-400" :
                        doc.file_type === "archive" ? "text-amber-400" :
                        doc.file_type === "video" ? "text-purple-400" :
                        doc.file_type === "audio" ? "text-pink-400" :
                        "text-white/60"
                      }`} />
                    )}
                    <p className="text-white text-sm font-medium truncate w-full" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-white/40 text-xs mt-1">{doc.size_formatted}</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-white/60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 z-50">
                      {canPreview(doc) && (
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                          className="text-white/80 focus:bg-white/10 focus:text-white"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Aperçu
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild className="text-white/80 focus:bg-white/10 focus:text-white">
                        <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); openRenameModal("document", doc); }}
                        className="text-white/80 focus:bg-white/10 focus:text-white"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Renommer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDelete("document", doc.id); }}
                        className="text-red-400 focus:bg-red-500/20 focus:text-red-400"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-white/60 text-sm font-medium">Nom</th>
                  <th className="text-left p-4 text-white/60 text-sm font-medium hidden md:table-cell">Type</th>
                  <th className="text-left p-4 text-white/60 text-sm font-medium hidden sm:table-cell">Taille</th>
                  <th className="text-left p-4 text-white/60 text-sm font-medium hidden lg:table-cell">Date</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {folders.map(folder => (
                  <tr
                    key={folder.id}
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                    className={`border-b border-white/5 cursor-pointer transition-colors ${
                      isSelected("folder", folder.id) ? "bg-indigo-600/20" : "hover:bg-white/5"
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5 text-indigo-400" />
                        <span className="text-white font-medium">{folder.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white/60 text-sm hidden md:table-cell">Dossier</td>
                    <td className="p-4 text-white/60 text-sm hidden sm:table-cell">{folder.file_count || 0} fichiers</td>
                    <td className="p-4 text-white/60 text-sm hidden lg:table-cell">
                      {new Date(folder.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-white/10">
                            <MoreVertical className="w-4 h-4 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 z-50">
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); openRenameModal("folder", folder); }}
                            className="text-white/80 focus:bg-white/10 focus:text-white"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Renommer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDelete("folder", folder.id); }}
                            className="text-red-400 focus:bg-red-500/20 focus:text-red-400"
                          >
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
                      onClick={() => setPreviewDoc(doc)}
                      className={`border-b border-white/5 cursor-pointer transition-colors ${
                        isSelected("document", doc.id) ? "bg-indigo-600/20" : "hover:bg-white/5"
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <FileIcon className="w-5 h-5 text-white/60" />
                          <span className="text-white">{doc.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-white/60 text-sm hidden md:table-cell capitalize">{doc.file_type}</td>
                      <td className="p-4 text-white/60 text-sm hidden sm:table-cell">{doc.size_formatted}</td>
                      <td className="p-4 text-white/60 text-sm hidden lg:table-cell">
                        {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-white/10">
                              <MoreVertical className="w-4 h-4 text-white/40" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 z-50">
                            {canPreview(doc) && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                                className="text-white/80 focus:bg-white/10 focus:text-white"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Aperçu
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild className="text-white/80 focus:bg-white/10 focus:text-white">
                              <a href={doc.url} download={doc.name} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); openRenameModal("document", doc); }}
                              className="text-white/80 focus:bg-white/10 focus:text-white"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Renommer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleDelete("document", doc.id); }}
                              className="text-red-400 focus:bg-red-500/20 focus:text-red-400"
                            >
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

      {/* New Folder Modal */}
      <Dialog open={newFolderModal} onOpenChange={setNewFolderModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nom du dossier"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-white/20 text-white">Annuler</Button>
            </DialogClose>
            <Button onClick={handleCreateFolder} className="bg-indigo-600">Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={uploadModal} onOpenChange={setUploadModal}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle>Uploader des fichiers</DialogTitle>
          </DialogHeader>
          
          <div
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-indigo-500/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files);
              if (files.length) handleUpload(files);
            }}
          >
            <Upload className="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p className="text-white/60 mb-2">Glissez-déposez vos fichiers ici</p>
            <p className="text-white/40 text-sm mb-4">ou</p>
            <Button
              onClick={() => document.getElementById('file-input').click()}
              variant="outline"
              className="border-white/20 text-white"
              disabled={uploading}
            >
              Parcourir
            </Button>
            <input
              id="file-input"
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
                <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <File className="w-4 h-4 text-white/60" />
                  <span className="flex-1 text-sm text-white truncate">{file.name}</span>
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
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Déplacer vers</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-64">
            <div className="space-y-1">
              <button
                onClick={() => setMoveTarget(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  moveTarget === null ? "bg-indigo-600/20 border border-indigo-500/50" : "hover:bg-white/5"
                }`}
              >
                <HardDrive className="w-5 h-5 text-white/60" />
                <span className="text-white">Racine (Mes Documents)</span>
              </button>
              {renderFolderTree(folderTree, 0)}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-white/20 text-white">Annuler</Button>
            </DialogClose>
            <Button onClick={handleMove} className="bg-indigo-600">Déplacer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal - Enhanced */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              {previewDoc?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewDoc && (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="bg-white/5 rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center">
                {previewDoc.file_type === "image" && previewDoc.url && (
                  <img 
                    src={previewDoc.url} 
                    alt={previewDoc.name} 
                    className="max-h-[60vh] max-w-full object-contain" 
                  />
                )}
                
                {previewDoc.file_type === "video" && previewDoc.url && (
                  <video 
                    src={previewDoc.url} 
                    controls 
                    className="max-h-[60vh] max-w-full"
                  >
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                )}
                
                {previewDoc.file_type === "audio" && previewDoc.url && (
                  <div className="w-full p-8">
                    <div className="flex items-center justify-center mb-4">
                      <FileAudio className="w-16 h-16 text-pink-400" />
                    </div>
                    <audio 
                      src={previewDoc.url} 
                      controls 
                      className="w-full"
                    >
                      Votre navigateur ne supporte pas la lecture audio.
                    </audio>
                  </div>
                )}
                
                {(previewDoc.content_type?.includes('pdf') || previewDoc.file_type === "document") && previewDoc.url && (
                  previewDoc.url.startsWith('data:') ? (
                    <div className="w-full h-[60vh]">
                      <iframe 
                        src={previewDoc.url}
                        className="w-full h-full border-0"
                        title={previewDoc.name}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-[60vh]">
                      <iframe 
                        src={previewDoc.url}
                        className="w-full h-full border-0"
                        title={previewDoc.name}
                      />
                    </div>
                  )
                )}
                
                {/* Fallback for non-previewable files */}
                {!['image', 'video', 'audio', 'document'].includes(previewDoc.file_type) && 
                 !previewDoc.content_type?.includes('pdf') && (
                  <div className="text-center p-8">
                    <File className="w-16 h-16 mx-auto text-white/30 mb-4" />
                    <p className="text-white/60">Aperçu non disponible pour ce type de fichier</p>
                    <p className="text-white/40 text-sm mt-1">Téléchargez le fichier pour le visualiser</p>
                  </div>
                )}
              </div>
              
              {/* File Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-white/5 rounded-lg p-4">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Taille</p>
                  <p className="text-white font-medium">{previewDoc.size_formatted}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Type</p>
                  <p className="text-white font-medium capitalize">{previewDoc.file_type}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Date</p>
                  <p className="text-white font-medium">{new Date(previewDoc.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Format</p>
                  <p className="text-white font-medium text-xs">{previewDoc.content_type}</p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button asChild className="flex-1 bg-indigo-600 hover:bg-indigo-500">
                  <a href={previewDoc.url} download={previewDoc.name} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
                <Button
                  onClick={() => { openRenameModal("document", previewDoc); setPreviewDoc(null); }}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Renommer
                </Button>
                <Button
                  onClick={() => { handleDelete("document", previewDoc.id); setPreviewDoc(null); }}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={renameModal} onOpenChange={(open) => { if (!open) { setRenameModal(false); setRenameItem(null); setNewName(""); } }}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-indigo-400" />
              Renommer {renameItem?.type === "folder" ? "le dossier" : "le fichier"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              {renameItem?.type === "folder" ? (
                <Folder className="w-6 h-6 text-indigo-400" />
              ) : (
                <File className="w-6 h-6 text-white/60" />
              )}
              <span className="text-white/60 text-sm truncate">{renameItem?.name}</span>
            </div>
            
            <div>
              <label className="text-white/60 text-sm mb-2 block">Nouveau nom</label>
              <Input
                placeholder="Entrez le nouveau nom"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-white/20 text-white" disabled={renaming}>
                Annuler
              </Button>
            </DialogClose>
            <Button onClick={handleRename} className="bg-indigo-600" disabled={renaming || !newName.trim()}>
              {renaming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Renommage...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Renommer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
