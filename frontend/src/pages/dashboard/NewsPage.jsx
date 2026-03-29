import { useState, useEffect } from "react";
import { 
  Newspaper, RefreshCw, Loader2, ExternalLink, Trash2, X,
  Globe, MapPin, Briefcase, Cpu, Heart, Trophy, Film, FlaskConical,
  Clock, ChevronLeft, ChevronRight, ArrowLeft, BookOpen,
  Megaphone, Share2, TrendingUp, Users, Store, Palette, Flag
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { toast } from "sonner";
import { newsAPI } from "../../lib/api";

// Icons mapping for categories
const categoryIcons = {
  // Standard news categories
  general: Newspaper,
  business: Briefcase,
  technology: Cpu,
  science: FlaskConical,
  health: Heart,
  sports: Trophy,
  entertainment: Film,
  // Marketing categories
  ads: Megaphone,
  social: Share2,
  growth: TrendingUp,
  crm: Users,
  local: Store,
  design: Palette,
};

// Colors for categories
const categoryColors = {
  // Standard news categories
  general: { bg: "bg-gray-100", text: "text-gray-700", accent: "#6B7280" },
  business: { bg: "bg-blue-100", text: "text-blue-700", accent: "#3B82F6" },
  technology: { bg: "bg-purple-100", text: "text-purple-700", accent: "#8B5CF6" },
  science: { bg: "bg-emerald-100", text: "text-emerald-700", accent: "#10B981" },
  health: { bg: "bg-red-100", text: "text-red-700", accent: "#EF4444" },
  sports: { bg: "bg-amber-100", text: "text-amber-700", accent: "#F59E0B" },
  entertainment: { bg: "bg-pink-100", text: "text-pink-700", accent: "#EC4899" },
  // Marketing categories
  ads: { bg: "bg-orange-100", text: "text-orange-700", accent: "#F97316" },
  social: { bg: "bg-cyan-100", text: "text-cyan-700", accent: "#06B6D4" },
  growth: { bg: "bg-lime-100", text: "text-lime-700", accent: "#84CC16" },
  crm: { bg: "bg-violet-100", text: "text-violet-700", accent: "#A855F7" },
  local: { bg: "bg-green-100", text: "text-green-700", accent: "#22C55E" },
  design: { bg: "bg-rose-100", text: "text-rose-700", accent: "#E11D48" },
};

// Region icons
const regionIcons = {
  // DOM-TOM
  guadeloupe: MapPin,
  martinique: MapPin,
  "saint-martin": MapPin,
  "saint-barth": MapPin,
  guyane: MapPin,
  // France + International
  fr: Flag,
  us: Globe,
  gb: Globe,
  de: Globe,
};

// Format date to French locale
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    return "Il y a moins d'une heure";
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
};

// Featured Article Component (Big card at top)
const FeaturedArticle = ({ article, onClick }) => {
  const Icon = categoryIcons[article.category] || Newspaper;
  const colors = categoryColors[article.category] || categoryColors.general;
  
  return (
    <Card 
      className="bg-white backdrop-blur-xl border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group"
      onClick={() => onClick(article)}
      data-testid="featured-article"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Text Content - Left Side */}
        <div className="p-6 lg:p-8 flex flex-col justify-center order-2 lg:order-1">
          <div className="flex items-center gap-2 mb-4">
            <Badge className={`${colors.bg} ${colors.text} border-0`}>
              <Icon className="w-3 h-3 mr-1" />
              {article.category}
            </Badge>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(article.published_at)}
            </span>
          </div>
          
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-3">
            {article.title}
          </h2>
          
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed line-clamp-3 mb-4">
            {article.description}
          </p>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">{article.source_name}</span>
            <span className="text-indigo-600 font-medium flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Lire l'article
            </span>
          </div>
        </div>
        
        {/* Image - Right Side */}
        <div className="relative aspect-video lg:aspect-auto lg:h-full min-h-[200px] lg:min-h-[300px] order-1 lg:order-2">
          {article.image_url ? (
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center">
              <Newspaper className="w-16 h-16 text-slate-900 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Card>
  );
};

