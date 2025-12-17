import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Filter } from "lucide-react";
import { Button } from "../components/ui/button";
import { portfolioAPI } from "../lib/api";

const PortfolioPage = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const filters = [
    { id: "all", label: "Tous" },
    { id: "site_web", label: "Site Web" },
    { id: "site_ecommerce", label: "E-commerce" },
    { id: "reseaux_sociaux", label: "Réseaux Sociaux" },
    { id: "photo", label: "Photo" },
    { id: "video", label: "Vidéo" },
    { id: "infographie", label: "Infographie" },
    { id: "ads", label: "Ads" }
  ];

  // Placeholder data for demo
  const placeholderItems = [
    {
      id: "1",
      title: "Restaurant Le Marin",
      category: "site_web",
      description: "Site vitrine responsive avec réservation en ligne",
      image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
      tags: ["Site Web", "Restaurant"]
    },
    {
      id: "2",
      title: "Boutique Créole",
      category: "site_ecommerce",
      description: "E-commerce de produits locaux guadeloupéens",
      image_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
      tags: ["E-commerce", "Boutique"]
    },
    {
      id: "3",
      title: "Cabinet d'Avocats",
      category: "site_web",
      description: "Site institutionnel avec prise de rendez-vous",
      image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
      tags: ["Site Web", "Services"]
    },
    {
      id: "4",
      title: "Campagne Social Media",
      category: "reseaux_sociaux",
      description: "Stratégie et création de contenu Instagram",
      image_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80",
      tags: ["Social Media", "Instagram"]
    },
    {
      id: "5",
      title: "Shooting Hôtel",
      category: "photo",
      description: "Photos corporate et lifestyle pour hôtel 4 étoiles",
      image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
      tags: ["Photo", "Hôtellerie"]
    },
    {
      id: "6",
      title: "Vidéo Promotionnelle",
      category: "video",
      description: "Spot vidéo pour lancement de produit",
      image_url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&q=80",
      tags: ["Vidéo", "Marketing"]
    },
    {
      id: "7",
      title: "Identité Visuelle Restaurant",
      category: "infographie",
      description: "Création de logo, carte de visite et menu",
      image_url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80",
      tags: ["Infographie", "Branding"]
    },
    {
      id: "8",
      title: "Flyers Événement",
      category: "infographie",
      description: "Conception de supports print pour événement",
      image_url: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&q=80",
      tags: ["Infographie", "Print"]
    }
  ];

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await portfolioAPI.getAll();
        setItems(response.data.length > 0 ? response.data : placeholderItems);
      } catch (error) {
        setItems(placeholderItems);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  const filteredItems = activeFilter === "all" 
    ? items 
    : items.filter(item => item.category === activeFilter);

  return (
    <div data-testid="portfolio-page" className="bg-white">
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
              data-testid="portfolio-headline"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-6"
            >
              Nos <span className="text-[#CE0202]">réalisations</span>
            </h1>
            <p className="text-lg lg:text-xl text-[#666666]">
              Découvrez quelques-uns de nos projets et laissez-vous inspirer pour votre prochaine collaboration.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-3">
            {filters.map((filter) => (
              <Button
                key={filter.id}
                data-testid={`filter-${filter.id}`}
                variant={activeFilter === filter.id ? "default" : "outline"}
                onClick={() => setActiveFilter(filter.id)}
                className={`rounded-full px-6 py-2 text-sm ${
                  activeFilter === filter.id
                    ? "bg-[#CE0202] text-white hover:bg-[#B00202] hover:text-white"
                    : "border-[#E5E5E5] text-[#1A1A1A] hover:border-[#CE0202] hover:text-[#CE0202] bg-transparent"
                }`}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section data-testid="portfolio-grid" className="px-6 pb-24 bg-white">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/3] bg-[#F8F8F8] animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    data-testid={`portfolio-item-${index}`}
                    className="group relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer shadow-lg"
                  >
                    {/* Image */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url('${item.image_url}')` }}
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.tags?.map((tag, i) => (
                          <span 
                            key={i}
                            className="text-xs px-2 py-1 bg-[#CE0202]/80 text-white rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-white/80 text-sm">{item.description}</p>
                      {item.link && (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-[#CE0202] text-sm font-semibold"
                        >
                          Voir le projet <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {filteredItems.length === 0 && !loading && (
            <div className="text-center py-16">
              <Filter className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
              <p className="text-[#666666]">Aucune réalisation dans cette catégorie pour le moment.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PortfolioPage;
