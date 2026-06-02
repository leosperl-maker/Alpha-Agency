import { useState } from "react";
import { motion } from "framer-motion";
import { Send, MapPin, Phone, Mail, Clock, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { leadAPI } from "../lib/api";
import { toast } from "sonner";

const RED = "#E11D2E";
const BG = "#0A0507";
const fieldClass = "bg-white/[0.04] border-white/15 text-white placeholder:text-white/30";

const ContactPage = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    project_type: "",
    budget: "",
    message: ""
  });

  const projectTypes = [
    { value: "site_vitrine", label: "Site vitrine" },
    { value: "site_ecommerce", label: "Site e-commerce" },
    { value: "community_management", label: "Réseaux sociaux (community management)" },
    { value: "photo", label: "Photographie" },
    { value: "video", label: "Vidéographie" },
    { value: "infographie", label: "Infographie" },
    { value: "ads", label: "Publicité digitale" },
    { value: "pack_360", label: "Pack 360°" },
    { value: "autre", label: "Autre" }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await leadAPI.submit(formData);
      setSuccess(true);
      toast.success("Votre demande a bien été envoyée !");
    } catch (error) {
      toast.error("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div data-testid="contact-page" className="min-h-screen text-white" style={{ backgroundColor: BG }}>
        <section className="pt-36 pb-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/[0.03] border border-white/10 p-12 rounded-3xl"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "rgba(225,29,46,0.12)" }}>
                <CheckCircle className="w-10 h-10" style={{ color: RED }} aria-hidden="true" />
              </div>
              <h1 className="font-display text-3xl font-extrabold mb-4">C'est envoyé !</h1>
              <p className="text-white/60 mb-6">
                Merci pour votre demande. On vous recontacte rapidement, en général sous 24h ouvrées.
              </p>
              <Button
                onClick={() => setSuccess(false)}
                className="bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full px-6"
              >
                Envoyer une autre demande
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div data-testid="contact-page" className="text-white" style={{ backgroundColor: BG }}>
      {/* Hero */}
      <section className="relative pt-36 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(110% 80% at 50% 0%, #2A0712 0%, #0A0507 65%)" }} aria-hidden="true" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1
              data-testid="contact-headline"
              className="font-display text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              Parlons de votre <span style={{ color: RED }}>projet</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/60">
              Un audit gratuit et un devis personnalisé, sans engagement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7"
            >
              <div className="bg-white/[0.03] p-8 rounded-3xl border border-white/10">
                <h2 className="font-display text-2xl font-bold mb-6">Demande de devis</h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name" className="text-white/80">Prénom *</Label>
                      <Input id="first_name" data-testid="input-firstname" value={formData.first_name} onChange={(e) => handleChange("first_name", e.target.value)} required className={fieldClass} placeholder="Votre prénom" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name" className="text-white/80">Nom *</Label>
                      <Input id="last_name" data-testid="input-lastname" value={formData.last_name} onChange={(e) => handleChange("last_name", e.target.value)} required className={fieldClass} placeholder="Votre nom" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-white/80">Entreprise</Label>
                    <Input id="company" data-testid="input-company" value={formData.company} onChange={(e) => handleChange("company", e.target.value)} className={fieldClass} placeholder="Nom de votre entreprise" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80">Email *</Label>
                      <Input id="email" type="email" data-testid="input-email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required className={fieldClass} placeholder="votre@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white/80">Téléphone</Label>
                      <Input id="phone" type="tel" data-testid="input-phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} className={fieldClass} placeholder="0690 00 00 00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="project_type" className="text-white/80">Type de projet *</Label>
                      <Select value={formData.project_type} onValueChange={(value) => handleChange("project_type", value)} required>
                        <SelectTrigger id="project_type" data-testid="select-project-type" className={fieldClass}>
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1012] border-white/10 text-white z-[100]" data-testid="select-project-type-content">
                          {projectTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} data-testid={`select-option-${type.value}`} className="text-white/90 focus:bg-white/10 focus:text-white cursor-pointer">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-white/80">Budget estimé</Label>
                      <Input id="budget" data-testid="input-budget" value={formData.budget} onChange={(e) => handleChange("budget", e.target.value)} className={fieldClass} placeholder="Votre budget (optionnel)" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-white/80">Votre message *</Label>
                    <Textarea id="message" data-testid="textarea-message" value={formData.message} onChange={(e) => handleChange("message", e.target.value)} required rows={5} className={fieldClass} placeholder="Décrivez votre projet, vos besoins et vos objectifs..." />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid="submit-btn"
                    className="w-full bg-white hover:bg-white/90 text-[#0A0507] hover:text-[#0A0507] rounded-full py-6 text-sm font-bold uppercase tracking-wider transition-all duration-300"
                  >
                    {loading ? "Envoi en cours..." : (<>Envoyer ma demande<Send className="ml-2 w-4 h-4" aria-hidden="true" /></>)}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-5 space-y-6"
            >
              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl">
                <h3 className="font-display text-xl font-bold mb-6">Nos coordonnées</h3>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: RED }} aria-hidden="true" />
                    <div>
                      <p className="font-medium">Adresse</p>
                      <p className="text-white/50 text-sm">3 Boulevard du Marquisat de Houelbourg<br />97122 Baie-Mahault, Guadeloupe</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Phone className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: RED }} aria-hidden="true" />
                    <div>
                      <p className="font-medium">Téléphone</p>
                      <a href="tel:0691266003" className="text-white/50 text-sm hover:text-white">0691 266 003</a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Mail className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: RED }} aria-hidden="true" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a href="mailto:leo.sperl@alphagency.fr" className="text-white/50 text-sm hover:text-white">leo.sperl@alphagency.fr</a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Clock className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: RED }} aria-hidden="true" />
                    <div>
                      <p className="font-medium">Horaires</p>
                      <p className="text-white/50 text-sm">Du mardi au samedi<br />10h à 19h</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl">
                <h3 className="font-display text-xl font-bold mb-4">Réponse rapide</h3>
                <p className="text-white/55 text-sm mb-4">
                  On s'engage à répondre à toutes les demandes sous 24h ouvrées.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: RED }}>
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  Audit gratuit inclus
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