// Article Card Component (Grid cards)
const ArticleCard = ({ article, onClick, onDelete }) => {
  const Icon = categoryIcons[article.category] || Newspaper;
  const colors = categoryColors[article.category] || categoryColors.general;
  
  return (
    <Card 
      className="bg-white backdrop-blur-xl border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group h-full flex flex-col"
      data-testid="article-card"
    >
      {/* Image */}
      <div 
        className="relative aspect-video overflow-hidden"
        onClick={() => onClick(article)}
      >
        {article.image_url ? (
          <img 
            src={article.image_url} 
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#CE0202]/80 to-[#8B0000] flex items-center justify-center">
            <Icon className="w-10 h-10 text-slate-900 opacity-70" />
          </div>
        )}
        
        {/* Delete button on hover */}
        <Button 
          variant="destructive" 
          size="sm" 
          className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(article.id);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        {/* Category badge */}
        <Badge 
          className={`absolute bottom-2 left-2 ${colors.bg} ${colors.text} border-0 text-xs`}
        >
          <Icon className="w-3 h-3 mr-1" />
          {article.category}
        </Badge>
      </div>
      
      {/* Content */}
      <CardContent 
        className="p-4 flex-1 flex flex-col"
        onClick={() => onClick(article)}
      >
        <h3 className="font-semibold text-slate-900 text-sm sm:text-base mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {article.title}
        </h3>
        
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-3 flex-1">
          {article.description}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#F5F5F5]">
          <span className="truncate max-w-[60%]">{article.source_name}</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {formatDate(article.published_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Article Detail Modal (Full Screen Overlay)
const ArticleDetailModal = ({ article, relatedArticles, onClose, onArticleClick }) => {
  const Icon = categoryIcons[article.category] || Newspaper;
  const colors = categoryColors[article.category] || categoryColors.general;
  
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-start justify-center overflow-y-auto"
      onClick={onClose}
      data-testid="article-modal"
    >
      <div 
        className="relative w-full max-w-4xl bg-white backdrop-blur-xl min-h-screen lg:min-h-0 lg:my-8 lg:rounded-2xl lg:shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-4 right-4 z-10 h-10 w-10 p-0 bg-white backdrop-blur-xl/90 hover:bg-slate-50 backdrop-blur-xl rounded-full shadow-lg"
          onClick={onClose}
          data-testid="close-modal-btn"
        >
          <X className="w-5 h-5" />
        </Button>
        
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-4 left-4 z-10 bg-white backdrop-blur-xl/90 hover:bg-slate-50 backdrop-blur-xl rounded-full shadow-lg"
          onClick={onClose}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux actualités
        </Button>
        
        {/* Hero Image */}
        <div className="relative w-full aspect-video lg:aspect-[21/9]">
          {article.image_url ? (
            <img 
              src={article.image_url} 
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#CE0202] to-[#8B0000] flex items-center justify-center">
              <Icon className="w-20 h-20 text-slate-900 opacity-50" />
            </div>
          )}
        </div>
        
        {/* Content - Clean layout without overlap */}
        <div className="p-6 lg:p-10">
          {/* Category & Date */}
          <div className="flex items-center gap-3 mb-4">
            <Badge className={`${colors.bg} ${colors.text} border-0`}>
              <Icon className="w-3 h-3 mr-1" />
              {article.category}
            </Badge>
            <span className="text-sm text-slate-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(article.published_at)}
            </span>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight">
            {article.title}
          </h1>
          
          {/* Source */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <Globe className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{article.source_name}</p>
                <p className="text-xs text-slate-400">Source originale</p>
              </div>
            </div>
            <a 
              href={article.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="sm:ml-auto"
            >
              <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-500/50 hover:bg-indigo-600 hover:text-slate-900">
                <ExternalLink className="w-4 h-4 mr-2" />
                Lire sur le site
              </Button>
            </a>
          </div>
          
          {/* Description / Content */}
          <div className="prose prose-lg max-w-none mb-10">
            <p className="text-lg text-[#333333] leading-relaxed mb-6">
              {article.description}
            </p>
            {article.content && (
              <div className="text-slate-500 leading-relaxed whitespace-pre-line">
                {article.content.replace(/\[\+\d+ chars\]$/, '')}
              </div>
            )}
          </div>
          
          {/* Related Articles */}
          {relatedArticles && relatedArticles.length > 0 && (
            <div className="mt-10 pt-8 border-t border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Découvrir aussi
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedArticles.map((related) => (
                  <Card 
                    key={related.id}
                    className="bg-white border-0 overflow-hidden cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => onArticleClick(related)}
                  >
                    <div className="aspect-video relative">
                      {related.image_url ? (
                        <img 
                          src={related.image_url} 
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#CE0202]/60 to-[#8B0000] flex items-center justify-center">
                          <Newspaper className="w-6 h-6 text-slate-900 opacity-70" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {related.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">{related.source_name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main NewsPage Component
const NewsPage = () => {
  const [categories, setCategories] = useState([]);
  const [regions, setRegions] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("guadeloupe"); // Default to Guadeloupe
  
  // Modal state
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, selectedRegion]);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, regionsRes] = await Promise.all([
        newsAPI.getCategories(),
        newsAPI.getRegions()
      ]);
      setCategories(categoriesRes.data);
      setRegions(regionsRes.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = {
        limit: 50
      };
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (selectedRegion !== "all") params.region = selectedRegion;
      
      const res = await newsAPI.getArticles(params);
      setArticles(res.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des actualités");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await newsAPI.refresh(
        selectedCategory === "all" ? null : selectedCategory,
        selectedRegion
      );
      
      // Check if rate limited
      if (result.data.rate_limited) {
        toast.error(result.data.message, { duration: 6000 });
      } else if (result.data.message.includes("0 nouveaux")) {
        toast.info(result.data.message);
      } else {
        toast.success(result.data.message);
      }
      fetchArticles();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Erreur lors du rafraîchissement";
      toast.error(errorMsg);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (articleId) => {
    try {
      await newsAPI.delete(articleId);
      setArticles(articles.filter(a => a.id !== articleId));
      toast.success("Article supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleArticleClick = async (article) => {
    setSelectedArticle(article);
    setLoadingRelated(true);
    try {
      const res = await newsAPI.getRelated(article.id, 4);
      setRelatedArticles(res.data);
    } catch (error) {
      console.error("Error fetching related articles:", error);
      setRelatedArticles([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedArticle(null);
    setRelatedArticles([]);
  };

  // Separate featured article from the rest
  const featuredArticle = articles.find(a => a.image_url);
  const otherArticles = featuredArticle 
    ? articles.filter(a => a.id !== featuredArticle.id)
    : articles;

  return (
    <div data-testid="news-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-slate-900" />
              </div>
              Les actualités du jour
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-13">
              Restez informé avec les dernières nouvelles
            </p>
          </div>
          
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
            data-testid="refresh-news-btn"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualiser
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Region Selector */}
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full sm:w-40 bg-white backdrop-blur-xl border-slate-200">
              <MapPin className="w-4 h-4 mr-2 text-slate-500" />
              <SelectValue placeholder="Région" />
            </SelectTrigger>
            <SelectContent className="bg-slate-50">
              {regions.map(region => {
                const Icon = regionIcons[region.id] || Globe;
                return (
                  <SelectItem key={region.id} value={region.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {region.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-2 flex-1">
            <Badge
              variant={selectedCategory === "all" ? "default" : "outline"}
              className={`cursor-pointer transition-all px-3 py-1.5 ${
                selectedCategory === "all" 
                  ? 'bg-[#1A1A1A] text-white hover:bg-[#333333]' 
                  : 'hover:bg-[#F5F5F5]'
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              Toutes
            </Badge>
            {categories.map(cat => {
              const Icon = categoryIcons[cat.id] || Newspaper;
              const colors = categoryColors[cat.id] || categoryColors.general;
              const isSelected = selectedCategory === cat.id;
              return (
                <Badge
                  key={cat.id}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer transition-all px-3 py-1.5 ${
                    isSelected 
                      ? `${colors.bg} ${colors.text} border-0` 
                      : 'hover:bg-[#F5F5F5]'
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                  data-testid={`category-filter-${cat.id}`}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {cat.label}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : articles.length === 0 ? (
        <Card className="bg-white backdrop-blur-xl border-slate-200">
          <CardContent className="py-16 text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-[#E5E5E5]" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune actualité</h3>
            <p className="text-slate-500 mb-2 max-w-md mx-auto">
              Cliquez sur "Actualiser" pour récupérer les dernières actualités depuis NewsAPI
            </p>
            <p className="text-xs text-slate-400 mb-6 max-w-md mx-auto">
              <strong>Note :</strong> Le compte NewsAPI gratuit est limité à 100 requêtes/24h. 
              Si aucun article n'apparaît, la limite peut avoir été atteinte.
            </p>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Récupérer les actualités
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Featured Article */}
          {featuredArticle && (
            <FeaturedArticle 
              article={featuredArticle} 
              onClick={handleArticleClick}
            />
          )}
          
          {/* Articles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherArticles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={handleArticleClick}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      {articles.length > 0 && (
        <div className="text-center text-sm text-slate-400 pt-4">
          <p>
            {articles.length} articles • Propulsé par NewsAPI.org
          </p>
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <ArticleDetailModal
          article={selectedArticle}
          relatedArticles={relatedArticles}
          onClose={handleCloseModal}
          onArticleClick={handleArticleClick}
        />
      )}
    </div>
  );
};

export default NewsPage;
