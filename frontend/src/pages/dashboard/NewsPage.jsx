import { useState, useEffect } from "react";
import { 
  Newspaper, RefreshCw, Loader2, ExternalLink, Trash2, 
  Globe, MapPin, TrendingUp, Target, Palette, Users,
  Megaphone, BarChart3, Building, Filter, ChevronDown
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { toast } from "sonner";
import { newsAPI } from "../../lib/api";

const topicIcons = {
  guadeloupe: MapPin,
  martinique: MapPin,
  france: Globe,
  usa: Globe,
  monde: Globe,
  marketing: TrendingUp,
  ads: Megaphone,
  social: Users,
  growth: Target,
  crm: BarChart3,
  local: Building,
  design: Palette,
};

const topicColors = {
  guadeloupe: "from-blue-500 to-cyan-500",
  martinique: "from-green-500 to-emerald-500",
  france: "from-blue-600 to-indigo-600",
  usa: "from-red-500 to-pink-500",
  monde: "from-purple-500 to-violet-500",
  marketing: "from-orange-500 to-amber-500",
  ads: "from-pink-500 to-rose-500",
  social: "from-cyan-500 to-blue-500",
  growth: "from-green-500 to-lime-500",
  crm: "from-indigo-500 to-purple-500",
  local: "from-amber-500 to-yellow-500",
  design: "from-fuchsia-500 to-pink-500",
};

const NewsCard = ({ article, onDelete }) => {
  const Icon = topicIcons[article.topic_id] || Newspaper;
  const gradientClass = topicColors[article.topic_id] || "from-gray-500 to-gray-600";
  
  return (
    <Card className="bg-white border-[#E5E5E5] overflow-hidden hover:shadow-lg transition-all group">
      {/* Gradient Header */}
      <div className={`h-2 bg-gradient-to-r ${gradientClass}`} />
      
      <CardContent className="p-4">
        {/* Topic badge and actions */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {article.topic_id}
          </Badge>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-red-500"
              onClick={() => onDelete(article.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-[#1A1A1A] text-sm mb-2 line-clamp-2 leading-snug">
          {article.title}
        </h3>
        
        {/* Summary */}
        <p className="text-[#666666] text-xs leading-relaxed line-clamp-3 mb-3">
          {article.summary}
        </p>
        
        {/* Sources */}
        {article.sources && article.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {article.sources.slice(0, 2).map((source, idx) => (
              <a
                key={idx}
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#CE0202] hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Source {idx + 1}
              </a>
            ))}
            {article.sources.length > 2 && (
              <span className="text-xs text-[#666666]">+{article.sources.length - 2}</span>
            )}
          </div>
        )}
        
        {/* Date */}
        <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
          <span className="text-xs text-[#999999]">
            {new Date(article.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const NewsPage = () => {
  const [topics, setTopics] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("all");

  useEffect(() => {
    fetchData();
  }, [selectedTopic]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topicsRes, articlesRes] = await Promise.all([
        newsAPI.getTopics(),
        newsAPI.getArticles(selectedTopic === "all" ? null : selectedTopic, 50)
      ]);
      setTopics(topicsRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (topicId = null) => {
    setRefreshing(true);
    try {
      const result = await newsAPI.refresh(topicId);
      toast.success(result.data.message);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors du rafraîchissement");
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
      toast.error("Erreur");
    }
  };

  // Group topics by category
  const localTopics = topics.filter(t => ["guadeloupe", "martinique", "france", "usa", "monde"].includes(t.id));
  const businessTopics = topics.filter(t => ["marketing", "ads", "social", "growth", "crm", "local", "design"].includes(t.id));

  return (
    <div data-testid="news-page" className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <Newspaper className="w-5 h-5 sm:w-7 sm:h-7 text-[#CE0202]" />
              Actualités
            </h1>
            <p className="text-[#666666] text-xs sm:text-sm">Restez informé grâce à Perplexity AI</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-full sm:w-48 bg-white border-[#E5E5E5]">
              <Filter className="w-4 h-4 mr-2 text-[#666666]" />
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">Toutes les actualités</SelectItem>
              {topics.map(topic => {
                const Icon = topicIcons[topic.id] || Newspaper;
                return (
                  <SelectItem key={topic.id} value={topic.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {topic.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => handleRefresh(selectedTopic === "all" ? null : selectedTopic)}
            disabled={refreshing}
            className="bg-[#CE0202] hover:bg-[#B00202] text-white w-full sm:w-auto"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualiser
          </Button>
        </div>
      </div>

      {/* Topic Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Actualités géographiques */}
        <Card className="bg-white border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#CE0202]" />
              Actualités géographiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {localTopics.map(topic => {
                const Icon = topicIcons[topic.id] || Newspaper;
                const count = articles.filter(a => a.topic_id === topic.id).length;
                return (
                  <Badge
                    key={topic.id}
                    variant={selectedTopic === topic.id ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${selectedTopic === topic.id ? 'bg-[#CE0202]' : ''}`}
                    onClick={() => setSelectedTopic(topic.id)}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {topic.label}
                    {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actualités business */}
        <Card className="bg-white border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#CE0202]" />
              Business & Marketing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {businessTopics.map(topic => {
                const Icon = topicIcons[topic.id] || Newspaper;
                const count = articles.filter(a => a.topic_id === topic.id).length;
                return (
                  <Badge
                    key={topic.id}
                    variant={selectedTopic === topic.id ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${selectedTopic === topic.id ? 'bg-[#CE0202]' : ''}`}
                    onClick={() => setSelectedTopic(topic.id)}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {topic.label}
                    {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#CE0202]" />
        </div>
      ) : articles.length === 0 ? (
        <Card className="bg-white border-[#E5E5E5]">
          <CardContent className="py-12 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-[#E5E5E5]" />
            <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Aucune actualité</h3>
            <p className="text-[#666666] mb-4">
              Cliquez sur "Actualiser" pour récupérer les dernières actualités
            </p>
            <Button
              onClick={() => handleRefresh(selectedTopic === "all" ? null : selectedTopic)}
              disabled={refreshing}
              className="bg-[#CE0202] hover:bg-[#B00202] text-white"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {articles.map(article => (
            <NewsCard
              key={article.id}
              article={article}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="text-center text-xs text-[#666666]">
        <p>Actualités générées par Perplexity AI • {articles.length} articles</p>
      </div>
    </div>
  );
};

export default NewsPage;
