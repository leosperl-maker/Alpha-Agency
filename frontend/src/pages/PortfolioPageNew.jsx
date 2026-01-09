import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ExternalLink, Calendar, User, Tag, ChevronRight,
  Filter, X, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { portfolioAPI } from "../lib/api";
import AdvancedBlockRenderer from "../components/AdvancedBlockRenderer";

const CATEGORIES = [
  { id: "all", label: "Tous", color: "#1A1A1A" },
  { id: "site_web", label: "Site Web", color: "#3B82F6" },
  { id: "site_ecommerce", label: "E-commerce", color: "#10B981" },
  { id: "reseaux_sociaux", label: "Réseaux Sociaux", color: "#EC4899" },
  { id: "photo", label: "Photo", color: "#F59E0B" },
  { id: "video", label: "Vidéo", color: "#EF4444" },
  { id: "branding", label: "Branding", color: "#8B5CF6" },
  { id: "print", label: "Print", color: "#6366F1" },
  { id: "ads", label: "Publicité", color: "#14B8A6" }
];

// Portfolio Grid Component
const PortfolioGrid = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await portfolioAPI.getAll();
      // Only show published items
      const publishedItems = res.data.filter(item => item.status === 'published');
      setItems(publishedItems);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = activeFilter === "all"
    ? items
    : items.filter(item => item.category === activeFilter);

  const getCategoryInfo = (categoryId) => CATEGORIES.find(c => c.id === categoryId);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-[#F8F8F8] to-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-black text-[#1A1A1A] mb-6">
              Nos <span className="text-[#CE0202]">Réalisations</span>
            </h1>
            <p className="text-lg md:text-xl text-[#666666] max-w-2xl mx-auto">
              Découvrez nos projets et créations pour des clients de Guadeloupe,
              Martinique et des Antilles françaises.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === cat.id
                    ? 'bg-[#CE0202] text-white'
                    : 'bg-[#F8F8F8] text-[#666666] hover:bg-[#E5E5E5]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-[#CE0202]" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-xl text-[#666666]">Aucune réalisation pour le moment</p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => {
                  const category = getCategoryInfo(item.category);
                  return (
                    <motion.article
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      onClick={() => navigate(`/realisations/${item.slug || item.id}`)}
                      className="group cursor-pointer"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#F8F8F8] mb-4">
                        {item.featured_image ? (
                          <img
                            src={item.featured_image}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl font-black text-[#E5E5E5]">
                              {item.title?.charAt(0)}
                            </span>
                          </div>
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        
                        {/* Category Badge */}
                        {category && (
                          <div
                            className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.label}
                          </div>
                        )}

                        {/* View Button on Hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="px-6 py-3 bg-white rounded-full text-sm font-semibold text-[#1A1A1A] flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            Voir le projet <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="text-xl font-bold text-[#1A1A1A] group-hover:text-[#CE0202] transition-colors mb-2">
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="text-[#666666] line-clamp-2">{item.subtitle}</p>
                      )}
                      
                      {/* Tags */}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Un projet en tête ?
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Discutons de votre prochain projet et donnons vie à vos idées.
          </p>
          <Link to="/contact">
            <Button
              size="lg"
              className="bg-[#CE0202] hover:bg-[#B00202] text-white px-8 py-6 text-lg rounded-full"
            >
              Demander un devis gratuit
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

// Single Project Detail Component
const ProjectDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProjects, setRelatedProjects] = useState([]);

  useEffect(() => {
    fetchProject();
  }, [slug]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await portfolioAPI.getBySlug(slug);
      setProject(res.data);

      // Fetch related projects (same category)
      const allRes = await portfolioAPI.getAll();
      const related = allRes.data
        .filter(p => p.status === 'published' && p.id !== res.data.id && p.category === res.data.category)
        .slice(0, 3);
      setRelatedProjects(related);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryId) => CATEGORIES.find(c => c.id === categoryId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#CE0202]" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-4">Projet non trouvé</h1>
        <Button onClick={() => navigate('/realisations')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux réalisations
        </Button>
      </div>
    );
  }

  const category = getCategoryInfo(project.category);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative">
        {/* Featured Image */}
        {project.featured_image && (
          <div className="relative h-[50vh] md:h-[70vh] overflow-hidden">
            <img
              src={project.featured_image}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
        )}

        {/* Back Button */}
        <div className="absolute top-6 left-6 z-10">
          <Button
            onClick={() => navigate('/realisations')}
            variant="secondary"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="max-w-5xl mx-auto">
            {category && (
              <Badge
                className="mb-4 text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.label}
              </Badge>
            )}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4">
              {project.title}
            </h1>
            {project.subtitle && (
              <p className="text-lg md:text-xl text-white/80 max-w-3xl">
                {project.subtitle}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Meta Info */}
      <section className="border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-wrap gap-8">
            {project.client_name && (
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#CE0202]" />
                <div>
                  <p className="text-xs text-[#999999] uppercase">Client</p>
                  <p className="font-semibold text-[#1A1A1A]">{project.client_name}</p>
                </div>
              </div>
            )}
            {project.project_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#CE0202]" />
                <div>
                  <p className="text-xs text-[#999999] uppercase">Date</p>
                  <p className="font-semibold text-[#1A1A1A]">
                    {new Date(project.project_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group"
              >
                <ExternalLink className="w-5 h-5 text-[#CE0202]" />
                <div>
                  <p className="text-xs text-[#999999] uppercase">Lien</p>
                  <p className="font-semibold text-[#1A1A1A] group-hover:text-[#CE0202] transition-colors">
                    Voir le site
                  </p>
                </div>
              </a>
            )}
          </div>

          {/* Tags */}
          {project.tags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-6">
              <Tag className="w-4 h-4 text-[#999999]" />
              {project.tags.map((tag, i) => (
                <Badge key={i} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6">
          {project.content_blocks?.length > 0 ? (
            <AdvancedBlockRenderer blocks={project.content_blocks} />
          ) : (
            <p className="text-lg text-[#666666] text-center">
              Aucun contenu détaillé pour ce projet.
            </p>
          )}
        </div>
      </section>

      {/* Related Projects */}
      {relatedProjects.length > 0 && (
        <section className="py-16 bg-[#F8F8F8]">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-8">
              Projets similaires
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProjects.map((item) => (
                <article
                  key={item.id}
                  onClick={() => navigate(`/realisations/${item.slug || item.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-white mb-4">
                    {item.featured_image ? (
                      <img
                        src={item.featured_image}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#E5E5E5]">
                        <span className="text-4xl font-black text-[#999999]">
                          {item.title?.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] group-hover:text-[#CE0202] transition-colors">
                    {item.title}
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Vous aimez ce projet ?
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Créons ensemble quelque chose d'exceptionnel pour vous.
          </p>
          <Link to="/contact">
            <Button
              size="lg"
              className="bg-[#CE0202] hover:bg-[#B00202] text-white px-8 py-6 text-lg rounded-full"
            >
              Discutons de votre projet
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

// Main Component with Router
const PortfolioPageNew = () => {
  const { slug } = useParams();

  if (slug) {
    return <ProjectDetail />;
  }

  return <PortfolioGrid />;
};

export default PortfolioPageNew;
