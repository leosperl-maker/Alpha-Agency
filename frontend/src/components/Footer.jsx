import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Linkedin, Instagram, Facebook, Clock } from "lucide-react";

const Footer = () => {
  const navigate = useNavigate();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  // Simple click handler for hidden admin access
  const handleLogoClick = useCallback(() => {
    navigate("/alpha-admin-2024");
  }, [navigate]);

  return (
    <footer data-testid="main-footer" className="bg-[#0A0A0A] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div 
              onClick={handleLogoClick}
              data-testid="footer-logo-clickable"
              className="inline-block mb-6 cursor-pointer select-none"
            >
              <img 
                src="https://customer-assets.emergentagent.com/job_webproject-alpha/artifacts/o1l1nzgi_Agence%20de%20Communication%20360%C2%B0%20%281%29.png" 
                alt="Alpha Agency - Agence de Communication 360°"
                data-testid="footer-logo-img"
                className="h-40 w-auto"
              />
            </div>
            <p className="text-[#A1A1AA] text-sm mb-6">
              Agence de communication digitale 360° en Guadeloupe. Site web, community management (gestion des réseaux sociaux), photographie, vidéographie et publicité digitale.
            </p>
            <div className="flex gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-linkedin"
                className="text-[#A1A1AA] hover:text-[#CE0202] transition-colors"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-instagram"
                className="text-[#A1A1AA] hover:text-[#CE0202] transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="social-facebook"
                className="text-[#A1A1AA] hover:text-[#CE0202] transition-colors"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase text-sm tracking-wider">Nos services</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/offres" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Site web à 90€/mois
                </Link>
              </li>
              <li>
                <Link to="/offres" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Community Management
                </Link>
              </li>
              <li>
                <Link to="/offres" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Photographie
                </Link>
              </li>
              <li>
                <Link to="/offres" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Vidéographie
                </Link>
              </li>
              <li>
                <Link to="/offres" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Infographie
                </Link>
              </li>
              <li>
                <Link to="/offres" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Publicité digitale
                </Link>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase text-sm tracking-wider">Liens utiles</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/agence" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  L'agence
                </Link>
              </li>
              <li>
                <Link to="/realisations" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Réalisations
                </Link>
              </li>
              <li>
                <Link to="/actualites" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Actualités
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase text-sm tracking-wider">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-[#CE0202] mt-0.5 flex-shrink-0" />
                <span className="text-[#A1A1AA] text-sm">
                  3 Boulevard du Marquisat de Houelbourg<br />
                  97122 Baie-Mahault, Guadeloupe
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-[#CE0202] flex-shrink-0" />
                <a href="tel:0691266003" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  0691 266 003
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[#CE0202] flex-shrink-0" />
                <a href="mailto:leo.sperl@alphagency.fr" className="text-[#A1A1AA] hover:text-white text-sm animated-underline">
                  leo.sperl@alphagency.fr
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={18} className="text-[#CE0202] mt-0.5 flex-shrink-0" />
                <span className="text-[#A1A1AA] text-sm">
                  Du mardi au samedi<br />
                  10h à 19h
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#A1A1AA] text-xs">
            © {new Date().getFullYear()} Alpha Digital (Alpha Agency). Tous droits réservés.
          </p>
          <div className="flex gap-6">
            <Link to="/mentions-legales" className="text-[#A1A1AA] hover:text-white text-xs animated-underline">
              Mentions légales
            </Link>
            <Link to="/confidentialite" className="text-[#A1A1AA] hover:text-white text-xs animated-underline">
              Politique de confidentialité
            </Link>
            <Link to="/cookies" className="text-[#A1A1AA] hover:text-white text-xs animated-underline">
              Gestion des cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
