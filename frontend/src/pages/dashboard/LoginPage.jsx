import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { authAPI } from "../../lib/api";
import { toast } from "sonner";

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authAPI.login({
          email: formData.email,
          password: formData.password
        });
      } else {
        response = await authAPI.register({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name
        });
      }

      localStorage.setItem("alpha_token", response.data.token);
      localStorage.setItem("alpha_user", JSON.stringify(response.data.user));
      toast.success(isLogin ? "Connexion réussie" : "Compte créé avec succès");
      navigate("/admin");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl font-bold font-['Syne']">
            <span className="text-[#CE0202]">A</span>
            <span className="text-white">LPHA</span>
          </span>
          <p className="text-[#A1A1AA] mt-2">Dashboard Administration</p>
        </div>

        {/* Form */}
        <div className="glass p-8 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isLogin ? "Connexion" : "Créer un compte"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  data-testid="input-fullname"
                  value={formData.full_name}
                  onChange={handleChange}
                  required={!isLogin}
                  className="bg-black/50 border-white/10 focus:border-[#CE0202] h-12"
                  placeholder="Votre nom"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  data-testid="input-email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-black/50 border-white/10 focus:border-[#CE0202] h-12 pl-10"
                  placeholder="admin@alphagency.fr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-black/50 border-white/10 focus:border-[#CE0202] h-12 pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="submit-btn"
              disabled={loading}
              className="w-full bg-[#CE0202] hover:bg-[#B00202] text-white rounded-none py-6 text-sm font-bold uppercase tracking-wider"
            >
              {loading ? "Chargement..." : (isLogin ? "Se connecter" : "Créer le compte")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#A1A1AA] hover:text-white text-sm"
            >
              {isLogin ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
