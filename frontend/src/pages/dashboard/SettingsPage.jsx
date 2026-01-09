import { useState, useEffect } from "react";
import { Save, Building, Key, Share2, FileText, Database, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { settingsAPI } from "../../lib/api";
import { toast } from "sonner";
import api from "../../lib/api";

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: "Alpha Digital",
    commercial_name: "ALPHA Agency",
    address: "3 Boulevard du Marquisat de Houelbourg, 97122 Baie-Mahault",
    phone: "0691 266 003",
    email: "leo.sperl@alphagency.fr",
    siren: "",
    siret: "",
    capital: "",
    tva_number: ""
  });

  const [socialLinks, setSocialLinks] = useState({
    linkedin: "https://linkedin.com",
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    twitter: "",
    youtube: ""
  });

  const [legalTexts, setLegalTexts] = useState({
    mentions_legales: "",
    politique_confidentialite: "",
    politique_cookies: ""
  });

  const [integrations, setIntegrations] = useState({
    ga4_id: "",
    resend_api_key: "",
    stripe_api_key: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      if (response.data) {
        if (response.data.company) setCompanyInfo(response.data.company);
        if (response.data.social_links) setSocialLinks(response.data.social_links);
        if (response.data.legal_texts) setLegalTexts(response.data.legal_texts);
        if (response.data.integrations) setIntegrations(response.data.integrations);
      }
    } catch (error) {
      console.error("Error fetching settings", error);
    }
  };

  const handleSaveCompany = async () => {
    setLoading(true);
    try {
      await settingsAPI.updateCompany(companyInfo);
      toast.success("Informations de l'entreprise sauvegardées");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSocial = async () => {
    setLoading(true);
    try {
      await settingsAPI.updateSocialLinks(socialLinks);
      toast.success("Liens réseaux sociaux sauvegardés");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLegal = async () => {
    setLoading(true);
    try {
      await settingsAPI.updateLegalTexts(legalTexts);
      toast.success("Textes légaux sauvegardés");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrations = async () => {
    setLoading(true);
    try {
      await settingsAPI.updateIntegrations(integrations);
      toast.success("Intégrations sauvegardées");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="settings-page" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Paramètres</h1>
        <p className="text-[#666666]">Configuration du dashboard et de l'entreprise</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-white border border-[#E5E5E5] flex-wrap">
          <TabsTrigger value="company" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            Réseaux sociaux
          </TabsTrigger>
          <TabsTrigger value="legal" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            Pages légales
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-[#CE0202] data-[state=active]:text-white">
            Intégrations
          </TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card className="bg-white border border-[#E5E5E5] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1A1A1A] flex items-center gap-2">
                <Building className="w-5 h-5 text-[#CE0202]" />
                Informations légales
              </CardTitle>
              <CardDescription>
                Ces informations apparaîtront sur vos devis et factures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Raison sociale</Label>
                  <Input
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Nom commercial</Label>
                  <Input
                    value={companyInfo.commercial_name}
                    onChange={(e) => setCompanyInfo({...companyInfo, commercial_name: e.target.value})}
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Adresse</Label>
                <Input
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                  className="bg-white border-[#E5E5E5]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Téléphone</Label>
                  <Input
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({...companyInfo, phone: e.target.value})}
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Email</Label>
                  <Input
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({...companyInfo, email: e.target.value})}
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">SIREN</Label>
                  <Input
                    value={companyInfo.siren}
                    onChange={(e) => setCompanyInfo({...companyInfo, siren: e.target.value})}
                    placeholder="123 456 789"
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">SIRET</Label>
                  <Input
                    value={companyInfo.siret}
                    onChange={(e) => setCompanyInfo({...companyInfo, siret: e.target.value})}
                    placeholder="123 456 789 00012"
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Capital social</Label>
                  <Input
                    value={companyInfo.capital}
                    onChange={(e) => setCompanyInfo({...companyInfo, capital: e.target.value})}
                    placeholder="1 000 €"
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveCompany}
                  disabled={loading}
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Links Tab */}
        <TabsContent value="social">
          <Card className="bg-white border border-[#E5E5E5] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1A1A1A] flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#CE0202]" />
                Réseaux sociaux
              </CardTitle>
              <CardDescription>
                Liens vers vos profils réseaux sociaux (affichés dans le footer)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">LinkedIn</Label>
                  <Input
                    value={socialLinks.linkedin}
                    onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})}
                    placeholder="https://linkedin.com/company/..."
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Instagram</Label>
                  <Input
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                    placeholder="https://instagram.com/..."
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Facebook</Label>
                  <Input
                    value={socialLinks.facebook}
                    onChange={(e) => setSocialLinks({...socialLinks, facebook: e.target.value})}
                    placeholder="https://facebook.com/..."
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A]">Twitter / X</Label>
                  <Input
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})}
                    placeholder="https://twitter.com/..."
                    className="bg-white border-[#E5E5E5]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">YouTube</Label>
                <Input
                  value={socialLinks.youtube}
                  onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})}
                  placeholder="https://youtube.com/@..."
                  className="bg-white border-[#E5E5E5]"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveSocial}
                  disabled={loading}
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Texts Tab */}
        <TabsContent value="legal">
          <Card className="bg-white border border-[#E5E5E5] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1A1A1A] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#CE0202]" />
                Textes des pages légales
              </CardTitle>
              <CardDescription>
                Personnalisez le contenu des pages Mentions légales, Confidentialité et Cookies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Mentions légales (texte complémentaire)</Label>
                <Textarea
                  value={legalTexts.mentions_legales}
                  onChange={(e) => setLegalTexts({...legalTexts, mentions_legales: e.target.value})}
                  placeholder="Ajoutez des informations complémentaires pour vos mentions légales..."
                  className="bg-white border-[#E5E5E5] min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Politique de confidentialité (texte complémentaire)</Label>
                <Textarea
                  value={legalTexts.politique_confidentialite}
                  onChange={(e) => setLegalTexts({...legalTexts, politique_confidentialite: e.target.value})}
                  placeholder="Ajoutez des informations complémentaires pour votre politique de confidentialité..."
                  className="bg-white border-[#E5E5E5] min-h-[150px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Politique de cookies (texte complémentaire)</Label>
                <Textarea
                  value={legalTexts.politique_cookies}
                  onChange={(e) => setLegalTexts({...legalTexts, politique_cookies: e.target.value})}
                  placeholder="Ajoutez des informations complémentaires pour votre politique de cookies..."
                  className="bg-white border-[#E5E5E5] min-h-[150px]"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveLegal}
                  disabled={loading}
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card className="bg-white border border-[#E5E5E5] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#1A1A1A] flex items-center gap-2">
                <Key className="w-5 h-5 text-[#CE0202]" />
                Intégrations
              </CardTitle>
              <CardDescription>
                Configurez vos clés API pour les services tiers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Google Analytics 4 - ID de propriété</Label>
                <Input
                  value={integrations.ga4_id}
                  onChange={(e) => setIntegrations({...integrations, ga4_id: e.target.value})}
                  placeholder="G-XXXXXXXXXX"
                  className="bg-white border-[#E5E5E5]"
                />
                <p className="text-xs text-[#666666]">
                  Ajoutez votre ID GA4 pour suivre les visites du site
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Resend - Clé API</Label>
                <Input
                  type="password"
                  value={integrations.resend_api_key}
                  onChange={(e) => setIntegrations({...integrations, resend_api_key: e.target.value})}
                  placeholder="re_xxxxxxxxxxxx"
                  className="bg-white border-[#E5E5E5]"
                />
                <p className="text-xs text-[#666666]">
                  Pour l'envoi automatique des emails de notification
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1A1A1A]">Stripe - Clé API secrète</Label>
                <Input
                  type="password"
                  value={integrations.stripe_api_key}
                  onChange={(e) => setIntegrations({...integrations, stripe_api_key: e.target.value})}
                  placeholder="sk_xxxxxxxxxxxx"
                  className="bg-white border-[#E5E5E5]"
                />
                <p className="text-xs text-[#666666]">
                  Pour la gestion des paiements en ligne
                </p>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveIntegrations}
                  disabled={loading}
                  className="bg-[#CE0202] hover:bg-[#B00202] text-white hover:text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
