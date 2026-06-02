import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { authAPI } from "../../lib/api";
import { toast } from "sonner";
import FluidHeroLazy from "../../components/three/FluidHeroLazy";

const RED = "#E11D2E";
const fieldClass = "bg-white/[0.05] border-white/15 text-white placeholder:text-white/30 focus:border-white/40 h-12 pl-11 rounded-xl";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  useEffect(() => {
    const savedEmail = localStorage.getItem("alpha_remember_email");
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.login({ email: formData.email, password: formData.password });
      localStorage.setItem("alpha_token", response.data.token);
      localStorage.setItem("alpha_user", JSON.stringify(response.data.user));
      if (rememberMe) {
        localStorage.setItem("alpha_remember_email", formData.email);
        localStorage.setItem("alpha_token_expiry", Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        localStorage.removeItem("alpha_remember_email");
        localStorage.setItem("alpha_token_expiry", Date.now() + 24 * 60 * 60 * 1000);
      }
      toast.success("Connexion réussie");
      navigate("/admin");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden text-white" style={{ backgroundColor: "#0A0507" }}>
      {/* Fond bordeaux + shader WebGL interactif */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 100% at 50% 0%, #2A0712 0%, #0A0507 70%)" }} aria-hidden="true" />
      <FluidHeroLazy className="absolute inset-0 z-0 opacity-90" />
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: "radial-gradient(80% 70% at 50% 50%, transparent 0%, #0A0507 90%)" }} aria-hidden="true" />
      <div className="absolute inset-0 z-[1] grain-overlay opacity-[0.08] pointer-events-none" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={process.env.PUBLIC_URL + "/logo-header-white.png"} alt="Alpha Agency" className="h-11 mx-auto" />
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono uppercase tracking-[0.25em] text-white/60">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: RED }} aria-hidden="true" />
            Espace administration
          </div>
        </div>

        {/* Carte glass (verre sombre pour la lisibilité par-dessus le shader) */}
        <div className="p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl" style={{ backgroundColor: "rgba(10,5,7,0.72)" }}>
          <h2 className="font-display text-2xl font-extrabold text-center mb-1">Bon retour, Léo.</h2>
          <p className="text-white/45 text-sm text-center mb-7">Connectez-vous à votre espace.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                <Input id="email" name="email" type="email" data-testid="input-email" value={formData.email} onChange={handleChange} required className={fieldClass} placeholder="admin@alphagency.fr" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                <Input id="password" name="password" type={showPassword ? "text" : "password"} data-testid="input-password" value={formData.password} onChange={handleChange} required className={`${fieldClass} pr-11`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" id="remember-me" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-white/10 accent-[#E11D2E]" />
                <span className="text-white/50 text-sm">Rester connecté</span>
              </label>
              <Link to="/alpha-admin-2024/reset-password" className="text-sm text-white/50 hover:text-white transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button
              type="submit"
              data-testid="submit-btn"
              disabled={loading}
              className="w-full text-white hover:text-white rounded-xl py-6 text-sm font-bold uppercase tracking-wider transition-all duration-300 group"
              style={{ background: "linear-gradient(100deg,#E11D2E,#7A0F2B)", boxShadow: "0 10px 30px -10px rgba(225,29,46,0.5)" }}
            >
              {loading ? "Connexion..." : (<>Se connecter<ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>)}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-white/30">
            Accès réservé aux administrateurs Alpha Agency
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
