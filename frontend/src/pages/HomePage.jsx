import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Globe,
  Users,
  Camera,
  Video,
  Target,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Zap,
  Shield,
  Palette,
  Image as ImageIcon,
  MapPin,
} from "lucide-react";
import { Button } from "../components/ui/button";
import LottieLoader from "../components/motion/LottieLoaderLazy";
import Magnetic from "../components/motion/Magnetic";
import RotatingWord from "../components/motion/RotatingWord";

// Palette bordeaux / rouge profond (aucun rose)
const RED = "#E11D2E";        // rouge vif lisible sur fond sombre
const BORDEAUX = "#5C0A1E";   // bordeaux profond
const BG = "#0A0507";         // noir chaud
const WORD_GRADIENT = "linear-gradient(100deg,#F2384A,#C8102E 45%,#6E0A1C)";
const heroWords = ["marques", "sites web", "campagnes", "vidéos", "images"];

const services = [
  { icon: Globe, title: "Site Web", description: "Sites vitrines & e-commerce livrés en 7 jours.", highlight: "Dès 90€/mois", big: true },
  { icon: Users, title: "Community Management", description: "Gestion complète de vos réseaux sociaux.", highlight: "Stratégie & contenu" },
  { icon: Camera, title: "Photographie", description: "Shootings pro pour votre marque.", highlight: "Corporate & produits" },
  { icon: Video, title: "Vidéographie", description: "Captation & montage haute qualité.", highlight: "Reels & spots", big: true },
  { icon: Palette, title: "Infographie", description: "Création graphique en tout genre.", highlight: "Print & digital" },
  { icon: Target, title: "Publicité Digitale", description: "Campagnes Meta, Google & TikTok Ads.", highlight: "ROI optimisé" },
];

const stats = [
  { value: "150+", label: "Clients accompagnés" },
  { value: "7j", label: "Délai de livraison" },
  { value: "98%", label: "Satisfaction client" },
  { value: "24/7", label: "Support réactif" },
];

const benefits = [
  { icon: Clock, title: "Livraison rapide", description: "Votre site en ligne en 7 jours." },
  { icon: Zap, title: "Performance", description: "Optimisé SEO et mobile-first." },
  { icon: Shield, title: "Sécurité", description: "Hébergement sécurisé & SSL inclus." },
];

const projects = [
  { category: "Site E-commerce", client: "Marque locale" },
  { category: "Identité visuelle", client: "Restaurant" },
  { category: "Campagne Ads", client: "Immobilier" },
  { category: "Réseaux sociaux", client: "Hôtellerie" },
];

const marqueeWords = [
  "Site Web", "Community Management", "Photographie",
  "Vidéographie", "Infographie", "Publicité Digitale",
];

// Zone visuelle temporaire élégante — prête à recevoir tes vrais visuels.
const Placeholder = ({ label = "Visuel à venir", className = "", rounded = "rounded-2xl" }) => (
  <div className={`relative overflow-hidden ${rounded} bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 ${className}`}>
    <div className="absolute inset-0 grain-overlay opacity-[0.15]" aria-hidden="true" />
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30">
      <ImageIcon className="w-8 h-8" aria-hidden="true" />
      <span className="text-[10px] uppercase tracking-[0.25em]">{label}</span>
    </div>
  </div>
);

