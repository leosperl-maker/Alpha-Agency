import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Target, Heart, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";

const AgencyPage = () => {
  const values = [
    {
      icon: Zap,
      title: "Réactivité",
      description: "Nous nous engageons sur des délais courts et tenons nos promesses."
    },
    {
      icon: Target,
      title: "Excellence",
      description: "Chaque projet est traité avec le même niveau d'exigence et de qualité."
    },
    {
      icon: Heart,
      title: "Proximité",
      description: "Une équipe locale qui comprend les enjeux du marché antillais."
    },
    {
      icon: Users,
      title: "Partenariat",
      description: "Nous construisons des relations durables avec nos clients."
    }
  ];

  const methodology = [
    {
      step: "01",
      title: "Découverte",
      description: "Analyse approfondie de vos besoins, objectifs et contraintes. Audit de votre présence digitale actuelle."
    },
    {
      step: "02",
      title: "Stratégie",
      description: "Définition d'une stratégie sur-mesure alignée avec vos objectifs business et votre budget."
    },
    {
      step: "03",
      title: "Création",
      description: "Design et développement de vos supports digitaux avec des points de validation réguliers."
    },
    {
      step: "04",
      title: "Déploiement",
      description: "Mise en ligne, tests et optimisations. Formation à l'utilisation de vos outils."
    },
    {
      step: "05",
      title: "Suivi",
      description: "Accompagnement continu, maintenance, et optimisation basée sur les performances."
    }
  ];

  return (
    <div data-testid="agency-page" className="bg-[#050505]">
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 
              data-testid="agency-headline"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
            >
              L'agence digitale<br />
              <span className="text-[#6A0F1A]">made in Guadeloupe</span>
            </h1>
            <p className="text-lg lg:text-xl text-[#A1A1AA]">
              ALPHA Agency est une agence de communication digitale 360° basée en Guadeloupe. 
              Nous accompagnons les entreprises locales et nationales dans leur transformation digitale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-6"
            >
              <div 
                className="aspect-[4/3] rounded-lg overflow-hidden"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?crop=entropy&cs=srgb&fm=jpg&q=85')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-6"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Notre <span className="text-[#6A0F1A]">vision</span>
              </h2>
              <p className="text-[#A1A1AA] text-lg mb-6">
                Fondée avec la conviction que chaque entreprise mérite une présence digitale professionnelle, 
                ALPHA Agency s'est donné pour mission de démocratiser l'accès aux services web de qualité.
              </p>
              <p className="text-[#A1A1AA] text-lg mb-6">
                Nous croyons que la performance digitale ne devrait pas être réservée aux grandes entreprises. 
                C'est pourquoi nous avons créé une offre accessible : un site web professionnel à partir de 90€/mois, 
                livré en seulement 7 jours.
              </p>
              <p className="text-[#A1A1AA] text-lg">
                Notre ancrage en Guadeloupe nous permet de comprendre les spécificités du marché antillais 
                tout en appliquant les standards internationaux du web.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section data-testid="values-section" className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              Nos <span className="text-[#6A0F1A]">valeurs</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Les principes qui guident notre travail au quotidien
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                data-testid={`value-${index}`}
                className="card-marketing text-center"
              >
                <div className="w-16 h-16 bg-[#6A0F1A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-[#6A0F1A]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-[#A1A1AA]">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology Section */}
      <section data-testid="methodology-section" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              Notre <span className="text-[#6A0F1A]">méthodologie</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Un process éprouvé pour garantir le succès de votre projet
            </p>
          </motion.div>

          <div className="space-y-8">
            {methodology.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                data-testid={`methodology-${index}`}
                className="flex flex-col md:flex-row items-start gap-6 glass p-8 rounded-lg"
              >
                <div className="text-5xl font-bold text-[#6A0F1A]/30 font-mono">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-[#A1A1AA] text-lg">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section Placeholder */}
      <section className="py-24 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              L'<span className="text-[#6A0F1A]">équipe</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">
              Des experts passionnés au service de votre réussite digitale
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Léo Sperl", role: "Fondateur & Directeur", placeholder: true },
              { name: "À venir", role: "Développeur Web", placeholder: true },
              { name: "À venir", role: "Community Manager", placeholder: true }
            ].map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-32 h-32 bg-[#6A0F1A]/10 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Users className="w-12 h-12 text-[#6A0F1A]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                <p className="text-[#A1A1AA]">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
              Prêt à travailler<br />
              <span className="text-[#6A0F1A]">ensemble ?</span>
            </h2>
            <p className="text-[#A1A1AA] text-lg mb-8">
              Discutons de votre projet et voyons comment nous pouvons vous aider.
            </p>
            <Link to="/contact">
              <Button 
                data-testid="agency-cta"
                className="bg-[#6A0F1A] hover:bg-[#8B1422] text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider"
              >
                Nous contacter
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AgencyPage;
