import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Clock, Search, Tag, User, Filter, X } from "lucide-react";
import { blogAPI } from "../lib/api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState(null);
  
  // Extract unique categories and tags from posts
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await blogAPI.getAll();
        const fetchedPosts = response.data || [];
        setPosts(fetchedPosts);
        setFilteredPosts(fetchedPosts);
        
        // Extract unique categories
        const cats = [...new Set(fetchedPosts.map(p => p.category).filter(Boolean))];
        setCategories(cats);
        
        // Extract unique tags
        const tags = [...new Set(fetchedPosts.flatMap(p => p.tags || []))];
        setAllTags(tags);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
        setFilteredPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Filter posts based on search, category, and tag
  useEffect(() => {
    let result = posts;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(post => 
        post.title?.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter(post => post.category === selectedCategory);
    }
    
    // Filter by tag
    if (selectedTag) {
      result = result.filter(post => post.tags?.includes(selectedTag));
    }
    
    setFilteredPosts(result);
  }, [searchQuery, selectedCategory, selectedTag, posts]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTag(null);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedTag;

  // Get featured post (latest published)
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const regularPosts = posts.length > 1 ? filteredPosts.filter(p => p.id !== featuredPost?.id) : filteredPosts;

  return (
    <div data-testid="blog-page" className="bg-white min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden bg-[#F8F8F8]">
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
              Nos <span className="text-[#CE0202]">articles</span>
            </h1>
            <p className="text-lg lg:text-xl text-[#666666] mb-8">
              Conseils, tendances et bonnes pratiques pour développer votre présence digitale.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-full shadow-sm focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A]"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters & Categories */}
      {(categories.length > 0 || allTags.length > 0) && (
        <section className="px-6 py-8 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                <span className="text-sm font-medium text-gray-500 flex-shrink-0">Catégories:</span>
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                    selectedCategory === "all"
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Tous
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                      selectedCategory === cat
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            
            {/* Tags */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {allTags.slice(0, 10).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                      selectedTag === tag
                        ? "bg-[#CE0202] text-white"
                        : "bg-[#CE0202]/10 text-[#CE0202] hover:bg-[#CE0202]/20"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">Filtres actifs:</span>
                {searchQuery && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Recherche: {searchQuery}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {selectedCategory}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                  </Badge>
                )}
                {selectedTag && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    #{selectedTag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTag(null)} />
                  </Badge>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#CE0202] hover:underline ml-2"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Post */}
      {featuredPost && !hasActiveFilters && (
        <section className="px-6 py-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-sm font-semibold text-[#CE0202] uppercase tracking-wider mb-6">
              À la une
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Link to={`/actualites/${featuredPost.slug}`}>
                <Card className="group cursor-pointer bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    {/* Image */}
                    <div className="aspect-[16/9] lg:aspect-auto lg:h-full overflow-hidden">
                      <div 
                        className="w-full h-full min-h-[300px] bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url('${featuredPost.featured_image || featuredPost.image_url || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800"}')` }}
                      />
                    </div>
                    
                    {/* Content */}
                    <CardContent className="p-8 lg:p-12 flex flex-col justify-center">
                      {/* Category & Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {featuredPost.category && (
                          <Badge className="bg-[#1A1A1A] text-white">
                            {featuredPost.category}
                          </Badge>
                        )}
                        {featuredPost.tags?.slice(0, 2).map((tag, i) => (
                          <Badge 
                            key={i}
                            className="bg-[#CE0202]/10 text-[#CE0202] border-none"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-2xl lg:text-3xl font-bold text-[#1A1A1A] mb-4 group-hover:text-[#CE0202] transition-colors">
                        {featuredPost.title}
                      </h3>
                      
                      {/* Excerpt */}
                      <p className="text-[#666666] mb-6 line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                      
                      {/* Meta */}
                      <div className="flex items-center gap-4 text-sm text-[#666666] mb-6">
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {featuredPost.author_name || "Alpha Agency"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(featuredPost.published_at || featuredPost.created_at)}
                        </span>
                        {featuredPost.read_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {featuredPost.read_time}
                          </span>
                        )}
                      </div>
                      
                      {/* CTA */}
                      <div className="flex items-center gap-2 text-[#1A1A1A] font-semibold group-hover:gap-4 transition-all">
                        Lire l'article
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Blog Grid */}
      <section data-testid="blog-grid" className="px-6 py-12 bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto">
          {!hasActiveFilters && regularPosts.length > 0 && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
              Tous les articles ({regularPosts.length})
            </h2>
          )}
          
          {hasActiveFilters && (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
              {filteredPosts.length} résultat{filteredPosts.length > 1 ? 's' : ''} trouvé{filteredPosts.length > 1 ? 's' : ''}
            </h2>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden">
                  <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-1/4" />
                    <div className="h-6 bg-gray-200 animate-pulse rounded" />
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {(hasActiveFilters ? filteredPosts : regularPosts).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {(hasActiveFilters ? filteredPosts : regularPosts).map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link to={`/actualites/${post.slug}`}>
                        <Card 
                          data-testid={`blog-card-${index}`}
                          className="card-marketing h-full group cursor-pointer bg-white border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow rounded-xl"
                        >
                          {/* Image */}
                          <div className="aspect-[16/9] overflow-hidden">
                            <div 
                              className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                              style={{ backgroundImage: `url('${post.featured_image || post.image_url || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600"}')` }}
                            />
                          </div>
                          
                          <CardContent className="p-6">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {post.category && (
                                <Badge className="bg-[#1A1A1A] text-white text-xs">
                                  {post.category}
                                </Badge>
                              )}
                              {post.tags?.slice(0, 2).map((tag, i) => (
                                <Badge 
                                  key={i}
                                  className="bg-[#CE0202]/10 text-[#CE0202] border-none text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Title */}
                            <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 group-hover:text-[#CE0202] transition-colors line-clamp-2">
                              {post.title}
                            </h3>
                            
                            {/* Excerpt */}
                            <p className="text-[#666666] text-sm mb-4 line-clamp-2">
                              {post.excerpt}
                            </p>
                            
                            {/* Meta */}
                            <div className="flex items-center justify-between text-xs text-[#666666]">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {post.author_name || "Alpha Agency"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(post.published_at || post.created_at)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun article trouvé</h3>
                  <p className="text-gray-500 mb-6">
                    {hasActiveFilters 
                      ? "Essayez de modifier vos filtres ou votre recherche."
                      : "Aucun article n'a encore été publié."
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button 
                      onClick={clearFilters}
                      className="bg-[#1A1A1A] hover:bg-[#333] text-white rounded-full"
                    >
                      Effacer les filtres
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="px-6 py-16 bg-[#1A1A1A]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Restez informé
          </h2>
          <p className="text-white/70 mb-8">
            Recevez nos derniers articles et conseils directement dans votre boîte mail.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Votre adresse email"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white rounded-full"
            />
            <Button className="bg-white text-[#1A1A1A] hover:bg-gray-100 rounded-full px-6 whitespace-nowrap">
              S'inscrire
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
