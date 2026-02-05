import { useState, useEffect } from "react";
import { HardDrive, Check, X, RefreshCw, Upload, FolderOpen, File } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const MoltBotDriveSection = () => {
  const [driveStatus, setDriveStatus] = useState({ connected: false, loading: true });
  const [files, setFiles] = useState([]);
  const [showFiles, setShowFiles] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    checkDriveStatus();
    
    // Check URL params for connection result
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive_connected') === 'true') {
      toast.success("Google Drive connecté !");
      checkDriveStatus();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('drive_error')) {
      toast.error(`Erreur Drive: ${params.get('drive_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkDriveStatus = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${API}/api/drive/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setDriveStatus({ connected: data.connected, loading: false });
      } else {
        setDriveStatus({ connected: false, loading: false });
      }
    } catch (error) {
      console.error("Drive status error:", error);
      setDriveStatus({ connected: false, loading: false });
    }
  };

  const connectDrive = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${API}/api/drive/connect`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
        }
      } else {
        toast.error("Erreur lors de la connexion à Google Drive");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    }
  };

  const disconnectDrive = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      await fetch(`${API}/api/drive/disconnect`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setDriveStatus({ connected: false, loading: false });
      setFiles([]);
      setShowFiles(false);
      toast.success("Google Drive déconnecté");
    } catch (error) {
      toast.error("Erreur de déconnexion");
    }
  };

  const loadDriveFiles = async () => {
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${API}/api/drive/files?page_size=10`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setShowFiles(true);
      }
    } catch (error) {
      toast.error("Erreur chargement fichiers");
    }
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const importSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Sélectionnez au moins un fichier");
      return;
    }

    setImporting(true);
    try {
      const token = localStorage.getItem("alpha_token");
      const res = await fetch(`${API}/api/drive/import`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file_ids: selectedFiles,
          auto_classify: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.imported_count} fichier(s) importé(s) avec classification automatique`);
        setSelectedFiles([]);
        setShowFiles(false);
      } else {
        toast.error("Erreur lors de l'import");
      }
    } catch (error) {
      toast.error("Erreur d'import");
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('folder')) return <FolderOpen className="w-3 h-3 text-amber-400" />;
    if (mimeType?.includes('image')) return <File className="w-3 h-3 text-green-400" />;
    if (mimeType?.includes('pdf')) return <File className="w-3 h-3 text-red-400" />;
    if (mimeType?.includes('document') || mimeType?.includes('word')) return <File className="w-3 h-3 text-blue-400" />;
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <File className="w-3 h-3 text-green-500" />;
    return <File className="w-3 h-3 text-white/50" />;
  };

  return (
    <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
      <h3 className="text-white font-medium mb-1.5 flex items-center gap-2 text-xs">
        <HardDrive className="w-3.5 h-3.5 text-blue-400" />
        Google Drive
        {driveStatus.connected && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-green-400">
            <Check className="w-2.5 h-2.5" /> Connecté
          </span>
        )}
      </h3>

      {driveStatus.loading ? (
        <div className="flex items-center justify-center py-2">
          <RefreshCw className="w-4 h-4 text-white/50 animate-spin" />
        </div>
      ) : driveStatus.connected ? (
        <div className="space-y-2">
          <p className="text-white/50 text-[10px]">
            Import auto avec classification IA.
          </p>
          
          <div className="flex gap-1">
            <Button 
              size="sm" 
              onClick={loadDriveFiles}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-[10px] h-7"
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              Voir fichiers
            </Button>
            <Button 
              size="sm" 
              onClick={disconnectDrive}
              variant="outline"
              className="bg-transparent border-white/20 hover:bg-white/10 text-white/70 text-[10px] h-7 px-2"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Files List */}
          {showFiles && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {files.length === 0 ? (
                <p className="text-white/40 text-[10px] text-center py-2">Aucun fichier</p>
              ) : (
                <>
                  {files.map(file => (
                    <div 
                      key={file.id}
                      onClick={() => !file.mimeType?.includes('folder') && toggleFileSelection(file.id)}
                      className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                        selectedFiles.includes(file.id) 
                          ? 'bg-blue-600/30 border border-blue-500/50' 
                          : 'bg-white/5 hover:bg-white/10'
                      } ${file.mimeType?.includes('folder') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {getFileIcon(file.mimeType)}
                      <span className="text-white/80 text-[10px] truncate flex-1">
                        {file.name}
                      </span>
                      {selectedFiles.includes(file.id) && (
                        <Check className="w-3 h-3 text-blue-400" />
                      )}
                    </div>
                  ))}
                  
                  {selectedFiles.length > 0 && (
                    <Button 
                      size="sm"
                      onClick={importSelectedFiles}
                      disabled={importing}
                      className="w-full mt-2 bg-green-600 hover:bg-green-500 text-[10px] h-7"
                    >
                      {importing ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3 mr-1" />
                      )}
                      Importer {selectedFiles.length} fichier(s)
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-white/50 text-[10px] mb-2">
            Importez vos documents avec classification IA automatique.
          </p>
          <Button 
            size="sm" 
            onClick={connectDrive}
            className="w-full bg-blue-600 hover:bg-blue-500 text-[10px] h-7"
          >
            <HardDrive className="w-3 h-3 mr-1" />
            Connecter Google Drive
          </Button>
        </>
      )}
    </div>
  );
};

export default MoltBotDriveSection;
