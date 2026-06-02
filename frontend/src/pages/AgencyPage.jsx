import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Target, Heart, Zap, ArrowRight, Image as ImageIcon } from "lucide-react";
import { Button } from "../components/ui/button";

const RED = "#E11D2E";
const BG = "#0A0507";

const AgencyPage = () => {
  const values = [
    { icon: Zap, title: "Réactivité", description: "On s'engage sur des délais courts, et on les tient." },
    { icon: Target, title: "Exigence", description: "Chaque projet est traité avec le même niveau de soin." },
    { icon: Heart, title: "Proximité", description: "Une équipe locale qui connaît le marché antillais." },
    { icon: Users, title: "Partenariat", description: "On construit des relations qui durent avec nos clients." }
  ];

  const methodology = [
    { step: "01", title: "Découverte", description: "On analyse vos besoins, vos objectifs et votre présence digitale actuelle." },
    { step: "02", title: "Stratégie", description: "On définit une stratégie sur mesure, alignée avec vos objectifs et votre budget." },
    { step: "03", title: "Création", description: "On conçoit et développe vos supports, avec des points de validation réguliers." },
    { step: "04", title: "Déploiement", description: "Mise en ligne, tests, optimisations, et formation à vos nouveaux outils." },
    { step: "05", title: "Suivi", description: "Accompagnement continu, maintenance et améliorations selon les performances." }
  ];

  return (
    <div data-testid="agency-page" className="text-white" style={{ backgroundColor: BG }}>
      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(110% 80% at 30% 0%, #2A0712 0%, #0A0507 65%)" }} aria-hidden="true" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1
              data-testid="agency-headline"
              className="font-display text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              L'agence digitale<br />
              <span style={{ color: RED }}>née en Guadeloupe</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/60">
              Alpha Agency, c'est une agence de communication 360° basée en Guadeloupe.
              On aide les entreprises d'ici et d'ailleurs à exister vraiment en ligne.
            </p>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-6"
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10">
                <div className="absolute inset-0 grain-overlay opacity-[0.15]" aria-hidden="true" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30">
                  <ImageIcon className="w-8 h-8" aria-hidden="true" />
                  <span className="text-[10px] uppercase tracking-[0.25em]">L'équipe</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-6"
            >
              <h2 className="font-display text-3xl lg:text-5xl font-extrabold tracking-tight mb-6">
                Notre <span style={{ color: RED }}>vision</span>
              </h2>
              <p className="text-white/65 text-lg mb-6">
                On est partis d'une conviction simple : chaque entreprise mérite une présence
                digitale pro, sans avoir besoin du budget d'une grande marque.
              </p>
              <p className="text-white/65 text-lg mb-6">
                C'est pour ça qu'on a créé une offre vraiment accessible : un site web pro
                à partir de 49€/mois, livré en 7 jours.
              </p>
              <p className="text-white/65 text-lg">
                Être ancrés en Guadeloupe nous permet de comprendre le marché antillais,
                tout en appliquant les standards internationaux du web.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section data-testid="values-section" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Nos <span style={{ color: RED }}>valeurs</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Les principes qui guident notre travail au quotidien.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                data-testid={`value-${index}`}
                className="bg-white/[0.03] p-8 rounded-2xl border border-white/10 text-center hover:border-white/30 transition-colors duration-300"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "rgba(225,29,46,0.12)" }}>
                  <value.icon className="w-8 h-8" style={{ color: RED }} aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-white/55">{value.description}</p>
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
            <h2 className="font-display text-3xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Notre <span style={{ color: RED }}>méthode</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Un process éprouvé pour donner toutes ses chances à votre projet.
            </p>
          </motion.div>

          <div className="space-y-5">
            {methodology.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                data-testid={`methodology-${index}`}
                className="flex flex-col md:flex-row items-start gap-6 bg-white/[0.03] p-8 rounded-2xl border border-white/10"
              >
                <div className="font-display text-5xl font-extrabold font-mono" style={{ color: "rgba(225,29,46,0.35)" }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-white/60 text-lg">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 80% at 50% 120%, #C8102E 0%, #4A0C1B 38%, #0A0507 72%)" }} aria-hidden="true" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Prêt à travailler<br />
              <span style={{ color: RED }}>ensemble ?</span>
            </h2>
            <p className="text-white/70 text-lg mb-8">
              Parlons de votre projet et voyons comment on peut vous aider.
            </p>
            <Link to="/contact">
              <Button
                data-testid="agency-cta"
                className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full px-8 py-6 text-sm font-bold uppercase tracking-wider transition-all duration-300"
              >
                Nous contacter
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AgencyPage;
