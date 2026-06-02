import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ExternalLink, Calendar, User, Tag, ChevronRight, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { portfolioAPI } from "../lib/api";
import AdvancedBlockRenderer from "../components/AdvancedBlockRenderer";

const RED = "#E11D2E";
const BG = "#0A0507";

const CATEGORIES = [
  { id: "all", label: "Tous", color: "#E11D2E" },
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
      const publishedItems = res.data.filter((item) => item.status === "published");
      setItems(publishedItems);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = activeFilter === "all" ? items : items.filter((item) => item.category === activeFilter);
  const getCategoryInfo = (categoryId) => CATEGORIES.find((c) => c.id === categoryId);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: BG }}>
      {/* Hero Section */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(110% 80% at 50% 0%, #2A0712 0%, #0A0507 65%)" }} aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-display text-4xl md:text-7xl font-extrabold tracking-tight mb-6">
              Nos <span style={{ color: RED }}>réalisations</span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
              Nos projets et créations pour des clients de Guadeloupe, Martinique
              et des Antilles.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-30 backdrop-blur-md border-b border-white/10 py-4" style={{ backgroundColor: "rgba(10,5,7,0.85)" }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilter === cat.id
                    ? "text-white"
                    : "bg-white/[0.05] text-white/60 hover:bg-white/10"
                }`}
                style={activeFilter === cat.id ? { backgroundColor: RED } : undefined}
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
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: RED }} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-xl text-white/50">Aucune réalisation pour le moment.</p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 mb-4">
                        {item.featured_image ? (
                          <img
                            src={item.featured_image}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl font-black text-white/15">{item.title?.charAt(0)}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        {category && (
                          <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: category.color }}>
                            {category.label}
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="px-6 py-3 bg-white rounded-full text-sm font-semibold text-[#0A0507] flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            Voir le projet <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                      <h3 className="font-display text-xl font-bold group-hover:text-[#E11D2E] transition-colors mb-2">
                        {item.title}
                      </h3>
                      {item.subtitle && <p className="text-white/55 line-clamp-2">{item.subtitle}</p>}
                      {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {item.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-white/20 text-white/60">
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
      <section className="py-20 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 80% at 50% 120%, #C8102E 0%, #4A0C1B 38%, #0A0507 72%)" }} aria-hidden="true" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-6">Un projet en tête ?</h2>
          <p className="text-lg text-white/60 mb-8">Parlons-en, et donnons vie à vos idées.</p>
          <Link to="/contact">
            <Button size="lg" className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] px-8 py-6 text-lg rounded-full">
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
      const allRes = await portfolioAPI.getAll();
      const related = allRes.data
        .filter((p) => p.status === "published" && p.id !== res.data.id && p.category === res.data.category)
        .slice(0, 3);
      setRelatedProjects(related);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryId) => CATEGORIES.find((c) => c.id === categoryId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: RED }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white" style={{ backgroundColor: BG }}>
        <h1 className="font-display text-2xl font-bold mb-4">Projet non trouvé</h1>
        <Button onClick={() => navigate("/realisations")} variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux réalisations
        </Button>
      </div>
    );
  }

  const category = getCategoryInfo(project.category);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: BG }}>
      {/* Hero */}
      <section className="relative">
        {project.featured_image && (
          <div className="relative h-[50vh] md:h-[70vh] overflow-hidden">
            <img src={project.featured_image} alt={project.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0507] via-black/40 to-transparent" />
          </div>
        )}
        <div className="absolute top-24 left-6 z-10">
          <Button onClick={() => navigate("/realisations")} variant="secondary" className="bg-white/90 backdrop-blur-sm hover:bg-white text-[#0A0507] rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>
        <div className={`${project.featured_image ? "absolute bottom-0 left-0 right-0" : "pt-36"} p-8 md:p-16`}>
          <div className="max-w-5xl mx-auto">
            {category && (
              <span className="inline-block mb-4 px-3 py-1 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: category.color }}>
                {category.label}
              </span>
            )}
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4">{project.title}</h1>
            {project.subtitle && <p className="text-lg md:text-xl text-white/70 max-w-3xl">{project.subtitle}</p>}
          </div>
        </div>
      </section>

      {/* Meta Info */}
      <section className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-wrap gap-8">
            {project.client_name && (
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: RED }} />
                <div>
                  <p className="text-xs text-white/40 uppercase">Client</p>
                  <p className="font-semibold">{project.client_name}</p>
                </div>
              </div>
            )}
            {project.project_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: RED }} />
                <div>
                  <p className="text-xs text-white/40 uppercase">Date</p>
                  <p className="font-semibold">
                    {new Date(project.project_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            )}
            {project.project_url && (
              <a href={project.project_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                <ExternalLink className="w-5 h-5" style={{ color: RED }} />
                <div>
                  <p className="text-xs text-white/40 uppercase">Lien</p>
                  <p className="font-semibold group-hover:text-[#E11D2E] transition-colors">Voir le site</p>
                </div>
              </a>
            )}
          </div>
          {project.tags?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-6">
              <Tag className="w-4 h-4 text-white/40" />
              {project.tags.map((tag, i) => (
                <Badge key={i} variant="outline" className="border-white/20 text-white/60">{tag}</Badge>
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
            <p className="text-lg text-white/55 text-center">Aucun contenu détaillé pour ce projet.</p>
          )}
        </div>
      </section>

      {/* Related Projects */}
      {relatedProjects.length > 0 && (
        <section className="py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">Projets similaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProjects.map((item) => (
                <article key={item.id} onClick={() => navigate(`/realisations/${item.slug || item.id}`)} className="group cursor-pointer">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-white/[0.04] border border-white/10 mb-4">
                    {item.featured_image ? (
                      <img src={item.featured_image} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl font-black text-white/15">{item.title?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold group-hover:text-[#E11D2E] transition-colors">{item.title}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 80% at 50% 120%, #C8102E 0%, #4A0C1B 38%, #0A0507 72%)" }} aria-hidden="true" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-6">Vous aimez ce projet ?</h2>
          <p className="text-lg text-white/60 mb-8">Créons ensemble quelque chose qui vous ressemble.</p>
          <Link to="/contact">
            <Button size="lg" className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] px-8 py-6 text-lg rounded-full">
              Discutons de votre projet
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

const PortfolioPageNew = () => {
  const { slug } = useParams();
  if (slug) return <ProjectDetail />;
  return <PortfolioGrid />;
};

export default PortfolioPageNew;
