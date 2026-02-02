import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, ArrowLeft, Share2, User, MessageCircle, 
  Send, Heart, ThumbsUp, Copy, Check, Mail, ChevronRight,
  ChevronLeft, Bookmark, Eye, Printer, Link as LinkIcon,
  X, ZoomIn, Flame, Sparkles, List, ArrowUp
} from "lucide-react";
import { blogAPI } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  
  // Reading progress
  const [readingProgress, setReadingProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(null);
  const articleRef = useRef(null);
  
  // Table of contents
  const [tableOfContents, setTableOfContents] = useState([]);
  const [showTOC, setShowTOC] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  
  // Reactions
  const [reactions, setReactions] = useState({ like: 0, love: 0, fire: 0 });
  const [userReaction, setUserReaction] = useState(null);
  
  // Floating share bar
  const [showFloatingShare, setShowFloatingShare] = useState(false);
  
  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState(null);
  
  // Back to top
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ name: "", email: "", content: "" });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  // Navigation
  const [prevPost, setPrevPost] = useState(null);
  const [nextPost, setNextPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await blogAPI.getOne(slug);
        setPost(response.data);
        
        // Fetch all posts for navigation and related
        try {
          const allPostsRes = await blogAPI.getAll();
          const posts = allPostsRes.data || [];
          setAllPosts(posts);
          
          // Find prev/next posts
          const currentIndex = posts.findIndex(p => p.slug === slug);
          if (currentIndex > 0) {
            setNextPost(posts[currentIndex - 1]);
          }
          if (currentIndex < posts.length - 1) {
            setPrevPost(posts[currentIndex + 1]);
          }
          
          // Related posts (same category or tags)
          const related = posts
            .filter(p => p.slug !== slug && p.status === 'published')
            .slice(0, 3);
          setRelatedPosts(related);
        } catch (e) {}
        
        // Load comments
        const savedComments = localStorage.getItem(`blog-comments-${slug}`);
        if (savedComments) {
          setComments(JSON.parse(savedComments));
        }
        
        // Load reactions
        const savedReactions = localStorage.getItem(`blog-reactions-${slug}`);
        if (savedReactions) {
          setReactions(JSON.parse(savedReactions));
        }
        const savedUserReaction = localStorage.getItem(`blog-user-reaction-${slug}`);
        if (savedUserReaction) {
          setUserReaction(savedUserReaction);
        }
        
        // Extract table of contents from content blocks
        if (response.data.content_blocks) {
          const headings = response.data.content_blocks
            .filter(block => block.type === 'heading' && (block.level === 2 || block.level === 3))
            .map((block, index) => ({
              id: `heading-${index}`,
              text: block.content,
              level: block.level
            }));
          setTableOfContents(headings);
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  // Reading progress & remaining time calculation
  useEffect(() => {
    const handleScroll = () => {
      if (!articleRef.current) return;
      
      const article = articleRef.current;
      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      
      // Calculate progress
      const start = articleTop - windowHeight;
      const end = articleTop + articleHeight - windowHeight;
      const progress = Math.min(100, Math.max(0, ((scrollTop - start) / (end - start)) * 100));
      setReadingProgress(progress);
      
      // Calculate remaining time
      const totalWords = post?.content_blocks?.reduce((acc, block) => {
        return acc + (block.content?.split(/\s+/).length || 0);
      }, 0) || 1000;
      const wordsPerMinute = 200;
      const totalMinutes = totalWords / wordsPerMinute;
      const remainingMinutes = Math.ceil(totalMinutes * (1 - progress / 100));
      setRemainingTime(remainingMinutes > 0 ? remainingMinutes : 0);
      
      // Show floating share bar after scrolling 300px
      setShowFloatingShare(scrollTop > 300);
      
      // Show back to top after 500px
      setShowBackToTop(scrollTop > 500);
      
      // Active section detection
      const headingElements = document.querySelectorAll('[data-heading-id]');
      headingElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 0) {
          setActiveSection(el.dataset.headingId);
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post]);

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

  const copyToClipboard = async (text = shareUrl) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  const copyAnchorLink = (headingId) => {
    const url = `${window.location.origin}${window.location.pathname}#${headingId}`;
    copyToClipboard(url);
  };

  const scrollToSection = (headingId) => {
    const element = document.querySelector(`[data-heading-id="${headingId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowTOC(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReaction = (type) => {
    if (userReaction === type) {
      // Remove reaction
      setReactions(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      setUserReaction(null);
      localStorage.removeItem(`blog-user-reaction-${slug}`);
    } else {
      // Change reaction
      if (userReaction) {
        setReactions(prev => ({ ...prev, [userReaction]: Math.max(0, prev[userReaction] - 1) }));
      }
      setReactions(prev => ({ ...prev, [type]: prev[type] + 1 }));
      setUserReaction(type);
      localStorage.setItem(`blog-user-reaction-${slug}`, type);
    }
    
    // Save reactions
    setTimeout(() => {
      const currentReactions = { ...reactions };
      if (userReaction === type) {
        currentReactions[type] = Math.max(0, currentReactions[type] - 1);
      } else {
        if (userReaction) currentReactions[userReaction] = Math.max(0, currentReactions[userReaction] - 1);
        currentReactions[type] = currentReactions[type] + 1;
      }
      localStorage.setItem(`blog-reactions-${slug}`, JSON.stringify(currentReactions));
    }, 0);
  };

  const handlePrint = () => {
    window.print();
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
          <Link to="/actualites">
            <Button className="bg-[#1A1A1A] hover:bg-[#333] text-white rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux articles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const readTime = post.read_time || calculateReadTime(post.content || JSON.stringify(post.content_blocks));

  return (
    <div data-testid="blog-post-page" className="bg-white min-h-screen print:bg-white">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50 print:hidden">
        <motion.div 
          className="h-full bg-[#CE0202]"
          style={{ width: `${readingProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Floating Share Bar (Left Side) */}
      <AnimatePresence>
        {showFloatingShare && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="fixed left-4 top-1/3 z-40 hidden lg:flex flex-col gap-2 print:hidden"
          >
            {shareLinks.slice(0, 4).map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center hover:scale-110 transition-transform"
                style={{ color: link.color }}
                title={link.name}
              >
                <link.icon />
              </a>
            ))}
            <button
              onClick={() => copyToClipboard()}
              className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center hover:scale-110 transition-transform text-gray-600"
              title="Copier le lien"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table of Contents Button (Right Side) */}
      {tableOfContents.length > 0 && (
        <motion.button
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: showFloatingShare ? 1 : 0, x: showFloatingShare ? 0 : 50 }}
          onClick={() => setShowTOC(true)}
          className="fixed right-4 top-1/3 z-40 hidden lg:flex items-center gap-2 px-4 py-2 bg-white shadow-lg border border-gray-100 rounded-full hover:bg-gray-50 transition-colors print:hidden"
        >
          <List className="w-4 h-4" />
          <span className="text-sm font-medium">Sommaire</span>
        </motion.button>
      )}

      {/* Table of Contents Modal */}
      <AnimatePresence>
        {showTOC && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden"
            onClick={() => setShowTOC(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Sommaire</h3>
                <button onClick={() => setShowTOC(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-2">
                {tableOfContents.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeSection === item.id 
                        ? 'bg-[#CE0202]/10 text-[#CE0202]' 
                        : 'hover:bg-gray-100 text-gray-700'
                    } ${item.level === 3 ? 'pl-6 text-sm' : 'font-medium'}`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 print:hidden"
            onClick={() => setLightboxImage(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white/80 hover:text-white"
              onClick={() => setLightboxImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={lightboxImage}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-[#1A1A1A] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#333] transition-colors print:hidden"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Article Header */}
      <article ref={articleRef} className="pt-28 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Back link + Print */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between mb-6 print:hidden"
          >
            <Link 
              to="/actualites"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A1A1A] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux articles
            </Link>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1A1A1A] transition-colors text-sm"
              title="Imprimer l'article"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Category & Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
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
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
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
              {remainingTime !== null && remainingTime > 0 && (
                <div className="flex items-center gap-2 text-[#CE0202] print:hidden">
                  <span className="text-xs font-medium">{remainingTime} min restantes</span>
                </div>
              )}
              <div className="flex items-center gap-2 print:hidden">
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
              className="aspect-[2/1] rounded-2xl overflow-hidden shadow-xl cursor-zoom-in print:shadow-none print:rounded-none"
              onClick={() => setLightboxImage(post.featured_image || post.image_url)}
            >
              <img 
                src={post.featured_image || post.image_url} 
                alt={post.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
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
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[#CE0202] prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
          >
            {post.content_blocks && post.content_blocks.length > 0 ? (
              <div className="text-gray-700 [&_h1]:text-gray-900 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:scroll-mt-24 [&_h3]:text-gray-900 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:scroll-mt-24 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#CE0202] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_img]:rounded-xl [&_img]:shadow-lg [&_img]:cursor-zoom-in">
                {post.content_blocks.map((block, index) => {
                  // Add heading ID for TOC
                  if (block.type === 'heading' && (block.level === 2 || block.level === 3)) {
                    const headingId = `heading-${tableOfContents.findIndex(t => t.text === block.content)}`;
                    const HeadingTag = block.level === 2 ? 'h2' : 'h3';
                    return (
                      <div key={index} className="group relative">
                        <HeadingTag 
                          data-heading-id={headingId}
                          className={`${block.level === 2 ? 'text-2xl font-bold mt-8 mb-4' : 'text-xl font-semibold mt-6 mb-3'} text-gray-900 scroll-mt-24`}
                        >
                          {block.content}
                          <button
                            onClick={() => copyAnchorLink(headingId)}
                            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#CE0202] print:hidden"
                            title="Copier le lien"
                          >
                            <LinkIcon className="w-4 h-4 inline" />
                          </button>
                        </HeadingTag>
                      </div>
                    );
                  }
                  
                  if (block.type === 'text') {
                    return <p key={index} className="mb-4 leading-relaxed">{block.content}</p>;
                  }
                  
                  if (block.type === 'image') {
                    return (
                      <div key={index} className="my-6">
                        <img 
                          src={block.url} 
                          alt={block.caption || ''} 
                          className="rounded-xl shadow-lg cursor-zoom-in hover:scale-[1.02] transition-transform"
                          onClick={() => setLightboxImage(block.url)}
                        />
                        {block.caption && (
                          <p className="text-center text-sm text-gray-500 mt-2">{block.caption}</p>
                        )}
                      </div>
                    );
                  }
                  
                  if (block.type === 'quote') {
                    return (
                      <blockquote key={index} className="border-l-4 border-[#CE0202] pl-4 italic text-gray-600 my-6">
                        {block.content}
                      </blockquote>
                    );
                  }
                  
                  return null;
                })}
              </div>
            ) : post.content ? (
              <div 
                dangerouslySetInnerHTML={{ __html: post.content }}
                className="text-gray-700"
              />
            ) : (
              <p className="text-gray-500 italic">Aucun contenu disponible.</p>
            )}
          </motion.div>
        </div>
      </article>

      {/* Reactions Section */}
      <section className="py-8 bg-white border-t border-gray-100 print:hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center gap-6">
            <span className="text-gray-500 text-sm font-medium">Cet article vous a plu ?</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  userReaction === 'like' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
                <span className="font-medium">{reactions.like}</span>
              </button>
              <button
                onClick={() => handleReaction('love')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  userReaction === 'love' 
                    ? 'bg-red-100 text-red-500' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Heart className="w-5 h-5" />
                <span className="font-medium">{reactions.love}</span>
              </button>
              <button
                onClick={() => handleReaction('fire')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  userReaction === 'fire' 
                    ? 'bg-orange-100 text-orange-500' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Flame className="w-5 h-5" />
                <span className="font-medium">{reactions.fire}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Share Section */}
      <section className="bg-[#F8F8F8] py-10 print:hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-gray-700" />
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
              
              <button
                onClick={() => copyToClipboard()}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all"
                title="Copier le lien"
              >
                <div className="text-gray-600">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </div>
                <span className="text-xs text-gray-600 font-medium">{copied ? "Copié !" : "Copier"}</span>
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-400 text-center">
              Pour Instagram, copiez le lien et partagez-le dans votre story ou bio
            </p>
          </div>
        </div>
      </section>

      {/* Comments Section */}
      <section className="py-12 bg-white print:hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Commentaires ({comments.length})</h3>
              <p className="text-sm text-gray-500">Partagez votre avis sur cet article</p>
            </div>
          </div>

          {/* Comment Form */}
          <div className="bg-white rounded-2xl p-6 mb-8 border border-gray-200 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-4">
              {replyTo ? "Répondre au commentaire" : "Laisser un commentaire"}
            </h4>
            {replyTo && (
              <button 
                onClick={() => setReplyTo(null)}
                className="text-sm text-gray-600 hover:text-gray-900 hover:underline mb-4"
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
                  <input
                    type="text"
                    placeholder="Votre nom"
                    value={newComment.name}
                    onChange={(e) => setNewComment({ ...newComment, name: e.target.value })}
                    style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A' }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={newComment.email}
                    onChange={(e) => setNewComment({ ...newComment, email: e.target.value })}
                    style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A' }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Écrivez votre commentaire..."
                  value={newComment.content}
                  onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                  rows={4}
                  style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A' }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 resize-none"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={submittingComment}
                className="inline-flex items-center justify-center px-6 py-3 bg-[#1A1A1A] hover:bg-[#333] text-white font-medium rounded-full transition-colors disabled:opacity-50"
              >
                {submittingComment ? (
                  <>Envoi en cours...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publier le commentaire
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-12 bg-[#F8F8F8] rounded-2xl border border-gray-200">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Aucun commentaire pour le moment.</p>
                <p className="text-sm text-gray-400 mt-1">Soyez le premier à commenter cet article !</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold flex-shrink-0">
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
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm transition-colors"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{comment.likes || 0}</span>
                        </button>
                        <button 
                          onClick={() => setReplyTo(comment.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Répondre
                        </button>
                      </div>

                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-[#F8F8F8] rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-sm font-semibold">
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

      {/* Article Navigation */}
      {(prevPost || nextPost) && (
        <section className="py-8 bg-[#F8F8F8] border-t border-gray-200 print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prevPost ? (
                <Link 
                  to={`/actualites/${prevPost.slug}`}
                  className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-8 h-8 text-gray-400 group-hover:text-[#1A1A1A] transition-colors flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Article précédent</p>
                    <p className="font-medium text-gray-900 line-clamp-1 group-hover:text-[#CE0202] transition-colors">
                      {prevPost.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <div />
              )}
              {nextPost && (
                <Link 
                  to={`/actualites/${nextPost.slug}`}
                  className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-300 transition-colors md:flex-row-reverse md:text-right"
                >
                  <ChevronRight className="w-8 h-8 text-gray-400 group-hover:text-[#1A1A1A] transition-colors flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Article suivant</p>
                    <p className="font-medium text-gray-900 line-clamp-1 group-hover:text-[#CE0202] transition-colors">
                      {nextPost.title}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-white print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Articles similaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link 
                  key={relatedPost.id} 
                  to={`/actualites/${relatedPost.slug}`}
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
                    <h4 className="font-semibold text-gray-900 group-hover:text-[#CE0202] transition-colors line-clamp-2 mb-2">
                      {relatedPost.title}
                    </h4>
                    <p className="text-sm text-gray-500 line-clamp-2">{relatedPost.excerpt}</p>
                    <div className="flex items-center gap-2 mt-3 text-[#1A1A1A] text-sm font-medium">
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
      <section className="py-16 bg-[#1A1A1A] print:hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Vous avez un projet ?
          </h3>
          <p className="text-white/70 mb-8">
            Discutons ensemble de vos besoins et trouvons la meilleure solution pour votre entreprise.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-white text-[#1A1A1A] hover:bg-gray-100 rounded-full px-8">
              Contactez-nous
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default BlogPostPage;
