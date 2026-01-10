import { useState, useEffect } from "react";
import { Database, Cloud, Mail, Clock, Play, CheckCircle, AlertCircle, RefreshCw, History, Settings, Loader2, Server } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { backupAPI } from "../../lib/api";

const BackupPage = () => {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        backupAPI.getStatus(),
        backupAPI.getHistory(10)
      ]);
      setStatus(statusRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const triggerBackup = async () => {
    setBackingUp(true);
    try {
      const response = await backupAPI.triggerManual();
      toast.success("Backup lancé avec succès !");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors du backup");
    } finally {
      setBackingUp(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white/5 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sauvegardes</h1>
          <p className="text-white/60">Gestion des sauvegardes automatiques de la base de données</p>
        </div>
        <Button 
          onClick={triggerBackup} 
          disabled={backingUp}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {backingUp ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sauvegarde en cours...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Backup manuel
            </>
          )}
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${status?.system_active ? 'bg-green-100' : 'bg-red-100'}`}>
                <Server className={`w-5 h-5 ${status?.system_active ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-white/60">Système</p>
                <p className="font-bold text-white">
                  {status?.system_active ? 'Actif' : 'Inactif'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${status?.dropbox_configured ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Cloud className={`w-5 h-5 ${status?.dropbox_configured ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-white/60">Dropbox</p>
                <p className="font-bold text-white">
                  {status?.dropbox_configured ? 'Configuré' : 'Non configuré'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${status?.email_configured ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Mail className={`w-5 h-5 ${status?.email_configured ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-white/60">Email</p>
                <p className="font-bold text-white">
                  {status?.email_configured ? 'Configuré' : 'Non configuré'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-indigo-600/10">
                <Database className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total backups</p>
                <p className="font-bold text-white">{status?.total_backups || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-white/60" />
                <span className="text-white">Fréquence</span>
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-none">
                {status?.schedule || "Toutes les 6 heures"}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-white/60" />
                <span className="text-white">Destinataire</span>
              </div>
              <span className="text-white/60 text-sm">{status?.email_recipient || "Non configuré"}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-white/60" />
                <span className="text-white">Rétention</span>
              </div>
              <Badge className="bg-gray-100 text-gray-700 border-none">
                {status?.retention_days || 30} jours
              </Badge>
            </div>
            
            {status?.scheduler?.next_run && (
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-green-600" />
                  <span className="text-white">Prochain backup</span>
                </div>
                <span className="text-green-600 font-medium text-sm">
                  {formatDate(status.scheduler.next_run)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Backup */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Dernier backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.last_backup ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Date</span>
                  <span className="font-medium text-white">{formatDate(status.last_backup.started_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Type</span>
                  <Badge className={status.last_backup.manual ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>
                    {status.last_backup.manual ? "Manuel" : "Automatique"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Statut</span>
                  <Badge className={
                    status.last_backup.status === "completed" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"
                  }>
                    {status.last_backup.status === "completed" ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Réussi</>
                    ) : (
                      <><AlertCircle className="w-3 h-3 mr-1" /> Échoué</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Taille</span>
                  <span className="font-medium text-white">{formatSize(status.last_backup.file_size)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Dropbox</span>
                  {status.last_backup.dropbox_uploaded ? (
                    <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Uploadé</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700">Non uploadé</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Email</span>
                  {status.last_backup.email_sent ? (
                    <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Envoyé</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700">Non envoyé</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-white/60">
                <Database className="w-12 h-12 mx-auto mb-3 text-[#E5E5E5]" />
                <p>Aucun backup effectué</p>
                <p className="text-sm mt-1">Cliquez sur "Backup manuel" pour créer le premier backup</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des sauvegardes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-white/60 py-8">Aucun historique disponible</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-white/10">
                    <th className="pb-3 text-white/60 font-medium">Date</th>
                    <th className="pb-3 text-white/60 font-medium">Type</th>
                    <th className="pb-3 text-white/60 font-medium">Statut</th>
                    <th className="pb-3 text-white/60 font-medium">Taille</th>
                    <th className="pb-3 text-white/60 font-medium">Dropbox</th>
                    <th className="pb-3 text-white/60 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((backup, index) => (
                    <tr key={backup.backup_id || index} className="border-b border-white/10 last:border-0">
                      <td className="py-3 text-white">{formatDate(backup.started_at)}</td>
                      <td className="py-3">
                        <Badge className={backup.manual ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>
                          {backup.manual ? "Manuel" : "Auto"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {backup.status === "completed" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                      </td>
                      <td className="py-3 text-white/60">{formatSize(backup.file_size)}</td>
                      <td className="py-3">
                        {backup.dropbox_uploaded ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-white/60">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        {backup.email_sent ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <span className="text-white/60">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupPage;
