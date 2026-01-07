import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Globe, 
  Users, 
  Camera, 
  Video, 
  Target, 
  ArrowRight, 
  CheckCircle,
  Clock,
  Zap,
  Shield,
  ChevronRight,
  Palette
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const HomePage = () => {
  const services = [
    {
      icon: Globe,
      title: "Site Web",
      description: "Sites vitrines et e-commerce livrés en 7 jours",
      highlight: "À partir de 90€/mois"
    },
    {
      icon: Users,
      title: "Community Management",
      description: "Gestion complète de vos réseaux sociaux",
      highlight: "Stratégie & Contenu"
    },
    {
      icon: Camera,
      title: "Photographie",
      description: "Shootings professionnels pour votre marque",
      highlight: "Corporate & Produits"
    },
    {
      icon: Video,
      title: "Vidéographie",
      description: "Captation et montage vidéo haute qualité",
      highlight: "Reels & Spots"
    },
    {
      icon: Palette,
      title: "Infographie",
      description: "Création graphique de visuels en tout genre",
      highlight: "Print & Digital"
    },
    {
      icon: Target,
      title: "Publicité Digitale",
      description: "Campagnes Meta Ads, Google Ads, TikTok",
      highlight: "ROI Optimisé"
    }
  ];

  const stats = [
    { value: "150+", label: "Clients accompagnés" },
    { value: "7j", label: "Délai de livraison" },
    { value: "98%", label: "Satisfaction client" },
    { value: "24/7", label: "Support réactif" }
  ];

  const benefits = [
    {
      icon: Clock,
      title: "Livraison rapide",
      description: "Votre site en ligne en seulement 7 jours"
    },
    {
      icon: Zap,
      title: "Performance",
      description: "Sites optimisés SEO et mobile-first"
    },
    {
      icon: Shield,
      title: "Sécurité",
      description: "Hébergement sécurisé et certificat SSL inclus"
    }
  ];

  return (
    <div data-testid="home-page" className="bg-white">
      {/* Hero Section */}
      <section 
        data-testid="hero-section"
        className="relative min-h-screen flex items-center justify-center px-6 pt-24 md:pt-0 overflow-hidden"
      >
        {/* Background Image - Guadeloupe Ocean */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1920&q=80)'
          }}
        />
        {/* Dark Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="bg-[#CE0202]/20 text-[#CE0202] border-[#CE0202]/30 mb-6 text-xs sm:text-sm">
              Agence de communication 360° en Guadeloupe
            </Badge>
            
            <h1 
              data-testid="hero-headline"
              className="text-3xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            >
              Votre présence digitale<br />
              <span className="text-[#CE0202]">commence ici</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Site web professionnel livré en 7 jours, community management (gestion des réseaux sociaux), 
              photographie, vidéographie et publicité digitale. Tout ce dont vous avez besoin pour briller en ligne.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button 
                  data-testid="hero-cta-devis"
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider"
                >
                  Demander un devis
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/offres">
                <Button 
                  data-testid="hero-cta-offres"
                  variant="outline"
                  className="border-white/40 hover:border-white hover:bg-white hover:text-[#1A1A1A] text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider bg-transparent"
                >
                  Découvrir nos offres
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-[#CE0202] rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Promo Banner */}
      <section className="bg-[#CE0202] py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white font-semibold text-center md:text-left">
            🚀 Site web professionnel (vitrine ou e-commerce) à partir de <span className="text-2xl font-bold">90€/mois</span> • Engagement 24 mois
          </p>
          <Link to="/offres">
            <Button 
              data-testid="banner-cta"
              className="bg-white text-[#CE0202] hover:bg-white/90 hover:text-[#CE0202] rounded-none px-6 py-3 text-sm font-bold uppercase tracking-wider"
            >
              En savoir plus
              <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <section data-testid="services-section" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
              Nos <span className="text-[#CE0202]">services</span>
            </h2>
            <p className="text-[#666666] text-lg max-w-2xl mx-auto">
              Une offre complète pour accompagner votre croissance digitale
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  data-testid={`service-${index}`}
                  className="card-marketing h-full bg-white border border-[#E5E5E5] hover:border-[#CE0202]/30 transition-all group"
                >
                  <CardContent className="p-8">
                    <div className="w-14 h-14 bg-[#CE0202]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#CE0202] transition-colors">
                      <service.icon className="w-7 h-7 text-[#CE0202] group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{service.title}</h3>
                    <p className="text-[#666666] mb-4">{service.description}</p>
                    <Badge className="bg-[#F8F8F8] text-[#CE0202] border-none">
                      {service.highlight}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/offres">
              <Button 
                data-testid="cta-voir-offres"
                variant="outline"
                className="border-[#1A1A1A]/20 hover:border-[#CE0202] hover:bg-[#CE0202] hover:text-white text-[#1A1A1A] rounded-none px-8 py-4 text-sm font-bold uppercase tracking-wider bg-transparent"
              >
                Voir toutes nos offres
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl lg:text-5xl font-bold text-[#CE0202] mb-2 font-mono">
                  {stat.value}
                </p>
                <p className="text-white/70 text-sm uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-6 bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-5xl font-bold text-[#1A1A1A] mb-6">
                Alpha Agency,<br />
                <span className="text-[#CE0202]">votre partenaire digital</span>
              </h2>
              <p className="text-[#666666] text-lg mb-6">
                Basée en Guadeloupe, Alpha Agency accompagne les entreprises locales et nationales 
                dans leur transformation digitale depuis plus de 5 ans.
              </p>
              <p className="text-[#666666] text-lg mb-8">
                Notre mission : rendre le digital accessible à toutes les entreprises, 
                avec des solutions sur-mesure et un accompagnement personnalisé.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="flex flex-col items-start">
                    <div className="w-10 h-10 bg-[#CE0202]/10 rounded-lg flex items-center justify-center mb-3">
                      <benefit.icon className="w-5 h-5 text-[#CE0202]" />
                    </div>
                    <h4 className="font-semibold text-[#1A1A1A] mb-1">{benefit.title}</h4>
                    <p className="text-sm text-[#666666]">{benefit.description}</p>
                  </div>
                ))}
              </div>

              <Link to="/agence">
                <Button 
                  data-testid="cta-decouvrir-agence"
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white rounded-none px-8 py-4 text-sm font-bold uppercase tracking-wider"
                >
                  Découvrir l'agence
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div 
                className="aspect-square rounded-lg overflow-hidden"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?crop=entropy&cs=srgb&fm=jpg&q=85')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="absolute -bottom-6 -left-6 bg-[#CE0202] p-6 rounded-lg text-white">
                <p className="text-3xl font-bold">5+</p>
                <p className="text-sm">Années d'expérience</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-[#1A1A1A] mb-6">
              Prêt à booster votre<br />
              <span className="text-[#CE0202]">présence digitale ?</span>
            </h2>
            <p className="text-[#666666] text-lg mb-8">
              Contactez-nous pour un audit gratuit et un devis personnalisé.
              Notre équipe vous répond sous 24h.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button 
                  data-testid="final-cta-devis"
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider"
                >
                  Demander un devis gratuit
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="tel:0691266003">
                <Button 
                  data-testid="final-cta-call"
                  variant="outline"
                  className="border-[#1A1A1A]/20 hover:border-[#CE0202] hover:bg-[#CE0202] hover:text-white text-[#1A1A1A] rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider bg-transparent"
                >
                  Être rappelé
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
