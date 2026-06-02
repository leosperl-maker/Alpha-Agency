import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Send, Link2, Copy, Check, Trash2, FileText, Download,
  Clock, X, Loader2, Users, Inbox, Plus
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import api from "../../lib/api";
import { toast } from "sonner";

const fmtSize = (b) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
};
const fmtDate = (s) => { try { return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); } catch { return s; } };

const TransfersPage = () => {
  const [files, setFiles] = useState([]); // {id, name, size, status:'uploading'|'done'|'error', meta}
  const [recipients, setRecipients] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiry, setExpiry] = useState("7");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null); // {download_link, ...}
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const inputRef = useRef(null);

  const fetchMine = useCallback(async () => {
    try {
      const res = await api.get("/transfers/mine");
      setMine(res.data?.data || []);
    } catch (e) { /* not logged in / offline */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const uploadOne = async (file, localId) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/transfers/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setFiles((prev) => prev.map((f) => f.id === localId ? { ...f, status: "done", meta: res.data.file } : f));
    } catch (e) {
      setFiles((prev) => prev.map((f) => f.id === localId ? { ...f, status: "error" } : f));
      toast.error(`Échec de l'envoi de ${file.name}`);
    }
  };

  const addFiles = (fileList) => {
    const arr = Array.from(fileList);
    arr.forEach((file) => {
      const localId = `${file.name}-${file.size}-${Math.round(file.lastModified || 0)}-${files.length}`;
      setFiles((prev) => [...prev, { id: localId, name: file.name, size: file.size, status: "uploading", meta: null }]);
      uploadOne(file, localId);
    });
  };

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const uploadedMeta = files.filter((f) => f.status === "done").map((f) => f.meta);
  const anyUploading = files.some((f) => f.status === "uploading");
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  const create = async () => {
    if (uploadedMeta.length === 0) { toast.error("Ajoute au moins un fichier"); return; }
    if (!recipients.trim()) { toast.error("Indique au moins un email destinataire"); return; }
    setCreating(true);
    try {
      const form = new FormData();
      if (title.trim()) form.append("title", title.trim());
      if (message.trim()) form.append("message", message.trim());
      form.append("recipient_emails", recipients.trim());
      form.append("expires_in_days", expiry);
      form.append("files_json", JSON.stringify(uploadedMeta));
      const res = await api.post("/transfers/create", form, { headers: { "Content-Type": "multipart/form-data" } });
      setCreated(res.data.transfer);
      toast.success("Transfert créé et envoyé");
      setFiles([]); setRecipients(""); setTitle(""); setMessage(""); setExpiry("7");
      fetchMine();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création");
    } finally { setCreating(false); }
  };

  const copy = (link, id = "new") => {
    navigator.clipboard?.writeText(link);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1800);
    toast.success("Lien copié");
  };

  const remove = async (id) => {
    if (!window.confirm("Supprimer ce transfert ?")) return;
    try { await api.delete(`/transfers/${id}`); toast.success("Transfert supprimé"); setMine((p) => p.filter((t) => t.id !== id)); }
    catch (e) { toast.error("Erreur"); }
  };

  const totalDownloads = mine.reduce((s, t) => s + (t.download_count || 0), 0);

  return (
    <div data-testid="transfers-page" className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Transferts</h1>
        <p className="text-muted-foreground text-sm">Envoie des fichiers volumineux à tes clients — lien + email automatique, avec suivi des téléchargements.</p>
      </div>

      {/* Compact stats */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-baseline gap-2"><span className="text-muted-foreground text-xs">Transferts</span><span className="text-foreground font-bold font-mono text-base">{mine.length}</span></div>
        <div className="flex items-baseline gap-2"><span className="text-muted-foreground text-xs">Téléchargements</span><span className="text-foreground font-bold font-mono text-base">{totalDownloads}</span></div>
        <div className="flex items-baseline gap-2"><span className="text-muted-foreground text-xs">Actifs</span><span className="text-foreground font-bold font-mono text-base">{mine.filter((t) => !t.is_expired).length}</span></div>
      </div>

      {/* ===== New transfer ===== */}
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Nouveau transfert</h2>

        {created ? (
          <div className="rounded-2xl border border-success/30 bg-success-soft p-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-success-soft text-success flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6" /></div>
            <p className="text-foreground font-medium">Transfert envoyé à {created.recipient_count} destinataire{created.recipient_count > 1 ? "s" : ""}</p>
            <div className="mt-3 flex items-center gap-2 max-w-md mx-auto">
              <Input readOnly value={created.download_link} className="text-sm" />
              <Button onClick={() => copy(created.download_link)} variant="outline" className="border-border flex-shrink-0">
                {copiedId === "new" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button onClick={() => setCreated(null)} variant="ghost" className="mt-3 text-primary hover:bg-brand-soft"><Plus className="w-4 h-4 mr-1" /> Nouveau transfert</Button>
          </div>
        ) : (
          <>
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-brand-soft" : "border-border hover:border-primary/40 hover:bg-secondary"}`}
            >
              <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <div className="w-12 h-12 rounded-2xl bg-brand-soft text-primary flex items-center justify-center mx-auto mb-3"><Upload className="w-6 h-6" /></div>
              <p className="text-foreground font-medium text-sm">Glisse tes fichiers ici, ou clique pour parcourir</p>
              <p className="text-muted-foreground text-xs mt-1">Plusieurs fichiers possibles · gros fichiers supportés</p>
            </div>

            {/* Selected files */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary">
                    <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0 text-muted-foreground"><FileText className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{fmtSize(f.size)}</p>
                    </div>
                    {f.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {f.status === "done" && <Check className="w-4 h-4 text-success" />}
                    {f.status === "error" && <X className="w-4 h-4 text-danger" />}
                    <button onClick={() => removeFile(f.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-right">{files.length} fichier{files.length > 1 ? "s" : ""} · {fmtSize(totalSize)}</p>
              </div>
            )}

            {/* Form */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Destinataires *</Label>
                <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="client@email.com, autre@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Titre (optionnel)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Logos finaux" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Expiration</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="14">14 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="0">Jamais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Message (optionnel)</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Un petit mot pour le client…" className="resize-none" />
              </div>
            </div>

            <Button onClick={create} disabled={creating || anyUploading || uploadedMeta.length === 0} className="w-full">
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi…</> : <><Send className="w-4 h-4 mr-2" /> Créer le transfert et envoyer</>}
            </Button>
          </>
        )}
      </section>

      {/* ===== My transfers (tracking) ===== */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-2.5 px-1 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Mes transferts</h2>
        {loading ? (
          <div className="space-y-2.5">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-card border border-border animate-pulse rounded-2xl" />)}</div>
        ) : mine.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Aucun transfert pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {mine.map((t) => (
              <div key={t.id} className="bg-card border border-border rounded-2xl p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-soft text-primary flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      {t.is_expired
                        ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-danger-soft text-danger">Expiré</span>
                        : <span className="text-[11px] px-2 py-0.5 rounded-full bg-success-soft text-success">Actif</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {(t.files?.length || 0)} fichier{(t.files?.length || 0) > 1 ? "s" : ""} · {t.total_size_formatted} · {fmtDate(t.created_at)}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground text-xs mr-1" title="Téléchargements">
                    <Download className="w-3.5 h-3.5" /> {t.download_count || 0}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => copy(t.download_link, t.id)} title="Copier le lien" className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary">
                      {copiedId === t.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    </button>
                    <a href={t.download_link} target="_blank" rel="noreferrer" title="Ouvrir" className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary"><Download className="w-4 h-4" /></a>
                    <button onClick={() => remove(t.id)} title="Supprimer" className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-secondary"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TransfersPage;
