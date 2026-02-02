import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Calendar, Clock, ArrowLeft, Share2, User, MessageCircle, 
  Send, Heart, ThumbsUp, Copy, Check, Mail, ChevronRight,
  Bookmark, Eye
} from "lucide-react";
import { blogAPI } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import RichContentRenderer from "../components/RichContentRenderer";
import { toast } from "sonner";

// Social Icons SVG
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ name: "", email: "", content: "" });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await blogAPI.getOne(slug);
        setPost(response.data);
        
        // Fetch related posts
        try {
          const allPosts = await blogAPI.getAll();
          const related = allPosts.data
            .filter(p => p.slug !== slug && p.status === 'published')
            .slice(0, 3);
          setRelatedPosts(related);
        } catch (e) {}
        
        // Load comments from localStorage (or could be from API)
        const savedComments = localStorage.getItem(`blog-comments-${slug}`);
        if (savedComments) {
          setComments(JSON.parse(savedComments));
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = post?.title || '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  const shareLinks = [
    {
      name: "WhatsApp",
      icon: WhatsAppIcon,
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      color: "#25D366",
      bgColor: "bg-[#25D366]/10 hover:bg-[#25D366]/20"
    },
    {
      name: "Telegram",
      icon: TelegramIcon,
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      color: "#0088cc",
      bgColor: "bg-[#0088cc]/10 hover:bg-[#0088cc]/20"
    },
    {
      name: "Facebook",
      icon: FacebookIcon,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: "#1877F2",
      bgColor: "bg-[#1877F2]/10 hover:bg-[#1877F2]/20"
    },
    {
      name: "Twitter",
      icon: TwitterXIcon,
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      color: "#000000",
      bgColor: "bg-gray-100 hover:bg-gray-200"
    },
    {
      name: "LinkedIn",
      icon: LinkedInIcon,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      color: "#0A66C2",
      bgColor: "bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20"
    },
    {
      name: "Email",
      icon: () => <Mail className="w-5 h-5" />,
      url: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent('Je vous recommande cet article : ' + shareUrl)}`,
      color: "#EA4335",
      bgColor: "bg-[#EA4335]/10 hover:bg-[#EA4335]/20"
    }
  ];

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.name || !newComment.content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setSubmittingComment(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const comment = {
      id: Date.now().toString(),
      name: newComment.name,
      email: newComment.email,
      content: newComment.content,
      created_at: new Date().toISOString(),
      likes: 0,
      replies: [],
      replyTo: replyTo
    };

    const updatedComments = replyTo 
      ? comments.map(c => c.id === replyTo ? { ...c, replies: [...(c.replies || []), comment] } : c)
      : [...comments, comment];
    
    setComments(updatedComments);
    localStorage.setItem(`blog-comments-${slug}`, JSON.stringify(updatedComments));
    
    setNewComment({ name: "", email: "", content: "" });
    setReplyTo(null);
    setSubmittingComment(false);
    toast.success("Commentaire publié !");
  };

  const handleLikeComment = (commentId) => {
    const updatedComments = comments.map(c => 
      c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c
    );
    setComments(updatedComments);
    localStorage.setItem(`blog-comments-${slug}`, JSON.stringify(updatedComments));
  };

  // Calculate read time
  const calculateReadTime = (content) => {
    if (!content) return "5 min";
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen pt-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-6 bg-gray-200 animate-pulse rounded mb-4 w-1/4" />
          <div className="h-10 bg-gray-200 animate-pulse rounded mb-4" />
          <div className="aspect-[2/1] bg-gray-200 animate-pulse rounded-xl mb-8" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white min-h-screen pt-32 px-6 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article non trouvé</h1>
          <p className="text-gray-600 mb-6">L'article que vous recherchez n'existe pas ou a été supprimé.</p>
          <Link to="/blog">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const readTime = post.read_time || calculateReadTime(post.content || JSON.stringify(post.content_blocks));

  return (
    <div data-testid="blog-post-page" className="bg-white min-h-screen">
      {/* Article Header */}
      <article className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link 
              to="/actualites"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A1A1A] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux articles
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Category & Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {post.category && (
                <Badge className="bg-[#1A1A1A] text-white hover:bg-[#333] text-xs">
                  {post.category}
                </Badge>
              )}
              {post.tags?.map((tag, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className="text-gray-600 border-gray-300 text-xs"
                >
                  #{tag}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 
              data-testid="post-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight"
            >
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-gray-500 text-sm mb-8 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{post.author_name || "Alpha Agency"}</p>
                  <p className="text-xs text-gray-500">Auteur</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{readTime} de lecture</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>{comments.length} commentaire{comments.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Featured Image */}
        {(post.featured_image || post.image_url) && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="aspect-[2/1] rounded-2xl overflow-hidden shadow-xl"
            >
              <img 
                src={post.featured_image || post.image_url} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-indigo-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
          >
            {post.content_blocks && post.content_blocks.length > 0 ? (
              <div className="text-gray-700 [&_h1]:text-gray-900 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-gray-900 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_img]:rounded-xl [&_img]:shadow-lg">
                <RichContentRenderer blocks={post.content_blocks} />
              </div>
            ) : post.content ? (
              <div 
                dangerouslySetInnerHTML={{ __html: post.content }}
                className="text-gray-700 [&>h1]:text-gray-900 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mt-10 [&>h1]:mb-4 [&>h2]:text-gray-900 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>h3]:text-gray-900 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&>li]:mb-2"
              />
            ) : (
              <p className="text-gray-500 italic">Aucun contenu disponible.</p>
            )}
          </motion.div>
        </div>
      </article>

      {/* Share Section */}
      <section className="bg-gray-50 py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Partager cet article</h3>
                <p className="text-sm text-gray-500">Aidez-nous à diffuser ce contenu</p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${link.bgColor}`}
                  title={`Partager sur ${link.name}`}
                >
                  <div style={{ color: link.color }}>
                    <link.icon />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{link.name}</span>
                </a>
              ))}
              
              {/* Copy link button */}
              <button
                onClick={copyToClipboard}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
                title="Copier le lien"
              >
                <div className="text-gray-600">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </div>
                <span className="text-xs text-gray-600 font-medium">{copied ? "Copié !" : "Copier"}</span>
              </button>
            </div>

            {/* Instagram Note */}
            <p className="mt-4 text-xs text-gray-400 text-center">
              💡 Pour Instagram, copiez le lien et partagez-le dans votre story ou bio
            </p>
          </div>
        </div>
      </section>

      {/* Comments Section */}
      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Commentaires ({comments.length})</h3>
              <p className="text-sm text-gray-500">Partagez votre avis sur cet article</p>
            </div>
          </div>

          {/* Comment Form */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <h4 className="font-semibold text-gray-900 mb-4">
              {replyTo ? "Répondre au commentaire" : "Laisser un commentaire"}
            </h4>
            {replyTo && (
              <button 
                onClick={() => setReplyTo(null)}
                className="text-sm text-indigo-600 hover:underline mb-4"
              >
                ← Annuler la réponse
              </button>
            )}
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Votre nom"
                    value={newComment.name}
                    onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optionnel)
                  </label>
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={newComment.email}
                    onChange={(e) => setNewComment({ ...newComment, email: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Écrivez votre commentaire..."
                  value={newComment.content}
                  onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                  rows={4}
                  className="bg-white border-gray-300 text-gray-900 resize-none"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={submittingComment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submittingComment ? (
                  <>Envoi en cours...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publier le commentaire
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun commentaire pour le moment.</p>
                <p className="text-sm text-gray-400 mt-1">Soyez le premier à commenter cet article !</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {comment.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-gray-900">{comment.name}</span>
                          <span className="text-gray-400 text-sm ml-2">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{comment.content}</p>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleLikeComment(comment.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 text-sm transition-colors"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{comment.likes || 0}</span>
                        </button>
                        <button 
                          onClick={() => setReplyTo(comment.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 text-sm transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Répondre
                        </button>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">
                                  {reply.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-900 text-sm">{reply.name}</span>
                                <span className="text-gray-400 text-xs">{formatDate(reply.created_at)}</span>
                              </div>
                              <p className="text-gray-700 text-sm">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Articles similaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link 
                  key={relatedPost.id} 
                  to={`/blog/${relatedPost.slug}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  {(relatedPost.featured_image || relatedPost.image_url) && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img 
                        src={relatedPost.featured_image || relatedPost.image_url} 
                        alt={relatedPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                      {relatedPost.title}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-2">{relatedPost.excerpt}</p>
                    <div className="flex items-center gap-2 mt-3 text-indigo-600 text-sm font-medium">
                      Lire l'article
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Vous avez un projet ?
          </h3>
          <p className="text-white/80 mb-8">
            Discutons ensemble de vos besoins et trouvons la meilleure solution pour votre entreprise.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
              Contactez-nous
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogPostPage;
