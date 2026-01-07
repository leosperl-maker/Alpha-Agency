import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authPasswordAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Key, Loader2, CheckCircle, ArrowLeft, Mail } from "lucide-react";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [step, setStep] = useState(token ? "reset" : "request"); // "request" | "reset" | "success"
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [passwords, setPasswords] = useState({
    new_password: "",
    confirm_password: "",
  });

  // Request password reset
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authPasswordAPI.forgotPassword(email);
      setStep("sent");
      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte mail pour le lien de réinitialisation.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset password with token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (passwords.new_password !== passwords.confirm_password) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (passwords.new_password.length < 8) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 8 caractères",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await authPasswordAPI.resetPassword(token, passwords.new_password);
      setStep("success");
      toast({
        title: "Succès",
        description: "Votre mot de passe a été réinitialisé.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Token invalide ou expiré",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white border border-[#E5E5E5] shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-[#CE0202]/10 rounded-full flex items-center justify-center mb-4">
            {step === "success" ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : step === "sent" ? (
              <Mail className="w-8 h-8 text-[#CE0202]" />
            ) : (
              <Key className="w-8 h-8 text-[#CE0202]" />
            )}
          </div>
          <CardTitle className="text-2xl text-[#1A1A1A]">
            {step === "success"
              ? "Mot de passe réinitialisé"
              : step === "sent"
              ? "Email envoyé"
              : step === "reset"
              ? "Nouveau mot de passe"
              : "Mot de passe oublié"}
          </CardTitle>
          <CardDescription className="text-[#666666]">
            {step === "success"
              ? "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
              : step === "sent"
              ? "Un email avec un lien de réinitialisation a été envoyé si un compte existe avec cette adresse."
              : step === "reset"
              ? "Choisissez un nouveau mot de passe sécurisé."
              : "Entrez votre email pour recevoir un lien de réinitialisation."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Request Reset Form */}
          {step === "request" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Adresse email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#CE0202] hover:bg-[#CE0202]/90 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Envoyer le lien
              </Button>
            </form>
          )}

          {/* Email Sent Message */}
          {step === "sent" && (
            <div className="space-y-4">
              <p className="text-center text-[#666666]">
                Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez
                un email avec les instructions pour réinitialiser votre mot de passe.
              </p>
              <Button
                onClick={() => setStep("request")}
                variant="outline"
                className="w-full border-[#E5E5E5]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Réessayer avec un autre email
              </Button>
            </div>
          )}

          {/* Reset Password Form */}
          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new_password: e.target.value })
                  }
                  placeholder="Minimum 8 caractères"
                  required
                  minLength={8}
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Confirmer le mot de passe</Label>
                <Input
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm_password: e.target.value })
                  }
                  placeholder="Répétez le mot de passe"
                  required
                  minLength={8}
                  className="bg-[#F8F8F8] border-[#E5E5E5] text-[#1A1A1A]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#CE0202] hover:bg-[#CE0202]/90 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                Réinitialiser le mot de passe
              </Button>
            </form>
          )}

          {/* Success Message */}
          {step === "success" && (
            <div className="space-y-4">
              <p className="text-center text-[#666666]">
                Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant
                vous connecter.
              </p>
              <Button
                onClick={() => navigate("/alpha-admin-2024")}
                className="w-full bg-[#CE0202] hover:bg-[#CE0202]/90 text-white"
              >
                Se connecter
              </Button>
            </div>
          )}

          {/* Back to login link */}
          {(step === "request" || step === "sent") && (
            <div className="mt-6 text-center">
              <Link
                to="/alpha-admin-2024"
                className="text-sm text-[#CE0202] hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Retour à la connexion
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
