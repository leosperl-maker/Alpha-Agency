import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useParallax } from "../hooks/useParallax";
import HeroSceneLazy from "../components/three/HeroSceneLazy";
import LottieLoader from "../components/motion/LottieLoaderLazy";
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

const RED = "#CE0202";

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
  <div className={`relative overflow-hidden ${rounded} bg-gradient-to-br from-[#161616] to-[#2b2b2b] ${className}`}>
    <div className="absolute inset-0 grain-overlay opacity-[0.18]" aria-hidden="true" />
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/35">
      <ImageIcon className="w-8 h-8" aria-hidden="true" />
      <span className="text-[10px] uppercase tracking-[0.25em]">{label}</span>
    </div>
  </div>
);

const HomePage = () => {
  const rm = useReducedMotion();

  // Parallax GSAP sur le hero (halo + bloc visuel) — n'entre pas en conflit avec
  // framer-motion car appliqué sur des conteneurs distincts.
  const heroRef = useRef(null);
  const haloRef = useRef(null);
  const bentoWrapRef = useRef(null);
  useParallax(haloRef, { distance: -150, trigger: heroRef });
  useParallax(bentoWrapRef, { distance: -60, trigger: heroRef });

  const fadeUp = {
    initial: { opacity: 0, y: rm ? 0 : 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <div data-testid="home-page" className="bg-[#F7F5F2] text-[#0A0A0A] overflow-x-hidden">
      {/* ===================== HERO — éditorial ===================== */}
      <section
        ref={heroRef}
        data-testid="hero-section"
        className="relative min-h-screen flex items-center px-6 pt-28 pb-16 md:pt-24"
      >
        <div className="absolute inset-0 grain-overlay opacity-[0.06] pointer-events-none" aria-hidden="true" />
        {/* halo rouge décoratif (parallax) */}
        <div ref={haloRef} className="absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-20 pointer-events-none"
             style={{ background: `radial-gradient(circle, ${RED}, transparent 65%)` }} aria-hidden="true" />
        {/* Scène 3D légère (lazy, desktop uniquement) — accent de marque en fond */}
        <HeroSceneLazy className="absolute inset-y-0 right-0 w-1/2 z-0 opacity-50 pointer-events-none hidden lg:block" />

        <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-12 gap-10 items-center">
          {/* Colonne texte */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: rm ? 0 : 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2 mb-6 text-xs font-mono uppercase tracking-[0.3em] text-[#0A0A0A]/60">
              <MapPin className="w-3.5 h-3.5" style={{ color: RED }} aria-hidden="true" />
              Agence créative 360° · Guadeloupe · Caraïbe
            </div>

            <h1
              data-testid="hero-headline"
              className="font-display-syne font-extrabold leading-[0.92] tracking-tight text-[3rem] sm:text-[4.5rem] lg:text-[6rem]"
            >
              Faisons
              <span className="block" style={{ color: RED }}>briller</span>
              <span className="block text-stroke-dark">votre marque.</span>
            </h1>

            <p className="mt-8 text-base sm:text-lg text-[#0A0A0A]/70 max-w-xl">
              Site web livré en 7 jours, community management, photo, vidéo et
              publicité digitale. Tout pour rayonner en ligne — pensé ici, pour les
              entreprises des Antilles.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link to="/contact">
                <Button
                  data-testid="hero-cta-devis"
                  className="bg-[#CE0202] hover:bg-[#0A0A0A] text-white hover:text-white rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider transition-colors duration-300 w-full sm:w-auto"
                >
                  Demander un devis
                  <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/realisations">
                <Button
                  data-testid="hero-cta-offres"
                  variant="outline"
                  className="border-[#0A0A0A]/20 hover:border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white text-[#0A0A0A] rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider bg-transparent transition-colors duration-300 w-full sm:w-auto"
                >
                  Voir nos réalisations
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Colonne visuelle (bento) — wrapper statique pour le parallax GSAP */}
          <div ref={bentoWrapRef} className="lg:col-span-5">
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, scale: rm ? 1 : 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <Placeholder label="Réalisation" className="col-span-2 aspect-[16/10]" />
              <Placeholder label="Photo" className="aspect-square" />
              <div className="aspect-square rounded-2xl text-white p-5 flex flex-col justify-between" style={{ backgroundColor: RED }}>
                <span className="text-5xl font-extrabold font-display-syne leading-none">5+</span>
                <span className="text-xs uppercase tracking-widest opacity-90">Années à faire briller les marques d'ici</span>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block"
          animate={rm ? {} : { y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          aria-hidden="true"
        >
          <div className="w-6 h-10 border-2 border-[#0A0A0A]/20 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: RED }} />
          </div>
        </motion.div>
      </section>

      {/* ===================== MARQUEE ===================== */}
      <section className="bg-[#0A0A0A] py-5 overflow-hidden" aria-hidden="true">
        <div className="alpha-marquee items-center">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center">
              {marqueeWords.map((w, i) => (
                <span key={`${dup}-${i}`} className="flex items-center">
                  <span className="font-display-syne text-2xl sm:text-3xl font-bold text-white px-6">{w}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RED }} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===================== SERVICES — bento ===================== */}
      <section data-testid="services-section" className="py-24 px-6 bg-[#F7F5F2]">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2 className="font-display-syne text-4xl lg:text-6xl font-extrabold tracking-tight">
              Nos <span style={{ color: RED }}>services</span>
            </h2>
            <p className="text-[#0A0A0A]/60 text-lg max-w-md">
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
                  className="group relative h-full min-h-[220px] bg-white rounded-2xl border border-[#0A0A0A]/8 p-8 overflow-hidden hover:border-[#CE0202]/40 transition-colors duration-300 flex flex-col justify-between"
                >
                  <div className="absolute inset-0 grain-overlay opacity-[0.04] pointer-events-none" aria-hidden="true" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-[#CE0202]/10 group-hover:bg-[#CE0202] transition-colors duration-300">
                      <service.icon className="w-7 h-7 text-[#CE0202] group-hover:text-white transition-colors duration-300" aria-hidden="true" />
                    </div>
                    <h3 className="font-display-syne text-2xl font-bold mb-2">{service.title}</h3>
                    <p className="text-[#0A0A0A]/60 max-w-sm">{service.description}</p>
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
                className="border-[#0A0A0A]/20 hover:border-[#CE0202] hover:bg-[#CE0202] hover:text-white text-[#0A0A0A] rounded-full px-8 py-5 text-sm font-bold uppercase tracking-wider bg-transparent transition-colors duration-300"
              >
                Voir toutes nos offres
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===================== RÉALISATIONS — bento ===================== */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeUp} className="mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2 className="font-display-syne text-4xl lg:text-6xl font-extrabold tracking-tight">
              Nos <span style={{ color: RED }}>réalisations</span>
            </h2>
            <Link to="/realisations" className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-[#0A0A0A] hover:text-[#CE0202] transition-colors">
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
                      <p className="font-display-syne font-bold text-lg leading-tight">{project.category}</p>
                      <p className="text-[#0A0A0A]/50 text-sm">{project.client}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-[#0A0A0A]/30 group-hover:text-[#CE0202] transition-colors" aria-hidden="true" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="py-20 px-6 bg-[#0A0A0A] relative overflow-hidden">
        <div className="absolute inset-0 grain-overlay opacity-[0.07] pointer-events-none" aria-hidden="true" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: rm ? 0 : index * 0.1 }}
                className="text-center"
              >
                <p className="font-display-syne text-5xl lg:text-7xl font-extrabold mb-2" style={{ color: RED }}>
                  {stat.value}
                </p>
                <p className="text-white/60 text-xs sm:text-sm uppercase tracking-[0.2em]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== À PROPOS — asymétrique ===================== */}
      <section className="py-24 px-6 bg-[#F7F5F2]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: rm ? 0 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-display-syne text-4xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Une agence<br />
              <span style={{ color: RED }}>ancrée ici.</span>
            </h2>
            <p className="text-[#0A0A0A]/70 text-lg mb-5 max-w-xl">
              Basée en Guadeloupe, Alpha Agency accompagne les entreprises des Antilles
              et d'ailleurs dans leur transformation digitale depuis plus de 5 ans.
            </p>
            <p className="text-[#0A0A0A]/70 text-lg mb-10 max-w-xl">
              Notre mission : rendre un digital de niveau mondial accessible à toutes les
              entreprises locales, avec un accompagnement sur-mesure.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {benefits.map((benefit) => (
                <div key={benefit.title}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-[#CE0202]/10">
                    <benefit.icon className="w-5 h-5 text-[#CE0202]" aria-hidden="true" />
                  </div>
                  <h4 className="font-bold mb-1">{benefit.title}</h4>
                  <p className="text-sm text-[#0A0A0A]/60">{benefit.description}</p>
                </div>
              ))}
            </div>

            <Link to="/agence">
              <Button
                data-testid="cta-decouvrir-agence"
                className="bg-[#0A0A0A] hover:bg-[#CE0202] text-white hover:text-white rounded-full px-8 py-5 text-sm font-bold uppercase tracking-wider transition-colors duration-300"
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
      <section className="py-28 px-6 bg-[#0A0A0A] relative overflow-hidden">
        <div className="absolute inset-0 grain-overlay opacity-[0.08] pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-25 pointer-events-none"
             style={{ background: `radial-gradient(circle, ${RED}, transparent 65%)` }} aria-hidden="true" />
        <motion.div {...fadeUp} className="max-w-4xl mx-auto text-center relative z-10">
          <LottieLoader size={56} className="mx-auto mb-6" />
          <h2 className="font-display-syne text-4xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
            Prêt à <span style={{ color: RED }}>briller</span> ?
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Audit gratuit et devis personnalisé. Notre équipe vous répond sous 24h.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button
                data-testid="final-cta-devis"
                className="bg-[#CE0202] hover:bg-white text-white hover:text-[#0A0A0A] rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider transition-colors duration-300 w-full sm:w-auto"
              >
                Demander un devis gratuit
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
            <a href="tel:0691266003">
              <Button
                data-testid="final-cta-call"
                variant="outline"
                className="border-white/30 hover:border-white hover:bg-white hover:text-[#0A0A0A] text-white rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider bg-transparent transition-colors duration-300 w-full sm:w-auto"
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
