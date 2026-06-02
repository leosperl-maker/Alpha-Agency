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
  Palette
} from "lucide-react";
import { Button } from "../components/ui/button";

const RED = "#E11D2E";
const BG = "#0A0507";

const OffersPage = () => {
  const mainOffer = {
    title: "Site Web Professionnel",
    subtitle: "Vitrine ou e-commerce",
    price: "49",
    period: "/mois",
    engagement: "Engagement 24 mois",
    highlight: "Le plus populaire",
    description:
      "Votre site web livré en 7 jours, vitrine ou e-commerce, c'est vous qui choisissez. Design moderne, pensé pour le mobile et pour bien remonter sur Google.",
    features: [
      "Site vitrine OU e-commerce au choix",
      "Design personnalisé et responsive",
      "Optimisation SEO de base",
      "Formulaire de contact",
      "Intégration Google Analytics",
      "Certificat SSL (HTTPS)",
      "Nom de domaine inclus (1ère année)",
      "Hébergement inclus",
      "Maintenance et mises à jour",
      "Support technique prioritaire",
      "Livraison en 7 jours"
    ]
  };

  const services = [
    {
      icon: Users,
      title: "Réseaux sociaux",
      description: "On gère vos comptes au quotidien, de A à Z.",
      features: [
        "Stratégie social media sur mesure",
        "Création de contenus (posts, stories, reels)",
        "Planning éditorial mensuel",
        "Veille et modération",
        "Reporting mensuel"
      ],
      cta: "Demander un devis"
    },
    {
      icon: Camera,
      title: "Photographie",
      description: "Des shootings pro pour votre marque.",
      features: [
        "Photos corporate et portraits",
        "Packshots produits",
        "Reportage événementiel",
        "Photos lifestyle et ambiance",
        "Retouche professionnelle"
      ],
      cta: "Réserver un shooting"
    },
    {
      icon: Video,
      title: "Vidéographie",
      description: "Captation et montage haute qualité.",
      features: [
        "Spots publicitaires",
        "Vidéos corporate",
        "Reels et contenus sociaux",
        "Captation événementielle",
        "Montage et post-production"
      ],
      cta: "Demander un devis"
    },
    {
      icon: Palette,
      title: "Infographie",
      description: "Vos visuels print et digital, sur mesure.",
      features: [
        "Logos et identité visuelle",
        "Flyers et brochures",
        "Cartes de visite et papeterie",
        "Visuels pour réseaux sociaux",
        "Tous formats print et digital"
      ],
      cta: "Demander un devis"
    },
    {
      icon: Target,
      title: "Publicité digitale",
      description: "Des campagnes qui rapportent vraiment.",
      features: [
        "Campagnes Meta Ads (Facebook/Instagram)",
        "Campagnes Google Ads",
        "Ciblage d'audience précis",
        "A/B testing et optimisation",
        "Reporting et analyse du ROI"
      ],
      cta: "Lancer ma campagne"
    }
  ];

  return (
    <div data-testid="offers-page" className="text-white" style={{ backgroundColor: BG }}>
      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(110% 80% at 50% 0%, #2A0712 0%, #0A0507 65%)" }}
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1
              data-testid="offers-headline"
              className="font-display text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              Nos <span style={{ color: RED }}>offres</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/60">
              Des solutions claires, adaptées à vos besoins et à votre budget.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Offer */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="rounded-3xl border-2 overflow-hidden bg-white/[0.03] backdrop-blur-sm" style={{ borderColor: RED }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-8 lg:p-12">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider mb-5" style={{ backgroundColor: RED }}>
                    <Globe className="w-3 h-3" aria-hidden="true" />
                    {mainOffer.highlight}
                  </span>
                  <h2 className="font-display text-3xl lg:text-4xl font-extrabold mb-2">{mainOffer.title}</h2>
                  <p className="text-lg font-semibold mb-4" style={{ color: RED }}>{mainOffer.subtitle}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="font-display text-6xl font-extrabold">{mainOffer.price}€</span>
                    <span className="text-xl text-white/50">{mainOffer.period}</span>
                  </div>
                  <p className="font-semibold text-sm mb-6" style={{ color: RED }}>{mainOffer.engagement}</p>
                  <p className="text-white/60 text-lg mb-8">{mainOffer.description}</p>
                  <Link to="/contact">
                    <Button
                      data-testid="main-offer-cta"
                      className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider w-full sm:w-auto transition-all duration-300"
                    >
                      Lancer mon site à 49€/mois
                      <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>

                <div className="p-8 lg:p-12 bg-white/[0.03] border-t lg:border-t-0 lg:border-l border-white/10">
                  <h3 className="font-display text-xl font-bold mb-6">Ce qui est inclus :</h3>
                  <ul className="space-y-4">
                    {mainOffer.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: RED }} aria-hidden="true" />
                        <span className="text-white/85">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
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
            <h2 className="font-display text-3xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Nos autres <span style={{ color: RED }}>services</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Complétez votre présence digitale avec nos services 360°.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <div
                  data-testid={`service-${index}`}
                  className="h-full bg-white/[0.03] border border-white/10 rounded-2xl p-8 hover:border-white/30 hover:bg-white/[0.05] transition-all duration-300 flex flex-col"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(225,29,46,0.12)" }}>
                    <service.icon className="w-6 h-6" style={{ color: RED }} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-2">{service.title}</h3>
                  <p className="text-white/55 mb-6">{service.description}</p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: RED }} aria-hidden="true" />
                        <span className="text-white/55 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/contact" className="mt-auto">
                    <Button
                      variant="outline"
                      className="border-white/20 hover:border-white hover:bg-white hover:text-[#0A0507] text-white rounded-full w-full py-4 text-sm font-bold uppercase tracking-wider bg-transparent transition-colors duration-300"
                    >
                      {service.cta}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pack 360° CTA */}
      <section className="py-24 px-6 relative overflow-hidden border-t border-white/10">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(120% 80% at 50% 120%, #C8102E 0%, #4A0C1B 38%, #0A0507 72%)" }}
          aria-hidden="true"
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/20 text-white/80">
              Pack complet
            </span>
            <h2 className="font-display text-3xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
              Besoin d'une solution<br />
              <span style={{ color: RED }}>360° sur mesure ?</span>
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
              On combine nos services pour une stratégie digitale complète et cohérente.
              Site web, réseaux sociaux et publicité : le trio gagnant pour votre croissance.
            </p>
            <Link to="/contact">
              <Button
                data-testid="pack-360-cta"
                className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider transition-all duration-300"
              >
                Demander un devis Pack 360°
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default OffersPage;
