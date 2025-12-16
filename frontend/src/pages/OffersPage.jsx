import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Globe, Users, Camera, Video, Target, 
  CheckCircle, ArrowRight, Sparkles 
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const OffersPage = () => {
  const mainOffer = {
    title: "Site Web en 7 jours",
    price: "90€",
    period: "/mois",
    highlight: "Offre phare",
    description: "Votre site web professionnel clé en main, livré rapidement et sans compromis sur la qualité.",
    features: [
      "Site vitrine jusqu'à 5 pages",
      "Design responsive (mobile, tablette, desktop)",
      "Intégration de vos contenus (textes, images)",
      "SEO on-page de base (balises, structure)",
      "Formulaire de contact intégré",
      "Maintenance & mises à jour incluses",
      "Hébergement sécurisé inclus",
      "Certificat SSL (HTTPS)",
      "Support réactif"
    ]
  };

  const services = [
    {
      icon: Users,
      title: "Community Management",
      description: "Gestion complète de vos réseaux sociaux pour développer votre communauté.",
      features: [
        "Stratégie éditoriale sur-mesure",
        "Calendrier de contenus mensuel",
        "Création de posts (visuels + textes)",
        "Gestion de la communauté",
        "Modération des commentaires",
        "Reporting mensuel détaillé"
      ],
      cta: "Demander un devis"
    },
    {
      icon: Camera,
      title: "Photography",
      description: "Des visuels professionnels pour sublimer votre marque.",
      features: [
        "Shooting corporate",
        "Photos produits",
        "Couverture événementielle",
        "Retouches professionnelles",
        "Livraison HD optimisée web",
        "Droits d'utilisation inclus"
      ],
      cta: "Demander un devis"
    },
    {
      icon: Video,
      title: "Vidéography",
      description: "Contenus vidéo engageants pour vos réseaux et votre site.",
      features: [
        "Reels & shorts",
        "Vidéos corporate",
        "Captation événementielle",
        "Montage professionnel",
        "Motion design",
        "Sous-titrage"
      ],
      cta: "Demander un devis"
    },
    {
      icon: Target,
      title: "Publicité Digitale",
      description: "Campagnes publicitaires orientées ROI sur tous les canaux.",
      features: [
        "Meta Ads (Facebook, Instagram)",
        "Google Ads (Search, Display)",
        "TikTok Ads",
        "Création des visuels publicitaires",
        "A/B testing & optimisation",
        "Reporting ROI détaillé"
      ],
      cta: "Demander un devis"
    }
  ];

  return (
    <div data-testid="offers-page" className="bg-[#050505]">
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 
              data-testid="offers-headline"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
            >
              Nos <span className="text-[#6A0F1A]">offres</span>
            </h1>
            <p className="text-lg lg:text-xl text-[#A1A1AA]">
              Des solutions digitales complètes pour développer votre présence en ligne, 
              adaptées à tous les budgets.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Offer - Site Web 90€ */}
      <section data-testid="main-offer-section" className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="bg-gradient-to-br from-[#6A0F1A]/20 to-transparent border-[#6A0F1A]/30 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CardContent className="p-8 lg:p-12">
                  <Badge className="bg-[#6A0F1A] text-white mb-4">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {mainOffer.highlight}
                  </Badge>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                    {mainOffer.title}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl lg:text-6xl font-bold text-[#6A0F1A]">{mainOffer.price}</span>
                    <span className="text-xl text-[#A1A1AA]">{mainOffer.period}</span>
                  </div>
                  <p className="text-[#A1A1AA] text-lg mb-8">
                    {mainOffer.description}
                  </p>
                  <Link to="/contact">
                    <Button 
                      data-testid="main-offer-cta"
                      className="bg-[#6A0F1A] hover:bg-[#8B1422] text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider w-full sm:w-auto"
                    >
                      Lancer mon site à 90€/mois
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
                
                <CardContent className="p-8 lg:p-12 bg-black/30">
                  <h3 className="text-xl font-bold text-white mb-6">Ce qui est inclus :</h3>
                  <ul className="space-y-4">
                    {mainOffer.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-[#6A0F1A] flex-shrink-0 mt-0.5" />
                        <span className="text-[#E1E1E1]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Other Services */}
      <section data-testid="services-section" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              Nos autres <span className="text-[#6A0F1A]">services</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Complétez votre présence digitale avec nos services 360°
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  className="card-marketing h-full"
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-[#6A0F1A]/10 rounded-lg flex items-center justify-center mb-4">
                      <service.icon className="w-6 h-6 text-[#6A0F1A]" />
                    </div>
                    <CardTitle className="text-2xl text-white">{service.title}</CardTitle>
                    <p className="text-[#A1A1AA]">{service.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-[#6A0F1A] flex-shrink-0 mt-0.5" />
                          <span className="text-[#A1A1AA] text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/contact">
                      <Button 
                        variant="outline"
                        className="border-white/20 hover:border-[#6A0F1A] hover:text-[#6A0F1A] text-white rounded-none w-full py-4 text-sm font-bold uppercase tracking-wider bg-transparent"
                      >
                        {service.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pack 360° CTA */}
      <section className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="bg-[#6A0F1A]/20 text-[#6A0F1A] border-[#6A0F1A]/30 mb-6">
              Pack complet
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Besoin d'une solution<br />
              <span className="text-[#6A0F1A]">360° sur-mesure ?</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg mb-8 max-w-2xl mx-auto">
              Combinez nos services pour une stratégie digitale complète et cohérente. 
              Site web + Community Management + Publicité : le trio gagnant pour votre croissance.
            </p>
            <Link to="/contact">
              <Button 
                data-testid="pack-360-cta"
                className="bg-[#6A0F1A] hover:bg-[#8B1422] text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider"
              >
                Demander un devis Pack 360°
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default OffersPage;
