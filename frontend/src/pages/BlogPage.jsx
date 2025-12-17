import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { blogAPI } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Placeholder data
  const placeholderPosts = [
    {
      id: "1",
      slug: "importance-site-web-2024",
      title: "L'importance d'un site web professionnel en 2024",
      excerpt: "Découvrez pourquoi avoir un site web est devenu indispensable pour toute entreprise, et comment en tirer le meilleur parti.",
      image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80",
      tags: ["Site Web", "Digital"],
      created_at: "2024-01-15",
      read_time: "5 min"
    },
    {
      id: "2",
      slug: "reseaux-sociaux-entreprise-locale",
      title: "Réseaux sociaux : guide pour les entreprises locales",
      excerpt: "Comment utiliser efficacement Instagram, Facebook et LinkedIn pour développer votre clientèle locale en Guadeloupe.",
      image_url: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600&q=80",
      tags: ["Social Media", "Marketing"],
      created_at: "2024-01-10",
      read_time: "7 min"
    },
    {
      id: "3",
      slug: "seo-base-site-vitrine",
      title: "Les bases du SEO pour votre site vitrine",
      excerpt: "Optimisez votre référencement naturel avec ces conseils simples et efficaces pour apparaître dans les premiers résultats Google.",
      image_url: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=600&q=80",
      tags: ["SEO", "Site Web"],
      created_at: "2024-01-05",
      read_time: "6 min"
    }
  ];

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await blogAPI.getAll();
        setPosts(response.data.length > 0 ? response.data : placeholderPosts);
      } catch (error) {
        setPosts(placeholderPosts);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div data-testid="blog-page" className="bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 
              data-testid="blog-headline"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-6"
            >
              Nos <span className="text-[#CE0202]">actualités</span>
            </h1>
            <p className="text-lg lg:text-xl text-[#666666]">
              Conseils, tendances et bonnes pratiques pour développer votre présence digitale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Blog Grid */}
      <section data-testid="blog-grid" className="px-6 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/3] bg-[#F8F8F8] animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={`/actualites/${post.slug}`}>
                    <Card 
                      data-testid={`blog-card-${index}`}
                      className="card-marketing h-full group cursor-pointer bg-white border border-[#E5E5E5] overflow-hidden"
                    >
                      {/* Image */}
                      <div className="aspect-[16/9] overflow-hidden">
                        <div 
                          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                          style={{ backgroundImage: `url('${post.image_url}')` }}
                        />
                      </div>
                      
                      <CardContent className="p-6">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags?.map((tag, i) => (
                            <Badge 
                              key={i}
                              className="bg-[#CE0202]/10 text-[#CE0202] border-none"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Title */}
                        <h2 className="text-xl font-bold text-[#1A1A1A] mb-3 group-hover:text-[#CE0202] transition-colors">
                          {post.title}
                        </h2>
                        
                        {/* Excerpt */}
                        <p className="text-[#666666] text-sm mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                        
                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-[#666666]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.read_time}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {posts.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-[#666666]">Aucun article publié pour le moment.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
