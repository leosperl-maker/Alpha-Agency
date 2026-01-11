import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Download, File, FileText, Image as ImageIcon, Video, 
  Archive, Music, Clock, AlertCircle, CheckCircle2, 
  Loader2, User, ExternalLink, MessageSquare, Star, Send,
  Infinity, Eye
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TransferDownloadPage = () => {
  const { transferId } = useParams();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  
  // Comment form
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [commentRating, setCommentRating] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Preview
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    fetchTransfer();
  }, [transferId]);

  const fetchTransfer = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/transfers/public/${transferId}`);
      setTransfer(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Ce transfert n'existe pas ou a été supprimé.");
      } else {
        setError("Erreur lors du chargement du transfert.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-pink-500" />;
    if (type?.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
    if (type?.startsWith('audio/')) return <Music className="w-5 h-5 text-green-500" />;
    if (type?.includes('zip') || type?.includes('archive')) return <Archive className="w-5 h-5 text-yellow-500" />;
    if (type?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-blue-500" />;
  };

  const canPreview = (file) => {
    const type = file.type || '';
    return type.startsWith('image/') || type.startsWith('video/') || type.includes('pdf');
  };

  const downloadFile = async (file) => {
    setDownloading(file.name);
    try {
      await axios.post(`${API_URL}/api/transfers/public/${transferId}/download`);
      window.open(file.url, '_blank');
      toast.success(`Téléchargement de ${file.name} démarré`);
    } catch (err) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    setDownloading('all');
    try {
      await axios.post(`${API_URL}/api/transfers/public/${transferId}/download`);
      for (const file of transfer.files) {
        window.open(file.url, '_blank');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      toast.success("Téléchargement de tous les fichiers démarré");
    } catch (err) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(null);
    }
  };

  const submitComment = async () => {
    if (!commentName.trim() || !commentContent.trim()) {
      toast.error("Veuillez remplir votre nom et votre message");
      return;
    }
    
    setSubmittingComment(true);
    try {
      await axios.post(`${API_URL}/api/transfers/public/${transferId}/comment`, {
        author_name: commentName,
        author_email: commentEmail || null,
        content: commentContent,
        rating: commentRating > 0 ? commentRating : null
      });
      
      toast.success("Merci pour votre commentaire !");
      setCommentName("");
      setCommentEmail("");
      setCommentContent("");
      setCommentRating(0);
      setShowCommentForm(false);
      fetchTransfer(); // Refresh to show new comment
    } catch (err) {
      toast.error("Erreur lors de l'envoi du commentaire");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Oops !</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/">
            <Button className="bg-indigo-600 hover:bg-indigo-500">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (transfer?.is_expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Transfert expiré</h1>
          <p className="text-gray-600 mb-6">
            Ce transfert a expiré le {new Date(transfer.expires_at).toLocaleDateString('fr-FR')}.
            Demandez à l'expéditeur de vous renvoyer les fichiers.
          </p>
          <Link to="/">
            <Button className="bg-indigo-600 hover:bg-indigo-500">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_46adb236-f8e1-4856-a9f0-1ea29ce009cd/artifacts/kpvir23o_LOGO%20DEVIS%20FACTURES.png" 
              alt="Alphagency"
              className="h-10"
            />
          </Link>
          <a 
            href="https://alphagency.fr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white text-sm flex items-center gap-1"
          >
            alphagency.fr
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Transfer header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {transfer.title}
              </h1>
              <p className="text-white/80 text-sm flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                Envoyé par {transfer.sender_name}
              </p>
            </div>

            {/* Message if any */}
            {transfer.message && (
              <div className="px-6 py-4 bg-gray-50 border-b">
                <p className="text-gray-700 text-sm italic">"{transfer.message}"</p>
              </div>
            )}

            {/* Files list */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">
                  {transfer.files.length} fichier{transfer.files.length > 1 ? 's' : ''}
                </h2>
                <span className="text-sm text-gray-500">{transfer.total_size_formatted}</span>
              </div>

              <div className="space-y-2 mb-6">
                {transfer.files.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
                  >
                    {/* File preview thumbnail for images */}
                    {file.type?.startsWith('image/') ? (
                      <div 
                        className="w-10 h-10 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                        onClick={() => setPreviewFile(file)}
                      >
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-sm text-gray-500">{file.size_formatted}</p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {canPreview(file) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewFile(file)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(file)}
                        disabled={downloading === file.name}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {downloading === file.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Download all button */}
              <Button
                onClick={downloadAll}
                disabled={downloading !== null}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 h-12 text-lg"
              >
                {downloading === 'all' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Télécharger {transfer.files.length > 1 ? 'tout' : ''}
                  </>
                )}
              </Button>

              {/* Info footer */}
              <div className="mt-6 pt-4 border-t text-center">
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    {transfer.never_expires ? (
                      <>
                        <Infinity className="w-4 h-4" />
                        N'expire jamais
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        Expire le {new Date(transfer.expires_at).toLocaleDateString('fr-FR')}
                      </>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {transfer.download_count} téléchargement{transfer.download_count > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Comments section */}
            <div className="border-t p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Commentaires ({transfer.comments?.length || 0})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCommentForm(!showCommentForm)}
                >
                  Laisser un avis
                </Button>
              </div>

              {/* Comment form */}
              {showCommentForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Votre nom *"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      className="bg-white"
                    />
                    <Input
                      placeholder="Email (optionnel)"
                      type="email"
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <Textarea
                    placeholder="Votre message *"
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="bg-white min-h-[80px]"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500 mr-2">Note:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setCommentRating(star === commentRating ? 0 : star)}
                          className="p-0.5"
                        >
                          <Star 
                            className={`w-5 h-5 ${star <= commentRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                          />
                        </button>
                      ))}
                    </div>
                    <Button
                      onClick={submitComment}
                      disabled={submittingComment}
                      size="sm"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Envoyer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments list */}
              {transfer.comments && transfer.comments.length > 0 ? (
                <div className="space-y-3">
                  {transfer.comments.map((comment, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{comment.author_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {comment.rating && (
                        <div className="flex items-center gap-0.5 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className={`w-3 h-3 ${star <= comment.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucun commentaire pour le moment
                </p>
              )}
            </div>
          </div>

          {/* Branding footer */}
          <div className="text-center mt-8">
            <p className="text-white/60 text-sm">
              Envoyez vos propres fichiers gratuitement avec
            </p>
            <a 
              href="https://alphagency.fr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white font-semibold hover:underline"
            >
              Alphagency
            </a>
          </div>
        </div>
      </main>

      {/* File preview modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="font-medium text-gray-900 truncate">{previewFile.name}</span>
                <Button size="sm" variant="ghost" onClick={() => setPreviewFile(null)}>
                  ✕
                </Button>
              </div>
              <div className="p-4 flex items-center justify-center bg-gray-100 max-h-[70vh] overflow-auto">
                {previewFile.type?.startsWith('image/') && (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full" />
                )}
                {previewFile.type?.startsWith('video/') && (
                  <video src={previewFile.url} controls className="max-w-full max-h-full" />
                )}
                {previewFile.type?.includes('pdf') && (
                  <iframe src={previewFile.url} className="w-full h-[60vh]" />
                )}
              </div>
              <div className="p-3 border-t flex justify-end">
                <Button onClick={() => downloadFile(previewFile)}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferDownloadPage;
