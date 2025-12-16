import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { leadAPI } from "../lib/api";
import { toast } from "sonner";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    project_type: "",
    budget: "",
    message: "",
    rgpd: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const projectTypes = [
    { value: "site_web", label: "Site Web" },
    { value: "community_management", label: "Community Management" },
    { value: "photo", label: "Photography" },
    { value: "video", label: "Vidéography" },
    { value: "ads", label: "Publicité Digitale" },
    { value: "pack_360", label: "Pack 360°" }
  ];

  const budgets = [
    { value: "moins_500", label: "Moins de 500€" },
    { value: "500_1000", label: "500€ - 1000€" },
    { value: "1000_3000", label: "1000€ - 3000€" },
    { value: "3000_5000", label: "3000€ - 5000€" },
    { value: "plus_5000", label: "Plus de 5000€" }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.rgpd) {
      toast.error("Veuillez accepter la politique de confidentialité");
      return;
    }

    setLoading(true);
    try {
      await leadAPI.submit({
        first_name: formData.first_name,
        last_name: formData.last_name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        project_type: formData.project_type,
        budget: formData.budget,
        message: formData.message
      });
      setSuccess(true);
      toast.success("Votre demande a été envoyée avec succès !");
    } catch (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div data-testid="contact-success" className="bg-[#050505] min-h-screen pt-32 px-6">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-12 rounded-lg"
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Merci !</h2>
            <p className="text-[#A1A1AA] text-lg mb-8">
              Votre demande a bien été envoyée. Nous vous recontacterons dans les plus brefs délais.
            </p>
            <Button
              onClick={() => setSuccess(false)}
              className="bg-[#6A0F1A] hover:bg-[#8B1422] text-white rounded-none px-8 py-4"
            >
              Envoyer une autre demande
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="contact-page" className="bg-[#050505]">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 
              data-testid="contact-headline"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
            >
              <span className="text-[#6A0F1A]">Contactez</span>-nous
            </h1>
            <p className="text-lg lg:text-xl text-[#A1A1AA]">
              Une question, un projet ? Remplissez le formulaire ci-dessous et nous vous recontacterons rapidement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7"
            >
              <form onSubmit={handleSubmit} data-testid="contact-form" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      data-testid="input-first-name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                      className="bg-black/50 border-white/10 focus:border-[#6A0F1A] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      data-testid="input-last-name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                      className="bg-black/50 border-white/10 focus:border-[#6A0F1A] h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    name="company"
                    data-testid="input-company"
                    value={formData.company}
                    onChange={handleChange}
                    className="bg-black/50 border-white/10 focus:border-[#6A0F1A] h-12"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      data-testid="input-email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="bg-black/50 border-white/10 focus:border-[#6A0F1A] h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      data-testid="input-phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="bg-black/50 border-white/10 focus:border-[#6A0F1A] h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Type de projet *</Label>
                    <Select
                      value={formData.project_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, project_type: value }))}
                      required
                    >
                      <SelectTrigger 
                        data-testid="select-project-type"
                        className="bg-black/50 border-white/10 focus:border-[#6A0F1A] h-12"
                      >
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-white/10">
                        {projectTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Budget estimé</Label>
                    <Select
                      value={formData.budget}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, budget: value }))}
                    >
                      <SelectTrigger 
                        data-testid="select-budget"
                        className="bg-black/50 border-white/10 focus:border-[#6A0F1A] h-12"
                      >
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-white/10">
                        {budgets.map(budget => (
                          <SelectItem key={budget.value} value={budget.value}>
                            {budget.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    data-testid="input-message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className="bg-black/50 border-white/10 focus:border-[#6A0F1A] resize-none"
                    placeholder="Décrivez votre projet..."
                  />
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="rgpd"
                    data-testid="checkbox-rgpd"
                    checked={formData.rgpd}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, rgpd: checked }))}
                    className="mt-1"
                  />
                  <Label htmlFor="rgpd" className="text-sm text-[#A1A1AA] leading-relaxed">
                    J'accepte que mes données soient traitées conformément à la{" "}
                    <a href="/confidentialite" className="text-[#6A0F1A] hover:underline">
                      politique de confidentialité
                    </a>
                    . *
                  </Label>
                </div>

                <Button
                  type="submit"
                  data-testid="submit-btn"
                  disabled={loading}
                  className="bg-[#6A0F1A] hover:bg-[#8B1422] text-white rounded-none px-8 py-6 text-sm font-bold uppercase tracking-wider w-full sm:w-auto"
                >
                  {loading ? "Envoi en cours..." : "Envoyer ma demande"}
                  <Send className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-5"
            >
              <div className="glass p-8 rounded-lg mb-8">
                <h3 className="text-xl font-bold text-white mb-6">Nos coordonnées</h3>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#6A0F1A]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#6A0F1A]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Adresse</p>
                      <p className="text-[#A1A1AA] text-sm">
                        3 Boulevard du Marquisat de Houelbourg<br />
                        97122 Baie-Mahault, Guadeloupe
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#6A0F1A]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[#6A0F1A]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Téléphone</p>
                      <a href="tel:0691266003" className="text-[#A1A1AA] text-sm hover:text-[#6A0F1A]">
                        0691 266 003
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#6A0F1A]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#6A0F1A]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Email</p>
                      <a href="mailto:leo.sperl@alphagency.fr" className="text-[#A1A1AA] text-sm hover:text-[#6A0F1A]">
                        leo.sperl@alphagency.fr
                      </a>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Map placeholder */}
              <div className="aspect-[4/3] bg-white/5 rounded-lg overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3828.8!2d-61.5891!3d16.2708!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTbCsDE2JzE0LjkiTiA2McKwMzUnMjAuOCJX!5e0!3m2!1sfr!2sfr!4v1600000000000!5m2!1sfr!2sfr"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="ALPHA Agency location"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
