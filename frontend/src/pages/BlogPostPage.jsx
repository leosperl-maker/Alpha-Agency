import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowLeft, Share2, Linkedin, Facebook, Twitter } from "lucide-react";
import { blogAPI } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // Placeholder post
  const placeholderPost = {
    id: "1",
    slug: "importance-site-web-2024",
    title: "L'importance d'un site web professionnel en 2024",
    excerpt: "Découvrez pourquoi avoir un site web est devenu indispensable pour toute entreprise.",
    content: `
      <h2>Pourquoi un site web est indispensable</h2>
      <p>En 2024, avoir un site web professionnel n'est plus une option, c'est une nécessité. Que vous soyez un commerce local, un prestataire de services ou une PME, votre présence en ligne détermine en grande partie votre visibilité et votre crédibilité.</p>
      
      <h2>Les avantages d'un site web professionnel</h2>
      <p>Un site web vous permet de :</p>
      <ul>
        <li>Être visible 24h/24, 7j/7</li>
        <li>Présenter vos services de manière professionnelle</li>
        <li>Générer des leads qualifiés</li>
        <li>Renforcer votre crédibilité</li>
        <li>Vous démarquer de la concurrence</li>
      </ul>
      
      <h2>L'offre ALPHA Agency</h2>
      <p>Chez ALPHA Agency, nous avons créé une offre accessible pour permettre à toutes les entreprises d'avoir un site web professionnel : à partir de 90€/mois, vous obtenez un site vitrine livré en 7 jours, avec maintenance et hébergement inclus.</p>
      
      <p>N'attendez plus pour développer votre présence en ligne. Contactez-nous dès aujourd'hui pour un audit gratuit de vos besoins.</p>
    `,
    image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    tags: ["Site Web", "Digital"],
    created_at: "2024-01-15",
    read_time: "5 min"
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await blogAPI.getOne(slug);
        setPost(response.data);
      } catch (error) {
        // Use placeholder if not found
        setPost(placeholderPost);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const shareUrl = window.location.href;

  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen pt-32 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-8 bg-white/5 animate-pulse rounded mb-4 w-1/4" />
          <div className="h-12 bg-white/5 animate-pulse rounded mb-4" />
          <div className="aspect-[2/1] bg-white/5 animate-pulse rounded mb-8" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-white/5 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-[#050505] min-h-screen pt-32 px-6 text-center">
        <h1 className="text-2xl text-white mb-4">Article non trouvé</h1>
        <Link to="/blog">
          <Button className="bg-[#6A0F1A] hover:bg-[#8B1422]">
            Retour au blog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="blog-post-page" className="bg-[#050505]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Back link */}
            <Link 
              to="/blog"
              className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au blog
            </Link>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags?.map((tag, i) => (
                <Badge 
                  key={i}
                  className="bg-[#6A0F1A]/20 text-[#6A0F1A] border-none"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h1 
              data-testid="post-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
            >
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-6 text-[#A1A1AA] text-sm mb-8">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.read_time || "5 min"} de lecture</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Image */}
      <section className="px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="aspect-[2/1] rounded-lg overflow-hidden"
          >
            <img 
              src={post.image_url} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="prose prose-invert prose-lg max-w-none"
            style={{
              '--tw-prose-body': '#A1A1AA',
              '--tw-prose-headings': '#FFFFFF',
              '--tw-prose-links': '#6A0F1A',
              '--tw-prose-bold': '#FFFFFF',
              '--tw-prose-bullets': '#6A0F1A',
            }}
          >
            <div 
              dangerouslySetInnerHTML={{ __html: post.content }}
              className="text-[#A1A1AA] leading-relaxed [&>h2]:text-white [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>li]:mb-2"
            />
          </motion.div>
        </div>
      </section>

      {/* Share */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="border-t border-white/10 pt-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-[#A1A1AA] flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Partager cet article
              </span>
              <div className="flex gap-3">
                <a 
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:text-[#6A0F1A] hover:bg-white/10 transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:text-[#6A0F1A] hover:bg-white/10 transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a 
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#A1A1AA] hover:text-[#6A0F1A] hover:bg-white/10 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPostPage;
