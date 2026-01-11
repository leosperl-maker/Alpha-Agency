import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { authAPI } from "../../lib/api";
import { toast } from "sonner";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  // Check if user chose "remember me" before
  useEffect(() => {
    const savedEmail = localStorage.getItem("alpha_remember_email");
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem("alpha_token", response.data.token);
      localStorage.setItem("alpha_user", JSON.stringify(response.data.user));
      
      // Handle "Remember me"
      if (rememberMe) {
        localStorage.setItem("alpha_remember_email", formData.email);
        // Set longer token expiry (30 days)
        localStorage.setItem("alpha_token_expiry", Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        localStorage.removeItem("alpha_remember_email");
        // Set normal token expiry (1 day)
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
    <div data-testid="login-page" className="min-h-screen bg-[#02040A] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/tttfxeo1_Logo%20Header.png"
            alt="Alpha Agency"
            className="h-12 mx-auto brightness-0 invert"
          />
          <p className="text-white/50 mt-4">Espace administration</p>
        </div>

        {/* Form */}
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white text-center">
              Connexion sécurisée
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  data-testid="input-email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-indigo-500/50 h-12 pl-10 rounded-xl"
                  placeholder="admin@alphagency.fr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder-white/40 focus:border-indigo-500/50 h-12 pl-10 pr-10 rounded-xl"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
              />
              <Label htmlFor="remember-me" className="text-white/60 text-sm cursor-pointer">
                Rester connecté
              </Label>
            </div>

            <Button
              type="submit"
              data-testid="submit-btn"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 text-sm font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/25"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>

            <div className="text-center">
              <Link 
                to="/alpha-admin-2024/reset-password" 
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-white/40">
            Accès réservé aux administrateurs Alpha Agency
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
