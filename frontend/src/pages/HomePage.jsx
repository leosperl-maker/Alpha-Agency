import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  ShoppingCart
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const CountUp = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
};

const HomePage = () => {
  const services = [
    {
      icon: Globe,
      title: "Site Vitrine",
      description: "Sites vitrines professionnels livrés en 7 jours",
      highlight: "À partir de 90€/mois"
    },
    {
      icon: ShoppingCart,
      title: "Site E-commerce",
      description: "Boutiques en ligne performantes et sécurisées",
      highlight: "Sur devis"
    },
    {
      icon: Users,
      title: "Community Management",
      description: "Gestion complète de vos réseaux sociaux",
      highlight: "Stratégie & Contenu"
    },
    {
      icon: Camera,
      title: "Photography",
      description: "Shootings professionnels pour votre marque",
      highlight: "Corporate & Produits"
    },
    {
      icon: Video,
      title: "Vidéography",
      description: "Captation et montage vidéo haute qualité",
      highlight: "Reels & Spots"
    },
    {
      icon: Target,
      title: "Publicité Digitale",
      description: "Campagnes Meta Ads, Google Ads, TikTok",
      highlight: "ROI Optimisé"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Prise de contact",
      description: "Audit gratuit de vos besoins et objectifs digitaux"
    },
    {
      number: "02",
      title: "Maquette & Contenus",
      description: "Design personnalisé et préparation des contenus"
    },
    {
      number: "03",
      title: "Mise en ligne",
      description: "Votre site livré en 7 jours, clé en main"
    },
    {
      number: "04",
      title: "Accompagnement",
      description: "Maintenance, optimisation et support continu"
    }
  ];

  const stats = [
    { value: 7, suffix: " jours", label: "Délai de livraison" },
    { value: 90, suffix: "€/mois", label: "À partir de" },
    { value: 50, suffix: "+", label: "Projets réalisés" },
    { value: 98, suffix: "%", label: "Clients satisfaits" }
  ];

  return (
    <div data-testid="home-page" className="bg-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1724355221699-962d54e6a119?crop=entropy&cs=srgb&fm=jpg&q=85')`,
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-8 border border-white/20">
              <Zap className="w-4 h-4 text-[#CE0202]" />
              <span className="text-sm text-white">Agence digitale 360° en Guadeloupe</span>
            </div>

            {/* Main headline */}
            <h1 
              data-testid="hero-headline"
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            >
              Votre site web professionnel<br />
              <span className="text-[#CE0202]">en 7 jours</span>
            </h1>

            <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mb-8">
              À partir de <span className="text-white font-bold">90 €/mois</span> (engagement 24 mois). 
              Sites vitrines, e-commerce, community management, photo, vidéo et publicité digitale.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button 
                  data-testid="hero-cta-devis"
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider"
                >
                  Demander un devis
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/offres">
                <Button 
                  data-testid="hero-cta-offres"
                  variant="outline"
                  className="border-white/40 hover:border-white hover:bg-white/10 text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider bg-transparent"
                >
                  Découvrir nos offres
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2" />
          </div>
        </div>
      </section>

      {/* Offer Banner */}
      <section className="bg-[#CE0202] py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-white" />
              <div>
                <p className="text-white font-bold text-lg">Site web professionnel à 90€/mois</p>
                <p className="text-white/80 text-sm">Livré en 7 jours • Maintenance incluse • Engagement 24 mois</p>
              </div>
            </div>
            <Link to="/offres">
              <Button 
                data-testid="banner-cta"
                className="bg-white text-[#CE0202] hover:bg-white/90 rounded-none px-6 py-3 text-sm font-bold uppercase tracking-wider"
              >
                En savoir plus
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section data-testid="services-section" className="py-24 px-6 bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
              Nos expertises <span className="text-[#CE0202]">360°</span>
            </h2>
            <p className="text-[#666666] text-lg max-w-2xl mx-auto">
              Une offre complète pour développer votre présence digitale
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
                  data-testid={`service-card-${index}`}
                  className="card-marketing h-full group cursor-pointer bg-white"
                >
                  <CardContent className="p-8">
                    <div className="w-12 h-12 bg-[#CE0202]/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-[#CE0202]/20 transition-colors">
                      <service.icon className="w-6 h-6 text-[#CE0202]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{service.title}</h3>
                    <p className="text-[#666666] mb-4">{service.description}</p>
                    <span className="text-[#CE0202] font-semibold text-sm">{service.highlight}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section data-testid="process-section" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-[#1A1A1A] mb-4">
              Notre <span className="text-[#CE0202]">process</span>
            </h2>
            <p className="text-[#666666] text-lg max-w-2xl mx-auto">
              Un accompagnement simple et efficace pour votre projet digital
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`process-step-${index}`}
                className="relative"
              >
                <div className="text-6xl font-bold text-[#CE0202]/20 mb-4 font-mono">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{step.title}</h3>
                <p className="text-[#666666]">{step.description}</p>
                
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 w-full h-px bg-gradient-to-r from-[#CE0202]/30 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section data-testid="stats-section" className="py-24 px-6 bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`stat-${index}`}
                className="text-center"
              >
                <div className="text-4xl lg:text-6xl font-bold text-[#CE0202] mb-2 font-mono">
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-white/70 text-sm uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-5"
            >
              <h2 className="text-3xl lg:text-5xl font-bold text-[#1A1A1A] mb-6">
                Pourquoi choisir<br />
                <span className="text-[#CE0202]">ALPHA Agency ?</span>
              </h2>
              <p className="text-[#666666] text-lg mb-8">
                Nous combinons expertise technique et connaissance du marché local pour vous offrir des solutions digitales performantes et adaptées à vos besoins.
              </p>
              <Link to="/agence">
                <Button 
                  data-testid="cta-decouvrir-agence"
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white rounded-none px-8 py-4 text-sm font-bold uppercase tracking-wider"
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
              className="lg:col-span-7"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: Clock, title: "Réactivité", desc: "Site livré en 7 jours maximum" },
                  { icon: Shield, title: "Transparence", desc: "Tarifs clairs, sans surprise" },
                  { icon: Zap, title: "Performance", desc: "Sites optimisés SEO et Core Web Vitals" },
                  { icon: Users, title: "Proximité", desc: "Équipe locale en Guadeloupe" }
                ].map((item, index) => (
                  <div 
                    key={item.title}
                    data-testid={`advantage-${index}`}
                    className="bg-[#F8F8F8] p-6 rounded-lg border border-[#E5E5E5]"
                  >
                    <item.icon className="w-8 h-8 text-[#CE0202] mb-4" />
                    <h3 className="text-[#1A1A1A] font-semibold mb-2">{item.title}</h3>
                    <p className="text-[#666666] text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[#F8F8F8]">
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
            <p className="text-[#666666] text-lg mb-8 max-w-2xl mx-auto">
              Contactez-nous dès aujourd'hui pour un audit gratuit de votre projet. 
              Ensemble, construisons votre succès en ligne.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button 
                  data-testid="final-cta-devis"
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider"
                >
                  Demander un devis gratuit
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="tel:0691266003">
                <Button 
                  data-testid="final-cta-call"
                  variant="outline"
                  className="border-[#1A1A1A]/20 hover:border-[#CE0202] hover:text-[#CE0202] text-[#1A1A1A] rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider bg-transparent"
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
