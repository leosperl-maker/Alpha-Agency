import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Filter, X, ChevronLeft, ChevronRight, Download, Play, Pause, Volume2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { portfolioAPI } from "../lib/api";
import RichContentRenderer from "../components/RichContentRenderer";

const PortfolioPage = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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

  // Placeholder data with rich content
  const placeholderItems = [
    {
      id: "1",
      title: "Restaurant Le Marin",
      category: "site_web",
      description: "Création d'un site vitrine responsive avec système de réservation en ligne pour un restaurant gastronomique en Guadeloupe. Design moderne et élégant, mis en avant des plats signature et de l'ambiance du lieu.",
      image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
        "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1200&q=80"
      ],
      tags: ["Site Web", "Restaurant", "Responsive"],
      link: "https://example.com",
      client: "Le Marin",
      date: "2024"
    },
    {
      id: "2",
      title: "Boutique Créole",
      category: "site_ecommerce",
      description: "Développement d'une boutique e-commerce complète pour la vente de produits locaux guadeloupéens. Intégration de paiement sécurisé, gestion des stocks et livraison.",
      image_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
        "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&q=80"
      ],
      tags: ["E-commerce", "Boutique", "Stripe"],
      client: "Boutique Créole",
      date: "2024"
    },
    {
      id: "3",
      title: "Cabinet d'Avocats",
      category: "site_web",
      description: "Site institutionnel professionnel avec prise de rendez-vous en ligne et présentation de l'équipe et des domaines d'expertise.",
      image_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80"
      ],
      tags: ["Site Web", "Services", "Juridique"],
      client: "Cabinet Martin & Associés",
      date: "2024"
    },
    {
      id: "4",
      title: "Campagne Social Media - Resort",
      category: "reseaux_sociaux",
      description: "Stratégie de contenu complète pour Instagram et Facebook. Création de posts, stories et reels pour augmenter l'engagement et les réservations.",
      image_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80",
        "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&q=80",
        "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=1200&q=80"
      ],
      tags: ["Social Media", "Instagram", "Facebook"],
      client: "Paradise Resort",
      date: "2024"
    },
    {
      id: "5",
      title: "Shooting Hôtel 4 Étoiles",
      category: "photo",
      description: "Reportage photo complet pour un hôtel de luxe : chambres, espaces communs, restaurant, piscine. Photos lifestyle et ambiance pour communication print et web.",
      image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80"
      ],
      tags: ["Photo", "Hôtellerie", "Lifestyle"],
      client: "Hôtel La Créole",
      date: "2024"
    },
    {
      id: "6",
      title: "Spot Publicitaire - Lancement Produit",
      category: "video",
      description: "Réalisation d'un spot vidéo de 30 secondes pour le lancement d'un nouveau produit. Captation, montage et post-production.",
      image_url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&q=80"
      ],
      tags: ["Vidéo", "Marketing", "Publicité"],
      client: "Tropical Drinks",
      date: "2024"
    },
    {
      id: "7",
      title: "Identité Visuelle Restaurant",
      category: "infographie",
      description: "Création complète de l'identité visuelle : logo, charte graphique, carte de visite, menu, packaging. Design moderne et élégant inspiré de la gastronomie locale.",
      image_url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&q=80",
        "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80"
      ],
      tags: ["Infographie", "Branding", "Logo"],
      client: "Saveurs Antillaises",
      date: "2024",
      documents: [
        { name: "Charte graphique.pdf", url: "#" },
        { name: "Logo HD.zip", url: "#" }
      ]
    },
    {
      id: "8",
      title: "Pub Radio - Festival",
      category: "ads",
      description: "Création d'un spot radio de 20 secondes pour la promotion d'un festival de musique. Composition musicale originale et voix off professionnelle.",
      image_url: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&q=80",
      gallery: [
        "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80"
      ],
      tags: ["Publicité", "Radio", "Audio"],
      client: "Festival Gwoka",
      date: "2024",
      audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
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

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    setIsPlaying(false);
    setDialogOpen(true);
  };

  const nextImage = () => {
    if (selectedItem?.gallery) {
      setCurrentImageIndex((prev) => 
        prev === selectedItem.gallery.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedItem?.gallery) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedItem.gallery.length - 1 : prev - 1
      );
    }
  };

  const toggleAudio = () => {
    const audio = document.getElementById('portfolio-audio');
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

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
                    onClick={() => handleItemClick(item)}
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
                        {item.tags?.slice(0, 2).map((tag, i) => (
                          <span 
                            key={i}
                            className="text-xs px-2 py-1 bg-[#CE0202]/80 text-white rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-white/80 text-sm line-clamp-2">{item.description}</p>
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

      {/* Detail Dialog - Modern Gallery Style */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-[#E5E5E5] max-w-5xl max-h-[95vh] overflow-hidden p-0">
          {selectedItem && (
            <div className="relative">
              {/* Close Button - Fixed */}
              <button
                onClick={() => setDialogOpen(false)}
                className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" />
              </button>

              {/* Scrollable Content */}
              <div className="overflow-y-auto max-h-[95vh]">
                {/* Header Section */}
                <div className="p-6 pb-4 bg-white sticky top-0 z-40 border-b border-[#E5E5E5]">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedItem.tags?.map((tag, i) => (
                      <Badge key={i} className="bg-[#CE0202]/10 text-[#CE0202] border-none text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">{selectedItem.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-[#666666] mt-1">
                    {selectedItem.client && <span>Client: {selectedItem.client}</span>}
                    {selectedItem.date && <span>• {selectedItem.date}</span>}
                  </div>
                </div>

                {/* Gallery - Vertical Scrolling Images */}
                <div className="bg-[#0A0A0A]">
                  {selectedItem.gallery && selectedItem.gallery.length > 0 ? (
                    <div className="space-y-1">
                      {selectedItem.gallery.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="relative group"
                        >
                          <img
                            src={img}
                            alt={`${selectedItem.title} - Image ${idx + 1}`}
                            className="w-full h-auto max-h-[80vh] object-contain mx-auto"
                            style={{ backgroundColor: '#0A0A0A' }}
                          />
                          {/* Image counter overlay */}
                          <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx + 1} / {selectedItem.gallery.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.title}
                      className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                    />
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 bg-white">
                  {/* Description */}
                  {selectedItem.description && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2 uppercase tracking-wide">Description</h3>
                      <p className="text-[#666666] leading-relaxed">{selectedItem.description}</p>
                    </div>
                  )}

                  {/* Audio Player */}
                  {selectedItem.audio_url && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <Volume2 className="w-4 h-4 text-[#CE0202]" />
                        Audio
                      </h3>
                      <div className="bg-[#F8F8F8] p-4 rounded-lg border border-[#E5E5E5]">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={toggleAudio}
                            className="w-12 h-12 bg-[#CE0202] hover:bg-[#B00202] text-white rounded-full flex items-center justify-center transition-colors"
                          >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                          </button>
                          <div className="flex-1">
                            <p className="text-[#1A1A1A] font-medium">Écouter</p>
                            <p className="text-sm text-[#666666]">Spot publicitaire audio</p>
                          </div>
                        </div>
                        <audio id="portfolio-audio" src={selectedItem.audio_url} onEnded={() => setIsPlaying(false)} />
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {selectedItem.documents && selectedItem.documents.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <Download className="w-4 h-4 text-[#CE0202]" />
                        Documents
                      </h3>
                      <div className="space-y-2">
                        {selectedItem.documents.map((doc, i) => (
                          <a
                            key={i}
                            href={doc.url}
                            download
                            className="flex items-center gap-3 p-3 bg-[#F8F8F8] rounded-lg border border-[#E5E5E5] hover:border-[#CE0202] transition-colors group"
                          >
                            <Download className="w-5 h-5 text-[#666666] group-hover:text-[#CE0202]" />
                            <span className="text-[#1A1A1A] group-hover:text-[#CE0202]">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* External Link */}
                  {selectedItem.link && (
                    <a
                      href={selectedItem.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#CE0202] hover:underline font-medium"
                    >
                      Voir le projet en ligne
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioPage;
