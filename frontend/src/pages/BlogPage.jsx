import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Clock, Search, Tag, User, X } from "lucide-react";
import { blogAPI } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const RED = "#E11D2E";
const BG = "#0A0507";
const fieldClass = "bg-white/[0.05] border-white/15 text-white placeholder:text-white/30";

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState(null);
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await blogAPI.getAll();
        const fetchedPosts = response.data || [];
        setPosts(fetchedPosts);
        setFilteredPosts(fetchedPosts);
        setCategories([...new Set(fetchedPosts.map((p) => p.category).filter(Boolean))]);
        setAllTags([...new Set(fetchedPosts.flatMap((p) => p.tags || []))]);
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

  useEffect(() => {
    let result = posts;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (post) =>
          post.title?.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    if (selectedCategory !== "all") result = result.filter((post) => post.category === selectedCategory);
    if (selectedTag) result = result.filter((post) => post.tags?.includes(selectedTag));
    setFilteredPosts(result);
  }, [searchQuery, selectedCategory, selectedTag, posts]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTag(null);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedTag;
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const regularPosts = posts.length > 1 ? filteredPosts.filter((p) => p.id !== featuredPost?.id) : filteredPosts;

  const catBtn = (active) =>
    `px-4 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${active ? "text-white" : "bg-white/[0.05] text-white/60 hover:bg-white/10"}`;

  return (
    <div data-testid="blog-page" className="min-h-screen text-white" style={{ backgroundColor: BG }}>
      {/* Hero */}
      <section className="relative pt-36 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(110% 80% at 50% 0%, #2A0712 0%, #0A0507 65%)" }} aria-hidden="true" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center max-w-3xl mx-auto">
            <h1 data-testid="blog-headline" className="font-display text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6">
              Nos <span style={{ color: RED }}>articles</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/60 mb-8">
              Conseils, tendances et bonnes pratiques pour booster votre présence en ligne.
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-12 pr-4 py-6 rounded-full ${fieldClass}`}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters & Categories */}
      {(categories.length > 0 || allTags.length > 0) && (
        <section className="px-6 py-8 border-b border-white/10">
          <div className="max-w-7xl mx-auto">
            {categories.length > 0 && (
              <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                <span className="text-sm font-medium text-white/40 flex-shrink-0">Catégories :</span>
                <button onClick={() => setSelectedCategory("all")} className={catBtn(selectedCategory === "all")} style={selectedCategory === "all" ? { backgroundColor: RED } : undefined}>Tous</button>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={catBtn(selectedCategory === cat)} style={selectedCategory === cat ? { backgroundColor: RED } : undefined}>{cat}</button>
                ))}
              </div>
            )}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Tag className="w-4 h-4 text-white/40 flex-shrink-0" />
                {allTags.slice(0, 10).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0"
                    style={selectedTag === tag ? { backgroundColor: RED, color: "#fff" } : { backgroundColor: "rgba(225,29,46,0.12)", color: RED }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10">
                <span className="text-sm text-white/40">Filtres actifs :</span>
                {searchQuery && (
                  <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white/70">Recherche : {searchQuery}<X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery("")} /></Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white/70">{selectedCategory}<X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory("all")} /></Badge>
                )}
                {selectedTag && (
                  <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white/70">#{selectedTag}<X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTag(null)} /></Badge>
                )}
                <button onClick={clearFilters} className="text-sm hover:underline ml-2" style={{ color: RED }}>Tout effacer</button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Post */}
      {featuredPost && !hasActiveFilters && (
        <section className="px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: RED }}>À la une</h2>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Link to={`/actualites/${featuredPost.slug}`}>
                <div className="group cursor-pointer bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden hover:border-white/25 transition-colors">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                    <div className="aspect-[16/9] lg:aspect-auto lg:h-full overflow-hidden bg-white/[0.04]">
                      {(featuredPost.featured_image || featuredPost.image_url) && (
                        <div className="w-full h-full min-h-[300px] bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${featuredPost.featured_image || featuredPost.image_url}')` }} />
                      )}
                    </div>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {featuredPost.category && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">{featuredPost.category}</span>}
                        {featuredPost.tags?.slice(0, 2).map((tag, i) => (
                          <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(225,29,46,0.12)", color: RED }}>#{tag}</span>
                        ))}
                      </div>
                      <h3 className="font-display text-2xl lg:text-3xl font-bold mb-4 group-hover:text-[#E11D2E] transition-colors">{featuredPost.title}</h3>
                      <p className="text-white/60 mb-6 line-clamp-3">{featuredPost.excerpt}</p>
                      <div className="flex items-center gap-4 text-sm text-white/50 mb-6">
                        <span className="flex items-center gap-2"><User className="w-4 h-4" />{featuredPost.author_name || "Alpha Agency"}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(featuredPost.published_at || featuredPost.created_at)}</span>
                        {featuredPost.read_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{featuredPost.read_time}</span>}
                      </div>
                      <div className="flex items-center gap-2 font-semibold group-hover:gap-4 transition-all">Lire l'article<ArrowRight className="w-5 h-5" /></div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* Blog Grid */}
      <section data-testid="blog-grid" className="px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {!hasActiveFilters && regularPosts.length > 0 && (
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-8">Tous les articles ({regularPosts.length})</h2>
          )}
          {hasActiveFilters && (
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-8">{filteredPosts.length} résultat{filteredPosts.length > 1 ? "s" : ""} trouvé{filteredPosts.length > 1 ? "s" : ""}</h2>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                  <div className="aspect-[16/9] bg-white/10 animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-white/10 animate-pulse rounded w-1/4" />
                    <div className="h-6 bg-white/10 animate-pulse rounded" />
                    <div className="h-4 bg-white/10 animate-pulse rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (hasActiveFilters ? filteredPosts : regularPosts).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(hasActiveFilters ? filteredPosts : regularPosts).map((post, index) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}>
                  <Link to={`/actualites/${post.slug}`}>
                    <div data-testid={`blog-card-${index}`} className="h-full group cursor-pointer bg-white/[0.03] border border-white/10 overflow-hidden hover:border-white/25 transition-colors rounded-xl">
                      <div className="aspect-[16/9] overflow-hidden bg-white/[0.04]">
                        {(post.featured_image || post.image_url) && (
                          <div className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: `url('${post.featured_image || post.image_url}')` }} />
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.category && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">{post.category}</span>}
                          {post.tags?.slice(0, 2).map((tag, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(225,29,46,0.12)", color: RED }}>#{tag}</span>
                          ))}
                        </div>
                        <h3 className="font-display text-lg font-bold mb-2 group-hover:text-[#E11D2E] transition-colors line-clamp-2">{post.title}</h3>
                        <p className="text-white/55 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-white/45">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author_name || "Alpha Agency"}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.published_at || post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/[0.03] border border-white/10 rounded-2xl">
              <div className="w-16 h-16 bg-white/[0.06] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white/40" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Aucun article trouvé</h3>
              <p className="text-white/50 mb-6">
                {hasActiveFilters ? "Essayez de modifier vos filtres ou votre recherche." : "Aucun article n'a encore été publié."}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full">Effacer les filtres</Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="px-6 py-16 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 80% at 50% 120%, #C8102E 0%, #4A0C1B 38%, #0A0507 72%)" }} aria-hidden="true" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold mb-4">Restez informé</h2>
          <p className="text-white/70 mb-8">Recevez nos derniers articles et conseils directement par mail.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input type="email" placeholder="Votre adresse email" className={`rounded-full ${fieldClass}`} />
            <Button className="bg-white text-[#0A0507] hover:bg-white/90 rounded-full px-6 whitespace-nowrap">S'inscrire</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