const HomePage = () => {
  const rm = useReducedMotion();
  const fadeUp = {
    initial: { opacity: 0, y: rm ? 0 : 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <div data-testid="home-page" className="text-white overflow-x-hidden" style={{ backgroundColor: BG }}>
      {/* ===================== HERO — ambiance bordeaux + titre cinétique ===================== */}
      <section
        data-testid="hero-section"
        className="relative min-h-screen w-full flex items-center justify-center px-6 pt-28 pb-20 overflow-hidden"
      >
        {/* Orbes lumineux bordeaux (animation transform-only = fluide, pas de WebGL) */}
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full blur-[130px] pointer-events-none"
          style={{ width: "44rem", height: "44rem", top: "-12%", left: "-8%", background: BORDEAUX, opacity: 0.6 }}
          animate={rm ? {} : { x: [0, 70, 0], y: [0, 50, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full blur-[130px] pointer-events-none"
          style={{ width: "38rem", height: "38rem", bottom: "-15%", right: "-6%", background: "#7A0F22", opacity: 0.5 }}
          animate={rm ? {} : { x: [0, -60, 0], y: [0, -40, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full blur-[100px] pointer-events-none"
          style={{ width: "22rem", height: "22rem", top: "30%", left: "55%", background: "#3A0712", opacity: 0.6 }}
          animate={rm ? {} : { x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Vignette + grain pour la lisibilité et le grain ciné */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(70% 60% at 50% 42%, transparent 0%, ${BG} 80%)` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 grain-overlay opacity-[0.10] pointer-events-none" aria-hidden="true" />

        <div className="max-w-5xl mx-auto w-full relative z-10 flex flex-col items-center text-center">
          <motion.div
            className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs font-mono uppercase tracking-[0.25em] text-white/70"
            initial={{ opacity: 0, y: rm ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ backgroundColor: RED }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: RED }} />
            </span>
            Agence créative 360° · Guadeloupe
          </motion.div>

          <h1
            data-testid="hero-headline"
            className="font-display font-extrabold leading-[1.12] tracking-tight text-[2.6rem] sm:text-7xl lg:text-[7rem] text-white"
          >
            <motion.span
              className="block"
              initial={{ opacity: 0, y: rm ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              On crée des
            </motion.span>
            <RotatingWord
              words={heroWords}
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: WORD_GRADIENT }}
            />
            <motion.span
              className="block"
              initial={{ opacity: 0, y: rm ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              qui marquent.
            </motion.span>
          </h1>

          <motion.p
            className="mt-8 text-base sm:text-lg text-white/65 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: rm ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
          >
            Site web, réseaux sociaux, photo, vidéo et publicité digitale.
            Une agence 360° en Guadeloupe qui transforme votre présence en ligne
            en véritable moteur de croissance.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: rm ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
          >
            <Magnetic>
              <Link to="/contact">
                <Button
                  data-testid="hero-cta-devis"
                  className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider transition-all duration-300 w-full sm:w-auto"
                >
                  Demander un devis
                  <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link to="/realisations">
                <Button
                  data-testid="hero-cta-offres"
                  variant="outline"
                  className="border-white/25 hover:border-white hover:bg-white/10 text-white rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider bg-white/[0.04] backdrop-blur-sm transition-all duration-300 w-full sm:w-auto"
                >
                  Voir nos réalisations
                </Button>
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        {/* Indicateur de scroll */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block z-20"
          animate={rm ? {} : { y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          aria-hidden="true"
        >
          <div className="w-6 h-10 border-2 border-white/25 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: RED }} />
          </div>
        </motion.div>
      </section>

      {/* ===================== MARQUEE ===================== */}
      <section className="py-5 overflow-hidden border-y border-white/10 bg-white/[0.02]" aria-hidden="true">
        <div className="alpha-marquee items-center">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center">
              {marqueeWords.map((w, i) => (
                <span key={`${dup}-${i}`} className="flex items-center">
                  <span className="font-display text-2xl sm:text-3xl font-bold text-white/90 px-6">{w}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RED }} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===================== SERVICES — bento ===================== */}
      <section data-testid="services-section" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2 className="font-display text-4xl lg:text-6xl font-extrabold tracking-tight">
              Nos <span style={{ color: RED }}>services</span>
            </h2>
            <p className="text-white/50 text-lg max-w-md">
              Une offre 360° pour accompagner toute votre croissance digitale, de la
              création à la diffusion.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 grid-flow-dense">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: rm ? 0 : index * 0.07 }}
                className={service.big ? "md:col-span-2" : ""}
              >
                <div
                  data-testid={`service-${index}`}
                  className="group relative h-full min-h-[220px] bg-white/[0.03] rounded-2xl border border-white/10 p-8 overflow-hidden hover:border-white/30 hover:bg-white/[0.05] transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="relative z-10">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300"
                      style={{ backgroundColor: "rgba(255,61,110,0.12)" }}
                    >
                      <service.icon className="w-7 h-7 transition-colors duration-300" style={{ color: RED }} aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-2 text-white">{service.title}</h3>
                    <p className="text-white/55 max-w-sm">{service.description}</p>
                  </div>
                  <span className="relative z-10 mt-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest" style={{ color: RED }}>
                    {service.highlight}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-12">
            <Link to="/offres">
              <Button
                data-testid="cta-voir-offres"
                variant="outline"
                className="border-white/20 hover:border-white hover:bg-white hover:text-[#0A0507] text-white rounded-full px-8 py-5 text-sm font-bold uppercase tracking-wider bg-transparent transition-colors duration-300"
              >
                Voir toutes nos offres
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===================== RÉALISATIONS — bento ===================== */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2 className="font-display text-4xl lg:text-6xl font-extrabold tracking-tight">
              Nos <span style={{ color: RED }}>réalisations</span>
            </h2>
            <Link to="/realisations" className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-white/80 hover:text-white transition-colors">
              Tout voir <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {projects.map((project, index) => (
              <motion.div
                key={project.category}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: rm ? 0 : index * 0.08 }}
                className={index === 0 ? "lg:col-span-2 lg:row-span-2" : ""}
              >
                <Link to="/realisations" className="group block">
                  <Placeholder
                    label={project.category}
                    className={`w-full ${index === 0 ? "aspect-[4/3] lg:aspect-[3/4]" : "aspect-[4/3]"}`}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-lg leading-tight text-white">{project.category}</p>
                      <p className="text-white/40 text-sm">{project.client}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" aria-hidden="true" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="py-20 px-6 border-y border-white/10 bg-white/[0.02] relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: rm ? 0 : index * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-5xl lg:text-7xl font-extrabold mb-2" style={{ color: RED }}>
                  {stat.value}
                </p>
                <p className="text-white/50 text-xs sm:text-sm uppercase tracking-[0.2em]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== À PROPOS — asymétrique ===================== */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: rm ? 0 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-display text-4xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Une agence<br />
              <span style={{ color: RED }}>ancrée ici.</span>
            </h2>
            <p className="text-white/65 text-lg mb-5 max-w-xl">
              Basée en Guadeloupe, Alpha Agency accompagne les entreprises des Antilles
              et d'ailleurs dans leur transformation digitale depuis plus de 5 ans.
            </p>
            <p className="text-white/65 text-lg mb-10 max-w-xl">
              Notre mission : rendre un digital de niveau mondial accessible à toutes les
              entreprises locales, avec un accompagnement sur-mesure.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {benefits.map((benefit) => (
                <div key={benefit.title}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: "rgba(255,61,110,0.12)" }}>
                    <benefit.icon className="w-5 h-5" style={{ color: RED }} aria-hidden="true" />
                  </div>
                  <h4 className="font-bold mb-1 text-white">{benefit.title}</h4>
                  <p className="text-sm text-white/50">{benefit.description}</p>
                </div>
              ))}
            </div>

            <Link to="/agence">
              <Button
                data-testid="cta-decouvrir-agence"
                className="text-white hover:text-white rounded-full px-8 py-5 text-sm font-bold uppercase tracking-wider transition-all duration-300"
                style={{ backgroundColor: "#CE0202" }}
              >
                Découvrir l'agence
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, x: rm ? 0 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Placeholder label="Équipe" className="aspect-[3/4] col-span-1 translate-y-6" />
            <Placeholder label="Studio" className="aspect-[3/4] col-span-1" />
          </motion.div>
        </div>
      </section>

      {/* ===================== CTA FINAL ===================== */}
      <section className="py-28 px-6 relative overflow-hidden border-t border-white/10">
        {/* Dégradé CSS (pas de WebGL ici, pour la fluidité) */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 80% at 50% 120%, #C8102E 0%, #4A0C1B 38%, #0A0507 72%)" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 grain-overlay opacity-[0.08] pointer-events-none" aria-hidden="true" />
        <motion.div {...fadeUp} className="max-w-4xl mx-auto text-center relative z-10">
            <LottieLoader size={56} className="mx-auto mb-6" />
            <h2 className="font-display text-4xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
              Prêt à <span style={{ color: RED }}>marquer</span> les esprits ?
            </h2>
            <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
              Audit gratuit et devis personnalisé. Notre équipe vous répond sous 24h.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button
                  data-testid="final-cta-devis"
                  className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider transition-all duration-300 w-full sm:w-auto"
                >
                  Demander un devis gratuit
                  <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
              <a href="tel:0691266003">
                <Button
                  data-testid="final-cta-call"
                  variant="outline"
                  className="border-white/30 hover:border-white hover:bg-white/10 text-white rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider bg-white/5 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto"
                >
                  Être rappelé
                </Button>
              </a>
            </div>
          </motion.div>
        </section>
    </div>
  );
};

export default HomePage;
