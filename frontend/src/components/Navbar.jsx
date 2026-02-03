import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import { Button } from "./ui/button";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/agence", label: "L'agence" },
    { href: "/offres", label: "Nos offres" },
    { href: "/realisations", label: "Réalisations" },
    { href: "/actualites", label: "Actualités" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <nav
        data-testid="main-navbar"
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          isScrolled ? "bg-white/95 shadow-lg backdrop-blur-md" : "bg-white/80 backdrop-blur-sm"
        } rounded-full px-3 py-2`}
      >
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link
            to="/"
            data-testid="logo-link"
            className="flex items-center gap-2 px-2 lg:px-3 flex-shrink-0"
          >
            <img 
              src="https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/tttfxeo1_Logo%20Header.png" 
              alt="Alpha Agency"
              className="h-8 sm:h-10 w-auto object-contain max-w-[120px] sm:max-w-none"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                data-testid={`nav-${link.label.toLowerCase().replace(/[^a-z]/g, "")}`}
                className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap animated-underline ${
                  location.pathname === link.href
                    ? "text-[#1A1A1A]"
                    : "text-[#666666] hover:text-[#1A1A1A]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <Link to="/contact" className="hidden lg:block">
            <Button
              data-testid="cta-devis-btn"
              className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white rounded-full px-6 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
            >
              Demander un devis
            </Button>
          </Link>

          {/* Mobile Menu Button */}
          <button
            data-testid="mobile-menu-btn"
            className="lg:hidden p-2 text-[#1A1A1A]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          data-testid="mobile-menu"
          className="fixed inset-0 z-40 bg-white pt-24"
        >
          <div className="flex flex-col items-center gap-6 p-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                data-testid={`mobile-nav-${link.label.toLowerCase().replace(/[^a-z]/g, "")}`}
                className="text-2xl font-semibold text-[#1A1A1A]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/contact"
              className="mt-4"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                data-testid="mobile-cta-btn"
                className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white rounded-none px-8 py-4 text-sm font-bold uppercase tracking-wider"
              >
                Demander un devis
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Phone button removed - replaced by Agent X chat widget */}
    </>
  );
};

export default Navbar;
