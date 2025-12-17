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
    { value: "community_management", label: "Community Management" },
    { value: "photo", label: "Photo" },
    { value: "video", label: "Vidéo" },
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
      toast.success("Votre demande a été envoyée avec succès !");
    } catch (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div data-testid="contact-page" className="bg-white min-h-screen">
        <section className="pt-32 pb-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#F8F8F8] p-12 rounded-lg"
            >
              <div className="w-20 h-20 bg-[#CE0202]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-[#CE0202]" />
              </div>
              <h1 className="text-3xl font-bold text-[#1A1A1A] mb-4">Demande envoyée !</h1>
              <p className="text-[#666666] mb-6">
                Merci pour votre demande. Notre équipe vous recontactera dans les plus brefs délais, 
                généralement sous 24 heures ouvrées.
              </p>
              <Button
                onClick={() => setSuccess(false)}
                className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white"
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
    <div data-testid="contact-page" className="bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 
              data-testid="contact-headline"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-6"
            >
              Parlons de votre <span className="text-[#CE0202]">projet</span>
            </h1>
            <p className="text-lg lg:text-xl text-[#666666]">
              Prenez contact avec notre équipe pour un audit gratuit et un devis personnalisé.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7"
            >
              <div className="bg-[#F8F8F8] p-8 rounded-lg border border-[#E5E5E5]">
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Demande de devis</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Prénom *</Label>
                      <Input
                        id="first_name"
                        data-testid="input-firstname"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                        required
                        className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Nom *</Label>
                      <Input
                        id="last_name"
                        data-testid="input-lastname"
                        value={formData.last_name}
                        onChange={(e) => handleChange("last_name", e.target.value)}
                        required
                        className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Entreprise</Label>
                    <Input
                      id="company"
                      data-testid="input-company"
                      value={formData.company}
                      onChange={(e) => handleChange("company", e.target.value)}
                      className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                      placeholder="Nom de votre entreprise"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="input-email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                        placeholder="votre@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        data-testid="input-phone"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                        placeholder="0690 00 00 00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="project_type">Type de projet *</Label>
                      <Select
                        value={formData.project_type}
                        onValueChange={(value) => handleChange("project_type", value)}
                        required
                      >
                        <SelectTrigger 
                          id="project_type"
                          data-testid="select-project-type"
                          className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                        >
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[#E5E5E5] z-[100]">
                          {projectTypes.map((type) => (
                            <SelectItem 
                              key={type.value} 
                              value={type.value}
                              className="text-[#1A1A1A] hover:bg-[#F8F8F8] cursor-pointer"
                            >
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget estimé</Label>
                      <Input
                        id="budget"
                        data-testid="input-budget"
                        value={formData.budget}
                        onChange={(e) => handleChange("budget", e.target.value)}
                        className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                        placeholder="Votre budget (optionnel)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Votre message *</Label>
                    <Textarea
                      id="message"
                      data-testid="textarea-message"
                      value={formData.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      required
                      rows={5}
                      className="bg-white border-[#E5E5E5] text-[#1A1A1A]"
                      placeholder="Décrivez votre projet, vos besoins et vos objectifs..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    data-testid="submit-btn"
                    className="w-full bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white rounded-none py-6 text-sm font-bold uppercase tracking-wider"
                  >
                    {loading ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        Envoyer ma demande
                        <Send className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-5 space-y-8"
            >
              {/* Contact Details */}
              <div className="bg-[#1A1A1A] p-8 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-6">Nos coordonnées</h3>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-[#CE0202] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Adresse</p>
                      <p className="text-[#A1A1AA] text-sm">
                        3 Boulevard du Marquisat de Houelbourg<br />
                        97122 Baie-Mahault, Guadeloupe
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Phone className="w-5 h-5 text-[#CE0202] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Téléphone</p>
                      <a href="tel:0691266003" className="text-[#A1A1AA] text-sm hover:text-white">
                        0691 266 003
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-[#CE0202] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Email</p>
                      <a href="mailto:leo.sperl@alphagency.fr" className="text-[#A1A1AA] text-sm hover:text-white">
                        leo.sperl@alphagency.fr
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Clock className="w-5 h-5 text-[#CE0202] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Horaires</p>
                      <p className="text-[#A1A1AA] text-sm">
                        Lundi - Vendredi<br />
                        9h00 - 18h00
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Quick Info */}
              <div className="bg-[#F8F8F8] p-8 rounded-lg border border-[#E5E5E5]">
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Réponse rapide</h3>
                <p className="text-[#666666] text-sm mb-4">
                  Nous nous engageons à répondre à toutes les demandes sous 24 heures ouvrées.
                </p>
                <div className="flex items-center gap-2 text-[#CE0202] text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
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
