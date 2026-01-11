import { useState, useEffect, useCallback } from "react";
import { 
  Upload, Send, Loader2, X, File, FileText, Image as ImageIcon,
  Video, Archive, Music, Plus, Trash2, Check, Link, Mail, Clock,
  Download, Eye, Copy, ChevronDown, AlertCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { transfersAPI } from "../../lib/api";

const TransfersPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [emails, setEmails] = useState("");
  const [expiresIn, setExpiresIn] = useState("7");
  
  // Transfers list
  const [transfers, setTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Success modal
  const [successModal, setSuccessModal] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTransfers();
    fetchStats();
  }, []);

  const fetchTransfers = async () => {
    try {
      const res = await transfersAPI.getMyTransfers();
      setTransfers(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await transfersAPI.getStats();
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-pink-400" />;
    if (type?.startsWith('video/')) return <Video className="w-5 h-5 text-purple-400" />;
    if (type?.startsWith('audio/')) return <Music className="w-5 h-5 text-green-400" />;
    if (type?.includes('zip') || type?.includes('archive')) return <Archive className="w-5 h-5 text-yellow-400" />;
    if (type?.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
    return <File className="w-5 h-5 text-blue-400" />;
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending'
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadAllFiles = async () => {
    if (files.length === 0) return [];
    
    setUploading(true);
    const uploaded = [];
    
    for (const fileObj of files) {
      if (fileObj.status === 'uploaded') {
        // Already uploaded, skip
        const existing = uploadedFiles.find(f => f.id === fileObj.id);
        if (existing) uploaded.push(existing);
        continue;
      }
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileObj.id]: 0 }));
        
        const res = await transfersAPI.uploadFile(
          fileObj.file,
          null,
          (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [fileObj.id]: progress }));
          }
        );
        
        if (res.data?.success && res.data?.file) {
          const uploadedFile = { ...res.data.file, id: fileObj.id };
          uploaded.push(uploadedFile);
          
          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id ? { ...f, status: 'uploaded' } : f
          ));
        }
      } catch (error) {
        console.error(`Error uploading ${fileObj.name}:`, error);
        toast.error(`Erreur lors de l'upload de ${fileObj.name}`);
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error' } : f
        ));
      }
    }
    
    setUploadedFiles(uploaded);
    setUploading(false);
    return uploaded;
  };

  const handleSend = async () => {
    // Validate emails
    const emailList = emails.split(',').map(e => e.trim()).filter(e => e);
    if (emailList.length === 0) {
      toast.error("Veuillez ajouter au moins un email destinataire");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emailList.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast.error(`Emails invalides: ${invalidEmails.join(', ')}`);
      return;
    }
    
    if (files.length === 0) {
      toast.error("Veuillez ajouter au moins un fichier");
      return;
    }
    
    setSending(true);
    
    try {
      // First upload all files
      const uploaded = await uploadAllFiles();
      
      if (uploaded.length === 0) {
        toast.error("Aucun fichier n'a pu être uploadé");
        setSending(false);
        return;
      }
      
      // Create transfer
      const res = await transfersAPI.create({
        title: title || null,
        message: message || null,
        recipient_emails: emailList,
        expires_in_days: parseInt(expiresIn),
        files: uploaded
      });
      
      if (res.data?.success) {
        setSuccessModal(res.data.transfer);
        
        // Reset form
        setFiles([]);
        setUploadedFiles([]);
        setUploadProgress({});
        setTitle("");
        setMessage("");
        setEmails("");
        
        // Refresh lists
        fetchTransfers();
        fetchStats();
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("Erreur lors de la création du transfert");
    } finally {
      setSending(false);
    }
  };

  const deleteTransfer = async (id) => {
    if (!window.confirm("Supprimer ce transfert ?")) return;
    
    try {
      await transfersAPI.delete(id);
      toast.success("Transfert supprimé");
      fetchTransfers();
      fetchStats();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié !");
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div data-testid="transfers-page" className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Transfert de fichiers</h1>
          <p className="text-sm text-white/60">Envoyez des fichiers volumineux par email</p>
        </div>
        
        {stats && (
          <div className="flex gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
              <span className="text-xs text-white/60">Transferts actifs</span>
              <p className="text-lg font-bold text-indigo-400">{stats.active_transfers}</p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
              <span className="text-xs text-white/60">Téléchargements</span>
              <p className="text-lg font-bold text-cyan-400">{stats.total_downloads}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Zone */}
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              Nouveau transfert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : 'border-white/20 hover:border-indigo-500/50 hover:bg-white/5'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-indigo-400' : 'text-white/40'}`} />
              <p className="text-white/80 font-medium">
                {isDragActive ? "Déposez les fichiers ici" : "Glissez-déposez vos fichiers ici"}
              </p>
              <p className="text-white/50 text-sm mt-1">ou cliquez pour sélectionner</p>
              <p className="text-white/40 text-xs mt-2">Jusqu'à 2 Go par fichier</p>
            </div>

            {/* Files list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{files.length} fichier(s)</span>
                  <span className="text-white/60">{formatSize(totalSize)}</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {files.map(fileObj => (
                    <div 
                      key={fileObj.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10"
                    >
                      {getFileIcon(fileObj.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{fileObj.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50">{formatSize(fileObj.size)}</span>
                          {uploadProgress[fileObj.id] !== undefined && uploadProgress[fileObj.id] < 100 && (
                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 transition-all"
                                style={{ width: `${uploadProgress[fileObj.id]}%` }}
                              />
                            </div>
                          )}
                          {fileObj.status === 'uploaded' && (
                            <Check className="w-3 h-3 text-green-400" />
                          )}
                          {fileObj.status === 'error' && (
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(fileObj.id)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <X className="w-4 h-4 text-white/40 hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-white/70 text-xs">Titre (optionnel)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Maquettes projet Alpha"
                  className="bg-white/5 border-white/10 text-white placeholder-white/30"
                />
              </div>
              
              <div>
                <Label className="text-white/70 text-xs">Message (optionnel)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ajoutez un message personnel..."
                  className="bg-white/5 border-white/10 text-white placeholder-white/30 min-h-[60px]"
                />
              </div>
              
              <div>
                <Label className="text-white/70 text-xs">Emails des destinataires *</Label>
                <Input
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="bg-white/5 border-white/10 text-white placeholder-white/30"
                />
                <p className="text-[10px] text-white/40 mt-1">Séparez les emails par des virgules</p>
              </div>
              
              <div>
                <Label className="text-white/70 text-xs">Expiration</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-white/10">
                    <SelectItem value="1" className="text-white hover:bg-white/10">1 jour</SelectItem>
                    <SelectItem value="3" className="text-white hover:bg-white/10">3 jours</SelectItem>
                    <SelectItem value="7" className="text-white hover:bg-white/10">7 jours</SelectItem>
                    <SelectItem value="14" className="text-white hover:bg-white/10">14 jours</SelectItem>
                    <SelectItem value="30" className="text-white hover:bg-white/10">30 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={files.length === 0 || !emails.trim() || sending || uploading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 h-11"
            >
              {sending || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Upload en cours...' : 'Envoi...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer les fichiers
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Transfers list */}
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Historique des transferts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
              </div>
            ) : transfers.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Aucun transfert</p>
                <p className="text-xs mt-1">Créez votre premier transfert</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {transfers.map(transfer => (
                  <div
                    key={transfer.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      transfer.is_expired 
                        ? 'bg-red-500/5 border-red-500/20' 
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-white truncate">{transfer.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-white/50">
                          <span>{transfer.files?.length || 0} fichier(s)</span>
                          <span>{transfer.total_size_formatted}</span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {transfer.download_count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={transfer.is_expired 
                              ? "border-red-500/30 text-red-400 text-[10px]"
                              : "border-green-500/30 text-green-400 text-[10px]"
                            }
                          >
                            {transfer.is_expired ? 'Expiré' : 'Actif'}
                          </Badge>
                          <span className="text-[10px] text-white/40">
                            {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyLink(transfer.download_link)}
                          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"
                          title="Copier le lien"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(transfer.download_link, '_blank')}
                          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTransfer(transfer.id)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-white/60 hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Recipients */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {transfer.recipient_emails?.slice(0, 3).map((email, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/60">
                          <Mail className="w-2.5 h-2.5" />
                          {email}
                        </span>
                      ))}
                      {transfer.recipient_emails?.length > 3 && (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-white/40">
                          +{transfer.recipient_emails.length - 3} autres
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Modal */}
      <Dialog open={!!successModal} onOpenChange={() => setSuccessModal(null)}>
        <DialogContent className="bg-[#12121f] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              Transfert envoyé !
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <p className="text-white/70">
              Votre transfert "<span className="text-white font-medium">{successModal?.title}</span>" 
              a été envoyé à {successModal?.recipient_count} destinataire(s).
            </p>
            
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <Label className="text-white/60 text-xs">Lien de téléchargement</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={successModal?.download_link || ''}
                  readOnly
                  className="bg-white/5 border-white/10 text-white text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(successModal?.download_link);
                    toast.success("Lien copié !");
                  }}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-white/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Expire le {successModal?.expires_at ? new Date(successModal.expires_at).toLocaleDateString('fr-FR') : ''}
            </p>
            
            <Button
              onClick={() => setSuccessModal(null)}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransfersPage;
