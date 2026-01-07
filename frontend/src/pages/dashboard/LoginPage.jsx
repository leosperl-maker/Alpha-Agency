import { useState } from "react";
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
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

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
      toast.success("Connexion réussie");
      navigate("/admin");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen bg-[#F8F8F8] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_665d7358-b6b9-4803-b811-43294f38d041/artifacts/r2ww2fnl_Design%20sans%20titre%20%2893%29.png"
            alt="Alpha Agency"
            className="h-32 mx-auto"
          />
          <p className="text-[#666666] mt-4">Espace administration</p>
        </div>

        {/* Form */}
        <div className="bg-white p-8 rounded-lg border border-[#E5E5E5] shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-[#CE0202]" />
            <h2 className="text-2xl font-bold text-[#1A1A1A] text-center">
              Connexion sécurisée
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1A1A1A]">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666666]" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  data-testid="input-email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A] focus:border-[#CE0202] h-12 pl-10"
                  placeholder="admin@alphagency.fr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A1A1A]">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666666]" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="input-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A] focus:border-[#CE0202] h-12 pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#1A1A1A]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              data-testid="submit-btn"
              disabled={loading}
              className="w-full bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white rounded-none py-6 text-sm font-bold uppercase tracking-wider"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>

            <div className="text-center">
              <Link 
                to="/alpha-admin-2024/reset-password" 
                className="text-sm text-[#CE0202] hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-[#666666]">
            Accès réservé aux administrateurs Alpha Agency
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
